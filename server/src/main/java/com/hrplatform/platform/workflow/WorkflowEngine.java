package com.hrplatform.platform.workflow;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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

  public WorkflowEngine(
      WorkflowDefinitionMapper definitionMapper,
      WorkflowInstanceMapper instanceMapper,
      WorkflowTaskMapper taskMapper,
      WorkflowAssigneeResolver assigneeResolver,
      WorkflowCallbackDispatcher callbackDispatcher,
      SysUserMapper sysUserMapper,
      RbacService rbacService
  ) {
    this.definitionMapper = definitionMapper;
    this.instanceMapper = instanceMapper;
    this.taskMapper = taskMapper;
    this.assigneeResolver = assigneeResolver;
    this.callbackDispatcher = callbackDispatcher;
    this.sysUserMapper = sysUserMapper;
    this.rbacService = rbacService;
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
    instance.setContextJson(serializeNodeAssignees(cmd.nodeAssignees()));
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
    long assigneeId = assigneeResolver.resolve(
        node,
        instance.getInitiatorUserId(),
        deserializeNodeAssignees(instance.getContextJson())
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

  private String serializeNodeAssignees(Map<String, Long> nodeAssignees) {
    try {
      return MAPPER.writeValueAsString(nodeAssignees == null ? Map.of() : nodeAssignees);
    } catch (Exception e) {
      return "{}";
    }
  }

  private Map<String, Long> deserializeNodeAssignees(String json) {
    if (json == null || json.isBlank()) return Map.of();
    try {
      Map<String, Object> raw = MAPPER.readValue(json, new TypeReference<>() {});
      Map<String, Long> result = new HashMap<>();
      raw.forEach((k, v) -> {
        if (v == null) return;
        if (v instanceof Number n) {
          result.put(k, n.longValue());
        } else {
          String s = String.valueOf(v);
          if (!s.isBlank()) result.put(k, Long.parseLong(s));
        }
      });
      return result;
    } catch (Exception e) {
      return Map.of();
    }
  }

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

  public Map<String, Object> pageTodo(long page, long pageSize) {
    rbacService.requirePermission("workflow:task:view");
    AuthUser current = AuthContext.current();
    if (current == null) throw new IllegalArgumentException("未登录");

    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    long offset = (p - 1) * ps;
    Long total = taskMapper.countTodoByAssignee(current.id());
    List<WorkflowTaskEntity> items = taskMapper.selectTodoPage(current.id(), offset, ps);

    Map<String, Object> result = new HashMap<>();
    result.put("items", items.stream().map(this::toTaskDto).toList());
    result.put("total", total == null ? 0 : total);
    result.put("page", p);
    result.put("pageSize", ps);
    return result;
  }

  public Map<String, Object> pageDone(long page, long pageSize) {
    rbacService.requirePermission("workflow:task:view");
    AuthUser current = AuthContext.current();
    if (current == null) throw new IllegalArgumentException("未登录");

    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    long offset = (p - 1) * ps;
    Long total = taskMapper.countDoneByAssignee(current.id());
    List<WorkflowTaskEntity> items = taskMapper.selectDonePage(current.id(), offset, ps);

    Map<String, Object> result = new HashMap<>();
    result.put("items", items.stream().map(this::toTaskDto).toList());
    result.put("total", total == null ? 0 : total);
    result.put("page", p);
    result.put("pageSize", ps);
    return result;
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
    dto.put("initiatorUsername", initiator == null ? null : initiator.getUsername());
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
      SysUserEntity initiator = sysUserMapper.selectById(instance.getInitiatorUserId());
      dto.put("initiatorUsername", initiator == null ? null : initiator.getUsername());
    }

    SysUserEntity assignee = sysUserMapper.selectById(task.getAssigneeUserId());
    dto.put("assigneeUsername", assignee == null ? null : assignee.getUsername());
    return dto;
  }

  public record StartCommand(
      String definitionCode,
      String businessType,
      String businessId,
      Long initiatorUserId,
      Map<String, Long> nodeAssignees
  ) {}
}
