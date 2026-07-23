package com.hrplatform.core.workflow;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeAssignmentEntity;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeMapper;
import com.hrplatform.core.employee.EmployeeService;
import com.hrplatform.core.employee.ReportingChainService;
import com.hrplatform.core.employee.ReportingLineEntity;
import com.hrplatform.core.employee.ReportingLineMapper;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.OrganizationMapper;
import com.hrplatform.platform.auth.SysUserEntity;
import com.hrplatform.platform.auth.SysUserMapper;
import com.hrplatform.platform.workflow.WorkflowAssigneeResolveContext;
import com.hrplatform.platform.workflow.WorkflowAssigneeStrategy;
import com.hrplatform.platform.workflow.WorkflowDefinitionModel;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

/**
 * 依赖组织 / 任职 / 汇报线主数据的审批人解析。
 */
@Component
public class CoreWorkflowAssigneeStrategy implements WorkflowAssigneeStrategy {
  private final SysUserMapper sysUserMapper;
  private final EmployeeMapper employeeMapper;
  private final EmployeeService employeeService;
  private final OrganizationMapper organizationMapper;
  private final ReportingLineMapper reportingLineMapper;
  private final ReportingChainService reportingChainService;

  public CoreWorkflowAssigneeStrategy(
      SysUserMapper sysUserMapper,
      EmployeeMapper employeeMapper,
      EmployeeService employeeService,
      OrganizationMapper organizationMapper,
      ReportingLineMapper reportingLineMapper,
      ReportingChainService reportingChainService
  ) {
    this.sysUserMapper = sysUserMapper;
    this.employeeMapper = employeeMapper;
    this.employeeService = employeeService;
    this.organizationMapper = organizationMapper;
    this.reportingLineMapper = reportingLineMapper;
    this.reportingChainService = reportingChainService;
  }

  @Override
  public Set<String> supportedTypes() {
    return Set.of(
        "DIRECT_MANAGER",
        "REPORTING_LINE",
        "ORG_LEADER",
        "ORG_HRBP",
        "ORG_SSC",
        "ORG_HR_COORDINATOR"
    );
  }

  @Override
  public long resolve(
      WorkflowDefinitionModel.WorkflowNodeModel node,
      WorkflowAssigneeResolveContext context
  ) {
    WorkflowDefinitionModel.WorkflowAssigneeRuleModel rule = node.getAssigneeRule();
    return switch (rule.getType()) {
      case "DIRECT_MANAGER" -> resolveDirectManager(context);
      case "REPORTING_LINE" -> resolveReportingLine(rule.getLevel(), context);
      case "ORG_LEADER" -> resolveOrgRole(context, OrganizationEntity::getOrgLeaderNo, "组织负责人");
      case "ORG_HRBP" -> resolveHrRole(context, EmployeeAssignmentEntity::getHrbpNo, OrganizationEntity::getHrbpNo, "HRBP");
      case "ORG_SSC" -> resolveHrRole(context, EmployeeAssignmentEntity::getSscNo, OrganizationEntity::getSscNo, "SSC");
      case "ORG_HR_COORDINATOR" -> resolveHrRole(
          context,
          EmployeeAssignmentEntity::getHrCoordinatorNo,
          OrganizationEntity::getHrCoordinatorNo,
          "人资协调员"
      );
      default -> throw new IllegalArgumentException("不支持的审批人规则: " + rule.getType());
    };
  }

  private long resolveDirectManager(WorkflowAssigneeResolveContext context) {
    LocalDate asOf = LocalDate.now();
    // 上下文显式带组织时优先按目标组织衍生（入职：候选人入职部门的默认直属上级）
    if (context.getOrganizationId() != null) {
      ReportingChainService.Snapshot snapshot = reportingChainService.loadSnapshot(asOf);
      EmployeeEntity fromOrg = reportingChainService.deriveDirectManagerFromOrganization(
          context.getOrganizationId(),
          snapshot
      );
      if (fromOrg != null) {
        return requireActiveUserByEmployeeId(fromOrg.getId(), "目标组织衍生直属上级");
      }
    }
    EmployeeEntity subject = resolveSubjectEmployee(context);
    if (subject != null) {
      ReportingLineEntity direct = findActiveDirectLine(subject.getId(), asOf);
      if (direct != null && direct.getManagerEmployeeId() != null) {
        return requireActiveUserByEmployeeId(direct.getManagerEmployeeId(), "汇报线直属上级");
      }
      ReportingChainService.Snapshot snapshot = reportingChainService.loadSnapshot(asOf);
      EmployeeEntity manager = reportingChainService.deriveDirectManager(subject, snapshot);
      if (manager != null) {
        return requireActiveUserByEmployeeId(manager.getId(), "组织衍生直属上级");
      }
    }
    return resolveManagerUserIdFallback(context.getInitiatorUserId());
  }

  private long resolveReportingLine(Integer level, WorkflowAssigneeResolveContext context) {
    if (level == null || level < 1) {
      throw new IllegalArgumentException("REPORTING_LINE 规则的 level 须为 ≥1 的整数");
    }
    EmployeeEntity subject = requireSubjectEmployee(context, "汇报线");
    LocalDate asOf = LocalDate.now();
    if (level == 1) {
      ReportingLineEntity direct = findActiveDirectLine(subject.getId(), asOf);
      if (direct != null && direct.getManagerEmployeeId() != null) {
        return requireActiveUserByEmployeeId(direct.getManagerEmployeeId(), "汇报线第 1 级");
      }
    }
    ReportingChainService.Snapshot snapshot = reportingChainService.loadSnapshot(asOf);
    List<EmployeeEntity> chain = reportingChainService.deriveChain(subject, snapshot);
    // chain[0]=本人，chain[1]=第 1 级上级
    if (chain.size() <= level) {
      throw new IllegalArgumentException("汇报线不足 " + level + " 级，无法解析审批人");
    }
    return requireActiveUserByEmployeeId(chain.get(level).getId(), "汇报线第 " + level + " 级");
  }

  private long resolveOrgRole(
      WorkflowAssigneeResolveContext context,
      Function<OrganizationEntity, String> orgNoGetter,
      String roleLabel
  ) {
    Long orgId = resolveOrganizationId(context);
    if (orgId == null) {
      throw new IllegalArgumentException("无法确定组织，无法解析" + roleLabel);
    }
    Set<Long> seen = new HashSet<>();
    Long current = orgId;
    String lastHint = null;
    while (current != null && seen.add(current)) {
      OrganizationEntity org = organizationMapper.selectById(current);
      if (org == null) break;
      String employeeNo = orgNoGetter.apply(org);
      if (employeeNo != null && !employeeNo.isBlank()) {
        try {
          return requireActiveUserByEmployeeNo(employeeNo.trim(), roleLabel);
        } catch (IllegalArgumentException ex) {
          lastHint = ex.getMessage();
        }
      }
      current = org.getParentId();
    }
    if (lastHint != null) throw new IllegalArgumentException(lastHint);
    throw new IllegalArgumentException("组织及其上级均未配置" + roleLabel);
  }

  private long resolveHrRole(
      WorkflowAssigneeResolveContext context,
      Function<EmployeeAssignmentEntity, String> assignmentGetter,
      Function<OrganizationEntity, String> orgGetter,
      String roleLabel
  ) {
    EmployeeEntity subject = resolveSubjectEmployee(context);
    if (subject != null) {
      EmployeeAssignmentEntity primary = employeeService.findCurrentPrimaryAssignment(subject.getId());
      if (primary != null) {
        String fromAssignment = assignmentGetter.apply(primary);
        if (fromAssignment != null && !fromAssignment.isBlank()) {
          return requireActiveUserByEmployeeNo(fromAssignment.trim(), roleLabel);
        }
      }
    }
    return resolveOrgRole(context, orgGetter, roleLabel);
  }

  private Long resolveOrganizationId(WorkflowAssigneeResolveContext context) {
    if (context.getOrganizationId() != null) {
      return context.getOrganizationId();
    }
    EmployeeEntity subject = resolveSubjectEmployee(context);
    if (subject == null) return null;
    EmployeeAssignmentEntity primary = employeeService.findCurrentPrimaryAssignment(subject.getId());
    return primary == null ? null : primary.getOrganizationId();
  }

  private EmployeeEntity resolveSubjectEmployee(WorkflowAssigneeResolveContext context) {
    SysUserEntity initiator = sysUserMapper.selectById(context.getInitiatorUserId());
    if (initiator == null || initiator.getEmployeeId() == null) return null;
    return employeeMapper.selectById(initiator.getEmployeeId());
  }

  private EmployeeEntity requireSubjectEmployee(WorkflowAssigneeResolveContext context, String forWhat) {
    EmployeeEntity subject = resolveSubjectEmployee(context);
    if (subject == null) {
      throw new IllegalArgumentException("发起人未绑定员工，无法解析" + forWhat);
    }
    return subject;
  }

  private ReportingLineEntity findActiveDirectLine(long employeeId, LocalDate asOf) {
    List<ReportingLineEntity> list = reportingLineMapper.selectList(
        new LambdaQueryWrapper<ReportingLineEntity>()
            .eq(ReportingLineEntity::getEmployeeId, employeeId)
            .eq(ReportingLineEntity::getLineType, "DIRECT")
            .le(ReportingLineEntity::getEffectiveStartDate, asOf)
            .and(w -> w.isNull(ReportingLineEntity::getEffectiveEndDate)
                .or().ge(ReportingLineEntity::getEffectiveEndDate, asOf))
            .orderByDesc(ReportingLineEntity::getEffectiveStartDate)
            .last("LIMIT 1")
    );
    return list.isEmpty() ? null : list.get(0);
  }

  private long resolveManagerUserIdFallback(long initiatorUserId) {
    SysUserEntity initiator = sysUserMapper.selectById(initiatorUserId);
    if (initiator == null) {
      throw new IllegalArgumentException("发起人用户不存在");
    }
    Long managerId = initiator.getManagerUserId();
    if (managerId == null) {
      throw new IllegalArgumentException(
          "无法解析 DIRECT_MANAGER：发起人无汇报上级，且目标组织未配置负责人/分管领导"
      );
    }
    SysUserEntity manager = sysUserMapper.selectById(managerId);
    if (manager == null || !"ACTIVE".equals(manager.getStatus())) {
      throw new IllegalArgumentException("直属上级用户不存在或已停用");
    }
    return managerId;
  }

  private long requireActiveUserByEmployeeNo(String employeeNo, String roleLabel) {
    EmployeeEntity employee = employeeMapper.selectOne(
        new LambdaQueryWrapper<EmployeeEntity>()
            .eq(EmployeeEntity::getEmployeeNo, employeeNo)
            .last("LIMIT 1")
    );
    if (employee == null) {
      throw new IllegalArgumentException(roleLabel + "工号 " + employeeNo + " 在花名册中不存在");
    }
    return requireActiveUserByEmployeeId(employee.getId(), roleLabel);
  }

  private long requireActiveUserByEmployeeId(long employeeId, String roleLabel) {
    SysUserEntity user = sysUserMapper.selectOne(
        new LambdaQueryWrapper<SysUserEntity>()
            .eq(SysUserEntity::getEmployeeId, employeeId)
            .eq(SysUserEntity::getStatus, "ACTIVE")
            .last("LIMIT 1")
    );
    if (user == null) {
      EmployeeEntity emp = employeeMapper.selectById(employeeId);
      String name = emp == null || emp.getFullName() == null ? "" : emp.getFullName();
      String no = emp == null || emp.getEmployeeNo() == null ? String.valueOf(employeeId) : emp.getEmployeeNo();
      throw new IllegalArgumentException(roleLabel + " " + name + "（工号 " + no + "）未绑定系统登录账号");
    }
    return user.getId();
  }
}
