package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_agent_assignment")
public class EmployeeAgentAssignmentEntity {
  private Long id;
  private Long employeeId;
  /** 主智能体标签 YES/NO */
  private String primaryAgentTag;
  /** 开始日期 */
  private LocalDate startDate;
  /** 结束日期 */
  private LocalDate endDate;
  /** 智能体 */
  private String agentName;
  /** 智能体识别 */
  private String agentIdentity;
  /** 智能体岗位角色 */
  private String agentRole;
  /** 架构师 YES/NO */
  private String isArchitect;
  /** 民兵 YES/NO */
  private String isMilitia;
  /** 数据治理师 YES/NO */
  private String isDataSteward;
  /** 占比（%） */
  private BigDecimal percentage;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getPrimaryAgentTag() { return primaryAgentTag; }
  public void setPrimaryAgentTag(String primaryAgentTag) { this.primaryAgentTag = primaryAgentTag; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public String getAgentName() { return agentName; }
  public void setAgentName(String agentName) { this.agentName = agentName; }
  public String getAgentIdentity() { return agentIdentity; }
  public void setAgentIdentity(String agentIdentity) { this.agentIdentity = agentIdentity; }
  public String getAgentRole() { return agentRole; }
  public void setAgentRole(String agentRole) { this.agentRole = agentRole; }
  public String getIsArchitect() { return isArchitect; }
  public void setIsArchitect(String isArchitect) { this.isArchitect = isArchitect; }
  public String getIsMilitia() { return isMilitia; }
  public void setIsMilitia(String isMilitia) { this.isMilitia = isMilitia; }
  public String getIsDataSteward() { return isDataSteward; }
  public void setIsDataSteward(String isDataSteward) { this.isDataSteward = isDataSteward; }
  public BigDecimal getPercentage() { return percentage; }
  public void setPercentage(BigDecimal percentage) { this.percentage = percentage; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
