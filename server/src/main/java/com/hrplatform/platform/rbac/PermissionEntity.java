package com.hrplatform.platform.rbac;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("permission")
public class PermissionEntity {
  private Long id;
  private String code;
  private String name;
  private String description;
  private String status;
  private Long menuId;
  private String moduleCode;
  private String resourceCode;
  private String actionCode;
  private Integer sortOrder;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getCode() {
    return code;
  }

  public void setCode(String code) {
    this.code = code;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Long getMenuId() { return menuId; }
  public void setMenuId(Long menuId) { this.menuId = menuId; }
  public String getModuleCode() { return moduleCode; }
  public void setModuleCode(String moduleCode) { this.moduleCode = moduleCode; }
  public String getResourceCode() { return resourceCode; }
  public void setResourceCode(String resourceCode) { this.resourceCode = resourceCode; }
  public String getActionCode() { return actionCode; }
  public void setActionCode(String actionCode) { this.actionCode = actionCode; }
  public Integer getSortOrder() { return sortOrder; }
  public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

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

