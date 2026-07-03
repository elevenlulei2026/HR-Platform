package com.hrplatform.platform.code;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CodeRuleService {
  private final CodeRuleMapper codeRuleMapper;

  public CodeRuleService(CodeRuleMapper codeRuleMapper) {
    this.codeRuleMapper = codeRuleMapper;
  }

  public PageResult<CodeRuleEntity> page(Query query) {
    LambdaQueryWrapper<CodeRuleEntity> qw = new LambdaQueryWrapper<CodeRuleEntity>()
        .orderByAsc(CodeRuleEntity::getCode)
        .orderByAsc(CodeRuleEntity::getId);

    String keyword = query.keyword() == null ? null : query.keyword().trim();
    if (keyword != null && !keyword.isBlank()) {
      qw.and(w -> w.like(CodeRuleEntity::getCode, keyword).or().like(CodeRuleEntity::getName, keyword));
    }

    long page = Math.max(1, query.page());
    long pageSize = Math.max(1, query.pageSize());
    long offset = (page - 1) * pageSize;

    Long total = codeRuleMapper.selectCount(qw);
    qw.last("LIMIT " + offset + ", " + pageSize);
    List<CodeRuleEntity> records = codeRuleMapper.selectList(qw);
    return new PageResult<>(records, total == null ? 0 : total);
  }

  public CodeRuleEntity require(long id) {
    CodeRuleEntity e = codeRuleMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("编码规则不存在");
    return e;
  }

  @Transactional
  public CodeRuleEntity create(CodeRuleEntity entity) {
    if (entity.getSeqStart() == null) entity.setSeqStart(1);
    if (entity.getSeqLength() == null) entity.setSeqLength(4);
    if (entity.getSeqReset() == null || entity.getSeqReset().isBlank()) entity.setSeqReset("NEVER");
    if (entity.getLastSeq() == null) entity.setLastSeq(0);
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    codeRuleMapper.insert(entity);
    return require(entity.getId());
  }

  @Transactional
  public CodeRuleEntity update(long id, CodeRuleEntity patch) {
    CodeRuleEntity cur = require(id);
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getPattern() != null) cur.setPattern(patch.getPattern());
    if (patch.getSeqReset() != null) cur.setSeqReset(patch.getSeqReset());
    if (patch.getSeqStart() != null) cur.setSeqStart(patch.getSeqStart());
    if (patch.getSeqLength() != null) cur.setSeqLength(patch.getSeqLength());
    codeRuleMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public void delete(long id) {
    CodeRuleEntity cur = require(id);
    if ("DISABLED".equals(cur.getStatus())) {
      throw new IllegalArgumentException("编码规则已停用");
    }
    cur.setStatus("DISABLED");
    codeRuleMapper.updateById(cur);
  }

  public record Query(String keyword, long page, long pageSize) {}

  public record PageResult<T>(List<T> records, long total) {}
}

