package com.hrplatform.core.organization;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("position")
public class PositionEntity {
  private Long id;
  private String code;
  private String name;
  private LocalDate effectiveStartDate;
  private LocalDate effectiveEndDate;
  private Long organizationId;
  private String status;
  private String occupationalDisease;
  private String positionCategory;
  private String positionKind;
  private String positionSequence;
  private String positionLevel;
  private String keyPosition;
  private String identityCategory;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getCode() { return code; }
  public void setCode(String code) { this.code = code; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public LocalDate getEffectiveStartDate() { return effectiveStartDate; }
  public void setEffectiveStartDate(LocalDate effectiveStartDate) { this.effectiveStartDate = effectiveStartDate; }
  public LocalDate getEffectiveEndDate() { return effectiveEndDate; }
  public void setEffectiveEndDate(LocalDate effectiveEndDate) { this.effectiveEndDate = effectiveEndDate; }
  public Long getOrganizationId() { return organizationId; }
  public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getOccupationalDisease() { return occupationalDisease; }
  public void setOccupationalDisease(String occupationalDisease) { this.occupationalDisease = occupationalDisease; }
  public String getPositionCategory() { return positionCategory; }
  public void setPositionCategory(String positionCategory) { this.positionCategory = positionCategory; }
  public String getPositionKind() { return positionKind; }
  public void setPositionKind(String positionKind) { this.positionKind = positionKind; }
  public String getPositionSequence() { return positionSequence; }
  public void setPositionSequence(String positionSequence) { this.positionSequence = positionSequence; }
  public String getPositionLevel() { return positionLevel; }
  public void setPositionLevel(String positionLevel) { this.positionLevel = positionLevel; }
  public String getKeyPosition() { return keyPosition; }
  public void setKeyPosition(String keyPosition) { this.keyPosition = keyPosition; }
  public String getIdentityCategory() { return identityCategory; }
  public void setIdentityCategory(String identityCategory) { this.identityCategory = identityCategory; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
