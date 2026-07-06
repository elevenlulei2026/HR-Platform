package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ReportingLineService {
  private final ReportingLineMapper reportingLineMapper;
  private final EmployeeMapper employeeMapper;

  public ReportingLineService(
      ReportingLineMapper reportingLineMapper,
      EmployeeMapper employeeMapper
  ) {
    this.reportingLineMapper = reportingLineMapper;
    this.employeeMapper = employeeMapper;
  }

  public PageResult page(String keyword, LocalDate asOfDate, String lineType, long page, long pageSize) {
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

    if (keyword != null && !keyword.isBlank()) {
      String kw = keyword.trim();
      List<Long> empIds = employeeMapper.selectList(
          new LambdaQueryWrapper<EmployeeEntity>()
              .and(w -> w.like(EmployeeEntity::getFullName, kw)
                  .or().like(EmployeeEntity::getEmployeeNo, kw))
      ).stream().map(EmployeeEntity::getId).toList();
      if (empIds.isEmpty()) return new PageResult(List.of(), 0);
      qw.and(w -> w.in(ReportingLineEntity::getEmployeeId, empIds)
          .or().in(ReportingLineEntity::getManagerEmployeeId, empIds));
    }

    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    Long total = reportingLineMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    return new PageResult(reportingLineMapper.selectList(qw), total == null ? 0 : total);
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

  public record PageResult(List<ReportingLineEntity> records, long total) {}

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
