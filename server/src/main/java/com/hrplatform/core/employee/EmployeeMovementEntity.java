package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_movement")
public class EmployeeMovementEntity {
  private Long id;
  private Long employeeId;
  private String movementType;
  private String movementTypeName;
  private String reasonCode;
  private String reasonDescription;
  private String reasonSubCode;
  private String reasonSubDescription;
  private LocalDate effectiveDate;
  private Long fromAssignmentId;
  private Long toAssignmentId;
  private String sourceRequestType;
  private Long sourceRequestId;
  private String remark;
  private LocalDateTime createdAt;
  private Long createdBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getMovementType() { return movementType; }
  public void setMovementType(String movementType) { this.movementType = movementType; }
  public String getMovementTypeName() { return movementTypeName; }
  public void setMovementTypeName(String movementTypeName) { this.movementTypeName = movementTypeName; }
  public String getReasonCode() { return reasonCode; }
  public void setReasonCode(String reasonCode) { this.reasonCode = reasonCode; }
  public String getReasonDescription() { return reasonDescription; }
  public void setReasonDescription(String reasonDescription) { this.reasonDescription = reasonDescription; }
  public String getReasonSubCode() { return reasonSubCode; }
  public void setReasonSubCode(String reasonSubCode) { this.reasonSubCode = reasonSubCode; }
  public String getReasonSubDescription() { return reasonSubDescription; }
  public void setReasonSubDescription(String reasonSubDescription) { this.reasonSubDescription = reasonSubDescription; }
  public LocalDate getEffectiveDate() { return effectiveDate; }
  public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
  public Long getFromAssignmentId() { return fromAssignmentId; }
  public void setFromAssignmentId(Long fromAssignmentId) { this.fromAssignmentId = fromAssignmentId; }
  public Long getToAssignmentId() { return toAssignmentId; }
  public void setToAssignmentId(Long toAssignmentId) { this.toAssignmentId = toAssignmentId; }
  public String getSourceRequestType() { return sourceRequestType; }
  public void setSourceRequestType(String sourceRequestType) { this.sourceRequestType = sourceRequestType; }
  public Long getSourceRequestId() { return sourceRequestId; }
  public void setSourceRequestId(Long sourceRequestId) { this.sourceRequestId = sourceRequestId; }
  public String getRemark() { return remark; }
  public void setRemark(String remark) { this.remark = remark; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
}
