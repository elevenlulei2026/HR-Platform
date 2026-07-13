package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("employee_values_assessment")
public class EmployeeValuesAssessmentEntity {
  private Long id;
  private Long employeeId;
  /** 考核时间（文本手填） */
  private String assessmentTime;
  /** 最终等级（文本手填） */
  private String finalLevel;
  /** 上级评价 */
  private String superiorEvaluation;
  /** 同事评价 */
  private String peerEvaluation;
  /** 下级评价 */
  private String subordinateEvaluation;
  /** 用户第一 */
  private String userFirst;
  /** 目标第一 */
  private String goalFirst;
  /** 实干担当 */
  private String pragmaticResponsibility;
  /** 善于复盘 */
  private String goodAtReview;
  /** 敢为人先 */
  private String dareToLead;
  /** 提质增效 */
  private String qualityEfficiency;
  /** 全情投入 */
  private String fullCommitment;
  /** 热爱事业 */
  private String loveCareer;
  /** 永争第一 */
  private String striveForFirst;
  /** 勇于挑战 */
  private String braveChallenge;
  /** 组织为重 */
  private String organizationFirst;
  /** 成就他人 */
  private String helpOthersSucceed;
  /** 廉洁正直 */
  private String integrityHonesty;
  /** 遵纪守法 */
  private String lawAbiding;
  /** 0分文本 */
  private String zeroScoreText;
  /** 4分文本 */
  private String fourScoreText;
  /** 红灯 */
  private String redLight;
  /** 黄灯 */
  private String yellowLight;
  /** 绿灯 */
  private String greenLight;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private Long createdBy;
  private Long updatedBy;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Long getEmployeeId() { return employeeId; }
  public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
  public String getAssessmentTime() { return assessmentTime; }
  public void setAssessmentTime(String assessmentTime) { this.assessmentTime = assessmentTime; }
  public String getFinalLevel() { return finalLevel; }
  public void setFinalLevel(String finalLevel) { this.finalLevel = finalLevel; }
  public String getSuperiorEvaluation() { return superiorEvaluation; }
  public void setSuperiorEvaluation(String superiorEvaluation) { this.superiorEvaluation = superiorEvaluation; }
  public String getPeerEvaluation() { return peerEvaluation; }
  public void setPeerEvaluation(String peerEvaluation) { this.peerEvaluation = peerEvaluation; }
  public String getSubordinateEvaluation() { return subordinateEvaluation; }
  public void setSubordinateEvaluation(String subordinateEvaluation) { this.subordinateEvaluation = subordinateEvaluation; }
  public String getUserFirst() { return userFirst; }
  public void setUserFirst(String userFirst) { this.userFirst = userFirst; }
  public String getGoalFirst() { return goalFirst; }
  public void setGoalFirst(String goalFirst) { this.goalFirst = goalFirst; }
  public String getPragmaticResponsibility() { return pragmaticResponsibility; }
  public void setPragmaticResponsibility(String pragmaticResponsibility) { this.pragmaticResponsibility = pragmaticResponsibility; }
  public String getGoodAtReview() { return goodAtReview; }
  public void setGoodAtReview(String goodAtReview) { this.goodAtReview = goodAtReview; }
  public String getDareToLead() { return dareToLead; }
  public void setDareToLead(String dareToLead) { this.dareToLead = dareToLead; }
  public String getQualityEfficiency() { return qualityEfficiency; }
  public void setQualityEfficiency(String qualityEfficiency) { this.qualityEfficiency = qualityEfficiency; }
  public String getFullCommitment() { return fullCommitment; }
  public void setFullCommitment(String fullCommitment) { this.fullCommitment = fullCommitment; }
  public String getLoveCareer() { return loveCareer; }
  public void setLoveCareer(String loveCareer) { this.loveCareer = loveCareer; }
  public String getStriveForFirst() { return striveForFirst; }
  public void setStriveForFirst(String striveForFirst) { this.striveForFirst = striveForFirst; }
  public String getBraveChallenge() { return braveChallenge; }
  public void setBraveChallenge(String braveChallenge) { this.braveChallenge = braveChallenge; }
  public String getOrganizationFirst() { return organizationFirst; }
  public void setOrganizationFirst(String organizationFirst) { this.organizationFirst = organizationFirst; }
  public String getHelpOthersSucceed() { return helpOthersSucceed; }
  public void setHelpOthersSucceed(String helpOthersSucceed) { this.helpOthersSucceed = helpOthersSucceed; }
  public String getIntegrityHonesty() { return integrityHonesty; }
  public void setIntegrityHonesty(String integrityHonesty) { this.integrityHonesty = integrityHonesty; }
  public String getLawAbiding() { return lawAbiding; }
  public void setLawAbiding(String lawAbiding) { this.lawAbiding = lawAbiding; }
  public String getZeroScoreText() { return zeroScoreText; }
  public void setZeroScoreText(String zeroScoreText) { this.zeroScoreText = zeroScoreText; }
  public String getFourScoreText() { return fourScoreText; }
  public void setFourScoreText(String fourScoreText) { this.fourScoreText = fourScoreText; }
  public String getRedLight() { return redLight; }
  public void setRedLight(String redLight) { this.redLight = redLight; }
  public String getYellowLight() { return yellowLight; }
  public void setYellowLight(String yellowLight) { this.yellowLight = yellowLight; }
  public String getGreenLight() { return greenLight; }
  public void setGreenLight(String greenLight) { this.greenLight = greenLight; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
  public Long getCreatedBy() { return createdBy; }
  public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
  public Long getUpdatedBy() { return updatedBy; }
  public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
