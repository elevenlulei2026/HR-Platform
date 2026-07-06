package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_performance_record")
public class EmployeePerformanceRecordEntity {
  private Long id;
  private Long employeeId;
  private String period;
  private String rating;
  private String ratingLabel;
  private BigDecimal score;
  private String reviewerName;
  private LocalDate reviewDate;
  private String sourceType;
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
  public String getRating() { return rating; }
  public void setRating(String rating) { this.rating = rating; }
  public String getRatingLabel() { return ratingLabel; }
  public void setRatingLabel(String ratingLabel) { this.ratingLabel = ratingLabel; }
  public BigDecimal getScore() { return score; }
  public void setScore(BigDecimal score) { this.score = score; }
  public String getReviewerName() { return reviewerName; }
  public void setReviewerName(String reviewerName) { this.reviewerName = reviewerName; }
  public LocalDate getReviewDate() { return reviewDate; }
  public void setReviewDate(LocalDate reviewDate) { this.reviewDate = reviewDate; }
  public String getSourceType() { return sourceType; }
  public void setSourceType(String sourceType) { this.sourceType = sourceType; }
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
