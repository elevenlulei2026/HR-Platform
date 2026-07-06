package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_cost_center_allocation")
public class EmployeeCostCenterAllocationEntity {
  private Long id;
  private Long employeeId;
  private Long legalEntityId;
  private String costCenter;
  private BigDecimal percentage;
  private LocalDate effectiveStartDate;
  private LocalDate effectiveEndDate;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public Long getLegalEntityId() { return legalEntityId; }
  public void setLegalEntityId(Long legalEntityId) { this.legalEntityId = legalEntityId; }
  public String getCostCenter() { return costCenter; }
  public void setCostCenter(String costCenter) { this.costCenter = costCenter; }
  public BigDecimal getPercentage() { return percentage; }
  public void setPercentage(BigDecimal percentage) { this.percentage = percentage; }
  public LocalDate getEffectiveStartDate() { return effectiveStartDate; }
  public void setEffectiveStartDate(LocalDate effectiveStartDate) { this.effectiveStartDate = effectiveStartDate; }
  public LocalDate getEffectiveEndDate() { return effectiveEndDate; }
  public void setEffectiveEndDate(LocalDate effectiveEndDate) { this.effectiveEndDate = effectiveEndDate; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
