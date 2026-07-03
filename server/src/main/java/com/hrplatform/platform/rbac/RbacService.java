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

  public RbacService(
      RoleMapper roleMapper,
      PermissionMapper permissionMapper,
      RolePermissionMapper rolePermissionMapper,
      UserRoleMapper userRoleMapper
  ) {
    this.roleMapper = roleMapper;
    this.permissionMapper = permissionMapper;
    this.rolePermissionMapper = rolePermissionMapper;
    this.userRoleMapper = userRoleMapper;
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

  private DataScope resolveMaxDataScope(List<String> scopes) {
    if (scopes == null || scopes.isEmpty()) return DataScope.SELF;
    boolean hasAll = false;
    boolean hasDept = false;
    for (String s : scopes) {
      if (s == null) continue;
      String v = s.trim().toUpperCase();
      if ("ALL".equals(v)) hasAll = true;
      else if ("DEPARTMENT".equals(v)) hasDept = true;
    }
    if (hasAll) return DataScope.ALL;
    if (hasDept) return DataScope.DEPARTMENT;
    return DataScope.SELF;
  }

  public record UserRbac(Set<String> roles, Set<String> permissions, DataScope dataScope) {}
}

