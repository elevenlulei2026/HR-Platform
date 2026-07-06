package com.hrplatform.platform.code;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("code_rule_seq_bucket")
public class CodeRuleSeqBucketEntity {
  private Long id;
  private Long ruleId;
  private String resetKey;
  private Integer lastSeq;
  private LocalDateTime updatedAt;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getRuleId() {
    return ruleId;
  }

  public void setRuleId(Long ruleId) {
    this.ruleId = ruleId;
  }

  public String getResetKey() {
    return resetKey;
  }

  public void setResetKey(String resetKey) {
    this.resetKey = resetKey;
  }

  public Integer getLastSeq() {
    return lastSeq;
  }

  public void setLastSeq(Integer lastSeq) {
    this.lastSeq = lastSeq;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
