package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_training_record")
public class EmployeeTrainingRecordEntity {
  private Long id;
  private Long employeeId;
  /** 课程名称 */
  private String courseName;
  private LocalDate startDate;
  private LocalDate endDate;
  private BigDecimal hours;
  /** 考核方式（字典 TRAINING_ASSESSMENT_METHOD） */
  private String assessmentMethod;
  /** 考核结果（字典 TRAINING_ASSESSMENT_RESULT） */
  private String assessmentResult;
  /** 评估反馈结果 */
  private String feedbackResult;
  /** 培训形式（字典 TRAINING_FORM） */
  private String trainingForm;
  /** 培训类型（字典 TRAINING_TYPE） */
  private String trainingType;
  private String trainingLocation;
  private String trainer;
  /** 培训费用（元） */
  private BigDecimal trainingCost;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getCourseName() { return courseName; }
  public void setCourseName(String courseName) { this.courseName = courseName; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public BigDecimal getHours() { return hours; }
  public void setHours(BigDecimal hours) { this.hours = hours; }
  public String getAssessmentMethod() { return assessmentMethod; }
  public void setAssessmentMethod(String assessmentMethod) { this.assessmentMethod = assessmentMethod; }
  public String getAssessmentResult() { return assessmentResult; }
  public void setAssessmentResult(String assessmentResult) { this.assessmentResult = assessmentResult; }
  public String getFeedbackResult() { return feedbackResult; }
  public void setFeedbackResult(String feedbackResult) { this.feedbackResult = feedbackResult; }
  public String getTrainingForm() { return trainingForm; }
  public void setTrainingForm(String trainingForm) { this.trainingForm = trainingForm; }
  public String getTrainingType() { return trainingType; }
  public void setTrainingType(String trainingType) { this.trainingType = trainingType; }
  public String getTrainingLocation() { return trainingLocation; }
  public void setTrainingLocation(String trainingLocation) { this.trainingLocation = trainingLocation; }
  public String getTrainer() { return trainer; }
  public void setTrainer(String trainer) { this.trainer = trainer; }
  public BigDecimal getTrainingCost() { return trainingCost; }
  public void setTrainingCost(BigDecimal trainingCost) { this.trainingCost = trainingCost; }
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
