package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("employee_work_injury")
public class EmployeeWorkInjuryEntity {
  private Long id;
  private Long employeeId;
  /** 事故发生日期 */
  private LocalDate accidentDate;
  /** 事故原因 */
  private String accidentReason;
  /** 见证人 */
  private String witness;
  /** 工伤认定日期 */
  private LocalDate recognitionDate;
  /** 伤残鉴定日期 */
  private LocalDate disabilityAssessmentDate;
  /** 是否认定为工伤：YES / NO */
  private String isRecognized;
  /** 是否参加劳动力鉴定：YES / NO */
  private String participatedLaborAssessment;
  /** 劳动力鉴定级别 */
  private String laborAssessmentLevel;
  private String remark;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public LocalDate getAccidentDate() { return accidentDate; }
  public void setAccidentDate(LocalDate accidentDate) { this.accidentDate = accidentDate; }
  public String getAccidentReason() { return accidentReason; }
  public void setAccidentReason(String accidentReason) { this.accidentReason = accidentReason; }
  public String getWitness() { return witness; }
  public void setWitness(String witness) { this.witness = witness; }
  public LocalDate getRecognitionDate() { return recognitionDate; }
  public void setRecognitionDate(LocalDate recognitionDate) { this.recognitionDate = recognitionDate; }
  public LocalDate getDisabilityAssessmentDate() { return disabilityAssessmentDate; }
  public void setDisabilityAssessmentDate(LocalDate disabilityAssessmentDate) {
    this.disabilityAssessmentDate = disabilityAssessmentDate;
  }
  public String getIsRecognized() { return isRecognized; }
  public void setIsRecognized(String isRecognized) { this.isRecognized = isRecognized; }
  public String getParticipatedLaborAssessment() { return participatedLaborAssessment; }
  public void setParticipatedLaborAssessment(String participatedLaborAssessment) {
    this.participatedLaborAssessment = participatedLaborAssessment;
  }
  public String getLaborAssessmentLevel() { return laborAssessmentLevel; }
  public void setLaborAssessmentLevel(String laborAssessmentLevel) {
    this.laborAssessmentLevel = laborAssessmentLevel;
  }
  public String getRemark() { return remark; }
  public void setRemark(String remark) { this.remark = remark; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
