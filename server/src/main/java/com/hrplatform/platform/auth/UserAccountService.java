package com.hrplatform.platform.auth;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.platform.rbac.RbacService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class UserAccountService {
  public static final int USERNAME_MAX_LEN = 64;

  private final SysUserMapper sysUserMapper;
  private final PasswordHasher passwordHasher;
  private final RbacService rbacService;

  public UserAccountService(
      SysUserMapper sysUserMapper,
      PasswordHasher passwordHasher,
      RbacService rbacService
  ) {
    this.sysUserMapper = sysUserMapper;
    this.passwordHasher = passwordHasher;
    this.rbacService = rbacService;
  }

  public SysUserEntity require(long id) {
    SysUserEntity user = sysUserMapper.selectById(id);
    if (user == null) throw new IllegalArgumentException("账号不存在");
    return user;
  }

  public SysUserEntity findByEmployeeId(long employeeId) {
    return sysUserMapper.selectOne(
        new LambdaQueryWrapper<SysUserEntity>().eq(SysUserEntity::getEmployeeId, employeeId)
    );
  }

  public boolean usernameExists(String username, Long excludeUserId) {
    LambdaQueryWrapper<SysUserEntity> qw = new LambdaQueryWrapper<SysUserEntity>()
        .eq(SysUserEntity::getUsername, username);
    if (excludeUserId != null) {
      qw.ne(SysUserEntity::getId, excludeUserId);
    }
    Long count = sysUserMapper.selectCount(qw);
    return count != null && count > 0;
  }

  public PageResult page(ListQuery query) {
    long page = Math.max(1, query.page());
    long pageSize = Math.max(1, Math.min(200, query.pageSize()));
    long offset = (page - 1) * pageSize;

    LambdaQueryWrapper<SysUserEntity> qw = new LambdaQueryWrapper<>();
    if (query.keyword() != null && !query.keyword().isBlank()) {
      String kw = query.keyword().trim();
      List<Long> empIds = query.employeeIdsByKeyword() == null ? List.of() : query.employeeIdsByKeyword();
      qw.and(w -> {
        w.like(SysUserEntity::getUsername, kw).or().like(SysUserEntity::getDisplayName, kw);
        if (!empIds.isEmpty()) {
          w.or().in(SysUserEntity::getEmployeeId, empIds);
        }
      });
    }
    if (query.status() != null && !"ALL".equalsIgnoreCase(query.status())) {
      qw.eq(SysUserEntity::getStatus, query.status().trim().toUpperCase(Locale.ROOT));
    }
    if (query.accountType() != null && !"ALL".equalsIgnoreCase(query.accountType())) {
      if ("SYSTEM".equalsIgnoreCase(query.accountType())) {
        qw.isNull(SysUserEntity::getEmployeeId);
      } else if ("EMPLOYEE".equalsIgnoreCase(query.accountType())) {
        qw.isNotNull(SysUserEntity::getEmployeeId);
      }
    }
    if (query.boundEmployee() != null && !"ALL".equalsIgnoreCase(query.boundEmployee())) {
      if ("YES".equalsIgnoreCase(query.boundEmployee())) {
        qw.isNotNull(SysUserEntity::getEmployeeId);
      } else if ("NO".equalsIgnoreCase(query.boundEmployee())) {
        qw.isNull(SysUserEntity::getEmployeeId);
      }
    }
    if (query.roleCode() != null && !query.roleCode().isBlank()) {
      List<Long> userIds = rbacService.listActiveUserIdsByRoleCode(query.roleCode().trim());
      if (userIds.isEmpty()) {
        return new PageResult(List.of(), 0, page, pageSize);
      }
      qw.in(SysUserEntity::getId, userIds);
    }

    qw.orderByDesc(SysUserEntity::getId);
    Long total = sysUserMapper.selectCount(qw);
    qw.last("LIMIT " + offset + ", " + pageSize);
    List<SysUserEntity> records = sysUserMapper.selectList(qw);
    return new PageResult(records, total == null ? 0 : total, page, pageSize);
  }

  @Transactional
  public SysUserEntity createSystemAccount(
      String username,
      String displayName,
      String password,
      List<String> roleCodes,
      Boolean mustChangePassword
  ) {
    String normalized = normalizeUsername(username);
    if (usernameExists(normalized, null)) {
      throw new IllegalArgumentException("登录名已存在");
    }
    validatePassword(password, normalized);

    Long operatorId = AuthContext.current() == null ? null : AuthContext.current().id();
    LocalDateTime now = LocalDateTime.now();

    SysUserEntity user = new SysUserEntity();
    user.setUsername(normalized);
    user.setDisplayName(displayName == null || displayName.isBlank() ? null : displayName.trim());
    user.setPasswordHash(passwordHasher.hash(password));
    user.setEmployeeId(null);
    user.setStatus("ACTIVE");
    user.setMustChangePassword(mustChangePassword == null || mustChangePassword);
    user.setPasswordUpdatedAt(now);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    user.setCreatedBy(operatorId);
    user.setUpdatedBy(operatorId);
    sysUserMapper.insert(user);

    if (roleCodes != null && !roleCodes.isEmpty()) {
      // 过滤掉当前环境不存在的角色，避免开号因种子缺失直接失败
      List<String> existing = rbacService.listActiveRoleCodesAmong(roleCodes);
      if (!existing.isEmpty()) {
        rbacService.setUserRoles(user.getId(), existing);
      }
    }
    return require(user.getId());
  }

  /**
   * 由 core 绑定服务调用：创建已绑定员工的账号（username / employeeId 已校验）。
   */
  @Transactional
  public SysUserEntity createBoundEmployeeAccount(
      String username,
      long employeeId,
      String password,
      List<String> roleCodes,
      Boolean mustChangePassword
  ) {
    String normalized = normalizeUsername(username);
    if (usernameExists(normalized, null)) {
      throw new IllegalArgumentException("登录名已存在");
    }
    if (findByEmployeeId(employeeId) != null) {
      throw new IllegalArgumentException("该员工已绑定账号");
    }
    validatePassword(password, normalized);

    Long operatorId = AuthContext.current() == null ? null : AuthContext.current().id();
    LocalDateTime now = LocalDateTime.now();

    SysUserEntity user = new SysUserEntity();
    user.setUsername(normalized);
    user.setDisplayName(null);
    user.setPasswordHash(passwordHasher.hash(password));
    user.setEmployeeId(employeeId);
    user.setStatus("ACTIVE");
    user.setMustChangePassword(mustChangePassword == null || mustChangePassword);
    user.setPasswordUpdatedAt(now);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    user.setCreatedBy(operatorId);
    user.setUpdatedBy(operatorId);
    sysUserMapper.insert(user);

    if (roleCodes != null && !roleCodes.isEmpty()) {
      List<String> existing = rbacService.listActiveRoleCodesAmong(roleCodes);
      if (!existing.isEmpty()) {
        rbacService.setUserRoles(user.getId(), existing);
      }
    }
    return require(user.getId());
  }

  @Transactional
  public SysUserEntity update(long id, String displayName, String status) {
    SysUserEntity user = require(id);
    Long operatorId = AuthContext.current() == null ? null : AuthContext.current().id();

    if (displayName != null) {
      if (user.getEmployeeId() != null) {
        throw new IllegalArgumentException("员工账号不维护展示名，请修改员工姓名");
      }
      user.setDisplayName(displayName.isBlank() ? null : displayName.trim());
    }

    if (status != null && !status.isBlank()) {
      String next = status.trim().toUpperCase(Locale.ROOT);
      if (!"ACTIVE".equals(next) && !"DISABLED".equals(next)) {
        throw new IllegalArgumentException("无效的账号状态");
      }
      if ("DISABLED".equals(next)) {
        assertNotSelfLockDisable(user.getId());
      }
      if ("ACTIVE".equals(next) && "DISABLED".equals(user.getStatus())) {
        // 员工离职校验由 core 绑定服务在启用前调用 ensureEmployeeCanEnable
      }
      user.setStatus(next);
    }

    user.setUpdatedAt(LocalDateTime.now());
    user.setUpdatedBy(operatorId);
    sysUserMapper.updateById(user);
    return require(id);
  }

  @Transactional
  public void resetPassword(long id, String newPassword, Boolean mustChangePassword) {
    SysUserEntity user = require(id);
    validatePassword(newPassword, user.getUsername());
    Long operatorId = AuthContext.current() == null ? null : AuthContext.current().id();
    user.setPasswordHash(passwordHasher.hash(newPassword));
    user.setMustChangePassword(mustChangePassword == null || mustChangePassword);
    user.setPasswordUpdatedAt(LocalDateTime.now());
    user.setUpdatedAt(LocalDateTime.now());
    user.setUpdatedBy(operatorId);
    sysUserMapper.updateById(user);
  }

  @Transactional
  public void changeOwnPassword(long userId, String oldPassword, String newPassword) {
    SysUserEntity user = require(userId);
    if (!passwordHasher.matches(oldPassword, user.getPasswordHash())) {
      throw new IllegalArgumentException("原密码不正确");
    }
    validatePassword(newPassword, user.getUsername());
    user.setPasswordHash(passwordHasher.hash(newPassword));
    user.setMustChangePassword(false);
    user.setPasswordUpdatedAt(LocalDateTime.now());
    user.setUpdatedAt(LocalDateTime.now());
    user.setUpdatedBy(userId);
    sysUserMapper.updateById(user);
  }

  @Transactional
  public SysUserEntity renameUsername(long userId, String newUsername) {
    SysUserEntity user = require(userId);
    if (user.getEmployeeId() == null) {
      throw new IllegalArgumentException("系统账号不支持修改登录名");
    }
    String normalized = normalizeUsername(newUsername);
    if (usernameExists(normalized, userId)) {
      throw new IllegalArgumentException("登录名已存在");
    }
    Long operatorId = AuthContext.current() == null ? null : AuthContext.current().id();
    user.setUsername(normalized);
    user.setUpdatedAt(LocalDateTime.now());
    user.setUpdatedBy(operatorId);
    sysUserMapper.updateById(user);
    return require(userId);
  }

  @Transactional
  public void disableByEmployeeId(long employeeId) {
    SysUserEntity user = findByEmployeeId(employeeId);
    if (user == null) return;
    if ("DISABLED".equals(user.getStatus())) return;
    assertNotSelfLockDisable(user.getId());
    user.setStatus("DISABLED");
    user.setUpdatedAt(LocalDateTime.now());
    Long operatorId = AuthContext.current() == null ? null : AuthContext.current().id();
    user.setUpdatedBy(operatorId);
    sysUserMapper.updateById(user);
  }

  @Transactional
  public SysUserEntity enable(long id) {
    SysUserEntity user = require(id);
    user.setStatus("ACTIVE");
    user.setUpdatedAt(LocalDateTime.now());
    Long operatorId = AuthContext.current() == null ? null : AuthContext.current().id();
    user.setUpdatedBy(operatorId);
    sysUserMapper.updateById(user);
    return require(id);
  }

  public Map<String, Object> toAccountMap(SysUserEntity user, List<String> roles) {
    Map<String, Object> m = new HashMap<>();
    m.put("id", String.valueOf(user.getId()));
    m.put("username", user.getUsername());
    m.put("accountType", user.getEmployeeId() == null ? "SYSTEM" : "EMPLOYEE");
    m.put("displayName", user.getDisplayName());
    m.put("status", user.getStatus());
    m.put("employeeId", user.getEmployeeId() == null ? null : String.valueOf(user.getEmployeeId()));
    m.put("roles", roles == null ? List.of() : roles);
    m.put("mustChangePassword", user.mustChangePassword());
    m.put("lastLoginAt", user.getLastLoginAt() == null ? null : user.getLastLoginAt().toString());
    m.put("createdAt", user.getCreatedAt() == null ? null : user.getCreatedAt().toString());
    m.put("updatedAt", user.getUpdatedAt() == null ? null : user.getUpdatedAt().toString());
    return m;
  }

  public List<Map<String, Object>> toAccountMaps(List<SysUserEntity> users) {
    List<Map<String, Object>> items = new ArrayList<>();
    for (SysUserEntity u : users) {
      items.add(toAccountMap(u, rbacService.listUserRoles(u.getId())));
    }
    return items;
  }

  public static String normalizeUsername(String raw) {
    if (raw == null) throw new IllegalArgumentException("登录名不能为空");
    String v = raw.trim();
    if (v.isEmpty()) throw new IllegalArgumentException("登录名不能为空");
    if (v.length() > USERNAME_MAX_LEN) {
      throw new IllegalArgumentException("登录名最长 " + USERNAME_MAX_LEN + " 个字符");
    }
    return v;
  }

  public static void validatePassword(String password, String username) {
    if (password == null || password.isBlank()) {
      throw new IllegalArgumentException("密码不能为空");
    }
    if (password.length() < 8) {
      throw new IllegalArgumentException("密码长度至少 8 位");
    }
    if (username != null && password.equalsIgnoreCase(username)) {
      throw new IllegalArgumentException("密码不能与登录名相同");
    }
  }

  private void assertNotSelfLockDisable(long targetUserId) {
    AuthUser current = AuthContext.current();
    if (current == null) return;
    if (!current.id().equals(targetUserId)) return;
    Set<String> perms = current.permissions() == null ? Set.of() : current.permissions();
    if (perms.contains("user:manage") || perms.contains("permission:manage")) {
      throw new IllegalArgumentException("不能停用当前登录账号（防止失去管理权限）");
    }
  }

  public record ListQuery(
      String keyword,
      String status,
      String roleCode,
      String accountType,
      String boundEmployee,
      List<Long> employeeIdsByKeyword,
      long page,
      long pageSize
  ) {}

  public record PageResult(List<SysUserEntity> records, long total, long page, long pageSize) {}
}
