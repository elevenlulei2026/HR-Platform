package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_agreement")
public class EmployeeAgreementEntity {
  private Long id;
  private Long employeeId;
  /** 生效开始日期（档案记录） */
  private LocalDate effectiveStartDate;
  /** 生效结束日期（档案记录） */
  private LocalDate effectiveEndDate;
  /** 协议编号（手填） */
  private String agreementCode;
  /** 操作类型（数据字典：AGREEMENT_OPERATION_TYPE） */
  private String operationType;
  /** 协议类别（数据字典：AGREEMENT_CATEGORY） */
  private String agreementCategory;
  /** @deprecated 旧字段：协议类型（历史数据兼容） */
  private String agreementType;
  private Long legalEntityId;
  private LocalDate startDate;
  private LocalDate endDate;
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
  public LocalDate getEffectiveStartDate() { return effectiveStartDate; }
  public void setEffectiveStartDate(LocalDate effectiveStartDate) { this.effectiveStartDate = effectiveStartDate; }
  public LocalDate getEffectiveEndDate() { return effectiveEndDate; }
  public void setEffectiveEndDate(LocalDate effectiveEndDate) { this.effectiveEndDate = effectiveEndDate; }
  public String getAgreementCode() { return agreementCode; }
  public void setAgreementCode(String agreementCode) { this.agreementCode = agreementCode; }
  public String getOperationType() { return operationType; }
  public void setOperationType(String operationType) { this.operationType = operationType; }
  public String getAgreementCategory() { return agreementCategory; }
  public void setAgreementCategory(String agreementCategory) { this.agreementCategory = agreementCategory; }
  public String getAgreementType() { return agreementType; }
  public void setAgreementType(String agreementType) { this.agreementType = agreementType; }
  public Long getLegalEntityId() { return legalEntityId; }
  public void setLegalEntityId(Long legalEntityId) { this.legalEntityId = legalEntityId; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
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
