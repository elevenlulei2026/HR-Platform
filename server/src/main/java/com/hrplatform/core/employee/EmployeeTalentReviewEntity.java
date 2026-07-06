package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_talent_review")
public class EmployeeTalentReviewEntity {
  private Long id;
  private Long employeeId;
  private String reviewCycle;
  private String gridPosition;
  private String potentialLevel;
  private String performanceLevel;
  private String reviewerName;
  private LocalDate reviewDate;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getReviewCycle() { return reviewCycle; }
  public void setReviewCycle(String reviewCycle) { this.reviewCycle = reviewCycle; }
  public String getGridPosition() { return gridPosition; }
  public void setGridPosition(String gridPosition) { this.gridPosition = gridPosition; }
  public String getPotentialLevel() { return potentialLevel; }
  public void setPotentialLevel(String potentialLevel) { this.potentialLevel = potentialLevel; }
  public String getPerformanceLevel() { return performanceLevel; }
  public void setPerformanceLevel(String performanceLevel) { this.performanceLevel = performanceLevel; }
  public String getReviewerName() { return reviewerName; }
  public void setReviewerName(String reviewerName) { this.reviewerName = reviewerName; }
  public LocalDate getReviewDate() { return reviewDate; }
  public void setReviewDate(LocalDate reviewDate) { this.reviewDate = reviewDate; }
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
