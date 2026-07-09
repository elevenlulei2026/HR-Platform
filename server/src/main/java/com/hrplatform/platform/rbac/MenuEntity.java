package com.hrplatform.platform.rbac;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("sys_menu")
public class MenuEntity {
  private Long id;
  private Long parentId;
  private String code;
  private String title;
  private String path;
  private String icon;
  private String menuType;
  private String permissionCode;
  private Integer sortOrder;
  private String status;
  private String description;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getParentId() { return parentId; }
  public void setParentId(Long parentId) { this.parentId = parentId; }
  public String getCode() { return code; }
  public void setCode(String code) { this.code = code; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getPath() { return path; }
  public void setPath(String path) { this.path = path; }
  public String getIcon() { return icon; }
  public void setIcon(String icon) { this.icon = icon; }
  public String getMenuType() { return menuType; }
  public void setMenuType(String menuType) { this.menuType = menuType; }
  public String getPermissionCode() { return permissionCode; }
  public void setPermissionCode(String permissionCode) { this.permissionCode = permissionCode; }
  public Integer getSortOrder() { return sortOrder; }
  public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
