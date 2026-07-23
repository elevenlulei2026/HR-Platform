package com.hrplatform.modules.onboarding;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeMapper;
import com.hrplatform.core.employee.EmployeeService;
import com.hrplatform.core.headcount.HeadcountService;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.OrganizationMapper;
import com.hrplatform.core.organization.PositionEntity;
import com.hrplatform.core.organization.PositionMapper;
import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.auth.AuthUser;
import com.hrplatform.platform.code.CodeGeneratorService;
import com.hrplatform.platform.crypto.FieldCryptoService;
import com.hrplatform.platform.workflow.WorkflowEngine;
import com.hrplatform.platform.workflow.WorkflowInstanceEntity;
import com.hrplatform.platform.workflow.WorkflowInstanceMapper;
import com.hrplatform.platform.workflow.WorkflowTaskEntity;
import com.hrplatform.platform.workflow.WorkflowTaskMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class OnboardingService {
  private final OnboardingCaseMapper caseMapper;
  private final OrganizationMapper organizationMapper;
  private final PositionMapper positionMapper;
  private final EmployeeMapper employeeMapper;
  private final CodeGeneratorService codeGeneratorService;
  private final FieldCryptoService fieldCryptoService;
  private final HeadcountService headcountService;
  private final WorkflowEngine workflowEngine;
  private final WorkflowInstanceMapper workflowInstanceMapper;
  private final WorkflowTaskMapper workflowTaskMapper;
  private final EmployeeService employeeService;

  public OnboardingService(
      OnboardingCaseMapper caseMapper,
      OrganizationMapper organizationMapper,
      PositionMapper positionMapper,
      EmployeeMapper employeeMapper,
      CodeGeneratorService codeGeneratorService,
      FieldCryptoService fieldCryptoService,
      HeadcountService headcountService,
      WorkflowEngine workflowEngine,
      WorkflowInstanceMapper workflowInstanceMapper,
      WorkflowTaskMapper workflowTaskMapper,
      EmployeeService employeeService
  ) {
    this.caseMapper = caseMapper;
    this.organizationMapper = organizationMapper;
    this.positionMapper = positionMapper;
    this.employeeMapper = employeeMapper;
    this.codeGeneratorService = codeGeneratorService;
    this.fieldCryptoService = fieldCryptoService;
    this.headcountService = headcountService;
    this.workflowEngine = workflowEngine;
    this.workflowInstanceMapper = workflowInstanceMapper;
    this.workflowTaskMapper = workflowTaskMapper;
    this.employeeService = employeeService;
  }

  public PageResult page(String keyword, String status, long page, long pageSize) {
    LambdaQueryWrapper<OnboardingCaseEntity> qw = new LambdaQueryWrapper<OnboardingCaseEntity>()
        .orderByDesc(OnboardingCaseEntity::getId);
    if (status != null && !status.isBlank()) {
      qw.eq(OnboardingCaseEntity::getStatus, status.trim().toUpperCase());
    }
    if (keyword != null && !keyword.isBlank()) {
      String k = keyword.trim();
      qw.and(w -> w.like(OnboardingCaseEntity::getCaseNo, k)
          .or().like(OnboardingCaseEntity::getCandidateName, k)
          .or().like(OnboardingCaseEntity::getMobile, k));
    }
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    Long total = caseMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    return new PageResult(caseMapper.selectList(qw), total == null ? 0 : total);
  }

  public OnboardingCaseEntity require(long id) {
    OnboardingCaseEntity e = caseMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("入职单不存在");
    return e;
  }

  @Transactional
  public OnboardingCaseEntity create(CreateCommand cmd) {
    validateRequired(cmd.candidateName(), cmd.mobile(), cmd.organizationId(), cmd.positionId(), cmd.expectedHireDate());
    requireOrgAndPosition(cmd.organizationId(), cmd.positionId());

    OnboardingCaseEntity entity = new OnboardingCaseEntity();
    entity.setCaseNo(codeGeneratorService.generate("ONBOARDING_CASE_NO", cmd.expectedHireDate()).code());
    entity.setCandidateName(cmd.candidateName().trim());
    entity.setMobile(cmd.mobile().trim());
    entity.setGender(blankToNull(cmd.gender()));
    entity.setOrganizationId(cmd.organizationId());
    entity.setPositionId(cmd.positionId());
    entity.setExpectedHireDate(cmd.expectedHireDate());
    entity.setEmploymentType(blankToNull(cmd.employmentType()));
    entity.setRemark(blankToNull(cmd.remark()));
    entity.setStatus(OnboardingStatus.DRAFT);
    Long userId = currentUserId();
    entity.setCreatedBy(userId);
    entity.setUpdatedBy(userId);
    caseMapper.insert(entity);
    return require(entity.getId());
  }

  @Transactional
  public OnboardingCaseEntity update(long id, UpdateCommand cmd) {
    OnboardingCaseEntity cur = require(id);
    requireStatus(cur, OnboardingStatus.DRAFT);

    if (cmd.candidateName() != null) {
      if (cmd.candidateName().isBlank()) throw new IllegalArgumentException("姓名不能为空");
      cur.setCandidateName(cmd.candidateName().trim());
    }
    if (cmd.mobile() != null) {
      if (cmd.mobile().isBlank()) throw new IllegalArgumentException("手机号不能为空");
      cur.setMobile(cmd.mobile().trim());
    }
    if (cmd.gender() != null) cur.setGender(blankToNull(cmd.gender()));
    if (cmd.organizationId() != null) cur.setOrganizationId(cmd.organizationId());
    if (cmd.positionId() != null) cur.setPositionId(cmd.positionId());
    if (cmd.expectedHireDate() != null) cur.setExpectedHireDate(cmd.expectedHireDate());
    if (cmd.employmentType() != null) cur.setEmploymentType(blankToNull(cmd.employmentType()));
    if (cmd.remark() != null) cur.setRemark(blankToNull(cmd.remark()));

    requireOrgAndPosition(cur.getOrganizationId(), cur.getPositionId());
    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public OnboardingCaseEntity submit(long id, Map<String, Long> nodeAssignees) {
    OnboardingCaseEntity cur = require(id);
    requireStatus(cur, OnboardingStatus.DRAFT);
    validateRequired(
        cur.getCandidateName(),
        cur.getMobile(),
        cur.getOrganizationId(),
        cur.getPositionId(),
        cur.getExpectedHireDate()
    );
    requireOrgAndPosition(cur.getOrganizationId(), cur.getPositionId());

    int fiscalYear = fiscalYearOf(cur.getExpectedHireDate());
    headcountService.reserve(cur.getOrganizationId(), fiscalYear, 1);

    // 审批人由流程定义规则解析（DIRECT_MANAGER / ORG_* / ROLE 等）；
    // nodeAssignees 仅在流程含 INITIATOR_SELECT 时由前端传入；
    // organizationId 传入流程上下文，供 DIRECT_MANAGER / ORG_* 按待入职组织解析
    Map<String, Long> assignees = nodeAssignees == null ? Map.of() : Map.copyOf(nodeAssignees);

    WorkflowInstanceEntity instance;
    try {
      instance = workflowEngine.start(new WorkflowEngine.StartCommand(
          "onboarding",
          "ONBOARDING",
          String.valueOf(cur.getId()),
          null,
          assignees,
          cur.getOrganizationId()
      ));
    } catch (RuntimeException ex) {
      // 流程启动失败时回滚在途编制
      headcountService.releaseReserved(cur.getOrganizationId(), fiscalYear, 1);
      throw ex;
    }

    cur.setWorkflowInstanceId(instance.getId());
    cur.setStatus(OnboardingStatus.PENDING);
    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public OnboardingCaseEntity cancel(long id) {
    OnboardingCaseEntity cur = require(id);
    if (OnboardingStatus.CANCELLED.equals(cur.getStatus())
        || OnboardingStatus.COMPLETED.equals(cur.getStatus())
        || OnboardingStatus.IN_PROGRESS.equals(cur.getStatus())) {
      throw new IllegalArgumentException("当前状态不可取消: " + cur.getStatus());
    }

    if (OnboardingStatus.PENDING.equals(cur.getStatus())) {
      if (cur.getWorkflowInstanceId() != null) {
        workflowEngine.cancelRunningInstance(cur.getWorkflowInstanceId(), "入职单取消");
      }
      headcountService.releaseReserved(
          cur.getOrganizationId(),
          fiscalYearOf(cur.getExpectedHireDate()),
          1
      );
      // 保留 workflowInstanceId，便于详情页继续查看审批轨迹
    }

    cur.setStatus(OnboardingStatus.CANCELLED);
    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public OnboardingCaseEntity complete(long id) {
    OnboardingCaseEntity cur = require(id);
    requireStatus(cur, OnboardingStatus.IN_PROGRESS);
    cur.setStatus(OnboardingStatus.COMPLETED);
    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);
    return require(id);
  }

  /** 审批通过：建档并推进至 IN_PROGRESS */
  @Transactional
  public void onWorkflowCompleted(long caseId) {
    OnboardingCaseEntity cur = require(caseId);
    if (!OnboardingStatus.PENDING.equals(cur.getStatus())) {
      throw new IllegalStateException("入职单状态不是 PENDING，无法完成审批回调: " + cur.getStatus());
    }
    if (cur.getEmployeeId() != null) {
      return;
    }

    EmployeeEntity employee = employeeService.create(new EmployeeService.CreateCommand(
        cur.getCandidateName(),
        cur.getGender(),
        cur.getMobile(),
        null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null, null, null, null,
        cur.getExpectedHireDate(),
        "PROBATION",
        cur.getOrganizationId(),
        cur.getPositionId(),
        cur.getEmploymentType(),
        cur.getExpectedHireDate(),
        "onboarding"
    ));

    headcountService.occupyFromReserved(
        cur.getOrganizationId(),
        fiscalYearOf(cur.getExpectedHireDate()),
        1
    );

    cur.setEmployeeId(employee.getId());
    cur.setStatus(OnboardingStatus.IN_PROGRESS);
    caseMapper.updateById(cur);
  }

  /** 审批驳回：回退 DRAFT 并释放在途编制 */
  @Transactional
  public void onWorkflowRejected(long caseId) {
    OnboardingCaseEntity cur = require(caseId);
    if (!OnboardingStatus.PENDING.equals(cur.getStatus())) {
      return;
    }
    headcountService.releaseReserved(
        cur.getOrganizationId(),
        fiscalYearOf(cur.getExpectedHireDate()),
        1
    );
    cur.setStatus(OnboardingStatus.DRAFT);
    // 保留 workflowInstanceId，便于回退草稿后仍可查看驳回轨迹
    caseMapper.updateById(cur);
  }

  public Map<Long, OrganizationEntity> orgMap(List<OnboardingCaseEntity> items) {
    if (items.isEmpty()) return Map.of();
    List<Long> ids = items.stream().map(OnboardingCaseEntity::getOrganizationId).distinct().toList();
    return organizationMapper.selectBatchIds(ids).stream()
        .collect(Collectors.toMap(OrganizationEntity::getId, o -> o, (a, b) -> a));
  }

  public Map<Long, PositionEntity> positionMap(List<OnboardingCaseEntity> items) {
    if (items.isEmpty()) return Map.of();
    List<Long> ids = items.stream().map(OnboardingCaseEntity::getPositionId).distinct().toList();
    return positionMapper.selectBatchIds(ids).stream()
        .collect(Collectors.toMap(PositionEntity::getId, p -> p, (a, b) -> a));
  }

  public Map<Long, EmployeeEntity> employeeMap(List<OnboardingCaseEntity> items) {
    List<Long> ids = items.stream()
        .map(OnboardingCaseEntity::getEmployeeId)
        .filter(id -> id != null)
        .distinct()
        .toList();
    if (ids.isEmpty()) return Map.of();
    return employeeMapper.selectBatchIds(ids).stream()
        .collect(Collectors.toMap(EmployeeEntity::getId, e -> e, (a, b) -> a));
  }

  public Map<String, Object> toDto(
      OnboardingCaseEntity e,
      OrganizationEntity org,
      PositionEntity pos,
      EmployeeEntity employee,
      boolean maskMobile
  ) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("caseNo", e.getCaseNo());
    dto.put("candidateName", e.getCandidateName());
    String mobile = e.getMobile() == null ? "" : e.getMobile();
    dto.put("mobile", maskMobile ? fieldCryptoService.maskMobile(mobile) : mobile);
    dto.put("gender", e.getGender());
    dto.put("organizationId", String.valueOf(e.getOrganizationId()));
    dto.put("positionId", String.valueOf(e.getPositionId()));
    dto.put("organizationName", org == null ? null : org.getName());
    dto.put("positionName", pos == null ? null : pos.getName());
    dto.put("expectedHireDate", e.getExpectedHireDate() == null ? null : e.getExpectedHireDate().toString());
    dto.put("employmentType", e.getEmploymentType());
    dto.put("status", e.getStatus());
    dto.put("workflowInstanceId", e.getWorkflowInstanceId() == null ? null : String.valueOf(e.getWorkflowInstanceId()));
    dto.put("employeeId", e.getEmployeeId() == null ? null : String.valueOf(e.getEmployeeId()));
    dto.put("employeeNo", employee == null ? null : employee.getEmployeeNo());
    dto.put("remark", e.getRemark());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  /** 入职单审批轨迹（需已提交并关联流程实例） */
  public List<Map<String, Object>> listApprovalTasks(long caseId) {
    OnboardingCaseEntity cur = require(caseId);
    if (cur.getWorkflowInstanceId() == null) {
      return List.of();
    }
    return workflowEngine.listInstanceTaskDtosInternal(cur.getWorkflowInstanceId());
  }

  /**
   * 当前用户是否可查看入职单详情：具备 onboarding:view，
   * 或为关联流程的发起人/任一审批节点处理人。
   */
  public boolean canCurrentUserViewCase(long caseId) {
    AuthUser current = AuthContext.current();
    if (current == null) return false;
    OnboardingCaseEntity cur = require(caseId);
    if (cur.getWorkflowInstanceId() == null) return false;

    WorkflowInstanceEntity instance = workflowInstanceMapper.selectById(cur.getWorkflowInstanceId());
    if (instance == null) return false;
    if (current.id().equals(instance.getInitiatorUserId())) return true;

    Long related = workflowTaskMapper.selectCount(
        new LambdaQueryWrapper<WorkflowTaskEntity>()
            .eq(WorkflowTaskEntity::getInstanceId, instance.getId())
            .eq(WorkflowTaskEntity::getAssigneeUserId, current.id())
    );
    return related != null && related > 0;
  }

  private void validateRequired(
      String name,
      String mobile,
      Long organizationId,
      Long positionId,
      LocalDate hireDate
  ) {
    if (name == null || name.isBlank()) throw new IllegalArgumentException("姓名不能为空");
    if (mobile == null || mobile.isBlank()) throw new IllegalArgumentException("手机号不能为空");
    if (organizationId == null) throw new IllegalArgumentException("组织不能为空");
    if (positionId == null) throw new IllegalArgumentException("岗位不能为空");
    if (hireDate == null) throw new IllegalArgumentException("预计入职日不能为空");
  }

  private void requireOrgAndPosition(Long organizationId, Long positionId) {
    if (organizationMapper.selectById(organizationId) == null) {
      throw new IllegalArgumentException("组织不存在");
    }
    if (positionMapper.selectById(positionId) == null) {
      throw new IllegalArgumentException("岗位不存在");
    }
  }

  private void requireStatus(OnboardingCaseEntity e, String expected) {
    if (!expected.equals(e.getStatus())) {
      throw new IllegalArgumentException("当前状态不允许此操作，期望 " + expected + "，实际 " + e.getStatus());
    }
  }

  private static int fiscalYearOf(LocalDate date) {
    return date == null ? LocalDate.now().getYear() : date.getYear();
  }

  private static String blankToNull(String v) {
    if (v == null) return null;
    String t = v.trim();
    return t.isEmpty() ? null : t;
  }

  private static Long currentUserId() {
    AuthUser u = AuthContext.current();
    return u == null ? null : u.id();
  }

  public record PageResult(List<OnboardingCaseEntity> records, long total) {}

  public record CreateCommand(
      String candidateName,
      String mobile,
      String gender,
      Long organizationId,
      Long positionId,
      LocalDate expectedHireDate,
      String employmentType,
      String remark
  ) {}

  public record UpdateCommand(
      String candidateName,
      String mobile,
      String gender,
      Long organizationId,
      Long positionId,
      LocalDate expectedHireDate,
      String employmentType,
      String remark
  ) {}
}
