package com.hrplatform.core.headcount;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.organization.LegalEntityService;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.OrganizationMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class HeadcountService {
  private final HeadcountPlanMapper headcountPlanMapper;
  private final OrganizationMapper organizationMapper;

  public HeadcountService(HeadcountPlanMapper headcountPlanMapper, OrganizationMapper organizationMapper) {
    this.headcountPlanMapper = headcountPlanMapper;
    this.organizationMapper = organizationMapper;
  }

  public LegalEntityService.PageResult<HeadcountPlanEntity> page(String keyword, Integer fiscalYear, long page, long pageSize) {
    LambdaQueryWrapper<HeadcountPlanEntity> qw = new LambdaQueryWrapper<HeadcountPlanEntity>()
        .orderByDesc(HeadcountPlanEntity::getFiscalYear)
        .orderByAsc(HeadcountPlanEntity::getOrganizationId);
    if (fiscalYear != null) qw.eq(HeadcountPlanEntity::getFiscalYear, fiscalYear);
    if (keyword != null && !keyword.isBlank()) {
      List<Long> orgIds = organizationMapper.selectList(
          new LambdaQueryWrapper<OrganizationEntity>()
              .and(w -> w.like(OrganizationEntity::getCode, keyword.trim())
                  .or().like(OrganizationEntity::getName, keyword.trim()))
      ).stream().map(OrganizationEntity::getId).distinct().toList();
      if (orgIds.isEmpty()) {
        return new LegalEntityService.PageResult<>(List.of(), 0);
      }
      qw.in(HeadcountPlanEntity::getOrganizationId, orgIds);
    }
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    Long total = headcountPlanMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    return new LegalEntityService.PageResult<>(headcountPlanMapper.selectList(qw), total == null ? 0 : total);
  }

  public HeadcountPlanEntity require(long id) {
    HeadcountPlanEntity e = headcountPlanMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("编制计划不存在");
    return e;
  }

  public Map<Long, OrganizationEntity> orgMap(List<HeadcountPlanEntity> items) {
    if (items.isEmpty()) return Map.of();
    return organizationMapper.selectBatchIds(
        items.stream().map(HeadcountPlanEntity::getOrganizationId).distinct().toList()
    ).stream().collect(Collectors.toMap(OrganizationEntity::getId, o -> o, (a, b) -> a));
  }

  @Transactional
  public HeadcountPlanEntity create(HeadcountPlanEntity entity) {
    if (entity.getOrganizationId() == null) throw new IllegalArgumentException("organizationId 不能为空");
    if (entity.getFiscalYear() == null) throw new IllegalArgumentException("fiscalYear 不能为空");
    if (organizationMapper.selectById(entity.getOrganizationId()) == null) {
      throw new IllegalArgumentException("组织不存在");
    }
    Long dup = headcountPlanMapper.selectCount(
        new LambdaQueryWrapper<HeadcountPlanEntity>()
            .eq(HeadcountPlanEntity::getOrganizationId, entity.getOrganizationId())
            .eq(HeadcountPlanEntity::getFiscalYear, entity.getFiscalYear())
    );
    if (dup != null && dup > 0) throw new IllegalArgumentException("该部门年度编制已存在");
    if (entity.getPlannedCount() == null) entity.setPlannedCount(0);
    if (entity.getOccupiedCount() == null) entity.setOccupiedCount(0);
    if (entity.getReservedCount() == null) entity.setReservedCount(0);
    headcountPlanMapper.insert(entity);
    return require(entity.getId());
  }

  @Transactional
  public HeadcountPlanEntity update(long id, HeadcountPlanEntity patch) {
    HeadcountPlanEntity cur = require(id);
    if (patch.getPlannedCount() != null) cur.setPlannedCount(patch.getPlannedCount());
    if (patch.getOccupiedCount() != null) cur.setOccupiedCount(patch.getOccupiedCount());
    if (patch.getReservedCount() != null) cur.setReservedCount(patch.getReservedCount());
    headcountPlanMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public void delete(long id) {
    headcountPlanMapper.deleteById(id);
  }

  public CheckResult check(long organizationId, int fiscalYear, int delta) {
    HeadcountPlanEntity plan = headcountPlanMapper.selectOne(
        new LambdaQueryWrapper<HeadcountPlanEntity>()
            .eq(HeadcountPlanEntity::getOrganizationId, organizationId)
            .eq(HeadcountPlanEntity::getFiscalYear, fiscalYear)
            .last("LIMIT 1")
    );
    int planned = plan == null ? 0 : (plan.getPlannedCount() == null ? 0 : plan.getPlannedCount());
    int occupied = plan == null ? 0 : (plan.getOccupiedCount() == null ? 0 : plan.getOccupiedCount());
    int reserved = plan == null ? 0 : (plan.getReservedCount() == null ? 0 : plan.getReservedCount());
    int available = Math.max(0, planned - occupied - reserved);
    int need = Math.max(1, delta);
    boolean allowed = occupied + reserved + need <= planned;
    String reason = allowed ? null : String.format(
        "编制不足：计划 %d，已用 %d，在途 %d，可用 %d，本次需 %d",
        planned, occupied, reserved, available, need
    );
    return new CheckResult(allowed, organizationId, fiscalYear, planned, occupied, reserved, available, reason);
  }

  public int defaultFiscalYear() {
    return LocalDate.now().getYear();
  }

  public record CheckResult(
      boolean allowed,
      long organizationId,
      int fiscalYear,
      int plannedCount,
      int occupiedCount,
      int reservedCount,
      int availableCount,
      String reason
  ) {}
}
