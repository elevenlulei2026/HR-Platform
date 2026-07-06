package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_work_experience")
public class EmployeeWorkExperienceEntity {
  private Long id;
  private Long employeeId;
  private LocalDate startDate;
  private LocalDate endDate;
  private String employerName;
  private String department;
  private String position;
  private String leaveReason;
  private BigDecimal lastSalary;
  private String referee;
  private String refereePhone;
  private String payFrequency;
  private String currencyCode;
  private String description;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public String getEmployerName() { return employerName; }
  public void setEmployerName(String employerName) { this.employerName = employerName; }
  public String getDepartment() { return department; }
  public void setDepartment(String department) { this.department = department; }
  public String getPosition() { return position; }
  public void setPosition(String position) { this.position = position; }
  public String getLeaveReason() { return leaveReason; }
  public void setLeaveReason(String leaveReason) { this.leaveReason = leaveReason; }
  public BigDecimal getLastSalary() { return lastSalary; }
  public void setLastSalary(BigDecimal lastSalary) { this.lastSalary = lastSalary; }
  public String getReferee() { return referee; }
  public void setReferee(String referee) { this.referee = referee; }
  public String getRefereePhone() { return refereePhone; }
  public void setRefereePhone(String refereePhone) { this.refereePhone = refereePhone; }
  public String getPayFrequency() { return payFrequency; }
  public void setPayFrequency(String payFrequency) { this.payFrequency = payFrequency; }
  public String getCurrencyCode() { return currencyCode; }
  public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
