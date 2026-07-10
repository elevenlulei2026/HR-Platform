package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_accommodation")
public class EmployeeAccommodationEntity {
  private Long id;
  private Long employeeId;
  private LocalDate effectiveStartDate;
  private LocalDate effectiveEndDate;
  private String status;
  private String hasAccommodation;
  private BigDecimal accommodationFeeTotal;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;
  /** API 入参：CURRENT | NEW_VERSION，非持久化字段 */
  @TableField(exist = false)
  private String editMode;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public LocalDate getEffectiveStartDate() { return effectiveStartDate; }
  public void setEffectiveStartDate(LocalDate effectiveStartDate) { this.effectiveStartDate = effectiveStartDate; }
  public LocalDate getEffectiveEndDate() { return effectiveEndDate; }
  public void setEffectiveEndDate(LocalDate effectiveEndDate) { this.effectiveEndDate = effectiveEndDate; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getHasAccommodation() { return hasAccommodation; }
  public void setHasAccommodation(String hasAccommodation) { this.hasAccommodation = hasAccommodation; }
  public BigDecimal getAccommodationFeeTotal() { return accommodationFeeTotal; }
  public void setAccommodationFeeTotal(BigDecimal accommodationFeeTotal) { this.accommodationFeeTotal = accommodationFeeTotal; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
  public String getEditMode() { return editMode; }
  public void setEditMode(String editMode) { this.editMode = editMode; }
}
