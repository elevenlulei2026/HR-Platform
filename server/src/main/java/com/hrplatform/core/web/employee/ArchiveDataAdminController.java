package com.hrplatform.core.web.employee;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrplatform.core.employee.ArchiveDataAdminService;
import com.hrplatform.core.employee.EmployeeService;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ImportResult;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.PageResult;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.RowError;
import com.hrplatform.platform.audit.AuditLogEntity;
import com.hrplatform.platform.audit.AuditLogService;
import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.rbac.ArchivePermissionSupport;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import com.hrplatform.platform.web.TraceId;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/archive-data")
public class ArchiveDataAdminController {
  private final ArchiveDataAdminService archiveDataAdminService;
  private final ArchivePermissionSupport archivePermissions;
  private final EmployeeService employeeService;
  private final RbacService rbacService;
  private final AuditLogService auditLogService;
  private final ObjectMapper objectMapper;

  public ArchiveDataAdminController(
      ArchiveDataAdminService archiveDataAdminService,
      ArchivePermissionSupport archivePermissions,
      EmployeeService employeeService,
      RbacService rbacService,
      AuditLogService auditLogService,
      ObjectMapper objectMapper
  ) {
    this.archiveDataAdminService = archiveDataAdminService;
    this.archivePermissions = archivePermissions;
    this.employeeService = employeeService;
    this.rbacService = rbacService;
    this.auditLogService = auditLogService;
    this.objectMapper = objectMapper;
  }

  @GetMapping("/resources")
  public ApiResponse<List<Map<String, Object>>> listResources() {
    rbacService.requireLoggedIn();
    return ApiResponse.ok(archiveDataAdminService.listResources());
  }

  @GetMapping("/{resource}")
  public ApiResponse<Map<String, Object>> list(
      @PathVariable String resource,
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String employeeNo,
      @RequestParam(required = false) Long organizationId,
      @RequestParam(defaultValue = "false") boolean revealSensitive,
      @RequestParam long page,
      @RequestParam long pageSize
  ) {
    archivePermissions.requireView(resource);
    boolean reveal = employeeService.shouldRevealSensitive(revealSensitive);
    if (reveal) {
      appendAudit("VIEW", "archive-data:" + resource, null, Map.of("context", "list", "sensitive", true), null);
    }
    PageResult<Map<String, Object>> p = archiveDataAdminService.page(
        resource, keyword, employeeNo, organizationId, reveal, page, pageSize
    );
    Map<String, Object> result = new HashMap<>();
    result.put("items", p.records());
    result.put("total", p.total());
    result.put("page", page);
    result.put("pageSize", pageSize);
    return ApiResponse.ok(result);
  }

  @PostMapping("/{resource}")
  public ApiResponse<Map<String, Object>> create(
      @PathVariable String resource,
      @RequestBody Map<String, Object> body,
      @RequestParam(defaultValue = "false") boolean revealSensitive
  ) {
    archivePermissions.requireCreate(resource);
    boolean reveal = employeeService.shouldRevealSensitive(revealSensitive);
    return ApiResponse.ok(archiveDataAdminService.create(resource, body, reveal));
  }

  @PutMapping("/{resource}/{id}")
  public ApiResponse<Map<String, Object>> update(
      @PathVariable String resource,
      @PathVariable long id,
      @RequestBody Map<String, Object> body,
      @RequestParam(defaultValue = "false") boolean revealSensitive
  ) {
    archivePermissions.requireEdit(resource);
    boolean reveal = employeeService.shouldRevealSensitive(revealSensitive);
    return ApiResponse.ok(archiveDataAdminService.update(resource, id, body, reveal));
  }

  @DeleteMapping("/{resource}/{id}")
  public ApiResponse<Map<String, Object>> delete(
      @PathVariable String resource,
      @PathVariable long id
  ) {
    archivePermissions.requireDelete(resource);
    return ApiResponse.ok(archiveDataAdminService.delete(resource, id));
  }

  @GetMapping("/{resource}/import-template")
  public void downloadTemplate(@PathVariable String resource, HttpServletResponse response) throws Exception {
    archivePermissions.requireImport(resource);
    byte[] bytes = archiveDataAdminService.buildImportTemplate(resource);
    writeExcel(response, bytes, resource + "-import-template.xlsx");
  }

  @PostMapping("/{resource}/import")
  public ApiResponse<Map<String, Object>> importExcel(
      @PathVariable String resource,
      @RequestParam("file") MultipartFile file,
      HttpServletRequest request
  ) {
    archivePermissions.requireImport(resource);
    ImportResult result = archiveDataAdminService.importExcel(resource, file);
    appendAudit("IMPORT", "archive-data", resource, Map.of(
        "totalRows", result.totalRows(),
        "successCount", result.successCount(),
        "failureCount", result.failureCount()
    ), request == null ? null : request.getRemoteAddr());
    Map<String, Object> out = new HashMap<>();
    out.put("totalRows", result.totalRows());
    out.put("successCount", result.successCount());
    out.put("failureCount", result.failureCount());
    out.put("errors", result.errors().stream().map(e -> {
      Map<String, Object> err = new HashMap<>();
      err.put("rowNumber", e.rowNumber());
      err.put("field", e.field());
      err.put("message", e.message());
      return err;
    }).toList());
    return ApiResponse.ok(out);
  }

  @PostMapping("/{resource}/import-error-report")
  public void importErrorReport(
      @PathVariable String resource,
      @RequestBody Map<String, Object> body,
      HttpServletResponse response
  ) throws Exception {
    archivePermissions.requireImport(resource);
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> errorMaps = (List<Map<String, Object>>) body.getOrDefault("errors", List.of());
    List<RowError> errors = errorMaps.stream()
        .map(m -> new RowError(
            ((Number) m.getOrDefault("rowNumber", 0)).intValue(),
            m.get("field") == null ? null : String.valueOf(m.get("field")),
            m.get("message") == null ? null : String.valueOf(m.get("message"))
        ))
        .toList();
    byte[] bytes = archiveDataAdminService.buildErrorReport(errors);
    writeExcel(response, bytes, resource + "-import-errors.xlsx");
  }

  @GetMapping("/{resource}/export")
  public void export(
      @PathVariable String resource,
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String employeeNo,
      @RequestParam(required = false) Long organizationId,
      @RequestParam(defaultValue = "false") boolean revealSensitive,
      HttpServletRequest request,
      HttpServletResponse response
  ) throws Exception {
    archivePermissions.requireExport(resource);
    boolean reveal = employeeService.shouldRevealSensitive(revealSensitive);
    if (reveal) {
      appendAudit("VIEW", "archive-data:" + resource, null, Map.of("context", "export", "sensitive", true),
          request == null ? null : request.getRemoteAddr());
    }
    byte[] bytes = archiveDataAdminService.exportExcel(resource, keyword, employeeNo, organizationId, reveal);
    appendAudit("EXPORT", "archive-data", resource, Map.of(
        "keyword", keyword == null ? "" : keyword,
        "employeeNo", employeeNo == null ? "" : employeeNo,
        "organizationId", organizationId == null ? "" : organizationId,
        "revealSensitive", reveal
    ), request == null ? null : request.getRemoteAddr());
    writeExcel(response, bytes, resource + "-export.xlsx");
  }

  private void writeExcel(HttpServletResponse response, byte[] bytes, String filename) throws Exception {
    String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
    response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded);
    response.getOutputStream().write(bytes);
  }

  private void appendAudit(
      String action,
      String resourceType,
      String resourceId,
      Map<String, Object> detail,
      String ip
  ) {
    try {
      AuditLogEntity log = new AuditLogEntity();
      log.setAction(action);
      log.setResourceType(resourceType);
      log.setResourceId(resourceId);
      log.setIpAddress(ip);
      var user = AuthContext.current();
      if (user != null) {
        log.setOperatorUserId(user.id());
        log.setOperatorUsername(user.username());
      }
      log.setTraceId(TraceId.current());
      log.setCreatedAt(LocalDateTime.now());
      log.setDetailJson(objectMapper.writeValueAsString(detail));
      auditLogService.append(log);
    } catch (Exception ignored) {
      // 审计失败不阻断业务
    }
  }
}
