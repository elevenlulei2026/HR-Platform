package com.hrplatform.core.organization;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeAssignmentEntity;
import com.hrplatform.core.employee.EmployeeAssignmentMapper;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeMapper;
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
 * 组织图：树节点直属汇总 + 部门下岗位/人员下钻。
 */
@Service
public class OrganizationOverviewService {
  private final OrganizationService organizationService;
  private final PositionService positionService;
  private final EmployeeAssignmentMapper assignmentMapper;
  private final EmployeeMapper employeeMapper;
  private final PositionMapper positionMapper;

  public OrganizationOverviewService(
      OrganizationService organizationService,
      PositionService positionService,
      EmployeeAssignmentMapper assignmentMapper,
      EmployeeMapper employeeMapper,
      PositionMapper positionMapper
  ) {
    this.organizationService = organizationService;
    this.positionService = positionService;
    this.assignmentMapper = assignmentMapper;
    this.employeeMapper = employeeMapper;
    this.positionMapper = positionMapper;
  }

  public TreeEnrichment enrichTree(LocalDate asOfDate) {
    LocalDate date = asOfDate == null ? LocalDate.now() : asOfDate;
    Map<Long, Integer> positionCounts = positionService.countByOrganization(date);
    Map<Long, Integer> employeeCounts = countPrimaryEmployeesByOrganization(date);
    return new TreeEnrichment(positionCounts, employeeCounts, Map.of());
  }

  public Map<String, String> resolveLeaderNames(List<OrganizationService.TreeNode> tree) {
    Set<String> nos = new HashSet<>();
    collectLeaderNos(tree, nos);
    if (nos.isEmpty()) return Map.of();
    List<EmployeeEntity> employees = employeeMapper.selectList(
        new LambdaQueryWrapper<EmployeeEntity>().in(EmployeeEntity::getEmployeeNo, nos)
    );
    Map<String, String> out = new HashMap<>();
    for (EmployeeEntity e : employees) {
      if (e.getEmployeeNo() != null && e.getFullName() != null && !e.getFullName().isBlank()) {
        out.put(e.getEmployeeNo(), e.getFullName());
      }
    }
    return out;
  }

  public MembersOverview membersOverview(
      long organizationId,
      LocalDate asOfDate,
      boolean includeSubtree,
      int limit
  ) {
    LocalDate date = asOfDate == null ? LocalDate.now() : asOfDate;
    int capped = Math.max(1, Math.min(limit <= 0 ? 100 : limit, 200));

    OrganizationEntity root = organizationService.require(organizationId);
    // 校验根节点在快照日是否仍可作为树节点（允许历史版本 id）
    List<OrganizationService.TreeNode> tree = organizationService.getTree(date);
    OrganizationService.TreeNode matched = findNodeById(tree, organizationId);
    if (matched == null) {
      // 若 id 对应版本不在当日树中，仍允许按该部门 code 找当日版本
      OrganizationEntity active = organizationService.findActiveByCode(root.getCode(), date);
      if (active == null) {
        throw new IllegalArgumentException("该部门在指定日期无有效版本");
      }
      organizationId = active.getId();
      root = active;
      matched = findNodeById(tree, organizationId);
    }

    List<Long> orgIds;
    Map<Long, OrganizationEntity> orgById = new HashMap<>();
    if (includeSubtree && matched != null) {
      orgIds = new ArrayList<>();
      collectOrgIds(matched, orgIds, orgById);
    } else {
      orgIds = List.of(organizationId);
      orgById.put(organizationId, root);
    }

    List<PositionEntity> allPositions = positionService.listSnapshotByOrganizationIds(orgIds, date);
    List<AssignmentRow> allAssignments = listPrimaryAssignments(orgIds, date);

    List<PositionEntity> positions = allPositions.size() > capped
        ? allPositions.subList(0, capped)
        : allPositions;
    List<AssignmentRow> assignments = allAssignments.size() > capped
        ? allAssignments.subList(0, capped)
        : allAssignments;

    Set<Long> empIds = assignments.stream().map(AssignmentRow::employeeId).collect(Collectors.toSet());
    Map<Long, EmployeeEntity> empMap = empIds.isEmpty()
        ? Map.of()
        : employeeMapper.selectBatchIds(empIds).stream()
            .collect(Collectors.toMap(EmployeeEntity::getId, e -> e, (a, b) -> a));

    Set<Long> posIds = assignments.stream()
        .map(AssignmentRow::positionId)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
    Map<Long, PositionEntity> posMap = posIds.isEmpty()
        ? Map.of()
        : positionMapper.selectBatchIds(posIds).stream()
            .collect(Collectors.toMap(PositionEntity::getId, p -> p, (a, b) -> a));

    List<OverviewPosition> positionDtos = positions.stream()
        .map(p -> {
          OrganizationEntity org = orgById.get(p.getOrganizationId());
          return new OverviewPosition(
              p,
              org == null ? null : org.getName()
          );
        })
        .toList();

    List<OverviewEmployee> employeeDtos = new ArrayList<>();
    for (AssignmentRow row : assignments) {
      EmployeeEntity emp = empMap.get(row.employeeId());
      if (emp == null) continue;
      PositionEntity pos = row.positionId() == null ? null : posMap.get(row.positionId());
      OrganizationEntity org = orgById.get(row.organizationId());
      employeeDtos.add(new OverviewEmployee(
          emp,
          pos == null ? null : pos.getId(),
          pos == null ? null : pos.getName(),
          row.organizationId(),
          org == null ? null : org.getName()
      ));
    }

    return new MembersOverview(
        root.getId(),
        root.getCode(),
        root.getName(),
        date,
        includeSubtree,
        allPositions.size(),
        allAssignments.size(),
        positionDtos,
        employeeDtos
    );
  }

  private Map<Long, Integer> countPrimaryEmployeesByOrganization(LocalDate asOfDate) {
    List<EmployeeAssignmentEntity> rows = assignmentMapper.selectList(
        new LambdaQueryWrapper<EmployeeAssignmentEntity>()
            .eq(EmployeeAssignmentEntity::getIsPrimary, true)
            .le(EmployeeAssignmentEntity::getEffectiveStartDate, asOfDate)
            .and(w -> w.isNull(EmployeeAssignmentEntity::getEffectiveEndDate)
                .or().ge(EmployeeAssignmentEntity::getEffectiveEndDate, asOfDate))
    );
    // 同一员工多条主任职时取最新生效开始日
    Map<Long, EmployeeAssignmentEntity> latestByEmp = new LinkedHashMap<>();
    for (EmployeeAssignmentEntity row : rows) {
      if (row.getEmployeeId() == null || row.getOrganizationId() == null) continue;
      EmployeeAssignmentEntity existing = latestByEmp.get(row.getEmployeeId());
      if (existing == null
          || row.getEffectiveStartDate().isAfter(existing.getEffectiveStartDate())) {
        latestByEmp.put(row.getEmployeeId(), row);
      }
    }
    Map<Long, Integer> counts = new HashMap<>();
    for (EmployeeAssignmentEntity row : latestByEmp.values()) {
      counts.merge(row.getOrganizationId(), 1, Integer::sum);
    }
    return counts;
  }

  private List<AssignmentRow> listPrimaryAssignments(List<Long> orgIds, LocalDate asOfDate) {
    if (orgIds == null || orgIds.isEmpty()) return List.of();
    List<EmployeeAssignmentEntity> rows = assignmentMapper.selectList(
        new LambdaQueryWrapper<EmployeeAssignmentEntity>()
            .eq(EmployeeAssignmentEntity::getIsPrimary, true)
            .in(EmployeeAssignmentEntity::getOrganizationId, orgIds)
            .le(EmployeeAssignmentEntity::getEffectiveStartDate, asOfDate)
            .and(w -> w.isNull(EmployeeAssignmentEntity::getEffectiveEndDate)
                .or().ge(EmployeeAssignmentEntity::getEffectiveEndDate, asOfDate))
            .orderByAsc(EmployeeAssignmentEntity::getEmployeeId)
    );
    Map<Long, EmployeeAssignmentEntity> latestByEmp = new LinkedHashMap<>();
    for (EmployeeAssignmentEntity row : rows) {
      if (row.getEmployeeId() == null) continue;
      EmployeeAssignmentEntity existing = latestByEmp.get(row.getEmployeeId());
      if (existing == null
          || row.getEffectiveStartDate().isAfter(existing.getEffectiveStartDate())) {
        latestByEmp.put(row.getEmployeeId(), row);
      }
    }
    return latestByEmp.values().stream()
        .sorted((a, b) -> {
          long ea = a.getEmployeeId() == null ? 0 : a.getEmployeeId();
          long eb = b.getEmployeeId() == null ? 0 : b.getEmployeeId();
          return Long.compare(ea, eb);
        })
        .map(a -> new AssignmentRow(a.getEmployeeId(), a.getPositionId(), a.getOrganizationId()))
        .toList();
  }

  private static void collectLeaderNos(List<OrganizationService.TreeNode> nodes, Set<String> nos) {
    for (OrganizationService.TreeNode n : nodes) {
      String leader = n.entity().getOrgLeaderNo();
      if (leader != null && !leader.isBlank()) nos.add(leader.trim());
      collectLeaderNos(n.children(), nos);
    }
  }

  private static OrganizationService.TreeNode findNodeById(
      List<OrganizationService.TreeNode> nodes,
      long id
  ) {
    for (OrganizationService.TreeNode n : nodes) {
      if (n.entity().getId() != null && n.entity().getId() == id) return n;
      OrganizationService.TreeNode found = findNodeById(n.children(), id);
      if (found != null) return found;
    }
    return null;
  }

  private static void collectOrgIds(
      OrganizationService.TreeNode node,
      List<Long> out,
      Map<Long, OrganizationEntity> orgById
  ) {
    Long id = node.entity().getId();
    if (id != null) {
      out.add(id);
      orgById.put(id, node.entity());
    }
    for (OrganizationService.TreeNode child : node.children()) {
      collectOrgIds(child, out, orgById);
    }
  }

  public record TreeEnrichment(
      Map<Long, Integer> positionCounts,
      Map<Long, Integer> employeeCounts,
      Map<String, String> leaderNames
  ) {}

  public record MembersOverview(
      long organizationId,
      String organizationCode,
      String organizationName,
      LocalDate asOfDate,
      boolean includeSubtree,
      int positionTotal,
      int employeeTotal,
      List<OverviewPosition> positions,
      List<OverviewEmployee> employees
  ) {}

  public record OverviewPosition(PositionEntity entity, String organizationName) {}

  public record OverviewEmployee(
      EmployeeEntity entity,
      Long positionId,
      String positionName,
      Long organizationId,
      String organizationName
  ) {}

  private record AssignmentRow(Long employeeId, Long positionId, Long organizationId) {}
}
