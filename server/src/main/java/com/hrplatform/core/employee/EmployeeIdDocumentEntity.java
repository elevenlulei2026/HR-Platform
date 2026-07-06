package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_id_document")
public class EmployeeIdDocumentEntity {
  private Long id;
  private Long employeeId;
  private String countryRegion;
  private String idType;
  private String idNumber;
  private LocalDate validFrom;
  private LocalDate validTo;
  private Boolean isPrimary;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getCountryRegion() { return countryRegion; }
  public void setCountryRegion(String countryRegion) { this.countryRegion = countryRegion; }
  public String getIdType() { return idType; }
  public void setIdType(String idType) { this.idType = idType; }
  public String getIdNumber() { return idNumber; }
  public void setIdNumber(String idNumber) { this.idNumber = idNumber; }
  public LocalDate getValidFrom() { return validFrom; }
  public void setValidFrom(LocalDate validFrom) { this.validFrom = validFrom; }
  public LocalDate getValidTo() { return validTo; }
  public void setValidTo(LocalDate validTo) { this.validTo = validTo; }
  public Boolean getIsPrimary() { return isPrimary; }
  public void setIsPrimary(Boolean isPrimary) { this.isPrimary = isPrimary; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
