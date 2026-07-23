package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.OrganizationMapper;
import com.hrplatform.core.organization.OrganizationService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 默认完整汇报线推导，口径见 {@code docs/汇报关系规则说明.md}。
 * <p>
 * 手工 DIRECT 覆盖直属上级时，完整链仍以组织衍生为准展示（注释约定：展示用衍生链，
 * DIRECT 仅影响 {@code reporting_line} 落库的成对上下级）。
 */
@Service
public class ReportingChainService {
  private final EmployeeMapper employeeMapper;
  private final EmployeeAssignmentMapper assignmentMapper;
  private final OrganizationMapper organizationMapper;
  private final OrganizationService organizationService;

  public ReportingChainService(
      EmployeeMapper employeeMapper,
      EmployeeAssignmentMapper assignmentMapper,
      OrganizationMapper organizationMapper,
      OrganizationService organizationService
  ) {
    this.employeeMapper = employeeMapper;
    this.assignmentMapper = assignmentMapper;
    this.organizationMapper = organizationMapper;
    this.organizationService = organizationService;
  }

  /** 批量推导用快照：asOfDate 下组织 + 工号→员工索引 */
  public Snapshot loadSnapshot(LocalDate asOfDate) {
    LocalDate asOf = asOfDate == null ? LocalDate.now() : asOfDate;
    List<OrganizationEntity> rows = organizationMapper.selectList(
        new LambdaQueryWrapper<OrganizationEntity>()
            .le(OrganizationEntity::getEffectiveStartDate, asOf)
            .and(w -> w.isNull(OrganizationEntity::getEffectiveEndDate)
                .or().ge(OrganizationEntity::getEffectiveEndDate, asOf))
    );
    Map<String, OrganizationEntity> byCode = new LinkedHashMap<>();
    Map<Long, OrganizationEntity> byId = new HashMap<>();
    for (OrganizationEntity row : rows) {
      byId.put(row.getId(), row);
      OrganizationEntity existing = byCode.get(row.getCode());
      if (existing == null
          || row.getEffectiveStartDate().isAfter(existing.getEffectiveStartDate())) {
        byCode.put(row.getCode(), row);
      }
    }
    List<EmployeeEntity> allEmployees = employeeMapper.selectList(new LambdaQueryWrapper<>());
    Map<String, EmployeeEntity> byNo = allEmployees.stream()
        .filter(e -> e.getEmployeeNo() != null && !e.getEmployeeNo().isBlank())
        .collect(Collectors.toMap(
            e -> e.getEmployeeNo().trim(),
            e -> e,
            (a, b) -> a
        ));
    Map<Long, EmployeeEntity> byEmpId = allEmployees.stream()
        .collect(Collectors.toMap(EmployeeEntity::getId, e -> e, (a, b) -> a));
    return new Snapshot(asOf, byCode, byId, byNo, byEmpId);
  }

  public List<EmployeeEntity> deriveChain(EmployeeEntity employee, LocalDate asOfDate) {
    return deriveChain(employee, loadSnapshot(asOfDate));
  }

  public List<EmployeeEntity> deriveChain(EmployeeEntity employee, Snapshot snapshot) {
    List<EmployeeEntity> chain = new ArrayList<>();
    if (employee == null) return chain;
    Set<Long> seenIds = new HashSet<>();
    chain.add(employee);
    seenIds.add(employee.getId());

    EmployeeAssignmentEntity primary = findPrimaryAssignment(employee.getId(), snapshot.asOfDate());
    if (primary == null || primary.getOrganizationId() == null) return chain;

    OrganizationEntity org = resolveOrg(primary.getOrganizationId(), snapshot);
    Set<String> visitedOrgCodes = new HashSet<>();
    while (org != null) {
      if (org.getCode() != null && !org.getCode().isBlank()) {
        if (!visitedOrgCodes.add(org.getCode())) break;
      }
      appendLeader(chain, seenIds, org.getOrgLeaderNo(), snapshot);
      appendLeader(chain, seenIds, org.getSupervisingLeaderNo(), snapshot);
      String parentCode = org.getParentCode();
      if (parentCode == null || parentCode.isBlank()) break;
      org = snapshot.byCode().get(parentCode);
    }
    return chain;
  }

  public String formatChainNames(List<EmployeeEntity> chain) {
    if (chain == null || chain.isEmpty()) return "";
    return chain.stream()
        .map(e -> e.getFullName() == null || e.getFullName().isBlank() ? e.getEmployeeNo() : e.getFullName())
        .filter(Objects::nonNull)
        .collect(Collectors.joining(" > "));
  }

  public List<String> formatChainNos(List<EmployeeEntity> chain) {
    if (chain == null || chain.isEmpty()) return List.of();
    return chain.stream()
        .map(EmployeeEntity::getEmployeeNo)
        .filter(no -> no != null && !no.isBlank())
        .toList();
  }

  /** 衍生链中本人之后的第一位即为默认直接上级 */
  public EmployeeEntity deriveDirectManager(EmployeeEntity employee, Snapshot snapshot) {
    List<EmployeeEntity> chain = deriveChain(employee, snapshot);
    return chain.size() >= 2 ? chain.get(1) : null;
  }

  /**
   * 按目标组织推导默认直属上级（无在职员工时，如入职办理）。
   * 口径同汇报关系规则：本层负责人 → 分管领导，再沿上级组织上溯，取第一位。
   */
  public EmployeeEntity deriveDirectManagerFromOrganization(Long organizationId, Snapshot snapshot) {
    if (organizationId == null || snapshot == null) return null;
    OrganizationEntity org = resolveOrg(organizationId, snapshot);
    Set<String> visitedOrgCodes = new HashSet<>();
    while (org != null) {
      if (org.getCode() != null && !org.getCode().isBlank()) {
        if (!visitedOrgCodes.add(org.getCode())) break;
      }
      EmployeeEntity leader = resolveLeaderByNo(org.getOrgLeaderNo(), snapshot);
      if (leader != null) return leader;
      EmployeeEntity supervising = resolveLeaderByNo(org.getSupervisingLeaderNo(), snapshot);
      if (supervising != null) return supervising;
      String parentCode = org.getParentCode();
      if (parentCode == null || parentCode.isBlank()) break;
      org = snapshot.byCode().get(parentCode);
    }
    return null;
  }

  private EmployeeEntity resolveLeaderByNo(String employeeNo, Snapshot snapshot) {
    if (employeeNo == null || employeeNo.isBlank()) return null;
    return snapshot.byNo().get(employeeNo.trim());
  }

  private void appendLeader(
      List<EmployeeEntity> chain,
      Set<Long> seenIds,
      String employeeNo,
      Snapshot snapshot
  ) {
    if (employeeNo == null || employeeNo.isBlank()) return;
    EmployeeEntity leader = snapshot.byNo().get(employeeNo.trim());
    if (leader == null || seenIds.contains(leader.getId())) return;
    chain.add(leader);
    seenIds.add(leader.getId());
  }

  private OrganizationEntity resolveOrg(Long organizationId, Snapshot snapshot) {
    if (organizationId == null) return null;
    OrganizationEntity fromSnapshot = snapshot.byId().get(organizationId);
    if (fromSnapshot != null) {
      OrganizationEntity asOf = snapshot.byCode().get(fromSnapshot.getCode());
      return asOf != null ? asOf : fromSnapshot;
    }
    OrganizationEntity raw = organizationMapper.selectById(organizationId);
    if (raw == null || raw.getCode() == null) return raw;
    OrganizationEntity asOf = snapshot.byCode().get(raw.getCode());
    if (asOf != null) return asOf;
    return organizationService.findActiveByCode(raw.getCode(), snapshot.asOfDate());
  }

  private EmployeeAssignmentEntity findPrimaryAssignment(long employeeId, LocalDate asOfDate) {
    List<EmployeeAssignmentEntity> list = assignmentMapper.selectList(
        new LambdaQueryWrapper<EmployeeAssignmentEntity>()
            .eq(EmployeeAssignmentEntity::getEmployeeId, employeeId)
            .eq(EmployeeAssignmentEntity::getIsPrimary, true)
            .le(EmployeeAssignmentEntity::getEffectiveStartDate, asOfDate)
            .and(w -> w.isNull(EmployeeAssignmentEntity::getEffectiveEndDate)
                .or().ge(EmployeeAssignmentEntity::getEffectiveEndDate, asOfDate))
            .orderByDesc(EmployeeAssignmentEntity::getEffectiveStartDate)
            .last("LIMIT 1")
    );
    return list.isEmpty() ? null : list.get(0);
  }

  public record Snapshot(
      LocalDate asOfDate,
      Map<String, OrganizationEntity> byCode,
      Map<Long, OrganizationEntity> byId,
      Map<String, EmployeeEntity> byNo,
      Map<Long, EmployeeEntity> byEmpId
  ) {}
}
