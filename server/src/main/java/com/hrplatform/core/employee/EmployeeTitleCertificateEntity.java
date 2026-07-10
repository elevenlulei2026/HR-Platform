package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@TableName("employee_title_certificate")
public class EmployeeTitleCertificateEntity {
  private Long id;
  private Long employeeId;
  private String titleName;
  private String titleLevel;
  private LocalDate approvalDate;
  private LocalDate expiryDate;
  private String certificateNo;
  private String issuingOrg;
  private String remark;
  @TableField("attachment_ids")
  @JsonIgnore
  private String attachmentIdsData;
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
  public String getRemark() { return remark; }
  public void setRemark(String remark) { this.remark = remark; }

  public List<String> getAttachmentIds() {
    if (attachmentIdsData == null || attachmentIdsData.isBlank()) {
      return Collections.emptyList();
    }
    return Arrays.stream(attachmentIdsData.split(","))
        .map(String::trim)
        .filter(value -> !value.isEmpty())
        .collect(Collectors.toList());
  }

  public void setAttachmentIds(List<String> attachmentIds) {
    if (attachmentIds == null || attachmentIds.isEmpty()) {
      this.attachmentIdsData = null;
      return;
    }
    this.attachmentIdsData = attachmentIds.stream()
        .filter(Objects::nonNull)
        .map(String::trim)
        .filter(value -> !value.isEmpty())
        .collect(Collectors.joining(","));
  }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
