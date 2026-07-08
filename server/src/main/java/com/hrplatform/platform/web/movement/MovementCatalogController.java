package com.hrplatform.platform.web.movement;

import com.hrplatform.platform.movement.MovementCatalogService;
import com.hrplatform.platform.movement.MovementReasonEntity;
import com.hrplatform.platform.movement.MovementReasonSubEntity;
import com.hrplatform.platform.movement.MovementTypeEntity;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class MovementCatalogController {
  private final MovementCatalogService catalogService;
  private final RbacService rbacService;

  public MovementCatalogController(MovementCatalogService catalogService, RbacService rbacService) {
    this.catalogService = catalogService;
    this.rbacService = rbacService;
  }

  @GetMapping("/movement-types")
  public ApiResponse<List<Map<String, Object>>> listTypes() {
    requireDictManage();
    List<Map<String, Object>> items = catalogService.listTypes().stream().map(this::toTypeDto).toList();
    return ApiResponse.ok(items);
  }

  @PostMapping("/movement-types")
  public ApiResponse<Map<String, Object>> createType(@Valid @RequestBody MovementTypeCreateRequest req) {
    requireDictManage();
    MovementTypeEntity entity = new MovementTypeEntity();
    entity.setCode(req.code());
    entity.setName(req.name());
    entity.setPhase(req.phase());
    entity.setStatus(req.status());
    entity.setSort(req.sort());
    entity.setRemark(req.remark());
    return ApiResponse.ok(toTypeDto(catalogService.createType(entity)));
  }

  @PutMapping("/movement-types/{id}")
  public ApiResponse<Map<String, Object>> updateType(
      @PathVariable("id") long id,
      @Valid @RequestBody MovementTypeUpdateRequest req
  ) {
    requireDictManage();
    MovementTypeEntity patch = new MovementTypeEntity();
    patch.setName(req.name());
    patch.setPhase(req.phase());
    patch.setStatus(req.status());
    patch.setSort(req.sort());
    patch.setRemark(req.remark());
    return ApiResponse.ok(toTypeDto(catalogService.updateType(id, patch)));
  }

  @PatchMapping("/movement-types/{id}/status")
  public ApiResponse<Map<String, Object>> updateTypeStatus(
      @PathVariable("id") long id,
      @Valid @RequestBody StatusPatchRequest req
  ) {
    requireDictManage();
    return ApiResponse.ok(toTypeDto(catalogService.updateTypeStatus(id, req.status())));
  }

  @GetMapping("/movement-types/{code}/reasons")
  public ApiResponse<List<Map<String, Object>>> listReasons(@PathVariable("code") String code) {
    requireDictManage();
    List<Map<String, Object>> items = catalogService.listReasonsByTypeCode(code).stream()
        .map(r -> toReasonDto(r, catalogService.listSubsByReasonId(r.getId()).size()))
        .toList();
    return ApiResponse.ok(items);
  }

  @PostMapping("/movement-reasons")
  public ApiResponse<Map<String, Object>> createReason(@Valid @RequestBody MovementReasonCreateRequest req) {
    requireDictManage();
    MovementReasonEntity entity = new MovementReasonEntity();
    entity.setMovementTypeCode(req.movementTypeCode());
    entity.setCode(req.code());
    entity.setName(req.name());
    entity.setStatus(req.status());
    entity.setSort(req.sort());
    entity.setRemark(req.remark());
    MovementReasonEntity created = catalogService.createReason(entity);
    return ApiResponse.ok(toReasonDto(created, 0));
  }

  @PutMapping("/movement-reasons/{id}")
  public ApiResponse<Map<String, Object>> updateReason(
      @PathVariable("id") long id,
      @Valid @RequestBody MovementReasonUpdateRequest req
  ) {
    requireDictManage();
    MovementReasonEntity patch = new MovementReasonEntity();
    patch.setName(req.name());
    patch.setStatus(req.status());
    patch.setSort(req.sort());
    patch.setRemark(req.remark());
    MovementReasonEntity updated = catalogService.updateReason(id, patch);
    return ApiResponse.ok(toReasonDto(updated, catalogService.listSubsByReasonId(updated.getId()).size()));
  }

  @PatchMapping("/movement-reasons/{id}/status")
  public ApiResponse<Map<String, Object>> updateReasonStatus(
      @PathVariable("id") long id,
      @Valid @RequestBody StatusPatchRequest req
  ) {
    requireDictManage();
    MovementReasonEntity updated = catalogService.updateReasonStatus(id, req.status());
    return ApiResponse.ok(toReasonDto(updated, catalogService.listSubsByReasonId(updated.getId()).size()));
  }

  @GetMapping("/movement-reasons/{id}/subs")
  public ApiResponse<List<Map<String, Object>>> listSubs(@PathVariable("id") long id) {
    requireDictManage();
    catalogService.requireReason(id);
    List<Map<String, Object>> items = catalogService.listSubsByReasonId(id).stream()
        .map(this::toSubDto)
        .toList();
    return ApiResponse.ok(items);
  }

  @PostMapping("/movement-reason-subs")
  public ApiResponse<Map<String, Object>> createSub(@Valid @RequestBody MovementReasonSubCreateRequest req) {
    requireDictManage();
    MovementReasonSubEntity entity = new MovementReasonSubEntity();
    entity.setReasonId(Long.parseLong(req.reasonId()));
    entity.setCode(req.code());
    entity.setName(req.name());
    entity.setStatus(req.status());
    entity.setSort(req.sort());
    return ApiResponse.ok(toSubDto(catalogService.createSub(entity)));
  }

  @PutMapping("/movement-reason-subs/{id}")
  public ApiResponse<Map<String, Object>> updateSub(
      @PathVariable("id") long id,
      @Valid @RequestBody MovementReasonSubUpdateRequest req
  ) {
    requireDictManage();
    MovementReasonSubEntity patch = new MovementReasonSubEntity();
    patch.setName(req.name());
    patch.setStatus(req.status());
    patch.setSort(req.sort());
    return ApiResponse.ok(toSubDto(catalogService.updateSub(id, patch)));
  }

  @PatchMapping("/movement-reason-subs/{id}/status")
  public ApiResponse<Map<String, Object>> updateSubStatus(
      @PathVariable("id") long id,
      @Valid @RequestBody StatusPatchRequest req
  ) {
    requireDictManage();
    return ApiResponse.ok(toSubDto(catalogService.updateSubStatus(id, req.status())));
  }

  @GetMapping("/movement-catalog/options")
  public ApiResponse<List<Map<String, Object>>> getOptions() {
    rbacService.requireLoggedIn();
    return ApiResponse.ok(catalogService.buildActiveOptions());
  }

  @GetMapping("/movement-catalog/tree")
  public ApiResponse<List<Map<String, Object>>> getTree() {
    requireDictManage();
    return ApiResponse.ok(catalogService.buildTreeRows());
  }

  private void requireDictManage() {
    rbacService.requirePermission("dict:manage");
  }

  private Map<String, Object> toTypeDto(MovementTypeEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("phase", e.getPhase());
    dto.put("phaseLabel", phaseLabel(e.getPhase()));
    dto.put("status", e.getStatus());
    dto.put("sort", e.getSort() == null ? 0 : e.getSort());
    dto.put("remark", e.getRemark());
    dto.put("reasonCount", catalogService.listReasonsByTypeCode(e.getCode()).size());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toReasonDto(MovementReasonEntity e, int subCount) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("movementTypeCode", e.getMovementTypeCode());
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("status", e.getStatus());
    dto.put("sort", e.getSort() == null ? 0 : e.getSort());
    dto.put("remark", e.getRemark());
    dto.put("subCount", subCount);
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toSubDto(MovementReasonSubEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("reasonId", String.valueOf(e.getReasonId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("status", e.getStatus());
    dto.put("sort", e.getSort() == null ? 0 : e.getSort());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private static String phaseLabel(String phase) {
    if (phase == null) return "";
    return switch (phase) {
      case "HIRE" -> "入职";
      case "CHANGE" -> "在职";
      case "LEAVE" -> "离职";
      default -> phase;
    };
  }

  public record MovementTypeCreateRequest(
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      @NotBlank(message = "phase 不能为空") String phase,
      String status,
      Integer sort,
      String remark
  ) {}

  public record MovementTypeUpdateRequest(
      String name,
      String phase,
      String status,
      Integer sort,
      String remark
  ) {}

  public record MovementReasonCreateRequest(
      @NotBlank(message = "movementTypeCode 不能为空") String movementTypeCode,
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      String status,
      Integer sort,
      String remark
  ) {}

  public record MovementReasonUpdateRequest(
      String name,
      String status,
      Integer sort,
      String remark
  ) {}

  public record MovementReasonSubCreateRequest(
      @NotBlank(message = "reasonId 不能为空") String reasonId,
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      String status,
      Integer sort
  ) {}

  public record MovementReasonSubUpdateRequest(
      String name,
      String status,
      Integer sort
  ) {}

  public record StatusPatchRequest(@NotBlank(message = "status 不能为空") String status) {}
}
