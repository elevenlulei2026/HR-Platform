package com.hrplatform.core.employee;

import com.hrplatform.core.organization.PositionEntity;
import com.hrplatform.platform.dict.DictItemEntity;
import com.hrplatform.platform.dict.DictService;
import com.hrplatform.platform.employeegroup.EmployeeGroupCatalogCache;
import com.hrplatform.platform.employeegroup.EmployeeGroupCatalogService;
import com.hrplatform.platform.employeegroup.EmployeeGroupEntity;
import com.hrplatform.platform.employeegroup.EmployeeSubgroupEntity;
import com.hrplatform.platform.parentchild.ParentChildCatalogService;
import com.hrplatform.platform.parentchild.ParentChildItemEntity;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.BiFunction;
import org.springframework.stereotype.Component;

@Component
public class EmployeeAssignmentHelper {
  private final DictService dictService;
  private final ParentChildCatalogService movementCatalogService;
  private final EmployeeGroupCatalogService employeeGroupCatalogService;
  private static final String MOVEMENT_TYPE_CODE = "MOVEMENT_CATALOG";

  public EmployeeAssignmentHelper(
      DictService dictService,
      ParentChildCatalogService movementCatalogService,
      EmployeeGroupCatalogService employeeGroupCatalogService
  ) {
    this.dictService = dictService;
    this.movementCatalogService = movementCatalogService;
    this.employeeGroupCatalogService = employeeGroupCatalogService;
  }

  public void normalizeIndicator(EmployeeAssignmentEntity entity) {
    if (entity.getAssignmentIndicator() != null && !entity.getAssignmentIndicator().isBlank()) {
      entity.setIsPrimary("PRIMARY".equalsIgnoreCase(entity.getAssignmentIndicator()));
      return;
    }
    if (entity.getIsPrimary() != null) {
      entity.setAssignmentIndicator(Boolean.TRUE.equals(entity.getIsPrimary()) ? "PRIMARY" : "SECONDARY");
      return;
    }
    entity.setAssignmentIndicator("PRIMARY");
    entity.setIsPrimary(true);
  }

  public boolean isPrimaryIndicator(EmployeeAssignmentEntity entity) {
    normalizeIndicator(entity);
    return Boolean.TRUE.equals(entity.getIsPrimary());
  }

  public boolean sameIndicatorType(EmployeeAssignmentEntity a, boolean primary) {
    return isPrimaryIndicator(a) == primary;
  }

  public record AssignmentVersionSpliceResult(List<EmployeeAssignmentEntity> toUpdate) {}

  /**
   * 按职务类型（主要/次要）衔接版本链，对齐岗位 {@code PositionService#createNewVersion}。
   */
  public AssignmentVersionSpliceResult resolveVersionSplice(
      EmployeeAssignmentEntity newRow,
      List<EmployeeAssignmentEntity> allForEmployee,
      LocalDate newStart
  ) {
    if (newStart == null) {
      throw new IllegalArgumentException("生效日期不能为空");
    }
    normalizeIndicator(newRow);
    boolean primary = isPrimaryIndicator(newRow);

    List<EmployeeAssignmentEntity> sameIndicator = allForEmployee.stream()
        .filter(a -> sameIndicatorType(a, primary))
        .filter(a -> a.getId() == null || !a.getId().equals(newRow.getId()))
        .toList();

    boolean duplicateStart = sameIndicator.stream()
        .anyMatch(v -> newStart.equals(v.getEffectiveStartDate()));
    if (duplicateStart) {
      throw new IllegalArgumentException("同职务类型下该生效日期已存在任职记录");
    }

    EmployeeAssignmentEntity containing = sameIndicator.stream()
        .filter(v -> v.getEffectiveStartDate() != null
            && !v.getEffectiveStartDate().isAfter(newStart)
            && (v.getEffectiveEndDate() == null || !v.getEffectiveEndDate().isBefore(newStart)))
        .max(Comparator.comparing(EmployeeAssignmentEntity::getEffectiveStartDate))
        .orElse(null);

    EmployeeAssignmentEntity nextAfter = sameIndicator.stream()
        .filter(v -> v.getEffectiveStartDate() != null && v.getEffectiveStartDate().isAfter(newStart))
        .min(Comparator.comparing(EmployeeAssignmentEntity::getEffectiveStartDate))
        .orElse(null);

    LocalDate newEnd = nextAfter == null ? null : nextAfter.getEffectiveStartDate().minusDays(1);

    List<EmployeeAssignmentEntity> toUpdate = new ArrayList<>();
    if (containing != null && !newStart.equals(containing.getEffectiveStartDate())) {
      containing.setEffectiveEndDate(newStart.minusDays(1));
      if (containing.getEffectiveEndDate() != null
          && containing.getEffectiveEndDate().isBefore(LocalDate.now())) {
        containing.setStatus("ENDED");
      }
      toUpdate.add(containing);
    }

    newRow.setEffectiveStartDate(newStart);
    newRow.setEffectiveEndDate(newEnd);
    return new AssignmentVersionSpliceResult(toUpdate);
  }

  public void applyPositionDefaults(EmployeeAssignmentEntity entity, PositionEntity position) {
    if (position == null) return;
    if (entity.getJobSequence() == null || entity.getJobSequence().isBlank()) {
      entity.setJobSequence(position.getPositionSequence());
    }
    if ((entity.getJobGradeCode() == null || entity.getJobGradeCode().isBlank())
        && position.getPositionLevel() != null
        && !position.getPositionLevel().isBlank()) {
      entity.setJobGradeCode(position.getPositionLevel());
    }
  }

  public void computeDerivedFields(
      EmployeeAssignmentEntity entity,
      List<EmployeeAssignmentEntity> allForEmployee,
      LocalDate asOfDate
  ) {
    LocalDate ref = asOfDate == null ? LocalDate.now() : asOfDate;
    if (entity.getGroupSeniorityStartDate() != null) {
      entity.setCompanyTenure(formatTenure(entity.getGroupSeniorityStartDate(), ref));
    }
    entity.setExpectedRegularizationDate(computeExpectedRegularization(
        entity.getHireDate(),
        entity.getProbationPeriod()
    ));
    LocalDate positionStart = computePositionStartDate(entity, allForEmployee);
    entity.setPositionStartDate(positionStart);
    if (positionStart != null) {
      long days = ChronoUnit.DAYS.between(positionStart, ref) + 1;
      entity.setTenureOnPosition(days + "天");
    }
  }

  public LocalDate computePositionStartDate(
      EmployeeAssignmentEntity current,
      List<EmployeeAssignmentEntity> allForEmployee
  ) {
    if (current.getPositionId() == null || current.getEffectiveStartDate() == null) return null;
    boolean primary = isPrimaryIndicator(current);
    return allForEmployee.stream()
        .filter(a -> sameIndicatorType(a, primary))
        .filter(a -> Objects.equals(a.getPositionId(), current.getPositionId()))
        .filter(a -> a.getEffectiveStartDate() != null)
        .filter(a -> !a.getEffectiveStartDate().isAfter(current.getEffectiveStartDate()))
        .min(Comparator.comparing(EmployeeAssignmentEntity::getEffectiveStartDate))
        .map(EmployeeAssignmentEntity::getEffectiveStartDate)
        .orElse(current.getEffectiveStartDate());
  }

  public LocalDate computeExpectedRegularization(LocalDate hireDate, String probationPeriod) {
    if (hireDate == null || probationPeriod == null || probationPeriod.isBlank()) return null;
    int months = probationMonths(probationPeriod);
    if (months <= 0) return null;
    return hireDate.plusMonths(months);
  }

  public int probationMonths(String probationPeriod) {
    return dictService.listItemsByTypeCode("PROBATION_PERIOD").stream()
        .filter(i -> probationPeriod.equals(i.getValue()))
        .map(this::monthsFromDictItem)
        .findFirst()
        .orElseGet(() -> {
          String v = probationPeriod.trim().toUpperCase();
          if (v.endsWith("M")) {
            try {
              return Integer.parseInt(v.substring(0, v.length() - 1));
            } catch (NumberFormatException ignored) {
              return 0;
            }
          }
          return 0;
        });
  }

  private int monthsFromDictItem(DictItemEntity item) {
    if (item.getExtJson() != null && item.getExtJson().contains("\"months\"")) {
      String json = item.getExtJson();
      int idx = json.indexOf("\"months\"");
      if (idx >= 0) {
        int colon = json.indexOf(':', idx);
        if (colon > 0) {
          int end = json.indexOf(',', colon);
          if (end < 0) end = json.indexOf('}', colon);
          if (end > colon) {
            try {
              return Integer.parseInt(json.substring(colon + 1, end).trim());
            } catch (NumberFormatException ignored) {
              // fall through
            }
          }
        }
      }
    }
    return 0;
  }

  public String formatTenure(LocalDate start, LocalDate end) {
    if (start == null || end == null || end.isBefore(start)) return null;
    Period p = Period.between(start, end);
    int years = p.getYears();
    int months = p.getMonths();
    if (years <= 0 && months <= 0) return "不足1个月";
    StringBuilder sb = new StringBuilder();
    if (years > 0) sb.append(years).append("年");
    if (months > 0) sb.append(months).append("个月");
    return sb.toString();
  }

  public boolean isActiveAsOf(EmployeeAssignmentEntity a, LocalDate asOfDate) {
    if (a.getEffectiveStartDate() == null) return false;
    if (a.getEffectiveStartDate().isAfter(asOfDate)) return false;
    return a.getEffectiveEndDate() == null || !a.getEffectiveEndDate().isBefore(asOfDate);
  }

  public Map<String, Object> enrichDto(
      EmployeeAssignmentEntity a,
      Map<Long, EmployeeEntity> handoverMap,
      BiFunction<String, String, String> dictLabel
  ) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(a.getId()));
    dto.put("employeeId", String.valueOf(a.getEmployeeId()));
    dto.put("effectiveStartDate", a.getEffectiveStartDate() == null ? null : a.getEffectiveStartDate().toString());
    dto.put("effectiveEndDate", a.getEffectiveEndDate() == null ? null : a.getEffectiveEndDate().toString());
    dto.put("createdAt", a.getCreatedAt() == null ? null : a.getCreatedAt().toString());
    dto.put("updatedAt", a.getUpdatedAt() == null ? null : a.getUpdatedAt().toString());
    dto.put("hireDate", a.getHireDate() == null ? null : a.getHireDate().toString());
    dto.put("companyTenure", a.getCompanyTenure());
    dto.put("isRehire", a.getIsRehire());
    dto.put("groupResponsibilityStartDate",
        a.getGroupResponsibilityStartDate() == null ? null : a.getGroupResponsibilityStartDate().toString());
    dto.put("groupSeniorityStartDate",
        a.getGroupSeniorityStartDate() == null ? null : a.getGroupSeniorityStartDate().toString());
    dto.put("supplier", a.getSupplier());
    dto.put("supplierLabel", dictLabel.apply("SUPPLIER", a.getSupplier()));
    dto.put("probationPeriod", a.getProbationPeriod());
    dto.put("probationPeriodLabel", dictLabel.apply("PROBATION_PERIOD", a.getProbationPeriod()));
    dto.put("expectedRegularizationDate",
        a.getExpectedRegularizationDate() == null ? null : a.getExpectedRegularizationDate().toString());
    dto.put("actualRegularizationDate",
        a.getActualRegularizationDate() == null ? null : a.getActualRegularizationDate().toString());
    dto.put("movementType", a.getMovementType());
    dto.put("movementTypeName", movementTypeName(a.getMovementType()));
    dto.put("reasonCode", a.getReasonCode());
    dto.put("reasonDescription", movementReasonName(a.getMovementType(), a.getReasonCode()));
    dto.put("reasonSubCode", a.getReasonSubCode());
    dto.put("reasonSubDescription", movementReasonSubName(
        a.getMovementType(),
        a.getReasonCode(),
        a.getReasonSubCode()
    ));
    String indicator = a.getAssignmentIndicator();
    if (indicator == null || indicator.isBlank()) {
      indicator = Boolean.TRUE.equals(a.getIsPrimary()) ? "PRIMARY" : "SECONDARY";
    }
    dto.put("assignmentIndicator", indicator);
    dto.put("assignmentIndicatorLabel", "PRIMARY".equals(indicator) ? "主要职务" : "次要职务");
    dto.put("isPrimary", "PRIMARY".equals(indicator));
    dto.put("legalEntityCode", a.getLegalEntityCode());
    dto.put("legalEntityLabel", dictLabel.apply("LEGAL_COMPANY", a.getLegalEntityCode()));
    dto.put("organizationId", a.getOrganizationId() == null ? null : String.valueOf(a.getOrganizationId()));
    dto.put("positionId", a.getPositionId() == null ? null : String.valueOf(a.getPositionId()));
    dto.put("jobSequence", a.getJobSequence());
    dto.put("jobSequenceLabel", a.getJobSequence());
    dto.put("jobGradeCode", a.getJobGradeCode());
    dto.put("jobGradeLabel", dictLabel.apply("JOB_GRADE", a.getJobGradeCode()));
    dto.put("contractLocation", a.getContractLocation());
    dto.put("contractLocationLabel", dictLabel.apply("CONTRACT_LOCATION", a.getContractLocation()));
    dto.put("workLocation", a.getWorkLocation());
    dto.put("workLocationLabel", dictLabel.apply("WORK_LOCATION", a.getWorkLocation()));
    dto.put("isResponsibilitySystem", a.getIsResponsibilitySystem());
    dto.put("approvalAuthority", a.getApprovalAuthority());
    dto.put("approvalAuthorityLabel", dictLabel.apply("APPROVAL_AUTHORITY", a.getApprovalAuthority()));
    dto.put("employeeGroupCode", a.getEmployeeGroupCode());
    dto.put("employeeSubgroupCode", a.getEmployeeSubgroupCode());
    GroupNames groupNames = resolveGroupNames(a.getEmployeeGroupCode(), a.getEmployeeSubgroupCode());
    dto.put("employeeGroupName", groupNames.groupName());
    dto.put("employeeSubgroupName", groupNames.subgroupName());
    dto.put("positionStartDate", a.getPositionStartDate() == null ? null : a.getPositionStartDate().toString());
    dto.put("tenureOnPosition", a.getTenureOnPosition());
    dto.put("employeeNature", a.getEmployeeNature());
    dto.put("employeeNatureLabel", dictLabel.apply("EMPLOYEE_NATURE", a.getEmployeeNature()));
    dto.put("groupAttrLevel", a.getGroupAttrLevel());
    dto.put("groupAttrLevelLabel", dictLabel.apply("GROUP_ATTR_LEVEL", a.getGroupAttrLevel()));
    dto.put("payrollCompanyCode", a.getPayrollCompanyCode());
    dto.put("payrollCompanyLabel", dictLabel.apply("PAYROLL_COMPANY", a.getPayrollCompanyCode()));
    dto.put("costLegalEntityCode", a.getCostLegalEntityCode());
    dto.put("costLegalEntityLabel", dictLabel.apply("LEGAL_COMPANY", a.getCostLegalEntityCode()));
    dto.put("trueResignationReasonHrbp", a.getTrueResignationReasonHrbp());
    dto.put("trueResignationReasonSubHrbp", a.getTrueResignationReasonSubHrbp());
    dto.put("handoverEmployeeId",
        a.getHandoverEmployeeId() == null ? null : String.valueOf(a.getHandoverEmployeeId()));
    EmployeeEntity handover = a.getHandoverEmployeeId() == null ? null : handoverMap.get(a.getHandoverEmployeeId());
    dto.put("handoverEmployeeName", handover == null ? null : handover.getFullName());
    dto.put("handoverEmployeeNo", handover == null ? null : handover.getEmployeeNo());
    dto.put("resignationDestination", a.getResignationDestination());
    dto.put("nonCompeteCompanySuggest", a.getNonCompeteCompanySuggest());
    dto.put("nonCompeteWithPay", a.getNonCompeteWithPay());
    dto.put("salaryGroup", a.getSalaryGroup());
    dto.put("salaryGroupLabel", dictLabel.apply("SALARY_GROUP", a.getSalaryGroup()));
    dto.put("status", a.getStatus());
    return dto;
  }

  private record GroupNames(String groupName, String subgroupName) {}

  private GroupNames resolveGroupNames(String groupCode, String subgroupCode) {
    if (groupCode == null || groupCode.isBlank()) return new GroupNames(null, null);
    List<EmployeeGroupCatalogCache.GroupCatalogSnapshot> snapshot = employeeGroupCatalogService.loadSnapshot();
    EmployeeGroupEntity group = snapshot.stream()
        .map(EmployeeGroupCatalogCache.GroupCatalogSnapshot::group)
        .filter(g -> groupCode.equals(g.getCode()))
        .findFirst()
        .orElse(null);
    if (group == null) return new GroupNames(null, null);
    if (subgroupCode == null || subgroupCode.isBlank()) {
      return new GroupNames(group.getName(), null);
    }
    String subgroupName = snapshot.stream()
        .filter(s -> groupCode.equals(s.group().getCode()))
        .flatMap(s -> s.subgroups().stream())
        .filter(sub -> subgroupCode.equals(sub.getCode()))
        .map(EmployeeSubgroupEntity::getName)
        .findFirst()
        .orElse(null);
    return new GroupNames(group.getName(), subgroupName);
  }

  private String movementTypeName(String code) {
    if (code == null || code.isBlank()) return null;
    ParentChildItemEntity type = movementCatalogService.requireItemByCode(MOVEMENT_TYPE_CODE, code);
    return type.getName() == null || type.getName().isBlank() ? code : type.getName();
  }

  private String movementReasonName(String movementType, String reasonCode) {
    if (movementType == null || reasonCode == null) return null;
    return movementCatalogService.listChildren(MOVEMENT_TYPE_CODE, movementType).stream()
        .filter(r -> reasonCode.equals(r.getCode()))
        .map(ParentChildItemEntity::getName)
        .findFirst()
        .orElse(reasonCode);
  }

  private String movementReasonSubName(String movementType, String reasonCode, String subCode) {
    if (movementType == null || reasonCode == null || subCode == null) return null;
    return movementCatalogService.listChildren(MOVEMENT_TYPE_CODE, reasonCode).stream()
        .filter(sub -> subCode.equals(sub.getCode()))
        .map(ParentChildItemEntity::getName)
        .findFirst()
        .orElse(subCode);
  }

  public EmployeeAssignmentEntity cloneAssignment(EmployeeAssignmentEntity src) {
    EmployeeAssignmentEntity t = new EmployeeAssignmentEntity();
    t.setEmployeeId(src.getEmployeeId());
    t.setOrganizationId(src.getOrganizationId());
    t.setPositionId(src.getPositionId());
    t.setJobId(src.getJobId());
    t.setJobGradeCode(src.getJobGradeCode());
    t.setJobSequence(src.getJobSequence());
    t.setEmploymentType(src.getEmploymentType());
    t.setEmploymentSubType(src.getEmploymentSubType());
    t.setEmployeeNature(src.getEmployeeNature());
    t.setContractLocation(src.getContractLocation());
    t.setWorkLocation(src.getWorkLocation());
    t.setIsPrimary(src.getIsPrimary());
    t.setIsResponsibilitySystem(src.getIsResponsibilitySystem());
    t.setApprovalAuthority(src.getApprovalAuthority());
    t.setIsManagementCadre(src.getIsManagementCadre());
    t.setIsCoreTalent(src.getIsCoreTalent());
    t.setSpecialTags(src.getSpecialTags());
    t.setGroupAttrLevel(src.getGroupAttrLevel());
    t.setPayrollCompanyId(src.getPayrollCompanyId());
    t.setCostLegalEntityId(src.getCostLegalEntityId());
    t.setSalaryGroup(src.getSalaryGroup());
    t.setBusinessUnit(src.getBusinessUnit());
    t.setLegalEntityId(src.getLegalEntityId());
    t.setGroupName(src.getGroupName());
    t.setBusinessGroup(src.getBusinessGroup());
    t.setSystemName(src.getSystemName());
    t.setSecondarySystem(src.getSecondarySystem());
    t.setCenterName(src.getCenterName());
    t.setDepartmentName(src.getDepartmentName());
    t.setModuleName(src.getModuleName());
    t.setTeamName(src.getTeamName());
    t.setSecondaryTeam(src.getSecondaryTeam());
    t.setLineOrStore(src.getLineOrStore());
    t.setSupplier(src.getSupplier());
    t.setProbationPeriod(src.getProbationPeriod());
    t.setExpectedRegularizationDate(src.getExpectedRegularizationDate());
    t.setRegularizationOpinion(src.getRegularizationOpinion());
    t.setActualRegularizationDate(src.getActualRegularizationDate());
    t.setGroupResponsibilityStartDate(src.getGroupResponsibilityStartDate());
    t.setGroupSeniorityStartDate(src.getGroupSeniorityStartDate());
    t.setTenureOnPosition(src.getTenureOnPosition());
    t.setCompanyTenure(src.getCompanyTenure());
    t.setHrCoordinatorNo(src.getHrCoordinatorNo());
    t.setHrbpNo(src.getHrbpNo());
    t.setSscNo(src.getSscNo());
    t.setHireDate(src.getHireDate());
    t.setIsRehire(src.getIsRehire());
    t.setMovementType(src.getMovementType());
    t.setReasonCode(src.getReasonCode());
    t.setReasonSubCode(src.getReasonSubCode());
    t.setEmployeeGroupCode(src.getEmployeeGroupCode());
    t.setEmployeeSubgroupCode(src.getEmployeeSubgroupCode());
    t.setLegalEntityCode(src.getLegalEntityCode());
    t.setPayrollCompanyCode(src.getPayrollCompanyCode());
    t.setCostLegalEntityCode(src.getCostLegalEntityCode());
    t.setTrueResignationReasonHrbp(src.getTrueResignationReasonHrbp());
    t.setTrueResignationReasonSubHrbp(src.getTrueResignationReasonSubHrbp());
    t.setHandoverEmployeeId(src.getHandoverEmployeeId());
    t.setResignationDestination(src.getResignationDestination());
    t.setNonCompeteCompanySuggest(src.getNonCompeteCompanySuggest());
    t.setNonCompeteWithPay(src.getNonCompeteWithPay());
    t.setAssignmentIndicator(src.getAssignmentIndicator());
    t.setStatus(src.getStatus());
    return t;
  }
}
