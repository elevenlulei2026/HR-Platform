package com.hrplatform.platform.movement;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeMovementEntity;
import com.hrplatform.core.employee.EmployeeMovementMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MovementCatalogService {
  private final MovementTypeMapper typeMapper;
  private final MovementReasonMapper reasonMapper;
  private final MovementReasonSubMapper subMapper;
  private final EmployeeMovementMapper movementMapper;
  private final MovementCatalogCache cache;

  public MovementCatalogService(
      MovementTypeMapper typeMapper,
      MovementReasonMapper reasonMapper,
      MovementReasonSubMapper subMapper,
      EmployeeMovementMapper movementMapper,
      MovementCatalogCache cache
  ) {
    this.typeMapper = typeMapper;
    this.reasonMapper = reasonMapper;
    this.subMapper = subMapper;
    this.movementMapper = movementMapper;
    this.cache = cache;
  }

  public List<MovementCatalogCache.MovementCatalogSnapshot> loadSnapshot() {
    List<MovementCatalogCache.MovementCatalogSnapshot> cached = cache.get();
    if (cached != null) return cached;

    List<MovementTypeEntity> types = typeMapper.selectList(
        new LambdaQueryWrapper<MovementTypeEntity>()
            .orderByAsc(MovementTypeEntity::getSort)
            .orderByAsc(MovementTypeEntity::getCode)
    );
    List<MovementReasonEntity> reasons = reasonMapper.selectList(
        new LambdaQueryWrapper<MovementReasonEntity>()
            .orderByAsc(MovementReasonEntity::getSort)
            .orderByAsc(MovementReasonEntity::getCode)
    );
    List<MovementReasonSubEntity> subs = subMapper.selectList(
        new LambdaQueryWrapper<MovementReasonSubEntity>()
            .orderByAsc(MovementReasonSubEntity::getSort)
            .orderByAsc(MovementReasonSubEntity::getCode)
    );

    Map<Long, List<MovementReasonSubEntity>> subsByReason = subs.stream()
        .collect(Collectors.groupingBy(MovementReasonSubEntity::getReasonId));
    Map<String, List<MovementReasonEntity>> reasonsByType = reasons.stream()
        .collect(Collectors.groupingBy(MovementReasonEntity::getMovementTypeCode));

    List<MovementCatalogCache.MovementCatalogSnapshot> snapshot = types.stream()
        .map(type -> {
          List<MovementCatalogCache.ReasonSnapshot> reasonSnapshots =
              reasonsByType.getOrDefault(type.getCode(), List.of()).stream()
                  .sorted(Comparator.comparing(MovementReasonEntity::getSort, Comparator.nullsLast(Integer::compareTo))
                      .thenComparing(MovementReasonEntity::getCode))
                  .map(reason -> new MovementCatalogCache.ReasonSnapshot(
                      reason,
                      subsByReason.getOrDefault(reason.getId(), List.of()).stream()
                          .sorted(Comparator.comparing(MovementReasonSubEntity::getSort, Comparator.nullsLast(Integer::compareTo))
                              .thenComparing(MovementReasonSubEntity::getCode))
                          .toList()
                  ))
                  .toList();
          return new MovementCatalogCache.MovementCatalogSnapshot(type, reasonSnapshots);
        })
        .toList();

    cache.set(snapshot);
    return snapshot;
  }

  public List<MovementTypeEntity> listTypes() {
    return typeMapper.selectList(
        new LambdaQueryWrapper<MovementTypeEntity>()
            .orderByAsc(MovementTypeEntity::getSort)
            .orderByAsc(MovementTypeEntity::getCode)
    );
  }

  public MovementTypeEntity requireType(long id) {
    MovementTypeEntity entity = typeMapper.selectById(id);
    if (entity == null) throw new IllegalArgumentException("操作码不存在");
    return entity;
  }

  public MovementTypeEntity requireTypeByCode(String code) {
    String c = normalize(code);
    MovementTypeEntity entity = typeMapper.selectOne(
        new LambdaQueryWrapper<MovementTypeEntity>().eq(MovementTypeEntity::getCode, c)
    );
    if (entity == null) throw new IllegalArgumentException("操作码不存在: " + c);
    return entity;
  }

  public List<MovementReasonEntity> listReasonsByTypeCode(String movementTypeCode) {
    return reasonMapper.selectList(
        new LambdaQueryWrapper<MovementReasonEntity>()
            .eq(MovementReasonEntity::getMovementTypeCode, normalize(movementTypeCode))
            .orderByAsc(MovementReasonEntity::getSort)
            .orderByAsc(MovementReasonEntity::getCode)
    );
  }

  public MovementReasonEntity requireReason(long id) {
    MovementReasonEntity entity = reasonMapper.selectById(id);
    if (entity == null) throw new IllegalArgumentException("操作原因不存在");
    return entity;
  }

  public List<MovementReasonSubEntity> listSubsByReasonId(long reasonId) {
    return subMapper.selectList(
        new LambdaQueryWrapper<MovementReasonSubEntity>()
            .eq(MovementReasonSubEntity::getReasonId, reasonId)
            .orderByAsc(MovementReasonSubEntity::getSort)
            .orderByAsc(MovementReasonSubEntity::getCode)
    );
  }

  public MovementReasonSubEntity requireSub(long id) {
    MovementReasonSubEntity entity = subMapper.selectById(id);
    if (entity == null) throw new IllegalArgumentException("原因子项不存在");
    return entity;
  }

  public ResolvedMovement resolve(String movementType, String reasonCode, String reasonSubCode, boolean activeOnly) {
    String typeCode = normalize(movementType);
    String rc = normalize(reasonCode);
    List<MovementCatalogCache.MovementCatalogSnapshot> snapshot = loadSnapshot();

    MovementTypeEntity type = snapshot.stream()
        .map(MovementCatalogCache.MovementCatalogSnapshot::type)
        .filter(t -> typeCode.equals(t.getCode()))
        .findFirst()
        .orElse(null);
    if (type == null) throw new IllegalArgumentException("无效的操作码: " + typeCode);
    if (activeOnly && !"ACTIVE".equals(type.getStatus())) {
      throw new IllegalArgumentException("操作码已停用: " + typeCode);
    }

    MovementReasonEntity reason = snapshot.stream()
        .filter(s -> typeCode.equals(s.type().getCode()))
        .flatMap(s -> s.reasons().stream())
        .map(MovementCatalogCache.ReasonSnapshot::reason)
        .filter(r -> rc.equals(r.getCode()))
        .findFirst()
        .orElse(null);
    if (reason == null) throw new IllegalArgumentException("无效的操作原因: " + rc);
    if (activeOnly && !"ACTIVE".equals(reason.getStatus())) {
      throw new IllegalArgumentException("操作原因已停用: " + rc);
    }

    List<MovementReasonSubEntity> activeSubs = snapshot.stream()
        .filter(s -> typeCode.equals(s.type().getCode()))
        .flatMap(s -> s.reasons().stream())
        .filter(rs -> reason.getId().equals(rs.reason().getId()))
        .flatMap(rs -> rs.subs().stream())
        .filter(sub -> !activeOnly || "ACTIVE".equals(sub.getStatus()))
        .toList();

    MovementReasonSubEntity sub = null;
    if (!activeSubs.isEmpty()) {
      String subCode = normalize(reasonSubCode);
      if (subCode.isBlank()) {
        throw new IllegalArgumentException("操作原因 " + rc + " 必须选择原因子项");
      }
      sub = activeSubs.stream().filter(s -> subCode.equals(s.getCode())).findFirst().orElse(null);
      if (sub == null) throw new IllegalArgumentException("无效的原因子项: " + subCode);
      if (activeOnly && !"ACTIVE".equals(sub.getStatus())) {
        throw new IllegalArgumentException("原因子项已停用: " + subCode);
      }
    } else if (reasonSubCode != null && !reasonSubCode.isBlank()) {
      throw new IllegalArgumentException("操作原因 " + rc + " 不需要原因子项");
    }

    return new ResolvedMovement(type, reason, sub);
  }

  public long countTypeReferences(String code) {
    return movementMapper.selectCount(
        new LambdaQueryWrapper<EmployeeMovementEntity>().eq(EmployeeMovementEntity::getMovementType, code)
    );
  }

  public long countReasonReferences(String movementTypeCode, String reasonCode) {
    return movementMapper.selectCount(
        new LambdaQueryWrapper<EmployeeMovementEntity>()
            .eq(EmployeeMovementEntity::getMovementType, movementTypeCode)
            .eq(EmployeeMovementEntity::getReasonCode, reasonCode)
    );
  }

  public long countSubReferences(String movementTypeCode, String reasonCode, String subCode) {
    return movementMapper.selectCount(
        new LambdaQueryWrapper<EmployeeMovementEntity>()
            .eq(EmployeeMovementEntity::getMovementType, movementTypeCode)
            .eq(EmployeeMovementEntity::getReasonCode, reasonCode)
            .eq(EmployeeMovementEntity::getReasonSubCode, subCode)
    );
  }

  @Transactional
  public MovementTypeEntity createType(MovementTypeEntity entity) {
    entity.setCode(normalize(entity.getCode()));
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    if (entity.getSort() == null) entity.setSort(0);
    ensureUniqueTypeCode(entity.getCode(), null);
    typeMapper.insert(entity);
    cache.invalidate();
    return requireType(entity.getId());
  }

  @Transactional
  public MovementTypeEntity updateType(long id, MovementTypeEntity patch) {
    MovementTypeEntity cur = requireType(id);
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getPhase() != null) cur.setPhase(patch.getPhase());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    if (patch.getSort() != null) cur.setSort(patch.getSort());
    if (patch.getRemark() != null) cur.setRemark(patch.getRemark());
    typeMapper.updateById(cur);
    cache.invalidate();
    return requireType(id);
  }

  @Transactional
  public MovementTypeEntity updateTypeStatus(long id, String status) {
    MovementTypeEntity cur = requireType(id);
    if ("DISABLED".equals(status) && countTypeReferences(cur.getCode()) > 0) {
      cur.setStatus("DISABLED");
    } else {
      cur.setStatus(status);
    }
    typeMapper.updateById(cur);
    cache.invalidate();
    return requireType(id);
  }

  @Transactional
  public MovementReasonEntity createReason(MovementReasonEntity entity) {
    entity.setMovementTypeCode(normalize(entity.getMovementTypeCode()));
    entity.setCode(normalize(entity.getCode()));
    requireTypeByCode(entity.getMovementTypeCode());
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    if (entity.getSort() == null) entity.setSort(0);
    ensureUniqueReasonCode(entity.getMovementTypeCode(), entity.getCode(), null);
    reasonMapper.insert(entity);
    cache.invalidate();
    return requireReason(entity.getId());
  }

  @Transactional
  public MovementReasonEntity updateReason(long id, MovementReasonEntity patch) {
    MovementReasonEntity cur = requireReason(id);
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    if (patch.getSort() != null) cur.setSort(patch.getSort());
    if (patch.getRemark() != null) cur.setRemark(patch.getRemark());
    reasonMapper.updateById(cur);
    cache.invalidate();
    return requireReason(id);
  }

  @Transactional
  public MovementReasonEntity updateReasonStatus(long id, String status) {
    MovementReasonEntity cur = requireReason(id);
    cur.setStatus(status);
    reasonMapper.updateById(cur);
    cache.invalidate();
    return requireReason(id);
  }

  @Transactional
  public MovementReasonSubEntity createSub(MovementReasonSubEntity entity) {
    requireReason(entity.getReasonId());
    entity.setCode(normalize(entity.getCode()));
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    if (entity.getSort() == null) entity.setSort(0);
    ensureUniqueSubCode(entity.getReasonId(), entity.getCode(), null);
    subMapper.insert(entity);
    cache.invalidate();
    return requireSub(entity.getId());
  }

  @Transactional
  public MovementReasonSubEntity updateSub(long id, MovementReasonSubEntity patch) {
    MovementReasonSubEntity cur = requireSub(id);
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    if (patch.getSort() != null) cur.setSort(patch.getSort());
    subMapper.updateById(cur);
    cache.invalidate();
    return requireSub(id);
  }

  @Transactional
  public MovementReasonSubEntity updateSubStatus(long id, String status) {
    MovementReasonSubEntity cur = requireSub(id);
    cur.setStatus(status);
    subMapper.updateById(cur);
    cache.invalidate();
    return requireSub(id);
  }

  public List<Map<String, Object>> buildTreeRows() {
    List<Map<String, Object>> rows = new ArrayList<>();
    for (MovementCatalogCache.MovementCatalogSnapshot snap : loadSnapshot()) {
      MovementTypeEntity type = snap.type();
      if (snap.reasons().isEmpty()) {
        rows.add(treeRow(type, null, null));
        continue;
      }
      for (MovementCatalogCache.ReasonSnapshot reasonSnap : snap.reasons()) {
        MovementReasonEntity reason = reasonSnap.reason();
        if (reasonSnap.subs().isEmpty()) {
          rows.add(treeRow(type, reason, null));
          continue;
        }
        for (MovementReasonSubEntity sub : reasonSnap.subs()) {
          rows.add(treeRow(type, reason, sub));
        }
      }
    }
    return rows;
  }

  public List<Map<String, Object>> buildActiveOptions() {
    List<Map<String, Object>> options = new ArrayList<>();
    for (MovementCatalogCache.MovementCatalogSnapshot snap : loadSnapshot()) {
      MovementTypeEntity type = snap.type();
      if (!"ACTIVE".equals(type.getStatus())) continue;

      List<Map<String, Object>> reasonOptions = new ArrayList<>();
      for (MovementCatalogCache.ReasonSnapshot reasonSnap : snap.reasons()) {
        MovementReasonEntity reason = reasonSnap.reason();
        if (!"ACTIVE".equals(reason.getStatus())) continue;

        List<Map<String, Object>> activeSubs = reasonSnap.subs().stream()
            .filter(sub -> "ACTIVE".equals(sub.getStatus()))
            .map(sub -> Map.<String, Object>of("code", sub.getCode(), "name", sub.getName()))
            .toList();

        Map<String, Object> reasonOption = new java.util.LinkedHashMap<>();
        reasonOption.put("code", reason.getCode());
        reasonOption.put("name", reason.getName());
        reasonOption.put("requiresSub", !activeSubs.isEmpty());
        reasonOption.put("subs", activeSubs);
        reasonOptions.add(reasonOption);
      }

      Map<String, Object> typeOption = new java.util.LinkedHashMap<>();
      typeOption.put("movementType", type.getCode());
      typeOption.put("movementTypeName", type.getName());
      typeOption.put("phase", type.getPhase());
      typeOption.put("reasons", reasonOptions);
      options.add(typeOption);
    }
    return options;
  }

  private Map<String, Object> treeRow(MovementTypeEntity type, MovementReasonEntity reason, MovementReasonSubEntity sub) {
    Map<String, Object> row = new java.util.LinkedHashMap<>();
    row.put("movementTypeCode", type.getCode());
    row.put("movementTypeName", type.getName());
    row.put("movementTypeStatus", type.getStatus());
    if (reason != null) {
      row.put("reasonCode", reason.getCode());
      row.put("reasonName", reason.getName());
      row.put("reasonStatus", reason.getStatus());
    }
    if (sub != null) {
      row.put("reasonSubCode", sub.getCode());
      row.put("reasonSubName", sub.getName());
      row.put("reasonSubStatus", sub.getStatus());
    }
    return row;
  }

  private void ensureUniqueTypeCode(String code, Long excludeId) {
    MovementTypeEntity existing = typeMapper.selectOne(
        new LambdaQueryWrapper<MovementTypeEntity>().eq(MovementTypeEntity::getCode, code)
    );
    if (existing != null && (excludeId == null || !excludeId.equals(existing.getId()))) {
      throw new IllegalArgumentException("操作码已存在: " + code);
    }
  }

  private void ensureUniqueReasonCode(String typeCode, String code, Long excludeId) {
    MovementReasonEntity existing = reasonMapper.selectOne(
        new LambdaQueryWrapper<MovementReasonEntity>()
            .eq(MovementReasonEntity::getMovementTypeCode, typeCode)
            .eq(MovementReasonEntity::getCode, code)
    );
    if (existing != null && (excludeId == null || !excludeId.equals(existing.getId()))) {
      throw new IllegalArgumentException("操作原因已存在: " + code);
    }
  }

  private void ensureUniqueSubCode(long reasonId, String code, Long excludeId) {
    MovementReasonSubEntity existing = subMapper.selectOne(
        new LambdaQueryWrapper<MovementReasonSubEntity>()
            .eq(MovementReasonSubEntity::getReasonId, reasonId)
            .eq(MovementReasonSubEntity::getCode, code)
    );
    if (existing != null && (excludeId == null || !excludeId.equals(existing.getId()))) {
      throw new IllegalArgumentException("原因子项已存在: " + code);
    }
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim().toUpperCase();
  }

  public record ResolvedMovement(
      MovementTypeEntity type,
      MovementReasonEntity reason,
      MovementReasonSubEntity sub
  ) {}
}
