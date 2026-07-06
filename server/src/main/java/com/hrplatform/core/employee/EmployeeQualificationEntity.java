package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_qualification")
public class EmployeeQualificationEntity {
  private Long id;
  private Long employeeId;
  private String titleName;
  private String titleLevel;
  private LocalDate approvalDate;
  private LocalDate expiryDate;
  private String certificateNo;
  private String issuingOrg;
  private Long attachmentId;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getTitleName() { return titleName; }
  public void setTitleName(String titleName) { this.titleName = titleName; }
  public String getTitleLevel() { return titleLevel; }
  public void setTitleLevel(String titleLevel) { this.titleLevel = titleLevel; }
  public LocalDate getApprovalDate() { return approvalDate; }
  public void setApprovalDate(LocalDate approvalDate) { this.approvalDate = approvalDate; }
  public LocalDate getExpiryDate() { return expiryDate; }
  public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }
  public String getCertificateNo() { return certificateNo; }
  public void setCertificateNo(String certificateNo) { this.certificateNo = certificateNo; }
  public String getIssuingOrg() { return issuingOrg; }
  public void setIssuingOrg(String issuingOrg) { this.issuingOrg = issuingOrg; }
  public Long getAttachmentId() { return attachmentId; }
  public void setAttachmentId(Long attachmentId) { this.attachmentId = attachmentId; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
