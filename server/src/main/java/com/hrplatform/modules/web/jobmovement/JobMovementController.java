package com.hrplatform.modules.web.jobmovement;

import com.hrplatform.modules.jobmovement.JobMovementRequestEntity;
import com.hrplatform.modules.jobmovement.JobMovementService;
import com.hrplatform.platform.audit.ForbiddenException;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class JobMovementController {
  private final JobMovementService jobMovementService;
  private final RbacService rbacService;

  public JobMovementController(JobMovementService jobMovementService, RbacService rbacService) {
    this.jobMovementService = jobMovementService;
    this.rbacService = rbacService;
  }

  @GetMapping("/job-movement-requests")
  public ApiResponse<Map<String, Object>> list(
      @RequestParam(required = false) String movementType,
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireView();
    var p = jobMovementService.page(movementType, keyword, status, page, pageSize);
    Map<String, Object> result = new HashMap<>();
    result.put("items", p.records().stream().map(jobMovementService::toDto).toList());
    result.put("total", p.total());
    result.put("page", page);
    result.put("pageSize", pageSize);
    return ApiResponse.ok(result);
  }

  @GetMapping("/job-movement-requests/{id}")
  public ApiResponse<Map<String, Object>> get(@PathVariable("id") long id) {
    requireViewOrWorkflowParticipant(id);
    return ApiResponse.ok(jobMovementService.toDto(jobMovementService.require(id)));
  }

  @GetMapping("/job-movement-requests/{id}/approval-tasks")
  public ApiResponse<List<Map<String, Object>>> approvalTasks(@PathVariable("id") long id) {
    requireViewOrWorkflowParticipant(id);
    return ApiResponse.ok(jobMovementService.listApprovalTasks(id));
  }

  @PostMapping("/job-movement-requests")
  public ApiResponse<Map<String, Object>> create(@Valid @RequestBody CreateRequest req) {
    requireEdit();
    JobMovementRequestEntity created = jobMovementService.create(new JobMovementService.CreateCommand(
        req.movementType(),
        req.employeeId(),
        req.fromAssignmentId(),
        req.effectiveDate(),
        req.reasonCode(),
        req.reasonSubCode(),
        req.organizationId(),
        req.positionId(),
        req.jobGradeCode(),
        req.employeeGroupCode(),
        req.employeeSubgroupCode(),
        req.opinion(),
        req.remark()
    ));
    return ApiResponse.ok(jobMovementService.toDto(created));
  }

  @PutMapping("/job-movement-requests/{id}")
  public ApiResponse<Map<String, Object>> update(
      @PathVariable("id") long id,
      @Valid @RequestBody UpdateRequest req
  ) {
    requireEdit();
    JobMovementRequestEntity updated = jobMovementService.update(id, new JobMovementService.UpdateCommand(
        req.effectiveDate(),
        req.reasonCode(),
        req.reasonSubCode(),
        req.organizationId(),
        req.positionId(),
        req.jobGradeCode(),
        req.employeeGroupCode(),
        req.employeeSubgroupCode(),
        req.opinion(),
        req.remark()
    ));
    return ApiResponse.ok(jobMovementService.toDto(updated));
  }

  @PostMapping("/job-movement-requests/{id}/submit")
  public ApiResponse<Map<String, Object>> submit(
      @PathVariable("id") long id,
      @RequestBody(required = false) SubmitRequest req
  ) {
    requireEdit();
    Map<String, Long> assignees = new HashMap<>();
    if (req != null && req.nodeAssignees() != null) {
      req.nodeAssignees().forEach((k, v) -> {
        if (k == null || k.isBlank() || v == null || v.isBlank()) return;
        assignees.put(k.trim(), Long.parseLong(v.trim()));
      });
    }
    return ApiResponse.ok(jobMovementService.toDto(jobMovementService.submit(id, assignees)));
  }

  @PostMapping("/job-movement-requests/{id}/cancel")
  public ApiResponse<Map<String, Object>> cancel(@PathVariable("id") long id) {
    requireEdit();
    return ApiResponse.ok(jobMovementService.toDto(jobMovementService.cancel(id)));
  }

  private void requireView() {
    rbacService.requirePermission("employee:movement:view");
  }

  private void requireViewOrWorkflowParticipant(long requestId) {
    if (rbacService.hasPermission("employee:movement:view")) return;
    if (rbacService.hasPermission("workflow:task:view")
        && jobMovementService.canCurrentUserViewRequest(requestId)) {
      return;
    }
    throw new ForbiddenException("无权限查看该职务异动单");
  }

  private void requireEdit() {
    rbacService.requirePermission("employee:movement:edit");
  }

  public record CreateRequest(
      @NotBlank String movementType,
      @NotNull Long employeeId,
      Long fromAssignmentId,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDate,
      @NotBlank String reasonCode,
      String reasonSubCode,
      Long organizationId,
      Long positionId,
      String jobGradeCode,
      String employeeGroupCode,
      String employeeSubgroupCode,
      String opinion,
      String remark
  ) {}

  public record UpdateRequest(
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDate,
      String reasonCode,
      String reasonSubCode,
      Long organizationId,
      Long positionId,
      String jobGradeCode,
      String employeeGroupCode,
      String employeeSubgroupCode,
      String opinion,
      String remark
  ) {}

  public record SubmitRequest(Map<String, String> nodeAssignees) {}
}
