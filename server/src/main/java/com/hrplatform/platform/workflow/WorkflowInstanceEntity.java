package com.hrplatform.platform.workflow;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("workflow_instance")
public class WorkflowInstanceEntity {
  private Long id;
  private Long definitionId;
  private String definitionCode;
  private String definitionName;
  private String businessType;
  private String businessId;
  private String status;
  private Long initiatorUserId;
  private Integer currentNodeIndex;
  private String contextJson;
  private LocalDateTime completedAt;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public Long getDefinitionId() {
    return definitionId;
  }

  public void setDefinitionId(Long definitionId) {
    this.definitionId = definitionId;
  }

  public String getDefinitionCode() {
    return definitionCode;
  }

  public void setDefinitionCode(String definitionCode) {
    this.definitionCode = definitionCode;
  }

  public String getDefinitionName() {
    return definitionName;
  }

  public void setDefinitionName(String definitionName) {
    this.definitionName = definitionName;
  }

  public String getBusinessType() {
    return businessType;
  }

  public void setBusinessType(String businessType) {
    this.businessType = businessType;
  }

  public String getBusinessId() {
    return businessId;
  }

  public void setBusinessId(String businessId) {
    this.businessId = businessId;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Long getInitiatorUserId() {
    return initiatorUserId;
  }

  public void setInitiatorUserId(Long initiatorUserId) {
    this.initiatorUserId = initiatorUserId;
  }

  public Integer getCurrentNodeIndex() {
    return currentNodeIndex;
  }

  public void setCurrentNodeIndex(Integer currentNodeIndex) {
    this.currentNodeIndex = currentNodeIndex;
  }

  public String getContextJson() {
    return contextJson;
  }

  public void setContextJson(String contextJson) {
    this.contextJson = contextJson;
  }

  public LocalDateTime getCompletedAt() {
    return completedAt;
  }

  public void setCompletedAt(LocalDateTime completedAt) {
    this.completedAt = completedAt;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
