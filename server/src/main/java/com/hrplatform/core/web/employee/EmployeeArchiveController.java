package com.hrplatform.core.web.employee;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrplatform.core.employee.*;
import com.hrplatform.platform.audit.AuditLogEntity;
import com.hrplatform.platform.audit.AuditLogService;
import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.crypto.FieldCryptoService;
import com.hrplatform.platform.file.LocalFileStorageService;
import com.hrplatform.platform.rbac.ArchivePermissionSupport;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import com.hrplatform.platform.web.TraceId;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@RestController
@RequestMapping("/api/v1/employees/{employeeId}")
public class EmployeeArchiveController {
  private final EmployeeArchiveService archiveService;
  private final EmployeeService employeeService;
  private final RbacService rbacService;
  private final FieldCryptoService fieldCryptoService;
  private final LocalFileStorageService fileStorageService;
  private final AuditLogService auditLogService;
  private final ObjectMapper objectMapper;

  private final ArchivePermissionSupport archivePermissions;

  public EmployeeArchiveController(
      EmployeeArchiveService archiveService,
      EmployeeService employeeService,
      RbacService rbacService,
      ArchivePermissionSupport archivePermissions,
      FieldCryptoService fieldCryptoService,
      LocalFileStorageService fileStorageService,
      AuditLogService auditLogService,
      ObjectMapper objectMapper
  ) {
    this.archiveService = archiveService;
    this.employeeService = employeeService;
    this.rbacService = rbacService;
    this.archivePermissions = archivePermissions;
    this.fieldCryptoService = fieldCryptoService;
    this.fileStorageService = fileStorageService;
    this.auditLogService = auditLogService;
    this.objectMapper = objectMapper;
  }

  @GetMapping("/archive")
  public ApiResponse<Map<String, Object>> getArchive(
      @PathVariable long employeeId,
      @RequestParam(defaultValue = "false") boolean revealSensitive
  ) {
    requireView();
    employeeService.require(employeeId);
    boolean reveal = employeeService.shouldRevealSensitive(revealSensitive);
    if (reveal) logSensitiveView(employeeId, "employee-archive");
    Map<String, Object> source = archiveService.getArchiveBundle(employeeId);
    Map<String, Object> out = new HashMap<>();
    for (Map.Entry<String, Object> entry : source.entrySet()) {
      out.put(entry.getKey(), toValue(entry.getValue(), reveal));
    }
    return ApiResponse.ok(out);
  }

  @GetMapping("/family-members")
  public ApiResponse<List<Map<String, Object>>> listFamilyMembers(@PathVariable long employeeId) {
    return list(employeeId, "family-members", () -> archiveService.listFamilyMembers(employeeId));
  }

  @PostMapping("/family-members")
  public ApiResponse<Map<String, Object>> createFamilyMember(@PathVariable long employeeId, @Valid @RequestBody EmployeeFamilyMemberEntity body) {
    return create("family-members", () -> archiveService.createFamilyMember(employeeId, body));
  }

  @PutMapping("/family-members/{id}")
  public ApiResponse<Map<String, Object>> updateFamilyMember(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeFamilyMemberEntity body) {
    return update("family-members", () -> archiveService.updateFamilyMember(employeeId, id, body));
  }

  @DeleteMapping("/family-members/{id}")
  public ApiResponse<Map<String, Object>> deleteFamilyMember(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "family-members", () -> archiveService.deleteFamilyMember(employeeId, id));
  }

  @GetMapping("/internal-relatives")
  public ApiResponse<List<Map<String, Object>>> listInternalRelatives(@PathVariable long employeeId) {
    return list(employeeId, "internal-relatives", () -> archiveService.listInternalRelatives(employeeId));
  }

  @PostMapping("/internal-relatives")
  public ApiResponse<Map<String, Object>> createInternalRelative(@PathVariable long employeeId, @Valid @RequestBody EmployeeInternalRelativeEntity body) {
    return create("internal-relatives", () -> archiveService.createInternalRelative(employeeId, body));
  }

  @PutMapping("/internal-relatives/{id}")
  public ApiResponse<Map<String, Object>> updateInternalRelative(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeInternalRelativeEntity body) {
    return update("internal-relatives", () -> archiveService.updateInternalRelative(employeeId, id, body));
  }

  @DeleteMapping("/internal-relatives/{id}")
  public ApiResponse<Map<String, Object>> deleteInternalRelative(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "internal-relatives", () -> archiveService.deleteInternalRelative(employeeId, id));
  }

  @GetMapping("/id-documents")
  public ApiResponse<List<Map<String, Object>>> listIdDocuments(@PathVariable long employeeId) {
    return list(employeeId, "id-documents", () -> archiveService.listIdDocuments(employeeId));
  }

  @PostMapping("/id-documents")
  public ApiResponse<Map<String, Object>> createIdDocument(@PathVariable long employeeId, @Valid @RequestBody EmployeeIdDocumentEntity body) {
    return create("id-documents", () -> archiveService.createIdDocument(employeeId, body));
  }

  @PutMapping("/id-documents/{id}")
  public ApiResponse<Map<String, Object>> updateIdDocument(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeIdDocumentEntity body) {
    return update("id-documents", () -> archiveService.updateIdDocument(employeeId, id, body));
  }

  @DeleteMapping("/id-documents/{id}")
  public ApiResponse<Map<String, Object>> deleteIdDocument(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "id-documents", () -> archiveService.deleteIdDocument(employeeId, id));
  }

  @GetMapping("/cost-center-allocations")
  public ApiResponse<List<Map<String, Object>>> listCostCenterAllocations(@PathVariable long employeeId) {
    return list(employeeId, "cost-center-allocations", () -> archiveService.listCostCenterAllocations(employeeId));
  }

  @PostMapping("/cost-center-allocations")
  public ApiResponse<Map<String, Object>> createCostCenterAllocation(@PathVariable long employeeId, @Valid @RequestBody EmployeeCostCenterAllocationEntity body) {
    return create("cost-center-allocations", () -> archiveService.createCostCenterAllocation(employeeId, body));
  }

  @PutMapping("/cost-center-allocations/{id}")
  public ApiResponse<Map<String, Object>> updateCostCenterAllocation(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeCostCenterAllocationEntity body) {
    return update("cost-center-allocations", () -> archiveService.updateCostCenterAllocation(employeeId, id, body));
  }

  @DeleteMapping("/cost-center-allocations/{id}")
  public ApiResponse<Map<String, Object>> deleteCostCenterAllocation(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "cost-center-allocations", () -> archiveService.deleteCostCenterAllocation(employeeId, id));
  }

  @GetMapping("/contracts")
  public ApiResponse<List<Map<String, Object>>> listContracts(@PathVariable long employeeId) {
    return list(employeeId, "contracts", () -> archiveService.listContracts(employeeId));
  }

  @PostMapping("/contracts")
  public ApiResponse<Map<String, Object>> createContract(@PathVariable long employeeId, @Valid @RequestBody EmployeeContractEntity body) {
    return create("contracts", () -> archiveService.createContract(employeeId, body));
  }

  @PutMapping("/contracts/{id}")
  public ApiResponse<Map<String, Object>> updateContract(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeContractEntity body) {
    return update("contracts", () -> archiveService.updateContract(employeeId, id, body));
  }

  @DeleteMapping("/contracts/{id}")
  public ApiResponse<Map<String, Object>> deleteContract(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "contracts", () -> archiveService.deleteContract(employeeId, id));
  }

  @GetMapping("/agreements")
  public ApiResponse<List<Map<String, Object>>> listAgreements(@PathVariable long employeeId) {
    return list(employeeId, "agreements", () -> archiveService.listAgreements(employeeId));
  }

  @PostMapping("/agreements")
  public ApiResponse<Map<String, Object>> createAgreement(@PathVariable long employeeId, @Valid @RequestBody EmployeeAgreementEntity body) {
    return create("agreements", () -> archiveService.createAgreement(employeeId, body));
  }

  @PutMapping("/agreements/{id}")
  public ApiResponse<Map<String, Object>> updateAgreement(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeAgreementEntity body) {
    return update("agreements", () -> archiveService.updateAgreement(employeeId, id, body));
  }

  @DeleteMapping("/agreements/{id}")
  public ApiResponse<Map<String, Object>> deleteAgreement(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "agreements", () -> archiveService.deleteAgreement(employeeId, id));
  }

  @GetMapping("/attendance-cards")
  public ApiResponse<List<Map<String, Object>>> listAttendanceCards(@PathVariable long employeeId) {
    return list(employeeId, "attendance-cards", () -> archiveService.listAttendanceCards(employeeId));
  }

  @PostMapping("/attendance-cards")
  public ApiResponse<Map<String, Object>> createAttendanceCard(@PathVariable long employeeId, @Valid @RequestBody EmployeeAttendanceCardEntity body) {
    return create("attendance-cards", () -> archiveService.createAttendanceCard(employeeId, body));
  }

  @PutMapping("/attendance-cards/{id}")
  public ApiResponse<Map<String, Object>> updateAttendanceCard(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeAttendanceCardEntity body) {
    return update("attendance-cards", () -> archiveService.updateAttendanceCard(employeeId, id, body));
  }

  @DeleteMapping("/attendance-cards/{id}")
  public ApiResponse<Map<String, Object>> deleteAttendanceCard(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "attendance-cards", () -> archiveService.deleteAttendanceCard(employeeId, id));
  }

  @GetMapping("/bank-accounts")
  public ApiResponse<List<Map<String, Object>>> listBankAccounts(@PathVariable long employeeId) {
    return list(employeeId, "bank-accounts", () -> archiveService.listBankAccounts(employeeId));
  }

  @PostMapping("/bank-accounts")
  public ApiResponse<Map<String, Object>> createBankAccount(@PathVariable long employeeId, @Valid @RequestBody EmployeeBankAccountEntity body) {
    return create("bank-accounts", () -> archiveService.createBankAccount(employeeId, body));
  }

  @PutMapping("/bank-accounts/{id}")
  public ApiResponse<Map<String, Object>> updateBankAccount(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeBankAccountEntity body) {
    return update("bank-accounts", () -> archiveService.updateBankAccount(employeeId, id, body));
  }

  @DeleteMapping("/bank-accounts/{id}")
  public ApiResponse<Map<String, Object>> deleteBankAccount(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "bank-accounts", () -> archiveService.deleteBankAccount(employeeId, id));
  }

  @GetMapping("/social-insurances")
  public ApiResponse<List<Map<String, Object>>> listSocialInsurances(@PathVariable long employeeId) {
    return list(employeeId, "social-insurances", () -> archiveService.listSocialInsurances(employeeId));
  }

  @PostMapping("/social-insurances")
  public ApiResponse<Map<String, Object>> createSocialInsurance(@PathVariable long employeeId, @Valid @RequestBody EmployeeSocialInsuranceEntity body) {
    return create("social-insurances", () -> archiveService.createSocialInsurance(employeeId, body));
  }

  @PutMapping("/social-insurances/{id}")
  public ApiResponse<Map<String, Object>> updateSocialInsurance(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeSocialInsuranceEntity body) {
    return update("social-insurances", () -> archiveService.updateSocialInsurance(employeeId, id, body));
  }

  @DeleteMapping("/social-insurances/{id}")
  public ApiResponse<Map<String, Object>> deleteSocialInsurance(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "social-insurances", () -> archiveService.deleteSocialInsurance(employeeId, id));
  }

  @GetMapping("/special-benefits")
  public ApiResponse<List<Map<String, Object>>> listSpecialBenefits(@PathVariable long employeeId) {
    return list(employeeId, "special-benefits", () -> archiveService.listSpecialBenefits(employeeId));
  }

  @PostMapping("/special-benefits")
  public ApiResponse<Map<String, Object>> createSpecialBenefit(@PathVariable long employeeId, @Valid @RequestBody EmployeeSpecialBenefitEntity body) {
    return create("special-benefits", () -> archiveService.createSpecialBenefit(employeeId, body));
  }

  @PutMapping("/special-benefits/{id}")
  public ApiResponse<Map<String, Object>> updateSpecialBenefit(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeSpecialBenefitEntity body) {
    return update("special-benefits", () -> archiveService.updateSpecialBenefit(employeeId, id, body));
  }

  @DeleteMapping("/special-benefits/{id}")
  public ApiResponse<Map<String, Object>> deleteSpecialBenefit(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "special-benefits", () -> archiveService.deleteSpecialBenefit(employeeId, id));
  }

  @GetMapping("/work-injuries")
  public ApiResponse<List<Map<String, Object>>> listWorkInjuries(@PathVariable long employeeId) {
    return list(employeeId, "work-injuries", () -> archiveService.listWorkInjuries(employeeId));
  }

  @PostMapping("/work-injuries")
  public ApiResponse<Map<String, Object>> createWorkInjury(
      @PathVariable long employeeId,
      @Valid @RequestBody EmployeeWorkInjuryEntity body
  ) {
    return create("work-injuries", () -> archiveService.createWorkInjury(employeeId, body));
  }

  @PutMapping("/work-injuries/{id}")
  public ApiResponse<Map<String, Object>> updateWorkInjury(
      @PathVariable long employeeId,
      @PathVariable long id,
      @Valid @RequestBody EmployeeWorkInjuryEntity body
  ) {
    return update("work-injuries", () -> archiveService.updateWorkInjury(employeeId, id, body));
  }

  @DeleteMapping("/work-injuries/{id}")
  public ApiResponse<Map<String, Object>> deleteWorkInjury(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "work-injuries", () -> archiveService.deleteWorkInjury(employeeId, id));
  }

  @GetMapping("/admin-infos")
  public ApiResponse<List<Map<String, Object>>> listAdminInfos(@PathVariable long employeeId) {
    return list(employeeId, "admin-infos", () -> archiveService.listAdminInfos(employeeId));
  }

  @PostMapping("/admin-infos")
  public ApiResponse<Map<String, Object>> createAdminInfo(@PathVariable long employeeId, @Valid @RequestBody EmployeeAdminInfoEntity body) {
    return create("admin-infos", () -> archiveService.createAdminInfo(employeeId, body));
  }

  @PutMapping("/admin-infos/{id}")
  public ApiResponse<Map<String, Object>> updateAdminInfo(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeAdminInfoEntity body) {
    return update("admin-infos", () -> archiveService.updateAdminInfo(employeeId, id, body));
  }

  @DeleteMapping("/admin-infos/{id}")
  public ApiResponse<Map<String, Object>> deleteAdminInfo(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "admin-infos", () -> archiveService.deleteAdminInfo(employeeId, id));
  }

  @GetMapping("/accommodations")
  public ApiResponse<List<Map<String, Object>>> listAccommodations(@PathVariable long employeeId) {
    return list(employeeId, "accommodations", () -> archiveService.listAccommodations(employeeId));
  }

  @PostMapping("/accommodations")
  public ApiResponse<Map<String, Object>> createAccommodation(@PathVariable long employeeId, @Valid @RequestBody EmployeeAccommodationEntity body) {
    return create("accommodations", () -> archiveService.createAccommodation(employeeId, body));
  }

  @PutMapping("/accommodations/{id}")
  public ApiResponse<Map<String, Object>> updateAccommodation(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeAccommodationEntity body) {
    return update("accommodations", () -> archiveService.updateAccommodation(employeeId, id, body));
  }

  @DeleteMapping("/accommodations/{id}")
  public ApiResponse<Map<String, Object>> deleteAccommodation(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "accommodations", () -> archiveService.deleteAccommodation(employeeId, id));
  }

  @GetMapping("/attachments")
  public ApiResponse<List<Map<String, Object>>> listAttachments(@PathVariable long employeeId) {
    return list(employeeId, "attachments", () -> archiveService.listAttachments(employeeId));
  }

  @PostMapping("/attachments")
  public ApiResponse<Map<String, Object>> createAttachment(@PathVariable long employeeId, @Valid @RequestBody EmployeeAttachmentEntity body) {
    return create("attachments", () -> archiveService.createAttachment(employeeId, body));
  }

  @PutMapping("/attachments/{id}")
  public ApiResponse<Map<String, Object>> updateAttachment(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeAttachmentEntity body) {
    return update("attachments", () -> archiveService.updateAttachment(employeeId, id, body));
  }

  @DeleteMapping("/attachments/{id}")
  public ApiResponse<Map<String, Object>> deleteAttachment(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "attachments", () -> archiveService.deleteAttachment(employeeId, id));
  }

  @GetMapping("/attachments/{id}/download")
  public ResponseEntity<Resource> downloadAttachment(@PathVariable long employeeId, @PathVariable long id) {
    archivePermissions.requireView("attachments");
    employeeService.require(employeeId);
    EmployeeAttachmentEntity attachment = archiveService.requireAttachment(employeeId, id);
    if (attachment.getStorageKey() == null || attachment.getStorageKey().isBlank()) {
      throw new IllegalArgumentException("附件未关联存储文件");
    }
    logSensitiveView(employeeId, "employee-attachment-download");
    Resource resource = fileStorageService.load(attachment.getStorageKey());
    String filename = attachment.getOriginalFilename() == null ? "attachment" : attachment.getOriginalFilename();
    String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
        .contentType(MediaType.parseMediaType(fileStorageService.contentType(attachment.getStorageKey())))
        .body(resource);
  }

  @GetMapping("/educations")
  public ApiResponse<List<Map<String, Object>>> listEducations(@PathVariable long employeeId) {
    return list(employeeId, "educations", () -> archiveService.listEducations(employeeId));
  }

  @PostMapping("/educations")
  public ApiResponse<Map<String, Object>> createEducation(@PathVariable long employeeId, @Valid @RequestBody EmployeeEducationEntity body) {
    return create("educations", () -> archiveService.createEducation(employeeId, body));
  }

  @PutMapping("/educations/{id}")
  public ApiResponse<Map<String, Object>> updateEducation(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeEducationEntity body) {
    return update("educations", () -> archiveService.updateEducation(employeeId, id, body));
  }

  @DeleteMapping("/educations/{id}")
  public ApiResponse<Map<String, Object>> deleteEducation(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "educations", () -> archiveService.deleteEducation(employeeId, id));
  }

  @GetMapping("/work-experiences")
  public ApiResponse<List<Map<String, Object>>> listWorkExperiences(@PathVariable long employeeId) {
    return list(employeeId, "work-experiences", () -> archiveService.listWorkExperiences(employeeId));
  }

  @PostMapping("/work-experiences")
  public ApiResponse<Map<String, Object>> createWorkExperience(@PathVariable long employeeId, @Valid @RequestBody EmployeeWorkExperienceEntity body) {
    return create("work-experiences", () -> archiveService.createWorkExperience(employeeId, body));
  }

  @PutMapping("/work-experiences/{id}")
  public ApiResponse<Map<String, Object>> updateWorkExperience(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeWorkExperienceEntity body) {
    return update("work-experiences", () -> archiveService.updateWorkExperience(employeeId, id, body));
  }

  @DeleteMapping("/work-experiences/{id}")
  public ApiResponse<Map<String, Object>> deleteWorkExperience(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "work-experiences", () -> archiveService.deleteWorkExperience(employeeId, id));
  }

  @GetMapping("/qualifications")
  public ApiResponse<List<Map<String, Object>>> listQualifications(@PathVariable long employeeId) {
    return list(employeeId, "qualifications", () -> archiveService.listQualifications(employeeId));
  }

  @PostMapping("/qualifications")
  public ApiResponse<Map<String, Object>> createQualification(@PathVariable long employeeId, @Valid @RequestBody EmployeeQualificationEntity body) {
    return create("qualifications", () -> archiveService.createQualification(employeeId, body));
  }

  @PutMapping("/qualifications/{id}")
  public ApiResponse<Map<String, Object>> updateQualification(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeQualificationEntity body) {
    return update("qualifications", () -> archiveService.updateQualification(employeeId, id, body));
  }

  @DeleteMapping("/qualifications/{id}")
  public ApiResponse<Map<String, Object>> deleteQualification(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "qualifications", () -> archiveService.deleteQualification(employeeId, id));
  }

  @GetMapping("/title-certificates")
  public ApiResponse<List<Map<String, Object>>> listTitleCertificates(@PathVariable long employeeId) {
    return list(employeeId, "title-certificates", () -> archiveService.listTitleCertificates(employeeId));
  }

  @PostMapping("/title-certificates")
  public ApiResponse<Map<String, Object>> createTitleCertificate(@PathVariable long employeeId, @Valid @RequestBody EmployeeTitleCertificateEntity body) {
    return create("title-certificates", () -> archiveService.createTitleCertificate(employeeId, body));
  }

  @PutMapping("/title-certificates/{id}")
  public ApiResponse<Map<String, Object>> updateTitleCertificate(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeTitleCertificateEntity body) {
    return update("title-certificates", () -> archiveService.updateTitleCertificate(employeeId, id, body));
  }

  @DeleteMapping("/title-certificates/{id}")
  public ApiResponse<Map<String, Object>> deleteTitleCertificate(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "title-certificates", () -> archiveService.deleteTitleCertificate(employeeId, id));
  }

  @GetMapping("/rewards")
  public ApiResponse<List<Map<String, Object>>> listRewards(@PathVariable long employeeId) {
    return list(employeeId, "rewards", () -> archiveService.listRewards(employeeId));
  }

  @PostMapping("/rewards")
  public ApiResponse<Map<String, Object>> createReward(@PathVariable long employeeId, @Valid @RequestBody EmployeeRewardEntity body) {
    return create("rewards", () -> archiveService.createReward(employeeId, body));
  }

  @PutMapping("/rewards/{id}")
  public ApiResponse<Map<String, Object>> updateReward(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeRewardEntity body) {
    return update("rewards", () -> archiveService.updateReward(employeeId, id, body));
  }

  @DeleteMapping("/rewards/{id}")
  public ApiResponse<Map<String, Object>> deleteReward(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "rewards", () -> archiveService.deleteReward(employeeId, id));
  }

  @GetMapping("/penalties")
  public ApiResponse<List<Map<String, Object>>> listPenalties(@PathVariable long employeeId) {
    return list(employeeId, "penalties", () -> archiveService.listPenalties(employeeId));
  }

  @PostMapping("/penalties")
  public ApiResponse<Map<String, Object>> createPenalty(@PathVariable long employeeId, @Valid @RequestBody EmployeePenaltyEntity body) {
    return create("penalties", () -> archiveService.createPenalty(employeeId, body));
  }

  @PutMapping("/penalties/{id}")
  public ApiResponse<Map<String, Object>> updatePenalty(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeePenaltyEntity body) {
    return update("penalties", () -> archiveService.updatePenalty(employeeId, id, body));
  }

  @DeleteMapping("/penalties/{id}")
  public ApiResponse<Map<String, Object>> deletePenalty(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "penalties", () -> archiveService.deletePenalty(employeeId, id));
  }

  @GetMapping("/training-records")
  public ApiResponse<List<Map<String, Object>>> listTrainingRecords(@PathVariable long employeeId) {
    return list(employeeId, "training-records", () -> archiveService.listTrainingRecords(employeeId));
  }

  @PostMapping("/training-records")
  public ApiResponse<Map<String, Object>> createTrainingRecord(@PathVariable long employeeId, @Valid @RequestBody EmployeeTrainingRecordEntity body) {
    return create("training-records", () -> archiveService.createTrainingRecord(employeeId, body));
  }

  @PutMapping("/training-records/{id}")
  public ApiResponse<Map<String, Object>> updateTrainingRecord(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeTrainingRecordEntity body) {
    return update("training-records", () -> archiveService.updateTrainingRecord(employeeId, id, body));
  }

  @DeleteMapping("/training-records/{id}")
  public ApiResponse<Map<String, Object>> deleteTrainingRecord(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "training-records", () -> archiveService.deleteTrainingRecord(employeeId, id));
  }

  @GetMapping("/performance-records")
  public ApiResponse<List<Map<String, Object>>> listPerformanceRecords(@PathVariable long employeeId) {
    return list(employeeId, "performance-records", () -> archiveService.listPerformanceRecords(employeeId));
  }

  @PostMapping("/performance-records")
  public ApiResponse<Map<String, Object>> createPerformanceRecord(@PathVariable long employeeId, @Valid @RequestBody EmployeePerformanceRecordEntity body) {
    return create("performance-records", () -> archiveService.createPerformanceRecord(employeeId, body));
  }

  @PutMapping("/performance-records/{id}")
  public ApiResponse<Map<String, Object>> updatePerformanceRecord(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeePerformanceRecordEntity body) {
    return update("performance-records", () -> archiveService.updatePerformanceRecord(employeeId, id, body));
  }

  @DeleteMapping("/performance-records/{id}")
  public ApiResponse<Map<String, Object>> deletePerformanceRecord(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "performance-records", () -> archiveService.deletePerformanceRecord(employeeId, id));
  }

  @GetMapping("/values-assessments")
  public ApiResponse<List<Map<String, Object>>> listValuesAssessments(@PathVariable long employeeId) {
    return list(employeeId, "values-assessments", () -> archiveService.listValuesAssessments(employeeId));
  }

  @PostMapping("/values-assessments")
  public ApiResponse<Map<String, Object>> createValuesAssessment(@PathVariable long employeeId, @Valid @RequestBody EmployeeValuesAssessmentEntity body) {
    return create("values-assessments", () -> archiveService.createValuesAssessment(employeeId, body));
  }

  @PutMapping("/values-assessments/{id}")
  public ApiResponse<Map<String, Object>> updateValuesAssessment(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeValuesAssessmentEntity body) {
    return update("values-assessments", () -> archiveService.updateValuesAssessment(employeeId, id, body));
  }

  @DeleteMapping("/values-assessments/{id}")
  public ApiResponse<Map<String, Object>> deleteValuesAssessment(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "values-assessments", () -> archiveService.deleteValuesAssessment(employeeId, id));
  }

  @GetMapping("/talent-reviews")
  public ApiResponse<List<Map<String, Object>>> listTalentReviews(@PathVariable long employeeId) {
    return list(employeeId, "talent-reviews", () -> archiveService.listTalentReviews(employeeId));
  }

  @PostMapping("/talent-reviews")
  public ApiResponse<Map<String, Object>> createTalentReview(@PathVariable long employeeId, @Valid @RequestBody EmployeeTalentReviewEntity body) {
    return create("talent-reviews", () -> archiveService.createTalentReview(employeeId, body));
  }

  @PutMapping("/talent-reviews/{id}")
  public ApiResponse<Map<String, Object>> updateTalentReview(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeTalentReviewEntity body) {
    return update("talent-reviews", () -> archiveService.updateTalentReview(employeeId, id, body));
  }

  @DeleteMapping("/talent-reviews/{id}")
  public ApiResponse<Map<String, Object>> deleteTalentReview(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "talent-reviews", () -> archiveService.deleteTalentReview(employeeId, id));
  }

  @GetMapping("/projects")
  public ApiResponse<List<Map<String, Object>>> listProjects(@PathVariable long employeeId) {
    return list(employeeId, "projects", () -> archiveService.listProjects(employeeId));
  }

  @PostMapping("/projects")
  public ApiResponse<Map<String, Object>> createProject(@PathVariable long employeeId, @Valid @RequestBody EmployeeProjectEntity body) {
    return create("projects", () -> archiveService.createProject(employeeId, body));
  }

  @PutMapping("/projects/{id}")
  public ApiResponse<Map<String, Object>> updateProject(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeProjectEntity body) {
    return update("projects", () -> archiveService.updateProject(employeeId, id, body));
  }

  @DeleteMapping("/projects/{id}")
  public ApiResponse<Map<String, Object>> deleteProject(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "projects", () -> archiveService.deleteProject(employeeId, id));
  }

  @GetMapping("/agent-assignments")
  public ApiResponse<List<Map<String, Object>>> listAgentAssignments(@PathVariable long employeeId) {
    return list(employeeId, "agent-assignments", () -> archiveService.listAgentAssignments(employeeId));
  }

  @PostMapping("/agent-assignments")
  public ApiResponse<Map<String, Object>> createAgentAssignment(@PathVariable long employeeId, @Valid @RequestBody EmployeeAgentAssignmentEntity body) {
    return create("agent-assignments", () -> archiveService.createAgentAssignment(employeeId, body));
  }

  @PutMapping("/agent-assignments/{id}")
  public ApiResponse<Map<String, Object>> updateAgentAssignment(@PathVariable long employeeId, @PathVariable long id, @Valid @RequestBody EmployeeAgentAssignmentEntity body) {
    return update("agent-assignments", () -> archiveService.updateAgentAssignment(employeeId, id, body));
  }

  @DeleteMapping("/agent-assignments/{id}")
  public ApiResponse<Map<String, Object>> deleteAgentAssignment(@PathVariable long employeeId, @PathVariable long id) {
    return delete(employeeId, id, "agent-assignments", () -> archiveService.deleteAgentAssignment(employeeId, id));
  }

  private <T> ApiResponse<List<Map<String, Object>>> list(
      long employeeId,
      String resource,
      Supplier<List<T>> supplier
  ) {
    archivePermissions.requireView(resource);
    employeeService.require(employeeId);
    boolean reveal = employeeService.canViewSensitive();
    return ApiResponse.ok(supplier.get().stream().map(item -> toMap(item, reveal)).toList());
  }

  private <T> ApiResponse<Map<String, Object>> create(String resource, Supplier<T> supplier) {
    archivePermissions.requireCreate(resource);
    boolean reveal = employeeService.canViewSensitive();
    return ApiResponse.ok(toMap(supplier.get(), reveal));
  }

  private <T> ApiResponse<Map<String, Object>> update(String resource, Supplier<T> supplier) {
    archivePermissions.requireEdit(resource);
    boolean reveal = employeeService.canViewSensitive();
    return ApiResponse.ok(toMap(supplier.get(), reveal));
  }

  private ApiResponse<Map<String, Object>> delete(
      long employeeId,
      long id,
      String resource,
      Runnable action
  ) {
    archivePermissions.requireDelete(resource);
    employeeService.require(employeeId);
    action.run();
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(id));
    dto.put("employeeId", String.valueOf(employeeId));
    return ApiResponse.ok(dto);
  }

  private void requireView() { rbacService.requirePermission("employee:roster:view"); }

  private Object toValue(Object source, boolean revealSensitive) {
    if (source instanceof Map<?, ?> map) {
      Map<String, Object> out = new HashMap<>();
      for (Map.Entry<?, ?> entry : map.entrySet()) {
        out.put(String.valueOf(entry.getKey()), toValue(entry.getValue(), revealSensitive));
      }
      return out;
    }
    if (source instanceof List<?> list) {
      return list.stream().map(item -> toValue(item, revealSensitive)).toList();
    }
    return toMap(source, revealSensitive);
  }

  private Map<String, Object> toMap(Object bean, boolean revealSensitive) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toMap(bean, fieldCryptoService, revealSensitive);
    enrichArchiveLabels(bean, dto);
    return dto;
  }

  private void enrichArchiveLabels(Object bean, Map<String, Object> dto) {
    if (bean instanceof EmployeeIdDocumentEntity doc) {
      putDictLabel(dto, "countryRegion", "COUNTRY_REGION", doc.getCountryRegion());
      putDictLabel(dto, "idType", "ID_TYPE", doc.getIdType());
      return;
    }
    if (bean instanceof EmployeeFamilyMemberEntity member) {
      putDictLabel(dto, "relation", "EMPLOYEE_RELATION", member.getRelation());
      return;
    }
    if (bean instanceof EmployeeInternalRelativeEntity relative) {
      putDictLabel(dto, "relation", "EMPLOYEE_RELATION", relative.getRelation());
      putDictLabel(dto, "employmentStatus", "EMPLOYEE_STATUS", relative.getEmploymentStatus());
      if (relative.getRelativeEmployeeId() != null) {
        try {
          EmployeeEntity emp = employeeService.require(relative.getRelativeEmployeeId());
          dto.put("relativeEmployeeNo", emp.getEmployeeNo());
          dto.put("relativeEmployeeName", emp.getFullName());
        } catch (Exception ignored) {
          // 关联员工可能已删除，保留 ID 即可
        }
      }
      return;
    }
    if (bean instanceof EmployeeAgreementEntity agreement) {
      putDictLabel(dto, "agreementCategory", "AGREEMENT_CATEGORY", agreement.getAgreementCategory());
      putDictLabel(dto, "operationType", "AGREEMENT_OPERATION_TYPE", agreement.getOperationType());
      return;
    }
    if (bean instanceof EmployeeAdminInfoEntity adminInfo) {
      putDictLabel(dto, "workEnvironment", "WORK_ENVIRONMENT", adminInfo.getWorkEnvironment());
      return;
    }
    if (bean instanceof EmployeeEducationEntity education) {
      putDictLabel(dto, "degree", "DEGREE", education.getDegree());
      putDictLabel(dto, "educationLevel", "EDUCATION", education.getEducationLevel());
      putDictLabel(dto, "countryRegion", "COUNTRY_REGION", education.getCountryRegion());
    }
  }

  private void putDictLabel(Map<String, Object> dto, String field, String dictType, String value) {
    dto.put(field + "Label", employeeService.dictLabel(dictType, value));
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
}
