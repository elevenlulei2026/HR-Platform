package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_penalty")
public class EmployeePenaltyEntity {
  private Long id;
  private Long employeeId;
  private LocalDate effectiveDate;
  private LocalDate archiveDate;
  private String type;
  private String level;
  private String witness;
  private BigDecimal amount;
  private String paymentMethod;
  private Boolean involvesCompensation;
  private String issuingOrg;
  private String documentNo;
  private String description;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public LocalDate getEffectiveDate() { return effectiveDate; }
  public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
  public LocalDate getArchiveDate() { return archiveDate; }
  public void setArchiveDate(LocalDate archiveDate) { this.archiveDate = archiveDate; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public String getLevel() { return level; }
  public void setLevel(String level) { this.level = level; }
  public String getWitness() { return witness; }
  public void setWitness(String witness) { this.witness = witness; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public String getPaymentMethod() { return paymentMethod; }
  public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
  public Boolean getInvolvesCompensation() { return involvesCompensation; }
  public void setInvolvesCompensation(Boolean involvesCompensation) {
    this.involvesCompensation = involvesCompensation;
  }
  public String getIssuingOrg() { return issuingOrg; }
  public void setIssuingOrg(String issuingOrg) { this.issuingOrg = issuingOrg; }
  public String getDocumentNo() { return documentNo; }
  public void setDocumentNo(String documentNo) { this.documentNo = documentNo; }
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
