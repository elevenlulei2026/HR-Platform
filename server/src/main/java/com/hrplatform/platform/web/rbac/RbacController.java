package com.hrplatform.platform.web.rbac;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.platform.rbac.PermissionEntity;
import com.hrplatform.platform.rbac.PermissionMapper;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.rbac.RoleEntity;
import com.hrplatform.platform.rbac.RoleMapper;
import com.hrplatform.platform.rbac.RbacStatus;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class RbacController {
  private final RoleMapper roleMapper;
  private final PermissionMapper permissionMapper;
  private final RbacService rbacService;

  public RbacController(RoleMapper roleMapper, PermissionMapper permissionMapper, RbacService rbacService) {
    this.roleMapper = roleMapper;
    this.permissionMapper = permissionMapper;
    this.rbacService = rbacService;
  }

  // ---------------------------
  // Permissions
  // ---------------------------

  @GetMapping("/permissions")
  public ApiResponse<Map<String, Object>> listPermissions(
      @RequestParam(required = false) String keyword,
      @RequestParam @Min(value = 1, message = "page 必须 >= 1") long page,
      @RequestParam @Min(value = 1, message = "pageSize 必须 >= 1") @Max(value = 200, message = "pageSize 不能超过 200") long pageSize
  ) {
    rbacService.requirePermission("permission:manage");

    LambdaQueryWrapper<PermissionEntity> qw = new LambdaQueryWrapper<PermissionEntity>()
        .orderByAsc(PermissionEntity::getCode)
        .orderByAsc(PermissionEntity::getId);
    String kw = keyword == null ? null : keyword.trim();
    if (kw != null && !kw.isBlank()) {
      qw.and(w -> w.like(PermissionEntity::getCode, kw).or().like(PermissionEntity::getName, kw));
    }

    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    long offset = (p - 1) * ps;
    Long total = permissionMapper.selectCount(qw);
    qw.last("LIMIT " + offset + ", " + ps);
    List<PermissionEntity> records = permissionMapper.selectList(qw);

    Map<String, Object> pageResult = new HashMap<>();
    pageResult.put("items", records.stream().map(this::toPermissionDto).toList());
    pageResult.put("total", total == null ? 0 : total);
    pageResult.put("page", p);
    pageResult.put("pageSize", ps);
    return ApiResponse.ok(pageResult);
  }

  @PostMapping("/permissions")
  public ApiResponse<Map<String, Object>> createPermission(@Valid @RequestBody PermissionCreateRequest req) {
    rbacService.requirePermission("permission:manage");
    PermissionEntity e = new PermissionEntity();
    e.setCode(req.code());
    e.setName(req.name());
    e.setDescription(req.description());
    e.setStatus(req.status() == null || req.status().isBlank() ? RbacStatus.ACTIVE : req.status());
    permissionMapper.insert(e);
    return ApiResponse.ok(toPermissionDto(permissionMapper.selectById(e.getId())));
  }

  @GetMapping("/permissions/{id}")
  public ApiResponse<Map<String, Object>> getPermission(@PathVariable("id") long id) {
    rbacService.requirePermission("permission:manage");
    PermissionEntity e = permissionMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("权限点不存在");
    return ApiResponse.ok(toPermissionDto(e));
  }

  @PutMapping("/permissions/{id}")
  public ApiResponse<Map<String, Object>> updatePermission(
      @PathVariable("id") long id,
      @Valid @RequestBody PermissionUpdateRequest req
  ) {
    rbacService.requirePermission("permission:manage");
    PermissionEntity cur = permissionMapper.selectById(id);
    if (cur == null) throw new IllegalArgumentException("权限点不存在");
    if (req.name() != null) cur.setName(req.name());
    if (req.description() != null) cur.setDescription(req.description());
    if (req.status() != null) cur.setStatus(req.status());
    permissionMapper.updateById(cur);
    return ApiResponse.ok(toPermissionDto(permissionMapper.selectById(id)));
  }

  @DeleteMapping("/permissions/{id}")
  public ApiResponse<Map<String, Object>> deletePermission(@PathVariable("id") long id) {
    rbacService.requirePermission("permission:manage");
    PermissionEntity cur = permissionMapper.selectById(id);
    if (cur == null) throw new IllegalArgumentException("权限点不存在");
    if ("permission:manage".equals(cur.getCode())) {
      throw new IllegalArgumentException("系统权限点 permission:manage 不可删除");
    }
    if ("DISABLED".equals(cur.getStatus())) {
      throw new IllegalArgumentException("权限点已停用");
    }
    cur.setStatus(RbacStatus.DISABLED);
    permissionMapper.updateById(cur);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  // ---------------------------
  // Roles
  // ---------------------------

  @GetMapping("/roles")
  public ApiResponse<Map<String, Object>> listRoles(
      @RequestParam(required = false) String keyword,
      @RequestParam @Min(value = 1, message = "page 必须 >= 1") long page,
      @RequestParam @Min(value = 1, message = "pageSize 必须 >= 1") @Max(value = 200, message = "pageSize 不能超过 200") long pageSize
  ) {
    rbacService.requirePermission("permission:manage");

    LambdaQueryWrapper<RoleEntity> qw = new LambdaQueryWrapper<RoleEntity>()
        .orderByAsc(RoleEntity::getCode)
        .orderByAsc(RoleEntity::getId);
    String kw = keyword == null ? null : keyword.trim();
    if (kw != null && !kw.isBlank()) {
      qw.and(w -> w.like(RoleEntity::getCode, kw).or().like(RoleEntity::getName, kw));
    }

    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    long offset = (p - 1) * ps;
    Long total = roleMapper.selectCount(qw);
    qw.last("LIMIT " + offset + ", " + ps);
    List<RoleEntity> records = roleMapper.selectList(qw);

    Map<String, Object> pageResult = new HashMap<>();
    pageResult.put("items", records.stream().map(this::toRoleDto).toList());
    pageResult.put("total", total == null ? 0 : total);
    pageResult.put("page", p);
    pageResult.put("pageSize", ps);
    return ApiResponse.ok(pageResult);
  }

  @PostMapping("/roles")
  public ApiResponse<Map<String, Object>> createRole(@Valid @RequestBody RoleCreateRequest req) {
    rbacService.requirePermission("permission:manage");
    RoleEntity e = new RoleEntity();
    e.setCode(req.code());
    e.setName(req.name());
    e.setDescription(req.description());
    e.setStatus(req.status() == null || req.status().isBlank() ? RbacStatus.ACTIVE : req.status());
    e.setDataScope(req.dataScope() == null || req.dataScope().isBlank() ? "ALL" : req.dataScope());
    roleMapper.insert(e);
    return ApiResponse.ok(toRoleDto(roleMapper.selectById(e.getId())));
  }

  @GetMapping("/roles/{id}")
  public ApiResponse<Map<String, Object>> getRole(@PathVariable("id") long id) {
    rbacService.requirePermission("permission:manage");
    RoleEntity e = roleMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("角色不存在");
    return ApiResponse.ok(toRoleDto(e));
  }

  @PutMapping("/roles/{id}")
  public ApiResponse<Map<String, Object>> updateRole(
      @PathVariable("id") long id,
      @Valid @RequestBody RoleUpdateRequest req
  ) {
    rbacService.requirePermission("permission:manage");
    RoleEntity cur = roleMapper.selectById(id);
    if (cur == null) throw new IllegalArgumentException("角色不存在");
    if (req.name() != null) cur.setName(req.name());
    if (req.description() != null) cur.setDescription(req.description());
    if (req.status() != null) cur.setStatus(req.status());
    if (req.dataScope() != null) cur.setDataScope(req.dataScope());
    roleMapper.updateById(cur);
    return ApiResponse.ok(toRoleDto(roleMapper.selectById(id)));
  }

  @DeleteMapping("/roles/{id}")
  public ApiResponse<Map<String, Object>> deleteRole(@PathVariable("id") long id) {
    rbacService.requirePermission("permission:manage");
    RoleEntity cur = roleMapper.selectById(id);
    if (cur == null) throw new IllegalArgumentException("角色不存在");
    if ("admin".equals(cur.getCode())) {
      throw new IllegalArgumentException("系统角色 admin 不可删除");
    }
    if ("DISABLED".equals(cur.getStatus())) {
      throw new IllegalArgumentException("角色已停用");
    }
    cur.setStatus(RbacStatus.DISABLED);
    roleMapper.updateById(cur);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  @GetMapping("/roles/{id}/permissions")
  public ApiResponse<List<String>> listRolePermissions(@PathVariable("id") long id) {
    rbacService.requirePermission("permission:manage");
    return ApiResponse.ok(rbacService.listRolePermissions(id));
  }

  @PutMapping("/roles/{id}/permissions")
  public ApiResponse<Map<String, Object>> setRolePermissions(
      @PathVariable("id") long id,
      @Valid @RequestBody SetRolePermissionsRequest req
  ) {
    rbacService.requirePermission("permission:manage");
    rbacService.setRolePermissions(id, req.permissionCodes());
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  // ---------------------------
  // User roles（最小可用：按 userId 设置）
  // ---------------------------

  @GetMapping("/users/{id}/roles")
  public ApiResponse<List<String>> listUserRoles(@PathVariable("id") long id) {
    rbacService.requirePermission("permission:manage");
    return ApiResponse.ok(rbacService.listUserRoles(id));
  }

  @PutMapping("/users/{id}/roles")
  public ApiResponse<Map<String, Object>> setUserRoles(
      @PathVariable("id") long id,
      @Valid @RequestBody SetUserRolesRequest req
  ) {
    rbacService.requirePermission("permission:manage");
    rbacService.setUserRoles(id, req.roleCodes());
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  private Map<String, Object> toPermissionDto(PermissionEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", e.getId() == null ? null : String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("description", e.getDescription());
    dto.put("status", e.getStatus());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toRoleDto(RoleEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", e.getId() == null ? null : String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("description", e.getDescription());
    dto.put("status", e.getStatus());
    dto.put("dataScope", e.getDataScope());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  public record PermissionCreateRequest(
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      String description,
      String status
  ) {}

  public record PermissionUpdateRequest(
      String name,
      String description,
      String status
  ) {}

  public record RoleCreateRequest(
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      String description,
      String status,
      String dataScope
  ) {}

  public record RoleUpdateRequest(
      String name,
      String description,
      String status,
      String dataScope
  ) {}

  public record SetRolePermissionsRequest(List<String> permissionCodes) {}

  public record SetUserRolesRequest(List<String> roleCodes) {}
}

