package com.hrplatform.platform.code;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class CodeGeneratorService {
  private final CodeRuleMapper codeRuleMapper;
  private final CodeRuleSeqBucketMapper bucketMapper;

  public CodeGeneratorService(CodeRuleMapper codeRuleMapper, CodeRuleSeqBucketMapper bucketMapper) {
    this.codeRuleMapper = codeRuleMapper;
    this.bucketMapper = bucketMapper;
  }

  @Transactional
  public GeneratedCode generate(String ruleCode) {
    return generate(ruleCode, LocalDate.now());
  }

  @Transactional
  public GeneratedCode generate(String ruleCode, LocalDate referenceDate) {
    String rc = ruleCode == null ? "" : ruleCode.trim();
    if (rc.isBlank()) throw new IllegalArgumentException("ruleCode 不能为空");

    CodeRuleEntity rule = codeRuleMapper.selectOne(new LambdaQueryWrapper<CodeRuleEntity>()
        .eq(CodeRuleEntity::getCode, rc)
        .eq(CodeRuleEntity::getStatus, "ACTIVE"));
    if (rule == null) throw new IllegalArgumentException("编码规则不存在或已停用");

    LocalDate date = referenceDate != null ? referenceDate : LocalDate.now();
    String resetKey = computeResetKey(rule.getSeqReset(), date);

    if (resetKey == null) {
      return doGenerateWithRuleSeq(rule, date, resetKey, 0);
    }
    return doGenerateWithBucket(rule, date, resetKey, 0);
  }

  private GeneratedCode doGenerateWithRuleSeq(CodeRuleEntity rule, LocalDate date, String resetKey, int attempt) {
    if (attempt >= 5) throw new IllegalStateException("编码生成冲突，请重试");

    boolean needReset = resetKey != null && (rule.getLastResetKey() == null || !resetKey.equals(rule.getLastResetKey()));

    int prevSeq = rule.getLastSeq() == null ? 0 : rule.getLastSeq();
    String prevResetKey = rule.getLastResetKey();

    int start = rule.getSeqStart() == null ? 1 : rule.getSeqStart();
    int nextSeq;
    if (needReset) {
      nextSeq = start;
      rule.setLastSeq(nextSeq);
      rule.setLastResetKey(resetKey);
    } else {
      nextSeq = prevSeq <= 0 && start > 1 ? start : prevSeq + 1;
      rule.setLastSeq(nextSeq);
    }

    LambdaQueryWrapper<CodeRuleEntity> lock = new LambdaQueryWrapper<CodeRuleEntity>()
        .eq(CodeRuleEntity::getId, rule.getId())
        .eq(CodeRuleEntity::getLastSeq, prevSeq);
    if (prevResetKey == null) {
      lock.isNull(CodeRuleEntity::getLastResetKey);
    } else {
      lock.eq(CodeRuleEntity::getLastResetKey, prevResetKey);
    }
    int updated = codeRuleMapper.update(rule, lock);
    if (updated <= 0) {
      CodeRuleEntity latest = codeRuleMapper.selectById(rule.getId());
      if (latest == null) throw new IllegalArgumentException("编码规则不存在");
      return doGenerateWithRuleSeq(latest, date, resetKey, attempt + 1);
    }
    String code = render(rule.getPattern(), date, nextSeq, rule.getSeqLength());
    return new GeneratedCode(rule.getCode(), code);
  }

  private GeneratedCode doGenerateWithBucket(CodeRuleEntity rule, LocalDate date, String resetKey, int attempt) {
    if (attempt >= 5) throw new IllegalStateException("编码生成冲突，请重试");

    int start = rule.getSeqStart() == null ? 1 : rule.getSeqStart();

    CodeRuleSeqBucketEntity bucket = bucketMapper.selectOne(new LambdaQueryWrapper<CodeRuleSeqBucketEntity>()
        .eq(CodeRuleSeqBucketEntity::getRuleId, rule.getId())
        .eq(CodeRuleSeqBucketEntity::getResetKey, resetKey));

    if (bucket == null) {
      CodeRuleSeqBucketEntity created = new CodeRuleSeqBucketEntity();
      created.setRuleId(rule.getId());
      created.setResetKey(resetKey);
      created.setLastSeq(start);
      try {
        bucketMapper.insert(created);
        String code = render(rule.getPattern(), date, start, rule.getSeqLength());
        return new GeneratedCode(rule.getCode(), code);
      } catch (DuplicateKeyException ex) {
        return doGenerateWithBucket(rule, date, resetKey, attempt + 1);
      }
    }

    int prevSeq = bucket.getLastSeq() == null ? 0 : bucket.getLastSeq();
    int nextSeq = prevSeq <= 0 && start > 1 ? start : prevSeq + 1;
    bucket.setLastSeq(nextSeq);

    LambdaQueryWrapper<CodeRuleSeqBucketEntity> lock = new LambdaQueryWrapper<CodeRuleSeqBucketEntity>()
        .eq(CodeRuleSeqBucketEntity::getId, bucket.getId())
        .eq(CodeRuleSeqBucketEntity::getLastSeq, prevSeq);
    int updated = bucketMapper.update(bucket, lock);
    if (updated <= 0) {
      return doGenerateWithBucket(rule, date, resetKey, attempt + 1);
    }
    String code = render(rule.getPattern(), date, nextSeq, rule.getSeqLength());
    return new GeneratedCode(rule.getCode(), code);
  }

  private String render(String pattern, LocalDate date, int seq, Integer seqLength) {
    String p = pattern == null ? "{seq}" : pattern;
    int year = date.getYear();
    Map<String, String> tokens = Map.of(
        "{yyyy}", String.format("%04d", year),
        "{yy}", String.format("%02d", year % 100),
        "{MM}", String.format("%02d", date.getMonthValue()),
        "{dd}", String.format("%02d", date.getDayOfMonth())
    );
    String out = p;
    for (var en : tokens.entrySet()) {
      out = out.replace(en.getKey(), en.getValue());
    }
    int len = seqLength == null ? 4 : Math.max(1, seqLength);
    String seqStr = String.format("%0" + len + "d", seq);
    out = out.replace("{seq}", seqStr);
    return out;
  }

  private String computeResetKey(String seqReset, LocalDate date) {
    if (seqReset == null) return null;
    return switch (seqReset.toUpperCase()) {
      case "DAY" -> date.format(DateTimeFormatter.BASIC_ISO_DATE); // yyyyMMdd
      case "MONTH" -> date.format(DateTimeFormatter.ofPattern("yyyyMM"));
      case "YEAR" -> String.valueOf(date.getYear());
      case "NEVER" -> null;
      default -> null;
    };
  }

  public record GeneratedCode(String ruleCode, String code) {}
}
