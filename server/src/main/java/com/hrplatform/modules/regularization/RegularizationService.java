package com.hrplatform.modules.regularization;

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
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RegularizationService {
  private static final Set<String> REASON_CODES = Set.of("P01", "P02", "P03");
  private static final Map<String, String> REASON_LABELS = Map.of(
      "P01", "正常转正",
      "P02", "提前转正",
      "P03", "延迟转正"
  );

  private final RegularizationRequestMapper requestMapper;
  private final EmployeeMapper employeeMapper;
  private final OrganizationMapper organizationMapper;
  private final PositionMapper positionMapper;
  private final CodeGeneratorService codeGeneratorService;
  private final WorkflowEngine workflowEngine;
  private final WorkflowInstanceMapper workflowInstanceMapper;
  private final WorkflowTaskMapper workflowTaskMapper;
  private final EmployeeService employeeService;
  private final EmployeeMovementService movementService;

  public RegularizationService(
      RegularizationRequestMapper requestMapper,
      EmployeeMapper employeeMapper,
      OrganizationMapper organizationMapper,
      PositionMapper positionMapper,
      CodeGeneratorService codeGeneratorService,
      WorkflowEngine workflowEngine,
      WorkflowInstanceMapper workflowInstanceMapper,
      WorkflowTaskMapper workflowTaskMapper,
      EmployeeService employeeService,
      EmployeeMovementService movementService
  ) {
    this.requestMapper = requestMapper;
    this.employeeMapper = employeeMapper;
    this.organizationMapper = organizationMapper;
    this.positionMapper = positionMapper;
    this.codeGeneratorService = codeGeneratorService;
    this.workflowEngine = workflowEngine;
    this.workflowInstanceMapper = workflowInstanceMapper;
    this.workflowTaskMapper = workflowTaskMapper;
    this.employeeService = employeeService;
    this.movementService = movementService;
  }

  public PageResult page(String keyword, String status, long page, long pageSize) {
    LambdaQueryWrapper<RegularizationRequestEntity> qw = new LambdaQueryWrapper<RegularizationRequestEntity>()
        .orderByDesc(RegularizationRequestEntity::getId);
    if (status != null && !status.isBlank()) {
      qw.eq(RegularizationRequestEntity::getStatus, status.trim().toUpperCase());
    }
    if (keyword != null && !keyword.isBlank()) {
      String k = keyword.trim();
      List<Long> employeeIds = employeeMapper.selectList(
          new LambdaQueryWrapper<EmployeeEntity>()
              .and(w -> w.like(EmployeeEntity::getEmployeeNo, k)
                  .or().like(EmployeeEntity::getFullName, k))
              .select(EmployeeEntity::getId)
      ).stream().map(EmployeeEntity::getId).toList();
      qw.and(w -> {
        w.like(RegularizationRequestEntity::getRequestNo, k);
        if (!employeeIds.isEmpty()) {
          w.or().in(RegularizationRequestEntity::getEmployeeId, employeeIds);
        }
      });
    }
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    Long total = requestMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    return new PageResult(requestMapper.selectList(qw), total == null ? 0 : total);
  }

  public RegularizationRequestEntity require(long id) {
    RegularizationRequestEntity e = requestMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("转正单不存在");
    return e;
  }

  @Transactional
  public RegularizationRequestEntity create(CreateCommand cmd) {
    if (cmd.employeeId() == null) throw new IllegalArgumentException("员工不能为空");
    if (cmd.actualRegularizationDate() == null) throw new IllegalArgumentException("实际转正日期不能为空");

    EmployeeEntity employee = employeeService.require(cmd.employeeId());
    requireProbation(employee);

    EmployeeAssignmentEntity assignment = resolveAssignment(cmd.employeeId(), cmd.assignmentId());
    if (assignment.getActualRegularizationDate() != null) {
      throw new IllegalArgumentException("该任职已转正，不可重复发起");
    }
    assertNoOpenRequest(cmd.employeeId());

    String reasonCode = resolveReasonCode(
        assignment.getExpectedRegularizationDate(),
        cmd.actualRegularizationDate(),
        cmd.reasonCode()
    );

    RegularizationRequestEntity entity = new RegularizationRequestEntity();
    entity.setRequestNo(codeGeneratorService.generate("REGULARIZATION_REQUEST_NO", cmd.actualRegularizationDate()).code());
    entity.setEmployeeId(cmd.employeeId());
    entity.setAssignmentId(assignment.getId());
    entity.setExpectedRegularizationDate(assignment.getExpectedRegularizationDate());
    entity.setActualRegularizationDate(cmd.actualRegularizationDate());
    entity.setReasonCode(reasonCode);
    entity.setOpinion(blankToNull(cmd.opinion()));
    entity.setRemark(blankToNull(cmd.remark()));
    entity.setStatus(RegularizationStatus.DRAFT);
    Long userId = currentUserId();
    entity.setCreatedBy(userId);
    entity.setUpdatedBy(userId);
    requestMapper.insert(entity);
    return require(entity.getId());
  }

  @Transactional
  public RegularizationRequestEntity update(long id, UpdateCommand cmd) {
    RegularizationRequestEntity cur = require(id);
    requireStatus(cur, RegularizationStatus.DRAFT);

    if (cmd.actualRegularizationDate() != null) {
      cur.setActualRegularizationDate(cmd.actualRegularizationDate());
    }
    if (cmd.reasonCode() != null) {
      cur.setReasonCode(requireValidReason(cmd.reasonCode()));
    } else if (cmd.actualRegularizationDate() != null) {
      cur.setReasonCode(resolveReasonCode(
          cur.getExpectedRegularizationDate(),
          cur.getActualRegularizationDate(),
          null
      ));
    }
    if (cmd.opinion() != null) cur.setOpinion(blankToNull(cmd.opinion()));
    if (cmd.remark() != null) cur.setRemark(blankToNull(cmd.remark()));

    if (cur.getActualRegularizationDate() == null) {
      throw new IllegalArgumentException("实际转正日期不能为空");
    }
    cur.setUpdatedBy(currentUserId());
    requestMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public RegularizationRequestEntity submit(long id, Map<String, Long> nodeAssignees) {
    RegularizationRequestEntity cur = require(id);
    requireStatus(cur, RegularizationStatus.DRAFT);

    EmployeeEntity employee = employeeService.require(cur.getEmployeeId());
    requireProbation(employee);
    EmployeeAssignmentEntity assignment = employeeService.requireAssignment(
        cur.getEmployeeId(), cur.getAssignmentId());
    if (assignment.getActualRegularizationDate() != null) {
      throw new IllegalArgumentException("该任职已转正，不可提交");
    }
    if (cur.getActualRegularizationDate() == null) {
      throw new IllegalArgumentException("实际转正日期不能为空");
    }

    Map<String, Long> assignees = nodeAssignees == null ? Map.of() : Map.copyOf(nodeAssignees);
    WorkflowInstanceEntity instance = workflowEngine.start(new WorkflowEngine.StartCommand(
        "regularization",
        "REGULARIZATION",
        String.valueOf(cur.getId()),
        null,
        assignees,
        assignment.getOrganizationId()
    ));

    cur.setWorkflowInstanceId(instance.getId());
    cur.setStatus(RegularizationStatus.PENDING);
    cur.setUpdatedBy(currentUserId());
    requestMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public RegularizationRequestEntity cancel(long id) {
    RegularizationRequestEntity cur = require(id);
    if (RegularizationStatus.CANCELLED.equals(cur.getStatus())
        || RegularizationStatus.COMPLETED.equals(cur.getStatus())) {
      throw new IllegalArgumentException("当前状态不可取消: " + cur.getStatus());
    }

    if (RegularizationStatus.PENDING.equals(cur.getStatus()) && cur.getWorkflowInstanceId() != null) {
      workflowEngine.cancelRunningInstance(cur.getWorkflowInstanceId(), "转正单取消");
    }

    cur.setStatus(RegularizationStatus.CANCELLED);
    cur.setUpdatedBy(currentUserId());
    requestMapper.updateById(cur);
    return require(id);
  }

  /** 审批通过：PROBATION→ACTIVE，写任职转正字段与 PRC 异动 */
  @Transactional
  public void onWorkflowCompleted(long requestId) {
    RegularizationRequestEntity cur = require(requestId);
    if (!RegularizationStatus.PENDING.equals(cur.getStatus())) {
      throw new IllegalStateException("转正单状态不是 PENDING，无法完成审批回调: " + cur.getStatus());
    }

    EmployeeEntity employee = employeeService.require(cur.getEmployeeId());
    if (!"PROBATION".equalsIgnoreCase(employee.getStatus())) {
      throw new IllegalStateException("员工状态不是试用期，无法完成转正: " + employee.getStatus());
    }

    EmployeeAssignmentEntity patch = new EmployeeAssignmentEntity();
    patch.setActualRegularizationDate(cur.getActualRegularizationDate());
    if (cur.getOpinion() != null) {
      patch.setRegularizationOpinion(cur.getOpinion());
    }
    employeeService.updateAssignmentFromBody(cur.getEmployeeId(), cur.getAssignmentId(), patch);

    employeeService.updateMaster(cur.getEmployeeId(), statusOnlyCommand("ACTIVE"));

    movementService.insert(
        "PRC",
        cur.getReasonCode(),
        null,
        cur.getActualRegularizationDate(),
        cur.getEmployeeId(),
        cur.getAssignmentId(),
        cur.getAssignmentId(),
        "regularization"
    );

    cur.setStatus(RegularizationStatus.COMPLETED);
    requestMapper.updateById(cur);
  }

  /** 审批驳回：回退草稿 */
  @Transactional
  public void onWorkflowRejected(long requestId) {
    RegularizationRequestEntity cur = require(requestId);
    if (!RegularizationStatus.PENDING.equals(cur.getStatus())) {
      return;
    }
    cur.setStatus(RegularizationStatus.DRAFT);
    // 保留 workflowInstanceId，便于查看驳回轨迹
    requestMapper.updateById(cur);
  }

  public List<Map<String, Object>> listApprovalTasks(long requestId) {
    RegularizationRequestEntity cur = require(requestId);
    if (cur.getWorkflowInstanceId() == null) {
      return List.of();
    }
    return workflowEngine.listInstanceTaskDtosInternal(cur.getWorkflowInstanceId());
  }

  public boolean canCurrentUserViewRequest(long requestId) {
    AuthUser current = AuthContext.current();
    if (current == null) return false;
    RegularizationRequestEntity cur = require(requestId);
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

  public Map<Long, EmployeeEntity> employeeMap(List<RegularizationRequestEntity> items) {
    List<Long> ids = items.stream().map(RegularizationRequestEntity::getEmployeeId).distinct().toList();
    if (ids.isEmpty()) return Map.of();
    return employeeMapper.selectBatchIds(ids).stream()
        .collect(Collectors.toMap(EmployeeEntity::getId, e -> e, (a, b) -> a));
  }

  public Map<Long, EmployeeAssignmentEntity> assignmentMap(List<RegularizationRequestEntity> items) {
    Map<Long, EmployeeAssignmentEntity> result = new HashMap<>();
    for (RegularizationRequestEntity item : items) {
      try {
        result.put(
            item.getAssignmentId(),
            employeeService.requireAssignment(item.getEmployeeId(), item.getAssignmentId())
        );
      } catch (IllegalArgumentException ignored) {
        // 任职已删除时列表仍可展示单据
      }
    }
    return result;
  }

  public Map<Long, OrganizationEntity> orgMap(List<EmployeeAssignmentEntity> assignments) {
    List<Long> ids = assignments.stream()
        .map(EmployeeAssignmentEntity::getOrganizationId)
        .filter(id -> id != null)
        .distinct()
        .toList();
    if (ids.isEmpty()) return Map.of();
    return organizationMapper.selectBatchIds(ids).stream()
        .collect(Collectors.toMap(OrganizationEntity::getId, o -> o, (a, b) -> a));
  }

  public Map<Long, PositionEntity> positionMap(List<EmployeeAssignmentEntity> assignments) {
    List<Long> ids = assignments.stream()
        .map(EmployeeAssignmentEntity::getPositionId)
        .filter(id -> id != null)
        .distinct()
        .toList();
    if (ids.isEmpty()) return Map.of();
    return positionMapper.selectBatchIds(ids).stream()
        .collect(Collectors.toMap(PositionEntity::getId, p -> p, (a, b) -> a));
  }

  public Map<String, Object> toDto(
      RegularizationRequestEntity e,
      EmployeeEntity employee,
      EmployeeAssignmentEntity assignment,
      OrganizationEntity org,
      PositionEntity pos
  ) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("requestNo", e.getRequestNo());
    dto.put("employeeId", String.valueOf(e.getEmployeeId()));
    dto.put("employeeNo", employee == null ? null : employee.getEmployeeNo());
    dto.put("employeeName", employee == null ? null : employee.getFullName());
    dto.put("assignmentId", String.valueOf(e.getAssignmentId()));
    Long orgId = assignment == null ? null : assignment.getOrganizationId();
    Long posId = assignment == null ? null : assignment.getPositionId();
    dto.put("organizationId", orgId == null ? null : String.valueOf(orgId));
    dto.put("organizationName", org == null ? null : org.getName());
    dto.put("positionId", posId == null ? null : String.valueOf(posId));
    dto.put("positionName", pos == null ? null : pos.getName());
    dto.put(
        "expectedRegularizationDate",
        e.getExpectedRegularizationDate() == null ? null : e.getExpectedRegularizationDate().toString()
    );
    dto.put(
        "actualRegularizationDate",
        e.getActualRegularizationDate() == null ? null : e.getActualRegularizationDate().toString()
    );
    dto.put("reasonCode", e.getReasonCode());
    dto.put("reasonLabel", REASON_LABELS.getOrDefault(e.getReasonCode(), e.getReasonCode()));
    dto.put("opinion", e.getOpinion());
    dto.put("status", e.getStatus());
    dto.put(
        "workflowInstanceId",
        e.getWorkflowInstanceId() == null ? null : String.valueOf(e.getWorkflowInstanceId())
    );
    dto.put("remark", e.getRemark());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private EmployeeAssignmentEntity resolveAssignment(long employeeId, Long assignmentId) {
    if (assignmentId != null) {
      return employeeService.requireAssignment(employeeId, assignmentId);
    }
    EmployeeAssignmentEntity primary = employeeService.findCurrentPrimaryAssignment(employeeId);
    if (primary == null) {
      throw new IllegalArgumentException("员工无当前主任职，无法发起转正");
    }
    return primary;
  }

  private void assertNoOpenRequest(long employeeId) {
    Long count = requestMapper.selectCount(
        new LambdaQueryWrapper<RegularizationRequestEntity>()
            .eq(RegularizationRequestEntity::getEmployeeId, employeeId)
            .in(
                RegularizationRequestEntity::getStatus,
                List.of(RegularizationStatus.DRAFT, RegularizationStatus.PENDING)
            )
    );
    if (count != null && count > 0) {
      throw new IllegalArgumentException("该员工已有进行中的转正单");
    }
  }

  private static void requireProbation(EmployeeEntity employee) {
    if (!"PROBATION".equalsIgnoreCase(employee.getStatus())) {
      throw new IllegalArgumentException("仅试用期员工可发起转正，当前状态: " + employee.getStatus());
    }
  }

  private static String resolveReasonCode(LocalDate expected, LocalDate actual, String requested) {
    if (requested != null && !requested.isBlank()) {
      return requireValidReason(requested);
    }
    if (expected == null || actual == null) return "P01";
    int cmp = actual.compareTo(expected);
    if (cmp < 0) return "P02";
    if (cmp > 0) return "P03";
    return "P01";
  }

  private static String requireValidReason(String code) {
    String c = code.trim().toUpperCase();
    if (!REASON_CODES.contains(c)) {
      throw new IllegalArgumentException("无效的转正原因: " + code);
    }
    return c;
  }

  private static EmployeeService.MasterUpdateCommand statusOnlyCommand(String status) {
    // MasterUpdateCommand：editMode + effectiveStartDate + 31 个业务字段 + status
    return new EmployeeService.MasterUpdateCommand(
        "CURRENT",
        null,
        null, null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null, null, null,
        status
    );
  }

  private void requireStatus(RegularizationRequestEntity e, String expected) {
    if (!expected.equals(e.getStatus())) {
      throw new IllegalArgumentException("当前状态不允许此操作，期望 " + expected + "，实际 " + e.getStatus());
    }
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

  public record PageResult(List<RegularizationRequestEntity> records, long total) {}

  public record CreateCommand(
      Long employeeId,
      Long assignmentId,
      LocalDate actualRegularizationDate,
      String reasonCode,
      String opinion,
      String remark
  ) {}

  public record UpdateCommand(
      LocalDate actualRegularizationDate,
      String reasonCode,
      String opinion,
      String remark
  ) {}
}
