package com.hrplatform.modules.offboarding;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("offboarding_handover_item")
public class OffboardingHandoverItemEntity {
  private Long id;
  private Long caseId;
  private String title;
  private Integer sortOrder;
  private Boolean done;
  private LocalDateTime doneAt;
  private Long doneBy;
  private String assigneeNote;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getCaseId() { return caseId; }
  public void setCaseId(Long caseId) { this.caseId = caseId; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public Integer getSortOrder() { return sortOrder; }
  public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
  public Boolean getDone() { return done; }
  public void setDone(Boolean done) { this.done = done; }
  public LocalDateTime getDoneAt() { return doneAt; }
  public void setDoneAt(LocalDateTime doneAt) { this.doneAt = doneAt; }
  public Long getDoneBy() { return doneBy; }
  public void setDoneBy(Long doneBy) { this.doneBy = doneBy; }
  public String getAssigneeNote() { return assigneeNote; }
  public void setAssigneeNote(String assigneeNote) { this.assigneeNote = assigneeNote; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
