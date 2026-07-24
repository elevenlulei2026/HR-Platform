package com.hrplatform.modules.offboarding;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("offboarding_case")
public class OffboardingCaseEntity {
  private Long id;
  private String caseNo;
  private Long employeeId;
  private Long assignmentId;
  private LocalDate lastWorkDay;
  private String reasonCode;
  private String reasonSubCode;
  private Long handoverToEmployeeId;
  private String status;
  private Long workflowInstanceId;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getCaseNo() { return caseNo; }
  public void setCaseNo(String caseNo) { this.caseNo = caseNo; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public Long getAssignmentId() { return assignmentId; }
  public void setAssignmentId(Long assignmentId) { this.assignmentId = assignmentId; }
  public LocalDate getLastWorkDay() { return lastWorkDay; }
  public void setLastWorkDay(LocalDate lastWorkDay) { this.lastWorkDay = lastWorkDay; }
  public String getReasonCode() { return reasonCode; }
  public void setReasonCode(String reasonCode) { this.reasonCode = reasonCode; }
  public String getReasonSubCode() { return reasonSubCode; }
  public void setReasonSubCode(String reasonSubCode) { this.reasonSubCode = reasonSubCode; }
  public Long getHandoverToEmployeeId() { return handoverToEmployeeId; }
  public void setHandoverToEmployeeId(Long handoverToEmployeeId) {
    this.handoverToEmployeeId = handoverToEmployeeId;
  }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Long getWorkflowInstanceId() { return workflowInstanceId; }
  public void setWorkflowInstanceId(Long workflowInstanceId) { this.workflowInstanceId = workflowInstanceId; }
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
