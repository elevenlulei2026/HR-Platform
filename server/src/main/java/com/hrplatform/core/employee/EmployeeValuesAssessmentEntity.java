package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_values_assessment")
public class EmployeeValuesAssessmentEntity {
  private Long id;
  private Long employeeId;
  private String period;
  private String dimension;
  private BigDecimal score;
  private String level;
  private String assessorName;
  private LocalDate assessDate;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getPeriod() { return period; }
  public void setPeriod(String period) { this.period = period; }
  public String getDimension() { return dimension; }
  public void setDimension(String dimension) { this.dimension = dimension; }
  public BigDecimal getScore() { return score; }
  public void setScore(BigDecimal score) { this.score = score; }
  public String getLevel() { return level; }
  public void setLevel(String level) { this.level = level; }
  public String getAssessorName() { return assessorName; }
  public void setAssessorName(String assessorName) { this.assessorName = assessorName; }
  public LocalDate getAssessDate() { return assessDate; }
  public void setAssessDate(LocalDate assessDate) { this.assessDate = assessDate; }
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
