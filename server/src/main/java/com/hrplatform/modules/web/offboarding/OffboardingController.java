package com.hrplatform.modules.web.offboarding;

import com.hrplatform.core.employee.EmployeeAssignmentEntity;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.PositionEntity;
import com.hrplatform.modules.offboarding.OffboardingCaseEntity;
import com.hrplatform.modules.offboarding.OffboardingHandoverItemEntity;
import com.hrplatform.modules.offboarding.OffboardingService;
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
public class OffboardingController {
  private final OffboardingService offboardingService;
  private final RbacService rbacService;

  public OffboardingController(OffboardingService offboardingService, RbacService rbacService) {
    this.offboardingService = offboardingService;
    this.rbacService = rbacService;
  }

  @GetMapping("/offboarding-cases")
  public ApiResponse<Map<String, Object>> list(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireView();
    var p = offboardingService.page(keyword, status, page, pageSize);
    Map<String, Object> result = new HashMap<>();
    result.put("items", toDtoList(p.records()));
    result.put("total", p.total());
    result.put("page", page);
    result.put("pageSize", pageSize);
    return ApiResponse.ok(result);
  }

  @GetMapping("/offboarding-cases/{id}")
  public ApiResponse<Map<String, Object>> get(@PathVariable("id") long id) {
    requireViewOrWorkflowParticipant(id);
    return ApiResponse.ok(toDetailDto(offboardingService.require(id)));
  }

  @GetMapping("/offboarding-cases/{id}/approval-tasks")
  public ApiResponse<List<Map<String, Object>>> approvalTasks(@PathVariable("id") long id) {
    requireViewOrWorkflowParticipant(id);
    return ApiResponse.ok(offboardingService.listApprovalTasks(id));
  }

  @PostMapping("/offboarding-cases")
  public ApiResponse<Map<String, Object>> create(@Valid @RequestBody CreateRequest req) {
    requireEdit();
    OffboardingCaseEntity created = offboardingService.create(
        new OffboardingService.CreateCommand(
            req.employeeId(),
            req.assignmentId(),
            req.lastWorkDay(),
            req.reasonCode(),
            req.reasonSubCode(),
            req.handoverToEmployeeId(),
            req.remark()
        )
    );
    return ApiResponse.ok(toDetailDto(created));
  }

  @PutMapping("/offboarding-cases/{id}")
  public ApiResponse<Map<String, Object>> update(
      @PathVariable("id") long id,
      @Valid @RequestBody UpdateRequest req
  ) {
    requireEdit();
    boolean clearHandover = req.handoverToEmployeeId() != null && req.handoverToEmployeeId().isBlank();
    Long handoverId = null;
    if (req.handoverToEmployeeId() != null && !req.handoverToEmployeeId().isBlank()) {
      handoverId = Long.parseLong(req.handoverToEmployeeId().trim());
    }
    OffboardingCaseEntity updated = offboardingService.update(
        id,
        new OffboardingService.UpdateCommand(
            req.lastWorkDay(),
            req.reasonCode(),
            req.reasonSubCode(),
            handoverId,
            clearHandover,
            req.remark()
        )
    );
    return ApiResponse.ok(toDetailDto(updated));
  }

  @PostMapping("/offboarding-cases/{id}/submit")
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
    return ApiResponse.ok(toDetailDto(offboardingService.submit(id, assignees)));
  }

  @PostMapping("/offboarding-cases/{id}/cancel")
  public ApiResponse<Map<String, Object>> cancel(@PathVariable("id") long id) {
    requireEdit();
    return ApiResponse.ok(toDetailDto(offboardingService.cancel(id)));
  }

  @PostMapping("/offboarding-cases/{id}/handover-items")
  public ApiResponse<Map<String, Object>> addItem(
      @PathVariable("id") long id,
      @Valid @RequestBody ItemCreateRequest req
  ) {
    requireEdit();
    return ApiResponse.ok(toDetailDto(offboardingService.addHandoverItem(id, req.title())));
  }

  @PutMapping("/offboarding-cases/{id}/handover-items/{itemId}")
  public ApiResponse<Map<String, Object>> updateItem(
      @PathVariable("id") long id,
      @PathVariable("itemId") long itemId,
      @Valid @RequestBody ItemUpdateRequest req
  ) {
    requireEdit();
    return ApiResponse.ok(toDetailDto(offboardingService.updateHandoverItem(
        id,
        itemId,
        new OffboardingService.ItemUpdateCommand(req.title(), req.done(), req.assigneeNote())
    )));
  }

  @DeleteMapping("/offboarding-cases/{id}/handover-items/{itemId}")
  public ApiResponse<Map<String, Object>> removeItem(
      @PathVariable("id") long id,
      @PathVariable("itemId") long itemId
  ) {
    requireEdit();
    return ApiResponse.ok(toDetailDto(offboardingService.removeHandoverItem(id, itemId)));
  }

  @PostMapping("/offboarding-cases/{id}/complete")
  public ApiResponse<Map<String, Object>> complete(
      @PathVariable("id") long id,
      @RequestBody(required = false) CompleteRequest req
  ) {
    requireEdit();
    String remark = req == null ? null : req.remark();
    return ApiResponse.ok(toDetailDto(offboardingService.complete(id, remark)));
  }

  private List<Map<String, Object>> toDtoList(List<OffboardingCaseEntity> records) {
    Map<Long, EmployeeEntity> empMap = offboardingService.employeeMap(records);
    Map<Long, EmployeeAssignmentEntity> asgMap = offboardingService.assignmentMap(records);
    List<EmployeeAssignmentEntity> asgs = asgMap.values().stream().toList();
    Map<Long, OrganizationEntity> orgMap = offboardingService.orgMap(asgs);
    Map<Long, PositionEntity> posMap = offboardingService.positionMap(asgs);
    return records.stream()
        .map(e -> {
          EmployeeAssignmentEntity asg = asgMap.get(e.getAssignmentId());
          OrganizationEntity org = asg == null || asg.getOrganizationId() == null
              ? null : orgMap.get(asg.getOrganizationId());
          PositionEntity pos = asg == null || asg.getPositionId() == null
              ? null : posMap.get(asg.getPositionId());
          EmployeeEntity handoverTo = e.getHandoverToEmployeeId() == null
              ? null : empMap.get(e.getHandoverToEmployeeId());
          List<OffboardingHandoverItemEntity> items = offboardingService.listItems(e.getId());
          return offboardingService.toDto(
              e, empMap.get(e.getEmployeeId()), asg, org, pos, handoverTo, items);
        })
        .toList();
  }

  private Map<String, Object> toDetailDto(OffboardingCaseEntity e) {
    return toDtoList(List.of(e)).get(0);
  }

  private void requireView() {
    rbacService.requirePermission("offboarding:view");
  }

  private void requireViewOrWorkflowParticipant(long caseId) {
    if (rbacService.hasPermission("offboarding:view")) {
      return;
    }
    if (rbacService.hasPermission("workflow:task:view")
        && offboardingService.canCurrentUserViewCase(caseId)) {
      return;
    }
    throw new ForbiddenException("无权限查看该离职单");
  }

  private void requireEdit() {
    rbacService.requirePermission("offboarding:edit");
  }

  public record CreateRequest(
      @NotNull Long employeeId,
      Long assignmentId,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate lastWorkDay,
      @NotBlank String reasonCode,
      String reasonSubCode,
      Long handoverToEmployeeId,
      String remark
  ) {}

  public record UpdateRequest(
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate lastWorkDay,
      String reasonCode,
      String reasonSubCode,
      /** 传空字符串表示清空交接人 */
      String handoverToEmployeeId,
      String remark
  ) {}

  public record SubmitRequest(Map<String, String> nodeAssignees) {}

  public record ItemCreateRequest(@NotBlank String title) {}

  public record ItemUpdateRequest(String title, Boolean done, String assigneeNote) {}

  public record CompleteRequest(String remark) {}
}
