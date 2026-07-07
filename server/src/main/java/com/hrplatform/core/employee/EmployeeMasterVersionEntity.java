package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_master_version")
public class EmployeeMasterVersionEntity {
  private Long id;
  private Long employeeId;
  private LocalDate effectiveStartDate;
  private LocalDate effectiveEndDate;

  private String fullName;
  private String adAccount;
  private String gender;
  private String mobile;
  private String companyEmail;
  private String personalEmail;

  private String maritalStatus;
  private String politicalAffiliation;
  private String highestEducation;
  private LocalDate highestEducationGradDate;
  private String fertilityStatus;
  private String ethnicity;
  private String hobbies;
  private String nationality;
  private String householdType;
  private String householdLocation;
  private Boolean partyOrgTransferred;
  private LocalDate workStartDate;
  private String wechat;
  private String officePhone;
  private String officeExtension;
  private String homePhone;
  private String idCardAddress;
  private String residenceAddress;
  private String emergencyContactName;
  private String emergencyContactPhone;
  private String emergencyContactRelation;
  private String recruitmentChannel;
  private String recruitmentChannelDetail;
  private LocalDate groupSeniorityStartDate;

  private LocalDate hireDate;
  private String status;

  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public LocalDate getEffectiveStartDate() { return effectiveStartDate; }
  public void setEffectiveStartDate(LocalDate effectiveStartDate) { this.effectiveStartDate = effectiveStartDate; }
  public LocalDate getEffectiveEndDate() { return effectiveEndDate; }
  public void setEffectiveEndDate(LocalDate effectiveEndDate) { this.effectiveEndDate = effectiveEndDate; }

  public String getFullName() { return fullName; }
  public void setFullName(String fullName) { this.fullName = fullName; }
  public String getAdAccount() { return adAccount; }
  public void setAdAccount(String adAccount) { this.adAccount = adAccount; }
  public String getGender() { return gender; }
  public void setGender(String gender) { this.gender = gender; }
  public String getMobile() { return mobile; }
  public void setMobile(String mobile) { this.mobile = mobile; }
  public String getCompanyEmail() { return companyEmail; }
  public void setCompanyEmail(String companyEmail) { this.companyEmail = companyEmail; }
  public String getPersonalEmail() { return personalEmail; }
  public void setPersonalEmail(String personalEmail) { this.personalEmail = personalEmail; }

  public String getMaritalStatus() { return maritalStatus; }
  public void setMaritalStatus(String maritalStatus) { this.maritalStatus = maritalStatus; }
  public String getPoliticalAffiliation() { return politicalAffiliation; }
  public void setPoliticalAffiliation(String politicalAffiliation) { this.politicalAffiliation = politicalAffiliation; }
  public String getHighestEducation() { return highestEducation; }
  public void setHighestEducation(String highestEducation) { this.highestEducation = highestEducation; }
  public LocalDate getHighestEducationGradDate() { return highestEducationGradDate; }
  public void setHighestEducationGradDate(LocalDate highestEducationGradDate) { this.highestEducationGradDate = highestEducationGradDate; }
  public String getFertilityStatus() { return fertilityStatus; }
  public void setFertilityStatus(String fertilityStatus) { this.fertilityStatus = fertilityStatus; }
  public String getEthnicity() { return ethnicity; }
  public void setEthnicity(String ethnicity) { this.ethnicity = ethnicity; }
  public String getHobbies() { return hobbies; }
  public void setHobbies(String hobbies) { this.hobbies = hobbies; }
  public String getNationality() { return nationality; }
  public void setNationality(String nationality) { this.nationality = nationality; }
  public String getHouseholdType() { return householdType; }
  public void setHouseholdType(String householdType) { this.householdType = householdType; }
  public String getHouseholdLocation() { return householdLocation; }
  public void setHouseholdLocation(String householdLocation) { this.householdLocation = householdLocation; }
  public Boolean getPartyOrgTransferred() { return partyOrgTransferred; }
  public void setPartyOrgTransferred(Boolean partyOrgTransferred) { this.partyOrgTransferred = partyOrgTransferred; }
  public LocalDate getWorkStartDate() { return workStartDate; }
  public void setWorkStartDate(LocalDate workStartDate) { this.workStartDate = workStartDate; }
  public String getWechat() { return wechat; }
  public void setWechat(String wechat) { this.wechat = wechat; }
  public String getOfficePhone() { return officePhone; }
  public void setOfficePhone(String officePhone) { this.officePhone = officePhone; }
  public String getOfficeExtension() { return officeExtension; }
  public void setOfficeExtension(String officeExtension) { this.officeExtension = officeExtension; }
  public String getHomePhone() { return homePhone; }
  public void setHomePhone(String homePhone) { this.homePhone = homePhone; }
  public String getIdCardAddress() { return idCardAddress; }
  public void setIdCardAddress(String idCardAddress) { this.idCardAddress = idCardAddress; }
  public String getResidenceAddress() { return residenceAddress; }
  public void setResidenceAddress(String residenceAddress) { this.residenceAddress = residenceAddress; }
  public String getEmergencyContactName() { return emergencyContactName; }
  public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }
  public String getEmergencyContactPhone() { return emergencyContactPhone; }
  public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }
  public String getEmergencyContactRelation() { return emergencyContactRelation; }
  public void setEmergencyContactRelation(String emergencyContactRelation) { this.emergencyContactRelation = emergencyContactRelation; }
  public String getRecruitmentChannel() { return recruitmentChannel; }
  public void setRecruitmentChannel(String recruitmentChannel) { this.recruitmentChannel = recruitmentChannel; }
  public String getRecruitmentChannelDetail() { return recruitmentChannelDetail; }
  public void setRecruitmentChannelDetail(String recruitmentChannelDetail) { this.recruitmentChannelDetail = recruitmentChannelDetail; }
  public LocalDate getGroupSeniorityStartDate() { return groupSeniorityStartDate; }
  public void setGroupSeniorityStartDate(LocalDate groupSeniorityStartDate) { this.groupSeniorityStartDate = groupSeniorityStartDate; }

  public LocalDate getHireDate() { return hireDate; }
  public void setHireDate(LocalDate hireDate) { this.hireDate = hireDate; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}

