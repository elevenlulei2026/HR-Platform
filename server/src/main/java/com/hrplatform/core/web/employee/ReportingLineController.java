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
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireView();
    var p = reportingLineService.page(keyword, asOfDate, lineType, page, pageSize);
    Map<Long, EmployeeEntity> empMap = reportingLineService.employeeMap(p.records());
    List<Map<String, Object>> items = p.records().stream().map(l -> toDto(l, empMap)).toList();
    Map<String, Object> result = new HashMap<>();
    result.put("items", items);
    result.put("total", p.total());
    result.put("page", page);
    result.put("pageSize", pageSize);
    return ApiResponse.ok(result);
  }

  @PostMapping
  public ApiResponse<Map<String, Object>> createReportingLine(@Valid @RequestBody ReportingLineCreateRequest req) {
    requireEdit();
    ReportingLineEntity created = reportingLineService.create(new ReportingLineService.CreateCommand(
        req.employeeId(),
        req.managerEmployeeId(),
        req.lineType(),
        req.effectiveStartDate(),
        req.effectiveEndDate()
    ));
    Map<Long, EmployeeEntity> empMap = reportingLineService.employeeMap(List.of(created));
    return ApiResponse.ok(toDto(created, empMap));
  }

  @PutMapping("/{id}")
  public ApiResponse<Map<String, Object>> updateReportingLine(
      @PathVariable("id") long id,
      @Valid @RequestBody ReportingLineUpdateRequest req
  ) {
    requireEdit();
    ReportingLineEntity updated = reportingLineService.update(id, new ReportingLineService.UpdateCommand(
        req.managerEmployeeId(),
        req.lineType(),
        req.effectiveStartDate(),
        req.effectiveEndDate()
    ));
    Map<Long, EmployeeEntity> empMap = reportingLineService.employeeMap(List.of(updated));
    return ApiResponse.ok(toDto(updated, empMap));
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Map<String, Object>> deleteReportingLine(@PathVariable("id") long id) {
    requireEdit();
    reportingLineService.delete(id);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  private void requireView() { rbacService.requirePermission("reporting-line:view"); }
  private void requireEdit() { rbacService.requirePermission("reporting-line:edit"); }

  private Map<String, Object> toDto(ReportingLineEntity l, Map<Long, EmployeeEntity> empMap) {
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
    dto.put("effectiveStartDate", l.getEffectiveStartDate().toString());
    dto.put("effectiveEndDate", l.getEffectiveEndDate() == null ? null : l.getEffectiveEndDate().toString());
    dto.put("createdAt", l.getCreatedAt() == null ? null : l.getCreatedAt().toString());
    dto.put("updatedAt", l.getUpdatedAt() == null ? null : l.getUpdatedAt().toString());
    return dto;
  }

  public record ReportingLineCreateRequest(
      @NotNull Long employeeId,
      @NotNull Long managerEmployeeId,
      String lineType,
      @NotNull LocalDate effectiveStartDate,
      LocalDate effectiveEndDate
  ) {}

  public record ReportingLineUpdateRequest(
      Long managerEmployeeId,
      String lineType,
      LocalDate effectiveStartDate,
      LocalDate effectiveEndDate
  ) {}
}
