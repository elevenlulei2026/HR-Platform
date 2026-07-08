package com.hrplatform.platform.parentchild;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ParentChildCatalogService {
  private final ParentChildTypeMapper typeMapper;
  private final ParentChildItemMapper itemMapper;
  private final ParentChildCatalogCache cache;

  public ParentChildCatalogService(
      ParentChildTypeMapper typeMapper,
      ParentChildItemMapper itemMapper,
      ParentChildCatalogCache cache
  ) {
    this.typeMapper = typeMapper;
    this.itemMapper = itemMapper;
    this.cache = cache;
  }

  public List<ParentChildTypeEntity> listTypes() {
    return typeMapper.selectList(
        new LambdaQueryWrapper<ParentChildTypeEntity>()
            .orderByAsc(ParentChildTypeEntity::getSort)
            .orderByAsc(ParentChildTypeEntity::getCode)
    );
  }

  public ParentChildTypeEntity requireType(long id) {
    ParentChildTypeEntity e = typeMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("父子值类型不存在");
    return e;
  }

  public ParentChildTypeEntity requireTypeByCode(String code) {
    String c = normalize(code);
    ParentChildTypeEntity e = typeMapper.selectOne(
        new LambdaQueryWrapper<ParentChildTypeEntity>().eq(ParentChildTypeEntity::getCode, c)
    );
    if (e == null) throw new IllegalArgumentException("父子值类型不存在: " + c);
    return e;
  }

  @Transactional
  public ParentChildTypeEntity createType(ParentChildTypeEntity entity) {
    entity.setCode(normalize(entity.getCode()));
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    if (entity.getSort() == null) entity.setSort(0);
    ensureUniqueTypeCode(entity.getCode(), null);
    typeMapper.insert(entity);
    return requireType(entity.getId());
  }

  @Transactional
  public ParentChildTypeEntity updateType(long id, ParentChildTypeEntity patch) {
    ParentChildTypeEntity cur = requireType(id);
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getDescription() != null) cur.setDescription(patch.getDescription());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    if (patch.getSort() != null) cur.setSort(patch.getSort());
    typeMapper.updateById(cur);
    cache.invalidate(cur.getCode());
    return requireType(id);
  }

  public List<ParentChildItemEntity> listParents(String typeCode) {
    String tc = normalize(typeCode);
    return itemMapper.selectList(
        new LambdaQueryWrapper<ParentChildItemEntity>()
            .eq(ParentChildItemEntity::getTypeCode, tc)
            .eq(ParentChildItemEntity::getParentCode, "")
            .orderByAsc(ParentChildItemEntity::getSort)
            .orderByAsc(ParentChildItemEntity::getCode)
    );
  }

  public List<ParentChildItemEntity> listChildren(String typeCode, String parentCode) {
    String tc = normalize(typeCode);
    String pc = normalize(parentCode);
    return itemMapper.selectList(
        new LambdaQueryWrapper<ParentChildItemEntity>()
            .eq(ParentChildItemEntity::getTypeCode, tc)
            .eq(ParentChildItemEntity::getParentCode, pc)
            .orderByAsc(ParentChildItemEntity::getSort)
            .orderByAsc(ParentChildItemEntity::getCode)
    );
  }

  public ParentChildItemEntity requireItem(long id) {
    ParentChildItemEntity e = itemMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("父子值项不存在");
    return e;
  }

  @Transactional
  public ParentChildItemEntity createParent(String typeCode, ParentChildItemEntity entity) {
    String tc = normalize(typeCode);
    requireTypeByCode(tc);
    entity.setTypeCode(tc);
    entity.setParentCode("");
    entity.setCode(normalize(entity.getCode()));
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    if (entity.getSort() == null) entity.setSort(0);
    ensureUniqueItemCode(tc, entity.getParentCode(), entity.getCode(), null);
    itemMapper.insert(entity);
    cache.invalidate(tc);
    return requireItem(entity.getId());
  }

  @Transactional
  public ParentChildItemEntity updateParent(long id, ParentChildItemEntity patch) {
    ParentChildItemEntity cur = requireItem(id);
    if (cur.getParentCode() != null && !cur.getParentCode().isBlank()) {
      throw new IllegalArgumentException("该项不是父项，不能用父项接口更新");
    }
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    if (patch.getSort() != null) cur.setSort(patch.getSort());
    if (patch.getRemark() != null) cur.setRemark(patch.getRemark());
    if (patch.getExtJson() != null) cur.setExtJson(patch.getExtJson());
    itemMapper.updateById(cur);
    cache.invalidate(cur.getTypeCode());
    return requireItem(id);
  }

  @Transactional
  public ParentChildItemEntity createChild(String typeCode, String parentCode, ParentChildItemEntity entity) {
    String tc = normalize(typeCode);
    String pc = normalize(parentCode);
    requireTypeByCode(tc);
    requireItemByCode(tc, pc);
    entity.setTypeCode(tc);
    entity.setParentCode(pc);
    entity.setCode(normalize(entity.getCode()));
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    if (entity.getSort() == null) entity.setSort(0);
    ensureUniqueItemCode(tc, entity.getParentCode(), entity.getCode(), null);
    itemMapper.insert(entity);
    cache.invalidate(tc);
    return requireItem(entity.getId());
  }

  @Transactional
  public ParentChildItemEntity updateChild(long id, ParentChildItemEntity patch) {
    ParentChildItemEntity cur = requireItem(id);
    if (cur.getParentCode() == null || cur.getParentCode().isBlank()) {
      throw new IllegalArgumentException("该项不是子项，不能用子项接口更新");
    }
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    if (patch.getSort() != null) cur.setSort(patch.getSort());
    if (patch.getRemark() != null) cur.setRemark(patch.getRemark());
    if (patch.getExtJson() != null) cur.setExtJson(patch.getExtJson());
    itemMapper.updateById(cur);
    cache.invalidate(cur.getTypeCode());
    return requireItem(id);
  }

  @Transactional
  public ParentChildItemEntity updateItemStatus(long id, String status) {
    ParentChildItemEntity cur = requireItem(id);
    cur.setStatus(status);
    itemMapper.updateById(cur);
    cache.invalidate(cur.getTypeCode());
    return requireItem(id);
  }

  public List<ParentChildCatalogCache.CatalogSnapshot> loadSnapshot(String typeCode) {
    String tc = normalize(typeCode);
    List<ParentChildCatalogCache.CatalogSnapshot> cached = cache.get(tc);
    if (cached != null) return cached;

    List<ParentChildItemEntity> parents = listParents(tc);
    List<ParentChildItemEntity> children = itemMapper.selectList(
        new LambdaQueryWrapper<ParentChildItemEntity>()
            .eq(ParentChildItemEntity::getTypeCode, tc)
            .ne(ParentChildItemEntity::getParentCode, "")
    );
    Map<String, List<ParentChildItemEntity>> childrenByParent = children.stream()
        .collect(Collectors.groupingBy(ParentChildItemEntity::getParentCode));

    List<ParentChildCatalogCache.CatalogSnapshot> snapshot = parents.stream()
        .map(p -> new ParentChildCatalogCache.CatalogSnapshot(
            p,
            childrenByParent.getOrDefault(p.getCode(), List.of()).stream()
                .sorted(Comparator.comparing(ParentChildItemEntity::getSort, Comparator.nullsLast(Integer::compareTo))
                    .thenComparing(ParentChildItemEntity::getCode))
                .toList()
        ))
        .toList();

    cache.set(tc, snapshot);
    return snapshot;
  }

  public ParentChildItemEntity requireParentByCode(String typeCode, String parentCode) {
    String tc = normalize(typeCode);
    String pc = normalize(parentCode);
    ParentChildItemEntity e = itemMapper.selectOne(
        new LambdaQueryWrapper<ParentChildItemEntity>()
            .eq(ParentChildItemEntity::getTypeCode, tc)
            .eq(ParentChildItemEntity::getCode, pc)
            .eq(ParentChildItemEntity::getParentCode, "")
    );
    if (e == null) throw new IllegalArgumentException("父项不存在: " + pc);
    return e;
  }

  public ParentChildItemEntity requireItemByCode(String typeCode, String code) {
    String tc = normalize(typeCode);
    String c = normalize(code);
    ParentChildItemEntity e = itemMapper.selectOne(
        new LambdaQueryWrapper<ParentChildItemEntity>()
            .eq(ParentChildItemEntity::getTypeCode, tc)
            .eq(ParentChildItemEntity::getCode, c)
    );
    if (e == null) throw new IllegalArgumentException("父子值项不存在: " + c);
    return e;
  }

  public List<Map<String, Object>> buildTreeRows(String typeCode) {
    String tc = normalize(typeCode);
    List<Map<String, Object>> rows = new ArrayList<>();
    for (ParentChildCatalogCache.CatalogSnapshot snap : loadSnapshot(tc)) {
      ParentChildItemEntity parent = snap.parent();
      if (snap.children().isEmpty()) {
        rows.add(treeRow(parent, null));
        continue;
      }
      for (ParentChildItemEntity child : snap.children()) {
        rows.add(treeRow(parent, child));
      }
    }
    return rows;
  }

  public List<Map<String, Object>> buildActiveOptions(String typeCode) {
    String tc = normalize(typeCode);
    List<Map<String, Object>> options = new ArrayList<>();
    for (ParentChildCatalogCache.CatalogSnapshot snap : loadSnapshot(tc)) {
      ParentChildItemEntity parent = snap.parent();
      if (!"ACTIVE".equals(parent.getStatus())) continue;
      List<Map<String, Object>> childOptions = snap.children().stream()
          .filter(c -> "ACTIVE".equals(c.getStatus()))
          .map(c -> Map.<String, Object>of("code", c.getCode(), "name", c.getName()))
          .toList();
      Map<String, Object> parentOption = new java.util.LinkedHashMap<>();
      parentOption.put("parentCode", parent.getCode());
      parentOption.put("parentName", parent.getName());
      parentOption.put("children", childOptions);
      options.add(parentOption);
    }
    return options;
  }

  public List<Map<String, Object>> buildTreeRows3(String typeCode) {
    String tc = normalize(typeCode);
    List<ParentChildItemEntity> all = itemMapper.selectList(
        new LambdaQueryWrapper<ParentChildItemEntity>()
            .eq(ParentChildItemEntity::getTypeCode, tc)
    );

    Map<String, List<ParentChildItemEntity>> byParent = all.stream()
        .filter(i -> i.getParentCode() != null && !i.getParentCode().isBlank())
        .collect(Collectors.groupingBy(ParentChildItemEntity::getParentCode));

    Comparator<ParentChildItemEntity> cmp = Comparator
        .comparing(ParentChildItemEntity::getSort, Comparator.nullsLast(Integer::compareTo))
        .thenComparing(ParentChildItemEntity::getCode);

    List<ParentChildItemEntity> roots = all.stream()
        .filter(i -> i.getParentCode() == null || i.getParentCode().isBlank())
        .sorted(cmp)
        .toList();

    List<Map<String, Object>> rows = new ArrayList<>();
    for (ParentChildItemEntity lvl1 : roots) {
      List<ParentChildItemEntity> lvl2s = byParent.getOrDefault(lvl1.getCode(), List.of()).stream().sorted(cmp).toList();
      if (lvl2s.isEmpty()) {
        rows.add(treeRow3(tc, lvl1, null, null));
        continue;
      }
      for (ParentChildItemEntity lvl2 : lvl2s) {
        List<ParentChildItemEntity> lvl3s = byParent.getOrDefault(lvl2.getCode(), List.of()).stream().sorted(cmp).toList();
        if (lvl3s.isEmpty()) {
          rows.add(treeRow3(tc, lvl1, lvl2, null));
          continue;
        }
        for (ParentChildItemEntity lvl3 : lvl3s) {
          rows.add(treeRow3(tc, lvl1, lvl2, lvl3));
        }
      }
    }
    return rows;
  }

  public List<Map<String, Object>> buildActiveOptions3(String typeCode) {
    String tc = normalize(typeCode);
    List<ParentChildItemEntity> all = itemMapper.selectList(
        new LambdaQueryWrapper<ParentChildItemEntity>()
            .eq(ParentChildItemEntity::getTypeCode, tc)
    );

    Map<String, List<ParentChildItemEntity>> byParent = all.stream()
        .filter(i -> i.getParentCode() != null && !i.getParentCode().isBlank())
        .collect(Collectors.groupingBy(ParentChildItemEntity::getParentCode));

    Comparator<ParentChildItemEntity> cmp = Comparator
        .comparing(ParentChildItemEntity::getSort, Comparator.nullsLast(Integer::compareTo))
        .thenComparing(ParentChildItemEntity::getCode);

    List<ParentChildItemEntity> roots = all.stream()
        .filter(i -> i.getParentCode() == null || i.getParentCode().isBlank())
        .filter(i -> "ACTIVE".equals(i.getStatus()))
        .sorted(cmp)
        .toList();

    List<Map<String, Object>> options = new ArrayList<>();
    for (ParentChildItemEntity lvl1 : roots) {
      List<ParentChildItemEntity> lvl2s = byParent.getOrDefault(lvl1.getCode(), List.of()).stream()
          .filter(i -> "ACTIVE".equals(i.getStatus()))
          .sorted(cmp)
          .toList();

      List<Map<String, Object>> lvl2Options = new ArrayList<>();
      for (ParentChildItemEntity lvl2 : lvl2s) {
        List<ParentChildItemEntity> lvl3s = byParent.getOrDefault(lvl2.getCode(), List.of()).stream()
            .filter(i -> "ACTIVE".equals(i.getStatus()))
            .sorted(cmp)
            .toList();
        List<Map<String, Object>> lvl3Options = lvl3s.stream()
            .map(i -> Map.<String, Object>of("code", i.getCode(), "name", i.getName()))
            .toList();
        Map<String, Object> lvl2Opt = new java.util.LinkedHashMap<>();
        lvl2Opt.put("code", lvl2.getCode());
        lvl2Opt.put("name", lvl2.getName());
        lvl2Opt.put("children", lvl3Options);
        lvl2Options.add(lvl2Opt);
      }

      Map<String, Object> lvl1Opt = new java.util.LinkedHashMap<>();
      lvl1Opt.put("parentCode", lvl1.getCode());
      lvl1Opt.put("parentName", lvl1.getName());
      lvl1Opt.put("children", lvl2Options);
      lvl1Opt.put("meta", com.hrplatform.platform.auth.Jsons.readMap(lvl1.getExtJson()));
      options.add(lvl1Opt);
    }
    return options;
  }

  private Map<String, Object> treeRow3(
      String typeCode,
      ParentChildItemEntity lvl1,
      ParentChildItemEntity lvl2,
      ParentChildItemEntity lvl3
  ) {
    Map<String, Object> row = new java.util.LinkedHashMap<>();
    row.put("typeCode", typeCode);
    row.put("level1Code", lvl1.getCode());
    row.put("level1Name", lvl1.getName());
    row.put("level1Status", lvl1.getStatus());
    if (lvl2 != null) {
      row.put("level2Code", lvl2.getCode());
      row.put("level2Name", lvl2.getName());
      row.put("level2Status", lvl2.getStatus());
    }
    if (lvl3 != null) {
      row.put("level3Code", lvl3.getCode());
      row.put("level3Name", lvl3.getName());
      row.put("level3Status", lvl3.getStatus());
    }
    return row;
  }

  private Map<String, Object> treeRow(ParentChildItemEntity parent, ParentChildItemEntity child) {
    Map<String, Object> row = new java.util.LinkedHashMap<>();
    row.put("typeCode", parent.getTypeCode());
    row.put("parentCode", parent.getCode());
    row.put("parentName", parent.getName());
    row.put("parentStatus", parent.getStatus());
    if (child != null) {
      row.put("childCode", child.getCode());
      row.put("childName", child.getName());
      row.put("childStatus", child.getStatus());
    }
    return row;
  }

  private void ensureUniqueTypeCode(String code, Long excludeId) {
    ParentChildTypeEntity existing = typeMapper.selectOne(
        new LambdaQueryWrapper<ParentChildTypeEntity>().eq(ParentChildTypeEntity::getCode, code)
    );
    if (existing != null && (excludeId == null || !excludeId.equals(existing.getId()))) {
      throw new IllegalArgumentException("父子值类型编码已存在: " + code);
    }
  }

  private void ensureUniqueItemCode(String typeCode, String parentCode, String code, Long excludeId) {
    ParentChildItemEntity existing = itemMapper.selectOne(
        new LambdaQueryWrapper<ParentChildItemEntity>()
            .eq(ParentChildItemEntity::getTypeCode, typeCode)
            .eq(ParentChildItemEntity::getParentCode, parentCode == null ? "" : parentCode)
            .eq(ParentChildItemEntity::getCode, code)
    );
    if (existing != null && (excludeId == null || !excludeId.equals(existing.getId()))) {
      throw new IllegalArgumentException("编码已存在: " + code);
    }
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}

