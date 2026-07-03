package com.hrplatform.core.organization;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class LegalEntityService {
  private final LegalEntityMapper legalEntityMapper;

  public LegalEntityService(LegalEntityMapper legalEntityMapper) {
    this.legalEntityMapper = legalEntityMapper;
  }

  public PageResult<LegalEntityEntity> page(String keyword, long page, long pageSize) {
    LambdaQueryWrapper<LegalEntityEntity> qw = new LambdaQueryWrapper<LegalEntityEntity>()
        .orderByAsc(LegalEntityEntity::getCode);
    if (keyword != null && !keyword.isBlank()) {
      String k = keyword.trim();
      qw.and(w -> w.like(LegalEntityEntity::getCode, k).or().like(LegalEntityEntity::getName, k));
    }
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    Long total = legalEntityMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    return new PageResult<>(legalEntityMapper.selectList(qw), total == null ? 0 : total);
  }

  public LegalEntityEntity require(long id) {
    LegalEntityEntity e = legalEntityMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("法人实体不存在");
    return e;
  }

  @Transactional
  public LegalEntityEntity create(LegalEntityEntity entity) {
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    legalEntityMapper.insert(entity);
    return require(entity.getId());
  }

  @Transactional
  public LegalEntityEntity update(long id, LegalEntityEntity patch) {
    LegalEntityEntity cur = require(id);
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getCreditCode() != null) cur.setCreditCode(patch.getCreditCode());
    if (patch.getRegion() != null) cur.setRegion(patch.getRegion());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    legalEntityMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public void delete(long id) {
    LegalEntityEntity cur = require(id);
    cur.setStatus("INACTIVE");
    legalEntityMapper.updateById(cur);
  }

  public record PageResult<T>(List<T> records, long total) {}
}
