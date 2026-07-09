package com.hrplatform.platform.rbac;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.platform.audit.ForbiddenException;
import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.auth.AuthUser;
import com.hrplatform.platform.auth.UnauthorizedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class RbacService {
  private final RoleMapper roleMapper;
  private final PermissionMapper permissionMapper;
  private final RolePermissionMapper rolePermissionMapper;
  private final UserRoleMapper userRoleMapper;
  private final RoleOrgScopeMapper roleOrgScopeMapper;

  public RbacService(
      RoleMapper roleMapper,
      PermissionMapper permissionMapper,
      RolePermissionMapper rolePermissionMapper,
      UserRoleMapper userRoleMapper,
      RoleOrgScopeMapper roleOrgScopeMapper
  ) {
    this.roleMapper = roleMapper;
    this.permissionMapper = permissionMapper;
    this.rolePermissionMapper = rolePermissionMapper;
    this.userRoleMapper = userRoleMapper;
    this.roleOrgScopeMapper = roleOrgScopeMapper;
  }

  public UserRbac loadUserRbac(long userId) {
    Set<String> roles = new HashSet<>(roleMapper.selectRoleCodesByUserId(userId));
    Set<String> permissions = new HashSet<>(permissionMapper.selectPermissionCodesByUserId(userId));
    DataScope dataScope = resolveMaxDataScope(roleMapper.selectRoleDataScopesByUserId(userId));
    return new UserRbac(roles, permissions, dataScope);
  }

  public AuthUser enrich(AuthUser base) {
    UserRbac rbac = loadUserRbac(base.id());
    return new AuthUser(base.id(), base.username(), rbac.roles(), rbac.permissions(), rbac.dataScope().name());
  }

  public void requirePermission(String permissionCode) {
    if (permissionCode == null || permissionCode.isBlank()) {
      throw new IllegalArgumentException("permissionCode 不能为空");
    }
    AuthUser u = AuthContext.current();
    if (u == null) throw new UnauthorizedException("未登录或登录已过期");
    if (u.permissions() == null || !u.permissions().contains(permissionCode)) {
      throw new ForbiddenException("无权限");
    }
  }

  /** 满足任一权限点即可（花名册引用组织/岗位等场景） */
  public void requireAnyPermission(String... permissionCodes) {
    if (permissionCodes == null || permissionCodes.length == 0) {
      throw new IllegalArgumentException("permissionCodes 不能为空");
    }
    if (AuthContext.current() == null) {
      throw new UnauthorizedException("未登录或登录已过期");
    }
    if (!hasAnyPermission(permissionCodes)) {
      throw new ForbiddenException("无权限");
    }
  }

  public boolean hasPermission(String permissionCode) {
    if (permissionCode == null || permissionCode.isBlank()) return false;
    AuthUser u = AuthContext.current();
    if (u == null || u.permissions() == null) return false;
    return u.permissions().contains(permissionCode);
  }

  public boolean hasAnyPermission(String... permissionCodes) {
    if (permissionCodes == null || permissionCodes.length == 0) return false;
    AuthUser u = AuthContext.current();
    if (u == null) return false;
    Set<String> granted = u.permissions() == null ? Set.of() : u.permissions();
    for (String code : permissionCodes) {
      if (code != null && !code.isBlank() && granted.contains(code)) {
        return true;
      }
    }
    return false;
  }

  public void requireLoggedIn() {
    if (AuthContext.current() == null) throw new UnauthorizedException("未登录或登录已过期");
  }

  public Set<String> getCurrentUserPermissions() {
    AuthUser u = AuthContext.current();
    if (u == null) return Set.of();
    return u.permissions() == null ? Set.of() : u.permissions();
  }

  public Set<String> getCurrentUserRoles() {
    AuthUser u = AuthContext.current();
    if (u == null) return Set.of();
    return u.roles() == null ? Set.of() : u.roles();
  }

  public String getCurrentUserDataScope() {
    AuthUser u = AuthContext.current();
    if (u == null) return DataScope.SELF.name();
    return u.dataScope() == null ? DataScope.SELF.name() : u.dataScope();
  }

  @Transactional
  public void setRolePermissions(long roleId, List<String> permissionCodes) {
    RoleEntity role = roleMapper.selectById(roleId);
    if (role == null) throw new IllegalArgumentException("角色不存在");

    List<String> codes = permissionCodes == null ? new ArrayList<>() : new ArrayList<>(permissionCodes);
    // admin 角色必须保留 permission:manage，避免误操作导致权限中心自锁
    if ("admin".equals(role.getCode()) && !codes.contains("permission:manage")) {
      codes.add("permission:manage");
    }

    rolePermissionMapper.deleteByRoleId(roleId);
    if (codes.isEmpty()) return;

    List<PermissionEntity> permissions = permissionMapper.selectList(
        new LambdaQueryWrapper<PermissionEntity>().in(PermissionEntity::getCode, codes)
    );
    for (PermissionEntity p : permissions) {
      rolePermissionMapper.insert(roleId, p.getId());
    }
  }

  public List<String> listRolePermissions(long roleId) {
    RoleEntity role = roleMapper.selectById(roleId);
    if (role == null) throw new IllegalArgumentException("角色不存在");
    return permissionMapper.selectPermissionCodesByRoleId(roleId);
  }

  @Transactional
  public void setUserRoles(long userId, List<String> roleCodes) {
    userRoleMapper.deleteByUserId(userId);
    if (roleCodes == null || roleCodes.isEmpty()) return;
    List<RoleEntity> roles = roleMapper.selectList(new LambdaQueryWrapper<RoleEntity>().in(RoleEntity::getCode, roleCodes));
    for (RoleEntity r : roles) {
      userRoleMapper.insert(userId, r.getId());
    }
  }

  public List<String> listUserRoles(long userId) {
    return userRoleMapper.selectRoleCodesByUserId(userId);
  }

  public List<String> listRoleOrgScopeIds(long roleId) {
    RoleEntity role = roleMapper.selectById(roleId);
    if (role == null) throw new IllegalArgumentException("角色不存在");
    return roleOrgScopeMapper.selectOrganizationIdsByRoleId(roleId).stream()
        .map(String::valueOf)
        .toList();
  }

  @Transactional
  public void setRoleOrgScopes(long roleId, List<Long> organizationIds) {
    RoleEntity role = roleMapper.selectById(roleId);
    if (role == null) throw new IllegalArgumentException("角色不存在");
    roleOrgScopeMapper.deleteByRoleId(roleId);
    if (organizationIds == null || organizationIds.isEmpty()) return;
    for (Long orgId : organizationIds) {
      if (orgId != null) roleOrgScopeMapper.insert(roleId, orgId);
    }
  }

  /** 当前用户 CUSTOM 数据范围下的组织根节点 */
  public List<Long> loadUserCustomOrgIds(long userId) {
    return roleOrgScopeMapper.selectOrganizationIdsByUserId(userId);
  }

  private DataScope resolveMaxDataScope(List<String> scopes) {
    if (scopes == null || scopes.isEmpty()) return DataScope.SELF;
    boolean hasAll = false;
    boolean hasCustom = false;
    boolean hasDept = false;
    for (String s : scopes) {
      if (s == null) continue;
      String v = s.trim().toUpperCase();
      if ("ALL".equals(v)) hasAll = true;
      else if ("CUSTOM".equals(v)) hasCustom = true;
      else if ("DEPARTMENT".equals(v)) hasDept = true;
    }
    if (hasAll) return DataScope.ALL;
    if (hasCustom) return DataScope.CUSTOM;
    if (hasDept) return DataScope.DEPARTMENT;
    return DataScope.SELF;
  }

  public record UserRbac(Set<String> roles, Set<String> permissions, DataScope dataScope) {}
}

