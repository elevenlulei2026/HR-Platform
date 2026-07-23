package com.hrplatform.platform.workflow;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrplatform.core.employee.EmployeeAccountBindingService;
import com.hrplatform.platform.auth.SysUserEntity;
import com.hrplatform.platform.auth.SysUserMapper;
import com.hrplatform.platform.rbac.RbacService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WorkflowDefinitionService {
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final WorkflowDefinitionMapper definitionMapper;
  private final WorkflowAssigneeResolver assigneeResolver;
  private final RbacService rbacService;
  private final SysUserMapper sysUserMapper;
  private final EmployeeAccountBindingService accountBindingService;

  public WorkflowDefinitionService(
      WorkflowDefinitionMapper definitionMapper,
      WorkflowAssigneeResolver assigneeResolver,
      RbacService rbacService,
      SysUserMapper sysUserMapper,
      EmployeeAccountBindingService accountBindingService
  ) {
    this.definitionMapper = definitionMapper;
    this.assigneeResolver = assigneeResolver;
    this.rbacService = rbacService;
    this.sysUserMapper = sysUserMapper;
    this.accountBindingService = accountBindingService;
  }

  public Map<String, Object> page(String keyword, String status, long page, long pageSize) {
    rbacService.requirePermission("workflow:manage");

    LambdaQueryWrapper<WorkflowDefinitionEntity> qw = new LambdaQueryWrapper<WorkflowDefinitionEntity>()
        .ne(WorkflowDefinitionEntity::getStatus, WorkflowDefinitionStatus.ARCHIVED)
        .orderByDesc(WorkflowDefinitionEntity::getUpdatedAt)
        .orderByDesc(WorkflowDefinitionEntity::getId);

    String kw = keyword == null ? null : keyword.trim();
    if (kw != null && !kw.isBlank()) {
      qw.and(w -> w.like(WorkflowDefinitionEntity::getCode, kw).or().like(WorkflowDefinitionEntity::getName, kw));
    }
    if (status != null && !status.isBlank()) {
      qw.eq(WorkflowDefinitionEntity::getStatus, status);
    }

    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    long offset = (p - 1) * ps;
    Long total = definitionMapper.selectCount(qw);
    qw.last("LIMIT " + offset + ", " + ps);
    List<WorkflowDefinitionEntity> records = definitionMapper.selectList(qw);

    Map<String, Object> pageResult = new HashMap<>();
    pageResult.put("items", records.stream().map(this::toDto).toList());
    pageResult.put("total", total == null ? 0 : total);
    pageResult.put("page", p);
    pageResult.put("pageSize", ps);
    return pageResult;
  }

  @Transactional
  public WorkflowDefinitionEntity create(String code, String name, String description, Map<String, Object> definitionJson) {
    rbacService.requirePermission("workflow:manage");
    if (code == null || code.isBlank()) throw new IllegalArgumentException("code 不能为空");
    if (name == null || name.isBlank()) throw new IllegalArgumentException("name 不能为空");
    if (definitionJson == null || definitionJson.isEmpty()) {
      throw new IllegalArgumentException("definitionJson 不能为空");
    }

    String trimmedCode = code.trim();
    ensureNoDraft(trimmedCode);

    WorkflowDefinitionModel model = WorkflowDefinitionModel.fromMap(definitionJson);
    String json = WorkflowDefinitionModel.toJson(model);

    WorkflowDefinitionEntity e = new WorkflowDefinitionEntity();
    e.setCode(trimmedCode);
    e.setName(name.trim());
    e.setDescription(description);
    e.setVersion(nextVersion(trimmedCode));
    e.setStatus(WorkflowDefinitionStatus.DRAFT);
    e.setDefinitionJson(json);
    definitionMapper.insert(e);
    return definitionMapper.selectById(e.getId());
  }

  @Transactional
  public WorkflowDefinitionEntity update(long id, String name, String description, Map<String, Object> definitionJson) {
    rbacService.requirePermission("workflow:manage");
    WorkflowDefinitionEntity cur = definitionMapper.selectById(id);
    if (cur == null) throw new IllegalArgumentException("流程定义不存在");
    if (!WorkflowDefinitionStatus.DRAFT.equals(cur.getStatus())) {
      throw new IllegalArgumentException("仅草稿状态可编辑");
    }
    if (name != null) cur.setName(name.trim());
    if (description != null) cur.setDescription(description);
    if (definitionJson != null) {
      WorkflowDefinitionModel model = WorkflowDefinitionModel.fromMap(definitionJson);
      cur.setDefinitionJson(WorkflowDefinitionModel.toJson(model));
    }
    definitionMapper.updateById(cur);
    return definitionMapper.selectById(id);
  }

  @Transactional
  public WorkflowDefinitionEntity publish(long id) {
    rbacService.requirePermission("workflow:manage");
    WorkflowDefinitionEntity cur = definitionMapper.selectById(id);
    if (cur == null) throw new IllegalArgumentException("流程定义不存在");
    if (!WorkflowDefinitionStatus.DRAFT.equals(cur.getStatus())) {
      throw new IllegalArgumentException("仅草稿可发布");
    }
    WorkflowDefinitionModel.parse(cur.getDefinitionJson());

    // 同 code 其他已发布版本归档，保证仅一份生效定义
    archivePublishedOfCode(cur.getCode(), cur.getId());

    cur.setStatus(WorkflowDefinitionStatus.PUBLISHED);
    cur.setPublishedAt(LocalDateTime.now());
    definitionMapper.updateById(cur);
    return definitionMapper.selectById(id);
  }

  @Transactional
  public WorkflowDefinitionEntity disable(long id) {
    rbacService.requirePermission("workflow:manage");
    WorkflowDefinitionEntity cur = definitionMapper.selectById(id);
    if (cur == null) throw new IllegalArgumentException("流程定义不存在");
    if (!WorkflowDefinitionStatus.PUBLISHED.equals(cur.getStatus())) {
      throw new IllegalArgumentException("仅已发布流程可停用");
    }
    cur.setStatus(WorkflowDefinitionStatus.DISABLED);
    definitionMapper.updateById(cur);
    return definitionMapper.selectById(id);
  }

  @Transactional
  public WorkflowDefinitionEntity enable(long id) {
    rbacService.requirePermission("workflow:manage");
    WorkflowDefinitionEntity cur = definitionMapper.selectById(id);
    if (cur == null) throw new IllegalArgumentException("流程定义不存在");
    if (!WorkflowDefinitionStatus.DISABLED.equals(cur.getStatus())) {
      throw new IllegalArgumentException("仅已停用流程可启用");
    }
    archivePublishedOfCode(cur.getCode(), cur.getId());
    cur.setStatus(WorkflowDefinitionStatus.PUBLISHED);
    if (cur.getPublishedAt() == null) {
      cur.setPublishedAt(LocalDateTime.now());
    }
    definitionMapper.updateById(cur);
    return definitionMapper.selectById(id);
  }

  @Transactional
  public WorkflowDefinitionEntity revise(long id) {
    rbacService.requirePermission("workflow:manage");
    WorkflowDefinitionEntity source = definitionMapper.selectById(id);
    if (source == null) throw new IllegalArgumentException("流程定义不存在");
    if (!WorkflowDefinitionStatus.PUBLISHED.equals(source.getStatus())
        && !WorkflowDefinitionStatus.DISABLED.equals(source.getStatus())) {
      throw new IllegalArgumentException("仅已发布或已停用流程可修订为新草稿");
    }
    ensureNoDraft(source.getCode());

    WorkflowDefinitionModel.parse(source.getDefinitionJson());
    WorkflowDefinitionEntity draft = new WorkflowDefinitionEntity();
    draft.setCode(source.getCode());
    draft.setName(source.getName());
    draft.setDescription(source.getDescription());
    draft.setVersion(nextVersion(source.getCode()));
    draft.setStatus(WorkflowDefinitionStatus.DRAFT);
    draft.setDefinitionJson(source.getDefinitionJson());
    definitionMapper.insert(draft);
    return definitionMapper.selectById(draft.getId());
  }

  @Transactional
  public void delete(long id) {
    rbacService.requirePermission("workflow:manage");
    WorkflowDefinitionEntity cur = definitionMapper.selectById(id);
    if (cur == null) throw new IllegalArgumentException("流程定义不存在");
    if (!WorkflowDefinitionStatus.DRAFT.equals(cur.getStatus())) {
      throw new IllegalArgumentException("仅草稿可删除");
    }
    cur.setStatus(WorkflowDefinitionStatus.ARCHIVED);
    definitionMapper.updateById(cur);
  }

  public WorkflowDefinitionEntity get(long id) {
    rbacService.requirePermission("workflow:manage");
    WorkflowDefinitionEntity e = definitionMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("流程定义不存在");
    return e;
  }

  public Map<String, Object> previewAssignees(
      long id,
      long initiatorUserId,
      Long organizationId,
      Map<String, Long> nodeAssignees
  ) {
    rbacService.requirePermission("workflow:manage");
    WorkflowDefinitionEntity definition = definitionMapper.selectById(id);
    if (definition == null) throw new IllegalArgumentException("流程定义不存在");

    SysUserEntity initiator = sysUserMapper.selectById(initiatorUserId);
    if (initiator == null || !"ACTIVE".equals(initiator.getStatus())) {
      throw new IllegalArgumentException("发起人用户不存在或已停用");
    }

    WorkflowDefinitionModel model = WorkflowDefinitionModel.parse(definition.getDefinitionJson());
    WorkflowAssigneeResolveContext context = new WorkflowAssigneeResolveContext(
        initiatorUserId,
        nodeAssignees,
        organizationId
    );

    List<Map<String, Object>> items = new ArrayList<>();
    for (WorkflowDefinitionModel.WorkflowNodeModel node : model.getNodes()) {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("nodeKey", node.getKey());
      item.put("nodeName", node.getName());
      item.put("assigneeRule", toRuleDto(node.getAssigneeRule()));
      try {
        long assigneeId = assigneeResolver.resolve(node, context);
        SysUserEntity user = sysUserMapper.selectById(assigneeId);
        item.put("resolvable", true);
        item.put("assigneeUserId", String.valueOf(assigneeId));
        accountBindingService.putPersonFields(item, "assignee", user);
      } catch (IllegalArgumentException ex) {
        item.put("resolvable", false);
        item.put("errorMessage", ex.getMessage());
      }
      items.add(item);
    }
    return Map.of("items", items);
  }

  public List<Map<String, Object>> listAssigneeOptions() {
    rbacService.requirePermission("workflow:manage");
    List<SysUserEntity> users = sysUserMapper.selectList(
        new LambdaQueryWrapper<SysUserEntity>()
            .eq(SysUserEntity::getStatus, "ACTIVE")
            .orderByAsc(SysUserEntity::getUsername)
    );
    return users.stream().map(u -> {
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("id", String.valueOf(u.getId()));
      EmployeeAccountBindingService.UserPersonLabel label = accountBindingService.resolveUserPersonLabel(u);
      m.put("username", label == null ? u.getUsername() : label.username());
      m.put("displayName", label == null ? u.getUsername() : label.displayName());
      m.put("employeeNo", label == null ? null : label.employeeNo());
      return m;
    }).toList();
  }

  public Map<String, Object> toDto(WorkflowDefinitionEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", e.getId() == null ? null : String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("version", e.getVersion());
    dto.put("status", e.getStatus());
    dto.put("description", e.getDescription());
    dto.put("publishedAt", e.getPublishedAt() == null ? null : e.getPublishedAt().toString());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    try {
      dto.put("definitionJson", MAPPER.readValue(e.getDefinitionJson(), new TypeReference<Map<String, Object>>() {}));
    } catch (Exception ex) {
      dto.put("definitionJson", Map.of("nodes", List.of()));
    }
    return dto;
  }

  private void ensureNoDraft(String code) {
    Long draftCount = definitionMapper.selectCount(
        new LambdaQueryWrapper<WorkflowDefinitionEntity>()
            .eq(WorkflowDefinitionEntity::getCode, code)
            .eq(WorkflowDefinitionEntity::getStatus, WorkflowDefinitionStatus.DRAFT)
    );
    if (draftCount != null && draftCount > 0) {
      throw new IllegalArgumentException("流程编码 " + code + " 已有草稿，请先编辑或删除现有草稿");
    }
  }

  private int nextVersion(String code) {
    Integer max = definitionMapper.selectMaxVersionByCode(code);
    return max == null ? 1 : max + 1;
  }

  private void archivePublishedOfCode(String code, long excludeId) {
    List<WorkflowDefinitionEntity> published = definitionMapper.selectList(
        new LambdaQueryWrapper<WorkflowDefinitionEntity>()
            .eq(WorkflowDefinitionEntity::getCode, code)
            .eq(WorkflowDefinitionEntity::getStatus, WorkflowDefinitionStatus.PUBLISHED)
            .ne(WorkflowDefinitionEntity::getId, excludeId)
    );
    for (WorkflowDefinitionEntity row : published) {
      row.setStatus(WorkflowDefinitionStatus.ARCHIVED);
      definitionMapper.updateById(row);
    }
  }

  private Map<String, Object> toRuleDto(WorkflowDefinitionModel.WorkflowAssigneeRuleModel rule) {
    Map<String, Object> dto = new LinkedHashMap<>();
    if (rule == null) return dto;
    dto.put("type", rule.getType());
    if (rule.getRoleCode() != null) dto.put("roleCode", rule.getRoleCode());
    if (rule.getLevel() != null) dto.put("level", rule.getLevel());
    return dto;
  }
}
