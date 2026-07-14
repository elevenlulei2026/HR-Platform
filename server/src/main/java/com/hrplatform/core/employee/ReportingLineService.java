package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.organization.OrganizationMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ReportingLineService {
  private final ReportingLineMapper reportingLineMapper;
  private final EmployeeMapper employeeMapper;
  private final EmployeeAssignmentMapper assignmentMapper;
  private final OrganizationMapper organizationMapper;
  private final EmployeeMasterVersionMapper masterVersionMapper;
  private final ReportingChainService reportingChainService;
  private final EmployeeService employeeService;

  public ReportingLineService(
      ReportingLineMapper reportingLineMapper,
      EmployeeMapper employeeMapper,
      EmployeeAssignmentMapper assignmentMapper,
      OrganizationMapper organizationMapper,
      EmployeeMasterVersionMapper masterVersionMapper,
      ReportingChainService reportingChainService,
      EmployeeService employeeService
  ) {
    this.reportingLineMapper = reportingLineMapper;
    this.employeeMapper = employeeMapper;
    this.assignmentMapper = assignmentMapper;
    this.organizationMapper = organizationMapper;
    this.masterVersionMapper = masterVersionMapper;
    this.reportingChainService = reportingChainService;
    this.employeeService = employeeService;
  }

  public PageResult page(
      String keyword,
      LocalDate asOfDate,
      String lineType,
      Long organizationId,
      String status,
      long page,
      long pageSize
  ) {
    LocalDate asOf = asOfDate == null ? LocalDate.now() : asOfDate;
    LambdaQueryWrapper<ReportingLineEntity> qw = new LambdaQueryWrapper<ReportingLineEntity>()
        .le(ReportingLineEntity::getEffectiveStartDate, asOf)
        .and(w -> w.isNull(ReportingLineEntity::getEffectiveEndDate)
            .or().ge(ReportingLineEntity::getEffectiveEndDate, asOf))
        .orderByDesc(ReportingLineEntity::getEffectiveStartDate)
        .orderByDesc(ReportingLineEntity::getId);

    if (lineType != null && !lineType.isBlank()) {
      qw.eq(ReportingLineEntity::getLineType, lineType.trim().toUpperCase());
    }

    Set<Long> employeeIdFilter = null;

    if (keyword != null && !keyword.isBlank()) {
      String kw = keyword.trim();
      List<Long> empIds = employeeMapper.selectList(
          new LambdaQueryWrapper<EmployeeEntity>()
              .and(w -> w.like(EmployeeEntity::getFullName, kw)
                  .or().like(EmployeeEntity::getEmployeeNo, kw))
      ).stream().map(EmployeeEntity::getId).toList();
      if (empIds.isEmpty()) return new PageResult(List.of(), 0);
      employeeIdFilter = new HashSet<>(empIds);
    }

    if (organizationId != null) {
      List<Long> orgIds = organizationMapper.selectOrgSubtreeIds(organizationId);
      if (orgIds == null || orgIds.isEmpty()) return new PageResult(List.of(), 0);
      List<Long> assignmentEmpIds = assignmentMapper.selectList(
          new LambdaQueryWrapper<EmployeeAssignmentEntity>()
              .eq(EmployeeAssignmentEntity::getIsPrimary, true)
              .in(EmployeeAssignmentEntity::getOrganizationId, orgIds)
              .le(EmployeeAssignmentEntity::getEffectiveStartDate, asOf)
              .and(w -> w.isNull(EmployeeAssignmentEntity::getEffectiveEndDate)
                  .or().ge(EmployeeAssignmentEntity::getEffectiveEndDate, asOf))
      ).stream().map(EmployeeAssignmentEntity::getEmployeeId).distinct().toList();
      if (assignmentEmpIds.isEmpty()) return new PageResult(List.of(), 0);
      if (employeeIdFilter == null) {
        employeeIdFilter = new HashSet<>(assignmentEmpIds);
      } else {
        employeeIdFilter.retainAll(assignmentEmpIds);
        if (employeeIdFilter.isEmpty()) return new PageResult(List.of(), 0);
      }
    }

    if (status != null && !status.isBlank()) {
      List<Long> statusIds = findEmployeeIdsByStatus(status.trim().toUpperCase(), asOf);
      if (statusIds.isEmpty()) return new PageResult(List.of(), 0);
      if (employeeIdFilter == null) {
        employeeIdFilter = new HashSet<>(statusIds);
      } else {
        employeeIdFilter.retainAll(statusIds);
        if (employeeIdFilter.isEmpty()) return new PageResult(List.of(), 0);
      }
    }

    if (employeeIdFilter != null) {
      Set<Long> ids = employeeIdFilter;
      // 关键词：下属或上级命中均可；部门/状态：仅按下属员工过滤
      boolean keywordOnly = (organizationId == null)
          && (status == null || status.isBlank())
          && keyword != null
          && !keyword.isBlank();
      if (keywordOnly) {
        qw.and(w -> w.in(ReportingLineEntity::getEmployeeId, ids)
            .or().in(ReportingLineEntity::getManagerEmployeeId, ids));
      } else {
        qw.in(ReportingLineEntity::getEmployeeId, ids);
      }
    }

    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    Long total = reportingLineMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    return new PageResult(reportingLineMapper.selectList(qw), total == null ? 0 : total);
  }

  private List<Long> findEmployeeIdsByStatus(String status, LocalDate asOf) {
    return masterVersionMapper.selectList(
            new LambdaQueryWrapper<EmployeeMasterVersionEntity>()
                .select(EmployeeMasterVersionEntity::getEmployeeId)
                .eq(EmployeeMasterVersionEntity::getStatus, status)
                .le(EmployeeMasterVersionEntity::getEffectiveStartDate, asOf)
                .and(w -> w.isNull(EmployeeMasterVersionEntity::getEffectiveEndDate)
                    .or().ge(EmployeeMasterVersionEntity::getEffectiveEndDate, asOf))
        ).stream()
        .map(EmployeeMasterVersionEntity::getEmployeeId)
        .distinct()
        .toList();
  }

  public ReportingLineEntity require(long id) {
    ReportingLineEntity e = reportingLineMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("汇报关系不存在");
    return e;
  }

  @Transactional
  public ReportingLineEntity create(CreateCommand cmd) {
    if (cmd.employeeId().equals(cmd.managerEmployeeId())) {
      throw new IllegalArgumentException("下属与上级不能为同一人");
    }
    if (employeeMapper.selectById(cmd.employeeId()) == null) {
      throw new IllegalArgumentException("下属员工不存在");
    }
    if (employeeMapper.selectById(cmd.managerEmployeeId()) == null) {
      throw new IllegalArgumentException("上级员工不存在");
    }
    ReportingLineEntity entity = new ReportingLineEntity();
    entity.setEmployeeId(cmd.employeeId());
    entity.setManagerEmployeeId(cmd.managerEmployeeId());
    entity.setLineType(cmd.lineType() == null || cmd.lineType().isBlank() ? "DIRECT" : cmd.lineType().trim().toUpperCase());
    entity.setEffectiveStartDate(cmd.effectiveStartDate());
    entity.setEffectiveEndDate(cmd.effectiveEndDate());
    reportingLineMapper.insert(entity);
    return require(entity.getId());
  }

  @Transactional
  public ReportingLineEntity update(long id, UpdateCommand cmd) {
    ReportingLineEntity cur = require(id);
    if (cmd.managerEmployeeId() != null) {
      if (cur.getEmployeeId().equals(cmd.managerEmployeeId())) {
        throw new IllegalArgumentException("下属与上级不能为同一人");
      }
      if (employeeMapper.selectById(cmd.managerEmployeeId()) == null) {
        throw new IllegalArgumentException("上级员工不存在");
      }
      cur.setManagerEmployeeId(cmd.managerEmployeeId());
    }
    if (cmd.lineType() != null) cur.setLineType(cmd.lineType().trim().toUpperCase());
    if (cmd.effectiveStartDate() != null) cur.setEffectiveStartDate(cmd.effectiveStartDate());
    if (cmd.effectiveEndDate() != null) cur.setEffectiveEndDate(cmd.effectiveEndDate());
    reportingLineMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public void delete(long id) {
    require(id);
    reportingLineMapper.deleteById(id);
  }

  /**
   * 按组织负责人/分管领导推导默认直接上级，同步为 DIRECT 边。
   * 已存在且上级相同则不变；上级变化则关闭旧版本并新建（生效日起）。
   * 虚线 DOTTED 不参与同步、不被覆盖。
   */
  @Transactional
  public SyncResult syncFromOrg(LocalDate asOfDate) {
    LocalDate asOf = asOfDate == null ? LocalDate.now() : asOfDate;
    ReportingChainService.Snapshot snapshot = reportingChainService.loadSnapshot(asOf);

    List<EmployeeEntity> employees = employeeMapper.selectList(
        new LambdaQueryWrapper<EmployeeEntity>()
            .ne(EmployeeEntity::getStatus, "TERMINATED")
    );

    int created = 0;
    int updated = 0;
    int unchanged = 0;
    int skipped = 0;

    for (EmployeeEntity emp : employees) {
      EmployeeEntity manager = reportingChainService.deriveDirectManager(emp, snapshot);
      if (manager == null) {
        skipped++;
        continue;
      }

      ReportingLineEntity current = findActiveDirect(emp.getId(), asOf);
      if (current != null && Objects.equals(current.getManagerEmployeeId(), manager.getId())) {
        unchanged++;
        continue;
      }

      if (current != null) {
        LocalDate end = asOf.minusDays(1);
        if (end.isBefore(current.getEffectiveStartDate())) {
          end = current.getEffectiveStartDate();
        }
        current.setEffectiveEndDate(end);
        reportingLineMapper.updateById(current);
        updated++;
      } else {
        created++;
      }

      ReportingLineEntity neu = new ReportingLineEntity();
      neu.setEmployeeId(emp.getId());
      neu.setManagerEmployeeId(manager.getId());
      neu.setLineType("DIRECT");
      neu.setEffectiveStartDate(asOf);
      neu.setEffectiveEndDate(null);
      reportingLineMapper.insert(neu);
      if (current != null) {
        // updated already counted as close+reopen
      } else {
        // created counted
      }
    }

    return new SyncResult(employees.size(), created, updated, unchanged, skipped);
  }

  private ReportingLineEntity findActiveDirect(long employeeId, LocalDate asOf) {
    List<ReportingLineEntity> list = reportingLineMapper.selectList(
        new LambdaQueryWrapper<ReportingLineEntity>()
            .eq(ReportingLineEntity::getEmployeeId, employeeId)
            .eq(ReportingLineEntity::getLineType, "DIRECT")
            .le(ReportingLineEntity::getEffectiveStartDate, asOf)
            .and(w -> w.isNull(ReportingLineEntity::getEffectiveEndDate)
                .or().ge(ReportingLineEntity::getEffectiveEndDate, asOf))
            .orderByDesc(ReportingLineEntity::getEffectiveStartDate)
            .orderByDesc(ReportingLineEntity::getId)
            .last("LIMIT 1")
    );
    return list.isEmpty() ? null : list.get(0);
  }

  public Map<Long, EmployeeEntity> employeeMap(List<ReportingLineEntity> lines) {
    Set<Long> ids = new HashSet<>();
    for (ReportingLineEntity l : lines) {
      ids.add(l.getEmployeeId());
      ids.add(l.getManagerEmployeeId());
    }
    if (ids.isEmpty()) return Map.of();
    return employeeMapper.selectBatchIds(ids).stream()
        .collect(Collectors.toMap(EmployeeEntity::getId, e -> e, (a, b) -> a));
  }

  /** 为列表记录批量补充完整汇报线（基于下属员工的组织衍生链） */
  public Map<Long, ChainDisplay> chainDisplayMap(List<ReportingLineEntity> lines, LocalDate asOfDate) {
    if (lines == null || lines.isEmpty()) return Map.of();
    ReportingChainService.Snapshot snapshot = reportingChainService.loadSnapshot(asOfDate);
    Map<Long, ChainDisplay> out = new HashMap<>();
    for (ReportingLineEntity line : lines) {
      if (out.containsKey(line.getEmployeeId())) continue;
      EmployeeEntity emp = snapshot.byEmpId().get(line.getEmployeeId());
      if (emp == null) {
        emp = employeeMapper.selectById(line.getEmployeeId());
      }
      if (emp == null) {
        out.put(line.getEmployeeId(), new ChainDisplay("", List.of()));
        continue;
      }
      List<EmployeeEntity> chain = reportingChainService.deriveChain(emp, snapshot);
      out.put(
          line.getEmployeeId(),
          new ChainDisplay(
              reportingChainService.formatChainNames(chain),
              reportingChainService.formatChainNos(chain)
          )
      );
    }
    return out;
  }

  /** 下属主任职组织路径（employeeId → path） */
  public Map<Long, String> organizationPathByEmployeeId(List<ReportingLineEntity> lines, LocalDate asOfDate) {
    if (lines == null || lines.isEmpty()) return Map.of();
    List<Long> empIds = lines.stream().map(ReportingLineEntity::getEmployeeId).distinct().toList();
    Map<Long, EmployeeAssignmentEntity> primaryMap = employeeService.primaryAssignmentMap(empIds, asOfDate);
    List<Long> orgIds = primaryMap.values().stream()
        .map(EmployeeAssignmentEntity::getOrganizationId)
        .filter(id -> id != null)
        .distinct()
        .toList();
    Map<Long, String> pathByOrgId = employeeService.organizationPathMap(orgIds, asOfDate);
    Map<Long, String> out = new HashMap<>();
    for (Long empId : empIds) {
      EmployeeAssignmentEntity pa = primaryMap.get(empId);
      if (pa == null || pa.getOrganizationId() == null) {
        out.put(empId, null);
        continue;
      }
      out.put(empId, pathByOrgId.get(pa.getOrganizationId()));
    }
    return out;
  }

  public record PageResult(List<ReportingLineEntity> records, long total) {}

  public record SyncResult(int scanned, int created, int updated, int unchanged, int skipped) {}

  public record ChainDisplay(String reportingChain, List<String> reportingChainNos) {}

  public record CreateCommand(
      Long employeeId,
      Long managerEmployeeId,
      String lineType,
      LocalDate effectiveStartDate,
      LocalDate effectiveEndDate
  ) {}

  public record UpdateCommand(
      Long managerEmployeeId,
      String lineType,
      LocalDate effectiveStartDate,
      LocalDate effectiveEndDate
  ) {}
}
