package com.hrplatform.core.organization;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("organization")
public class OrganizationEntity {
  private Long id;
  private String code;
  private String name;
  private String parentCode;
  private Long parentId;
  private String orgType;
  private String departmentType;
  private String location;
  private String legalCompany;
  private String departmentLevel;
  private String costCenter;
  private String orgLeaderNo;
  private String supervisingLeaderNo;
  private String orgAttribute;
  private String orgFunction;
  private String orgTags;
  private String financialCode;
  private String hrCoordinatorNo;
  private String hrbpNo;
  private String sscNo;
  private LocalDate effectiveStartDate;
  private LocalDate effectiveEndDate;
  private String status;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getCode() { return code; }
  public void setCode(String code) { this.code = code; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getParentCode() { return parentCode; }
  public void setParentCode(String parentCode) { this.parentCode = parentCode; }
  public Long getParentId() { return parentId; }
  public void setParentId(Long parentId) { this.parentId = parentId; }
  public String getOrgType() { return orgType; }
  public void setOrgType(String orgType) { this.orgType = orgType; }
  public String getDepartmentType() { return departmentType; }
  public void setDepartmentType(String departmentType) { this.departmentType = departmentType; }
  public String getLocation() { return location; }
  public void setLocation(String location) { this.location = location; }
  public String getLegalCompany() { return legalCompany; }
  public void setLegalCompany(String legalCompany) { this.legalCompany = legalCompany; }
  public String getDepartmentLevel() { return departmentLevel; }
  public void setDepartmentLevel(String departmentLevel) { this.departmentLevel = departmentLevel; }
  public String getCostCenter() { return costCenter; }
  public void setCostCenter(String costCenter) { this.costCenter = costCenter; }
  public String getOrgLeaderNo() { return orgLeaderNo; }
  public void setOrgLeaderNo(String orgLeaderNo) { this.orgLeaderNo = orgLeaderNo; }
  public String getSupervisingLeaderNo() { return supervisingLeaderNo; }
  public void setSupervisingLeaderNo(String supervisingLeaderNo) { this.supervisingLeaderNo = supervisingLeaderNo; }
  public String getOrgAttribute() { return orgAttribute; }
  public void setOrgAttribute(String orgAttribute) { this.orgAttribute = orgAttribute; }
  public String getOrgFunction() { return orgFunction; }
  public void setOrgFunction(String orgFunction) { this.orgFunction = orgFunction; }
  public String getOrgTags() { return orgTags; }
  public void setOrgTags(String orgTags) { this.orgTags = orgTags; }
  public String getFinancialCode() { return financialCode; }
  public void setFinancialCode(String financialCode) { this.financialCode = financialCode; }
  public String getHrCoordinatorNo() { return hrCoordinatorNo; }
  public void setHrCoordinatorNo(String hrCoordinatorNo) { this.hrCoordinatorNo = hrCoordinatorNo; }
  public String getHrbpNo() { return hrbpNo; }
  public void setHrbpNo(String hrbpNo) { this.hrbpNo = hrbpNo; }
  public String getSscNo() { return sscNo; }
  public void setSscNo(String sscNo) { this.sscNo = sscNo; }
  public LocalDate getEffectiveStartDate() { return effectiveStartDate; }
  public void setEffectiveStartDate(LocalDate effectiveStartDate) { this.effectiveStartDate = effectiveStartDate; }
  public LocalDate getEffectiveEndDate() { return effectiveEndDate; }
  public void setEffectiveEndDate(LocalDate effectiveEndDate) { this.effectiveEndDate = effectiveEndDate; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
