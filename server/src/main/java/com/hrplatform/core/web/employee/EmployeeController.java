package com.hrplatform.core.web.employee;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrplatform.core.employee.EmployeeAssignmentEntity;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeImportService;
import com.hrplatform.core.employee.EmployeeMasterVersionEntity;
import com.hrplatform.core.employee.EmployeeMovementEntity;
import com.hrplatform.core.employee.EmployeeMovementService;
import com.hrplatform.core.employee.EmployeeService;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.PositionEntity;
import com.hrplatform.platform.audit.AuditLogEntity;
import com.hrplatform.platform.audit.AuditLogService;
import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import com.hrplatform.platform.web.TraceId;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.beans.Introspector;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class EmployeeController {
  private final EmployeeService employeeService;
  private final EmployeeMovementService movementService;
  private final EmployeeImportService importService;
  private final RbacService rbacService;
  private final AuditLogService auditLogService;
  private final ObjectMapper objectMapper;

  public EmployeeController(
      EmployeeService employeeService,
      EmployeeMovementService movementService,
      EmployeeImportService importService,
      RbacService rbacService,
      AuditLogService auditLogService,
      ObjectMapper objectMapper
  ) {
    this.employeeService = employeeService;
    this.movementService = movementService;
    this.importService = importService;
    this.rbacService = rbacService;
    this.auditLogService = auditLogService;
    this.objectMapper = objectMapper;
  }

  @GetMapping("/employees")
  public ApiResponse<Map<String, Object>> listEmployees(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) Long organizationId,
      @RequestParam(defaultValue = "false") boolean revealSensitive,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireRosterView();
    var p = employeeService.page(keyword, status, organizationId, page, pageSize);
    boolean reveal = employeeService.shouldRevealSensitive(revealSensitive);
    List<Long> empIds = p.records().stream().map(EmployeeEntity::getId).toList();
    Map<Long, EmployeeAssignmentEntity> primaryMap = employeeService.primaryAssignmentMap(empIds);
    List<Long> orgIds = primaryMap.values().stream().map(EmployeeAssignmentEntity::getOrganizationId).distinct().toList();
    List<Long> posIds = primaryMap.values().stream().map(EmployeeAssignmentEntity::getPositionId).distinct().toList();
    Map<Long, OrganizationEntity> orgMap = employeeService.organizationMap(orgIds);
    Map<Long, PositionEntity> posMap = employeeService.positionMap(posIds);

    List<Map<String, Object>> items = p.records().stream().map(e -> {
      EmployeeAssignmentEntity pa = primaryMap.get(e.getId());
      OrganizationEntity org = pa == null ? null : orgMap.get(pa.getOrganizationId());
      PositionEntity pos = pa == null ? null : posMap.get(pa.getPositionId());
      return toEmployeeDto(e, org, pos, pa, reveal);
    }).toList();

    Map<String, Object> result = new HashMap<>();
    result.put("items", items);
    result.put("total", p.total());
    result.put("page", page);
    result.put("pageSize", pageSize);
    return ApiResponse.ok(result);
  }

  @GetMapping("/employees/assignment-form-options")
  public ApiResponse<Map<String, Object>> getAssignmentFormOptions() {
    requireRosterView();
    Map<String, Object> out = new HashMap<>();
    out.put("suppliers", toDictOptions(employeeService.dictLabels("SUPPLIER")));
    out.put("probationPeriods", toDictOptions(employeeService.dictLabels("PROBATION_PERIOD")));
    out.put("contractLocations", toDictOptions(employeeService.dictLabels("CONTRACT_LOCATION")));
    out.put("workLocations", toDictOptions(employeeService.dictLabels("WORK_LOCATION")));
    out.put("approvalAuthorities", toDictOptions(employeeService.dictLabels("APPROVAL_AUTHORITY")));
    out.put("jobGrades", toDictOptions(employeeService.dictLabels("JOB_GRADE")));
    out.put("employeeNatures", toDictOptions(employeeService.dictLabels("EMPLOYEE_NATURE")));
    out.put("groupAttrLevels", toDictOptions(employeeService.dictLabels("GROUP_ATTR_LEVEL")));
    out.put("salaryGroups", toDictOptions(employeeService.dictLabels("SALARY_GROUP")));
    out.put("legalCompanies", toDictOptions(employeeService.dictLabels("LEGAL_COMPANY")));
    out.put("payrollCompanies", toDictOptions(employeeService.dictLabels("PAYROLL_COMPANY")));
    return ApiResponse.ok(out);
  }

  @GetMapping("/employees/form-options")
  public ApiResponse<Map<String, Object>> getEmployeeFormOptions() {
    requireRosterView();
    Map<String, Object> out = new HashMap<>();
    out.put("maritalStatuses", toDictOptions(employeeService.dictLabels("MARITAL_STATUS")));
    out.put("politicalAffiliations", toDictOptions(employeeService.dictLabels("POLITICAL_AFFILIATION")));
    out.put("highestEducations", toDictOptions(employeeService.dictLabels("HIGHEST_EDUCATION")));
    out.put("fertilityStatuses", toDictOptions(employeeService.dictLabels("FERTILITY_STATUS")));
    out.put("ethnicities", toDictOptions(employeeService.dictLabels("ETHNICITY")));
    out.put("nationalities", toDictOptions(employeeService.dictLabels("NATIONALITY")));
    out.put("householdTypes", toDictOptions(employeeService.dictLabels("HOUSEHOLD_TYPE")));
    out.put("employeeRelations", toDictOptions(employeeService.dictLabels("EMPLOYEE_RELATION")));
    out.put("recruitmentChannels", toDictOptions(employeeService.dictLabels("RECRUITMENT_CHANNEL")));
    out.put("countryRegions", toDictOptions(employeeService.dictLabels("COUNTRY_REGION")));
    out.put("idTypes", toDictOptions(employeeService.dictLabels("ID_TYPE")));
    return ApiResponse.ok(out);
  }

  @GetMapping("/employees/{id}")
  public ApiResponse<Map<String, Object>> getEmployee(
      @PathVariable("id") long id,
      @RequestParam(required = false) String asOfDate,
      @RequestParam(defaultValue = "false") boolean revealSensitive
  ) {
    requireRosterView();
    EmployeeEntity e = employeeService.require(id);
    LocalDate snapshotDate = asOfDate == null || asOfDate.isBlank() ? LocalDate.now() : LocalDate.parse(asOfDate.trim());
    EmployeeMasterVersionEntity master = employeeService.requireMasterVersionAsOf(id, snapshotDate);
    boolean reveal = employeeService.shouldRevealSensitive(revealSensitive);
    if (reveal) logSensitiveView(id, "employee");
    EmployeeAssignmentEntity pa = employeeService.findPrimaryAssignmentAsOf(id, snapshotDate);
    OrganizationEntity org = pa == null ? null : employeeService.organizationMap(List.of(pa.getOrganizationId())).get(pa.getOrganizationId());
    PositionEntity pos = pa == null ? null : employeeService.positionMap(List.of(pa.getPositionId())).get(pa.getPositionId());
    return ApiResponse.ok(toEmployeeDto(e, master, org, pos, pa, reveal));
  }

  @GetMapping("/employees/{id}/master-versions")
  public ApiResponse<List<Map<String, Object>>> listEmployeeMasterVersions(@PathVariable("id") long id) {
    requireRosterView();
    employeeService.require(id);
    return ApiResponse.ok(employeeService.listMasterVersions(id).stream().map(this::toMasterVersionDto).toList());
  }

  @PostMapping("/employees")
  public ApiResponse<Map<String, Object>> createEmployee(@Valid @RequestBody EmployeeCreateRequest req) {
    requireCreate();
    EmployeeEntity created = employeeService.create(new EmployeeService.CreateCommand(
        req.fullName(),
        req.gender(),
        req.mobile(),
        req.companyEmail(),
        req.personalEmail(),
        req.adAccount(),
        req.maritalStatus(),
        req.politicalAffiliation(),
        req.highestEducation(),
        req.highestEducationGradDate(),
        req.fertilityStatus(),
        req.ethnicity(),
        req.hobbies(),
        req.nationality(),
        req.householdType(),
        req.householdLocation(),
        req.partyOrgTransferred(),
        req.workStartDate(),
        req.wechat(),
        req.officePhone(),
        req.officeExtension(),
        req.homePhone(),
        req.idCardAddress(),
        req.residenceAddress(),
        req.emergencyContactName(),
        req.emergencyContactPhone(),
        req.emergencyContactRelation(),
        req.recruitmentChannel(),
        req.recruitmentChannelDetail(),
        req.groupSeniorityStartDate(),
        req.hireDate(),
        req.status(),
        req.organizationId(),
        req.positionId(),
        req.employmentType(),
        req.assignmentEffectiveStartDate()
    ));
    boolean reveal = employeeService.canViewSensitive();
    EmployeeAssignmentEntity pa = employeeService.findCurrentPrimaryAssignment(created.getId());
    OrganizationEntity org = pa == null ? null : employeeService.organizationMap(List.of(pa.getOrganizationId())).get(pa.getOrganizationId());
    PositionEntity pos = pa == null ? null : employeeService.positionMap(List.of(pa.getPositionId())).get(pa.getPositionId());
    EmployeeMasterVersionEntity master = employeeService.requireMasterVersionAsOf(created.getId(), LocalDate.now());
    return ApiResponse.ok(toEmployeeDto(created, master, org, pos, pa, reveal));
  }

  @PutMapping("/employees/{id}")
  public ApiResponse<Map<String, Object>> updateEmployee(
      @PathVariable("id") long id,
      @Valid @RequestBody EmployeeUpdateRequest req
  ) {
    requireEdit();
    EmployeeEntity updated = employeeService.updateMaster(id, new EmployeeService.MasterUpdateCommand(
        req.editMode(),
        req.effectiveStartDate(),
        req.fullName(),
        req.gender(),
        req.mobile(),
        req.companyEmail(),
        req.personalEmail(),
        req.adAccount(),
        req.maritalStatus(),
        req.politicalAffiliation(),
        req.highestEducation(),
        req.highestEducationGradDate(),
        req.fertilityStatus(),
        req.ethnicity(),
        req.hobbies(),
        req.nationality(),
        req.householdType(),
        req.householdLocation(),
        req.partyOrgTransferred(),
        req.workStartDate(),
        req.wechat(),
        req.officePhone(),
        req.officeExtension(),
        req.homePhone(),
        req.idCardAddress(),
        req.residenceAddress(),
        req.emergencyContactName(),
        req.emergencyContactPhone(),
        req.emergencyContactRelation(),
        req.recruitmentChannel(),
        req.recruitmentChannelDetail(),
        req.groupSeniorityStartDate(),
        req.hireDate(),
        req.status()
    ));
    boolean reveal = employeeService.canViewSensitive();
    EmployeeAssignmentEntity pa = employeeService.findCurrentPrimaryAssignment(id);
    OrganizationEntity org = pa == null ? null : employeeService.organizationMap(List.of(pa.getOrganizationId())).get(pa.getOrganizationId());
    PositionEntity pos = pa == null ? null : employeeService.positionMap(List.of(pa.getPositionId())).get(pa.getPositionId());
    EmployeeMasterVersionEntity master = employeeService.requireMasterVersionAsOf(id, LocalDate.now());
    return ApiResponse.ok(toEmployeeDto(updated, master, org, pos, pa, reveal));
  }

  @GetMapping("/employees/{id}/assignments")
  public ApiResponse<List<Map<String, Object>>> listAssignments(
      @PathVariable("id") long id,
      @RequestParam(required = false) String asOfDate
  ) {
    requireRosterView();
    LocalDate snapshot = asOfDate == null || asOfDate.isBlank()
        ? LocalDate.now()
        : LocalDate.parse(asOfDate.trim());
    return ApiResponse.ok(employeeService.listAssignmentDtos(id, snapshot));
  }

  @PostMapping("/employees/{id}/assignments")
  public ApiResponse<Map<String, Object>> createAssignment(
      @PathVariable("id") long id,
      @RequestBody EmployeeAssignmentEntity body
  ) {
    requireEdit();
    EmployeeAssignmentEntity created = employeeService.createAssignmentFromBody(id, body);
    return ApiResponse.ok(employeeService.listAssignmentDtos(id, LocalDate.now()).stream()
        .filter(d -> created.getId().toString().equals(d.get("id")))
        .findFirst()
        .orElseGet(() -> {
          Map<Long, OrganizationEntity> orgMap = employeeService.organizationMap(List.of(created.getOrganizationId()));
          Map<Long, PositionEntity> posMap = employeeService.positionMap(List.of(created.getPositionId()));
          return toAssignmentDto(created, orgMap, posMap);
        }));
  }

  @PutMapping("/employees/{employeeId}/assignments/{assignmentId}")
  public ApiResponse<Map<String, Object>> updateAssignment(
      @PathVariable long employeeId,
      @PathVariable long assignmentId,
      @RequestBody EmployeeAssignmentEntity body
  ) {
    requireEdit();
    EmployeeAssignmentEntity updated = employeeService.updateAssignmentFromBody(employeeId, assignmentId, body);
    return ApiResponse.ok(employeeService.listAssignmentDtos(employeeId, LocalDate.now()).stream()
        .filter(d -> String.valueOf(updated.getId()).equals(d.get("id")))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("任职记录不存在")));
  }

  @GetMapping("/employees/{id}/movements")
  public ApiResponse<List<Map<String, Object>>> listMovements(@PathVariable("id") long id) {
    requireRosterView();
    employeeService.require(id);
    return ApiResponse.ok(movementService.listByEmployee(id).stream().map(this::toMovementDto).toList());
  }

  @GetMapping("/employees/import-template")
  public ResponseEntity<byte[]> downloadTemplate() {
    requireImport();
    byte[] bytes = importService.buildTemplate();
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=employee-import-template.xlsx")
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(bytes);
  }

  @PostMapping(value = "/employees/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<Map<String, Object>> importEmployees(@RequestParam("file") MultipartFile file) {
    requireImport();
    EmployeeImportService.ImportResult r = importService.importExcel(file);
    Map<String, Object> dto = new HashMap<>();
    dto.put("totalRows", r.totalRows());
    dto.put("successCount", r.successCount());
    dto.put("failureCount", r.failureCount());
    dto.put("errors", r.errors().stream().map(e -> Map.of(
        "rowNumber", e.rowNumber(),
        "field", e.field() == null ? "" : e.field(),
        "message", e.message()
    )).toList());
    return ApiResponse.ok(dto);
  }

  @PostMapping({"/employees/import-error-report", "/employees/import-errors-report"})
  public ResponseEntity<byte[]> importErrorReport(@Valid @RequestBody ImportErrorReportRequest req) {
    requireEdit();
    List<EmployeeImportService.RowError> errors = req.errors().stream()
        .map(e -> new EmployeeImportService.RowError(e.rowNumber(), e.field(), e.message()))
        .toList();
    byte[] bytes = importService.buildErrorReport(errors);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=employee-import-errors.xlsx")
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(bytes);
  }

  @GetMapping("/employees/export")
  public ResponseEntity<byte[]> exportEmployees(
      HttpServletRequest request,
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) Long organizationId
  ) {
    requireExport();
    boolean reveal = employeeService.canViewSensitive();
    List<EmployeeEntity> list = employeeService.listForExport(keyword, status, organizationId);
    byte[] bytes = importService.exportExcel(list, reveal);
    logExport(request, list.size());
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=employee-roster.xlsx")
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(bytes);
  }

  private void requireRosterView() { rbacService.requirePermission("employee:roster:view"); }
  private void requireCreate() {
    rbacService.requireAnyPermission("employee:roster:create", "employee:edit");
  }
  private void requireEdit() {
    rbacService.requireAnyPermission("employee:roster:edit", "employee:edit");
  }
  private void requireImport() {
    rbacService.requireAnyPermission("employee:roster:import", "employee:edit");
  }
  private void requireExport() { rbacService.requirePermission("employee:export"); }

  private List<Map<String, Object>> toDictOptions(Map<String, String> labels) {
    return labels.entrySet().stream()
        .map(e -> Map.<String, Object>of("value", e.getKey(), "label", e.getValue()))
        .toList();
  }

  private Map<String, Object> toEmployeeDto(
      EmployeeEntity e,
      EmployeeMasterVersionEntity master,
      OrganizationEntity org,
      PositionEntity pos,
      EmployeeAssignmentEntity pa,
      boolean revealSensitive
  ) {
    String mobileDisplay = employeeService.displayMobileEncrypted(master.getMobile(), revealSensitive);
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("employeeNo", e.getEmployeeNo());
    dto.put("effectiveStartDate", master.getEffectiveStartDate() == null ? null : master.getEffectiveStartDate().toString());
    dto.put("effectiveEndDate", master.getEffectiveEndDate() == null ? null : master.getEffectiveEndDate().toString());
    dto.put("fullName", master.getFullName());
    dto.put("gender", master.getGender());
    dto.put("genderLabel", employeeService.dictLabel("GENDER", master.getGender()));
    dto.put("mobile", mobileDisplay);
    dto.put("mobileMasked", !revealSensitive);
    dto.put("companyEmail", master.getCompanyEmail());
    dto.put("personalEmail", master.getPersonalEmail());
    dto.put("adAccount", master.getAdAccount());
    dto.put("maritalStatus", master.getMaritalStatus());
    dto.put("maritalStatusLabel", employeeService.dictLabel("MARITAL_STATUS", master.getMaritalStatus()));
    dto.put("politicalAffiliation", master.getPoliticalAffiliation());
    dto.put("politicalAffiliationLabel", employeeService.dictLabel("POLITICAL_AFFILIATION", master.getPoliticalAffiliation()));
    dto.put("highestEducation", master.getHighestEducation());
    dto.put("highestEducationLabel", employeeService.dictLabel("HIGHEST_EDUCATION", master.getHighestEducation()));
    dto.put("highestEducationGradDate", master.getHighestEducationGradDate() == null ? null : master.getHighestEducationGradDate().toString());
    dto.put("fertilityStatus", master.getFertilityStatus());
    dto.put("fertilityStatusLabel", employeeService.dictLabel("FERTILITY_STATUS", master.getFertilityStatus()));
    dto.put("ethnicity", master.getEthnicity());
    dto.put("ethnicityLabel", employeeService.dictLabel("ETHNICITY", master.getEthnicity()));
    dto.put("hobbies", master.getHobbies());
    dto.put("nationality", master.getNationality());
    dto.put("nationalityLabel", employeeService.dictLabel("NATIONALITY", master.getNationality()));
    dto.put("householdType", master.getHouseholdType());
    dto.put("householdTypeLabel", employeeService.dictLabel("HOUSEHOLD_TYPE", master.getHouseholdType()));
    dto.put("householdLocation", master.getHouseholdLocation());
    dto.put("partyOrgTransferred", master.getPartyOrgTransferred());
    dto.put("workStartDate", master.getWorkStartDate() == null ? null : master.getWorkStartDate().toString());
    dto.put("wechat", master.getWechat());
    dto.put("officePhone", master.getOfficePhone());
    dto.put("officeExtension", master.getOfficeExtension());
    dto.put("homePhone", master.getHomePhone());
    dto.put("idCardAddress", master.getIdCardAddress());
    dto.put("residenceAddress", master.getResidenceAddress());
    dto.put("emergencyContactName", master.getEmergencyContactName());
    dto.put("emergencyContactPhone", master.getEmergencyContactPhone());
    dto.put("emergencyContactRelation", master.getEmergencyContactRelation());
    dto.put("emergencyContactRelationLabel", employeeService.dictLabel("EMPLOYEE_RELATION", master.getEmergencyContactRelation()));
    dto.put("recruitmentChannel", master.getRecruitmentChannel());
    dto.put("recruitmentChannelLabel", employeeService.dictLabel("RECRUITMENT_CHANNEL", master.getRecruitmentChannel()));
    dto.put("recruitmentChannelDetail", master.getRecruitmentChannelDetail());
    dto.put("groupSeniorityStartDate", master.getGroupSeniorityStartDate() == null ? null : master.getGroupSeniorityStartDate().toString());
    dto.put("hireDate", master.getHireDate() == null ? null : master.getHireDate().toString());
    dto.put("status", master.getStatus());
    dto.put("statusLabel", employeeService.dictLabel("EMPLOYEE_STATUS", master.getStatus()));
    if (pa != null) {
      dto.put("primaryOrganizationId", String.valueOf(pa.getOrganizationId()));
      dto.put("primaryPositionId", String.valueOf(pa.getPositionId()));
    }
    if (org != null) {
      dto.put("primaryOrganizationName", org.getName());
    }
    if (pos != null) {
      dto.put("primaryPositionName", pos.getName());
    }
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toMasterVersionDto(EmployeeMasterVersionEntity v) {
    LocalDate today = LocalDate.now();
    String temporal;
    if (v.getEffectiveStartDate() != null && v.getEffectiveStartDate().isAfter(today)) {
      temporal = "future";
    } else if (v.getEffectiveEndDate() != null && v.getEffectiveEndDate().isBefore(today)) {
      temporal = "past";
    } else {
      temporal = "present";
    }
    String temporalLabel = switch (temporal) {
      case "past" -> "过去";
      case "future" -> "将来";
      default -> "当前";
    };
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(v.getId()));
    dto.put("employeeId", String.valueOf(v.getEmployeeId()));
    dto.put("effectiveStartDate", v.getEffectiveStartDate() == null ? null : v.getEffectiveStartDate().toString());
    dto.put("effectiveEndDate", v.getEffectiveEndDate() == null ? null : v.getEffectiveEndDate().toString());
    dto.put("status", v.getStatus());
    dto.put("statusLabel", employeeService.dictLabel("EMPLOYEE_STATUS", v.getStatus()));
    dto.put("temporal", temporal);
    dto.put("temporalLabel", temporalLabel);
    dto.put("isOpen", v.getEffectiveEndDate() == null);
    return dto;
  }

  private Map<String, Object> toEmployeeDto(
      EmployeeEntity e,
      OrganizationEntity org,
      PositionEntity pos,
      EmployeeAssignmentEntity pa,
      boolean revealSensitive
  ) {
    // 列表口径：以 employee 表当前数据为准（不返回主档版本生效区间）
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("employeeNo", e.getEmployeeNo());
    dto.put("fullName", e.getFullName());
    dto.put("gender", e.getGender());
    dto.put("genderLabel", employeeService.dictLabel("GENDER", e.getGender()));
    dto.put("mobile", employeeService.displayMobile(e, revealSensitive));
    dto.put("mobileMasked", !revealSensitive);
    dto.put("companyEmail", e.getCompanyEmail());
    dto.put("personalEmail", e.getPersonalEmail());
    dto.put("adAccount", e.getAdAccount());
    dto.put("maritalStatus", e.getMaritalStatus());
    dto.put("maritalStatusLabel", employeeService.dictLabel("MARITAL_STATUS", e.getMaritalStatus()));
    dto.put("politicalAffiliation", e.getPoliticalAffiliation());
    dto.put("politicalAffiliationLabel", employeeService.dictLabel("POLITICAL_AFFILIATION", e.getPoliticalAffiliation()));
    dto.put("highestEducation", e.getHighestEducation());
    dto.put("highestEducationLabel", employeeService.dictLabel("HIGHEST_EDUCATION", e.getHighestEducation()));
    dto.put("highestEducationGradDate", e.getHighestEducationGradDate() == null ? null : e.getHighestEducationGradDate().toString());
    dto.put("fertilityStatus", e.getFertilityStatus());
    dto.put("fertilityStatusLabel", employeeService.dictLabel("FERTILITY_STATUS", e.getFertilityStatus()));
    dto.put("ethnicity", e.getEthnicity());
    dto.put("ethnicityLabel", employeeService.dictLabel("ETHNICITY", e.getEthnicity()));
    dto.put("hobbies", e.getHobbies());
    dto.put("nationality", e.getNationality());
    dto.put("nationalityLabel", employeeService.dictLabel("NATIONALITY", e.getNationality()));
    dto.put("householdType", e.getHouseholdType());
    dto.put("householdTypeLabel", employeeService.dictLabel("HOUSEHOLD_TYPE", e.getHouseholdType()));
    dto.put("householdLocation", e.getHouseholdLocation());
    dto.put("partyOrgTransferred", e.getPartyOrgTransferred());
    dto.put("workStartDate", e.getWorkStartDate() == null ? null : e.getWorkStartDate().toString());
    dto.put("wechat", e.getWechat());
    dto.put("officePhone", e.getOfficePhone());
    dto.put("officeExtension", e.getOfficeExtension());
    dto.put("homePhone", e.getHomePhone());
    dto.put("idCardAddress", e.getIdCardAddress());
    dto.put("residenceAddress", e.getResidenceAddress());
    dto.put("emergencyContactName", e.getEmergencyContactName());
    dto.put("emergencyContactPhone", e.getEmergencyContactPhone());
    dto.put("emergencyContactRelation", e.getEmergencyContactRelation());
    dto.put("emergencyContactRelationLabel", employeeService.dictLabel("EMPLOYEE_RELATION", e.getEmergencyContactRelation()));
    dto.put("recruitmentChannel", e.getRecruitmentChannel());
    dto.put("recruitmentChannelLabel", employeeService.dictLabel("RECRUITMENT_CHANNEL", e.getRecruitmentChannel()));
    dto.put("recruitmentChannelDetail", e.getRecruitmentChannelDetail());
    dto.put("groupSeniorityStartDate", e.getGroupSeniorityStartDate() == null ? null : e.getGroupSeniorityStartDate().toString());
    dto.put("hireDate", e.getHireDate() == null ? null : e.getHireDate().toString());
    dto.put("status", e.getStatus());
    dto.put("statusLabel", employeeService.dictLabel("EMPLOYEE_STATUS", e.getStatus()));
    if (pa != null) {
      dto.put("primaryOrganizationId", String.valueOf(pa.getOrganizationId()));
      dto.put("primaryPositionId", String.valueOf(pa.getPositionId()));
    }
    if (org != null) {
      dto.put("primaryOrganizationName", org.getName());
    }
    if (pos != null) {
      dto.put("primaryPositionName", pos.getName());
    }
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toAssignmentDto(
      EmployeeAssignmentEntity a,
      Map<Long, OrganizationEntity> orgMap,
      Map<Long, PositionEntity> posMap
  ) {
    OrganizationEntity org = orgMap.get(a.getOrganizationId());
    PositionEntity pos = posMap.get(a.getPositionId());
    Map<String, Object> dto = entityToMap(a);
    dto.put("organizationName", org == null ? null : org.getName());
    dto.put("organizationCode", org == null ? null : org.getCode());
    dto.put("positionName", pos == null ? null : pos.getName());
    dto.put("positionCode", pos == null ? null : pos.getCode());
    dto.put("employmentTypeLabel", employeeService.dictLabel("EMPLOYMENT_TYPE", a.getEmploymentType()));
    return dto;
  }

  private Map<String, Object> entityToMap(Object bean) {
    try {
      Map<String, Object> dto = new HashMap<>();
      var beanInfo = Introspector.getBeanInfo(bean.getClass(), Object.class);
      for (var pd : beanInfo.getPropertyDescriptors()) {
        if (pd.getReadMethod() == null) continue;
        Object value = pd.getReadMethod().invoke(bean);
        String key = pd.getName();
        if (value instanceof LocalDate date) {
          dto.put(key, date.toString());
        } else if (value instanceof LocalDateTime dateTime) {
          dto.put(key, dateTime.toString());
        } else if (value instanceof Long longValue && ("id".equals(key) || key.endsWith("Id"))) {
          dto.put(key, String.valueOf(longValue));
        } else {
          dto.put(key, value);
        }
      }
      return dto;
    } catch (Exception e) {
      throw new IllegalStateException("组装响应失败", e);
    }
  }

  private Map<String, Object> toMovementDto(EmployeeMovementEntity m) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(m.getId()));
    dto.put("employeeId", String.valueOf(m.getEmployeeId()));
    dto.put("movementType", m.getMovementType());
    dto.put("movementTypeName", m.getMovementTypeName());
    dto.put("reasonCode", m.getReasonCode());
    dto.put("reasonDescription", m.getReasonDescription());
    dto.put("reasonSubCode", m.getReasonSubCode());
    dto.put("reasonSubDescription", m.getReasonSubDescription());
    dto.put("effectiveDate", m.getEffectiveDate().toString());
    dto.put("fromAssignmentId", m.getFromAssignmentId() == null ? null : String.valueOf(m.getFromAssignmentId()));
    dto.put("toAssignmentId", m.getToAssignmentId() == null ? null : String.valueOf(m.getToAssignmentId()));
    dto.put("sourceRequestType", m.getSourceRequestType());
    dto.put("sourceRequestId", m.getSourceRequestId() == null ? null : String.valueOf(m.getSourceRequestId()));
    dto.put("remark", m.getRemark());
    dto.put("createdAt", m.getCreatedAt() == null ? null : m.getCreatedAt().toString());
    dto.put("createdBy", m.getCreatedBy() == null ? null : String.valueOf(m.getCreatedBy()));
    return dto;
  }

  private void logSensitiveView(long employeeId, String resourceType) {
    try {
      AuditLogEntity log = new AuditLogEntity();
      log.setAction("VIEW");
      log.setResourceType(resourceType);
      log.setResourceId(String.valueOf(employeeId));
      var user = AuthContext.current();
      if (user != null) {
        log.setOperatorUserId(user.id());
        log.setOperatorUsername(user.username());
      }
      log.setTraceId(TraceId.current());
      log.setCreatedAt(LocalDateTime.now());
      log.setDetailJson(objectMapper.writeValueAsString(Map.of("sensitive", true)));
      auditLogService.append(log);
    } catch (Exception ignored) {
      // 审计失败不阻断业务
    }
  }

  private void logExport(HttpServletRequest request, int count) {
    try {
      AuditLogEntity log = new AuditLogEntity();
      log.setAction("EXPORT");
      log.setResourceType("employees");
      var user = AuthContext.current();
      if (user != null) {
        log.setOperatorUserId(user.id());
        log.setOperatorUsername(user.username());
      }
      log.setIpAddress(request.getRemoteAddr());
      log.setTraceId(TraceId.current());
      log.setCreatedAt(LocalDateTime.now());
      log.setDetailJson(objectMapper.writeValueAsString(Map.of("count", count)));
      auditLogService.append(log);
    } catch (Exception ignored) {
      // 审计失败不阻断业务
    }
  }

  public record EmployeeCreateRequest(
      @NotBlank String fullName,
      @NotBlank String gender,
      @NotBlank String mobile,
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
      @NotNull LocalDate hireDate,
      String status,
      Long organizationId,
      Long positionId,
      String employmentType,
      LocalDate assignmentEffectiveStartDate
  ) {}

  public record EmployeeUpdateRequest(
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

  public record ImportErrorReportRequest(@NotNull List<ImportErrorItem> errors) {}

  public record ImportErrorItem(
      @NotNull Integer rowNumber,
      String field,
      @NotBlank String message
  ) {}

  public record AssignmentCreateRequest(
      @NotNull Long organizationId,
      @NotNull Long positionId,
      String employmentType,
      Boolean isPrimary,
      @NotNull LocalDate effectiveStartDate,
      LocalDate effectiveEndDate
  ) {}

  public record AssignmentUpdateRequest(
      Long organizationId,
      Long positionId,
      String employmentType,
      Boolean isPrimary,
      LocalDate effectiveStartDate,
      LocalDate effectiveEndDate,
      String status
  ) {}
}
