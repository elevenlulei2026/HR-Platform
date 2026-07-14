package com.hrplatform.core.web.employee;

import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.ReportingLineEntity;
import com.hrplatform.core.employee.ReportingLineService;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reporting-lines")
public class ReportingLineController {
  private final ReportingLineService reportingLineService;
  private final RbacService rbacService;

  public ReportingLineController(ReportingLineService reportingLineService, RbacService rbacService) {
    this.reportingLineService = reportingLineService;
    this.rbacService = rbacService;
  }

  @GetMapping
  public ApiResponse<Map<String, Object>> listReportingLines(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate,
      @RequestParam(required = false) String lineType,
      @RequestParam(required = false) Long organizationId,
      @RequestParam(required = false) String status,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireView();
    LocalDate asOf = asOfDate == null ? LocalDate.now() : asOfDate;
    var p = reportingLineService.page(keyword, asOf, lineType, organizationId, status, page, pageSize);
    Map<Long, EmployeeEntity> empMap = reportingLineService.employeeMap(p.records());
    Map<Long, ReportingLineService.ChainDisplay> chainMap =
        reportingLineService.chainDisplayMap(p.records(), asOf);
    Map<Long, String> orgPathMap =
        reportingLineService.organizationPathByEmployeeId(p.records(), asOf);
    List<Map<String, Object>> items = p.records().stream()
        .map(l -> toDto(
            l,
            empMap,
            chainMap.get(l.getEmployeeId()),
            orgPathMap.get(l.getEmployeeId())
        ))
        .toList();
    Map<String, Object> result = new HashMap<>();
    result.put("items", items);
    result.put("total", p.total());
    result.put("page", page);
    result.put("pageSize", pageSize);
    return ApiResponse.ok(result);
  }

  @PostMapping("/sync-from-org")
  public ApiResponse<Map<String, Object>> syncFromOrg(
      @RequestBody(required = false) SyncFromOrgRequest req
  ) {
    requireEdit();
    LocalDate asOf = req == null || req.asOfDate() == null ? LocalDate.now() : req.asOfDate();
    ReportingLineService.SyncResult sync = reportingLineService.syncFromOrg(asOf);
    Map<String, Object> result = new HashMap<>();
    result.put("scanned", sync.scanned());
    result.put("created", sync.created());
    result.put("updated", sync.updated());
    result.put("unchanged", sync.unchanged());
    result.put("skipped", sync.skipped());
    return ApiResponse.ok(result);
  }

  @PostMapping
  public ApiResponse<Map<String, Object>> createReportingLine(@Valid @RequestBody ReportingLineCreateRequest req) {
    requireCreate();
    ReportingLineEntity created = reportingLineService.create(new ReportingLineService.CreateCommand(
        parseId(req.employeeId(), "下属员工"),
        parseId(req.managerEmployeeId(), "上级员工"),
        req.lineType(),
        req.effectiveStartDate(),
        req.effectiveEndDate()
    ));
    Map<Long, EmployeeEntity> empMap = reportingLineService.employeeMap(List.of(created));
    Map<Long, ReportingLineService.ChainDisplay> chainMap =
        reportingLineService.chainDisplayMap(List.of(created), LocalDate.now());
    Map<Long, String> orgPathMap =
        reportingLineService.organizationPathByEmployeeId(List.of(created), LocalDate.now());
    return ApiResponse.ok(toDto(
        created,
        empMap,
        chainMap.get(created.getEmployeeId()),
        orgPathMap.get(created.getEmployeeId())
    ));
  }

  @PutMapping("/{id}")
  public ApiResponse<Map<String, Object>> updateReportingLine(
      @PathVariable("id") long id,
      @Valid @RequestBody ReportingLineUpdateRequest req
  ) {
    requireEdit();
    ReportingLineEntity updated = reportingLineService.update(id, new ReportingLineService.UpdateCommand(
        req.managerEmployeeId() == null || req.managerEmployeeId().isBlank()
            ? null
            : parseId(req.managerEmployeeId(), "上级员工"),
        req.lineType(),
        req.effectiveStartDate(),
        req.effectiveEndDate()
    ));
    Map<Long, EmployeeEntity> empMap = reportingLineService.employeeMap(List.of(updated));
    Map<Long, ReportingLineService.ChainDisplay> chainMap =
        reportingLineService.chainDisplayMap(List.of(updated), LocalDate.now());
    Map<Long, String> orgPathMap =
        reportingLineService.organizationPathByEmployeeId(List.of(updated), LocalDate.now());
    return ApiResponse.ok(toDto(
        updated,
        empMap,
        chainMap.get(updated.getEmployeeId()),
        orgPathMap.get(updated.getEmployeeId())
    ));
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Map<String, Object>> deleteReportingLine(@PathVariable("id") long id) {
    requireDelete();
    reportingLineService.delete(id);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  private void requireView() { rbacService.requirePermission("reporting-line:view"); }
  private void requireCreate() {
    rbacService.requireAnyPermission("reporting-line:create", "reporting-line:edit");
  }
  private void requireEdit() { rbacService.requirePermission("reporting-line:edit"); }
  private void requireDelete() {
    rbacService.requireAnyPermission("reporting-line:delete", "reporting-line:edit");
  }

  private static Long parseId(String raw, String label) {
    if (raw == null || raw.isBlank()) {
      throw new IllegalArgumentException(label + "不能为空");
    }
    try {
      return Long.parseLong(raw.trim());
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException(label + "无效");
    }
  }

  private Map<String, Object> toDto(
      ReportingLineEntity l,
      Map<Long, EmployeeEntity> empMap,
      ReportingLineService.ChainDisplay chain,
      String organizationPath
  ) {
    EmployeeEntity emp = empMap.get(l.getEmployeeId());
    EmployeeEntity mgr = empMap.get(l.getManagerEmployeeId());
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(l.getId()));
    dto.put("employeeId", String.valueOf(l.getEmployeeId()));
    dto.put("employeeNo", emp == null ? null : emp.getEmployeeNo());
    dto.put("employeeName", emp == null ? null : emp.getFullName());
    dto.put("managerEmployeeId", String.valueOf(l.getManagerEmployeeId()));
    dto.put("managerEmployeeNo", mgr == null ? null : mgr.getEmployeeNo());
    dto.put("managerEmployeeName", mgr == null ? null : mgr.getFullName());
    dto.put("lineType", l.getLineType());
    dto.put("lineTypeLabel", "DIRECT".equals(l.getLineType()) ? "实线" : "DOTTED".equals(l.getLineType()) ? "虚线" : l.getLineType());
    dto.put("organizationPath", organizationPath);
    dto.put("reportingChain", chain == null ? null : chain.reportingChain());
    dto.put("reportingChainNos", chain == null ? List.of() : chain.reportingChainNos());
    dto.put("effectiveStartDate", l.getEffectiveStartDate().toString());
    dto.put("effectiveEndDate", l.getEffectiveEndDate() == null ? null : l.getEffectiveEndDate().toString());
    dto.put("createdAt", l.getCreatedAt() == null ? null : l.getCreatedAt().toString());
    dto.put("updatedAt", l.getUpdatedAt() == null ? null : l.getUpdatedAt().toString());
    return dto;
  }

  public record SyncFromOrgRequest(LocalDate asOfDate) {}

  public record ReportingLineCreateRequest(
      @NotNull String employeeId,
      @NotNull String managerEmployeeId,
      String lineType,
      @NotNull LocalDate effectiveStartDate,
      LocalDate effectiveEndDate
  ) {}

  public record ReportingLineUpdateRequest(
      String managerEmployeeId,
      String lineType,
      LocalDate effectiveStartDate,
      LocalDate effectiveEndDate
  ) {}
}
