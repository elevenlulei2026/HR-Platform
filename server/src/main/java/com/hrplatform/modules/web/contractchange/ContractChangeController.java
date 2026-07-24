package com.hrplatform.modules.web.contractchange;

import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.organization.LegalEntityEntity;
import com.hrplatform.modules.contractchange.ContractChangeRequestEntity;
import com.hrplatform.modules.contractchange.ContractChangeService;
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
public class ContractChangeController {
  private final ContractChangeService contractChangeService;
  private final RbacService rbacService;

  public ContractChangeController(ContractChangeService contractChangeService, RbacService rbacService) {
    this.contractChangeService = contractChangeService;
    this.rbacService = rbacService;
  }

  @GetMapping("/contract-change-requests")
  public ApiResponse<Map<String, Object>> list(
      @RequestParam(required = false) String requestType,
      @RequestParam(required = false) String targetKind,
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireView();
    var p = contractChangeService.page(requestType, targetKind, keyword, status, page, pageSize);
    Map<String, Object> result = new HashMap<>();
    result.put("items", toDtoList(p.records()));
    result.put("total", p.total());
    result.put("page", page);
    result.put("pageSize", pageSize);
    return ApiResponse.ok(result);
  }

  @GetMapping("/contract-change-requests/expiring")
  public ApiResponse<Map<String, Object>> listExpiring(
      @RequestParam(required = false) Integer days,
      @RequestParam(required = false) String targetKind,
      @RequestParam(required = false) String keyword,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireView();
    var p = contractChangeService.pageExpiring(days, targetKind, keyword, page, pageSize);
    Map<Long, EmployeeEntity> empMap = contractChangeService.employeeMap(
        p.records().stream()
            .map(item -> {
              ContractChangeRequestEntity stub = new ContractChangeRequestEntity();
              stub.setEmployeeId(item.employeeId());
              return stub;
            })
            .toList()
    );
    List<Map<String, Object>> items = p.records().stream()
        .map(item -> contractChangeService.toExpiringDto(item, empMap.get(item.employeeId())))
        .toList();
    Map<String, Object> result = new HashMap<>();
    result.put("items", items);
    result.put("total", p.total());
    result.put("page", page);
    result.put("pageSize", pageSize);
    return ApiResponse.ok(result);
  }

  @PostMapping("/contract-change-requests/scan-expiry")
  public ApiResponse<Map<String, Object>> scanExpiry() {
    requireEdit();
    var scan = contractChangeService.scanExpiryReminders();
    Map<String, Object> result = new HashMap<>();
    result.put("scanned", scan.scanned());
    result.put("created", scan.created());
    return ApiResponse.ok(result);
  }

  @GetMapping("/contract-change-requests/{id}")
  public ApiResponse<Map<String, Object>> get(@PathVariable("id") long id) {
    requireViewOrWorkflowParticipant(id);
    return ApiResponse.ok(toDetailDto(contractChangeService.require(id)));
  }

  @GetMapping("/contract-change-requests/{id}/approval-tasks")
  public ApiResponse<List<Map<String, Object>>> approvalTasks(@PathVariable("id") long id) {
    requireViewOrWorkflowParticipant(id);
    return ApiResponse.ok(contractChangeService.listApprovalTasks(id));
  }

  @PostMapping("/contract-change-requests")
  public ApiResponse<Map<String, Object>> create(@Valid @RequestBody CreateRequest req) {
    requireEdit();
    ContractChangeRequestEntity created = contractChangeService.create(
        new ContractChangeService.CreateCommand(
            req.requestType(),
            req.targetKind(),
            req.employeeId(),
            req.sourceRecordId(),
            req.proposedStartDate(),
            req.proposedEndDate(),
            req.proposedEffectiveStartDate(),
            req.legalEntityId(),
            req.contractCategory(),
            req.contractCategoryDesc(),
            req.contractCode(),
            req.agreementCategory(),
            req.agreementCode(),
            req.fileAttachmentId(),
            req.opinion(),
            req.remark()
        )
    );
    return ApiResponse.ok(toDetailDto(created));
  }

  @PutMapping("/contract-change-requests/{id}")
  public ApiResponse<Map<String, Object>> update(
      @PathVariable("id") long id,
      @Valid @RequestBody UpdateRequest req
  ) {
    requireEdit();
    ContractChangeRequestEntity updated = contractChangeService.update(
        id,
        new ContractChangeService.UpdateCommand(
            req.proposedStartDate(),
            req.proposedEndDate(),
            req.proposedEffectiveStartDate(),
            req.legalEntityId(),
            req.contractCategory(),
            req.contractCategoryDesc(),
            req.contractCode(),
            req.agreementCategory(),
            req.agreementCode(),
            req.fileAttachmentId(),
            req.opinion(),
            req.remark()
        )
    );
    return ApiResponse.ok(toDetailDto(updated));
  }

  @PostMapping("/contract-change-requests/{id}/submit")
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
    return ApiResponse.ok(toDetailDto(contractChangeService.submit(id, assignees)));
  }

  @PostMapping("/contract-change-requests/{id}/cancel")
  public ApiResponse<Map<String, Object>> cancel(@PathVariable("id") long id) {
    requireEdit();
    return ApiResponse.ok(toDetailDto(contractChangeService.cancel(id)));
  }

  private List<Map<String, Object>> toDtoList(List<ContractChangeRequestEntity> records) {
    Map<Long, EmployeeEntity> empMap = contractChangeService.employeeMap(records);
    Map<Long, LegalEntityEntity> legalMap = contractChangeService.legalEntityMap(records);
    return records.stream()
        .map(e -> contractChangeService.toDto(
            e,
            empMap.get(e.getEmployeeId()),
            e.getLegalEntityId() == null ? null : legalMap.get(e.getLegalEntityId()),
            contractChangeService.loadSourceSnapshot(e)
        ))
        .toList();
  }

  private Map<String, Object> toDetailDto(ContractChangeRequestEntity e) {
    return toDtoList(List.of(e)).get(0);
  }

  private void requireView() {
    rbacService.requirePermission("contract:view");
  }

  private void requireViewOrWorkflowParticipant(long requestId) {
    if (rbacService.hasPermission("contract:view")) {
      return;
    }
    if (rbacService.hasPermission("workflow:task:view")
        && contractChangeService.canCurrentUserViewRequest(requestId)) {
      return;
    }
    throw new ForbiddenException("无权限查看该合同变更单");
  }

  private void requireEdit() {
    rbacService.requirePermission("contract:edit");
  }

  public record CreateRequest(
      @NotBlank String requestType,
      @NotBlank String targetKind,
      @NotNull Long employeeId,
      @NotNull Long sourceRecordId,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate proposedStartDate,
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate proposedEndDate,
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate proposedEffectiveStartDate,
      Long legalEntityId,
      String contractCategory,
      String contractCategoryDesc,
      String contractCode,
      String agreementCategory,
      String agreementCode,
      Long fileAttachmentId,
      String opinion,
      String remark
  ) {}

  public record UpdateRequest(
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate proposedStartDate,
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate proposedEndDate,
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate proposedEffectiveStartDate,
      Long legalEntityId,
      String contractCategory,
      String contractCategoryDesc,
      String contractCode,
      String agreementCategory,
      String agreementCode,
      Long fileAttachmentId,
      String opinion,
      String remark
  ) {}

  public record SubmitRequest(Map<String, String> nodeAssignees) {}
}
