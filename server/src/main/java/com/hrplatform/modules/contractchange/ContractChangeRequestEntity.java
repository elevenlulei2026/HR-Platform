package com.hrplatform.modules.contractchange;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("contract_change_request")
public class ContractChangeRequestEntity {
  private Long id;
  private String requestNo;
  private String requestType;
  private String targetKind;
  private Long employeeId;
  private Long sourceRecordId;
  private LocalDate proposedStartDate;
  private LocalDate proposedEndDate;
  private LocalDate proposedEffectiveStartDate;
  private Long legalEntityId;
  private String contractCategory;
  private String contractCategoryDesc;
  private String contractCode;
  private String agreementCategory;
  private String agreementCode;
  private Long fileAttachmentId;
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
  public String getRequestType() { return requestType; }
  public void setRequestType(String requestType) { this.requestType = requestType; }
  public String getTargetKind() { return targetKind; }
  public void setTargetKind(String targetKind) { this.targetKind = targetKind; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public Long getSourceRecordId() { return sourceRecordId; }
  public void setSourceRecordId(Long sourceRecordId) { this.sourceRecordId = sourceRecordId; }
  public LocalDate getProposedStartDate() { return proposedStartDate; }
  public void setProposedStartDate(LocalDate proposedStartDate) { this.proposedStartDate = proposedStartDate; }
  public LocalDate getProposedEndDate() { return proposedEndDate; }
  public void setProposedEndDate(LocalDate proposedEndDate) { this.proposedEndDate = proposedEndDate; }
  public LocalDate getProposedEffectiveStartDate() { return proposedEffectiveStartDate; }
  public void setProposedEffectiveStartDate(LocalDate proposedEffectiveStartDate) {
    this.proposedEffectiveStartDate = proposedEffectiveStartDate;
  }
  public Long getLegalEntityId() { return legalEntityId; }
  public void setLegalEntityId(Long legalEntityId) { this.legalEntityId = legalEntityId; }
  public String getContractCategory() { return contractCategory; }
  public void setContractCategory(String contractCategory) { this.contractCategory = contractCategory; }
  public String getContractCategoryDesc() { return contractCategoryDesc; }
  public void setContractCategoryDesc(String contractCategoryDesc) { this.contractCategoryDesc = contractCategoryDesc; }
  public String getContractCode() { return contractCode; }
  public void setContractCode(String contractCode) { this.contractCode = contractCode; }
  public String getAgreementCategory() { return agreementCategory; }
  public void setAgreementCategory(String agreementCategory) { this.agreementCategory = agreementCategory; }
  public String getAgreementCode() { return agreementCode; }
  public void setAgreementCode(String agreementCode) { this.agreementCode = agreementCode; }
  public Long getFileAttachmentId() { return fileAttachmentId; }
  public void setFileAttachmentId(Long fileAttachmentId) { this.fileAttachmentId = fileAttachmentId; }
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
