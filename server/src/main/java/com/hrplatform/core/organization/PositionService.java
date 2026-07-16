package com.hrplatform.core.organization;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.platform.code.CodeGeneratorService;
import com.hrplatform.platform.dict.DictItemEntity;
import com.hrplatform.platform.dict.DictService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PositionService {
  private final PositionMapper positionMapper;
  private final OrganizationMapper organizationMapper;
  private final CodeGeneratorService codeGeneratorService;
  private final DictService dictService;

  public PositionService(
      PositionMapper positionMapper,
      OrganizationMapper organizationMapper,
      CodeGeneratorService codeGeneratorService,
      DictService dictService
  ) {
    this.positionMapper = positionMapper;
    this.organizationMapper = organizationMapper;
    this.codeGeneratorService = codeGeneratorService;
    this.dictService = dictService;
  }

  public LegalEntityService.PageResult<PositionEntity> page(
      String keyword,
      Long organizationId,
      LocalDate asOfDate,
      long page,
      long pageSize
  ) {
    List<PositionEntity> filtered = filterSnapshot(keyword, organizationId, asOfDate);
    long total = filtered.size();
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    int from = (int) ((p - 1) * ps);
    if (from >= filtered.size()) {
      return new LegalEntityService.PageResult<>(List.of(), total);
    }
    int to = Math.min(from + (int) ps, filtered.size());
    return new LegalEntityService.PageResult<>(new ArrayList<>(filtered.subList(from, to)), total);
  }

  public List<PositionEntity> listForExport(String keyword, Long organizationId, LocalDate asOfDate) {
    return filterSnapshot(keyword, organizationId, asOfDate);
  }

  /** 按部门汇总直属岗位数（asOfDate 快照，去重后按 organizationId） */
  public Map<Long, Integer> countByOrganization(LocalDate asOfDate) {
    Map<Long, Integer> counts = new HashMap<>();
    for (PositionEntity p : filterSnapshot(null, null, asOfDate)) {
      if (p.getOrganizationId() == null) continue;
      counts.merge(p.getOrganizationId(), 1, Integer::sum);
    }
    return counts;
  }

  /** 指定部门集合下的岗位快照列表（按编码排序） */
  public List<PositionEntity> listSnapshotByOrganizationIds(List<Long> organizationIds, LocalDate asOfDate) {
    if (organizationIds == null || organizationIds.isEmpty()) return List.of();
    Set<Long> idSet = new HashSet<>(organizationIds);
    return filterSnapshot(null, null, asOfDate).stream()
        .filter(p -> p.getOrganizationId() != null && idSet.contains(p.getOrganizationId()))
        .sorted(Comparator.comparing(PositionEntity::getCode, Comparator.nullsLast(String::compareTo)))
        .toList();
  }

  public PositionEntity findLatestVersionByCode(String code) {
    if (code == null || code.isBlank()) return null;
    List<PositionEntity> versions = listVersionsByCode(code.trim());
    if (versions.isEmpty()) return null;
    return versions.stream()
        .max(Comparator.comparing(PositionEntity::getEffectiveStartDate))
        .orElse(null);
  }

  public PositionEntity findByCodeAndEffectiveStartDate(String code, LocalDate effectiveStartDate) {
    if (code == null || code.isBlank() || effectiveStartDate == null) return null;
    return positionMapper.selectOne(
        new LambdaQueryWrapper<PositionEntity>()
            .eq(PositionEntity::getCode, code.trim())
            .eq(PositionEntity::getEffectiveStartDate, effectiveStartDate)
            .last("LIMIT 1")
    );
  }

  private List<PositionEntity> filterSnapshot(
      String keyword,
      Long organizationId,
      LocalDate asOfDate
  ) {
    LocalDate date = asOfDate == null ? LocalDate.now() : asOfDate;
    List<PositionEntity> rows = positionMapper.selectList(
        new LambdaQueryWrapper<PositionEntity>()
            .le(PositionEntity::getEffectiveStartDate, date)
            .and(w -> w.isNull(PositionEntity::getEffectiveEndDate)
                .or().ge(PositionEntity::getEffectiveEndDate, date))
    );

    Map<String, PositionEntity> byCode = new LinkedHashMap<>();
    for (PositionEntity row : rows) {
      PositionEntity existing = byCode.get(row.getCode());
      if (existing == null
          || row.getEffectiveStartDate().isAfter(existing.getEffectiveStartDate())) {
        byCode.put(row.getCode(), row);
      }
    }

    String k = keyword == null ? "" : keyword.trim().toLowerCase();
    final Long filterOrganizationId = organizationId;
    String resolvedOrgCode = null;
    if (filterOrganizationId != null) {
      OrganizationEntity selectedOrg = organizationMapper.selectById(filterOrganizationId);
      if (selectedOrg != null) {
        resolvedOrgCode = selectedOrg.getCode();
      }
    }
    final String orgCodeFilter = resolvedOrgCode;
    Map<Long, String> orgCodeById = orgCodeFilter == null
        ? Map.of()
        : organizationMapper.selectBatchIds(
            byCode.values().stream()
                .map(PositionEntity::getOrganizationId)
                .filter(Objects::nonNull)
                .distinct()
                .toList()
        ).stream().collect(Collectors.toMap(OrganizationEntity::getId, OrganizationEntity::getCode, (a, b) -> a));

    List<PositionEntity> filtered = byCode.values().stream()
        .filter(e -> {
          if (filterOrganizationId == null) return true;
          if (filterOrganizationId.equals(e.getOrganizationId())) return true;
          if (orgCodeFilter == null) return false;
          String positionOrgCode = orgCodeById.get(e.getOrganizationId());
          return orgCodeFilter.equals(positionOrgCode);
        })
        .filter(e -> {
          if (k.isEmpty()) return true;
          return (e.getCode() != null && e.getCode().toLowerCase().contains(k))
              || (e.getName() != null && e.getName().toLowerCase().contains(k));
        })
        .sorted(Comparator.comparing(PositionEntity::getCode))
        .toList();
    return filtered;
  }

  public PositionEntity require(long id) {
    PositionEntity e = positionMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("岗位不存在");
    return e;
  }

  public List<PositionEntity> listVersionsByCode(String code) {
    if (code == null || code.isBlank()) {
      throw new IllegalArgumentException("岗位编码不能为空");
    }
    return positionMapper.selectList(
        new LambdaQueryWrapper<PositionEntity>()
            .eq(PositionEntity::getCode, code)
            .orderByDesc(PositionEntity::getEffectiveStartDate)
    );
  }

  public Map<Long, OrganizationEntity> orgMap(List<PositionEntity> items) {
    if (items.isEmpty()) return Map.of();
    return organizationMapper.selectBatchIds(
        items.stream().map(PositionEntity::getOrganizationId).distinct().toList()
    ).stream().collect(Collectors.toMap(OrganizationEntity::getId, o -> o, (a, b) -> a));
  }

  public Map<String, String> dictLabels(String typeCode) {
    return dictService.listItemsByTypeCode(typeCode).stream()
        .collect(Collectors.toMap(DictItemEntity::getValue, DictItemEntity::getLabel, (a, b) -> a));
  }

  @Transactional
  public PositionEntity create(PositionEntity entity) {
    if (entity.getName() == null || entity.getName().isBlank()) {
      throw new IllegalArgumentException("岗位名称不能为空");
    }
    if (entity.getEffectiveStartDate() == null) {
      throw new IllegalArgumentException("生效日期不能为空");
    }
    if (organizationMapper.selectById(entity.getOrganizationId()) == null) {
      throw new IllegalArgumentException("直属部门不存在");
    }
    normalizeAndValidate(entity);
    entity.setCode(codeGeneratorService.generate("POSITION_CODE").code());
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    if (entity.getOccupationalDisease() == null || entity.getOccupationalDisease().isBlank()) {
      entity.setOccupationalDisease("NO");
    }
    if (entity.getKeyPosition() == null || entity.getKeyPosition().isBlank()) {
      entity.setKeyPosition("NO");
    }
    positionMapper.insert(entity);
    return require(entity.getId());
  }

  @Transactional
  public PositionEntity update(long id, PositionEntity patch, String editMode) {
    PositionEntity current = require(id);
    String mode = editMode == null || editMode.isBlank() ? "CURRENT" : editMode;
    if ("NEW_VERSION".equals(mode)) {
      return createNewVersion(current, patch);
    }
    return updateCurrentVersion(current, patch);
  }

  @Transactional
  public PositionEntity update(long id, PositionEntity patch) {
    return update(id, patch, "CURRENT");
  }

  private PositionEntity updateCurrentVersion(PositionEntity current, PositionEntity patch) {
    applyPatch(current, patch);
    normalizeAndValidate(current);
    if (patch.getOrganizationId() != null
        && organizationMapper.selectById(current.getOrganizationId()) == null) {
      throw new IllegalArgumentException("直属部门不存在");
    }
    positionMapper.updateById(current);
    return require(current.getId());
  }

  private PositionEntity createNewVersion(PositionEntity current, PositionEntity patch) {
    LocalDate newStart = patch.getEffectiveStartDate();
    if (newStart == null) {
      throw new IllegalArgumentException("新版本须指定生效日期");
    }
    if (newStart.equals(current.getEffectiveStartDate())) {
      throw new IllegalArgumentException("新版本生效日期须不同于当前版本");
    }

    List<PositionEntity> allVersions = listVersionsByCode(current.getCode());
    boolean duplicateStart = allVersions.stream()
        .anyMatch(v -> v.getEffectiveStartDate().equals(newStart));
    if (duplicateStart) {
      throw new IllegalArgumentException("该生效日期已存在版本");
    }

    PositionEntity containing = allVersions.stream()
        .filter(v -> !v.getEffectiveStartDate().isAfter(newStart)
            && (v.getEffectiveEndDate() == null || !v.getEffectiveEndDate().isBefore(newStart)))
        .max(Comparator.comparing(PositionEntity::getEffectiveStartDate))
        .orElse(null);

    PositionEntity nextAfter = allVersions.stream()
        .filter(v -> v.getEffectiveStartDate().isAfter(newStart))
        .min(Comparator.comparing(PositionEntity::getEffectiveStartDate))
        .orElse(null);

    LocalDate newEnd = nextAfter == null ? null : nextAfter.getEffectiveStartDate().minusDays(1);

    if (containing != null && !containing.getEffectiveStartDate().equals(newStart)) {
      LocalDate containingOldEnd = containing.getEffectiveEndDate();
      containing.setEffectiveEndDate(newStart.minusDays(1));
      positionMapper.updateById(containing);
      if (containingOldEnd != null && nextAfter == null) {
        newEnd = containingOldEnd;
      }
    }

    PositionEntity next = copyVersion(current);
    applyPatch(next, patch);
    next.setEffectiveStartDate(newStart);
    next.setEffectiveEndDate(newEnd);
    normalizeAndValidate(next);
    if (organizationMapper.selectById(next.getOrganizationId()) == null) {
      throw new IllegalArgumentException("直属部门不存在");
    }
    positionMapper.insert(next);
    return require(next.getId());
  }

  private void applyPatch(PositionEntity target, PositionEntity patch) {
    if (patch.getName() != null) target.setName(patch.getName());
    if (patch.getOrganizationId() != null) target.setOrganizationId(patch.getOrganizationId());
    if (patch.getPositionCategory() != null) {
      target.setPositionCategory(blankToNull(patch.getPositionCategory()));
    }
    if (patch.getPositionLevel() != null) {
      target.setPositionLevel(blankToNull(patch.getPositionLevel()));
    }
    if (patch.getIdentityCategory() != null) {
      target.setIdentityCategory(blankToNull(patch.getIdentityCategory()));
    }
    if (patch.getPositionKind() != null) {
      target.setPositionKind(blankToNull(patch.getPositionKind()));
    }
    if (patch.getPositionSequence() != null) {
      target.setPositionSequence(blankToNull(patch.getPositionSequence()));
    }
    if (patch.getOccupationalDisease() != null) target.setOccupationalDisease(patch.getOccupationalDisease());
    if (patch.getKeyPosition() != null) target.setKeyPosition(patch.getKeyPosition());
    if (patch.getStatus() != null) target.setStatus(patch.getStatus());
  }

  private PositionEntity copyVersion(PositionEntity src) {
    PositionEntity next = new PositionEntity();
    next.setCode(src.getCode());
    next.setName(src.getName());
    next.setOrganizationId(src.getOrganizationId());
    next.setOccupationalDisease(src.getOccupationalDisease());
    next.setPositionCategory(src.getPositionCategory());
    next.setPositionKind(src.getPositionKind());
    next.setPositionSequence(src.getPositionSequence());
    next.setPositionLevel(src.getPositionLevel());
    next.setKeyPosition(src.getKeyPosition());
    next.setIdentityCategory(src.getIdentityCategory());
    next.setStatus(src.getStatus());
    return next;
  }

  private void normalizeAndValidate(PositionEntity entity) {
    entity.setPositionCategory(blankToNull(entity.getPositionCategory()));
    entity.setPositionLevel(blankToNull(entity.getPositionLevel()));
    entity.setIdentityCategory(blankToNull(entity.getIdentityCategory()));
    entity.setPositionKind(blankToNull(entity.getPositionKind()));
    entity.setPositionSequence(blankToNull(entity.getPositionSequence()));

    validateDictValue("POSITION_CATEGORY", entity.getPositionCategory(), "岗位分类");
    validateDictValue("POSITION_LEVEL", entity.getPositionLevel(), "岗位职级");
    validateDictValue("IDENTITY_CATEGORY", entity.getIdentityCategory(), "身份类别");
    validateEnum(entity.getPositionKind(), Set.of("OFFICE", "NON_OFFICE"), "岗位类别");
    validateEnum(entity.getPositionSequence(), Set.of("P", "M", "T"), "岗位序列");
    validateYesNo(entity.getOccupationalDisease(), "职业病岗位");
    validateYesNo(entity.getKeyPosition(), "关键岗位");
    if (entity.getStatus() != null && !Set.of("ACTIVE", "INACTIVE").contains(entity.getStatus())) {
      throw new IllegalArgumentException("状态无效");
    }
  }

  @Transactional
  public void delete(long id) {
    PositionEntity cur = require(id);
    cur.setStatus("INACTIVE");
    positionMapper.updateById(cur);
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value;
  }

  private void validateDictValue(String typeCode, String value, String fieldName) {
    if (value == null || value.isBlank()) return;
    boolean ok = dictService.listItemsByTypeCode(typeCode).stream()
        .anyMatch(i -> value.equals(i.getValue()) && "ACTIVE".equals(i.getStatus()));
    if (!ok) throw new IllegalArgumentException(fieldName + "取值无效");
  }

  private void validateEnum(String value, Set<String> allowed, String fieldName) {
    if (value == null || value.isBlank()) return;
    if (!allowed.contains(value)) throw new IllegalArgumentException(fieldName + "取值无效");
  }

  private void validateYesNo(String value, String fieldName) {
    if (value == null || value.isBlank()) return;
    if (!"YES".equals(value) && !"NO".equals(value)) {
      throw new IllegalArgumentException(fieldName + "须为是或否");
    }
  }
}
