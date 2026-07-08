package com.hrplatform.platform.web.employeegroup;

import com.hrplatform.platform.employeegroup.EmployeeGroupCatalogService;
import com.hrplatform.platform.employeegroup.EmployeeGroupEntity;
import com.hrplatform.platform.employeegroup.EmployeeSubgroupEntity;
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
public class EmployeeGroupCatalogController {
  private final EmployeeGroupCatalogService catalogService;
  private final RbacService rbacService;

  public EmployeeGroupCatalogController(
      EmployeeGroupCatalogService catalogService,
      RbacService rbacService
  ) {
    this.catalogService = catalogService;
    this.rbacService = rbacService;
  }

  @GetMapping("/employee-groups")
  public ApiResponse<List<Map<String, Object>>> listGroups() {
    requireDictManage();
    List<Map<String, Object>> items = catalogService.listGroups().stream().map(this::toGroupDto).toList();
    return ApiResponse.ok(items);
  }

  @PostMapping("/employee-groups")
  public ApiResponse<Map<String, Object>> createGroup(@Valid @RequestBody EmployeeGroupCreateRequest req) {
    requireDictManage();
    EmployeeGroupEntity entity = new EmployeeGroupEntity();
    entity.setCode(req.code());
    entity.setName(req.name());
    entity.setStatus(req.status());
    entity.setSort(req.sort());
    entity.setRemark(req.remark());
    return ApiResponse.ok(toGroupDto(catalogService.createGroup(entity)));
  }

  @PutMapping("/employee-groups/{id}")
  public ApiResponse<Map<String, Object>> updateGroup(
      @PathVariable("id") long id,
      @Valid @RequestBody EmployeeGroupUpdateRequest req
  ) {
    requireDictManage();
    EmployeeGroupEntity patch = new EmployeeGroupEntity();
    patch.setName(req.name());
    patch.setStatus(req.status());
    patch.setSort(req.sort());
    patch.setRemark(req.remark());
    return ApiResponse.ok(toGroupDto(catalogService.updateGroup(id, patch)));
  }

  @PatchMapping("/employee-groups/{id}/status")
  public ApiResponse<Map<String, Object>> updateGroupStatus(
      @PathVariable("id") long id,
      @Valid @RequestBody StatusPatchRequest req
  ) {
    requireDictManage();
    return ApiResponse.ok(toGroupDto(catalogService.updateGroupStatus(id, req.status())));
  }

  @GetMapping("/employee-groups/{code}/subgroups")
  public ApiResponse<List<Map<String, Object>>> listSubgroups(@PathVariable("code") String code) {
    requireDictManage();
    List<Map<String, Object>> items = catalogService.listSubgroupsByGroupCode(code).stream()
        .map(this::toSubgroupDto)
        .toList();
    return ApiResponse.ok(items);
  }

  @PostMapping("/employee-subgroups")
  public ApiResponse<Map<String, Object>> createSubgroup(@Valid @RequestBody EmployeeSubgroupCreateRequest req) {
    requireDictManage();
    EmployeeSubgroupEntity entity = new EmployeeSubgroupEntity();
    entity.setEmployeeGroupCode(req.employeeGroupCode());
    entity.setCode(req.code());
    entity.setName(req.name());
    entity.setStatus(req.status());
    entity.setSort(req.sort());
    entity.setRemark(req.remark());
    return ApiResponse.ok(toSubgroupDto(catalogService.createSubgroup(entity)));
  }

  @PutMapping("/employee-subgroups/{id}")
  public ApiResponse<Map<String, Object>> updateSubgroup(
      @PathVariable("id") long id,
      @Valid @RequestBody EmployeeSubgroupUpdateRequest req
  ) {
    requireDictManage();
    EmployeeSubgroupEntity patch = new EmployeeSubgroupEntity();
    patch.setName(req.name());
    patch.setStatus(req.status());
    patch.setSort(req.sort());
    patch.setRemark(req.remark());
    return ApiResponse.ok(toSubgroupDto(catalogService.updateSubgroup(id, patch)));
  }

  @PatchMapping("/employee-subgroups/{id}/status")
  public ApiResponse<Map<String, Object>> updateSubgroupStatus(
      @PathVariable("id") long id,
      @Valid @RequestBody StatusPatchRequest req
  ) {
    requireDictManage();
    return ApiResponse.ok(toSubgroupDto(catalogService.updateSubgroupStatus(id, req.status())));
  }

  @GetMapping("/employee-group-catalog/options")
  public ApiResponse<List<Map<String, Object>>> getOptions() {
    rbacService.requireLoggedIn();
    return ApiResponse.ok(catalogService.buildActiveOptions());
  }

  @GetMapping("/employee-group-catalog/tree")
  public ApiResponse<List<Map<String, Object>>> getTree() {
    requireDictManage();
    return ApiResponse.ok(catalogService.buildTreeRows());
  }

  private void requireDictManage() {
    rbacService.requirePermission("dict:manage");
  }

  private Map<String, Object> toGroupDto(EmployeeGroupEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("status", e.getStatus());
    dto.put("sort", e.getSort() == null ? 0 : e.getSort());
    dto.put("remark", e.getRemark());
    dto.put("subgroupCount", catalogService.listSubgroupsByGroupCode(e.getCode()).size());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toSubgroupDto(EmployeeSubgroupEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("employeeGroupCode", e.getEmployeeGroupCode());
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("status", e.getStatus());
    dto.put("sort", e.getSort() == null ? 0 : e.getSort());
    dto.put("remark", e.getRemark());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  public record EmployeeGroupCreateRequest(
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      String status,
      Integer sort,
      String remark
  ) {}

  public record EmployeeGroupUpdateRequest(
      String name,
      String status,
      Integer sort,
      String remark
  ) {}

  public record EmployeeSubgroupCreateRequest(
      @NotBlank(message = "employeeGroupCode 不能为空") String employeeGroupCode,
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      String status,
      Integer sort,
      String remark
  ) {}

  public record EmployeeSubgroupUpdateRequest(
      String name,
      String status,
      Integer sort,
      String remark
  ) {}

  public record StatusPatchRequest(@NotBlank(message = "status 不能为空") String status) {}
}
