package com.hrplatform.core.organization;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CostCenterService {
  private final CostCenterMapper costCenterMapper;
  private final LegalEntityMapper legalEntityMapper;

  public CostCenterService(CostCenterMapper costCenterMapper, LegalEntityMapper legalEntityMapper) {
    this.costCenterMapper = costCenterMapper;
    this.legalEntityMapper = legalEntityMapper;
  }

  public LegalEntityService.PageResult<CostCenterEntity> page(String keyword, Long legalEntityId, long page, long pageSize) {
    LambdaQueryWrapper<CostCenterEntity> qw = new LambdaQueryWrapper<CostCenterEntity>()
        .orderByAsc(CostCenterEntity::getCode);
    if (keyword != null && !keyword.isBlank()) {
      String k = keyword.trim();
      qw.and(w -> w.like(CostCenterEntity::getCode, k).or().like(CostCenterEntity::getName, k));
    }
    if (legalEntityId != null) qw.eq(CostCenterEntity::getLegalEntityId, legalEntityId);
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    Long total = costCenterMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    return new LegalEntityService.PageResult<>(costCenterMapper.selectList(qw), total == null ? 0 : total);
  }

  public CostCenterEntity require(long id) {
    CostCenterEntity e = costCenterMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("成本中心不存在");
    return e;
  }

  public Map<Long, String> legalEntityNames(List<CostCenterEntity> items) {
    if (items.isEmpty()) return Map.of();
    List<Long> ids = items.stream().map(CostCenterEntity::getLegalEntityId).distinct().toList();
    return legalEntityMapper.selectBatchIds(ids).stream()
        .collect(Collectors.toMap(LegalEntityEntity::getId, LegalEntityEntity::getName, (a, b) -> a));
  }

  @Transactional
  public CostCenterEntity create(CostCenterEntity entity) {
    if (entity.getLegalEntityId() == null) throw new IllegalArgumentException("legalEntityId 不能为空");
    if (legalEntityMapper.selectById(entity.getLegalEntityId()) == null) {
      throw new IllegalArgumentException("法人实体不存在");
    }
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    costCenterMapper.insert(entity);
    return require(entity.getId());
  }

  @Transactional
  public CostCenterEntity update(long id, CostCenterEntity patch) {
    CostCenterEntity cur = require(id);
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getLegalEntityId() != null) {
      if (legalEntityMapper.selectById(patch.getLegalEntityId()) == null) {
        throw new IllegalArgumentException("法人实体不存在");
      }
      cur.setLegalEntityId(patch.getLegalEntityId());
    }
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    costCenterMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public void delete(long id) {
    CostCenterEntity cur = require(id);
    cur.setStatus("INACTIVE");
    costCenterMapper.updateById(cur);
  }
}
