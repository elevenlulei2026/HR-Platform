package com.hrplatform.modules.onboarding;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("onboarding_case")
public class OnboardingCaseEntity {
  private Long id;
  private String caseNo;
  private String candidateName;
  private String mobile;
  private String gender;
  private Long organizationId;
  private Long positionId;
  private LocalDate expectedHireDate;
  private String employmentType;
  private String status;
  private Long workflowInstanceId;
  private Long employeeId;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getCaseNo() { return caseNo; }
  public void setCaseNo(String caseNo) { this.caseNo = caseNo; }
  public String getCandidateName() { return candidateName; }
  public void setCandidateName(String candidateName) { this.candidateName = candidateName; }
  public String getMobile() { return mobile; }
  public void setMobile(String mobile) { this.mobile = mobile; }
  public String getGender() { return gender; }
  public void setGender(String gender) { this.gender = gender; }
  public Long getOrganizationId() { return organizationId; }
  public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }
  public Long getPositionId() { return positionId; }
  public void setPositionId(Long positionId) { this.positionId = positionId; }
  public LocalDate getExpectedHireDate() { return expectedHireDate; }
  public void setExpectedHireDate(LocalDate expectedHireDate) { this.expectedHireDate = expectedHireDate; }
  public String getEmploymentType() { return employmentType; }
  public void setEmploymentType(String employmentType) { this.employmentType = employmentType; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Long getWorkflowInstanceId() { return workflowInstanceId; }
  public void setWorkflowInstanceId(Long workflowInstanceId) { this.workflowInstanceId = workflowInstanceId; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
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
