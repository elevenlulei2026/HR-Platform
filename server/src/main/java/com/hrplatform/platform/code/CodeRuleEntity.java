package com.hrplatform.platform.code;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("code_rule")
public class CodeRuleEntity {
  private Long id;
  private String code;
  private String name;
  private String pattern;
  private String seqReset;
  private Integer seqStart;
  private Integer seqLength;
  private String status;
  private Integer lastSeq;
  private String lastResetKey;
  private LocalDateTime updatedAt;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getCode() {
    return code;
  }

  public void setCode(String code) {
    this.code = code;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getPattern() {
    return pattern;
  }

  public void setPattern(String pattern) {
    this.pattern = pattern;
  }

  public String getSeqReset() {
    return seqReset;
  }

  public void setSeqReset(String seqReset) {
    this.seqReset = seqReset;
  }

  public Integer getSeqStart() {
    return seqStart;
  }

  public void setSeqStart(Integer seqStart) {
    this.seqStart = seqStart;
  }

  public Integer getSeqLength() {
    return seqLength;
  }

  public void setSeqLength(Integer seqLength) {
    this.seqLength = seqLength;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Integer getLastSeq() {
    return lastSeq;
  }

  public void setLastSeq(Integer lastSeq) {
    this.lastSeq = lastSeq;
  }

  public String getLastResetKey() {
    return lastResetKey;
  }

  public void setLastResetKey(String lastResetKey) {
    this.lastResetKey = lastResetKey;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}

