package com.hrplatform.platform.web.parentchild;

import com.hrplatform.platform.parentchild.ParentChildCatalogService;
import com.hrplatform.platform.parentchild.ParentChildItemEntity;
import com.hrplatform.platform.parentchild.ParentChildTypeEntity;
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
public class ParentChildCatalogController {
  private final ParentChildCatalogService catalogService;
  private final RbacService rbacService;

  public ParentChildCatalogController(
      ParentChildCatalogService catalogService,
      RbacService rbacService
  ) {
    this.catalogService = catalogService;
    this.rbacService = rbacService;
  }

  @GetMapping("/parent-child-types")
  public ApiResponse<List<Map<String, Object>>> listTypes() {
    requireDictManage();
    return ApiResponse.ok(catalogService.listTypes().stream().map(this::toTypeDto).toList());
  }

  @PostMapping("/parent-child-types")
  public ApiResponse<Map<String, Object>> createType(@Valid @RequestBody TypeCreateRequest req) {
    requireDictManage();
    ParentChildTypeEntity entity = new ParentChildTypeEntity();
    entity.setCode(req.code());
    entity.setName(req.name());
    entity.setDescription(req.description());
    entity.setStatus(req.status());
    entity.setSort(req.sort());
    return ApiResponse.ok(toTypeDto(catalogService.createType(entity)));
  }

  @PutMapping("/parent-child-types/{id}")
  public ApiResponse<Map<String, Object>> updateType(
      @PathVariable("id") long id,
      @Valid @RequestBody TypeUpdateRequest req
  ) {
    requireDictManage();
    ParentChildTypeEntity patch = new ParentChildTypeEntity();
    patch.setName(req.name());
    patch.setDescription(req.description());
    patch.setStatus(req.status());
    patch.setSort(req.sort());
    return ApiResponse.ok(toTypeDto(catalogService.updateType(id, patch)));
  }

  @GetMapping("/parent-child-types/{typeCode}/parents")
  public ApiResponse<List<Map<String, Object>>> listParents(@PathVariable("typeCode") String typeCode) {
    requireDictManage();
    return ApiResponse.ok(catalogService.listParents(typeCode).stream().map(this::toItemDto).toList());
  }

  @GetMapping("/parent-child-types/{typeCode}/parents/{parentCode}/children")
  public ApiResponse<List<Map<String, Object>>> listChildren(
      @PathVariable("typeCode") String typeCode,
      @PathVariable("parentCode") String parentCode
  ) {
    requireDictManage();
    return ApiResponse.ok(catalogService.listChildren(typeCode, parentCode).stream().map(this::toItemDto).toList());
  }

  @PostMapping("/parent-child-parents")
  public ApiResponse<Map<String, Object>> createParent(@Valid @RequestBody ParentCreateRequest req) {
    requireDictManage();
    ParentChildItemEntity entity = new ParentChildItemEntity();
    entity.setCode(req.code());
    entity.setName(req.name());
    entity.setStatus(req.status());
    entity.setSort(req.sort());
    entity.setRemark(req.remark());
    return ApiResponse.ok(toItemDto(catalogService.createParent(req.typeCode(), entity)));
  }

  @PutMapping("/parent-child-parents/{id}")
  public ApiResponse<Map<String, Object>> updateParent(
      @PathVariable("id") long id,
      @Valid @RequestBody ItemUpdateRequest req
  ) {
    requireDictManage();
    ParentChildItemEntity patch = new ParentChildItemEntity();
    patch.setName(req.name());
    patch.setStatus(req.status());
    patch.setSort(req.sort());
    patch.setRemark(req.remark());
    return ApiResponse.ok(toItemDto(catalogService.updateParent(id, patch)));
  }

  @PostMapping("/parent-child-children")
  public ApiResponse<Map<String, Object>> createChild(@Valid @RequestBody ChildCreateRequest req) {
    requireDictManage();
    ParentChildItemEntity entity = new ParentChildItemEntity();
    entity.setCode(req.code());
    entity.setName(req.name());
    entity.setStatus(req.status());
    entity.setSort(req.sort());
    entity.setRemark(req.remark());
    return ApiResponse.ok(toItemDto(catalogService.createChild(req.typeCode(), req.parentCode(), entity)));
  }

  @PutMapping("/parent-child-children/{id}")
  public ApiResponse<Map<String, Object>> updateChild(
      @PathVariable("id") long id,
      @Valid @RequestBody ItemUpdateRequest req
  ) {
    requireDictManage();
    ParentChildItemEntity patch = new ParentChildItemEntity();
    patch.setName(req.name());
    patch.setStatus(req.status());
    patch.setSort(req.sort());
    patch.setRemark(req.remark());
    return ApiResponse.ok(toItemDto(catalogService.updateChild(id, patch)));
  }

  @PatchMapping("/parent-child-items/{id}/status")
  public ApiResponse<Map<String, Object>> updateItemStatus(
      @PathVariable("id") long id,
      @Valid @RequestBody StatusPatchRequest req
  ) {
    requireDictManage();
    return ApiResponse.ok(toItemDto(catalogService.updateItemStatus(id, req.status())));
  }

  @GetMapping("/parent-child-types/{typeCode}/tree")
  public ApiResponse<List<Map<String, Object>>> getTree(@PathVariable("typeCode") String typeCode) {
    requireDictManage();
    return ApiResponse.ok(catalogService.buildTreeRows(typeCode));
  }

  @GetMapping("/parent-child-types/{typeCode}/tree3")
  public ApiResponse<List<Map<String, Object>>> getTree3(@PathVariable("typeCode") String typeCode) {
    requireDictManage();
    return ApiResponse.ok(catalogService.buildTreeRows3(typeCode));
  }

  @GetMapping("/parent-child-types/{typeCode}/options")
  public ApiResponse<List<Map<String, Object>>> getActiveOptions(@PathVariable("typeCode") String typeCode) {
    rbacService.requireLoggedIn();
    return ApiResponse.ok(catalogService.buildActiveOptions(typeCode));
  }

  @GetMapping("/parent-child-types/{typeCode}/options3")
  public ApiResponse<List<Map<String, Object>>> getActiveOptions3(@PathVariable("typeCode") String typeCode) {
    rbacService.requireLoggedIn();
    return ApiResponse.ok(catalogService.buildActiveOptions3(typeCode));
  }

  private void requireDictManage() {
    rbacService.requirePermission("dict:manage");
  }

  private Map<String, Object> toTypeDto(ParentChildTypeEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", e.getId() == null ? null : String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("description", e.getDescription());
    dto.put("status", e.getStatus());
    dto.put("sort", e.getSort() == null ? 0 : e.getSort());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toItemDto(ParentChildItemEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", e.getId() == null ? null : String.valueOf(e.getId()));
    dto.put("typeCode", e.getTypeCode());
    dto.put("parentCode", e.getParentCode());
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("status", e.getStatus());
    dto.put("sort", e.getSort() == null ? 0 : e.getSort());
    dto.put("remark", e.getRemark());
    dto.put("extJson", com.hrplatform.platform.auth.Jsons.readMap(e.getExtJson()));
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  public record TypeCreateRequest(
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      String description,
      String status,
      Integer sort
  ) {}

  public record TypeUpdateRequest(
      String name,
      String description,
      String status,
      Integer sort
  ) {}

  public record ParentCreateRequest(
      @NotBlank(message = "typeCode 不能为空") String typeCode,
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      String status,
      Integer sort,
      String remark
  ) {}

  public record ChildCreateRequest(
      @NotBlank(message = "typeCode 不能为空") String typeCode,
      @NotBlank(message = "parentCode 不能为空") String parentCode,
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      String status,
      Integer sort,
      String remark
  ) {}

  public record ItemUpdateRequest(
      String name,
      String status,
      Integer sort,
      String remark
  ) {}

  public record StatusPatchRequest(@NotBlank(message = "status 不能为空") String status) {}
}

