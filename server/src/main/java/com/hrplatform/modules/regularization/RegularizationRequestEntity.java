package com.hrplatform.modules.regularization;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("regularization_request")
public class RegularizationRequestEntity {
  private Long id;
  private String requestNo;
  private Long employeeId;
  private Long assignmentId;
  private LocalDate expectedRegularizationDate;
  private LocalDate actualRegularizationDate;
  private String reasonCode;
  private String opinion;
  private String status;
  private Long workflowInstanceId;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getRequestNo() { return requestNo; }
  public void setRequestNo(String requestNo) { this.requestNo = requestNo; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public Long getAssignmentId() { return assignmentId; }
  public void setAssignmentId(Long assignmentId) { this.assignmentId = assignmentId; }
  public LocalDate getExpectedRegularizationDate() { return expectedRegularizationDate; }
  public void setExpectedRegularizationDate(LocalDate expectedRegularizationDate) {
    this.expectedRegularizationDate = expectedRegularizationDate;
  }
  public LocalDate getActualRegularizationDate() { return actualRegularizationDate; }
  public void setActualRegularizationDate(LocalDate actualRegularizationDate) {
    this.actualRegularizationDate = actualRegularizationDate;
  }
  public String getReasonCode() { return reasonCode; }
  public void setReasonCode(String reasonCode) { this.reasonCode = reasonCode; }
  public String getOpinion() { return opinion; }
  public void setOpinion(String opinion) { this.opinion = opinion; }
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
