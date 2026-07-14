package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.hrplatform.core.employee.archivedata.ArchiveDataSupport;
import com.hrplatform.core.organization.LegalEntityService;
import com.hrplatform.platform.crypto.FieldCryptoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;

@Service
public class EmployeeArchiveService {
  private final EmployeeService employeeService;
  private final FieldCryptoService fieldCryptoService;
  private final EmployeeFamilyMemberMapper familyMemberMapper;
  private final EmployeeInternalRelativeMapper internalRelativeMapper;
  private final EmployeeIdDocumentMapper idDocumentMapper;
  private final EmployeeCostCenterAllocationMapper costCenterAllocationMapper;
  private final EmployeeContractMapper contractMapper;
  private final EmployeeAgreementMapper agreementMapper;
  private final EmployeeAttendanceCardMapper attendanceCardMapper;
  private final EmployeeBankAccountMapper bankAccountMapper;
  private final EmployeeSocialInsuranceMapper socialInsuranceMapper;
  private final EmployeeSpecialBenefitMapper specialBenefitMapper;
  private final EmployeeWorkInjuryMapper workInjuryMapper;
  private final EmployeeAdminInfoMapper adminInfoMapper;
  private final EmployeeAccommodationMapper accommodationMapper;
  private final EmployeeAttachmentMapper attachmentMapper;
  private final EmployeeEducationMapper educationMapper;
  private final EmployeeWorkExperienceMapper workExperienceMapper;
  private final EmployeeQualificationMapper qualificationMapper;
  private final EmployeeTitleCertificateMapper titleCertificateMapper;
  private final EmployeeRewardMapper rewardMapper;
  private final EmployeePenaltyMapper penaltyMapper;
  private final EmployeeTrainingRecordMapper trainingRecordMapper;
  private final EmployeePerformanceRecordMapper performanceRecordMapper;
  private final EmployeeValuesAssessmentMapper valuesAssessmentMapper;
  private final EmployeeTalentReviewMapper talentReviewMapper;
  private final EmployeeProjectMapper projectMapper;
  private final EmployeeAgentAssignmentMapper agentAssignmentMapper;
  private final LegalEntityService legalEntityService;
  private final EmployeeAttendanceCardHelper attendanceCardHelper;
  private final EmployeeAdminInfoHelper adminInfoHelper;
  private final EmployeeAccommodationHelper accommodationHelper;
  private final ArchiveDataSupport archiveDataSupport;

  public EmployeeArchiveService(
      EmployeeService employeeService,
      FieldCryptoService fieldCryptoService,
      EmployeeFamilyMemberMapper familyMemberMapper,
      EmployeeInternalRelativeMapper internalRelativeMapper,
      EmployeeIdDocumentMapper idDocumentMapper,
      EmployeeCostCenterAllocationMapper costCenterAllocationMapper,
      EmployeeContractMapper contractMapper,
      EmployeeAgreementMapper agreementMapper,
      EmployeeAttendanceCardMapper attendanceCardMapper,
      EmployeeBankAccountMapper bankAccountMapper,
      EmployeeSocialInsuranceMapper socialInsuranceMapper,
      EmployeeSpecialBenefitMapper specialBenefitMapper,
      EmployeeWorkInjuryMapper workInjuryMapper,
      EmployeeAdminInfoMapper adminInfoMapper,
      EmployeeAccommodationMapper accommodationMapper,
      EmployeeAttachmentMapper attachmentMapper,
      EmployeeEducationMapper educationMapper,
      EmployeeWorkExperienceMapper workExperienceMapper,
      EmployeeQualificationMapper qualificationMapper,
      EmployeeTitleCertificateMapper titleCertificateMapper,
      EmployeeRewardMapper rewardMapper,
      EmployeePenaltyMapper penaltyMapper,
      EmployeeTrainingRecordMapper trainingRecordMapper,
      EmployeePerformanceRecordMapper performanceRecordMapper,
      EmployeeValuesAssessmentMapper valuesAssessmentMapper,
      EmployeeTalentReviewMapper talentReviewMapper,
      EmployeeProjectMapper projectMapper,
      EmployeeAgentAssignmentMapper agentAssignmentMapper,
      LegalEntityService legalEntityService,
      EmployeeAttendanceCardHelper attendanceCardHelper,
      EmployeeAdminInfoHelper adminInfoHelper,
      EmployeeAccommodationHelper accommodationHelper,
      ArchiveDataSupport archiveDataSupport
  ) {
    this.employeeService = employeeService;
    this.fieldCryptoService = fieldCryptoService;
    this.familyMemberMapper = familyMemberMapper;
    this.internalRelativeMapper = internalRelativeMapper;
    this.idDocumentMapper = idDocumentMapper;
    this.costCenterAllocationMapper = costCenterAllocationMapper;
    this.contractMapper = contractMapper;
    this.agreementMapper = agreementMapper;
    this.attendanceCardMapper = attendanceCardMapper;
    this.bankAccountMapper = bankAccountMapper;
    this.socialInsuranceMapper = socialInsuranceMapper;
    this.specialBenefitMapper = specialBenefitMapper;
    this.workInjuryMapper = workInjuryMapper;
    this.adminInfoMapper = adminInfoMapper;
    this.accommodationMapper = accommodationMapper;
    this.attachmentMapper = attachmentMapper;
    this.educationMapper = educationMapper;
    this.workExperienceMapper = workExperienceMapper;
    this.qualificationMapper = qualificationMapper;
    this.titleCertificateMapper = titleCertificateMapper;
    this.rewardMapper = rewardMapper;
    this.penaltyMapper = penaltyMapper;
    this.trainingRecordMapper = trainingRecordMapper;
    this.performanceRecordMapper = performanceRecordMapper;
    this.valuesAssessmentMapper = valuesAssessmentMapper;
    this.talentReviewMapper = talentReviewMapper;
    this.projectMapper = projectMapper;
    this.agentAssignmentMapper = agentAssignmentMapper;
    this.legalEntityService = legalEntityService;
    this.attendanceCardHelper = attendanceCardHelper;
    this.adminInfoHelper = adminInfoHelper;
    this.accommodationHelper = accommodationHelper;
    this.archiveDataSupport = archiveDataSupport;
  }

  public Map<String, Object> getArchiveBundle(long employeeId) {
    employeeService.require(employeeId);
    Map<String, Object> bundle = new LinkedHashMap<>();
    bundle.put("familyMembers", listFamilyMembers(employeeId));
    bundle.put("internalRelatives", listInternalRelatives(employeeId));
    bundle.put("idDocuments", listIdDocuments(employeeId));
    bundle.put("costCenterAllocations", listCostCenterAllocations(employeeId));
    bundle.put("contracts", listContracts(employeeId));
    bundle.put("agreements", listAgreements(employeeId));
    bundle.put("attendanceCards", listAttendanceCards(employeeId));
    bundle.put("bankAccounts", listBankAccounts(employeeId));
    bundle.put("socialInsurances", listSocialInsurances(employeeId));
    bundle.put("specialBenefits", listSpecialBenefits(employeeId));
    bundle.put("workInjuries", listWorkInjuries(employeeId));
    bundle.put("adminInfos", listAdminInfos(employeeId));
    bundle.put("accommodations", listAccommodations(employeeId));
    bundle.put("attachments", listAttachments(employeeId));
    bundle.put("educations", listEducations(employeeId));
    bundle.put("workExperiences", listWorkExperiences(employeeId));
    bundle.put("qualifications", listQualifications(employeeId));
    bundle.put("titleCertificates", listTitleCertificates(employeeId));
    bundle.put("rewards", listRewards(employeeId));
    bundle.put("penalties", listPenalties(employeeId));
    bundle.put("trainingRecords", listTrainingRecords(employeeId));
    bundle.put("performanceRecords", listPerformanceRecords(employeeId));
    bundle.put("valuesAssessments", listValuesAssessments(employeeId));
    bundle.put("talentReviews", listTalentReviews(employeeId));
    bundle.put("projects", listProjects(employeeId));
    bundle.put("agentAssignments", listAgentAssignments(employeeId));
    return bundle;
  }

  public List<EmployeeFamilyMemberEntity> listFamilyMembers(long employeeId) {
    return listByEmployee(familyMemberMapper, EmployeeFamilyMemberEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeFamilyMemberEntity createFamilyMember(long employeeId, EmployeeFamilyMemberEntity entity) {
    return create(
        familyMemberMapper,
        employeeId,
        entity,
        EmployeeFamilyMemberEntity::setEmployeeId
    );
  }

  @Transactional
  public EmployeeFamilyMemberEntity updateFamilyMember(long employeeId, long id, EmployeeFamilyMemberEntity entity) {
    return update(
        familyMemberMapper,
        employeeId,
        id,
        entity,
        EmployeeFamilyMemberEntity::getEmployeeId,
        EmployeeFamilyMemberEntity::getId,
        this::mergeFamilyMember
    );
  }

  @Transactional
  public void deleteFamilyMember(long employeeId, long id) {
    delete(familyMemberMapper, employeeId, id, EmployeeFamilyMemberEntity::getEmployeeId);
  }

  public List<EmployeeInternalRelativeEntity> listInternalRelatives(long employeeId) {
    return listByEmployee(internalRelativeMapper, EmployeeInternalRelativeEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeInternalRelativeEntity createInternalRelative(long employeeId, EmployeeInternalRelativeEntity entity) {
    refreshInternalRelativeSnapshot(entity);
    return create(
        internalRelativeMapper,
        employeeId,
        entity,
        EmployeeInternalRelativeEntity::setEmployeeId
    );
  }

  @Transactional
  public EmployeeInternalRelativeEntity updateInternalRelative(
      long employeeId,
      long id,
      EmployeeInternalRelativeEntity entity
  ) {
    // 编辑时若未改关联员工，沿用库中 relativeEmployeeId 再刷快照
    if (entity.getRelativeEmployeeId() == null) {
      EmployeeInternalRelativeEntity current = internalRelativeMapper.selectById(id);
      if (current != null) {
        entity.setRelativeEmployeeId(current.getRelativeEmployeeId());
      }
    }
    refreshInternalRelativeSnapshot(entity);
    return update(
        internalRelativeMapper,
        employeeId,
        id,
        entity,
        EmployeeInternalRelativeEntity::getEmployeeId,
        EmployeeInternalRelativeEntity::getId,
        this::mergeInternalRelative
    );
  }

  /** 按关联员工当前任职回填部门/岗位/职级/入职日/在职状态/最后工作日。 */
  private void refreshInternalRelativeSnapshot(EmployeeInternalRelativeEntity entity) {
    if (entity.getRelativeEmployeeId() == null) return;
    EmployeeEntity relative = employeeService.require(entity.getRelativeEmployeeId());
    archiveDataSupport.fillInternalRelativeSnapshot(entity, relative);
  }

  @Transactional
  public void deleteInternalRelative(long employeeId, long id) {
    delete(internalRelativeMapper, employeeId, id, EmployeeInternalRelativeEntity::getEmployeeId);
  }

  public List<EmployeeIdDocumentEntity> listIdDocuments(long employeeId) {
    return listByEmployee(idDocumentMapper, EmployeeIdDocumentEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeIdDocumentEntity createIdDocument(long employeeId, EmployeeIdDocumentEntity entity) {
    encryptIdDocument(entity);
    EmployeeIdDocumentEntity created = create(
        idDocumentMapper,
        employeeId,
        entity,
        EmployeeIdDocumentEntity::setEmployeeId
    );
    decryptIdDocument(created);
    return created;
  }

  @Transactional
  public EmployeeIdDocumentEntity updateIdDocument(long employeeId, long id, EmployeeIdDocumentEntity entity) {
    encryptIdDocument(entity);
    EmployeeIdDocumentEntity updated = update(
        idDocumentMapper,
        employeeId,
        id,
        entity,
        EmployeeIdDocumentEntity::getEmployeeId,
        EmployeeIdDocumentEntity::getId,
        this::mergeIdDocument
    );
    decryptIdDocument(updated);
    return updated;
  }

  @Transactional
  public void deleteIdDocument(long employeeId, long id) {
    delete(idDocumentMapper, employeeId, id, EmployeeIdDocumentEntity::getEmployeeId);
  }

  public List<EmployeeCostCenterAllocationEntity> listCostCenterAllocations(long employeeId) {
    return listByEmployee(costCenterAllocationMapper, EmployeeCostCenterAllocationEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeCostCenterAllocationEntity createCostCenterAllocation(
      long employeeId,
      EmployeeCostCenterAllocationEntity entity
  ) {
    validateCostCenterAllocation(entity);
    return create(
        costCenterAllocationMapper,
        employeeId,
        entity,
        EmployeeCostCenterAllocationEntity::setEmployeeId
    );
  }

  @Transactional
  public EmployeeCostCenterAllocationEntity updateCostCenterAllocation(
      long employeeId,
      long id,
      EmployeeCostCenterAllocationEntity entity
  ) {
    validateCostCenterAllocation(entity);
    return update(
        costCenterAllocationMapper,
        employeeId,
        id,
        entity,
        EmployeeCostCenterAllocationEntity::getEmployeeId,
        EmployeeCostCenterAllocationEntity::getId,
        this::mergeCostCenterAllocation
    );
  }

  @Transactional
  public void deleteCostCenterAllocation(long employeeId, long id) {
    delete(costCenterAllocationMapper, employeeId, id, EmployeeCostCenterAllocationEntity::getEmployeeId);
  }

  public List<EmployeeContractEntity> listContracts(long employeeId) {
    List<EmployeeContractEntity> list = listByEmployee(contractMapper, EmployeeContractEntity::getEmployeeId, employeeId);
    // 合同签订次数：按开始日期（合同期限）升序，同日再按 createdAt / id 稳定排序
    list.sort((a, b) -> {
      java.time.LocalDate ad = a.getStartDate();
      java.time.LocalDate bd = b.getStartDate();
      if (ad == null && bd != null) return 1;
      if (ad != null && bd == null) return -1;
      if (ad != null && bd != null) {
        int c = ad.compareTo(bd);
        if (c != 0) return c;
      }
      java.time.LocalDateTime ac = a.getCreatedAt();
      java.time.LocalDateTime bc = b.getCreatedAt();
      if (ac == null && bc != null) return 1;
      if (ac != null && bc == null) return -1;
      if (ac != null && bc != null) {
        int c = ac.compareTo(bc);
        if (c != 0) return c;
      }
      Long aid = a.getId();
      Long bid = b.getId();
      if (aid == null && bid != null) return 1;
      if (aid != null && bid == null) return -1;
      if (aid != null && bid != null) return aid.compareTo(bid);
      return 0;
    });
    for (int i = 0; i < list.size(); i++) {
      list.get(i).setSigningTimes(i + 1);
    }
    return list;
  }

  @Transactional
  public EmployeeContractEntity createContract(long employeeId, EmployeeContractEntity entity) {
    return create(contractMapper, employeeId, entity, EmployeeContractEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeContractEntity updateContract(long employeeId, long id, EmployeeContractEntity entity) {
    return update(
        contractMapper,
        employeeId,
        id,
        entity,
        EmployeeContractEntity::getEmployeeId,
        EmployeeContractEntity::getId,
        this::mergeContract
    );
  }

  @Transactional
  public void deleteContract(long employeeId, long id) {
    delete(contractMapper, employeeId, id, EmployeeContractEntity::getEmployeeId);
  }

  public List<EmployeeAgreementEntity> listAgreements(long employeeId) {
    return listByEmployee(agreementMapper, EmployeeAgreementEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeAgreementEntity createAgreement(long employeeId, EmployeeAgreementEntity entity) {
    validateAgreement(entity);
    return create(agreementMapper, employeeId, entity, EmployeeAgreementEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeAgreementEntity updateAgreement(long employeeId, long id, EmployeeAgreementEntity entity) {
    validateAgreement(entity);
    return update(
        agreementMapper,
        employeeId,
        id,
        entity,
        EmployeeAgreementEntity::getEmployeeId,
        EmployeeAgreementEntity::getId,
        this::mergeAgreement
    );
  }

  @Transactional
  public void deleteAgreement(long employeeId, long id) {
    delete(agreementMapper, employeeId, id, EmployeeAgreementEntity::getEmployeeId);
  }

  public List<EmployeeAttendanceCardEntity> listAttendanceCards(long employeeId) {
    return listByEmployee(attendanceCardMapper, EmployeeAttendanceCardEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeAttendanceCardEntity createAttendanceCard(long employeeId, EmployeeAttendanceCardEntity entity) {
    employeeService.require(employeeId);
    if (entity.getEffectiveStartDate() == null) {
      entity.setEffectiveStartDate(LocalDate.now());
    }
    attendanceCardHelper.normalizeDefaults(entity);
    List<EmployeeAttendanceCardEntity> existing = listAttendanceCards(employeeId);
    if (!existing.isEmpty()) {
      throw new IllegalArgumentException("该员工已存在考勤卡，请使用新增生效版本");
    }
    entity.setEmployeeId(employeeId);
    entity.setEffectiveEndDate(null);
    attendanceCardMapper.insert(entity);
    return requireAttendanceCard(employeeId, entity.getId());
  }

  @Transactional
  public EmployeeAttendanceCardEntity updateAttendanceCard(
      long employeeId,
      long id,
      EmployeeAttendanceCardEntity patch
  ) {
    EmployeeAttendanceCardEntity cur = requireAttendanceCard(employeeId, id);
    String mode = patch.getEditMode() == null || patch.getEditMode().isBlank()
        ? "CURRENT"
        : patch.getEditMode().trim().toUpperCase();
    if (!"CURRENT".equals(mode) && !"NEW_VERSION".equals(mode)) {
      throw new IllegalArgumentException("无效的 editMode");
    }

    LocalDate patchStart = patch.getEffectiveStartDate();
    if (patchStart != null
        && cur.getEffectiveStartDate() != null
        && !patchStart.equals(cur.getEffectiveStartDate())) {
      return createAttendanceCardNewVersion(employeeId, cur, patch);
    }

    if ("NEW_VERSION".equals(mode)) {
      return createAttendanceCardNewVersion(employeeId, cur, patch);
    }

    attendanceCardHelper.applyPatch(cur, patch);
    attendanceCardHelper.normalizeDefaults(cur);
    attendanceCardMapper.updateById(cur);
    return requireAttendanceCard(employeeId, id);
  }

  private EmployeeAttendanceCardEntity createAttendanceCardNewVersion(
      long employeeId,
      EmployeeAttendanceCardEntity base,
      EmployeeAttendanceCardEntity patch
  ) {
    if (patch.getEffectiveStartDate() == null) {
      throw new IllegalArgumentException("新增生效版本时必须填写生效日期");
    }
    LocalDate newStart = patch.getEffectiveStartDate();
    if (newStart.equals(base.getEffectiveStartDate())) {
      throw new IllegalArgumentException("新生效日不能与当前版本相同");
    }

    EmployeeAttendanceCardEntity newRow = attendanceCardHelper.cloneCard(base);
    newRow.setId(null);
    newRow.setEmployeeId(employeeId);
    attendanceCardHelper.applyPatch(newRow, patch);
    attendanceCardHelper.normalizeDefaults(newRow);

    List<EmployeeAttendanceCardEntity> existing = listAttendanceCards(employeeId);
    EmployeeAttendanceCardHelper.VersionSpliceResult splice =
        attendanceCardHelper.resolveVersionSplice(newRow, existing, newStart);
    for (EmployeeAttendanceCardEntity prev : splice.toUpdate()) {
      attendanceCardMapper.updateById(prev);
    }
    attendanceCardMapper.insert(newRow);
    return requireAttendanceCard(employeeId, newRow.getId());
  }

  private EmployeeAttendanceCardEntity requireAttendanceCard(long employeeId, long id) {
    EmployeeAttendanceCardEntity entity = attendanceCardMapper.selectById(id);
    if (entity == null || entity.getEmployeeId() == null || entity.getEmployeeId() != employeeId) {
      throw new IllegalArgumentException("档案记录不存在");
    }
    return entity;
  }

  @Transactional
  public void deleteAttendanceCard(long employeeId, long id) {
    delete(attendanceCardMapper, employeeId, id, EmployeeAttendanceCardEntity::getEmployeeId);
  }

  public List<EmployeeBankAccountEntity> listBankAccounts(long employeeId) {
    return listByEmployee(bankAccountMapper, EmployeeBankAccountEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeBankAccountEntity createBankAccount(long employeeId, EmployeeBankAccountEntity entity) {
    if (Boolean.TRUE.equals(entity.getIsPrimary())) {
      clearOtherPrimaryBankAccounts(employeeId, null);
    }
    encryptBankAccount(entity);
    EmployeeBankAccountEntity created = create(
        bankAccountMapper,
        employeeId,
        entity,
        EmployeeBankAccountEntity::setEmployeeId
    );
    if (Boolean.TRUE.equals(created.getIsPrimary())) {
      clearOtherPrimaryBankAccounts(employeeId, created.getId());
    }
    decryptBankAccount(created);
    return created;
  }

  @Transactional
  public EmployeeBankAccountEntity updateBankAccount(long employeeId, long id, EmployeeBankAccountEntity entity) {
    if (Boolean.TRUE.equals(entity.getIsPrimary())) {
      clearOtherPrimaryBankAccounts(employeeId, id);
    }
    encryptBankAccount(entity);
    EmployeeBankAccountEntity updated = update(
        bankAccountMapper,
        employeeId,
        id,
        entity,
        EmployeeBankAccountEntity::getEmployeeId,
        EmployeeBankAccountEntity::getId,
        this::mergeBankAccount
    );
    decryptBankAccount(updated);
    return updated;
  }

  private void clearOtherPrimaryBankAccounts(long employeeId, Long keepId) {
    UpdateWrapper<EmployeeBankAccountEntity> w = new UpdateWrapper<EmployeeBankAccountEntity>()
        .eq("employee_id", employeeId)
        .eq("is_primary", 1);
    if (keepId != null) {
      w.ne("id", keepId);
    }
    EmployeeBankAccountEntity patch = new EmployeeBankAccountEntity();
    patch.setIsPrimary(false);
    bankAccountMapper.update(patch, w);
  }

  @Transactional
  public void deleteBankAccount(long employeeId, long id) {
    delete(bankAccountMapper, employeeId, id, EmployeeBankAccountEntity::getEmployeeId);
  }

  public List<EmployeeSocialInsuranceEntity> listSocialInsurances(long employeeId) {
    return listByEmployee(
        socialInsuranceMapper,
        EmployeeSocialInsuranceEntity::getEmployeeId,
        employeeId
    );
  }

  @Transactional
  public EmployeeSocialInsuranceEntity createSocialInsurance(long employeeId, EmployeeSocialInsuranceEntity entity) {
    employeeService.require(employeeId);
    List<EmployeeSocialInsuranceEntity> existing = listSocialInsurances(employeeId);
    if (!existing.isEmpty()) {
      throw new IllegalArgumentException("该员工已存在社保公积金信息，请编辑已有记录");
    }
    encryptSocialInsurance(entity);
    EmployeeSocialInsuranceEntity created = create(
        socialInsuranceMapper,
        employeeId,
        entity,
        EmployeeSocialInsuranceEntity::setEmployeeId
    );
    decryptSocialInsurance(created);
    return created;
  }

  @Transactional
  public EmployeeSocialInsuranceEntity updateSocialInsurance(
      long employeeId,
      long id,
      EmployeeSocialInsuranceEntity entity
  ) {
    encryptSocialInsurance(entity);
    EmployeeSocialInsuranceEntity updated = update(
        socialInsuranceMapper,
        employeeId,
        id,
        entity,
        EmployeeSocialInsuranceEntity::getEmployeeId,
        EmployeeSocialInsuranceEntity::getId,
        this::mergeSocialInsurance
    );
    decryptSocialInsurance(updated);
    return updated;
  }

  @Transactional
  public void deleteSocialInsurance(long employeeId, long id) {
    delete(socialInsuranceMapper, employeeId, id, EmployeeSocialInsuranceEntity::getEmployeeId);
  }

  public List<EmployeeSpecialBenefitEntity> listSpecialBenefits(long employeeId) {
    return listByEmployee(specialBenefitMapper, EmployeeSpecialBenefitEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeSpecialBenefitEntity createSpecialBenefit(long employeeId, EmployeeSpecialBenefitEntity entity) {
    validateSpecialBenefit(entity);
    return create(specialBenefitMapper, employeeId, entity, EmployeeSpecialBenefitEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeSpecialBenefitEntity updateSpecialBenefit(
      long employeeId,
      long id,
      EmployeeSpecialBenefitEntity entity
  ) {
    return update(
        specialBenefitMapper,
        employeeId,
        id,
        entity,
        EmployeeSpecialBenefitEntity::getEmployeeId,
        EmployeeSpecialBenefitEntity::getId,
        (current, patch) -> {
          mergeSpecialBenefit(current, patch);
          validateSpecialBenefit(current);
        }
    );
  }

  @Transactional
  public void deleteSpecialBenefit(long employeeId, long id) {
    delete(specialBenefitMapper, employeeId, id, EmployeeSpecialBenefitEntity::getEmployeeId);
  }

  public List<EmployeeWorkInjuryEntity> listWorkInjuries(long employeeId) {
    return listByEmployee(workInjuryMapper, EmployeeWorkInjuryEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeWorkInjuryEntity createWorkInjury(long employeeId, EmployeeWorkInjuryEntity entity) {
    validateWorkInjury(entity);
    return create(workInjuryMapper, employeeId, entity, EmployeeWorkInjuryEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeWorkInjuryEntity updateWorkInjury(
      long employeeId,
      long id,
      EmployeeWorkInjuryEntity entity
  ) {
    return update(
        workInjuryMapper,
        employeeId,
        id,
        entity,
        EmployeeWorkInjuryEntity::getEmployeeId,
        EmployeeWorkInjuryEntity::getId,
        (current, patch) -> {
          mergeWorkInjury(current, patch);
          validateWorkInjury(current);
        }
    );
  }

  @Transactional
  public void deleteWorkInjury(long employeeId, long id) {
    delete(workInjuryMapper, employeeId, id, EmployeeWorkInjuryEntity::getEmployeeId);
  }

  public List<EmployeeAdminInfoEntity> listAdminInfos(long employeeId) {
    return listByEmployee(adminInfoMapper, EmployeeAdminInfoEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeAdminInfoEntity createAdminInfo(long employeeId, EmployeeAdminInfoEntity entity) {
    employeeService.require(employeeId);
    if (entity.getEffectiveStartDate() == null) {
      entity.setEffectiveStartDate(LocalDate.now());
    }
    adminInfoHelper.normalizeDefaults(entity);
    List<EmployeeAdminInfoEntity> existing = listAdminInfos(employeeId);
    if (!existing.isEmpty()) {
      throw new IllegalArgumentException("该员工已存在行政信息，请使用新增生效版本");
    }
    entity.setEmployeeId(employeeId);
    entity.setEffectiveEndDate(null);
    adminInfoMapper.insert(entity);
    return requireAdminInfo(employeeId, entity.getId());
  }

  @Transactional
  public EmployeeAdminInfoEntity updateAdminInfo(long employeeId, long id, EmployeeAdminInfoEntity patch) {
    EmployeeAdminInfoEntity cur = requireAdminInfo(employeeId, id);
    String mode = patch.getEditMode() == null || patch.getEditMode().isBlank()
        ? "CURRENT"
        : patch.getEditMode().trim().toUpperCase();
    if (!"CURRENT".equals(mode) && !"NEW_VERSION".equals(mode)) {
      throw new IllegalArgumentException("无效的 editMode");
    }

    LocalDate patchStart = patch.getEffectiveStartDate();
    if (patchStart != null
        && cur.getEffectiveStartDate() != null
        && !patchStart.equals(cur.getEffectiveStartDate())) {
      return createAdminInfoNewVersion(employeeId, cur, patch);
    }

    if ("NEW_VERSION".equals(mode)) {
      return createAdminInfoNewVersion(employeeId, cur, patch);
    }

    adminInfoHelper.applyPatch(cur, patch);
    adminInfoHelper.normalizeDefaults(cur);
    adminInfoMapper.updateById(cur);
    return requireAdminInfo(employeeId, id);
  }

  private EmployeeAdminInfoEntity createAdminInfoNewVersion(
      long employeeId,
      EmployeeAdminInfoEntity base,
      EmployeeAdminInfoEntity patch
  ) {
    if (patch.getEffectiveStartDate() == null) {
      throw new IllegalArgumentException("新增生效版本时必须填写生效日期");
    }
    LocalDate newStart = patch.getEffectiveStartDate();
    if (newStart.equals(base.getEffectiveStartDate())) {
      throw new IllegalArgumentException("新生效日不能与当前版本相同");
    }

    EmployeeAdminInfoEntity newRow = adminInfoHelper.cloneRow(base);
    newRow.setId(null);
    newRow.setEmployeeId(employeeId);
    adminInfoHelper.applyPatch(newRow, patch);
    adminInfoHelper.normalizeDefaults(newRow);

    List<EmployeeAdminInfoEntity> existing = listAdminInfos(employeeId);
    EmployeeAdminInfoHelper.VersionSpliceResult splice =
        adminInfoHelper.resolveVersionSplice(newRow, existing, newStart);
    for (EmployeeAdminInfoEntity prev : splice.toUpdate()) {
      adminInfoMapper.updateById(prev);
    }
    adminInfoMapper.insert(newRow);
    return requireAdminInfo(employeeId, newRow.getId());
  }

  private EmployeeAdminInfoEntity requireAdminInfo(long employeeId, long id) {
    EmployeeAdminInfoEntity entity = adminInfoMapper.selectById(id);
    if (entity == null || entity.getEmployeeId() == null || entity.getEmployeeId() != employeeId) {
      throw new IllegalArgumentException("档案记录不存在");
    }
    return entity;
  }

  @Transactional
  public void deleteAdminInfo(long employeeId, long id) {
    delete(adminInfoMapper, employeeId, id, EmployeeAdminInfoEntity::getEmployeeId);
  }

  public List<EmployeeAccommodationEntity> listAccommodations(long employeeId) {
    return listByEmployee(accommodationMapper, EmployeeAccommodationEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeAccommodationEntity createAccommodation(long employeeId, EmployeeAccommodationEntity entity) {
    employeeService.require(employeeId);
    if (entity.getEffectiveStartDate() == null) {
      entity.setEffectiveStartDate(LocalDate.now());
    }
    accommodationHelper.normalizeDefaults(entity);
    List<EmployeeAccommodationEntity> existing = listAccommodations(employeeId);
    if (!existing.isEmpty()) {
      throw new IllegalArgumentException("该员工已存在住宿信息，请使用新增生效版本");
    }
    entity.setEmployeeId(employeeId);
    entity.setEffectiveEndDate(null);
    accommodationMapper.insert(entity);
    return requireAccommodation(employeeId, entity.getId());
  }

  @Transactional
  public EmployeeAccommodationEntity updateAccommodation(
      long employeeId,
      long id,
      EmployeeAccommodationEntity patch
  ) {
    EmployeeAccommodationEntity cur = requireAccommodation(employeeId, id);
    String mode = patch.getEditMode() == null || patch.getEditMode().isBlank()
        ? "CURRENT"
        : patch.getEditMode().trim().toUpperCase();
    if (!"CURRENT".equals(mode) && !"NEW_VERSION".equals(mode)) {
      throw new IllegalArgumentException("无效的 editMode");
    }

    LocalDate patchStart = patch.getEffectiveStartDate();
    if (patchStart != null
        && cur.getEffectiveStartDate() != null
        && !patchStart.equals(cur.getEffectiveStartDate())) {
      return createAccommodationNewVersion(employeeId, cur, patch);
    }

    if ("NEW_VERSION".equals(mode)) {
      return createAccommodationNewVersion(employeeId, cur, patch);
    }

    accommodationHelper.applyPatch(cur, patch);
    accommodationHelper.normalizeDefaults(cur);
    accommodationMapper.updateById(cur);
    return requireAccommodation(employeeId, id);
  }

  private EmployeeAccommodationEntity createAccommodationNewVersion(
      long employeeId,
      EmployeeAccommodationEntity base,
      EmployeeAccommodationEntity patch
  ) {
    if (patch.getEffectiveStartDate() == null) {
      throw new IllegalArgumentException("新增生效版本时必须填写生效日期");
    }
    LocalDate newStart = patch.getEffectiveStartDate();
    if (newStart.equals(base.getEffectiveStartDate())) {
      throw new IllegalArgumentException("新生效日不能与当前版本相同");
    }

    EmployeeAccommodationEntity newRow = accommodationHelper.cloneRow(base);
    newRow.setId(null);
    newRow.setEmployeeId(employeeId);
    accommodationHelper.applyPatch(newRow, patch);
    accommodationHelper.normalizeDefaults(newRow);

    List<EmployeeAccommodationEntity> existing = listAccommodations(employeeId);
    EmployeeAccommodationHelper.VersionSpliceResult splice =
        accommodationHelper.resolveVersionSplice(newRow, existing, newStart);
    for (EmployeeAccommodationEntity prev : splice.toUpdate()) {
      accommodationMapper.updateById(prev);
    }
    accommodationMapper.insert(newRow);
    return requireAccommodation(employeeId, newRow.getId());
  }

  private EmployeeAccommodationEntity requireAccommodation(long employeeId, long id) {
    EmployeeAccommodationEntity entity = accommodationMapper.selectById(id);
    if (entity == null || entity.getEmployeeId() == null || entity.getEmployeeId() != employeeId) {
      throw new IllegalArgumentException("档案记录不存在");
    }
    return entity;
  }

  @Transactional
  public void deleteAccommodation(long employeeId, long id) {
    delete(accommodationMapper, employeeId, id, EmployeeAccommodationEntity::getEmployeeId);
  }

  public List<EmployeeAttachmentEntity> listAttachments(long employeeId) {
    return listByEmployee(attachmentMapper, EmployeeAttachmentEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeAttachmentEntity createAttachment(long employeeId, EmployeeAttachmentEntity entity) {
    if (entity.getStorageKey() == null || entity.getStorageKey().isBlank()) {
      throw new IllegalArgumentException("请先上传文件");
    }
    if (entity.getStorageKey().length() > 512) {
      throw new IllegalArgumentException("附件存储路径过长，请缩短文件名后重试");
    }
    if (entity.getUploadedAt() == null) {
      entity.setUploadedAt(java.time.LocalDateTime.now());
    }
    return create(attachmentMapper, employeeId, entity, EmployeeAttachmentEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeAttachmentEntity updateAttachment(long employeeId, long id, EmployeeAttachmentEntity entity) {
    return update(
        attachmentMapper,
        employeeId,
        id,
        entity,
        EmployeeAttachmentEntity::getEmployeeId,
        EmployeeAttachmentEntity::getId,
        this::mergeAttachment
    );
  }

  @Transactional
  public void deleteAttachment(long employeeId, long id) {
    delete(attachmentMapper, employeeId, id, EmployeeAttachmentEntity::getEmployeeId);
  }

  public EmployeeAttachmentEntity requireAttachment(long employeeId, long attachmentId) {
    employeeService.require(employeeId);
    EmployeeAttachmentEntity entity = attachmentMapper.selectById(attachmentId);
    if (entity == null || !entity.getEmployeeId().equals(employeeId)) {
      throw new IllegalArgumentException("附件不存在");
    }
    return entity;
  }

  public List<EmployeeEducationEntity> listEducations(long employeeId) {
    return listByEmployee(educationMapper, EmployeeEducationEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeEducationEntity createEducation(long employeeId, EmployeeEducationEntity entity) {
    return create(educationMapper, employeeId, entity, EmployeeEducationEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeEducationEntity updateEducation(long employeeId, long id, EmployeeEducationEntity entity) {
    return update(
        educationMapper,
        employeeId,
        id,
        entity,
        EmployeeEducationEntity::getEmployeeId,
        EmployeeEducationEntity::getId,
        this::mergeEducation
    );
  }

  @Transactional
  public void deleteEducation(long employeeId, long id) {
    delete(educationMapper, employeeId, id, EmployeeEducationEntity::getEmployeeId);
  }

  public List<EmployeeWorkExperienceEntity> listWorkExperiences(long employeeId) {
    return listByEmployee(workExperienceMapper, EmployeeWorkExperienceEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeWorkExperienceEntity createWorkExperience(long employeeId, EmployeeWorkExperienceEntity entity) {
    return create(workExperienceMapper, employeeId, entity, EmployeeWorkExperienceEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeWorkExperienceEntity updateWorkExperience(
      long employeeId,
      long id,
      EmployeeWorkExperienceEntity entity
  ) {
    return update(
        workExperienceMapper,
        employeeId,
        id,
        entity,
        EmployeeWorkExperienceEntity::getEmployeeId,
        EmployeeWorkExperienceEntity::getId,
        this::mergeWorkExperience
    );
  }

  @Transactional
  public void deleteWorkExperience(long employeeId, long id) {
    delete(workExperienceMapper, employeeId, id, EmployeeWorkExperienceEntity::getEmployeeId);
  }

  public List<EmployeeQualificationEntity> listQualifications(long employeeId) {
    return listByEmployee(qualificationMapper, EmployeeQualificationEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeQualificationEntity createQualification(long employeeId, EmployeeQualificationEntity entity) {
    return create(qualificationMapper, employeeId, entity, EmployeeQualificationEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeQualificationEntity updateQualification(
      long employeeId,
      long id,
      EmployeeQualificationEntity entity
  ) {
    return update(
        qualificationMapper,
        employeeId,
        id,
        entity,
        EmployeeQualificationEntity::getEmployeeId,
        EmployeeQualificationEntity::getId,
        this::mergeQualification
    );
  }

  @Transactional
  public void deleteQualification(long employeeId, long id) {
    delete(qualificationMapper, employeeId, id, EmployeeQualificationEntity::getEmployeeId);
  }

  public List<EmployeeTitleCertificateEntity> listTitleCertificates(long employeeId) {
    return listByEmployee(titleCertificateMapper, EmployeeTitleCertificateEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeTitleCertificateEntity createTitleCertificate(long employeeId, EmployeeTitleCertificateEntity entity) {
    return create(titleCertificateMapper, employeeId, entity, EmployeeTitleCertificateEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeTitleCertificateEntity updateTitleCertificate(
      long employeeId,
      long id,
      EmployeeTitleCertificateEntity entity
  ) {
    return update(
        titleCertificateMapper,
        employeeId,
        id,
        entity,
        EmployeeTitleCertificateEntity::getEmployeeId,
        EmployeeTitleCertificateEntity::getId,
        this::mergeTitleCertificate
    );
  }

  @Transactional
  public void deleteTitleCertificate(long employeeId, long id) {
    delete(titleCertificateMapper, employeeId, id, EmployeeTitleCertificateEntity::getEmployeeId);
  }

  public List<EmployeeRewardEntity> listRewards(long employeeId) {
    return listByEmployee(rewardMapper, EmployeeRewardEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeRewardEntity createReward(long employeeId, EmployeeRewardEntity entity) {
    return create(rewardMapper, employeeId, entity, EmployeeRewardEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeRewardEntity updateReward(long employeeId, long id, EmployeeRewardEntity entity) {
    return update(
        rewardMapper,
        employeeId,
        id,
        entity,
        EmployeeRewardEntity::getEmployeeId,
        EmployeeRewardEntity::getId,
        this::mergeReward
    );
  }

  @Transactional
  public void deleteReward(long employeeId, long id) {
    delete(rewardMapper, employeeId, id, EmployeeRewardEntity::getEmployeeId);
  }

  public List<EmployeePenaltyEntity> listPenalties(long employeeId) {
    return listByEmployee(penaltyMapper, EmployeePenaltyEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeePenaltyEntity createPenalty(long employeeId, EmployeePenaltyEntity entity) {
    return create(penaltyMapper, employeeId, entity, EmployeePenaltyEntity::setEmployeeId);
  }

  @Transactional
  public EmployeePenaltyEntity updatePenalty(long employeeId, long id, EmployeePenaltyEntity entity) {
    return update(
        penaltyMapper,
        employeeId,
        id,
        entity,
        EmployeePenaltyEntity::getEmployeeId,
        EmployeePenaltyEntity::getId,
        this::mergePenalty
    );
  }

  @Transactional
  public void deletePenalty(long employeeId, long id) {
    delete(penaltyMapper, employeeId, id, EmployeePenaltyEntity::getEmployeeId);
  }

  public List<EmployeeTrainingRecordEntity> listTrainingRecords(long employeeId) {
    return listByEmployee(trainingRecordMapper, EmployeeTrainingRecordEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeTrainingRecordEntity createTrainingRecord(long employeeId, EmployeeTrainingRecordEntity entity) {
    return create(trainingRecordMapper, employeeId, entity, EmployeeTrainingRecordEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeTrainingRecordEntity updateTrainingRecord(
      long employeeId,
      long id,
      EmployeeTrainingRecordEntity entity
  ) {
    return update(
        trainingRecordMapper,
        employeeId,
        id,
        entity,
        EmployeeTrainingRecordEntity::getEmployeeId,
        EmployeeTrainingRecordEntity::getId,
        this::mergeTrainingRecord
    );
  }

  @Transactional
  public void deleteTrainingRecord(long employeeId, long id) {
    delete(trainingRecordMapper, employeeId, id, EmployeeTrainingRecordEntity::getEmployeeId);
  }

  public List<EmployeePerformanceRecordEntity> listPerformanceRecords(long employeeId) {
    return listByEmployee(performanceRecordMapper, EmployeePerformanceRecordEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeePerformanceRecordEntity createPerformanceRecord(
      long employeeId,
      EmployeePerformanceRecordEntity entity
  ) {
    return create(performanceRecordMapper, employeeId, entity, EmployeePerformanceRecordEntity::setEmployeeId);
  }

  @Transactional
  public EmployeePerformanceRecordEntity updatePerformanceRecord(
      long employeeId,
      long id,
      EmployeePerformanceRecordEntity entity
  ) {
    return update(
        performanceRecordMapper,
        employeeId,
        id,
        entity,
        EmployeePerformanceRecordEntity::getEmployeeId,
        EmployeePerformanceRecordEntity::getId,
        this::mergePerformanceRecord
    );
  }

  @Transactional
  public void deletePerformanceRecord(long employeeId, long id) {
    delete(performanceRecordMapper, employeeId, id, EmployeePerformanceRecordEntity::getEmployeeId);
  }

  public List<EmployeeValuesAssessmentEntity> listValuesAssessments(long employeeId) {
    return listByEmployee(valuesAssessmentMapper, EmployeeValuesAssessmentEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeValuesAssessmentEntity createValuesAssessment(
      long employeeId,
      EmployeeValuesAssessmentEntity entity
  ) {
    return create(valuesAssessmentMapper, employeeId, entity, EmployeeValuesAssessmentEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeValuesAssessmentEntity updateValuesAssessment(
      long employeeId,
      long id,
      EmployeeValuesAssessmentEntity entity
  ) {
    return update(
        valuesAssessmentMapper,
        employeeId,
        id,
        entity,
        EmployeeValuesAssessmentEntity::getEmployeeId,
        EmployeeValuesAssessmentEntity::getId,
        this::mergeValuesAssessment
    );
  }

  @Transactional
  public void deleteValuesAssessment(long employeeId, long id) {
    delete(valuesAssessmentMapper, employeeId, id, EmployeeValuesAssessmentEntity::getEmployeeId);
  }

  public List<EmployeeTalentReviewEntity> listTalentReviews(long employeeId) {
    return listByEmployee(talentReviewMapper, EmployeeTalentReviewEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeTalentReviewEntity createTalentReview(long employeeId, EmployeeTalentReviewEntity entity) {
    return create(talentReviewMapper, employeeId, entity, EmployeeTalentReviewEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeTalentReviewEntity updateTalentReview(
      long employeeId,
      long id,
      EmployeeTalentReviewEntity entity
  ) {
    return update(
        talentReviewMapper,
        employeeId,
        id,
        entity,
        EmployeeTalentReviewEntity::getEmployeeId,
        EmployeeTalentReviewEntity::getId,
        this::mergeTalentReview
    );
  }

  @Transactional
  public void deleteTalentReview(long employeeId, long id) {
    delete(talentReviewMapper, employeeId, id, EmployeeTalentReviewEntity::getEmployeeId);
  }

  public List<EmployeeProjectEntity> listProjects(long employeeId) {
    return listByEmployee(projectMapper, EmployeeProjectEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeProjectEntity createProject(long employeeId, EmployeeProjectEntity entity) {
    return create(projectMapper, employeeId, entity, EmployeeProjectEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeProjectEntity updateProject(long employeeId, long id, EmployeeProjectEntity entity) {
    return update(
        projectMapper,
        employeeId,
        id,
        entity,
        EmployeeProjectEntity::getEmployeeId,
        EmployeeProjectEntity::getId,
        this::mergeProject
    );
  }

  @Transactional
  public void deleteProject(long employeeId, long id) {
    delete(projectMapper, employeeId, id, EmployeeProjectEntity::getEmployeeId);
  }

  public List<EmployeeAgentAssignmentEntity> listAgentAssignments(long employeeId) {
    return listByEmployee(agentAssignmentMapper, EmployeeAgentAssignmentEntity::getEmployeeId, employeeId);
  }

  @Transactional
  public EmployeeAgentAssignmentEntity createAgentAssignment(
      long employeeId,
      EmployeeAgentAssignmentEntity entity
  ) {
    validateAgentAssignment(entity);
    return create(agentAssignmentMapper, employeeId, entity, EmployeeAgentAssignmentEntity::setEmployeeId);
  }

  @Transactional
  public EmployeeAgentAssignmentEntity updateAgentAssignment(
      long employeeId,
      long id,
      EmployeeAgentAssignmentEntity entity
  ) {
    validateAgentAssignment(entity);
    return update(
        agentAssignmentMapper,
        employeeId,
        id,
        entity,
        EmployeeAgentAssignmentEntity::getEmployeeId,
        EmployeeAgentAssignmentEntity::getId,
        this::mergeAgentAssignment
    );
  }

  @Transactional
  public void deleteAgentAssignment(long employeeId, long id) {
    delete(agentAssignmentMapper, employeeId, id, EmployeeAgentAssignmentEntity::getEmployeeId);
  }

  private <T> List<T> listByEmployee(
      BaseMapper<T> mapper,
      SFunction<T, Long> employeeIdGetter,
      long employeeId
  ) {
    employeeService.require(employeeId);
    return mapper.selectList(
        new LambdaQueryWrapper<T>()
            .eq(employeeIdGetter, employeeId)
    );
  }

  private <T> T create(
      BaseMapper<T> mapper,
      long employeeId,
      T entity,
      BiConsumer<T, Long> employeeSetter
  ) {
    employeeService.require(employeeId);
    employeeSetter.accept(entity, employeeId);
    mapper.insert(entity);
    return entity;
  }

  private <T> T update(
      BaseMapper<T> mapper,
      long employeeId,
      long id,
      T patch,
      SFunction<T, Long> employeeGetter,
      SFunction<T, Long> idGetter,
      BiConsumer<T, T> merger
  ) {
    employeeService.require(employeeId);
    T current = mapper.selectById(id);
    if (current == null || !employeeMatched(current, employeeGetter, employeeId)) {
      throw new IllegalArgumentException("档案记录不存在");
    }
    merger.accept(current, patch);
    mapper.updateById(current);
    return mapper.selectById(id);
  }

  private <T> void delete(
      BaseMapper<T> mapper,
      long employeeId,
      long id,
      SFunction<T, Long> employeeGetter
  ) {
    employeeService.require(employeeId);
    T current = mapper.selectById(id);
    if (current == null || !employeeMatched(current, employeeGetter, employeeId)) {
      throw new IllegalArgumentException("档案记录不存在");
    }
    mapper.deleteById(id);
  }

  private <T> boolean employeeMatched(T entity, SFunction<T, Long> employeeGetter, long employeeId) {
    Long value = employeeGetter.apply(entity);
    return value != null && value.equals(employeeId);
  }

  private void mergeFamilyMember(EmployeeFamilyMemberEntity current, EmployeeFamilyMemberEntity patch) { mergeAll(current, patch); }
  private void mergeInternalRelative(EmployeeInternalRelativeEntity current, EmployeeInternalRelativeEntity patch) { mergeAll(current, patch); }
  private void mergeIdDocument(EmployeeIdDocumentEntity current, EmployeeIdDocumentEntity patch) { mergeAll(current, patch); }
  private void mergeCostCenterAllocation(EmployeeCostCenterAllocationEntity current, EmployeeCostCenterAllocationEntity patch) { mergeAll(current, patch); }

  private void validateCostCenterAllocation(EmployeeCostCenterAllocationEntity entity) {
    if (entity.getCostCenter() == null || entity.getCostCenter().isBlank()) {
      throw new IllegalArgumentException("请填写成本中心");
    }
    entity.setCostCenter(entity.getCostCenter().trim());
    if (entity.getLegalEntityId() != null) {
      legalEntityService.require(entity.getLegalEntityId());
    }
    if (entity.getPercentage() != null) {
      BigDecimal percentage = entity.getPercentage();
      if (percentage.compareTo(BigDecimal.ZERO) < 0 || percentage.compareTo(new BigDecimal("100")) > 0) {
        throw new IllegalArgumentException("分摊比例须在 0–100 之间");
      }
    }
  }

  private void validateAgreement(EmployeeAgreementEntity entity) {
    if (entity.getAgreementCode() != null) {
      entity.setAgreementCode(entity.getAgreementCode().trim());
    }
    if (entity.getOperationType() != null) {
      entity.setOperationType(entity.getOperationType().trim());
    }
    if (entity.getAgreementCategory() != null) {
      entity.setAgreementCategory(entity.getAgreementCategory().trim());
    }
    if (entity.getRemark() != null) {
      entity.setRemark(entity.getRemark().trim());
    }
    if (entity.getLegalEntityId() != null) {
      legalEntityService.require(entity.getLegalEntityId());
    }
  }
  private void mergeContract(EmployeeContractEntity current, EmployeeContractEntity patch) { mergeAll(current, patch); }
  private void mergeAgreement(EmployeeAgreementEntity current, EmployeeAgreementEntity patch) { mergeAll(current, patch); }
  private void mergeBankAccount(EmployeeBankAccountEntity current, EmployeeBankAccountEntity patch) { mergeAll(current, patch); }
  private void mergeSocialInsurance(EmployeeSocialInsuranceEntity current, EmployeeSocialInsuranceEntity patch) { mergeAll(current, patch); }
  private void mergeSpecialBenefit(EmployeeSpecialBenefitEntity current, EmployeeSpecialBenefitEntity patch) { mergeAll(current, patch); }

  private void validateSpecialBenefit(EmployeeSpecialBenefitEntity entity) {
    String has = entity.getHasSpecialBenefit();
    if (has == null || has.isBlank()) {
      throw new IllegalArgumentException("请选择是否有特殊福利");
    }
    has = has.trim().toUpperCase();
    if (!"YES".equals(has) && !"NO".equals(has)) {
      throw new IllegalArgumentException("是否有特殊福利仅支持是/否");
    }
    entity.setHasSpecialBenefit(has);
  }

  private void mergeWorkInjury(EmployeeWorkInjuryEntity current, EmployeeWorkInjuryEntity patch) { mergeAll(current, patch); }

  private void validateWorkInjury(EmployeeWorkInjuryEntity entity) {
    entity.setIsRecognized(normalizeYesNo(entity.getIsRecognized(), "是否认定为工伤"));
    entity.setParticipatedLaborAssessment(
        normalizeYesNo(entity.getParticipatedLaborAssessment(), "是否参加劳动力鉴定")
    );
    if (entity.getAccidentReason() != null && entity.getAccidentReason().length() > 2000) {
      throw new IllegalArgumentException("事故原因不能超过 2000 字");
    }
    if (entity.getWitness() != null && entity.getWitness().length() > 128) {
      throw new IllegalArgumentException("见证人不能超过 128 字");
    }
    if (entity.getLaborAssessmentLevel() != null && entity.getLaborAssessmentLevel().length() > 2000) {
      throw new IllegalArgumentException("劳动力鉴定级别不能超过 2000 字");
    }
    if (entity.getRemark() != null && entity.getRemark().length() > 2000) {
      throw new IllegalArgumentException("备注不能超过 2000 字");
    }
  }

  private String normalizeYesNo(String raw, String label) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    String value = raw.trim().toUpperCase();
    if (!"YES".equals(value) && !"NO".equals(value)) {
      throw new IllegalArgumentException(label + "仅支持是/否");
    }
    return value;
  }

  private void mergeAttachment(EmployeeAttachmentEntity current, EmployeeAttachmentEntity patch) { mergeAll(current, patch); }
  private void mergeEducation(EmployeeEducationEntity current, EmployeeEducationEntity patch) { mergeAll(current, patch); }
  private void mergeWorkExperience(EmployeeWorkExperienceEntity current, EmployeeWorkExperienceEntity patch) { mergeAll(current, patch); }
  private void mergeQualification(EmployeeQualificationEntity current, EmployeeQualificationEntity patch) { mergeAll(current, patch); }
  private void mergeTitleCertificate(EmployeeTitleCertificateEntity current, EmployeeTitleCertificateEntity patch) { mergeAll(current, patch); }
  private void mergeReward(EmployeeRewardEntity current, EmployeeRewardEntity patch) { mergeAll(current, patch); }
  private void mergePenalty(EmployeePenaltyEntity current, EmployeePenaltyEntity patch) { mergeAll(current, patch); }
  private void mergeTrainingRecord(EmployeeTrainingRecordEntity current, EmployeeTrainingRecordEntity patch) { mergeAll(current, patch); }
  private void mergePerformanceRecord(EmployeePerformanceRecordEntity current, EmployeePerformanceRecordEntity patch) { mergeAll(current, patch); }
  private void mergeValuesAssessment(EmployeeValuesAssessmentEntity current, EmployeeValuesAssessmentEntity patch) { mergeAll(current, patch); }
  private void mergeTalentReview(EmployeeTalentReviewEntity current, EmployeeTalentReviewEntity patch) { mergeAll(current, patch); }
  private void mergeProject(EmployeeProjectEntity current, EmployeeProjectEntity patch) { mergeAll(current, patch); }
  private void mergeAgentAssignment(EmployeeAgentAssignmentEntity current, EmployeeAgentAssignmentEntity patch) { mergeAll(current, patch); }

  private void validateAgentAssignment(EmployeeAgentAssignmentEntity entity) {
    entity.setPrimaryAgentTag(normalizeYesNo(entity.getPrimaryAgentTag(), "主智能体标签"));
    entity.setIsArchitect(normalizeYesNo(entity.getIsArchitect(), "架构师"));
    entity.setIsMilitia(normalizeYesNo(entity.getIsMilitia(), "民兵"));
    entity.setIsDataSteward(normalizeYesNo(entity.getIsDataSteward(), "数据治理师"));
    if (entity.getAgentName() != null) {
      entity.setAgentName(entity.getAgentName().trim());
    }
    if (entity.getAgentIdentity() != null) {
      entity.setAgentIdentity(entity.getAgentIdentity().trim());
    }
    if (entity.getAgentRole() != null) {
      entity.setAgentRole(entity.getAgentRole().trim());
    }
    if (entity.getPercentage() != null) {
      BigDecimal percentage = entity.getPercentage();
      if (percentage.compareTo(BigDecimal.ZERO) < 0 || percentage.compareTo(new BigDecimal("100")) > 0) {
        throw new IllegalArgumentException("占比须在 0–100 之间");
      }
    }
  }

  private <T> void mergeAll(T current, T patch) {
    java.beans.PropertyDescriptor[] props;
    try {
      props = java.beans.Introspector.getBeanInfo(current.getClass(), Object.class).getPropertyDescriptors();
      for (java.beans.PropertyDescriptor pd : props) {
        if (pd.getWriteMethod() == null || pd.getReadMethod() == null) continue;
        String name = pd.getName();
        if ("id".equals(name) || "employeeId".equals(name) || "createdAt".equals(name) || "createdBy".equals(name)) {
          continue;
        }
        Object value = pd.getReadMethod().invoke(patch);
        if (value != null) {
          pd.getWriteMethod().invoke(current, value);
        }
      }
    } catch (Exception e) {
      throw new IllegalStateException("更新档案记录失败", e);
    }
  }

  private void encryptIdDocument(EmployeeIdDocumentEntity entity) {
    if (entity.getIdNumber() == null || entity.getIdNumber().contains("*")) return;
    entity.setIdNumber(fieldCryptoService.encrypt(entity.getIdNumber()));
  }

  private void decryptIdDocument(EmployeeIdDocumentEntity entity) {
    entity.setIdNumber(fieldCryptoService.decrypt(entity.getIdNumber()));
  }

  private void encryptBankAccount(EmployeeBankAccountEntity entity) {
    if (entity.getAccountNo() == null || entity.getAccountNo().contains("*")) return;
    entity.setAccountNo(fieldCryptoService.encrypt(entity.getAccountNo()));
  }

  private void decryptBankAccount(EmployeeBankAccountEntity entity) {
    entity.setAccountNo(fieldCryptoService.decrypt(entity.getAccountNo()));
  }

  private void encryptSocialInsurance(EmployeeSocialInsuranceEntity entity) {
    if (entity.getSocialSecurityNo() == null || entity.getSocialSecurityNo().contains("*")) return;
    entity.setSocialSecurityNo(fieldCryptoService.encrypt(entity.getSocialSecurityNo()));
  }

  private void decryptSocialInsurance(EmployeeSocialInsuranceEntity entity) {
    entity.setSocialSecurityNo(fieldCryptoService.decrypt(entity.getSocialSecurityNo()));
  }
}
