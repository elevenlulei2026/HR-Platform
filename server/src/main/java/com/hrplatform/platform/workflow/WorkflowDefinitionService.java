package com.hrplatform.platform.workflow;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class WorkflowDefinitionService {
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private final WorkflowDefinitionMapper definitionMapper;
  private final RbacService rbacService;
  private final SysUserMapper sysUserMapper;

  public WorkflowDefinitionService(
      WorkflowDefinitionMapper definitionMapper,
      RbacService rbacService,
      SysUserMapper sysUserMapper
  ) {
    this.definitionMapper = definitionMapper;
    this.rbacService = rbacService;
    this.sysUserMapper = sysUserMapper;
  }

  public Map<String, Object> page(String keyword, String status, long page, long pageSize) {
    rbacService.requirePermission("workflow:manage");

    LambdaQueryWrapper<WorkflowDefinitionEntity> qw = new LambdaQueryWrapper<WorkflowDefinitionEntity>()
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

    WorkflowDefinitionModel model = WorkflowDefinitionModel.fromMap(definitionJson);
    String json = WorkflowDefinitionModel.toJson(model);

    WorkflowDefinitionEntity e = new WorkflowDefinitionEntity();
    e.setCode(code.trim());
    e.setName(name.trim());
    e.setDescription(description);
    e.setVersion(1);
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

    WorkflowDefinitionEntity latestPublished = definitionMapper.selectLatestPublishedByCode(cur.getCode());
    int nextVersion = latestPublished == null ? cur.getVersion() : latestPublished.getVersion() + 1;
    cur.setVersion(nextVersion);
    cur.setStatus(WorkflowDefinitionStatus.PUBLISHED);
    cur.setPublishedAt(LocalDateTime.now());
    definitionMapper.updateById(cur);
    return definitionMapper.selectById(id);
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

  public List<Map<String, Object>> listAssigneeOptions() {
    rbacService.requirePermission("workflow:manage");
    List<SysUserEntity> users = sysUserMapper.selectList(
        new LambdaQueryWrapper<SysUserEntity>()
            .eq(SysUserEntity::getStatus, "ACTIVE")
            .orderByAsc(SysUserEntity::getUsername)
    );
    return users.stream().map(u -> Map.<String, Object>of(
        "id", String.valueOf(u.getId()),
        "username", u.getUsername()
    )).toList();
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
}
