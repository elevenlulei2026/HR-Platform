package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("employee_talent_review")
public class EmployeeTalentReviewEntity {
  private Long id;
  private Long employeeId;
  /** 年份（文本手填） */
  private String year;
  /** 绩效得分 */
  private String performanceScore;
  /** 绩效落位 */
  private String performancePlacement;
  /** 潜力得分 */
  private String potentialScore;
  /** 潜力落位 */
  private String potentialPlacement;
  /** 价值观得分 */
  private String valuesScore;
  /** 九宫格落位 */
  private String nineBoxPlacement;
  /** 主观评价（长文本） */
  private String subjectiveEvaluation;
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
  public String getPerformanceScore() { return performanceScore; }
  public void setPerformanceScore(String performanceScore) { this.performanceScore = performanceScore; }
  public String getPerformancePlacement() { return performancePlacement; }
  public void setPerformancePlacement(String performancePlacement) { this.performancePlacement = performancePlacement; }
  public String getPotentialScore() { return potentialScore; }
  public void setPotentialScore(String potentialScore) { this.potentialScore = potentialScore; }
  public String getPotentialPlacement() { return potentialPlacement; }
  public void setPotentialPlacement(String potentialPlacement) { this.potentialPlacement = potentialPlacement; }
  public String getValuesScore() { return valuesScore; }
  public void setValuesScore(String valuesScore) { this.valuesScore = valuesScore; }
  public String getNineBoxPlacement() { return nineBoxPlacement; }
  public void setNineBoxPlacement(String nineBoxPlacement) { this.nineBoxPlacement = nineBoxPlacement; }
  public String getSubjectiveEvaluation() { return subjectiveEvaluation; }
  public void setSubjectiveEvaluation(String subjectiveEvaluation) { this.subjectiveEvaluation = subjectiveEvaluation; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
