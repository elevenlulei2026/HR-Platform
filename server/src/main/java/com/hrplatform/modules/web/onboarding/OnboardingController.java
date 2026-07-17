package com.hrplatform.modules.web.onboarding;

import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.PositionEntity;
import com.hrplatform.modules.onboarding.OnboardingCaseEntity;
import com.hrplatform.modules.onboarding.OnboardingService;
import com.hrplatform.modules.onboarding.OnboardingStatus;
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
public class OnboardingController {
  private final OnboardingService onboardingService;
  private final RbacService rbacService;

  public OnboardingController(OnboardingService onboardingService, RbacService rbacService) {
    this.onboardingService = onboardingService;
    this.rbacService = rbacService;
  }

  @GetMapping("/onboarding-cases")
  public ApiResponse<Map<String, Object>> list(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireView();
    var p = onboardingService.page(keyword, status, page, pageSize);
    Map<Long, OrganizationEntity> orgMap = onboardingService.orgMap(p.records());
    Map<Long, PositionEntity> posMap = onboardingService.positionMap(p.records());
    Map<Long, EmployeeEntity> empMap = onboardingService.employeeMap(p.records());
    List<Map<String, Object>> items = p.records().stream()
        .map(e -> onboardingService.toDto(
            e,
            orgMap.get(e.getOrganizationId()),
            posMap.get(e.getPositionId()),
            e.getEmployeeId() == null ? null : empMap.get(e.getEmployeeId()),
            true
        ))
        .toList();
    Map<String, Object> result = new HashMap<>();
    result.put("items", items);
    result.put("total", p.total());
    result.put("page", page);
    result.put("pageSize", pageSize);
    return ApiResponse.ok(result);
  }

  @GetMapping("/onboarding-cases/{id}")
  public ApiResponse<Map<String, Object>> get(@PathVariable("id") long id) {
    requireView();
    return ApiResponse.ok(toDetailDto(onboardingService.require(id)));
  }

  @PostMapping("/onboarding-cases")
  public ApiResponse<Map<String, Object>> create(@Valid @RequestBody CreateRequest req) {
    requireEdit();
    OnboardingCaseEntity created = onboardingService.create(new OnboardingService.CreateCommand(
        req.candidateName(),
        req.mobile(),
        req.gender(),
        req.organizationId(),
        req.positionId(),
        req.expectedHireDate(),
        req.employmentType(),
        req.remark()
    ));
    return ApiResponse.ok(toDetailDto(created));
  }

  @PutMapping("/onboarding-cases/{id}")
  public ApiResponse<Map<String, Object>> update(
      @PathVariable("id") long id,
      @Valid @RequestBody UpdateRequest req
  ) {
    requireEdit();
    OnboardingCaseEntity updated = onboardingService.update(id, new OnboardingService.UpdateCommand(
        req.candidateName(),
        req.mobile(),
        req.gender(),
        req.organizationId(),
        req.positionId(),
        req.expectedHireDate(),
        req.employmentType(),
        req.remark()
    ));
    return ApiResponse.ok(toDetailDto(updated));
  }

  @PostMapping("/onboarding-cases/{id}/submit")
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
    OnboardingCaseEntity submitted = onboardingService.submit(id, assignees);
    return ApiResponse.ok(toDetailDto(submitted));
  }

  @PostMapping("/onboarding-cases/{id}/cancel")
  public ApiResponse<Map<String, Object>> cancel(@PathVariable("id") long id) {
    requireEdit();
    return ApiResponse.ok(toDetailDto(onboardingService.cancel(id)));
  }

  @PostMapping("/onboarding-cases/{id}/complete")
  public ApiResponse<Map<String, Object>> complete(@PathVariable("id") long id) {
    requireEdit();
    return ApiResponse.ok(toDetailDto(onboardingService.complete(id)));
  }

  private Map<String, Object> toDetailDto(OnboardingCaseEntity e) {
    Map<Long, OrganizationEntity> orgMap = onboardingService.orgMap(List.of(e));
    Map<Long, PositionEntity> posMap = onboardingService.positionMap(List.of(e));
    Map<Long, EmployeeEntity> empMap = onboardingService.employeeMap(List.of(e));
    // DRAFT 编辑态返回完整手机号，便于 HR 代填
    boolean mask = !OnboardingStatus.DRAFT.equals(e.getStatus());
    return onboardingService.toDto(
        e,
        orgMap.get(e.getOrganizationId()),
        posMap.get(e.getPositionId()),
        e.getEmployeeId() == null ? null : empMap.get(e.getEmployeeId()),
        mask
    );
  }

  private void requireView() {
    rbacService.requirePermission("onboarding:view");
  }

  private void requireEdit() {
    rbacService.requirePermission("onboarding:edit");
  }

  public record CreateRequest(
      @NotBlank String candidateName,
      @NotBlank String mobile,
      String gender,
      @NotNull Long organizationId,
      @NotNull Long positionId,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expectedHireDate,
      String employmentType,
      String remark
  ) {}

  public record UpdateRequest(
      String candidateName,
      String mobile,
      String gender,
      Long organizationId,
      Long positionId,
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expectedHireDate,
      String employmentType,
      String remark
  ) {}

  public record SubmitRequest(Map<String, String> nodeAssignees) {}
}
