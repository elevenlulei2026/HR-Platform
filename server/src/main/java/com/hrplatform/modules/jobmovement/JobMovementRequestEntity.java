package com.hrplatform.modules.jobmovement;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("job_movement_request")
public class JobMovementRequestEntity {
  private Long id;
  private String requestNo;
  private String movementType;
  private Long employeeId;
  private Long fromAssignmentId;
  private Long toAssignmentId;
  private LocalDate effectiveDate;
  private String reasonCode;
  private String reasonSubCode;
  private Long organizationId;
  private Long positionId;
  private String jobGradeCode;
  private String employeeGroupCode;
  private String employeeSubgroupCode;
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
  public String getMovementType() { return movementType; }
  public void setMovementType(String movementType) { this.movementType = movementType; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public Long getFromAssignmentId() { return fromAssignmentId; }
  public void setFromAssignmentId(Long fromAssignmentId) { this.fromAssignmentId = fromAssignmentId; }
  public Long getToAssignmentId() { return toAssignmentId; }
  public void setToAssignmentId(Long toAssignmentId) { this.toAssignmentId = toAssignmentId; }
  public LocalDate getEffectiveDate() { return effectiveDate; }
  public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
  public String getReasonCode() { return reasonCode; }
  public void setReasonCode(String reasonCode) { this.reasonCode = reasonCode; }
  public String getReasonSubCode() { return reasonSubCode; }
  public void setReasonSubCode(String reasonSubCode) { this.reasonSubCode = reasonSubCode; }
  public Long getOrganizationId() { return organizationId; }
  public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }
  public Long getPositionId() { return positionId; }
  public void setPositionId(Long positionId) { this.positionId = positionId; }
  public String getJobGradeCode() { return jobGradeCode; }
  public void setJobGradeCode(String jobGradeCode) { this.jobGradeCode = jobGradeCode; }
  public String getEmployeeGroupCode() { return employeeGroupCode; }
  public void setEmployeeGroupCode(String employeeGroupCode) { this.employeeGroupCode = employeeGroupCode; }
  public String getEmployeeSubgroupCode() { return employeeSubgroupCode; }
  public void setEmployeeSubgroupCode(String employeeSubgroupCode) { this.employeeSubgroupCode = employeeSubgroupCode; }
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
