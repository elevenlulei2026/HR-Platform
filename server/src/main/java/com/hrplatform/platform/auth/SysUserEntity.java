package com.hrplatform.platform.auth;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("sys_user")
public class SysUserEntity {
  private Long id;
  private String username;
  private String passwordHash;
  private String displayName;
  private Long employeeId;
  private Long managerUserId;
  private String status;
  private Boolean mustChangePassword;
  private LocalDateTime passwordUpdatedAt;
  private LocalDateTime lockedUntil;
  private LocalDateTime lastLoginAt;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public String getDisplayName() {
    return displayName;
  }

  public void setDisplayName(String displayName) {
    this.displayName = displayName;
  }

  public Long getEmployeeId() {
    return employeeId;
  }

  public void setEmployeeId(Long employeeId) {
    this.employeeId = employeeId;
  }

  public Long getManagerUserId() {
    return managerUserId;
  }

  public void setManagerUserId(Long managerUserId) {
    this.managerUserId = managerUserId;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Boolean getMustChangePassword() {
    return mustChangePassword;
  }

  public void setMustChangePassword(Boolean mustChangePassword) {
    this.mustChangePassword = mustChangePassword;
  }

  public boolean mustChangePassword() {
    return Boolean.TRUE.equals(mustChangePassword);
  }

  public LocalDateTime getPasswordUpdatedAt() {
    return passwordUpdatedAt;
  }

  public void setPasswordUpdatedAt(LocalDateTime passwordUpdatedAt) {
    this.passwordUpdatedAt = passwordUpdatedAt;
  }

  public LocalDateTime getLockedUntil() {
    return lockedUntil;
  }

  public void setLockedUntil(LocalDateTime lockedUntil) {
    this.lockedUntil = lockedUntil;
  }

  public LocalDateTime getLastLoginAt() {
    return lastLoginAt;
  }

  public void setLastLoginAt(LocalDateTime lastLoginAt) {
    this.lastLoginAt = lastLoginAt;
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

  public Long getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(Long createdBy) {
    this.createdBy = createdBy;
  }

  public Long getUpdatedBy() {
    return updatedBy;
  }

  public void setUpdatedBy(Long updatedBy) {
    this.updatedBy = updatedBy;
  }
}
