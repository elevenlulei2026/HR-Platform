package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_contract")
public class EmployeeContractEntity {
  private Long id;
  private Long employeeId;
  private String contractCode;
  private String contractType;
  private Long legalEntityId;
  private String operationType;
  private LocalDate startDate;
  private LocalDate endDate;
  private LocalDate effectiveDate;
  private String status;
  private Long fileAttachmentId;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getContractCode() { return contractCode; }
  public void setContractCode(String contractCode) { this.contractCode = contractCode; }
  public String getContractType() { return contractType; }
  public void setContractType(String contractType) { this.contractType = contractType; }
  public Long getLegalEntityId() { return legalEntityId; }
  public void setLegalEntityId(Long legalEntityId) { this.legalEntityId = legalEntityId; }
  public String getOperationType() { return operationType; }
  public void setOperationType(String operationType) { this.operationType = operationType; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public LocalDate getEffectiveDate() { return effectiveDate; }
  public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Long getFileAttachmentId() { return fileAttachmentId; }
  public void setFileAttachmentId(Long fileAttachmentId) { this.fileAttachmentId = fileAttachmentId; }
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
