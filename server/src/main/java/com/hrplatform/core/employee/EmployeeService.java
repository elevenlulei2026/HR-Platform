package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.OrganizationMapper;
import com.hrplatform.core.organization.PositionEntity;
import com.hrplatform.core.organization.PositionMapper;
import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.auth.AuthUser;
import com.hrplatform.platform.auth.SysUserEntity;
import com.hrplatform.platform.auth.SysUserMapper;
import com.hrplatform.platform.code.CodeGeneratorService;
import com.hrplatform.platform.crypto.FieldCryptoService;
import com.hrplatform.platform.dict.DictItemEntity;
import com.hrplatform.platform.dict.DictService;
import com.hrplatform.platform.rbac.DataScope;
import com.hrplatform.platform.rbac.DataScopeResolver;
import com.hrplatform.platform.rbac.RbacService;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class EmployeeService {
  private final EmployeeMapper employeeMapper;
  private final EmployeeAssignmentMapper assignmentMapper;
  private final EmployeeIdDocumentMapper idDocumentMapper;
  private final EmployeeMasterVersionMapper masterVersionMapper;
  private final OrganizationMapper organizationMapper;
  private final PositionMapper positionMapper;
  private final SysUserMapper sysUserMapper;
  private final CodeGeneratorService codeGeneratorService;
  private final FieldCryptoService fieldCryptoService;
  private final DictService dictService;
  private final EmployeeMovementService movementService;
  private final RbacService rbacService;

  public EmployeeService(
      EmployeeMapper employeeMapper,
      EmployeeAssignmentMapper assignmentMapper,
      EmployeeIdDocumentMapper idDocumentMapper,
      EmployeeMasterVersionMapper masterVersionMapper,
      OrganizationMapper organizationMapper,
      PositionMapper positionMapper,
      SysUserMapper sysUserMapper,
      CodeGeneratorService codeGeneratorService,
      FieldCryptoService fieldCryptoService,
      DictService dictService,
      EmployeeMovementService movementService,
      RbacService rbacService
  ) {
    this.employeeMapper = employeeMapper;
    this.assignmentMapper = assignmentMapper;
    this.idDocumentMapper = idDocumentMapper;
    this.masterVersionMapper = masterVersionMapper;
    this.organizationMapper = organizationMapper;
    this.positionMapper = positionMapper;
    this.sysUserMapper = sysUserMapper;
    this.codeGeneratorService = codeGeneratorService;
    this.fieldCryptoService = fieldCryptoService;
    this.dictService = dictService;
    this.movementService = movementService;
    this.rbacService = rbacService;
  }

  public PageResult page(String keyword, String status, Long organizationId, long page, long pageSize) {
    LambdaQueryWrapper<EmployeeEntity> qw = new LambdaQueryWrapper<EmployeeEntity>()
        .orderByDesc(EmployeeEntity::getHireDate)
        .orderByDesc(EmployeeEntity::getId);

    Set<Long> allowed = resolveAllowedEmployeeIds();
    if (allowed != null && allowed.isEmpty()) {
      return new PageResult(List.of(), 0);
    }
    if (allowed != null) {
      qw.in(EmployeeEntity::getId, allowed);
    }

    if (organizationId != null) {
      List<Long> orgEmpIds = employeeMapper.selectEmployeeIdsByPrimaryOrganization(organizationId);
      if (orgEmpIds.isEmpty()) return new PageResult(List.of(), 0);
      if (allowed != null) {
        Set<Long> intersection = new HashSet<>(orgEmpIds);
        intersection.retainAll(allowed);
        if (intersection.isEmpty()) return new PageResult(List.of(), 0);
        qw.in(EmployeeEntity::getId, intersection);
      } else {
        qw.in(EmployeeEntity::getId, orgEmpIds);
      }
    }

    if (status != null && !status.isBlank()) {
      qw.eq(EmployeeEntity::getStatus, status.trim().toUpperCase());
    }
    if (keyword != null && !keyword.isBlank()) {
      String kw = keyword.trim();
      qw.and(w -> w.like(EmployeeEntity::getFullName, kw)
          .or().like(EmployeeEntity::getEmployeeNo, kw)
          .or().like(EmployeeEntity::getCompanyEmail, kw));
    }

    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    Long total = employeeMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeEntity> records = employeeMapper.selectList(qw);
    return new PageResult(records, total == null ? 0 : total);
  }

  public List<EmployeeEntity> listForExport(String keyword, String status, Long organizationId) {
    return page(keyword, status, organizationId, 1, 10_000).records();
  }

  public EmployeeEntity require(long id) {
    EmployeeEntity e = employeeMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("员工不存在");
    assertInScope(id);
    return e;
  }

  public EmployeeMasterVersionEntity requireMasterVersionAsOf(long employeeId, LocalDate asOfDate) {
    require(employeeId);
    LocalDate date = asOfDate == null ? LocalDate.now() : asOfDate;
    var list = masterVersionMapper.selectList(
        new LambdaQueryWrapper<EmployeeMasterVersionEntity>()
            .eq(EmployeeMasterVersionEntity::getEmployeeId, employeeId)
            .le(EmployeeMasterVersionEntity::getEffectiveStartDate, date)
            .and(w -> w.isNull(EmployeeMasterVersionEntity::getEffectiveEndDate)
                .or().ge(EmployeeMasterVersionEntity::getEffectiveEndDate, date))
            .orderByDesc(EmployeeMasterVersionEntity::getEffectiveStartDate)
            .orderByDesc(EmployeeMasterVersionEntity::getId)
            .last("LIMIT 1")
    );
    if (list.isEmpty()) throw new IllegalArgumentException("员工主档快照不存在");
    return list.get(0);
  }

  public List<EmployeeMasterVersionEntity> listMasterVersions(long employeeId) {
    require(employeeId);
    return masterVersionMapper.selectList(
        new LambdaQueryWrapper<EmployeeMasterVersionEntity>()
            .eq(EmployeeMasterVersionEntity::getEmployeeId, employeeId)
            .orderByDesc(EmployeeMasterVersionEntity::getEffectiveStartDate)
            .orderByDesc(EmployeeMasterVersionEntity::getId)
    );
  }

  @Transactional
  public EmployeeEntity create(CreateCommand cmd) {
    if (cmd.fullName() == null || cmd.fullName().isBlank()) throw new IllegalArgumentException("姓名不能为空");
    if (cmd.mobile() == null || cmd.mobile().isBlank()) throw new IllegalArgumentException("手机号不能为空");
    if (cmd.hireDate() == null) throw new IllegalArgumentException("入职日期不能为空");

    EmployeeEntity entity = new EmployeeEntity();
    entity.setEmployeeNo(codeGeneratorService.generate("EMPLOYEE_NO", cmd.hireDate()).code());
    entity.setFullName(cmd.fullName().trim());
    entity.setGender(cmd.gender());
    entity.setMobile(fieldCryptoService.encrypt(cmd.mobile().trim()));
    entity.setCompanyEmail(cmd.companyEmail());
    entity.setPersonalEmail(cmd.personalEmail());
    entity.setAdAccount(cmd.adAccount());
    entity.setMaritalStatus(cmd.maritalStatus());
    entity.setPoliticalAffiliation(cmd.politicalAffiliation());
    entity.setHighestEducation(cmd.highestEducation());
    entity.setHighestEducationGradDate(cmd.highestEducationGradDate());
    entity.setFertilityStatus(cmd.fertilityStatus());
    entity.setEthnicity(cmd.ethnicity());
    entity.setHobbies(cmd.hobbies());
    entity.setNationality(cmd.nationality());
    entity.setHouseholdType(cmd.householdType());
    entity.setHouseholdLocation(cmd.householdLocation());
    entity.setPartyOrgTransferred(cmd.partyOrgTransferred());
    entity.setWorkStartDate(cmd.workStartDate());
    entity.setWechat(cmd.wechat());
    entity.setOfficePhone(cmd.officePhone());
    entity.setOfficeExtension(cmd.officeExtension());
    entity.setHomePhone(cmd.homePhone());
    entity.setIdCardAddress(cmd.idCardAddress());
    entity.setResidenceAddress(cmd.residenceAddress());
    entity.setEmergencyContactName(cmd.emergencyContactName());
    entity.setEmergencyContactPhone(cmd.emergencyContactPhone());
    entity.setEmergencyContactRelation(cmd.emergencyContactRelation());
    entity.setRecruitmentChannel(cmd.recruitmentChannel());
    entity.setRecruitmentChannelDetail(cmd.recruitmentChannelDetail());
    entity.setGroupSeniorityStartDate(cmd.groupSeniorityStartDate());
    entity.setHireDate(cmd.hireDate());
    entity.setStatus(cmd.status() == null || cmd.status().isBlank() ? "ACTIVE" : cmd.status().trim().toUpperCase());
    employeeMapper.insert(entity);

    // 写入首条个人主档版本（以 hireDate 为生效开始日）
    EmployeeMasterVersionEntity v = new EmployeeMasterVersionEntity();
    v.setEmployeeId(entity.getId());
    v.setEffectiveStartDate(cmd.hireDate());
    v.setEffectiveEndDate(null);
    v.setFullName(entity.getFullName());
    v.setGender(entity.getGender());
    v.setAdAccount(entity.getAdAccount());
    v.setMobile(entity.getMobile());
    v.setCompanyEmail(entity.getCompanyEmail());
    v.setPersonalEmail(entity.getPersonalEmail());
    v.setMaritalStatus(entity.getMaritalStatus());
    v.setPoliticalAffiliation(entity.getPoliticalAffiliation());
    v.setHighestEducation(entity.getHighestEducation());
    v.setHighestEducationGradDate(entity.getHighestEducationGradDate());
    v.setFertilityStatus(entity.getFertilityStatus());
    v.setEthnicity(entity.getEthnicity());
    v.setHobbies(entity.getHobbies());
    v.setNationality(entity.getNationality());
    v.setHouseholdType(entity.getHouseholdType());
    v.setHouseholdLocation(entity.getHouseholdLocation());
    v.setPartyOrgTransferred(entity.getPartyOrgTransferred());
    v.setWorkStartDate(entity.getWorkStartDate());
    v.setWechat(entity.getWechat());
    v.setOfficePhone(entity.getOfficePhone());
    v.setOfficeExtension(entity.getOfficeExtension());
    v.setHomePhone(entity.getHomePhone());
    v.setIdCardAddress(entity.getIdCardAddress());
    v.setResidenceAddress(entity.getResidenceAddress());
    v.setEmergencyContactName(entity.getEmergencyContactName());
    v.setEmergencyContactPhone(entity.getEmergencyContactPhone());
    v.setEmergencyContactRelation(entity.getEmergencyContactRelation());
    v.setRecruitmentChannel(entity.getRecruitmentChannel());
    v.setRecruitmentChannelDetail(entity.getRecruitmentChannelDetail());
    v.setGroupSeniorityStartDate(entity.getGroupSeniorityStartDate());
    v.setHireDate(entity.getHireDate());
    v.setStatus(entity.getStatus());
    masterVersionMapper.insert(v);

    EmployeeAssignmentEntity assignment = null;
    if (cmd.organizationId() != null && cmd.positionId() != null) {
      assignment = createAssignmentInternal(
          entity.getId(),
          cmd.organizationId(),
          cmd.positionId(),
          cmd.employmentType(),
          true,
          cmd.assignmentEffectiveStartDate() != null ? cmd.assignmentEffectiveStartDate() : cmd.hireDate(),
          null
      );
    }

    movementService.recordHire(entity.getId(), assignment == null ? null : assignment.getId(), cmd.hireDate());
    return require(entity.getId());
  }

  @Transactional
  public EmployeeEntity updateMaster(long id, MasterUpdateCommand cmd) {
    EmployeeEntity cur = require(id);
    String mode = cmd.editMode() == null || cmd.editMode().isBlank() ? "CURRENT" : cmd.editMode().trim().toUpperCase();
    if (!"CURRENT".equals(mode) && !"NEW_VERSION".equals(mode)) {
      throw new IllegalArgumentException("无效的 editMode");
    }

    if ("NEW_VERSION".equals(mode) && cmd.effectiveStartDate() == null) {
      throw new IllegalArgumentException("新增生效版本时必须填写生效日期");
    }

    if ("CURRENT".equals(mode)) {
      // 修改“今天”所在的个人主档版本
      LocalDate today = LocalDate.now();
      EmployeeMasterVersionEntity version = requireMasterVersionAsOf(id, today);
      applyMasterPatch(version, cmd);
      masterVersionMapper.updateById(version);
    } else {
      LocalDate start = cmd.effectiveStartDate();
      // 生效日不允许重复
      Long exists = masterVersionMapper.selectCount(
          new LambdaQueryWrapper<EmployeeMasterVersionEntity>()
              .eq(EmployeeMasterVersionEntity::getEmployeeId, id)
              .eq(EmployeeMasterVersionEntity::getEffectiveStartDate, start)
      );
      if (exists != null && exists > 0) {
        throw new IllegalArgumentException("同一生效日期已存在版本");
      }

      // 以“当前版本”为模板复制
      EmployeeMasterVersionEntity base = requireMasterVersionAsOf(id, LocalDate.now());
      EmployeeMasterVersionEntity newV = cloneMasterVersion(base);
      newV.setId(null);
      newV.setEmployeeId(id);
      newV.setEffectiveStartDate(start);
      applyMasterPatch(newV, cmd);

      // 自动衔接：找前一版本/下一版本
      EmployeeMasterVersionEntity prev = findPrevVersion(id, start);
      EmployeeMasterVersionEntity next = findNextVersion(id, start);
      if (next != null) {
        newV.setEffectiveEndDate(next.getEffectiveStartDate().minus(1, ChronoUnit.DAYS));
      } else {
        newV.setEffectiveEndDate(null);
      }
      if (prev != null) {
        prev.setEffectiveEndDate(start.minus(1, ChronoUnit.DAYS));
        masterVersionMapper.updateById(prev);
      }
      masterVersionMapper.insert(newV);
    }

    // 以“今天快照”回写 employee 表，保证详情默认与列表口径一致（当前生效）
    EmployeeMasterVersionEntity todayV = requireMasterVersionAsOf(id, LocalDate.now());
    applyToEmployeeEntity(cur, todayV);
    employeeMapper.updateById(cur);
    return require(id);
  }

  private EmployeeMasterVersionEntity findPrevVersion(long employeeId, LocalDate start) {
    var list = masterVersionMapper.selectList(
        new LambdaQueryWrapper<EmployeeMasterVersionEntity>()
            .eq(EmployeeMasterVersionEntity::getEmployeeId, employeeId)
            .lt(EmployeeMasterVersionEntity::getEffectiveStartDate, start)
            .orderByDesc(EmployeeMasterVersionEntity::getEffectiveStartDate)
            .last("LIMIT 1")
    );
    return list.isEmpty() ? null : list.get(0);
  }

  private EmployeeMasterVersionEntity findNextVersion(long employeeId, LocalDate start) {
    var list = masterVersionMapper.selectList(
        new LambdaQueryWrapper<EmployeeMasterVersionEntity>()
            .eq(EmployeeMasterVersionEntity::getEmployeeId, employeeId)
            .gt(EmployeeMasterVersionEntity::getEffectiveStartDate, start)
            .orderByAsc(EmployeeMasterVersionEntity::getEffectiveStartDate)
            .last("LIMIT 1")
    );
    return list.isEmpty() ? null : list.get(0);
  }

  private EmployeeMasterVersionEntity cloneMasterVersion(EmployeeMasterVersionEntity base) {
    EmployeeMasterVersionEntity v = new EmployeeMasterVersionEntity();
    v.setEmployeeId(base.getEmployeeId());
    v.setEffectiveStartDate(base.getEffectiveStartDate());
    v.setEffectiveEndDate(base.getEffectiveEndDate());

    v.setFullName(base.getFullName());
    v.setAdAccount(base.getAdAccount());
    v.setGender(base.getGender());
    v.setMobile(base.getMobile());
    v.setCompanyEmail(base.getCompanyEmail());
    v.setPersonalEmail(base.getPersonalEmail());

    v.setMaritalStatus(base.getMaritalStatus());
    v.setPoliticalAffiliation(base.getPoliticalAffiliation());
    v.setHighestEducation(base.getHighestEducation());
    v.setHighestEducationGradDate(base.getHighestEducationGradDate());
    v.setFertilityStatus(base.getFertilityStatus());
    v.setEthnicity(base.getEthnicity());
    v.setHobbies(base.getHobbies());
    v.setNationality(base.getNationality());
    v.setHouseholdType(base.getHouseholdType());
    v.setHouseholdLocation(base.getHouseholdLocation());
    v.setPartyOrgTransferred(base.getPartyOrgTransferred());
    v.setWorkStartDate(base.getWorkStartDate());
    v.setWechat(base.getWechat());
    v.setOfficePhone(base.getOfficePhone());
    v.setOfficeExtension(base.getOfficeExtension());
    v.setHomePhone(base.getHomePhone());
    v.setIdCardAddress(base.getIdCardAddress());
    v.setResidenceAddress(base.getResidenceAddress());
    v.setEmergencyContactName(base.getEmergencyContactName());
    v.setEmergencyContactPhone(base.getEmergencyContactPhone());
    v.setEmergencyContactRelation(base.getEmergencyContactRelation());
    v.setRecruitmentChannel(base.getRecruitmentChannel());
    v.setRecruitmentChannelDetail(base.getRecruitmentChannelDetail());
    v.setGroupSeniorityStartDate(base.getGroupSeniorityStartDate());

    v.setHireDate(base.getHireDate());
    v.setStatus(base.getStatus());
    return v;
  }

  private void applyMasterPatch(EmployeeMasterVersionEntity v, MasterUpdateCommand cmd) {
    if (cmd.fullName() != null) v.setFullName(cmd.fullName().trim());
    if (cmd.gender() != null) v.setGender(cmd.gender());
    if (cmd.mobile() != null && !cmd.mobile().isBlank()) {
      v.setMobile(fieldCryptoService.encrypt(cmd.mobile().trim()));
    }
    if (cmd.companyEmail() != null) v.setCompanyEmail(cmd.companyEmail());
    if (cmd.personalEmail() != null) v.setPersonalEmail(cmd.personalEmail());
    if (cmd.adAccount() != null) v.setAdAccount(cmd.adAccount());
    if (cmd.maritalStatus() != null) v.setMaritalStatus(cmd.maritalStatus());
    if (cmd.politicalAffiliation() != null) v.setPoliticalAffiliation(cmd.politicalAffiliation());
    if (cmd.highestEducation() != null) v.setHighestEducation(cmd.highestEducation());
    if (cmd.highestEducationGradDate() != null) v.setHighestEducationGradDate(cmd.highestEducationGradDate());
    if (cmd.fertilityStatus() != null) v.setFertilityStatus(cmd.fertilityStatus());
    if (cmd.ethnicity() != null) v.setEthnicity(cmd.ethnicity());
    if (cmd.hobbies() != null) v.setHobbies(cmd.hobbies());
    if (cmd.nationality() != null) v.setNationality(cmd.nationality());
    if (cmd.householdType() != null) v.setHouseholdType(cmd.householdType());
    if (cmd.householdLocation() != null) v.setHouseholdLocation(cmd.householdLocation());
    if (cmd.partyOrgTransferred() != null) v.setPartyOrgTransferred(cmd.partyOrgTransferred());
    if (cmd.workStartDate() != null) v.setWorkStartDate(cmd.workStartDate());
    if (cmd.wechat() != null) v.setWechat(cmd.wechat());
    if (cmd.officePhone() != null) v.setOfficePhone(cmd.officePhone());
    if (cmd.officeExtension() != null) v.setOfficeExtension(cmd.officeExtension());
    if (cmd.homePhone() != null) v.setHomePhone(cmd.homePhone());
    if (cmd.idCardAddress() != null) v.setIdCardAddress(cmd.idCardAddress());
    if (cmd.residenceAddress() != null) v.setResidenceAddress(cmd.residenceAddress());
    if (cmd.emergencyContactName() != null) v.setEmergencyContactName(cmd.emergencyContactName());
    if (cmd.emergencyContactPhone() != null) v.setEmergencyContactPhone(cmd.emergencyContactPhone());
    if (cmd.emergencyContactRelation() != null) v.setEmergencyContactRelation(cmd.emergencyContactRelation());
    if (cmd.recruitmentChannel() != null) v.setRecruitmentChannel(cmd.recruitmentChannel());
    if (cmd.recruitmentChannelDetail() != null) v.setRecruitmentChannelDetail(cmd.recruitmentChannelDetail());
    if (cmd.groupSeniorityStartDate() != null) v.setGroupSeniorityStartDate(cmd.groupSeniorityStartDate());
    if (cmd.hireDate() != null) v.setHireDate(cmd.hireDate());
    if (cmd.status() != null) v.setStatus(cmd.status().trim().toUpperCase());
  }

  private void applyToEmployeeEntity(EmployeeEntity e, EmployeeMasterVersionEntity v) {
    e.setFullName(v.getFullName());
    e.setAdAccount(v.getAdAccount());
    e.setGender(v.getGender());
    e.setMobile(v.getMobile());
    e.setCompanyEmail(v.getCompanyEmail());
    e.setPersonalEmail(v.getPersonalEmail());
    e.setMaritalStatus(v.getMaritalStatus());
    e.setPoliticalAffiliation(v.getPoliticalAffiliation());
    e.setHighestEducation(v.getHighestEducation());
    e.setHighestEducationGradDate(v.getHighestEducationGradDate());
    e.setFertilityStatus(v.getFertilityStatus());
    e.setEthnicity(v.getEthnicity());
    e.setHobbies(v.getHobbies());
    e.setNationality(v.getNationality());
    e.setHouseholdType(v.getHouseholdType());
    e.setHouseholdLocation(v.getHouseholdLocation());
    e.setPartyOrgTransferred(v.getPartyOrgTransferred());
    e.setWorkStartDate(v.getWorkStartDate());
    e.setWechat(v.getWechat());
    e.setOfficePhone(v.getOfficePhone());
    e.setOfficeExtension(v.getOfficeExtension());
    e.setHomePhone(v.getHomePhone());
    e.setIdCardAddress(v.getIdCardAddress());
    e.setResidenceAddress(v.getResidenceAddress());
    e.setEmergencyContactName(v.getEmergencyContactName());
    e.setEmergencyContactPhone(v.getEmergencyContactPhone());
    e.setEmergencyContactRelation(v.getEmergencyContactRelation());
    e.setRecruitmentChannel(v.getRecruitmentChannel());
    e.setRecruitmentChannelDetail(v.getRecruitmentChannelDetail());
    e.setGroupSeniorityStartDate(v.getGroupSeniorityStartDate());
    e.setHireDate(v.getHireDate());
    e.setStatus(v.getStatus());
  }

  public List<EmployeeIdDocumentEntity> listIdDocuments(long employeeId) {
    require(employeeId);
    return idDocumentMapper.selectList(
        new LambdaQueryWrapper<EmployeeIdDocumentEntity>()
            .eq(EmployeeIdDocumentEntity::getEmployeeId, employeeId)
            .orderByDesc(EmployeeIdDocumentEntity::getIsPrimary)
            .orderByDesc(EmployeeIdDocumentEntity::getId)
    );
  }

  public EmployeeAssignmentEntity requireAssignment(long employeeId, long assignmentId) {
    require(employeeId);
    EmployeeAssignmentEntity a = assignmentMapper.selectById(assignmentId);
    if (a == null || a.getEmployeeId() == null || a.getEmployeeId() != employeeId) {
      throw new IllegalArgumentException("任职记录不存在");
    }
    return a;
  }

  public List<EmployeeAssignmentEntity> listAssignments(long employeeId) {
    require(employeeId);
    return assignmentMapper.selectList(
        new LambdaQueryWrapper<EmployeeAssignmentEntity>()
            .eq(EmployeeAssignmentEntity::getEmployeeId, employeeId)
            .orderByDesc(EmployeeAssignmentEntity::getEffectiveStartDate)
            .orderByDesc(EmployeeAssignmentEntity::getId)
    );
  }

  @Transactional
  public EmployeeAssignmentEntity createAssignmentFromBody(long employeeId, EmployeeAssignmentEntity body) {
    require(employeeId);
    if (body.getOrganizationId() == null) throw new IllegalArgumentException("组织不能为空");
    if (body.getPositionId() == null) throw new IllegalArgumentException("岗位不能为空");
    if (body.getEffectiveStartDate() == null) throw new IllegalArgumentException("生效开始日期不能为空");
    body.setId(null);
    body.setEmployeeId(employeeId);
    if (body.getIsPrimary() == null) body.setIsPrimary(true);
    if (body.getStatus() == null || body.getStatus().isBlank()) {
      LocalDate end = body.getEffectiveEndDate();
      body.setStatus(end != null && end.isBefore(LocalDate.now()) ? "ENDED" : "ACTIVE");
    }
    if (organizationMapper.selectById(body.getOrganizationId()) == null) {
      throw new IllegalArgumentException("组织不存在");
    }
    if (positionMapper.selectById(body.getPositionId()) == null) {
      throw new IllegalArgumentException("岗位不存在");
    }
    validatePrimaryOverlap(body);
    assignmentMapper.insert(body);
    return requireAssignment(employeeId, body.getId());
  }

  @Transactional
  public EmployeeAssignmentEntity updateAssignmentFromBody(
      long employeeId,
      long assignmentId,
      EmployeeAssignmentEntity patch
  ) {
    EmployeeAssignmentEntity cur = requireAssignment(employeeId, assignmentId);
    if (patch.getOrganizationId() != null) cur.setOrganizationId(patch.getOrganizationId());
    if (patch.getPositionId() != null) cur.setPositionId(patch.getPositionId());
    if (patch.getJobId() != null) cur.setJobId(patch.getJobId());
    if (patch.getJobGradeCode() != null) cur.setJobGradeCode(patch.getJobGradeCode());
    if (patch.getJobSequence() != null) cur.setJobSequence(patch.getJobSequence());
    if (patch.getEmploymentType() != null) cur.setEmploymentType(patch.getEmploymentType());
    if (patch.getEmploymentSubType() != null) cur.setEmploymentSubType(patch.getEmploymentSubType());
    if (patch.getEmployeeNature() != null) cur.setEmployeeNature(patch.getEmployeeNature());
    if (patch.getContractLocation() != null) cur.setContractLocation(patch.getContractLocation());
    if (patch.getWorkLocation() != null) cur.setWorkLocation(patch.getWorkLocation());
    if (patch.getIsPrimary() != null) cur.setIsPrimary(patch.getIsPrimary());
    if (patch.getIsResponsibilitySystem() != null) cur.setIsResponsibilitySystem(patch.getIsResponsibilitySystem());
    if (patch.getApprovalAuthority() != null) cur.setApprovalAuthority(patch.getApprovalAuthority());
    if (patch.getIsManagementCadre() != null) cur.setIsManagementCadre(patch.getIsManagementCadre());
    if (patch.getIsCoreTalent() != null) cur.setIsCoreTalent(patch.getIsCoreTalent());
    if (patch.getSpecialTags() != null) cur.setSpecialTags(patch.getSpecialTags());
    if (patch.getGroupAttrLevel() != null) cur.setGroupAttrLevel(patch.getGroupAttrLevel());
    if (patch.getPayrollCompanyId() != null) cur.setPayrollCompanyId(patch.getPayrollCompanyId());
    if (patch.getCostLegalEntityId() != null) cur.setCostLegalEntityId(patch.getCostLegalEntityId());
    if (patch.getSalaryGroup() != null) cur.setSalaryGroup(patch.getSalaryGroup());
    if (patch.getBusinessUnit() != null) cur.setBusinessUnit(patch.getBusinessUnit());
    if (patch.getLegalEntityId() != null) cur.setLegalEntityId(patch.getLegalEntityId());
    if (patch.getGroupName() != null) cur.setGroupName(patch.getGroupName());
    if (patch.getBusinessGroup() != null) cur.setBusinessGroup(patch.getBusinessGroup());
    if (patch.getSystemName() != null) cur.setSystemName(patch.getSystemName());
    if (patch.getSecondarySystem() != null) cur.setSecondarySystem(patch.getSecondarySystem());
    if (patch.getCenterName() != null) cur.setCenterName(patch.getCenterName());
    if (patch.getDepartmentName() != null) cur.setDepartmentName(patch.getDepartmentName());
    if (patch.getModuleName() != null) cur.setModuleName(patch.getModuleName());
    if (patch.getTeamName() != null) cur.setTeamName(patch.getTeamName());
    if (patch.getSecondaryTeam() != null) cur.setSecondaryTeam(patch.getSecondaryTeam());
    if (patch.getLineOrStore() != null) cur.setLineOrStore(patch.getLineOrStore());
    if (patch.getSupplier() != null) cur.setSupplier(patch.getSupplier());
    if (patch.getProbationPeriod() != null) cur.setProbationPeriod(patch.getProbationPeriod());
    if (patch.getExpectedRegularizationDate() != null) {
      cur.setExpectedRegularizationDate(patch.getExpectedRegularizationDate());
    }
    if (patch.getRegularizationOpinion() != null) cur.setRegularizationOpinion(patch.getRegularizationOpinion());
    if (patch.getActualRegularizationDate() != null) {
      cur.setActualRegularizationDate(patch.getActualRegularizationDate());
    }
    if (patch.getGroupResponsibilityStartDate() != null) {
      cur.setGroupResponsibilityStartDate(patch.getGroupResponsibilityStartDate());
    }
    if (patch.getHrCoordinatorNo() != null) cur.setHrCoordinatorNo(patch.getHrCoordinatorNo());
    if (patch.getHrbpNo() != null) cur.setHrbpNo(patch.getHrbpNo());
    if (patch.getSscNo() != null) cur.setSscNo(patch.getSscNo());
    if (patch.getEffectiveStartDate() != null) cur.setEffectiveStartDate(patch.getEffectiveStartDate());
    if (patch.getEffectiveEndDate() != null) cur.setEffectiveEndDate(patch.getEffectiveEndDate());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    validatePrimaryOverlap(cur);
    assignmentMapper.updateById(cur);
    return requireAssignment(employeeId, assignmentId);
  }

  @Transactional
  public EmployeeAssignmentEntity createAssignment(long employeeId, AssignmentCommand cmd) {
    require(employeeId);
    return createAssignmentInternal(
        employeeId,
        cmd.organizationId(),
        cmd.positionId(),
        cmd.employmentType(),
        cmd.isPrimary() == null || cmd.isPrimary(),
        cmd.effectiveStartDate(),
        cmd.effectiveEndDate()
    );
  }

  @Transactional
  public EmployeeAssignmentEntity updateAssignment(long employeeId, long assignmentId, AssignmentPatch patch) {
    EmployeeAssignmentEntity cur = requireAssignment(employeeId, assignmentId);
    if (patch.organizationId() != null) cur.setOrganizationId(patch.organizationId());
    if (patch.positionId() != null) cur.setPositionId(patch.positionId());
    if (patch.employmentType() != null) cur.setEmploymentType(patch.employmentType());
    if (patch.isPrimary() != null) cur.setIsPrimary(patch.isPrimary());
    if (patch.effectiveStartDate() != null) cur.setEffectiveStartDate(patch.effectiveStartDate());
    if (patch.effectiveEndDate() != null) cur.setEffectiveEndDate(patch.effectiveEndDate());
    if (patch.status() != null) cur.setStatus(patch.status());
    validatePrimaryOverlap(cur);
    assignmentMapper.updateById(cur);
    return requireAssignment(employeeId, assignmentId);
  }

  private EmployeeAssignmentEntity createAssignmentInternal(
      long employeeId,
      long organizationId,
      long positionId,
      String employmentType,
      boolean isPrimary,
      LocalDate effectiveStartDate,
      LocalDate effectiveEndDate
  ) {
    if (organizationMapper.selectById(organizationId) == null) {
      throw new IllegalArgumentException("组织不存在");
    }
    if (positionMapper.selectById(positionId) == null) {
      throw new IllegalArgumentException("岗位不存在");
    }
    EmployeeAssignmentEntity entity = new EmployeeAssignmentEntity();
    entity.setEmployeeId(employeeId);
    entity.setOrganizationId(organizationId);
    entity.setPositionId(positionId);
    entity.setEmploymentType(employmentType);
    entity.setIsPrimary(isPrimary);
    entity.setEffectiveStartDate(effectiveStartDate);
    entity.setEffectiveEndDate(effectiveEndDate);
    entity.setStatus(effectiveEndDate != null && effectiveEndDate.isBefore(LocalDate.now()) ? "ENDED" : "ACTIVE");
    validatePrimaryOverlap(entity);
    assignmentMapper.insert(entity);
    return entity;
  }

  private void validatePrimaryOverlap(EmployeeAssignmentEntity candidate) {
    if (!Boolean.TRUE.equals(candidate.getIsPrimary())) return;
    if (candidate.getEffectiveStartDate() == null) {
      throw new IllegalArgumentException("主任职生效开始日期不能为空");
    }
    List<EmployeeAssignmentEntity> existing = assignmentMapper.selectList(
        new LambdaQueryWrapper<EmployeeAssignmentEntity>()
            .eq(EmployeeAssignmentEntity::getEmployeeId, candidate.getEmployeeId())
            .eq(EmployeeAssignmentEntity::getIsPrimary, true)
            .ne(candidate.getId() != null, EmployeeAssignmentEntity::getId, candidate.getId())
    );
    LocalDate start = candidate.getEffectiveStartDate();
    LocalDate end = candidate.getEffectiveEndDate();
    for (EmployeeAssignmentEntity e : existing) {
      if (!"ACTIVE".equals(e.getStatus()) && e.getEffectiveEndDate() != null) continue;
      if (overlaps(start, end, e.getEffectiveStartDate(), e.getEffectiveEndDate())) {
        throw new IllegalArgumentException("同一时段仅允许一条主任职");
      }
    }
  }

  private boolean overlaps(LocalDate s1, LocalDate e1, LocalDate s2, LocalDate e2) {
    LocalDate aEnd = e1 == null ? LocalDate.of(9999, 12, 31) : e1;
    LocalDate bEnd = e2 == null ? LocalDate.of(9999, 12, 31) : e2;
    return !s1.isAfter(bEnd) && !s2.isAfter(aEnd);
  }

  public EmployeeAssignmentEntity findPrimaryAssignmentAsOf(long employeeId, LocalDate asOfDate) {
    LocalDate date = asOfDate == null ? LocalDate.now() : asOfDate;
    List<EmployeeAssignmentEntity> list = assignmentMapper.selectList(
        new LambdaQueryWrapper<EmployeeAssignmentEntity>()
            .eq(EmployeeAssignmentEntity::getEmployeeId, employeeId)
            .eq(EmployeeAssignmentEntity::getIsPrimary, true)
            .eq(EmployeeAssignmentEntity::getStatus, "ACTIVE")
            .le(EmployeeAssignmentEntity::getEffectiveStartDate, date)
            .and(w -> w.isNull(EmployeeAssignmentEntity::getEffectiveEndDate)
                .or().ge(EmployeeAssignmentEntity::getEffectiveEndDate, date))
            .orderByDesc(EmployeeAssignmentEntity::getEffectiveStartDate)
            .last("LIMIT 1")
    );
    return list.isEmpty() ? null : list.get(0);
  }

  public EmployeeAssignmentEntity findCurrentPrimaryAssignment(long employeeId) {
    return findPrimaryAssignmentAsOf(employeeId, LocalDate.now());
  }

  public Map<Long, EmployeeAssignmentEntity> primaryAssignmentMap(List<Long> employeeIds) {
    if (employeeIds == null || employeeIds.isEmpty()) return Map.of();
    LocalDate today = LocalDate.now();
    List<EmployeeAssignmentEntity> list = assignmentMapper.selectList(
        new LambdaQueryWrapper<EmployeeAssignmentEntity>()
            .in(EmployeeAssignmentEntity::getEmployeeId, employeeIds)
            .eq(EmployeeAssignmentEntity::getIsPrimary, true)
            .eq(EmployeeAssignmentEntity::getStatus, "ACTIVE")
            .le(EmployeeAssignmentEntity::getEffectiveStartDate, today)
            .and(w -> w.isNull(EmployeeAssignmentEntity::getEffectiveEndDate)
                .or().ge(EmployeeAssignmentEntity::getEffectiveEndDate, today))
    );
    Map<Long, EmployeeAssignmentEntity> map = new HashMap<>();
    for (EmployeeAssignmentEntity a : list) {
      map.putIfAbsent(a.getEmployeeId(), a);
    }
    return map;
  }

  public Map<Long, OrganizationEntity> organizationMap(List<Long> orgIds) {
    if (orgIds == null || orgIds.isEmpty()) return Map.of();
    return organizationMapper.selectBatchIds(orgIds).stream()
        .collect(Collectors.toMap(OrganizationEntity::getId, o -> o, (a, b) -> a));
  }

  public Map<Long, PositionEntity> positionMap(List<Long> positionIds) {
    if (positionIds == null || positionIds.isEmpty()) return Map.of();
    return positionMapper.selectBatchIds(positionIds).stream()
        .collect(Collectors.toMap(PositionEntity::getId, p -> p, (a, b) -> a));
  }

  public Map<String, String> dictLabels(String typeCode) {
    return dictService.listItemsByTypeCode(typeCode).stream()
        .collect(Collectors.toMap(DictItemEntity::getValue, DictItemEntity::getLabel, (a, b) -> a));
  }

  public String dictLabel(String typeCode, String value) {
    if (value == null || value.isBlank()) return null;
    return dictService.listItemsByTypeCode(typeCode).stream()
        .filter(i -> value.equals(i.getValue()))
        .map(DictItemEntity::getLabel)
        .findFirst()
        .orElse(value);
  }

  public String displayMobile(EmployeeEntity e, boolean revealSensitive) {
    String plain = fieldCryptoService.decrypt(e.getMobile());
    if (revealSensitive && canViewSensitive()) {
      return plain;
    }
    return fieldCryptoService.maskMobile(plain);
  }

  public String displayMobileEncrypted(String encryptedMobile, boolean revealSensitive) {
    String plain = fieldCryptoService.decrypt(encryptedMobile);
    if (revealSensitive && canViewSensitive()) {
      return plain;
    }
    return fieldCryptoService.maskMobile(plain);
  }

  public boolean canViewSensitive() {
    return rbacService.getCurrentUserPermissions().contains("employee:sensitive:view");
  }

  private Set<Long> resolveAllowedEmployeeIds() {
    DataScope scope = DataScopeResolver.current();
    if (scope == DataScope.ALL) return null;

    AuthUser user = AuthContext.current();
    if (user == null) return Set.of();

    if (scope == DataScope.SELF) {
      Long empId = getUserEmployeeId(user.id());
      return empId == null ? Set.of() : Set.of(empId);
    }

    Long empId = getUserEmployeeId(user.id());
    if (empId == null) return Set.of();
    EmployeeAssignmentEntity primary = findCurrentPrimaryAssignment(empId);
    if (primary == null) return Set.of(empId);
    List<Long> deptIds = employeeMapper.selectEmployeeIdsByPrimaryOrganization(primary.getOrganizationId());
    return new HashSet<>(deptIds);
  }

  private void assertInScope(long employeeId) {
    Set<Long> allowed = resolveAllowedEmployeeIds();
    if (allowed != null && !allowed.contains(employeeId)) {
      throw new IllegalArgumentException("无权访问该员工数据");
    }
  }

  private Long getUserEmployeeId(long userId) {
    SysUserEntity u = sysUserMapper.selectById(userId);
    return u == null ? null : u.getEmployeeId();
  }

  public record PageResult(List<EmployeeEntity> records, long total) {}

  public record CreateCommand(
      String fullName,
      String gender,
      String mobile,
      String companyEmail,
      String personalEmail,
      String adAccount,
      String maritalStatus,
      String politicalAffiliation,
      String highestEducation,
      LocalDate highestEducationGradDate,
      String fertilityStatus,
      String ethnicity,
      String hobbies,
      String nationality,
      String householdType,
      String householdLocation,
      Boolean partyOrgTransferred,
      LocalDate workStartDate,
      String wechat,
      String officePhone,
      String officeExtension,
      String homePhone,
      String idCardAddress,
      String residenceAddress,
      String emergencyContactName,
      String emergencyContactPhone,
      String emergencyContactRelation,
      String recruitmentChannel,
      String recruitmentChannelDetail,
      LocalDate groupSeniorityStartDate,
      LocalDate hireDate,
      String status,
      Long organizationId,
      Long positionId,
      String employmentType,
      LocalDate assignmentEffectiveStartDate
  ) {}

  public record MasterUpdateCommand(
      String editMode,
      LocalDate effectiveStartDate,
      String fullName,
      String gender,
      String mobile,
      String companyEmail,
      String personalEmail,
      String adAccount,
      String maritalStatus,
      String politicalAffiliation,
      String highestEducation,
      LocalDate highestEducationGradDate,
      String fertilityStatus,
      String ethnicity,
      String hobbies,
      String nationality,
      String householdType,
      String householdLocation,
      Boolean partyOrgTransferred,
      LocalDate workStartDate,
      String wechat,
      String officePhone,
      String officeExtension,
      String homePhone,
      String idCardAddress,
      String residenceAddress,
      String emergencyContactName,
      String emergencyContactPhone,
      String emergencyContactRelation,
      String recruitmentChannel,
      String recruitmentChannelDetail,
      LocalDate groupSeniorityStartDate,
      LocalDate hireDate,
      String status
  ) {}

  public record AssignmentCommand(
      Long organizationId,
      Long positionId,
      String employmentType,
      Boolean isPrimary,
      LocalDate effectiveStartDate,
      LocalDate effectiveEndDate
  ) {}

  public record AssignmentPatch(
      Long organizationId,
      Long positionId,
      String employmentType,
      Boolean isPrimary,
      LocalDate effectiveStartDate,
      LocalDate effectiveEndDate,
      String status
  ) {}
}
