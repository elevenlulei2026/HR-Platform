package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.platform.auth.SysUserEntity;
import com.hrplatform.platform.auth.UserAccountService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 员工账号绑定 / 开号 / AD↔登录名同步（core 编排，调用 platform 账号本体服务）。
 */
@Service
public class EmployeeAccountBindingService {
  private final EmployeeMapper employeeMapper;
  private final EmployeeMasterVersionMapper masterVersionMapper;
  private final UserAccountService userAccountService;

  public EmployeeAccountBindingService(
      EmployeeMapper employeeMapper,
      EmployeeMasterVersionMapper masterVersionMapper,
      UserAccountService userAccountService
  ) {
    this.employeeMapper = employeeMapper;
    this.masterVersionMapper = masterVersionMapper;
    this.userAccountService = userAccountService;
  }

  public String resolveEmployeeDisplayName(long employeeId) {
    EmployeeEntity emp = employeeMapper.selectById(employeeId);
    return emp == null ? null : emp.getFullName();
  }

  /**
   * 流程/审批展示用：优先员工中文名，附带工号；系统账号回退 displayName / username。
   */
  public UserPersonLabel resolveUserPersonLabel(SysUserEntity user) {
    if (user == null) return null;
    String employeeNo = null;
    String employeeName = null;
    if (user.getEmployeeId() != null) {
      EmployeeEntity emp = employeeMapper.selectById(user.getEmployeeId());
      if (emp != null) {
        employeeNo = emp.getEmployeeNo();
        employeeName = emp.getFullName();
      }
    }
    String displayName;
    if (employeeName != null && !employeeName.isBlank()) {
      displayName = employeeName.trim();
    } else if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
      displayName = user.getDisplayName().trim();
    } else {
      displayName = user.getUsername();
    }
    return new UserPersonLabel(user.getUsername(), displayName, employeeNo, employeeName);
  }

  /** 写入 username / displayName / employeeNo（prefix 如 assignee、initiator） */
  public void putPersonFields(Map<String, Object> dto, String prefix, SysUserEntity user) {
    UserPersonLabel label = resolveUserPersonLabel(user);
    if (label == null) {
      dto.put(prefix + "Username", null);
      dto.put(prefix + "DisplayName", null);
      dto.put(prefix + "EmployeeNo", null);
      return;
    }
    dto.put(prefix + "Username", label.username());
    dto.put(prefix + "DisplayName", label.displayName());
    dto.put(prefix + "EmployeeNo", label.employeeNo());
  }

  public record UserPersonLabel(
      String username,
      String displayName,
      String employeeNo,
      String employeeName
  ) {}

  public List<Long> findEmployeeIdsByKeyword(String keyword) {
    if (keyword == null || keyword.isBlank()) return List.of();
    String kw = keyword.trim();
    return employeeMapper.selectList(
            new LambdaQueryWrapper<EmployeeEntity>()
                .select(EmployeeEntity::getId)
                .and(w -> w.like(EmployeeEntity::getEmployeeNo, kw)
                    .or().like(EmployeeEntity::getFullName, kw)
                    .or().like(EmployeeEntity::getAdAccount, kw))
                .last("LIMIT 200")
        ).stream()
        .map(EmployeeEntity::getId)
        .toList();
  }

  public void enrichAccountMaps(List<Map<String, Object>> items) {
    if (items == null || items.isEmpty()) return;
    Set<Long> empIds = new HashSet<>();
    for (Map<String, Object> m : items) {
      Object eid = m.get("employeeId");
      if (eid != null && !String.valueOf(eid).isBlank()) {
        empIds.add(Long.parseLong(String.valueOf(eid)));
      }
    }
    if (empIds.isEmpty()) return;

    Map<Long, EmployeeEntity> empMap = employeeMapper.selectList(
            new LambdaQueryWrapper<EmployeeEntity>().in(EmployeeEntity::getId, empIds)
        ).stream()
        .collect(Collectors.toMap(EmployeeEntity::getId, e -> e, (a, b) -> a));

    for (Map<String, Object> m : items) {
      Object eid = m.get("employeeId");
      if (eid == null) continue;
      EmployeeEntity emp = empMap.get(Long.parseLong(String.valueOf(eid)));
      if (emp == null) continue;
      m.put("employeeNo", emp.getEmployeeNo());
      m.put("employeeName", emp.getFullName());
      m.put("adAccount", emp.getAdAccount());
      // 员工账号展示名优先员工姓名
      m.put("displayName", emp.getFullName());
    }
  }

  @Transactional
  public Map<String, Object> openAccount(long employeeId, String password, List<String> roleCodes, Boolean mustChangePassword) {
    EmployeeEntity emp = requireEmployee(employeeId);
    String status = emp.getStatus() == null ? "" : emp.getStatus().trim().toUpperCase();
    if (!"PROBATION".equals(status) && !"ACTIVE".equals(status)) {
      throw new IllegalArgumentException("仅试用/在职员工可开通登录账号");
    }
    if (emp.getUserId() != null || userAccountService.findByEmployeeId(employeeId) != null) {
      throw new IllegalArgumentException("该员工已绑定账号");
    }

    String ad = currentAdAccount(emp);
    if (ad == null || ad.isBlank()) {
      throw new IllegalArgumentException("请先在档案中维护 AD账号，再开通登录");
    }
    String username = UserAccountService.normalizeUsername(ad);
    assertAdUnique(username, employeeId, null);

    SysUserEntity user = userAccountService.createBoundEmployeeAccount(
        username, employeeId, password, roleCodes, mustChangePassword
    );

    emp.setUserId(user.getId());
    emp.setAdAccount(username);
    employeeMapper.updateById(emp);
    syncCurrentMasterAd(employeeId, username);

    Map<String, Object> map = userAccountService.toAccountMaps(List.of(user)).get(0);
    enrichAccountMaps(List.of(map));
    return map;
  }

  @Transactional
  public Map<String, Object> renameLoginByUserId(long userId, String newAdAccount) {
    SysUserEntity user = userAccountService.require(userId);
    if (user.getEmployeeId() == null) {
      throw new IllegalArgumentException("系统账号不支持修改登录名");
    }
    return renameAdForBoundEmployee(user.getEmployeeId(), newAdAccount);
  }

  /**
   * 已开号：改 AD = 改登录名。仅修正当前有效主档版本。
   */
  @Transactional
  public Map<String, Object> renameAdForBoundEmployee(long employeeId, String newAdAccount) {
    EmployeeEntity emp = requireEmployee(employeeId);
    if (emp.getUserId() == null) {
      throw new IllegalArgumentException("员工尚未开通登录账号");
    }
    String username = UserAccountService.normalizeUsername(newAdAccount);
    assertAdUnique(username, employeeId, emp.getUserId());

    userAccountService.renameUsername(emp.getUserId(), username);
    emp.setAdAccount(username);
    employeeMapper.updateById(emp);
    syncCurrentMasterAd(employeeId, username);

    SysUserEntity user = userAccountService.require(emp.getUserId());
    Map<String, Object> map = userAccountService.toAccountMaps(List.of(user)).get(0);
    enrichAccountMaps(List.of(map));
    return map;
  }

  /** 档案更新前：已绑定员工变更 AD 时调用（须 CURRENT）。 */
  @Transactional
  public void onMasterAdAccountChange(long employeeId, String newAdAccount, String editMode) {
    EmployeeEntity emp = requireEmployee(employeeId);
    if (emp.getUserId() == null) {
      // 未开号：仅唯一性预检
      if (newAdAccount != null && !newAdAccount.isBlank()) {
        String normalized = UserAccountService.normalizeUsername(newAdAccount);
        assertAdUnique(normalized, employeeId, null);
      }
      return;
    }
    if (newAdAccount == null || newAdAccount.isBlank()) {
      throw new IllegalArgumentException("已开通登录的员工不能清空 AD账号");
    }
    String mode = editMode == null || editMode.isBlank() ? "CURRENT" : editMode.trim().toUpperCase();
    if (!"CURRENT".equals(mode)) {
      throw new IllegalArgumentException("已开通登录的员工修改 AD账号时，仅允许修正当前版本");
    }
    renameAdForBoundEmployee(employeeId, newAdAccount);
  }

  public void ensureEmployeeCanEnable(long userId) {
    SysUserEntity user = userAccountService.require(userId);
    if (user.getEmployeeId() == null) return;
    EmployeeEntity emp = requireEmployee(user.getEmployeeId());
    if ("TERMINATED".equalsIgnoreCase(emp.getStatus())) {
      throw new IllegalArgumentException("员工已离职，不能启用账号");
    }
  }

  /** 员工状态变为离职时停用绑定账号 */
  @Transactional
  public void onEmployeeTerminated(long employeeId) {
    userAccountService.disableByEmployeeId(employeeId);
  }

  public Map<String, Object> accountStatusForEmployee(long employeeId) {
    EmployeeEntity emp = requireEmployee(employeeId);
    Map<String, Object> m = new HashMap<>();
    m.put("employeeId", String.valueOf(employeeId));
    m.put("adAccount", emp.getAdAccount());
    m.put("bound", emp.getUserId() != null);
    if (emp.getUserId() == null) {
      m.put("accountStatus", "NONE");
      return m;
    }
    SysUserEntity user = userAccountService.require(emp.getUserId());
    m.put("userId", String.valueOf(user.getId()));
    m.put("username", user.getUsername());
    m.put("accountStatus", user.getStatus());
    m.put("mustChangePassword", user.mustChangePassword());
    return m;
  }

  private EmployeeEntity requireEmployee(long id) {
    EmployeeEntity emp = employeeMapper.selectById(id);
    if (emp == null) throw new IllegalArgumentException("员工不存在");
    return emp;
  }

  private String currentAdAccount(EmployeeEntity emp) {
    EmployeeMasterVersionEntity version = masterVersionMapper.selectOne(
        new LambdaQueryWrapper<EmployeeMasterVersionEntity>()
            .eq(EmployeeMasterVersionEntity::getEmployeeId, emp.getId())
            .le(EmployeeMasterVersionEntity::getEffectiveStartDate, LocalDate.now())
            .and(w -> w.isNull(EmployeeMasterVersionEntity::getEffectiveEndDate)
                .or().ge(EmployeeMasterVersionEntity::getEffectiveEndDate, LocalDate.now()))
            .orderByDesc(EmployeeMasterVersionEntity::getEffectiveStartDate)
            .orderByDesc(EmployeeMasterVersionEntity::getId)
            .last("LIMIT 1")
    );
    if (version != null && version.getAdAccount() != null && !version.getAdAccount().isBlank()) {
      return version.getAdAccount().trim();
    }
    return emp.getAdAccount() == null ? null : emp.getAdAccount().trim();
  }

  private void syncCurrentMasterAd(long employeeId, String adAccount) {
    EmployeeMasterVersionEntity version = masterVersionMapper.selectOne(
        new LambdaQueryWrapper<EmployeeMasterVersionEntity>()
            .eq(EmployeeMasterVersionEntity::getEmployeeId, employeeId)
            .le(EmployeeMasterVersionEntity::getEffectiveStartDate, LocalDate.now())
            .and(w -> w.isNull(EmployeeMasterVersionEntity::getEffectiveEndDate)
                .or().ge(EmployeeMasterVersionEntity::getEffectiveEndDate, LocalDate.now()))
            .orderByDesc(EmployeeMasterVersionEntity::getEffectiveStartDate)
            .orderByDesc(EmployeeMasterVersionEntity::getId)
            .last("LIMIT 1")
    );
    if (version == null) return;
    version.setAdAccount(adAccount);
    masterVersionMapper.updateById(version);
  }

  private void assertAdUnique(String adAccount, long employeeId, Long excludeUserId) {
    Long otherEmp = employeeMapper.selectCount(
        new LambdaQueryWrapper<EmployeeEntity>()
            .eq(EmployeeEntity::getAdAccount, adAccount)
            .ne(EmployeeEntity::getId, employeeId)
    );
    if (otherEmp != null && otherEmp > 0) {
      throw new IllegalArgumentException("AD账号已被其他员工使用");
    }
    if (userAccountService.usernameExists(adAccount, excludeUserId)) {
      throw new IllegalArgumentException("AD账号与已有登录名冲突");
    }
  }
}
