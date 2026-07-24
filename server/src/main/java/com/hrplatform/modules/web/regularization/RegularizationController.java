package com.hrplatform.modules.web.regularization;

import com.hrplatform.core.employee.EmployeeAssignmentEntity;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.PositionEntity;
import com.hrplatform.modules.regularization.RegularizationRequestEntity;
import com.hrplatform.modules.regularization.RegularizationService;
import com.hrplatform.platform.audit.ForbiddenException;
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
@RequestMapping("/api/v1")
public class RegularizationController {
  private final RegularizationService regularizationService;
  private final RbacService rbacService;

  public RegularizationController(RegularizationService regularizationService, RbacService rbacService) {
    this.regularizationService = regularizationService;
    this.rbacService = rbacService;
  }

  @GetMapping("/regularization-requests")
  public ApiResponse<Map<String, Object>> list(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireView();
    var p = regularizationService.page(keyword, status, page, pageSize);
    Map<String, Object> result = new HashMap<>();
    result.put("items", toDtoList(p.records()));
    result.put("total", p.total());
    result.put("page", page);
    result.put("pageSize", pageSize);
    return ApiResponse.ok(result);
  }

  @GetMapping("/regularization-requests/{id}")
  public ApiResponse<Map<String, Object>> get(@PathVariable("id") long id) {
    requireViewOrWorkflowParticipant(id);
    return ApiResponse.ok(toDetailDto(regularizationService.require(id)));
  }

  @GetMapping("/regularization-requests/{id}/approval-tasks")
  public ApiResponse<List<Map<String, Object>>> approvalTasks(@PathVariable("id") long id) {
    requireViewOrWorkflowParticipant(id);
    return ApiResponse.ok(regularizationService.listApprovalTasks(id));
  }

  @PostMapping("/regularization-requests")
  public ApiResponse<Map<String, Object>> create(@Valid @RequestBody CreateRequest req) {
    requireEdit();
    RegularizationRequestEntity created = regularizationService.create(
        new RegularizationService.CreateCommand(
            req.employeeId(),
            req.assignmentId(),
            req.actualRegularizationDate(),
            req.reasonCode(),
            req.opinion(),
            req.remark()
        )
    );
    return ApiResponse.ok(toDetailDto(created));
  }

  @PutMapping("/regularization-requests/{id}")
  public ApiResponse<Map<String, Object>> update(
      @PathVariable("id") long id,
      @Valid @RequestBody UpdateRequest req
  ) {
    requireEdit();
    RegularizationRequestEntity updated = regularizationService.update(
        id,
        new RegularizationService.UpdateCommand(
            req.actualRegularizationDate(),
            req.reasonCode(),
            req.opinion(),
            req.remark()
        )
    );
    return ApiResponse.ok(toDetailDto(updated));
  }

  @PostMapping("/regularization-requests/{id}/submit")
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
    return ApiResponse.ok(toDetailDto(regularizationService.submit(id, assignees)));
  }

  @PostMapping("/regularization-requests/{id}/cancel")
  public ApiResponse<Map<String, Object>> cancel(@PathVariable("id") long id) {
    requireEdit();
    return ApiResponse.ok(toDetailDto(regularizationService.cancel(id)));
  }

  private List<Map<String, Object>> toDtoList(List<RegularizationRequestEntity> records) {
    Map<Long, EmployeeEntity> empMap = regularizationService.employeeMap(records);
    Map<Long, EmployeeAssignmentEntity> asgMap = regularizationService.assignmentMap(records);
    List<EmployeeAssignmentEntity> asgs = asgMap.values().stream().toList();
    Map<Long, OrganizationEntity> orgMap = regularizationService.orgMap(asgs);
    Map<Long, PositionEntity> posMap = regularizationService.positionMap(asgs);
    return records.stream()
        .map(e -> {
          EmployeeAssignmentEntity asg = asgMap.get(e.getAssignmentId());
          OrganizationEntity org = asg == null || asg.getOrganizationId() == null
              ? null : orgMap.get(asg.getOrganizationId());
          PositionEntity pos = asg == null || asg.getPositionId() == null
              ? null : posMap.get(asg.getPositionId());
          return regularizationService.toDto(e, empMap.get(e.getEmployeeId()), asg, org, pos);
        })
        .toList();
  }

  private Map<String, Object> toDetailDto(RegularizationRequestEntity e) {
    return toDtoList(List.of(e)).get(0);
  }

  private void requireView() {
    rbacService.requirePermission("employee:movement:view");
  }

  private void requireViewOrWorkflowParticipant(long requestId) {
    if (rbacService.hasPermission("employee:movement:view")) {
      return;
    }
    if (rbacService.hasPermission("workflow:task:view")
        && regularizationService.canCurrentUserViewRequest(requestId)) {
      return;
    }
    throw new ForbiddenException("无权限查看该转正单");
  }

  private void requireEdit() {
    rbacService.requirePermission("employee:movement:edit");
  }

  public record CreateRequest(
      @NotNull Long employeeId,
      Long assignmentId,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate actualRegularizationDate,
      String reasonCode,
      String opinion,
      String remark
  ) {}

  public record UpdateRequest(
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate actualRegularizationDate,
      String reasonCode,
      String opinion,
      String remark
  ) {}

  public record SubmitRequest(Map<String, String> nodeAssignees) {}
}
