package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_education")
public class EmployeeEducationEntity {
  private Long id;
  private Long employeeId;
  private String degree;
  private String educationLevel;
  private Boolean isHighest;
  private String countryRegion;
  private String schoolName;
  private String major;
  private LocalDate startDate;
  private LocalDate endDate;
  private String diplomaNo;
  private String degreeNo;
  private Long attachmentId;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getDegree() { return degree; }
  public void setDegree(String degree) { this.degree = degree; }
  public String getEducationLevel() { return educationLevel; }
  public void setEducationLevel(String educationLevel) { this.educationLevel = educationLevel; }
  public Boolean getIsHighest() { return isHighest; }
  public void setIsHighest(Boolean isHighest) { this.isHighest = isHighest; }
  public String getCountryRegion() { return countryRegion; }
  public void setCountryRegion(String countryRegion) { this.countryRegion = countryRegion; }
  public String getSchoolName() { return schoolName; }
  public void setSchoolName(String schoolName) { this.schoolName = schoolName; }
  public String getMajor() { return major; }
  public void setMajor(String major) { this.major = major; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public String getDiplomaNo() { return diplomaNo; }
  public void setDiplomaNo(String diplomaNo) { this.diplomaNo = diplomaNo; }
  public String getDegreeNo() { return degreeNo; }
  public void setDegreeNo(String degreeNo) { this.degreeNo = degreeNo; }
  public Long getAttachmentId() { return attachmentId; }
  public void setAttachmentId(Long attachmentId) { this.attachmentId = attachmentId; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
