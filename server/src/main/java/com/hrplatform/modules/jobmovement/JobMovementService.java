package com.hrplatform.modules.jobmovement;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeAssignmentEntity;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeMapper;
import com.hrplatform.core.employee.EmployeeMovementService;
import com.hrplatform.core.employee.EmployeeService;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.OrganizationMapper;
import com.hrplatform.core.organization.PositionEntity;
import com.hrplatform.core.organization.PositionMapper;
import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.auth.AuthUser;
import com.hrplatform.platform.code.CodeGeneratorService;
import com.hrplatform.platform.employeegroup.EmployeeGroupEntity;
import com.hrplatform.platform.employeegroup.EmployeeGroupMapper;
import com.hrplatform.platform.employeegroup.EmployeeSubgroupEntity;
import com.hrplatform.platform.employeegroup.EmployeeSubgroupMapper;
import com.hrplatform.platform.parentchild.ParentChildCatalogService;
import com.hrplatform.platform.parentchild.ParentChildItemEntity;
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
import java.util.Objects;

@Service
public class JobMovementService {
  private static final String CATALOG = "MOVEMENT_CATALOG";

  private final JobMovementRequestMapper requestMapper;
  private final EmployeeMapper employeeMapper;
  private final OrganizationMapper organizationMapper;
  private final PositionMapper positionMapper;
  private final EmployeeGroupMapper employeeGroupMapper;
  private final EmployeeSubgroupMapper employeeSubgroupMapper;
  private final CodeGeneratorService codeGeneratorService;
  private final WorkflowEngine workflowEngine;
  private final WorkflowInstanceMapper workflowInstanceMapper;
  private final WorkflowTaskMapper workflowTaskMapper;
  private final EmployeeService employeeService;
  private final EmployeeMovementService movementService;
  private final ParentChildCatalogService catalogService;

  public JobMovementService(
      JobMovementRequestMapper requestMapper,
      EmployeeMapper employeeMapper,
      OrganizationMapper organizationMapper,
      PositionMapper positionMapper,
      EmployeeGroupMapper employeeGroupMapper,
      EmployeeSubgroupMapper employeeSubgroupMapper,
      CodeGeneratorService codeGeneratorService,
      WorkflowEngine workflowEngine,
      WorkflowInstanceMapper workflowInstanceMapper,
      WorkflowTaskMapper workflowTaskMapper,
      EmployeeService employeeService,
      EmployeeMovementService movementService,
      ParentChildCatalogService catalogService
  ) {
    this.requestMapper = requestMapper;
    this.employeeMapper = employeeMapper;
    this.organizationMapper = organizationMapper;
    this.positionMapper = positionMapper;
    this.employeeGroupMapper = employeeGroupMapper;
    this.employeeSubgroupMapper = employeeSubgroupMapper;
    this.codeGeneratorService = codeGeneratorService;
    this.workflowEngine = workflowEngine;
    this.workflowInstanceMapper = workflowInstanceMapper;
    this.workflowTaskMapper = workflowTaskMapper;
    this.employeeService = employeeService;
    this.movementService = movementService;
    this.catalogService = catalogService;
  }

  public PageResult page(String movementType, String keyword, String status, long page, long pageSize) {
    LambdaQueryWrapper<JobMovementRequestEntity> qw = new LambdaQueryWrapper<JobMovementRequestEntity>()
        .orderByDesc(JobMovementRequestEntity::getId);
    if (movementType != null && !movementType.isBlank()) {
      qw.eq(JobMovementRequestEntity::getMovementType, JobMovementTypes.requireType(movementType));
    }
    if (status != null && !status.isBlank()) {
      qw.eq(JobMovementRequestEntity::getStatus, status.trim().toUpperCase());
    }
    if (keyword != null && !keyword.isBlank()) {
      String k = keyword.trim();
      List<Long> employeeIds = employeeMapper.selectList(
          new LambdaQueryWrapper<EmployeeEntity>()
              .and(w -> w.like(EmployeeEntity::getEmployeeNo, k).or().like(EmployeeEntity::getFullName, k))
              .select(EmployeeEntity::getId)
      ).stream().map(EmployeeEntity::getId).toList();
      qw.and(w -> {
        w.like(JobMovementRequestEntity::getRequestNo, k);
        if (!employeeIds.isEmpty()) {
          w.or().in(JobMovementRequestEntity::getEmployeeId, employeeIds);
        }
      });
    }
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    Long total = requestMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    return new PageResult(requestMapper.selectList(qw), total == null ? 0 : total);
  }

  public JobMovementRequestEntity require(long id) {
    JobMovementRequestEntity e = requestMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("职务异动单不存在");
    return e;
  }

  @Transactional
  public JobMovementRequestEntity create(CreateCommand cmd) {
    String type = JobMovementTypes.requireType(cmd.movementType());
    if (cmd.employeeId() == null) throw new IllegalArgumentException("员工不能为空");
    if (cmd.effectiveDate() == null) throw new IllegalArgumentException("生效日期不能为空");

    EmployeeEntity employee = employeeService.require(cmd.employeeId());
    requireActiveOrProbation(employee);
    EmployeeAssignmentEntity from = resolveFromAssignment(cmd.employeeId(), cmd.fromAssignmentId());
    assertNoOpenRequest(cmd.employeeId(), type);

    JobMovementRequestEntity entity = new JobMovementRequestEntity();
    entity.setRequestNo(codeGeneratorService.generate("JOB_MOVEMENT_REQUEST_NO", cmd.effectiveDate()).code());
    entity.setMovementType(type);
    entity.setEmployeeId(cmd.employeeId());
    entity.setFromAssignmentId(from.getId());
    entity.setEffectiveDate(cmd.effectiveDate());
    applyTargetFields(entity, cmd);
    validateBusiness(entity, from);
    entity.setOpinion(blankToNull(cmd.opinion()));
    entity.setRemark(blankToNull(cmd.remark()));
    entity.setStatus(JobMovementStatus.DRAFT);
    Long userId = currentUserId();
    entity.setCreatedBy(userId);
    entity.setUpdatedBy(userId);
    requestMapper.insert(entity);
    return require(entity.getId());
  }

  @Transactional
  public JobMovementRequestEntity update(long id, UpdateCommand cmd) {
    JobMovementRequestEntity cur = require(id);
    requireStatus(cur, JobMovementStatus.DRAFT);
    EmployeeAssignmentEntity from = employeeService.requireAssignment(cur.getEmployeeId(), cur.getFromAssignmentId());

    if (cmd.effectiveDate() != null) cur.setEffectiveDate(cmd.effectiveDate());
    applyTargetFields(cur, cmd);
    validateBusiness(cur, from);
    if (cmd.opinion() != null) cur.setOpinion(blankToNull(cmd.opinion()));
    if (cmd.remark() != null) cur.setRemark(blankToNull(cmd.remark()));
    cur.setUpdatedBy(currentUserId());
    requestMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public JobMovementRequestEntity submit(long id, Map<String, Long> nodeAssignees) {
    JobMovementRequestEntity cur = require(id);
    requireStatus(cur, JobMovementStatus.DRAFT);
    EmployeeEntity employee = employeeService.require(cur.getEmployeeId());
    requireActiveOrProbation(employee);
    EmployeeAssignmentEntity from = employeeService.requireAssignment(cur.getEmployeeId(), cur.getFromAssignmentId());
    validateBusiness(cur, from);

    Map<String, Long> assignees = nodeAssignees == null ? Map.of() : Map.copyOf(nodeAssignees);
    WorkflowInstanceEntity instance = workflowEngine.start(new WorkflowEngine.StartCommand(
        JobMovementTypes.definitionCodeOf(cur.getMovementType()),
        JobMovementTypes.businessTypeOf(cur.getMovementType()),
        String.valueOf(cur.getId()),
        null,
        assignees,
        from.getOrganizationId()
    ));

    cur.setWorkflowInstanceId(instance.getId());
    cur.setStatus(JobMovementStatus.PENDING);
    cur.setUpdatedBy(currentUserId());
    requestMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public JobMovementRequestEntity cancel(long id) {
    JobMovementRequestEntity cur = require(id);
    if (JobMovementStatus.CANCELLED.equals(cur.getStatus())
        || JobMovementStatus.COMPLETED.equals(cur.getStatus())) {
      throw new IllegalArgumentException("当前状态不可取消: " + cur.getStatus());
    }
    if (JobMovementStatus.PENDING.equals(cur.getStatus()) && cur.getWorkflowInstanceId() != null) {
      workflowEngine.cancelRunningInstance(cur.getWorkflowInstanceId(), "职务异动单取消");
    }
    cur.setStatus(JobMovementStatus.CANCELLED);
    cur.setUpdatedBy(currentUserId());
    requestMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public void onWorkflowCompleted(long requestId) {
    JobMovementRequestEntity cur = require(requestId);
    if (!JobMovementStatus.PENDING.equals(cur.getStatus())) {
      throw new IllegalStateException("异动单状态不是 PENDING，无法完成审批回调: " + cur.getStatus());
    }
    if (cur.getToAssignmentId() != null) {
      cur.setStatus(JobMovementStatus.COMPLETED);
      requestMapper.updateById(cur);
      return;
    }

    EmployeeAssignmentEntity from = employeeService.requireAssignment(
        cur.getEmployeeId(), cur.getFromAssignmentId());
    validateBusiness(cur, from);

    EmployeeAssignmentEntity patch = new EmployeeAssignmentEntity();
    patch.setEditMode("NEW_VERSION");
    patch.setEffectiveStartDate(cur.getEffectiveDate());
    if (cur.getOrganizationId() != null) patch.setOrganizationId(cur.getOrganizationId());
    if (cur.getPositionId() != null) patch.setPositionId(cur.getPositionId());
    if (cur.getJobGradeCode() != null) patch.setJobGradeCode(cur.getJobGradeCode());
    if (cur.getEmployeeGroupCode() != null) patch.setEmployeeGroupCode(cur.getEmployeeGroupCode());
    if (cur.getEmployeeSubgroupCode() != null) {
      patch.setEmployeeSubgroupCode(cur.getEmployeeSubgroupCode());
    }
    // 不设 movementType，避免 NEW_VERSION 自动写入 source=assignment_manual 的重复异动
    EmployeeAssignmentEntity neu = employeeService.updateAssignmentFromBody(
        cur.getEmployeeId(), cur.getFromAssignmentId(), patch);

    // 回写任职版本上的异动码（档案展示）
    EmployeeAssignmentEntity labelPatch = new EmployeeAssignmentEntity();
    labelPatch.setMovementType(cur.getMovementType());
    labelPatch.setReasonCode(cur.getReasonCode());
    labelPatch.setReasonSubCode(cur.getReasonSubCode());
    employeeService.updateAssignmentFromBody(cur.getEmployeeId(), neu.getId(), labelPatch);

    movementService.insert(
        cur.getMovementType(),
        cur.getReasonCode(),
        cur.getReasonSubCode(),
        cur.getEffectiveDate(),
        cur.getEmployeeId(),
        from.getId(),
        neu.getId(),
        JobMovementTypes.SOURCE_TYPES.get(cur.getMovementType())
    );

    cur.setToAssignmentId(neu.getId());
    cur.setStatus(JobMovementStatus.COMPLETED);
    requestMapper.updateById(cur);
  }

  @Transactional
  public void onWorkflowRejected(long requestId) {
    JobMovementRequestEntity cur = require(requestId);
    if (!JobMovementStatus.PENDING.equals(cur.getStatus())) return;
    cur.setStatus(JobMovementStatus.DRAFT);
    requestMapper.updateById(cur);
  }

  public List<Map<String, Object>> listApprovalTasks(long requestId) {
    JobMovementRequestEntity cur = require(requestId);
    if (cur.getWorkflowInstanceId() == null) return List.of();
    return workflowEngine.listInstanceTaskDtosInternal(cur.getWorkflowInstanceId());
  }

  public boolean canCurrentUserViewRequest(long requestId) {
    AuthUser current = AuthContext.current();
    if (current == null) return false;
    JobMovementRequestEntity cur = require(requestId);
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

  public Map<String, Object> toDto(JobMovementRequestEntity e) {
    EmployeeEntity employee = employeeMapper.selectById(e.getEmployeeId());
    EmployeeAssignmentEntity from = null;
    try {
      from = employeeService.requireAssignment(e.getEmployeeId(), e.getFromAssignmentId());
    } catch (IllegalArgumentException ignored) {
      // ignore
    }

    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("requestNo", e.getRequestNo());
    dto.put("movementType", e.getMovementType());
    dto.put("movementTypeName", JobMovementTypes.TYPE_NAMES.get(e.getMovementType()));
    dto.put("employeeId", String.valueOf(e.getEmployeeId()));
    dto.put("employeeNo", employee == null ? null : employee.getEmployeeNo());
    dto.put("employeeName", employee == null ? null : employee.getFullName());
    dto.put("fromAssignmentId", String.valueOf(e.getFromAssignmentId()));
    dto.put("toAssignmentId", e.getToAssignmentId() == null ? null : String.valueOf(e.getToAssignmentId()));
    dto.put("effectiveDate", e.getEffectiveDate() == null ? null : e.getEffectiveDate().toString());
    dto.put("reasonCode", e.getReasonCode());
    dto.put("reasonLabel", resolveReasonLabel(e.getMovementType(), e.getReasonCode()));
    dto.put("reasonSubCode", e.getReasonSubCode());
    dto.put("reasonSubLabel", resolveSubLabel(e.getReasonCode(), e.getReasonSubCode()));

    if (from != null) {
      dto.put("fromOrganizationId", strId(from.getOrganizationId()));
      dto.put("fromOrganizationName", nameOfOrg(from.getOrganizationId()));
      dto.put("fromPositionId", strId(from.getPositionId()));
      dto.put("fromPositionName", nameOfPos(from.getPositionId()));
      dto.put("fromJobGradeCode", from.getJobGradeCode());
      dto.put("fromEmployeeGroupCode", from.getEmployeeGroupCode());
      dto.put("fromEmployeeSubgroupCode", from.getEmployeeSubgroupCode());
    }

    Long orgId = e.getOrganizationId() != null
        ? e.getOrganizationId()
        : (from == null ? null : from.getOrganizationId());
    Long posId = e.getPositionId() != null
        ? e.getPositionId()
        : (from == null ? null : from.getPositionId());
    dto.put("organizationId", strId(orgId));
    dto.put("organizationName", nameOfOrg(orgId));
    dto.put("positionId", strId(posId));
    dto.put("positionName", nameOfPos(posId));
    dto.put("jobGradeCode", e.getJobGradeCode() != null
        ? e.getJobGradeCode()
        : (from == null ? null : from.getJobGradeCode()));
    dto.put("employeeGroupCode", e.getEmployeeGroupCode());
    dto.put("employeeGroupName", nameOfGroup(e.getEmployeeGroupCode()));
    dto.put("employeeSubgroupCode", e.getEmployeeSubgroupCode());
    dto.put("employeeSubgroupName", nameOfSubgroup(e.getEmployeeGroupCode(), e.getEmployeeSubgroupCode()));
    dto.put("opinion", e.getOpinion());
    dto.put("status", e.getStatus());
    dto.put("workflowInstanceId", e.getWorkflowInstanceId() == null ? null : String.valueOf(e.getWorkflowInstanceId()));
    dto.put("remark", e.getRemark());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private void applyTargetFields(JobMovementRequestEntity entity, TargetFields cmd) {
    if (cmd.reasonCode() != null) entity.setReasonCode(blankToNull(cmd.reasonCode()));
    if (cmd.reasonSubCode() != null) entity.setReasonSubCode(blankToNull(cmd.reasonSubCode()));
    if (cmd.organizationId() != null) entity.setOrganizationId(cmd.organizationId());
    if (cmd.positionId() != null) entity.setPositionId(cmd.positionId());
    if (cmd.jobGradeCode() != null) entity.setJobGradeCode(blankToNull(cmd.jobGradeCode()));
    if (cmd.employeeGroupCode() != null) entity.setEmployeeGroupCode(blankToNull(cmd.employeeGroupCode()));
    if (cmd.employeeSubgroupCode() != null) {
      entity.setEmployeeSubgroupCode(blankToNull(cmd.employeeSubgroupCode()));
    }
  }

  private void validateBusiness(JobMovementRequestEntity e, EmployeeAssignmentEntity from) {
    if (e.getEffectiveDate() == null) throw new IllegalArgumentException("生效日期不能为空");
    if (e.getReasonCode() == null || e.getReasonCode().isBlank()) {
      throw new IllegalArgumentException("操作原因不能为空");
    }
    // 校验三级目录
    ParentChildItemEntity reasonItem = catalogService.listChildren(CATALOG, e.getMovementType()).stream()
        .filter(r -> e.getReasonCode().equals(r.getCode()) && "ACTIVE".equals(r.getStatus()))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("无效的操作原因: " + e.getReasonCode()));
    List<ParentChildItemEntity> subs = catalogService.listChildren(CATALOG, reasonItem.getCode()).stream()
        .filter(s -> "ACTIVE".equals(s.getStatus()))
        .toList();
    if (!subs.isEmpty()) {
      if (e.getReasonSubCode() == null || e.getReasonSubCode().isBlank()) {
        throw new IllegalArgumentException("操作原因 " + e.getReasonCode() + " 必须选择原因子项");
      }
      boolean ok = subs.stream().anyMatch(s -> e.getReasonSubCode().equals(s.getCode()));
      if (!ok) throw new IllegalArgumentException("无效的原因子项: " + e.getReasonSubCode());
    } else if (e.getReasonSubCode() != null && !e.getReasonSubCode().isBlank()) {
      throw new IllegalArgumentException("操作原因 " + e.getReasonCode() + " 不需要原因子项");
    }

    String type = e.getMovementType();
    String reasonCode = e.getReasonCode();
    if (JobMovementTypes.PRO.equals(type)) {
      if ("PR1".equals(reasonCode) || "PR2".equals(reasonCode)) {
        requirePositionChange(e, from, "晋升/任命须指定目标岗位");
      } else if ("PR3".equals(reasonCode)) {
        requireGradeChange(e, from, "晋级须指定目标职级");
      }
      fillOrgFromPosition(e);
    } else if (JobMovementTypes.DEM.equals(type)) {
      if ("D01".equals(reasonCode)) {
        requirePositionChange(e, from, "降职须指定目标岗位");
      } else if ("D02".equals(reasonCode)) {
        requireGradeChange(e, from, "降级须指定目标职级");
      }
      fillOrgFromPosition(e);
    } else if (JobMovementTypes.SPR.equals(type)) {
      if (e.getEmployeeGroupCode() == null || e.getEmployeeGroupCode().isBlank()) {
        throw new IllegalArgumentException("雇佣类型变更须指定目标员工组");
      }
      if (Objects.equals(e.getEmployeeGroupCode(), from.getEmployeeGroupCode())
          && Objects.equals(
              nullToEmpty(e.getEmployeeSubgroupCode()),
              nullToEmpty(from.getEmployeeSubgroupCode()))) {
        throw new IllegalArgumentException("目标员工组/子组与当前相同，无需变更");
      }
      if (employeeGroupMapper.selectOne(
          new LambdaQueryWrapper<EmployeeGroupEntity>()
              .eq(EmployeeGroupEntity::getCode, e.getEmployeeGroupCode())
              .last("LIMIT 1")) == null) {
        throw new IllegalArgumentException("员工组不存在: " + e.getEmployeeGroupCode());
      }
      if (e.getEmployeeSubgroupCode() != null && !e.getEmployeeSubgroupCode().isBlank()) {
        if (employeeSubgroupMapper.selectOne(
            new LambdaQueryWrapper<EmployeeSubgroupEntity>()
                .eq(EmployeeSubgroupEntity::getEmployeeGroupCode, e.getEmployeeGroupCode())
                .eq(EmployeeSubgroupEntity::getCode, e.getEmployeeSubgroupCode())
                .last("LIMIT 1")) == null) {
          throw new IllegalArgumentException("员工子组不存在");
        }
      }
    }

    if (e.getEffectiveDate().equals(from.getEffectiveStartDate())) {
      throw new IllegalArgumentException("生效日不能与当前任职版本生效日相同");
    }
  }

  private void requirePositionChange(JobMovementRequestEntity e, EmployeeAssignmentEntity from, String msg) {
    if (e.getPositionId() == null) throw new IllegalArgumentException(msg);
    if (e.getPositionId().equals(from.getPositionId())
        && (e.getJobGradeCode() == null || Objects.equals(e.getJobGradeCode(), from.getJobGradeCode()))) {
      throw new IllegalArgumentException("目标岗位/职级与当前相同，无需变更");
    }
    PositionEntity pos = positionMapper.selectById(e.getPositionId());
    if (pos == null) throw new IllegalArgumentException("目标岗位不存在");
  }

  private void requireGradeChange(JobMovementRequestEntity e, EmployeeAssignmentEntity from, String msg) {
    if (e.getJobGradeCode() == null || e.getJobGradeCode().isBlank()) {
      throw new IllegalArgumentException(msg);
    }
    if (Objects.equals(e.getJobGradeCode(), from.getJobGradeCode())
        && (e.getPositionId() == null || e.getPositionId().equals(from.getPositionId()))) {
      throw new IllegalArgumentException("目标职级与当前相同，无需变更");
    }
  }

  private void fillOrgFromPosition(JobMovementRequestEntity e) {
    if (e.getPositionId() == null) return;
    PositionEntity pos = positionMapper.selectById(e.getPositionId());
    if (pos != null && pos.getOrganizationId() != null) {
      e.setOrganizationId(pos.getOrganizationId());
    }
  }

  private EmployeeAssignmentEntity resolveFromAssignment(long employeeId, Long assignmentId) {
    if (assignmentId != null) {
      return employeeService.requireAssignment(employeeId, assignmentId);
    }
    EmployeeAssignmentEntity primary = employeeService.findCurrentPrimaryAssignment(employeeId);
    if (primary == null) throw new IllegalArgumentException("员工无当前主任职");
    return primary;
  }

  private void assertNoOpenRequest(long employeeId, String movementType) {
    Long count = requestMapper.selectCount(
        new LambdaQueryWrapper<JobMovementRequestEntity>()
            .eq(JobMovementRequestEntity::getEmployeeId, employeeId)
            .eq(JobMovementRequestEntity::getMovementType, movementType)
            .in(JobMovementRequestEntity::getStatus,
                List.of(JobMovementStatus.DRAFT, JobMovementStatus.PENDING))
    );
    if (count != null && count > 0) {
      throw new IllegalArgumentException("该员工已有进行中的「" + JobMovementTypes.TYPE_NAMES.get(movementType) + "」单据");
    }
  }

  private static void requireActiveOrProbation(EmployeeEntity employee) {
    String s = employee.getStatus();
    if (!"ACTIVE".equalsIgnoreCase(s) && !"PROBATION".equalsIgnoreCase(s)) {
      throw new IllegalArgumentException("仅在职/试用期员工可发起职务异动，当前状态: " + s);
    }
  }

  private String resolveReasonLabel(String movementType, String reasonCode) {
    if (reasonCode == null) return null;
    return catalogService.listChildren(CATALOG, movementType).stream()
        .filter(r -> reasonCode.equals(r.getCode()))
        .map(ParentChildItemEntity::getName)
        .findFirst()
        .orElse(reasonCode);
  }

  private String resolveSubLabel(String reasonCode, String subCode) {
    if (reasonCode == null || subCode == null || subCode.isBlank()) return null;
    return catalogService.listChildren(CATALOG, reasonCode).stream()
        .filter(s -> subCode.equals(s.getCode()))
        .map(ParentChildItemEntity::getName)
        .findFirst()
        .orElse(subCode);
  }

  private String nameOfOrg(Long id) {
    if (id == null) return null;
    OrganizationEntity o = organizationMapper.selectById(id);
    return o == null ? null : o.getName();
  }

  private String nameOfPos(Long id) {
    if (id == null) return null;
    PositionEntity p = positionMapper.selectById(id);
    return p == null ? null : p.getName();
  }

  private String nameOfGroup(String code) {
    if (code == null || code.isBlank()) return null;
    EmployeeGroupEntity g = employeeGroupMapper.selectOne(
        new LambdaQueryWrapper<EmployeeGroupEntity>().eq(EmployeeGroupEntity::getCode, code).last("LIMIT 1"));
    return g == null ? null : g.getName();
  }

  private String nameOfSubgroup(String groupCode, String subCode) {
    if (groupCode == null || subCode == null || subCode.isBlank()) return null;
    EmployeeSubgroupEntity s = employeeSubgroupMapper.selectOne(
        new LambdaQueryWrapper<EmployeeSubgroupEntity>()
            .eq(EmployeeSubgroupEntity::getEmployeeGroupCode, groupCode)
            .eq(EmployeeSubgroupEntity::getCode, subCode)
            .last("LIMIT 1"));
    return s == null ? null : s.getName();
  }

  private void requireStatus(JobMovementRequestEntity e, String expected) {
    if (!expected.equals(e.getStatus())) {
      throw new IllegalArgumentException("当前状态不允许此操作，期望 " + expected + "，实际 " + e.getStatus());
    }
  }

  private static String strId(Long id) {
    return id == null ? null : String.valueOf(id);
  }

  private static String blankToNull(String v) {
    if (v == null) return null;
    String t = v.trim();
    return t.isEmpty() ? null : t;
  }

  private static String nullToEmpty(String v) {
    return v == null ? "" : v;
  }

  private static Long currentUserId() {
    AuthUser u = AuthContext.current();
    return u == null ? null : u.id();
  }

  public record PageResult(List<JobMovementRequestEntity> records, long total) {}

  public interface TargetFields {
    String reasonCode();
    String reasonSubCode();
    Long organizationId();
    Long positionId();
    String jobGradeCode();
    String employeeGroupCode();
    String employeeSubgroupCode();
    String opinion();
    String remark();
  }

  public record CreateCommand(
      String movementType,
      Long employeeId,
      Long fromAssignmentId,
      LocalDate effectiveDate,
      String reasonCode,
      String reasonSubCode,
      Long organizationId,
      Long positionId,
      String jobGradeCode,
      String employeeGroupCode,
      String employeeSubgroupCode,
      String opinion,
      String remark
  ) implements TargetFields {}

  public record UpdateCommand(
      LocalDate effectiveDate,
      String reasonCode,
      String reasonSubCode,
      Long organizationId,
      Long positionId,
      String jobGradeCode,
      String employeeGroupCode,
      String employeeSubgroupCode,
      String opinion,
      String remark
  ) implements TargetFields {}
}
