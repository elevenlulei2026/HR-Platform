package com.hrplatform.platform.employeegroup;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class EmployeeGroupCatalogService {
  private final EmployeeGroupMapper groupMapper;
  private final EmployeeSubgroupMapper subgroupMapper;
  private final EmployeeGroupCatalogCache cache;

  public EmployeeGroupCatalogService(
      EmployeeGroupMapper groupMapper,
      EmployeeSubgroupMapper subgroupMapper,
      EmployeeGroupCatalogCache cache
  ) {
    this.groupMapper = groupMapper;
    this.subgroupMapper = subgroupMapper;
    this.cache = cache;
  }

  public List<EmployeeGroupCatalogCache.GroupCatalogSnapshot> loadSnapshot() {
    List<EmployeeGroupCatalogCache.GroupCatalogSnapshot> cached = cache.get();
    if (cached != null) return cached;

    List<EmployeeGroupEntity> groups = groupMapper.selectList(
        new LambdaQueryWrapper<EmployeeGroupEntity>()
            .orderByAsc(EmployeeGroupEntity::getSort)
            .orderByAsc(EmployeeGroupEntity::getCode)
    );
    List<EmployeeSubgroupEntity> subgroups = subgroupMapper.selectList(
        new LambdaQueryWrapper<EmployeeSubgroupEntity>()
            .orderByAsc(EmployeeSubgroupEntity::getSort)
            .orderByAsc(EmployeeSubgroupEntity::getCode)
    );

    Map<String, List<EmployeeSubgroupEntity>> subgroupsByGroup = subgroups.stream()
        .collect(Collectors.groupingBy(EmployeeSubgroupEntity::getEmployeeGroupCode));

    List<EmployeeGroupCatalogCache.GroupCatalogSnapshot> snapshot = groups.stream()
        .map(group -> new EmployeeGroupCatalogCache.GroupCatalogSnapshot(
            group,
            subgroupsByGroup.getOrDefault(group.getCode(), List.of()).stream()
                .sorted(Comparator.comparing(EmployeeSubgroupEntity::getSort, Comparator.nullsLast(Integer::compareTo))
                    .thenComparing(EmployeeSubgroupEntity::getCode))
                .toList()
        ))
        .toList();

    cache.set(snapshot);
    return snapshot;
  }

  public List<EmployeeGroupEntity> listGroups() {
    return groupMapper.selectList(
        new LambdaQueryWrapper<EmployeeGroupEntity>()
            .orderByAsc(EmployeeGroupEntity::getSort)
            .orderByAsc(EmployeeGroupEntity::getCode)
    );
  }

  public EmployeeGroupEntity requireGroup(long id) {
    EmployeeGroupEntity entity = groupMapper.selectById(id);
    if (entity == null) throw new IllegalArgumentException("员工组不存在");
    return entity;
  }

  public EmployeeGroupEntity requireGroupByCode(String code) {
    String c = normalize(code);
    EmployeeGroupEntity entity = groupMapper.selectOne(
        new LambdaQueryWrapper<EmployeeGroupEntity>().eq(EmployeeGroupEntity::getCode, c)
    );
    if (entity == null) throw new IllegalArgumentException("员工组不存在: " + c);
    return entity;
  }

  public List<EmployeeSubgroupEntity> listSubgroupsByGroupCode(String employeeGroupCode) {
    return subgroupMapper.selectList(
        new LambdaQueryWrapper<EmployeeSubgroupEntity>()
            .eq(EmployeeSubgroupEntity::getEmployeeGroupCode, normalize(employeeGroupCode))
            .orderByAsc(EmployeeSubgroupEntity::getSort)
            .orderByAsc(EmployeeSubgroupEntity::getCode)
    );
  }

  public EmployeeSubgroupEntity requireSubgroup(long id) {
    EmployeeSubgroupEntity entity = subgroupMapper.selectById(id);
    if (entity == null) throw new IllegalArgumentException("员工子组不存在");
    return entity;
  }

  public ResolvedEmployeeGroup resolve(String groupCode, String subgroupCode, boolean activeOnly) {
    String gc = normalize(groupCode);
    String sc = normalize(subgroupCode);
    List<EmployeeGroupCatalogCache.GroupCatalogSnapshot> snapshot = loadSnapshot();

    EmployeeGroupEntity group = snapshot.stream()
        .map(EmployeeGroupCatalogCache.GroupCatalogSnapshot::group)
        .filter(g -> gc.equals(g.getCode()))
        .findFirst()
        .orElse(null);
    if (group == null) throw new IllegalArgumentException("无效的员工组: " + gc);
    if (activeOnly && !"ACTIVE".equals(group.getStatus())) {
      throw new IllegalArgumentException("员工组已停用: " + gc);
    }

    EmployeeSubgroupEntity subgroup = snapshot.stream()
        .filter(s -> gc.equals(s.group().getCode()))
        .flatMap(s -> s.subgroups().stream())
        .filter(sub -> sc.equals(sub.getCode()))
        .findFirst()
        .orElse(null);
    if (subgroup == null) throw new IllegalArgumentException("无效的员工子组: " + sc);
    if (activeOnly && !"ACTIVE".equals(subgroup.getStatus())) {
      throw new IllegalArgumentException("员工子组已停用: " + sc);
    }

    return new ResolvedEmployeeGroup(group, subgroup);
  }

  @Transactional
  public EmployeeGroupEntity createGroup(EmployeeGroupEntity entity) {
    entity.setCode(normalize(entity.getCode()));
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    if (entity.getSort() == null) entity.setSort(0);
    ensureUniqueGroupCode(entity.getCode(), null);
    groupMapper.insert(entity);
    cache.invalidate();
    return requireGroup(entity.getId());
  }

  @Transactional
  public EmployeeGroupEntity updateGroup(long id, EmployeeGroupEntity patch) {
    EmployeeGroupEntity cur = requireGroup(id);
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    if (patch.getSort() != null) cur.setSort(patch.getSort());
    if (patch.getRemark() != null) cur.setRemark(patch.getRemark());
    groupMapper.updateById(cur);
    cache.invalidate();
    return requireGroup(id);
  }

  @Transactional
  public EmployeeGroupEntity updateGroupStatus(long id, String status) {
    EmployeeGroupEntity cur = requireGroup(id);
    cur.setStatus(status);
    groupMapper.updateById(cur);
    cache.invalidate();
    return requireGroup(id);
  }

  @Transactional
  public EmployeeSubgroupEntity createSubgroup(EmployeeSubgroupEntity entity) {
    entity.setEmployeeGroupCode(normalize(entity.getEmployeeGroupCode()));
    entity.setCode(normalize(entity.getCode()));
    requireGroupByCode(entity.getEmployeeGroupCode());
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    if (entity.getSort() == null) entity.setSort(0);
    ensureUniqueSubgroupCode(entity.getEmployeeGroupCode(), entity.getCode(), null);
    subgroupMapper.insert(entity);
    cache.invalidate();
    return requireSubgroup(entity.getId());
  }

  @Transactional
  public EmployeeSubgroupEntity updateSubgroup(long id, EmployeeSubgroupEntity patch) {
    EmployeeSubgroupEntity cur = requireSubgroup(id);
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    if (patch.getSort() != null) cur.setSort(patch.getSort());
    if (patch.getRemark() != null) cur.setRemark(patch.getRemark());
    subgroupMapper.updateById(cur);
    cache.invalidate();
    return requireSubgroup(id);
  }

  @Transactional
  public EmployeeSubgroupEntity updateSubgroupStatus(long id, String status) {
    EmployeeSubgroupEntity cur = requireSubgroup(id);
    cur.setStatus(status);
    subgroupMapper.updateById(cur);
    cache.invalidate();
    return requireSubgroup(id);
  }

  public List<Map<String, Object>> buildTreeRows() {
    List<Map<String, Object>> rows = new ArrayList<>();
    for (EmployeeGroupCatalogCache.GroupCatalogSnapshot snap : loadSnapshot()) {
      EmployeeGroupEntity group = snap.group();
      if (snap.subgroups().isEmpty()) {
        rows.add(treeRow(group, null));
        continue;
      }
      for (EmployeeSubgroupEntity sub : snap.subgroups()) {
        rows.add(treeRow(group, sub));
      }
    }
    return rows;
  }

  public List<Map<String, Object>> buildActiveOptions() {
    List<Map<String, Object>> options = new ArrayList<>();
    for (EmployeeGroupCatalogCache.GroupCatalogSnapshot snap : loadSnapshot()) {
      EmployeeGroupEntity group = snap.group();
      if (!"ACTIVE".equals(group.getStatus())) continue;

      List<Map<String, Object>> subgroupOptions = snap.subgroups().stream()
          .filter(sub -> "ACTIVE".equals(sub.getStatus()))
          .map(sub -> Map.<String, Object>of("code", sub.getCode(), "name", sub.getName()))
          .toList();

      Map<String, Object> groupOption = new java.util.LinkedHashMap<>();
      groupOption.put("employeeGroupCode", group.getCode());
      groupOption.put("employeeGroupName", group.getName());
      groupOption.put("subgroups", subgroupOptions);
      options.add(groupOption);
    }
    return options;
  }

  private Map<String, Object> treeRow(EmployeeGroupEntity group, EmployeeSubgroupEntity sub) {
    Map<String, Object> row = new java.util.LinkedHashMap<>();
    row.put("employeeGroupCode", group.getCode());
    row.put("employeeGroupName", group.getName());
    row.put("employeeGroupStatus", group.getStatus());
    if (sub != null) {
      row.put("employeeSubgroupCode", sub.getCode());
      row.put("employeeSubgroupName", sub.getName());
      row.put("employeeSubgroupStatus", sub.getStatus());
    }
    return row;
  }

  private void ensureUniqueGroupCode(String code, Long excludeId) {
    EmployeeGroupEntity existing = groupMapper.selectOne(
        new LambdaQueryWrapper<EmployeeGroupEntity>().eq(EmployeeGroupEntity::getCode, code)
    );
    if (existing != null && (excludeId == null || !excludeId.equals(existing.getId()))) {
      throw new IllegalArgumentException("员工组编码已存在: " + code);
    }
  }

  private void ensureUniqueSubgroupCode(String groupCode, String code, Long excludeId) {
    EmployeeSubgroupEntity existing = subgroupMapper.selectOne(
        new LambdaQueryWrapper<EmployeeSubgroupEntity>()
            .eq(EmployeeSubgroupEntity::getEmployeeGroupCode, groupCode)
            .eq(EmployeeSubgroupEntity::getCode, code)
    );
    if (existing != null && (excludeId == null || !excludeId.equals(existing.getId()))) {
      throw new IllegalArgumentException("员工子组编码已存在: " + code);
    }
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }

  public record ResolvedEmployeeGroup(
      EmployeeGroupEntity group,
      EmployeeSubgroupEntity subgroup
  ) {}
}
