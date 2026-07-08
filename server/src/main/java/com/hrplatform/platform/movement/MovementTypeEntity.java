package com.hrplatform.platform.movement;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("movement_type")
public class MovementTypeEntity {
  private Long id;
  private String code;
  private String name;
  private String phase;
  private String status;
  private Integer sort;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getCode() { return code; }
  public void setCode(String code) { this.code = code; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getPhase() { return phase; }
  public void setPhase(String phase) { this.phase = phase; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Integer getSort() { return sort; }
  public void setSort(Integer sort) { this.sort = sort; }
  public String getRemark() { return remark; }
  public void setRemark(String remark) { this.remark = remark; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
