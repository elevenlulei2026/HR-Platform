package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_training_record")
public class EmployeeTrainingRecordEntity {
  private Long id;
  private Long employeeId;
  private String trainingName;
  private String trainingType;
  private String provider;
  private LocalDate startDate;
  private LocalDate endDate;
  private BigDecimal hours;
  private String result;
  private String certificateNo;
  private Long attachmentId;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getTrainingName() { return trainingName; }
  public void setTrainingName(String trainingName) { this.trainingName = trainingName; }
  public String getTrainingType() { return trainingType; }
  public void setTrainingType(String trainingType) { this.trainingType = trainingType; }
  public String getProvider() { return provider; }
  public void setProvider(String provider) { this.provider = provider; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public BigDecimal getHours() { return hours; }
  public void setHours(BigDecimal hours) { this.hours = hours; }
  public String getResult() { return result; }
  public void setResult(String result) { this.result = result; }
  public String getCertificateNo() { return certificateNo; }
  public void setCertificateNo(String certificateNo) { this.certificateNo = certificateNo; }
  public Long getAttachmentId() { return attachmentId; }
  public void setAttachmentId(Long attachmentId) { this.attachmentId = attachmentId; }
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
