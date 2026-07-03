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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class OrganizationService {
  private static final Set<String> ORG_ATTRIBUTES = Set.of("PHYSICAL", "VIRTUAL");
  private static final Set<String> ORG_FUNCTIONS = Set.of("RND", "MANUFACTURING", "MARKET", "FUNCTION");

  private final OrganizationMapper organizationMapper;
  private final CodeGeneratorService codeGeneratorService;
  private final DictService dictService;

  public OrganizationService(
      OrganizationMapper organizationMapper,
      CodeGeneratorService codeGeneratorService,
      DictService dictService
  ) {
    this.organizationMapper = organizationMapper;
    this.codeGeneratorService = codeGeneratorService;
    this.dictService = dictService;
  }

  public OrganizationEntity require(long id) {
    OrganizationEntity e = organizationMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("组织不存在");
    return e;
  }

  public List<TreeNode> getTree(LocalDate asOfDate) {
    LocalDate date = asOfDate == null ? LocalDate.now() : asOfDate;
    List<OrganizationEntity> rows = organizationMapper.selectList(
        new LambdaQueryWrapper<OrganizationEntity>()
            .le(OrganizationEntity::getEffectiveStartDate, date)
            .and(w -> w.isNull(OrganizationEntity::getEffectiveEndDate)
                .or().ge(OrganizationEntity::getEffectiveEndDate, date))
            .orderByAsc(OrganizationEntity::getCode)
    );
    Map<String, OrganizationEntity> byCode = new LinkedHashMap<>();
    for (OrganizationEntity row : rows) {
      OrganizationEntity existing = byCode.get(row.getCode());
      if (existing == null
          || row.getEffectiveStartDate().isAfter(existing.getEffectiveStartDate())) {
        byCode.put(row.getCode(), row);
      }
    }
    Map<String, List<OrganizationEntity>> childrenByParent = new HashMap<>();
    for (OrganizationEntity org : byCode.values()) {
      String parent = org.getParentCode() == null ? "" : org.getParentCode();
      childrenByParent.computeIfAbsent(parent, k -> new ArrayList<>()).add(org);
    }
    for (List<OrganizationEntity> list : childrenByParent.values()) {
      list.sort(Comparator.comparing(OrganizationEntity::getCode));
    }
    return buildTreeNodes("", childrenByParent);
  }

  private List<TreeNode> buildTreeNodes(String parentCode, Map<String, List<OrganizationEntity>> map) {
    List<OrganizationEntity> children = map.getOrDefault(parentCode, List.of());
    List<TreeNode> out = new ArrayList<>();
    for (OrganizationEntity org : children) {
      TreeNode node = new TreeNode(org, buildTreeNodes(org.getCode(), map));
      out.add(node);
    }
    return out;
  }

  @Transactional
  public OrganizationEntity create(OrganizationEntity entity) {
    if (entity.getEffectiveStartDate() == null) {
      throw new IllegalArgumentException("生效日期不能为空");
    }
    if (entity.getName() == null || entity.getName().isBlank()) {
      throw new IllegalArgumentException("部门名称不能为空");
    }
    if (entity.getCode() == null || entity.getCode().isBlank()) {
      entity.setCode(codeGeneratorService.generate("DEPT_CODE").code());
    }
    normalizeAndValidate(entity);
    if (entity.getOrgType() == null || entity.getOrgType().isBlank()) {
      entity.setOrgType("DEPARTMENT");
    }
    if (entity.getStatus() == null || entity.getStatus().isBlank()) {
      entity.setStatus("ACTIVE");
    }
    validateParent(entity.getParentCode(), entity.getEffectiveStartDate(), entity.getCode());
    resolveParentId(entity, entity.getEffectiveStartDate());
    organizationMapper.insert(entity);
    return require(entity.getId());
  }

  public List<OrganizationEntity> listVersionsByCode(String code) {
    if (code == null || code.isBlank()) {
      throw new IllegalArgumentException("部门编码不能为空");
    }
    return organizationMapper.selectList(
        new LambdaQueryWrapper<OrganizationEntity>()
            .eq(OrganizationEntity::getCode, code)
            .orderByDesc(OrganizationEntity::getEffectiveStartDate)
    );
  }

  @Transactional
  public OrganizationEntity update(long id, OrganizationEntity patch, String editMode) {
    OrganizationEntity current = require(id);
    String mode = editMode == null || editMode.isBlank() ? "CURRENT" : editMode;
    if ("NEW_VERSION".equals(mode)) {
      return createNewVersion(current, patch);
    }
    return updateCurrentVersion(current, patch);
  }

  private OrganizationEntity updateCurrentVersion(OrganizationEntity current, OrganizationEntity patch) {
    applyPatch(current, patch);
    normalizeAndValidate(current);
    LocalDate asOf = current.getEffectiveStartDate();
    if (patch.getParentCode() != null) {
      validateParent(current.getParentCode(), asOf, current.getCode());
      resolveParentId(current, asOf);
    }
    organizationMapper.updateById(current);
    return require(current.getId());
  }

  private OrganizationEntity createNewVersion(OrganizationEntity current, OrganizationEntity patch) {
    LocalDate newStart = patch.getEffectiveStartDate();
    if (newStart == null) {
      throw new IllegalArgumentException("新版本须指定生效日期");
    }
    if (newStart.equals(current.getEffectiveStartDate())) {
      throw new IllegalArgumentException("新版本生效日期须不同于当前版本");
    }

    List<OrganizationEntity> allVersions = listVersionsByCode(current.getCode());
    boolean duplicateStart = allVersions.stream()
        .anyMatch(v -> v.getEffectiveStartDate().equals(newStart));
    if (duplicateStart) {
      throw new IllegalArgumentException("该生效日期已存在版本");
    }

    OrganizationEntity containing = allVersions.stream()
        .filter(v -> !v.getEffectiveStartDate().isAfter(newStart)
            && (v.getEffectiveEndDate() == null || !v.getEffectiveEndDate().isBefore(newStart)))
        .max(Comparator.comparing(OrganizationEntity::getEffectiveStartDate))
        .orElse(null);

    OrganizationEntity nextAfter = allVersions.stream()
        .filter(v -> v.getEffectiveStartDate().isAfter(newStart))
        .min(Comparator.comparing(OrganizationEntity::getEffectiveStartDate))
        .orElse(null);

    LocalDate newEnd = nextAfter == null ? null : nextAfter.getEffectiveStartDate().minusDays(1);

    if (containing != null && !containing.getEffectiveStartDate().equals(newStart)) {
      LocalDate containingOldEnd = containing.getEffectiveEndDate();
      containing.setEffectiveEndDate(newStart.minusDays(1));
      organizationMapper.updateById(containing);
      if (containingOldEnd != null && nextAfter == null) {
        newEnd = containingOldEnd;
      }
    }

    OrganizationEntity next = copyVersion(current);
    applyPatch(next, patch);
    next.setEffectiveStartDate(newStart);
    next.setEffectiveEndDate(newEnd);
    normalizeAndValidate(next);
    validateParent(next.getParentCode(), newStart, next.getCode());
    resolveParentId(next, newStart);
    organizationMapper.insert(next);
    return require(next.getId());
  }

  @Transactional
  public OrganizationEntity update(long id, OrganizationEntity patch) {
    return update(id, patch, "CURRENT");
  }

  private void applyPatch(OrganizationEntity target, OrganizationEntity patch) {
    if (patch.getName() != null) target.setName(patch.getName());
    if (patch.getParentCode() != null) target.setParentCode(blankToNull(patch.getParentCode()));
    if (patch.getDepartmentType() != null) target.setDepartmentType(blankToNull(patch.getDepartmentType()));
    if (patch.getLocation() != null) target.setLocation(blankToNull(patch.getLocation()));
    if (patch.getLegalCompany() != null) target.setLegalCompany(blankToNull(patch.getLegalCompany()));
    if (patch.getDepartmentLevel() != null) target.setDepartmentLevel(blankToNull(patch.getDepartmentLevel()));
    if (patch.getCostCenter() != null) target.setCostCenter(blankToNull(patch.getCostCenter()));
    if (patch.getOrgLeaderNo() != null) target.setOrgLeaderNo(blankToNull(patch.getOrgLeaderNo()));
    if (patch.getSupervisingLeaderNo() != null) target.setSupervisingLeaderNo(blankToNull(patch.getSupervisingLeaderNo()));
    if (patch.getOrgAttribute() != null) target.setOrgAttribute(blankToNull(patch.getOrgAttribute()));
    if (patch.getOrgFunction() != null) target.setOrgFunction(blankToNull(patch.getOrgFunction()));
    if (patch.getOrgTags() != null) target.setOrgTags(blankToNull(patch.getOrgTags()));
    if (patch.getFinancialCode() != null) target.setFinancialCode(blankToNull(patch.getFinancialCode()));
    if (patch.getHrCoordinatorNo() != null) target.setHrCoordinatorNo(blankToNull(patch.getHrCoordinatorNo()));
    if (patch.getHrbpNo() != null) target.setHrbpNo(blankToNull(patch.getHrbpNo()));
    if (patch.getSscNo() != null) target.setSscNo(blankToNull(patch.getSscNo()));
    if (patch.getStatus() != null) target.setStatus(patch.getStatus());
  }

  private OrganizationEntity copyVersion(OrganizationEntity src) {
    OrganizationEntity next = new OrganizationEntity();
    next.setCode(src.getCode());
    next.setName(src.getName());
    next.setParentCode(src.getParentCode());
    next.setOrgType(src.getOrgType());
    next.setDepartmentType(src.getDepartmentType());
    next.setLocation(src.getLocation());
    next.setLegalCompany(src.getLegalCompany());
    next.setDepartmentLevel(src.getDepartmentLevel());
    next.setCostCenter(src.getCostCenter());
    next.setOrgLeaderNo(src.getOrgLeaderNo());
    next.setSupervisingLeaderNo(src.getSupervisingLeaderNo());
    next.setOrgAttribute(src.getOrgAttribute());
    next.setOrgFunction(src.getOrgFunction());
    next.setOrgTags(src.getOrgTags());
    next.setFinancialCode(src.getFinancialCode());
    next.setHrCoordinatorNo(src.getHrCoordinatorNo());
    next.setHrbpNo(src.getHrbpNo());
    next.setSscNo(src.getSscNo());
    next.setStatus(src.getStatus());
    return next;
  }

  private void normalizeAndValidate(OrganizationEntity entity) {
    entity.setDepartmentType(blankToNull(entity.getDepartmentType()));
    entity.setLocation(blankToNull(entity.getLocation()));
    entity.setLegalCompany(blankToNull(entity.getLegalCompany()));
    entity.setDepartmentLevel(blankToNull(entity.getDepartmentLevel()));
    entity.setCostCenter(blankToNull(entity.getCostCenter()));
    entity.setOrgLeaderNo(blankToNull(entity.getOrgLeaderNo()));
    entity.setSupervisingLeaderNo(blankToNull(entity.getSupervisingLeaderNo()));
    entity.setOrgAttribute(blankToNull(entity.getOrgAttribute()));
    entity.setOrgFunction(blankToNull(entity.getOrgFunction()));
    entity.setOrgTags(blankToNull(entity.getOrgTags()));
    entity.setFinancialCode(blankToNull(entity.getFinancialCode()));
    entity.setHrCoordinatorNo(blankToNull(entity.getHrCoordinatorNo()));
    entity.setHrbpNo(blankToNull(entity.getHrbpNo()));
    entity.setSscNo(blankToNull(entity.getSscNo()));

    if (entity.getLocation() != null) validateDictValue("LOCATION", entity.getLocation(), "地点");
    if (entity.getLegalCompany() != null) validateDictValue("LEGAL_COMPANY", entity.getLegalCompany(), "法人公司");
    if (entity.getDepartmentType() != null) validateDictValue("DEPARTMENT_TYPE", entity.getDepartmentType(), "部门类型");
    if (entity.getDepartmentLevel() != null) validateDictValue("DEPARTMENT_LEVEL", entity.getDepartmentLevel(), "部门层级");
    if (entity.getOrgAttribute() != null && !ORG_ATTRIBUTES.contains(entity.getOrgAttribute())) {
      throw new IllegalArgumentException("组织属性无效");
    }
    if (entity.getOrgFunction() != null && !ORG_FUNCTIONS.contains(entity.getOrgFunction())) {
      throw new IllegalArgumentException("组织职能无效");
    }
    if (entity.getStatus() != null && !Set.of("ACTIVE", "INACTIVE").contains(entity.getStatus())) {
      throw new IllegalArgumentException("状态无效");
    }
  }

  private void validateDictValue(String typeCode, String value, String label) {
    boolean ok = dictService.listItemsByTypeCode(typeCode).stream()
        .anyMatch(i -> "ACTIVE".equals(i.getStatus()) && value.equals(i.getValue()));
    if (!ok) throw new IllegalArgumentException(label + "选项无效");
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) return null;
    return value.trim();
  }

  private void validateParent(String parentCode, LocalDate asOfDate, String selfCode) {
    if (parentCode == null || parentCode.isBlank()) return;
    if (parentCode.equals(selfCode)) throw new IllegalArgumentException("上级组织不能是自身");
    OrganizationEntity parent = findActiveByCode(parentCode, asOfDate);
    if (parent == null) throw new IllegalArgumentException("上级组织不存在或未生效");
  }

  private void resolveParentId(OrganizationEntity entity, LocalDate asOfDate) {
    if (entity.getParentCode() == null || entity.getParentCode().isBlank()) {
      entity.setParentId(null);
      return;
    }
    OrganizationEntity parent = findActiveByCode(entity.getParentCode(), asOfDate);
    entity.setParentId(parent == null ? null : parent.getId());
  }

  public OrganizationEntity findActiveByCode(String code, LocalDate asOfDate) {
    LocalDate date = asOfDate == null ? LocalDate.now() : asOfDate;
    List<OrganizationEntity> rows = organizationMapper.selectList(
        new LambdaQueryWrapper<OrganizationEntity>()
            .eq(OrganizationEntity::getCode, code)
            .le(OrganizationEntity::getEffectiveStartDate, date)
            .and(w -> w.isNull(OrganizationEntity::getEffectiveEndDate)
                .or().ge(OrganizationEntity::getEffectiveEndDate, date))
            .orderByDesc(OrganizationEntity::getEffectiveStartDate)
            .last("LIMIT 1")
    );
    return rows.isEmpty() ? null : rows.get(0);
  }

  public Map<String, String> dictLabels(String typeCode) {
    return dictService.listItemsByTypeCode(typeCode).stream()
        .collect(Collectors.toMap(DictItemEntity::getValue, DictItemEntity::getLabel, (a, b) -> a));
  }

  public record TreeNode(OrganizationEntity entity, List<TreeNode> children) {}
}
