package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableField;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_contract")
public class EmployeeContractEntity {
  private Long id;
  private Long employeeId;
  /** 生效开始日期（档案记录） */
  private LocalDate effectiveStartDate;
  /** 生效结束日期（档案记录） */
  private LocalDate effectiveEndDate;
  private String contractCode;
  /** @deprecated 旧字段：合同类型（已迁移为合同类别父子联动） */
  private String contractType;
  /** 合同类别（父子值配置：CONTRACT_CATEGORY 一级） */
  private String contractCategory;
  /** 合同类别描述（父子值配置：CONTRACT_CATEGORY 二级） */
  private String contractCategoryDesc;
  private Long legalEntityId;
  private String operationType;
  private LocalDate startDate;
  private LocalDate endDate;
  /** @deprecated 旧字段：生效日期（已迁移为 effectiveStartDate/effectiveEndDate） */
  private LocalDate effectiveDate;
  private String status;
  private Long fileAttachmentId;
  /** 合同签订次数（运行时计算，不落库） */
  @TableField(exist = false)
  private Integer signingTimes;
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
  public String getContractCode() { return contractCode; }
  public void setContractCode(String contractCode) { this.contractCode = contractCode; }
  public String getContractType() { return contractType; }
  public void setContractType(String contractType) { this.contractType = contractType; }
  public String getContractCategory() { return contractCategory; }
  public void setContractCategory(String contractCategory) { this.contractCategory = contractCategory; }
  public String getContractCategoryDesc() { return contractCategoryDesc; }
  public void setContractCategoryDesc(String contractCategoryDesc) { this.contractCategoryDesc = contractCategoryDesc; }
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
  public Integer getSigningTimes() { return signingTimes; }
  public void setSigningTimes(Integer signingTimes) { this.signingTimes = signingTimes; }
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
