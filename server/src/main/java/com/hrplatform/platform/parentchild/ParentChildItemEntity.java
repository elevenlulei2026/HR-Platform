package com.hrplatform.platform.parentchild;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("parent_child_item")
public class ParentChildItemEntity {
  private Long id;
  private String typeCode;
  private String parentCode;
  private String code;
  private String name;
  private String status;
  private Integer sort;
  private String remark;
  private String extJson;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getTypeCode() { return typeCode; }
  public void setTypeCode(String typeCode) { this.typeCode = typeCode; }
  public String getParentCode() { return parentCode; }
  public void setParentCode(String parentCode) { this.parentCode = parentCode; }
  public String getCode() { return code; }
  public void setCode(String code) { this.code = code; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Integer getSort() { return sort; }
  public void setSort(Integer sort) { this.sort = sort; }
  public String getRemark() { return remark; }
  public void setRemark(String remark) { this.remark = remark; }
  public String getExtJson() { return extJson; }
  public void setExtJson(String extJson) { this.extJson = extJson; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

