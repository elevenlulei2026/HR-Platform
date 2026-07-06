package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_internal_relative")
public class EmployeeInternalRelativeEntity {
  private Long id;
  private Long employeeId;
  private Long relativeEmployeeId;
  private String relation;
  private String departmentName;
  private String positionName;
  private String jobGradeName;
  private LocalDate hireDate;
  private String employmentStatus;
  private LocalDate lastWorkDay;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public Long getRelativeEmployeeId() { return relativeEmployeeId; }
  public void setRelativeEmployeeId(Long relativeEmployeeId) { this.relativeEmployeeId = relativeEmployeeId; }
  public String getRelation() { return relation; }
  public void setRelation(String relation) { this.relation = relation; }
  public String getDepartmentName() { return departmentName; }
  public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
  public String getPositionName() { return positionName; }
  public void setPositionName(String positionName) { this.positionName = positionName; }
  public String getJobGradeName() { return jobGradeName; }
  public void setJobGradeName(String jobGradeName) { this.jobGradeName = jobGradeName; }
  public LocalDate getHireDate() { return hireDate; }
  public void setHireDate(LocalDate hireDate) { this.hireDate = hireDate; }
  public String getEmploymentStatus() { return employmentStatus; }
  public void setEmploymentStatus(String employmentStatus) { this.employmentStatus = employmentStatus; }
  public LocalDate getLastWorkDay() { return lastWorkDay; }
  public void setLastWorkDay(LocalDate lastWorkDay) { this.lastWorkDay = lastWorkDay; }
  public String getRemark() { return remark; }
  public void setRemark(String remark) { this.remark = remark; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
