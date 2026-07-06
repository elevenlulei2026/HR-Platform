package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("employee_bank_account")
public class EmployeeBankAccountEntity {
  private Long id;
  private Long employeeId;
  private String accountType;
  private String countryCode;
  private Long bankId;
  private Long branchId;
  private String accountNo;
  private String accountName;
  private String currencyCode;
  private String cnapsCode;
  private Boolean isPrimary;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getAccountType() { return accountType; }
  public void setAccountType(String accountType) { this.accountType = accountType; }
  public String getCountryCode() { return countryCode; }
  public void setCountryCode(String countryCode) { this.countryCode = countryCode; }
  public Long getBankId() { return bankId; }
  public void setBankId(Long bankId) { this.bankId = bankId; }
  public Long getBranchId() { return branchId; }
  public void setBranchId(Long branchId) { this.branchId = branchId; }
  public String getAccountNo() { return accountNo; }
  public void setAccountNo(String accountNo) { this.accountNo = accountNo; }
  public String getAccountName() { return accountName; }
  public void setAccountName(String accountName) { this.accountName = accountName; }
  public String getCurrencyCode() { return currencyCode; }
  public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
  public String getCnapsCode() { return cnapsCode; }
  public void setCnapsCode(String cnapsCode) { this.cnapsCode = cnapsCode; }
  public Boolean getIsPrimary() { return isPrimary; }
  public void setIsPrimary(Boolean isPrimary) { this.isPrimary = isPrimary; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
