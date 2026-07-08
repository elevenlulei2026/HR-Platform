package com.hrplatform.platform.employeegroup;

import com.hrplatform.platform.parentchild.ParentChildCatalogService;
import com.hrplatform.platform.parentchild.ParentChildCatalogCache;
import com.hrplatform.platform.parentchild.ParentChildItemEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class EmployeeGroupCatalogService {
  private final EmployeeGroupCatalogCache cache;
  private final ParentChildCatalogService parentChildCatalogService;

  private static final String TYPE_CODE = "EMPLOYEE_GROUP";

  public EmployeeGroupCatalogService(
      EmployeeGroupCatalogCache cache,
      ParentChildCatalogService parentChildCatalogService
  ) {
    this.cache = cache;
    this.parentChildCatalogService = parentChildCatalogService;
  }

  public List<EmployeeGroupCatalogCache.GroupCatalogSnapshot> loadSnapshot() {
    List<EmployeeGroupCatalogCache.GroupCatalogSnapshot> cached = cache.get();
    if (cached != null) return cached;

    List<ParentChildCatalogCache.CatalogSnapshot> snap = parentChildCatalogService.loadSnapshot(TYPE_CODE);
    List<EmployeeGroupCatalogCache.GroupCatalogSnapshot> snapshot = snap.stream()
        .map(s -> new EmployeeGroupCatalogCache.GroupCatalogSnapshot(
            toGroupEntity(s.parent()),
            s.children().stream().map(c -> toSubgroupEntity(s.parent().getCode(), c)).toList()
        ))
        .toList();

    cache.set(snapshot);
    return snapshot;
  }

  public List<EmployeeGroupEntity> listGroups() {
    return parentChildCatalogService.listParents(TYPE_CODE).stream().map(this::toGroupEntity).toList();
  }

  public EmployeeGroupEntity requireGroup(long id) {
    ParentChildItemEntity item = parentChildCatalogService.requireItem(id);
    if (item.getParentCode() != null && !item.getParentCode().isBlank()) {
      throw new IllegalArgumentException("员工组不存在");
    }
    return toGroupEntity(item);
  }

  public EmployeeGroupEntity requireGroupByCode(String code) {
    ParentChildItemEntity parent = parentChildCatalogService.requireParentByCode(TYPE_CODE, code);
    return toGroupEntity(parent);
  }

  public List<EmployeeSubgroupEntity> listSubgroupsByGroupCode(String employeeGroupCode) {
    return parentChildCatalogService.listChildren(TYPE_CODE, employeeGroupCode).stream()
        .map(c -> toSubgroupEntity(employeeGroupCode, c))
        .toList();
  }

  public EmployeeSubgroupEntity requireSubgroup(long id) {
    ParentChildItemEntity item = parentChildCatalogService.requireItem(id);
    if (item.getParentCode() == null || item.getParentCode().isBlank()) {
      throw new IllegalArgumentException("员工子组不存在");
    }
    return toSubgroupEntity(item.getParentCode(), item);
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
    ParentChildItemEntity item = new ParentChildItemEntity();
    item.setCode(entity.getCode());
    item.setName(entity.getName());
    item.setStatus(entity.getStatus());
    item.setSort(entity.getSort());
    item.setRemark(entity.getRemark());
    ParentChildItemEntity created = parentChildCatalogService.createParent(TYPE_CODE, item);
    cache.invalidate();
    return toGroupEntity(created);
  }

  @Transactional
  public EmployeeGroupEntity updateGroup(long id, EmployeeGroupEntity patch) {
    ParentChildItemEntity itemPatch = new ParentChildItemEntity();
    itemPatch.setName(patch.getName());
    itemPatch.setStatus(patch.getStatus());
    itemPatch.setSort(patch.getSort());
    itemPatch.setRemark(patch.getRemark());
    ParentChildItemEntity updated = parentChildCatalogService.updateParent(id, itemPatch);
    cache.invalidate();
    return toGroupEntity(updated);
  }

  @Transactional
  public EmployeeGroupEntity updateGroupStatus(long id, String status) {
    ParentChildItemEntity updated = parentChildCatalogService.updateItemStatus(id, status);
    cache.invalidate();
    return toGroupEntity(updated);
  }

  @Transactional
  public EmployeeSubgroupEntity createSubgroup(EmployeeSubgroupEntity entity) {
    ParentChildItemEntity item = new ParentChildItemEntity();
    item.setCode(entity.getCode());
    item.setName(entity.getName());
    item.setStatus(entity.getStatus());
    item.setSort(entity.getSort());
    item.setRemark(entity.getRemark());
    ParentChildItemEntity created = parentChildCatalogService.createChild(
        TYPE_CODE,
        entity.getEmployeeGroupCode(),
        item
    );
    cache.invalidate();
    return toSubgroupEntity(entity.getEmployeeGroupCode(), created);
  }

  @Transactional
  public EmployeeSubgroupEntity updateSubgroup(long id, EmployeeSubgroupEntity patch) {
    ParentChildItemEntity itemPatch = new ParentChildItemEntity();
    itemPatch.setName(patch.getName());
    itemPatch.setStatus(patch.getStatus());
    itemPatch.setSort(patch.getSort());
    itemPatch.setRemark(patch.getRemark());
    ParentChildItemEntity updated = parentChildCatalogService.updateChild(id, itemPatch);
    cache.invalidate();
    return toSubgroupEntity(updated.getParentCode(), updated);
  }

  @Transactional
  public EmployeeSubgroupEntity updateSubgroupStatus(long id, String status) {
    ParentChildItemEntity updated = parentChildCatalogService.updateItemStatus(id, status);
    cache.invalidate();
    return toSubgroupEntity(updated.getParentCode(), updated);
  }

  public List<Map<String, Object>> buildTreeRows() {
    return parentChildCatalogService.buildTreeRows(TYPE_CODE).stream()
        .map(row -> {
          Map<String, Object> out = new java.util.LinkedHashMap<>();
          out.put("employeeGroupCode", row.get("parentCode"));
          out.put("employeeGroupName", row.get("parentName"));
          out.put("employeeGroupStatus", row.get("parentStatus"));
          out.put("employeeSubgroupCode", row.get("childCode"));
          out.put("employeeSubgroupName", row.get("childName"));
          out.put("employeeSubgroupStatus", row.get("childStatus"));
          return out;
        })
        .toList();
  }

  public List<Map<String, Object>> buildActiveOptions() {
    return parentChildCatalogService.buildActiveOptions(TYPE_CODE).stream()
        .map(opt -> {
          Map<String, Object> out = new java.util.LinkedHashMap<>();
          out.put("employeeGroupCode", opt.get("parentCode"));
          out.put("employeeGroupName", opt.get("parentName"));
          out.put("subgroups", opt.get("children"));
          return out;
        })
        .toList();
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }

  private EmployeeGroupEntity toGroupEntity(ParentChildItemEntity item) {
    EmployeeGroupEntity e = new EmployeeGroupEntity();
    e.setId(item.getId());
    e.setCode(item.getCode());
    e.setName(item.getName());
    e.setStatus(item.getStatus());
    e.setSort(item.getSort());
    e.setRemark(item.getRemark());
    e.setCreatedAt(item.getCreatedAt());
    e.setUpdatedAt(item.getUpdatedAt());
    return e;
  }

  private EmployeeSubgroupEntity toSubgroupEntity(String groupCode, ParentChildItemEntity item) {
    EmployeeSubgroupEntity e = new EmployeeSubgroupEntity();
    e.setId(item.getId());
    e.setEmployeeGroupCode(groupCode);
    e.setCode(item.getCode());
    e.setName(item.getName());
    e.setStatus(item.getStatus());
    e.setSort(item.getSort());
    e.setRemark(item.getRemark());
    e.setCreatedAt(item.getCreatedAt());
    e.setUpdatedAt(item.getUpdatedAt());
    return e;
  }

  public record ResolvedEmployeeGroup(
      EmployeeGroupEntity group,
      EmployeeSubgroupEntity subgroup
  ) {}
}
