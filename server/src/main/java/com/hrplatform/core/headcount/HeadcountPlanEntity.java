package com.hrplatform.core.headcount;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("headcount_plan")
public class HeadcountPlanEntity {
  private Long id;
  private Long organizationId;
  private Integer fiscalYear;
  private Integer plannedCount;
  private Integer occupiedCount;
  private Integer reservedCount;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getOrganizationId() { return organizationId; }
  public void setOrganizationId(Long organizationId) { this.organizationId = organizationId; }
  public Integer getFiscalYear() { return fiscalYear; }
  public void setFiscalYear(Integer fiscalYear) { this.fiscalYear = fiscalYear; }
  public Integer getPlannedCount() { return plannedCount; }
  public void setPlannedCount(Integer plannedCount) { this.plannedCount = plannedCount; }
  public Integer getOccupiedCount() { return occupiedCount; }
  public void setOccupiedCount(Integer occupiedCount) { this.occupiedCount = occupiedCount; }
  public Integer getReservedCount() { return reservedCount; }
  public void setReservedCount(Integer reservedCount) { this.reservedCount = reservedCount; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
