package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_performance_record")
public class EmployeePerformanceRecordEntity {
  private Long id;
  private Long employeeId;
  /** 年度 */
  private String year;
  /** 考核类型（字典 PERFORMANCE_ASSESSMENT_TYPE） */
  private String assessmentType;
  /** 绩效开始日期 */
  private LocalDate performanceStartDate;
  /** 绩效结束日期 */
  private LocalDate performanceEndDate;
  /** 价值观等级（字典 PERFORMANCE_VALUES_LEVEL） */
  private String valuesLevel;
  /** 绩效等级（字典 PERFORMANCE_LEVEL） */
  private String performanceLevel;
  /** 绩效得分（文本手填） */
  private String performanceScore;
  /** 价值观得分（文本手填） */
  private String valuesScore;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getYear() { return year; }
  public void setYear(String year) { this.year = year; }
  public String getAssessmentType() { return assessmentType; }
  public void setAssessmentType(String assessmentType) { this.assessmentType = assessmentType; }
  public LocalDate getPerformanceStartDate() { return performanceStartDate; }
  public void setPerformanceStartDate(LocalDate performanceStartDate) { this.performanceStartDate = performanceStartDate; }
  public LocalDate getPerformanceEndDate() { return performanceEndDate; }
  public void setPerformanceEndDate(LocalDate performanceEndDate) { this.performanceEndDate = performanceEndDate; }
  public String getValuesLevel() { return valuesLevel; }
  public void setValuesLevel(String valuesLevel) { this.valuesLevel = valuesLevel; }
  public String getPerformanceLevel() { return performanceLevel; }
  public void setPerformanceLevel(String performanceLevel) { this.performanceLevel = performanceLevel; }
  public String getPerformanceScore() { return performanceScore; }
  public void setPerformanceScore(String performanceScore) { this.performanceScore = performanceScore; }
  public String getValuesScore() { return valuesScore; }
  public void setValuesScore(String valuesScore) { this.valuesScore = valuesScore; }
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
