package com.hrplatform.platform.web.rbac;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.platform.rbac.PermissionEntity;
import com.hrplatform.platform.rbac.PermissionMapper;
import com.hrplatform.platform.rbac.PermissionMenuResolver;
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
  private final PermissionMenuResolver permissionMenuResolver;

  public RbacController(
      RoleMapper roleMapper,
      PermissionMapper permissionMapper,
      RbacService rbacService,
      PermissionMenuResolver permissionMenuResolver
  ) {
    this.roleMapper = roleMapper;
    this.permissionMapper = permissionMapper;
    this.rbacService = rbacService;
    this.permissionMenuResolver = permissionMenuResolver;
  }

  // ---------------------------
  // Permissions
  // ---------------------------

  @GetMapping("/permissions")
  public ApiResponse<Map<String, Object>> listPermissions(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) Long menuId,
      @RequestParam(required = false) String moduleCode,
      @RequestParam @Min(value = 1, message = "page 必须 >= 1") long page,
      @RequestParam @Min(value = 1, message = "pageSize 必须 >= 1") @Max(value = 500, message = "pageSize 不能超过 500") long pageSize
  ) {
    rbacService.requirePermission("permission:manage");

    LambdaQueryWrapper<PermissionEntity> qw = new LambdaQueryWrapper<PermissionEntity>()
        .orderByAsc(PermissionEntity::getModuleCode)
        .orderByAsc(PermissionEntity::getSortOrder)
        .orderByAsc(PermissionEntity::getCode)
        .orderByAsc(PermissionEntity::getId);
    String kw = keyword == null ? null : keyword.trim();
    if (kw != null && !kw.isBlank()) {
      qw.and(w -> w.like(PermissionEntity::getCode, kw)
          .or().like(PermissionEntity::getName, kw)
          .or().like(PermissionEntity::getModuleCode, kw));
    }
    String st = status == null ? RbacStatus.ACTIVE : status.trim();
    if (st != null && !st.isBlank() && !"ALL".equalsIgnoreCase(st)) {
      qw.eq(PermissionEntity::getStatus, st.toUpperCase());
    }
    if (menuId != null) qw.eq(PermissionEntity::getMenuId, menuId);
    if (moduleCode != null && !moduleCode.isBlank()) qw.eq(PermissionEntity::getModuleCode, moduleCode.trim());

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
    String code = req.code().trim();
    PermissionEntity existing = permissionMapper.selectOne(
        new LambdaQueryWrapper<PermissionEntity>().eq(PermissionEntity::getCode, code)
    );
    if (existing != null) {
      applyPermissionFields(existing, req);
      existing.setStatus(RbacStatus.ACTIVE);
      permissionMapper.updateById(existing);
      return ApiResponse.ok(toPermissionDto(permissionMapper.selectById(existing.getId())));
    }
    PermissionEntity e = new PermissionEntity();
    e.setCode(code);
    applyPermissionFields(e, req);
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
    if (req.menuId() != null) cur.setMenuId(parseMenuId(req.menuId()));
    if (req.moduleCode() != null) cur.setModuleCode(req.moduleCode());
    if (req.resourceCode() != null) cur.setResourceCode(req.resourceCode());
    if (req.actionCode() != null) cur.setActionCode(req.actionCode());
    if (req.sortOrder() != null) cur.setSortOrder(req.sortOrder());
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
      return ApiResponse.ok(Map.of("id", String.valueOf(id), "status", "DISABLED"));
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

  @GetMapping("/roles/{id}/org-scopes")
  public ApiResponse<List<String>> listRoleOrgScopes(@PathVariable("id") long id) {
    rbacService.requirePermission("permission:manage");
    return ApiResponse.ok(rbacService.listRoleOrgScopeIds(id));
  }

  @PutMapping("/roles/{id}/org-scopes")
  public ApiResponse<Map<String, Object>> setRoleOrgScopes(
      @PathVariable("id") long id,
      @Valid @RequestBody SetRoleOrgScopesRequest req
  ) {
    rbacService.requirePermission("permission:manage");
    List<Long> orgIds = req.organizationIds() == null ? List.of() : req.organizationIds().stream()
        .map(Long::parseLong)
        .toList();
    rbacService.setRoleOrgScopes(id, orgIds);
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

  private void applyPermissionFields(PermissionEntity e, PermissionCreateRequest req) {
    e.setName(req.name().trim());
    e.setDescription(req.description());
    Long menuId = parseMenuId(req.menuId());
    if (menuId == null && req.code() != null) {
      menuId = permissionMenuResolver.resolve(req.code().trim());
    }
    e.setMenuId(menuId);
    e.setModuleCode(req.moduleCode());
    e.setResourceCode(req.resourceCode());
    e.setActionCode(req.actionCode());
    e.setSortOrder(req.sortOrder() == null ? 0 : req.sortOrder());
  }

  private static Long parseMenuId(String menuId) {
    if (menuId == null || menuId.isBlank()) return null;
    try {
      return Long.parseLong(menuId.trim());
    } catch (NumberFormatException ex) {
      throw new IllegalArgumentException("菜单 ID 格式无效");
    }
  }

  private Map<String, Object> toPermissionDto(PermissionEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", e.getId() == null ? null : String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("description", e.getDescription());
    dto.put("status", e.getStatus());
    dto.put("menuId", e.getMenuId() == null ? null : String.valueOf(e.getMenuId()));
    dto.put("moduleCode", e.getModuleCode());
    dto.put("resourceCode", e.getResourceCode());
    dto.put("actionCode", e.getActionCode());
    dto.put("sortOrder", e.getSortOrder());
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
    if ("CUSTOM".equalsIgnoreCase(e.getDataScope())) {
      dto.put("orgScopeIds", rbacService.listRoleOrgScopeIds(e.getId()));
    }
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  public record PermissionCreateRequest(
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      String description,
      String status,
      String menuId,
      String moduleCode,
      String resourceCode,
      String actionCode,
      Integer sortOrder
  ) {}

  public record PermissionUpdateRequest(
      String name,
      String description,
      String status,
      String menuId,
      String moduleCode,
      String resourceCode,
      String actionCode,
      Integer sortOrder
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

  public record SetRoleOrgScopesRequest(List<String> organizationIds) {}

  public record SetUserRolesRequest(List<String> roleCodes) {}
}

