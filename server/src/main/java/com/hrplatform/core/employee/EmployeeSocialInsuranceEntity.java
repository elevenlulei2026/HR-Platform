package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("employee_social_insurance")
public class EmployeeSocialInsuranceEntity {
  private Long id;
  private Long employeeId;
  private String socialSecurityNo;
  private BigDecimal socialBase;
  private String housingFundNo;
  private BigDecimal housingBase;
  private String company;
  private String insuranceRegion;
  private Boolean isCompanyPayroll;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getSocialSecurityNo() { return socialSecurityNo; }
  public void setSocialSecurityNo(String socialSecurityNo) { this.socialSecurityNo = socialSecurityNo; }
  public BigDecimal getSocialBase() { return socialBase; }
  public void setSocialBase(BigDecimal socialBase) { this.socialBase = socialBase; }
  public String getHousingFundNo() { return housingFundNo; }
  public void setHousingFundNo(String housingFundNo) { this.housingFundNo = housingFundNo; }
  public BigDecimal getHousingBase() { return housingBase; }
  public void setHousingBase(BigDecimal housingBase) { this.housingBase = housingBase; }
  public String getCompany() { return company; }
  public void setCompany(String company) { this.company = company; }
  public String getInsuranceRegion() { return insuranceRegion; }
  public void setInsuranceRegion(String insuranceRegion) { this.insuranceRegion = insuranceRegion; }
  public Boolean getIsCompanyPayroll() { return isCompanyPayroll; }
  public void setIsCompanyPayroll(Boolean isCompanyPayroll) { this.isCompanyPayroll = isCompanyPayroll; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
