package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_project")
public class EmployeeProjectEntity {
  private Long id;
  private Long employeeId;
  /** 项目名称 */
  private String projectName;
  /** 项目描述 */
  private String projectDescription;
  /** 项目开始日期 */
  private LocalDate startDate;
  /** 项目结束日期 */
  private LocalDate endDate;
  /** 项目角色 */
  private String role;
  /** 具体职责描述 */
  private String responsibilityDescription;
  /** 汇报对象 */
  private String reportTo;
  /** 下属或指导人员 */
  private String subordinatesOrMentees;
  /** 核心技能 */
  private String coreSkills;
  /** 个人主要贡献 */
  private String personalContribution;
  /** 可量化的成果和指标 */
  private String quantifiableResults;
  /** 项目最终成果（字典 PROJECT_FINAL_OUTCOME） */
  private String finalOutcome;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getProjectName() { return projectName; }
  public void setProjectName(String projectName) { this.projectName = projectName; }
  public String getProjectDescription() { return projectDescription; }
  public void setProjectDescription(String projectDescription) { this.projectDescription = projectDescription; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public String getRole() { return role; }
  public void setRole(String role) { this.role = role; }
  public String getResponsibilityDescription() { return responsibilityDescription; }
  public void setResponsibilityDescription(String responsibilityDescription) { this.responsibilityDescription = responsibilityDescription; }
  public String getReportTo() { return reportTo; }
  public void setReportTo(String reportTo) { this.reportTo = reportTo; }
  public String getSubordinatesOrMentees() { return subordinatesOrMentees; }
  public void setSubordinatesOrMentees(String subordinatesOrMentees) { this.subordinatesOrMentees = subordinatesOrMentees; }
  public String getCoreSkills() { return coreSkills; }
  public void setCoreSkills(String coreSkills) { this.coreSkills = coreSkills; }
  public String getPersonalContribution() { return personalContribution; }
  public void setPersonalContribution(String personalContribution) { this.personalContribution = personalContribution; }
  public String getQuantifiableResults() { return quantifiableResults; }
  public void setQuantifiableResults(String quantifiableResults) { this.quantifiableResults = quantifiableResults; }
  public String getFinalOutcome() { return finalOutcome; }
  public void setFinalOutcome(String finalOutcome) { this.finalOutcome = finalOutcome; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
