package com.hrplatform.platform.employeegroup;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("employee_subgroup")
public class EmployeeSubgroupEntity {
  private Long id;
  private String employeeGroupCode;
  private String code;
  private String name;
  private String status;
  private Integer sort;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getEmployeeGroupCode() { return employeeGroupCode; }
  public void setEmployeeGroupCode(String employeeGroupCode) { this.employeeGroupCode = employeeGroupCode; }
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
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
