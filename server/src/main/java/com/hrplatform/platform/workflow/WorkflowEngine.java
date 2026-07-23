package com.hrplatform.platform.workflow;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrplatform.core.employee.EmployeeAccountBindingService;
import com.hrplatform.platform.audit.ForbiddenException;
import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.auth.AuthUser;
import com.hrplatform.platform.auth.SysUserEntity;
import com.hrplatform.platform.auth.SysUserMapper;
import com.hrplatform.platform.rbac.RbacService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class WorkflowEngine {
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final WorkflowDefinitionMapper definitionMapper;
  private final WorkflowInstanceMapper instanceMapper;
  private final WorkflowTaskMapper taskMapper;
  private final WorkflowAssigneeResolver assigneeResolver;
  private final WorkflowCallbackDispatcher callbackDispatcher;
  private final SysUserMapper sysUserMapper;
  private final RbacService rbacService;
  private final EmployeeAccountBindingService accountBindingService;

  public WorkflowEngine(
      WorkflowDefinitionMapper definitionMapper,
      WorkflowInstanceMapper instanceMapper,
      WorkflowTaskMapper taskMapper,
      WorkflowAssigneeResolver assigneeResolver,
      WorkflowCallbackDispatcher callbackDispatcher,
      SysUserMapper sysUserMapper,
      RbacService rbacService,
      EmployeeAccountBindingService accountBindingService
  ) {
    this.definitionMapper = definitionMapper;
    this.instanceMapper = instanceMapper;
    this.taskMapper = taskMapper;
    this.assigneeResolver = assigneeResolver;
    this.callbackDispatcher = callbackDispatcher;
    this.sysUserMapper = sysUserMapper;
    this.rbacService = rbacService;
    this.accountBindingService = accountBindingService;
  }

  @Transactional
  public WorkflowInstanceEntity start(StartCommand cmd) {
    if (cmd.definitionCode() == null || cmd.definitionCode().isBlank()) {
      throw new IllegalArgumentException("definitionCode 不能为空");
    }
    if (cmd.businessType() == null || cmd.businessType().isBlank()) {
      throw new IllegalArgumentException("businessType 不能为空");
    }
    if (cmd.businessId() == null || cmd.businessId().isBlank()) {
      throw new IllegalArgumentException("businessId 不能为空");
    }

    WorkflowDefinitionEntity definition = definitionMapper.selectLatestPublishedByCode(cmd.definitionCode());
    if (definition == null) {
      throw new IllegalArgumentException("未找到已发布的流程定义: " + cmd.definitionCode());
    }

    WorkflowDefinitionModel model = WorkflowDefinitionModel.parse(definition.getDefinitionJson());
    AuthUser current = AuthContext.current();
    if (current == null) {
      throw new IllegalArgumentException("未登录");
    }

    long initiatorUserId = cmd.initiatorUserId() == null ? current.id() : cmd.initiatorUserId();
    SysUserEntity initiator = sysUserMapper.selectById(initiatorUserId);
    if (initiator == null || !"ACTIVE".equals(initiator.getStatus())) {
      throw new IllegalArgumentException("发起人用户不存在或已停用");
    }

    Long runningCount = instanceMapper.selectCount(
        new LambdaQueryWrapper<WorkflowInstanceEntity>()
            .eq(WorkflowInstanceEntity::getBusinessType, cmd.businessType())
            .eq(WorkflowInstanceEntity::getBusinessId, cmd.businessId())
            .eq(WorkflowInstanceEntity::getStatus, WorkflowInstanceStatus.RUNNING)
    );
    if (runningCount != null && runningCount > 0) {
      throw new IllegalArgumentException("该业务单据已有进行中的流程实例");
    }

    WorkflowInstanceEntity instance = new WorkflowInstanceEntity();
    instance.setDefinitionId(definition.getId());
    instance.setDefinitionCode(definition.getCode());
    instance.setDefinitionName(definition.getName());
    instance.setBusinessType(cmd.businessType());
    instance.setBusinessId(cmd.businessId());
    instance.setStatus(WorkflowInstanceStatus.RUNNING);
    instance.setInitiatorUserId(initiatorUserId);
    instance.setCurrentNodeIndex(0);
    instance.setContextJson(serializeContext(cmd.nodeAssignees(), cmd.organizationId()));
    instanceMapper.insert(instance);

    createTaskForNode(instance, model, 0);
    return instanceMapper.selectById(instance.getId());
  }

  @Transactional
  public WorkflowTaskEntity approve(long taskId, String comment) {
    WorkflowTaskEntity task = loadPendingTaskForCurrentUser(taskId);
    WorkflowInstanceEntity instance = loadRunningInstance(task.getInstanceId());
    WorkflowDefinitionEntity definition = definitionMapper.selectById(instance.getDefinitionId());
    WorkflowDefinitionModel model = WorkflowDefinitionModel.parse(definition.getDefinitionJson());

    LocalDateTime now = LocalDateTime.now();
    task.setStatus(WorkflowTaskStatus.APPROVED);
    task.setComment(comment);
    task.setCompletedAt(now);
    taskMapper.updateById(task);

    int nextIndex = instance.getCurrentNodeIndex() + 1;
    if (nextIndex >= model.getNodes().size()) {
      instance.setStatus(WorkflowInstanceStatus.COMPLETED);
      instance.setCurrentNodeIndex(nextIndex);
      instance.setCompletedAt(now);
      instanceMapper.updateById(instance);
      callbackDispatcher.dispatchCompleted(instance);
    } else {
      instance.setCurrentNodeIndex(nextIndex);
      instanceMapper.updateById(instance);
      createTaskForNode(instance, model, nextIndex);
    }

    return taskMapper.selectById(taskId);
  }

  @Transactional
  public WorkflowTaskEntity reject(long taskId, String comment) {
    WorkflowTaskEntity task = loadPendingTaskForCurrentUser(taskId);
    WorkflowInstanceEntity instance = loadRunningInstance(task.getInstanceId());

    LocalDateTime now = LocalDateTime.now();
    task.setStatus(WorkflowTaskStatus.REJECTED);
    task.setComment(comment);
    task.setCompletedAt(now);
    taskMapper.updateById(task);

    instance.setStatus(WorkflowInstanceStatus.REJECTED);
    instance.setCompletedAt(now);
    instanceMapper.updateById(instance);
    callbackDispatcher.dispatchRejected(instance);

    return taskMapper.selectById(taskId);
  }

  /**
   * 业务侧取消进行中的流程（不触发驳回回调，由业务自行回滚状态）。
   */
  @Transactional
  public void cancelRunningInstance(long instanceId, String reason) {
    WorkflowInstanceEntity instance = instanceMapper.selectById(instanceId);
    if (instance == null) {
      throw new IllegalArgumentException("流程实例不存在");
    }
    if (!WorkflowInstanceStatus.RUNNING.equals(instance.getStatus())) {
      throw new IllegalArgumentException("流程实例已结束，无法取消");
    }
    LocalDateTime now = LocalDateTime.now();
    List<WorkflowTaskEntity> pending = taskMapper.selectList(
        new LambdaQueryWrapper<WorkflowTaskEntity>()
            .eq(WorkflowTaskEntity::getInstanceId, instanceId)
            .eq(WorkflowTaskEntity::getStatus, WorkflowTaskStatus.PENDING)
    );
    for (WorkflowTaskEntity task : pending) {
      task.setStatus(WorkflowTaskStatus.REJECTED);
      task.setComment(reason == null || reason.isBlank() ? "业务取消" : reason.trim());
      task.setCompletedAt(now);
      taskMapper.updateById(task);
    }
    instance.setStatus(WorkflowInstanceStatus.CANCELLED);
    instance.setCompletedAt(now);
    instanceMapper.updateById(instance);
  }

  private void createTaskForNode(
      WorkflowInstanceEntity instance,
      WorkflowDefinitionModel model,
      int nodeIndex
  ) {
    WorkflowDefinitionModel.WorkflowNodeModel node = model.getNodes().get(nodeIndex);
    InstanceContext ctx = deserializeContext(instance.getContextJson());
    long assigneeId = assigneeResolver.resolve(
        node,
        new WorkflowAssigneeResolveContext(
            instance.getInitiatorUserId(),
            ctx.nodeAssignees(),
            ctx.organizationId()
        )
    );

    WorkflowTaskEntity task = new WorkflowTaskEntity();
    task.setInstanceId(instance.getId());
    task.setNodeKey(node.getKey());
    task.setNodeName(node.getName());
    task.setAssigneeUserId(assigneeId);
    task.setStatus(WorkflowTaskStatus.PENDING);
    taskMapper.insert(task);

    instance.setCurrentNodeIndex(nodeIndex);
    instanceMapper.updateById(instance);
  }

  private String serializeContext(Map<String, Long> nodeAssignees, Long organizationId) {
    try {
      Map<String, Object> payload = new HashMap<>();
      payload.put("nodeAssignees", nodeAssignees == null ? Map.of() : nodeAssignees);
      if (organizationId != null) {
        payload.put("organizationId", organizationId);
      }
      return MAPPER.writeValueAsString(payload);
    } catch (Exception e) {
      return "{\"nodeAssignees\":{}}";
    }
  }

  private InstanceContext deserializeContext(String json) {
    if (json == null || json.isBlank()) {
      return new InstanceContext(Map.of(), null);
    }
    try {
      Map<String, Object> raw = MAPPER.readValue(json, new TypeReference<>() {});
      if (raw.containsKey("nodeAssignees") || raw.containsKey("organizationId")) {
        Map<String, Long> assignees = parseIdMap(raw.get("nodeAssignees"));
        Long orgId = parseLong(raw.get("organizationId"));
        return new InstanceContext(assignees, orgId);
      }
      // 兼容旧版：整段 JSON 即为 nodeAssignees
      return new InstanceContext(parseIdMap(raw), null);
    } catch (Exception e) {
      return new InstanceContext(Map.of(), null);
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Long> parseIdMap(Object value) {
    if (!(value instanceof Map<?, ?> map)) return Map.of();
    Map<String, Long> result = new HashMap<>();
    map.forEach((k, v) -> {
      if (k == null || v == null) return;
      Long id = parseLong(v);
      if (id != null) result.put(String.valueOf(k), id);
    });
    return result;
  }

  private Long parseLong(Object value) {
    if (value == null) return null;
    if (value instanceof Number n) return n.longValue();
    String s = String.valueOf(value).trim();
    if (s.isBlank()) return null;
    return Long.parseLong(s);
  }

  private record InstanceContext(Map<String, Long> nodeAssignees, Long organizationId) {}

  private WorkflowTaskEntity loadPendingTaskForCurrentUser(long taskId) {
    rbacService.requirePermission("workflow:task:view");
    AuthUser current = AuthContext.current();
    if (current == null) {
      throw new IllegalArgumentException("未登录");
    }

    WorkflowTaskEntity task = taskMapper.selectById(taskId);
    if (task == null) {
      throw new IllegalArgumentException("任务不存在");
    }
    if (!WorkflowTaskStatus.PENDING.equals(task.getStatus())) {
      throw new IllegalArgumentException("任务已处理");
    }
    if (!current.id().equals(task.getAssigneeUserId())) {
      throw new IllegalArgumentException("仅任务处理人可审批");
    }
    return task;
  }

  private WorkflowInstanceEntity loadRunningInstance(long instanceId) {
    WorkflowInstanceEntity instance = instanceMapper.selectById(instanceId);
    if (instance == null) {
      throw new IllegalArgumentException("流程实例不存在");
    }
    if (!WorkflowInstanceStatus.RUNNING.equals(instance.getStatus())) {
      throw new IllegalArgumentException("流程实例已结束");
    }
    return instance;
  }

  public WorkflowInstanceEntity getInstance(long id) {
    WorkflowInstanceEntity instance = instanceMapper.selectById(id);
    if (instance == null) throw new IllegalArgumentException("流程实例不存在");
    requireInstanceAccess(instance);
    return instance;
  }

  public List<WorkflowTaskEntity> listInstanceTasks(long instanceId) {
    WorkflowInstanceEntity instance = instanceMapper.selectById(instanceId);
    if (instance == null) throw new IllegalArgumentException("流程实例不存在");
    requireInstanceAccess(instance);
    return listInstanceTasksInternal(instanceId);
  }

  /** 业务模块在已校验业务权限后拉取审批轨迹（不二次校验 workflow:task:view） */
  public List<Map<String, Object>> listInstanceTaskDtosInternal(long instanceId) {
    return listInstanceTasksInternal(instanceId).stream().map(this::toTaskDto).toList();
  }

  private List<WorkflowTaskEntity> listInstanceTasksInternal(long instanceId) {
    return taskMapper.selectList(
        new LambdaQueryWrapper<WorkflowTaskEntity>()
            .eq(WorkflowTaskEntity::getInstanceId, instanceId)
            .orderByAsc(WorkflowTaskEntity::getId)
    );
  }

  private void requireInstanceAccess(WorkflowInstanceEntity instance) {
    rbacService.requirePermission("workflow:task:view");
    AuthUser current = AuthContext.current();
    if (current == null) throw new IllegalArgumentException("未登录");

    if (getCurrentUserPermissions().contains("workflow:manage")) {
      return;
    }
    if (current.id().equals(instance.getInitiatorUserId())) {
      return;
    }
    Long taskCount = taskMapper.selectCount(
        new LambdaQueryWrapper<WorkflowTaskEntity>()
            .eq(WorkflowTaskEntity::getInstanceId, instance.getId())
            .eq(WorkflowTaskEntity::getAssigneeUserId, current.id())
    );
    if (taskCount != null && taskCount > 0) {
      return;
    }
    throw new ForbiddenException("无权限查看该流程实例");
  }

  private java.util.Set<String> getCurrentUserPermissions() {
    AuthUser u = AuthContext.current();
    if (u == null || u.permissions() == null) return java.util.Set.of();
    return u.permissions();
  }

  public Map<String, Object> pageTodo(String keyword, String businessType, long page, long pageSize) {
    rbacService.requirePermission("workflow:task:view");
    AuthUser current = AuthContext.current();
    if (current == null) throw new IllegalArgumentException("未登录");

    String kw = normalizeKeyword(keyword);
    String bt = normalizeBusinessType(businessType);
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    long offset = (p - 1) * ps;
    Long total = taskMapper.countTodoByAssignee(current.id(), kw, bt);
    List<WorkflowTaskEntity> items = taskMapper.selectTodoPage(current.id(), kw, bt, offset, ps);

    Map<String, Object> result = new HashMap<>();
    result.put("items", items.stream().map(this::toTaskDto).toList());
    result.put("total", total == null ? 0 : total);
    result.put("page", p);
    result.put("pageSize", ps);
    return result;
  }

  public Map<String, Object> pageDone(String keyword, String businessType, long page, long pageSize) {
    rbacService.requirePermission("workflow:task:view");
    AuthUser current = AuthContext.current();
    if (current == null) throw new IllegalArgumentException("未登录");

    String kw = normalizeKeyword(keyword);
    String bt = normalizeBusinessType(businessType);
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    long offset = (p - 1) * ps;
    Long total = taskMapper.countDoneByAssignee(current.id(), kw, bt);
    List<WorkflowTaskEntity> items = taskMapper.selectDonePage(current.id(), kw, bt, offset, ps);

    Map<String, Object> result = new HashMap<>();
    result.put("items", items.stream().map(this::toTaskDto).toList());
    result.put("total", total == null ? 0 : total);
    result.put("page", p);
    result.put("pageSize", ps);
    return result;
  }

  private static String normalizeKeyword(String keyword) {
    if (keyword == null) return null;
    String kw = keyword.trim();
    return kw.isEmpty() ? null : kw;
  }

  private static String normalizeBusinessType(String businessType) {
    if (businessType == null) return null;
    String bt = businessType.trim();
    return bt.isEmpty() ? null : bt;
  }

  public Map<String, Object> toInstanceDto(WorkflowInstanceEntity instance) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(instance.getId()));
    dto.put("definitionId", String.valueOf(instance.getDefinitionId()));
    dto.put("definitionCode", instance.getDefinitionCode());
    dto.put("definitionName", instance.getDefinitionName());
    dto.put("businessType", instance.getBusinessType());
    dto.put("businessId", instance.getBusinessId());
    dto.put("status", instance.getStatus());
    dto.put("initiatorUserId", String.valueOf(instance.getInitiatorUserId()));
    dto.put("currentNodeIndex", instance.getCurrentNodeIndex());
    dto.put("createdAt", instance.getCreatedAt() == null ? null : instance.getCreatedAt().toString());
    dto.put("updatedAt", instance.getUpdatedAt() == null ? null : instance.getUpdatedAt().toString());
    dto.put("completedAt", instance.getCompletedAt() == null ? null : instance.getCompletedAt().toString());

    SysUserEntity initiator = sysUserMapper.selectById(instance.getInitiatorUserId());
    accountBindingService.putPersonFields(dto, "initiator", initiator);
    return dto;
  }

  public Map<String, Object> toTaskDto(WorkflowTaskEntity task) {
    WorkflowInstanceEntity instance = instanceMapper.selectById(task.getInstanceId());
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(task.getId()));
    dto.put("instanceId", String.valueOf(task.getInstanceId()));
    dto.put("nodeKey", task.getNodeKey());
    dto.put("nodeName", task.getNodeName());
    dto.put("assigneeUserId", String.valueOf(task.getAssigneeUserId()));
    dto.put("status", task.getStatus());
    dto.put("comment", task.getComment());
    dto.put("createdAt", task.getCreatedAt() == null ? null : task.getCreatedAt().toString());
    dto.put("completedAt", task.getCompletedAt() == null ? null : task.getCompletedAt().toString());

    if (instance != null) {
      dto.put("businessType", instance.getBusinessType());
      dto.put("businessId", instance.getBusinessId());
      dto.put("definitionCode", instance.getDefinitionCode());
      dto.put("definitionName", instance.getDefinitionName());
      dto.put("instanceStatus", instance.getStatus());
      SysUserEntity initiator = sysUserMapper.selectById(instance.getInitiatorUserId());
      accountBindingService.putPersonFields(dto, "initiator", initiator);
    }

    SysUserEntity assignee = sysUserMapper.selectById(task.getAssigneeUserId());
    accountBindingService.putPersonFields(dto, "assignee", assignee);
    return dto;
  }

  public record StartCommand(
      String definitionCode,
      String businessType,
      String businessId,
      Long initiatorUserId,
      Map<String, Long> nodeAssignees,
      Long organizationId
  ) {
    public StartCommand(
        String definitionCode,
        String businessType,
        String businessId,
        Long initiatorUserId,
        Map<String, Long> nodeAssignees
    ) {
      this(definitionCode, businessType, businessId, initiatorUserId, nodeAssignees, null);
    }
  }
}
