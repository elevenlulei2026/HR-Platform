package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_family_member")
public class EmployeeFamilyMemberEntity {
  private Long id;
  private Long employeeId;
  private String name;
  private String relation;
  private Boolean isInternalEmployee;
  private String phone;
  private String employer;
  private String position;
  private LocalDate birthDate;
  private String birthCertificate;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getRelation() { return relation; }
  public void setRelation(String relation) { this.relation = relation; }
  public Boolean getIsInternalEmployee() { return isInternalEmployee; }
  public void setIsInternalEmployee(Boolean isInternalEmployee) { this.isInternalEmployee = isInternalEmployee; }
  public String getPhone() { return phone; }
  public void setPhone(String phone) { this.phone = phone; }
  public String getEmployer() { return employer; }
  public void setEmployer(String employer) { this.employer = employer; }
  public String getPosition() { return position; }
  public void setPosition(String position) { this.position = position; }
  public LocalDate getBirthDate() { return birthDate; }
  public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
  public String getBirthCertificate() { return birthCertificate; }
  public void setBirthCertificate(String birthCertificate) { this.birthCertificate = birthCertificate; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
