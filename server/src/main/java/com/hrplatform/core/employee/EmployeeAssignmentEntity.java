package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_assignment")
public class EmployeeAssignmentEntity {
  private Long id;
  private Long employeeId;
  private Long organizationId;
  private Long positionId;
  private Long jobId;
  private String jobGradeCode;
  private String jobSequence;
  private String employmentType;
  private String employmentSubType;
  private String employeeNature;
  private String contractLocation;
  private String workLocation;
  private Boolean isPrimary;
  private Boolean isResponsibilitySystem;
  private String approvalAuthority;
  private Boolean isManagementCadre;
  private Boolean isCoreTalent;
  private String specialTags;
  private String groupAttrLevel;
  private Long payrollCompanyId;
  private Long costLegalEntityId;
  private String salaryGroup;
  private String businessUnit;
  private Long legalEntityId;
  private String groupName;
  private String businessGroup;
  private String systemName;
  private String secondarySystem;
  private String centerName;
  private String departmentName;
  private String moduleName;
  private String teamName;
  private String secondaryTeam;
  private String lineOrStore;
  private String supplier;
  private String probationPeriod;
  private LocalDate expectedRegularizationDate;
  private String regularizationOpinion;
  private LocalDate actualRegularizationDate;
  private LocalDate groupResponsibilityStartDate;
  private LocalDate groupSeniorityStartDate;
  private String tenureOnPosition;
  private String companyTenure;
  private String hrCoordinatorNo;
  private String hrbpNo;
  private String sscNo;
  private LocalDate hireDate;
  private Boolean isRehire;
  private String movementType;
  private String reasonCode;
  private String reasonSubCode;
  private String employeeGroupCode;
  private String employeeSubgroupCode;
  private String legalEntityCode;
  private String payrollCompanyCode;
  private String costLegalEntityCode;
  private LocalDate positionStartDate;
  private String trueResignationReasonHrbp;
  private String trueResignationReasonSubHrbp;
  private Long handoverEmployeeId;
  private String resignationDestination;
  private Boolean nonCompeteCompanySuggest;
  private Boolean nonCompeteWithPay;
  private String assignmentIndicator;
  /** API 入参：CURRENT | NEW_VERSION，非持久化字段 */
  @TableField(exist = false)
  private String editMode;
  private LocalDate effectiveStartDate;
  private LocalDate effectiveEndDate;
  private String status;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public Long getOrganizationId() { return organizationId; }
  public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }
  public Long getPositionId() { return positionId; }
  public void setPositionId(Long positionId) { this.positionId = positionId; }
  public Long getJobId() { return jobId; }
  public void setJobId(Long jobId) { this.jobId = jobId; }
  public String getJobGradeCode() { return jobGradeCode; }
  public void setJobGradeCode(String jobGradeCode) { this.jobGradeCode = jobGradeCode; }
  public String getJobSequence() { return jobSequence; }
  public void setJobSequence(String jobSequence) { this.jobSequence = jobSequence; }
  public String getEmploymentType() { return employmentType; }
  public void setEmploymentType(String employmentType) { this.employmentType = employmentType; }
  public String getEmploymentSubType() { return employmentSubType; }
  public void setEmploymentSubType(String employmentSubType) {
    this.employmentSubType = employmentSubType;
  }
  public String getEmployeeNature() { return employeeNature; }
  public void setEmployeeNature(String employeeNature) { this.employeeNature = employeeNature; }
  public String getContractLocation() { return contractLocation; }
  public void setContractLocation(String contractLocation) {
    this.contractLocation = contractLocation;
  }
  public String getWorkLocation() { return workLocation; }
  public void setWorkLocation(String workLocation) { this.workLocation = workLocation; }
  public Boolean getIsPrimary() { return isPrimary; }
  public void setIsPrimary(Boolean isPrimary) { this.isPrimary = isPrimary; }
  public Boolean getIsResponsibilitySystem() { return isResponsibilitySystem; }
  public void setIsResponsibilitySystem(Boolean isResponsibilitySystem) {
    this.isResponsibilitySystem = isResponsibilitySystem;
  }
  public String getApprovalAuthority() { return approvalAuthority; }
  public void setApprovalAuthority(String approvalAuthority) {
    this.approvalAuthority = approvalAuthority;
  }
  public Boolean getIsManagementCadre() { return isManagementCadre; }
  public void setIsManagementCadre(Boolean isManagementCadre) {
    this.isManagementCadre = isManagementCadre;
  }
  public Boolean getIsCoreTalent() { return isCoreTalent; }
  public void setIsCoreTalent(Boolean isCoreTalent) { this.isCoreTalent = isCoreTalent; }
  public String getSpecialTags() { return specialTags; }
  public void setSpecialTags(String specialTags) { this.specialTags = specialTags; }
  public String getGroupAttrLevel() { return groupAttrLevel; }
  public void setGroupAttrLevel(String groupAttrLevel) { this.groupAttrLevel = groupAttrLevel; }
  public Long getPayrollCompanyId() { return payrollCompanyId; }
  public void setPayrollCompanyId(Long payrollCompanyId) {
    this.payrollCompanyId = payrollCompanyId;
  }
  public Long getCostLegalEntityId() { return costLegalEntityId; }
  public void setCostLegalEntityId(Long costLegalEntityId) {
    this.costLegalEntityId = costLegalEntityId;
  }
  public String getSalaryGroup() { return salaryGroup; }
  public void setSalaryGroup(String salaryGroup) { this.salaryGroup = salaryGroup; }
  public String getBusinessUnit() { return businessUnit; }
  public void setBusinessUnit(String businessUnit) { this.businessUnit = businessUnit; }
  public Long getLegalEntityId() { return legalEntityId; }
  public void setLegalEntityId(Long legalEntityId) { this.legalEntityId = legalEntityId; }
  public String getGroupName() { return groupName; }
  public void setGroupName(String groupName) { this.groupName = groupName; }
  public String getBusinessGroup() { return businessGroup; }
  public void setBusinessGroup(String businessGroup) { this.businessGroup = businessGroup; }
  public String getSystemName() { return systemName; }
  public void setSystemName(String systemName) { this.systemName = systemName; }
  public String getSecondarySystem() { return secondarySystem; }
  public void setSecondarySystem(String secondarySystem) {
    this.secondarySystem = secondarySystem;
  }
  public String getCenterName() { return centerName; }
  public void setCenterName(String centerName) { this.centerName = centerName; }
  public String getDepartmentName() { return departmentName; }
  public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
  public String getModuleName() { return moduleName; }
  public void setModuleName(String moduleName) { this.moduleName = moduleName; }
  public String getTeamName() { return teamName; }
  public void setTeamName(String teamName) { this.teamName = teamName; }
  public String getSecondaryTeam() { return secondaryTeam; }
  public void setSecondaryTeam(String secondaryTeam) { this.secondaryTeam = secondaryTeam; }
  public String getLineOrStore() { return lineOrStore; }
  public void setLineOrStore(String lineOrStore) { this.lineOrStore = lineOrStore; }
  public String getSupplier() { return supplier; }
  public void setSupplier(String supplier) { this.supplier = supplier; }
  public String getProbationPeriod() { return probationPeriod; }
  public void setProbationPeriod(String probationPeriod) {
    this.probationPeriod = probationPeriod;
  }
  public LocalDate getExpectedRegularizationDate() { return expectedRegularizationDate; }
  public void setExpectedRegularizationDate(LocalDate expectedRegularizationDate) {
    this.expectedRegularizationDate = expectedRegularizationDate;
  }
  public String getRegularizationOpinion() { return regularizationOpinion; }
  public void setRegularizationOpinion(String regularizationOpinion) {
    this.regularizationOpinion = regularizationOpinion;
  }
  public LocalDate getActualRegularizationDate() { return actualRegularizationDate; }
  public void setActualRegularizationDate(LocalDate actualRegularizationDate) {
    this.actualRegularizationDate = actualRegularizationDate;
  }
  public LocalDate getGroupResponsibilityStartDate() { return groupResponsibilityStartDate; }
  public void setGroupResponsibilityStartDate(LocalDate groupResponsibilityStartDate) {
    this.groupResponsibilityStartDate = groupResponsibilityStartDate;
  }
  public LocalDate getGroupSeniorityStartDate() { return groupSeniorityStartDate; }
  public void setGroupSeniorityStartDate(LocalDate groupSeniorityStartDate) {
    this.groupSeniorityStartDate = groupSeniorityStartDate;
  }
  public String getTenureOnPosition() { return tenureOnPosition; }
  public void setTenureOnPosition(String tenureOnPosition) { this.tenureOnPosition = tenureOnPosition; }
  public String getCompanyTenure() { return companyTenure; }
  public void setCompanyTenure(String companyTenure) { this.companyTenure = companyTenure; }
  public String getHrCoordinatorNo() { return hrCoordinatorNo; }
  public void setHrCoordinatorNo(String hrCoordinatorNo) { this.hrCoordinatorNo = hrCoordinatorNo; }
  public String getHrbpNo() { return hrbpNo; }
  public void setHrbpNo(String hrbpNo) { this.hrbpNo = hrbpNo; }
  public String getSscNo() { return sscNo; }
  public void setSscNo(String sscNo) { this.sscNo = sscNo; }
  public LocalDate getHireDate() { return hireDate; }
  public void setHireDate(LocalDate hireDate) { this.hireDate = hireDate; }
  public Boolean getIsRehire() { return isRehire; }
  public void setIsRehire(Boolean isRehire) { this.isRehire = isRehire; }
  public String getMovementType() { return movementType; }
  public void setMovementType(String movementType) { this.movementType = movementType; }
  public String getReasonCode() { return reasonCode; }
  public void setReasonCode(String reasonCode) { this.reasonCode = reasonCode; }
  public String getReasonSubCode() { return reasonSubCode; }
  public void setReasonSubCode(String reasonSubCode) { this.reasonSubCode = reasonSubCode; }
  public String getEmployeeGroupCode() { return employeeGroupCode; }
  public void setEmployeeGroupCode(String employeeGroupCode) { this.employeeGroupCode = employeeGroupCode; }
  public String getEmployeeSubgroupCode() { return employeeSubgroupCode; }
  public void setEmployeeSubgroupCode(String employeeSubgroupCode) {
    this.employeeSubgroupCode = employeeSubgroupCode;
  }
  public String getLegalEntityCode() { return legalEntityCode; }
  public void setLegalEntityCode(String legalEntityCode) { this.legalEntityCode = legalEntityCode; }
  public String getPayrollCompanyCode() { return payrollCompanyCode; }
  public void setPayrollCompanyCode(String payrollCompanyCode) {
    this.payrollCompanyCode = payrollCompanyCode;
  }
  public String getCostLegalEntityCode() { return costLegalEntityCode; }
  public void setCostLegalEntityCode(String costLegalEntityCode) {
    this.costLegalEntityCode = costLegalEntityCode;
  }
  public LocalDate getPositionStartDate() { return positionStartDate; }
  public void setPositionStartDate(LocalDate positionStartDate) {
    this.positionStartDate = positionStartDate;
  }
  public String getTrueResignationReasonHrbp() { return trueResignationReasonHrbp; }
  public void setTrueResignationReasonHrbp(String trueResignationReasonHrbp) {
    this.trueResignationReasonHrbp = trueResignationReasonHrbp;
  }
  public String getTrueResignationReasonSubHrbp() { return trueResignationReasonSubHrbp; }
  public void setTrueResignationReasonSubHrbp(String trueResignationReasonSubHrbp) {
    this.trueResignationReasonSubHrbp = trueResignationReasonSubHrbp;
  }
  public Long getHandoverEmployeeId() { return handoverEmployeeId; }
  public void setHandoverEmployeeId(Long handoverEmployeeId) {
    this.handoverEmployeeId = handoverEmployeeId;
  }
  public String getResignationDestination() { return resignationDestination; }
  public void setResignationDestination(String resignationDestination) {
    this.resignationDestination = resignationDestination;
  }
  public Boolean getNonCompeteCompanySuggest() { return nonCompeteCompanySuggest; }
  public void setNonCompeteCompanySuggest(Boolean nonCompeteCompanySuggest) {
    this.nonCompeteCompanySuggest = nonCompeteCompanySuggest;
  }
  public Boolean getNonCompeteWithPay() { return nonCompeteWithPay; }
  public void setNonCompeteWithPay(Boolean nonCompeteWithPay) {
    this.nonCompeteWithPay = nonCompeteWithPay;
  }
  public String getAssignmentIndicator() { return assignmentIndicator; }
  public void setAssignmentIndicator(String assignmentIndicator) {
    this.assignmentIndicator = assignmentIndicator;
  }
  public String getEditMode() { return editMode; }
  public void setEditMode(String editMode) { this.editMode = editMode; }
  public LocalDate getEffectiveStartDate() { return effectiveStartDate; }
  public void setEffectiveStartDate(LocalDate effectiveStartDate) { this.effectiveStartDate = effectiveStartDate; }
  public LocalDate getEffectiveEndDate() { return effectiveEndDate; }
  public void setEffectiveEndDate(LocalDate effectiveEndDate) { this.effectiveEndDate = effectiveEndDate; }
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
