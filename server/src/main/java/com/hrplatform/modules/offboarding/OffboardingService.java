package com.hrplatform.modules.offboarding;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeAssignmentEntity;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeMapper;
import com.hrplatform.core.employee.EmployeeMovementService;
import com.hrplatform.core.employee.EmployeeService;
import com.hrplatform.core.headcount.HeadcountService;
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
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class OffboardingService {
  private static final Set<String> REASON_CODES = Set.of("TA", "TB", "TC", "TD", "TE", "TF", "TG", "TH");
  private static final Map<String, String> REASON_LABELS = Map.of(
      "TA", "主动离职",
      "TB", "被动离职",
      "TC", "结束兼职",
      "TD", "退休",
      "TE", "死亡",
      "TF", "从集团内部转调",
      "TG", "放弃报到",
      "TH", "入职当天离职"
  );
  private static final List<String> DEFAULT_CHECKLIST = List.of(
      "工作交接",
      "资产归还",
      "账号权限回收",
      "考勤/假期结清",
      "人事材料归档"
  );
  private static final Set<String> OPEN_STATUSES = Set.of(
      OffboardingStatus.APPLIED,
      OffboardingStatus.APPROVING,
      OffboardingStatus.HANDOVER,
      OffboardingStatus.SETTLING
  );

  private final OffboardingCaseMapper caseMapper;
  private final OffboardingHandoverItemMapper itemMapper;
  private final EmployeeMapper employeeMapper;
  private final OrganizationMapper organizationMapper;
  private final PositionMapper positionMapper;
  private final CodeGeneratorService codeGeneratorService;
  private final WorkflowEngine workflowEngine;
  private final WorkflowInstanceMapper workflowInstanceMapper;
  private final WorkflowTaskMapper workflowTaskMapper;
  private final EmployeeService employeeService;
  private final EmployeeMovementService movementService;
  private final HeadcountService headcountService;

  public OffboardingService(
      OffboardingCaseMapper caseMapper,
      OffboardingHandoverItemMapper itemMapper,
      EmployeeMapper employeeMapper,
      OrganizationMapper organizationMapper,
      PositionMapper positionMapper,
      CodeGeneratorService codeGeneratorService,
      WorkflowEngine workflowEngine,
      WorkflowInstanceMapper workflowInstanceMapper,
      WorkflowTaskMapper workflowTaskMapper,
      EmployeeService employeeService,
      EmployeeMovementService movementService,
      HeadcountService headcountService
  ) {
    this.caseMapper = caseMapper;
    this.itemMapper = itemMapper;
    this.employeeMapper = employeeMapper;
    this.organizationMapper = organizationMapper;
    this.positionMapper = positionMapper;
    this.codeGeneratorService = codeGeneratorService;
    this.workflowEngine = workflowEngine;
    this.workflowInstanceMapper = workflowInstanceMapper;
    this.workflowTaskMapper = workflowTaskMapper;
    this.employeeService = employeeService;
    this.movementService = movementService;
    this.headcountService = headcountService;
  }

  public PageResult page(String keyword, String status, long page, long pageSize) {
    LambdaQueryWrapper<OffboardingCaseEntity> qw = new LambdaQueryWrapper<OffboardingCaseEntity>()
        .orderByDesc(OffboardingCaseEntity::getId);
    if (status != null && !status.isBlank()) {
      qw.eq(OffboardingCaseEntity::getStatus, status.trim().toUpperCase());
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
        w.like(OffboardingCaseEntity::getCaseNo, k);
        if (!employeeIds.isEmpty()) {
          w.or().in(OffboardingCaseEntity::getEmployeeId, employeeIds);
        }
      });
    }
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    Long total = caseMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    return new PageResult(caseMapper.selectList(qw), total == null ? 0 : total);
  }

  public OffboardingCaseEntity require(long id) {
    OffboardingCaseEntity e = caseMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("离职单不存在");
    return e;
  }

  public List<OffboardingHandoverItemEntity> listItems(long caseId) {
    return itemMapper.selectList(
        new LambdaQueryWrapper<OffboardingHandoverItemEntity>()
            .eq(OffboardingHandoverItemEntity::getCaseId, caseId)
            .orderByAsc(OffboardingHandoverItemEntity::getSortOrder)
            .orderByAsc(OffboardingHandoverItemEntity::getId)
    );
  }

  @Transactional
  public OffboardingCaseEntity create(CreateCommand cmd) {
    if (cmd.employeeId() == null) throw new IllegalArgumentException("员工不能为空");
    if (cmd.lastWorkDay() == null) throw new IllegalArgumentException("最后工作日不能为空");

    EmployeeEntity employee = employeeService.require(cmd.employeeId());
    requireActiveEmployee(employee);
    EmployeeAssignmentEntity assignment = resolveAssignment(cmd.employeeId(), cmd.assignmentId());
    assertNoOpenCase(cmd.employeeId());

    OffboardingCaseEntity entity = new OffboardingCaseEntity();
    entity.setCaseNo(codeGeneratorService.generate("OFFBOARDING_CASE_NO", cmd.lastWorkDay()).code());
    entity.setEmployeeId(cmd.employeeId());
    entity.setAssignmentId(assignment.getId());
    entity.setLastWorkDay(cmd.lastWorkDay());
    entity.setReasonCode(requireValidReason(cmd.reasonCode()));
    entity.setReasonSubCode(blankToNull(cmd.reasonSubCode()));
    entity.setHandoverToEmployeeId(cmd.handoverToEmployeeId());
    entity.setRemark(blankToNull(cmd.remark()));
    entity.setStatus(OffboardingStatus.APPLIED);
    Long userId = currentUserId();
    entity.setCreatedBy(userId);
    entity.setUpdatedBy(userId);
    caseMapper.insert(entity);

    seedDefaultChecklist(entity.getId());
    return require(entity.getId());
  }

  @Transactional
  public OffboardingCaseEntity update(long id, UpdateCommand cmd) {
    OffboardingCaseEntity cur = require(id);
    requireStatus(cur, OffboardingStatus.APPLIED);

    if (cmd.lastWorkDay() != null) cur.setLastWorkDay(cmd.lastWorkDay());
    if (cmd.reasonCode() != null) cur.setReasonCode(requireValidReason(cmd.reasonCode()));
    if (cmd.reasonSubCode() != null) cur.setReasonSubCode(blankToNull(cmd.reasonSubCode()));
    if (cmd.clearHandoverTo()) {
      cur.setHandoverToEmployeeId(null);
    } else if (cmd.handoverToEmployeeId() != null) {
      cur.setHandoverToEmployeeId(cmd.handoverToEmployeeId());
    }
    if (cmd.remark() != null) cur.setRemark(blankToNull(cmd.remark()));

    if (cur.getLastWorkDay() == null) {
      throw new IllegalArgumentException("最后工作日不能为空");
    }
    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public OffboardingCaseEntity submit(long id, Map<String, Long> nodeAssignees) {
    OffboardingCaseEntity cur = require(id);
    requireStatus(cur, OffboardingStatus.APPLIED);

    EmployeeEntity employee = employeeService.require(cur.getEmployeeId());
    requireActiveEmployee(employee);
    EmployeeAssignmentEntity assignment = employeeService.requireAssignment(
        cur.getEmployeeId(), cur.getAssignmentId());
    if (cur.getLastWorkDay() == null) {
      throw new IllegalArgumentException("最后工作日不能为空");
    }

    Map<String, Long> assignees = nodeAssignees == null ? Map.of() : Map.copyOf(nodeAssignees);
    WorkflowInstanceEntity instance = workflowEngine.start(new WorkflowEngine.StartCommand(
        "offboarding",
        "OFFBOARDING",
        String.valueOf(cur.getId()),
        null,
        assignees,
        assignment.getOrganizationId()
    ));

    cur.setWorkflowInstanceId(instance.getId());
    cur.setStatus(OffboardingStatus.APPROVING);
    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public OffboardingCaseEntity cancel(long id) {
    OffboardingCaseEntity cur = require(id);
    if (OffboardingStatus.CANCELLED.equals(cur.getStatus())
        || OffboardingStatus.COMPLETED.equals(cur.getStatus())
        || OffboardingStatus.HANDOVER.equals(cur.getStatus())
        || OffboardingStatus.SETTLING.equals(cur.getStatus())) {
      throw new IllegalArgumentException("当前状态不可取消: " + cur.getStatus());
    }

    if (OffboardingStatus.APPROVING.equals(cur.getStatus()) && cur.getWorkflowInstanceId() != null) {
      workflowEngine.cancelRunningInstance(cur.getWorkflowInstanceId(), "离职单取消");
    }

    cur.setStatus(OffboardingStatus.CANCELLED);
    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public OffboardingCaseEntity addHandoverItem(long caseId, String title) {
    OffboardingCaseEntity cur = require(caseId);
    if (!OffboardingStatus.APPLIED.equals(cur.getStatus())
        && !OffboardingStatus.HANDOVER.equals(cur.getStatus())) {
      throw new IllegalArgumentException("当前状态不可新增交接项: " + cur.getStatus());
    }
    String t = requireTitle(title);
    int nextOrder = listItems(caseId).stream()
        .map(OffboardingHandoverItemEntity::getSortOrder)
        .filter(o -> o != null)
        .mapToInt(Integer::intValue)
        .max()
        .orElse(-1) + 1;

    OffboardingHandoverItemEntity item = new OffboardingHandoverItemEntity();
    item.setCaseId(caseId);
    item.setTitle(t);
    item.setSortOrder(nextOrder);
    item.setDone(false);
    itemMapper.insert(item);

    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);
    return require(caseId);
  }

  @Transactional
  public OffboardingCaseEntity updateHandoverItem(long caseId, long itemId, ItemUpdateCommand cmd) {
    OffboardingCaseEntity cur = require(caseId);
    OffboardingHandoverItemEntity item = requireItem(caseId, itemId);

    if (cmd.title() != null) {
      if (!OffboardingStatus.APPLIED.equals(cur.getStatus())
          && !OffboardingStatus.HANDOVER.equals(cur.getStatus())) {
        throw new IllegalArgumentException("当前状态不可修改交接项标题");
      }
      item.setTitle(requireTitle(cmd.title()));
    }
    if (cmd.assigneeNote() != null) {
      item.setAssigneeNote(blankToNull(cmd.assigneeNote()));
    }
    if (cmd.done() != null) {
      if (!OffboardingStatus.HANDOVER.equals(cur.getStatus())
          && !OffboardingStatus.APPLIED.equals(cur.getStatus())) {
        throw new IllegalArgumentException("当前状态不可勾选交接项");
      }
      boolean done = cmd.done();
      item.setDone(done);
      if (done) {
        item.setDoneAt(LocalDateTime.now());
        item.setDoneBy(currentUserId());
      } else {
        item.setDoneAt(null);
        item.setDoneBy(null);
      }
    }
    itemMapper.updateById(item);
    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);
    return require(caseId);
  }

  @Transactional
  public OffboardingCaseEntity removeHandoverItem(long caseId, long itemId) {
    OffboardingCaseEntity cur = require(caseId);
    requireStatus(cur, OffboardingStatus.APPLIED);
    OffboardingHandoverItemEntity item = requireItem(caseId, itemId);
    itemMapper.deleteById(item.getId());
    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);
    return require(caseId);
  }

  /**
   * 交接完成并生效离职：HANDOVER → SETTLING → COMPLETED，
   * 结束任职、员工 TERMINATED、写 TER 异动、释放编制。
   */
  @Transactional
  public OffboardingCaseEntity complete(long id, String remark) {
    OffboardingCaseEntity cur = require(id);
    requireStatus(cur, OffboardingStatus.HANDOVER);

    List<OffboardingHandoverItemEntity> items = listItems(id);
    if (items.isEmpty()) {
      throw new IllegalArgumentException("交接清单为空，无法完成离职");
    }
    boolean allDone = items.stream().allMatch(i -> Boolean.TRUE.equals(i.getDone()));
    if (!allDone) {
      throw new IllegalArgumentException("请先完成全部交接项");
    }

    cur.setStatus(OffboardingStatus.SETTLING);
    if (remark != null) cur.setRemark(blankToNull(remark));
    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);

    EmployeeEntity employee = employeeService.require(cur.getEmployeeId());
    if ("TERMINATED".equalsIgnoreCase(employee.getStatus())) {
      throw new IllegalStateException("员工已是离职状态");
    }

    EmployeeAssignmentEntity assignment = employeeService.requireAssignment(
        cur.getEmployeeId(), cur.getAssignmentId());

    // 结束任职
    employeeService.updateAssignment(
        cur.getEmployeeId(),
        cur.getAssignmentId(),
        new EmployeeService.AssignmentPatch(null, null, null, null, null, cur.getLastWorkDay())
    );

    // 回写任职离职信息
    EmployeeAssignmentEntity labelPatch = new EmployeeAssignmentEntity();
    labelPatch.setMovementType("TER");
    labelPatch.setReasonCode(cur.getReasonCode());
    labelPatch.setReasonSubCode(cur.getReasonSubCode());
    if (cur.getHandoverToEmployeeId() != null) {
      labelPatch.setHandoverEmployeeId(cur.getHandoverToEmployeeId());
    }
    employeeService.updateAssignmentFromBody(cur.getEmployeeId(), cur.getAssignmentId(), labelPatch);

    employeeService.updateMaster(cur.getEmployeeId(), statusOnlyCommand("TERMINATED"));

    movementService.insert(
        "TER",
        cur.getReasonCode(),
        cur.getReasonSubCode(),
        cur.getLastWorkDay(),
        cur.getEmployeeId(),
        cur.getAssignmentId(),
        cur.getAssignmentId(),
        "offboarding"
    );

    if (assignment.getOrganizationId() != null) {
      int year = cur.getLastWorkDay() != null
          ? cur.getLastWorkDay().getYear()
          : headcountService.defaultFiscalYear();
      headcountService.releaseOccupied(assignment.getOrganizationId(), year, 1);
    }

    cur.setStatus(OffboardingStatus.COMPLETED);
    cur.setUpdatedBy(currentUserId());
    caseMapper.updateById(cur);
    return require(id);
  }

  /** 审批通过：进入交接阶段 */
  @Transactional
  public void onWorkflowCompleted(long caseId) {
    OffboardingCaseEntity cur = require(caseId);
    if (!OffboardingStatus.APPROVING.equals(cur.getStatus())) {
      throw new IllegalStateException("离职单状态不是 APPROVING，无法完成审批回调: " + cur.getStatus());
    }
    cur.setStatus(OffboardingStatus.HANDOVER);
    caseMapper.updateById(cur);
  }

  /** 审批驳回：回退申请中 */
  @Transactional
  public void onWorkflowRejected(long caseId) {
    OffboardingCaseEntity cur = require(caseId);
    if (!OffboardingStatus.APPROVING.equals(cur.getStatus())) {
      return;
    }
    cur.setStatus(OffboardingStatus.APPLIED);
    caseMapper.updateById(cur);
  }

  public List<Map<String, Object>> listApprovalTasks(long caseId) {
    OffboardingCaseEntity cur = require(caseId);
    if (cur.getWorkflowInstanceId() == null) {
      return List.of();
    }
    return workflowEngine.listInstanceTaskDtosInternal(cur.getWorkflowInstanceId());
  }

  public boolean canCurrentUserViewCase(long caseId) {
    AuthUser current = AuthContext.current();
    if (current == null) return false;
    OffboardingCaseEntity cur = require(caseId);
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

  public Map<Long, EmployeeEntity> employeeMap(List<OffboardingCaseEntity> items) {
    List<Long> ids = items.stream().map(OffboardingCaseEntity::getEmployeeId).distinct().toList();
    List<Long> handoverIds = items.stream()
        .map(OffboardingCaseEntity::getHandoverToEmployeeId)
        .filter(id -> id != null)
        .distinct()
        .toList();
    List<Long> all = java.util.stream.Stream.concat(ids.stream(), handoverIds.stream()).distinct().toList();
    if (all.isEmpty()) return Map.of();
    return employeeMapper.selectBatchIds(all).stream()
        .collect(Collectors.toMap(EmployeeEntity::getId, e -> e, (a, b) -> a));
  }

  public Map<Long, EmployeeAssignmentEntity> assignmentMap(List<OffboardingCaseEntity> items) {
    Map<Long, EmployeeAssignmentEntity> result = new HashMap<>();
    for (OffboardingCaseEntity item : items) {
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
      OffboardingCaseEntity e,
      EmployeeEntity employee,
      EmployeeAssignmentEntity assignment,
      OrganizationEntity org,
      PositionEntity pos,
      EmployeeEntity handoverTo,
      List<OffboardingHandoverItemEntity> items
  ) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("caseNo", e.getCaseNo());
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
    dto.put("lastWorkDay", e.getLastWorkDay() == null ? null : e.getLastWorkDay().toString());
    dto.put("reasonCode", e.getReasonCode());
    dto.put("reasonLabel", REASON_LABELS.getOrDefault(e.getReasonCode(), e.getReasonCode()));
    dto.put("reasonSubCode", e.getReasonSubCode());
    dto.put(
        "handoverToEmployeeId",
        e.getHandoverToEmployeeId() == null ? null : String.valueOf(e.getHandoverToEmployeeId())
    );
    dto.put("handoverToEmployeeName", handoverTo == null ? null : handoverTo.getFullName());
    dto.put("status", e.getStatus());
    dto.put(
        "workflowInstanceId",
        e.getWorkflowInstanceId() == null ? null : String.valueOf(e.getWorkflowInstanceId())
    );
    dto.put("remark", e.getRemark());
    dto.put("certificatePlaceholder", true);
    dto.put(
        "items",
        items.stream().map(this::toItemDto).toList()
    );
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toItemDto(OffboardingHandoverItemEntity item) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(item.getId()));
    dto.put("caseId", String.valueOf(item.getCaseId()));
    dto.put("title", item.getTitle());
    dto.put("sortOrder", item.getSortOrder() == null ? 0 : item.getSortOrder());
    dto.put("done", Boolean.TRUE.equals(item.getDone()));
    dto.put("doneAt", item.getDoneAt() == null ? null : item.getDoneAt().toString());
    dto.put("doneBy", item.getDoneBy() == null ? null : String.valueOf(item.getDoneBy()));
    dto.put("assigneeNote", item.getAssigneeNote());
    return dto;
  }

  private void seedDefaultChecklist(long caseId) {
    int order = 0;
    for (String title : DEFAULT_CHECKLIST) {
      OffboardingHandoverItemEntity item = new OffboardingHandoverItemEntity();
      item.setCaseId(caseId);
      item.setTitle(title);
      item.setSortOrder(order++);
      item.setDone(false);
      itemMapper.insert(item);
    }
  }

  private OffboardingHandoverItemEntity requireItem(long caseId, long itemId) {
    OffboardingHandoverItemEntity item = itemMapper.selectById(itemId);
    if (item == null || item.getCaseId() == null || item.getCaseId() != caseId) {
      throw new IllegalArgumentException("交接项不存在");
    }
    return item;
  }

  private EmployeeAssignmentEntity resolveAssignment(long employeeId, Long assignmentId) {
    if (assignmentId != null) {
      return employeeService.requireAssignment(employeeId, assignmentId);
    }
    EmployeeAssignmentEntity primary = employeeService.findCurrentPrimaryAssignment(employeeId);
    if (primary == null) {
      throw new IllegalArgumentException("员工无当前主任职，无法发起离职");
    }
    return primary;
  }

  private void assertNoOpenCase(long employeeId) {
    Long count = caseMapper.selectCount(
        new LambdaQueryWrapper<OffboardingCaseEntity>()
            .eq(OffboardingCaseEntity::getEmployeeId, employeeId)
            .in(OffboardingCaseEntity::getStatus, OPEN_STATUSES)
    );
    if (count != null && count > 0) {
      throw new IllegalArgumentException("该员工已有进行中的离职单");
    }
  }

  private static void requireActiveEmployee(EmployeeEntity employee) {
    String status = employee.getStatus() == null ? "" : employee.getStatus().toUpperCase();
    if ("TERMINATED".equals(status) || "CANDIDATE".equals(status)) {
      throw new IllegalArgumentException("仅在职/试用期员工可发起离职，当前状态: " + employee.getStatus());
    }
  }

  private static String requireValidReason(String code) {
    if (code == null || code.isBlank()) {
      throw new IllegalArgumentException("离职原因不能为空");
    }
    String c = code.trim().toUpperCase();
    if (!REASON_CODES.contains(c)) {
      throw new IllegalArgumentException("无效的离职原因: " + code);
    }
    return c;
  }

  private static String requireTitle(String title) {
    if (title == null || title.isBlank()) {
      throw new IllegalArgumentException("交接项标题不能为空");
    }
    String t = title.trim();
    if (t.length() > 256) {
      throw new IllegalArgumentException("交接项标题过长");
    }
    return t;
  }

  private static EmployeeService.MasterUpdateCommand statusOnlyCommand(String status) {
    return new EmployeeService.MasterUpdateCommand(
        "CURRENT",
        null,
        null, null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null, null, null,
        status
    );
  }

  private void requireStatus(OffboardingCaseEntity e, String expected) {
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

  public record PageResult(List<OffboardingCaseEntity> records, long total) {}

  public record CreateCommand(
      Long employeeId,
      Long assignmentId,
      LocalDate lastWorkDay,
      String reasonCode,
      String reasonSubCode,
      Long handoverToEmployeeId,
      String remark
  ) {}

  public record UpdateCommand(
      LocalDate lastWorkDay,
      String reasonCode,
      String reasonSubCode,
      Long handoverToEmployeeId,
      boolean clearHandoverTo,
      String remark
  ) {}

  public record ItemUpdateCommand(String title, Boolean done, String assigneeNote) {}
}
