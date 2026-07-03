package com.hrplatform.core.web.headcount;

import com.hrplatform.core.headcount.HeadcountPlanEntity;
import com.hrplatform.core.headcount.HeadcountService;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HeadcountController {
  private final HeadcountService headcountService;
  private final RbacService rbacService;

  public HeadcountController(HeadcountService headcountService, RbacService rbacService) {
    this.headcountService = headcountService;
    this.rbacService = rbacService;
  }

  @GetMapping("/headcount-plans")
  public ApiResponse<Map<String, Object>> listHeadcountPlans(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) Integer fiscalYear,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireView();
    var p = headcountService.page(keyword, fiscalYear, page, pageSize);
    Map<Long, OrganizationEntity> orgMap = headcountService.orgMap(p.records());
    List<Map<String, Object>> items = p.records().stream().map(e -> {
      OrganizationEntity org = orgMap.get(e.getOrganizationId());
      return toDto(e, org == null ? null : org.getCode(), org == null ? null : org.getName());
    }).toList();
    Map<String, Object> result = new HashMap<>();
    result.put("items", items);
    result.put("total", p.total());
    result.put("page", page);
    result.put("pageSize", pageSize);
    return ApiResponse.ok(result);
  }

  @PostMapping("/headcount-plans")
  public ApiResponse<Map<String, Object>> createHeadcountPlan(@Valid @RequestBody HeadcountPlanCreateRequest req) {
    requireEdit();
    HeadcountPlanEntity entity = new HeadcountPlanEntity();
    entity.setOrganizationId(req.organizationId());
    entity.setFiscalYear(req.fiscalYear());
    entity.setPlannedCount(req.plannedCount());
    entity.setOccupiedCount(0);
    entity.setReservedCount(0);
    HeadcountPlanEntity created = headcountService.create(entity);
    Map<Long, OrganizationEntity> orgMap = headcountService.orgMap(List.of(created));
    OrganizationEntity org = orgMap.get(created.getOrganizationId());
    return ApiResponse.ok(toDto(created, org == null ? null : org.getCode(), org == null ? null : org.getName()));
  }

  @PutMapping("/headcount-plans/{id}")
  public ApiResponse<Map<String, Object>> updateHeadcountPlan(
      @PathVariable("id") long id,
      @Valid @RequestBody HeadcountPlanUpdateRequest req
  ) {
    requireEdit();
    HeadcountPlanEntity patch = new HeadcountPlanEntity();
    patch.setPlannedCount(req.plannedCount());
    patch.setOccupiedCount(req.occupiedCount());
    patch.setReservedCount(req.reservedCount());
    HeadcountPlanEntity updated = headcountService.update(id, patch);
    Map<Long, OrganizationEntity> orgMap = headcountService.orgMap(List.of(updated));
    OrganizationEntity org = orgMap.get(updated.getOrganizationId());
    return ApiResponse.ok(toDto(updated, org == null ? null : org.getCode(), org == null ? null : org.getName()));
  }

  @DeleteMapping("/headcount-plans/{id}")
  public ApiResponse<Map<String, Object>> deleteHeadcountPlan(@PathVariable("id") long id) {
    requireEdit();
    headcountService.delete(id);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  @PostMapping("/headcount/check")
  public ApiResponse<Map<String, Object>> checkHeadcount(@Valid @RequestBody HeadcountCheckRequest req) {
    requireView();
    int fiscalYear = req.fiscalYear() == null ? headcountService.defaultFiscalYear() : req.fiscalYear();
    int delta = req.delta() == null ? 1 : req.delta();
    HeadcountService.CheckResult r = headcountService.check(req.organizationId(), fiscalYear, delta);
    Map<String, Object> dto = new HashMap<>();
    dto.put("allowed", r.allowed());
    dto.put("organizationId", String.valueOf(r.organizationId()));
    dto.put("fiscalYear", r.fiscalYear());
    dto.put("plannedCount", r.plannedCount());
    dto.put("occupiedCount", r.occupiedCount());
    dto.put("reservedCount", r.reservedCount());
    dto.put("availableCount", r.availableCount());
    dto.put("reason", r.reason());
    return ApiResponse.ok(dto);
  }

  private void requireView() { rbacService.requirePermission("headcount:view"); }
  private void requireEdit() { rbacService.requirePermission("headcount:edit"); }

  private Map<String, Object> toDto(HeadcountPlanEntity e, String orgCode, String orgName) {
    int planned = e.getPlannedCount() == null ? 0 : e.getPlannedCount();
    int occupied = e.getOccupiedCount() == null ? 0 : e.getOccupiedCount();
    int reserved = e.getReservedCount() == null ? 0 : e.getReservedCount();
    int available = Math.max(0, planned - occupied - reserved);
    double usageRate = planned <= 0 ? 0 : (double) (occupied + reserved) / planned;
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("organizationId", String.valueOf(e.getOrganizationId()));
    dto.put("organizationCode", orgCode);
    dto.put("organizationName", orgName);
    dto.put("fiscalYear", e.getFiscalYear());
    dto.put("plannedCount", planned);
    dto.put("occupiedCount", occupied);
    dto.put("reservedCount", reserved);
    dto.put("availableCount", available);
    dto.put("usageRate", usageRate);
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  public record HeadcountPlanCreateRequest(
      @NotNull Long organizationId,
      @NotNull Integer fiscalYear,
      @NotNull Integer plannedCount
  ) {}

  public record HeadcountPlanUpdateRequest(Integer plannedCount, Integer occupiedCount, Integer reservedCount) {}

  public record HeadcountCheckRequest(
      @NotNull Long organizationId,
      Integer fiscalYear,
      Integer delta
  ) {}
}
