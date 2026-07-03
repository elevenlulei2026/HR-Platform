package com.hrplatform.core.web.organization;

import com.hrplatform.core.organization.*;
import com.hrplatform.platform.dict.DictService;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class OrganizationController {
  private final LegalEntityService legalEntityService;
  private final CostCenterService costCenterService;
  private final OrganizationService organizationService;
  private final PositionService positionService;
  private final RbacService rbacService;
  private final DictService dictService;

  public OrganizationController(
      LegalEntityService legalEntityService,
      CostCenterService costCenterService,
      OrganizationService organizationService,
      PositionService positionService,
      RbacService rbacService,
      DictService dictService
  ) {
    this.legalEntityService = legalEntityService;
    this.costCenterService = costCenterService;
    this.organizationService = organizationService;
    this.positionService = positionService;
    this.rbacService = rbacService;
    this.dictService = dictService;
  }

  // ----- Legal Entity -----

  @GetMapping("/legal-entities")
  public ApiResponse<Map<String, Object>> listLegalEntities(
      @RequestParam(required = false) String keyword,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireOrgView();
    var p = legalEntityService.page(keyword, page, pageSize);
    return ApiResponse.ok(pageOf(p.records().stream().map(this::toLegalEntityDto).toList(), p.total(), page, pageSize));
  }

  @PostMapping("/legal-entities")
  public ApiResponse<Map<String, Object>> createLegalEntity(@Valid @RequestBody LegalEntityCreateRequest req) {
    requireOrgEdit();
    LegalEntityEntity entity = new LegalEntityEntity();
    entity.setCode(req.code());
    entity.setName(req.name());
    entity.setCreditCode(req.creditCode());
    entity.setRegion(req.region());
    entity.setStatus(req.status());
    return ApiResponse.ok(toLegalEntityDto(legalEntityService.create(entity)));
  }

  @PutMapping("/legal-entities/{id}")
  public ApiResponse<Map<String, Object>> updateLegalEntity(
      @PathVariable("id") long id,
      @Valid @RequestBody LegalEntityUpdateRequest req
  ) {
    requireOrgEdit();
    LegalEntityEntity patch = new LegalEntityEntity();
    patch.setName(req.name());
    patch.setCreditCode(req.creditCode());
    patch.setRegion(req.region());
    patch.setStatus(req.status());
    return ApiResponse.ok(toLegalEntityDto(legalEntityService.update(id, patch)));
  }

  @DeleteMapping("/legal-entities/{id}")
  public ApiResponse<Map<String, Object>> deleteLegalEntity(@PathVariable("id") long id) {
    requireOrgEdit();
    legalEntityService.delete(id);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  // ----- Cost Center -----

  @GetMapping("/cost-centers")
  public ApiResponse<Map<String, Object>> listCostCenters(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) Long legalEntityId,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requireOrgView();
    var p = costCenterService.page(keyword, legalEntityId, page, pageSize);
    Map<Long, String> leNames = costCenterService.legalEntityNames(p.records());
    return ApiResponse.ok(pageOf(
        p.records().stream().map(e -> toCostCenterDto(e, leNames.get(e.getLegalEntityId()))).toList(),
        p.total(), page, pageSize
    ));
  }

  @PostMapping("/cost-centers")
  public ApiResponse<Map<String, Object>> createCostCenter(@Valid @RequestBody CostCenterCreateRequest req) {
    requireOrgEdit();
    CostCenterEntity entity = new CostCenterEntity();
    entity.setCode(req.code());
    entity.setName(req.name());
    entity.setLegalEntityId(req.legalEntityId());
    entity.setStatus(req.status());
    CostCenterEntity created = costCenterService.create(entity);
    LegalEntityEntity le = legalEntityService.require(created.getLegalEntityId());
    return ApiResponse.ok(toCostCenterDto(created, le.getName()));
  }

  @PutMapping("/cost-centers/{id}")
  public ApiResponse<Map<String, Object>> updateCostCenter(
      @PathVariable("id") long id,
      @Valid @RequestBody CostCenterUpdateRequest req
  ) {
    requireOrgEdit();
    CostCenterEntity patch = new CostCenterEntity();
    patch.setName(req.name());
    patch.setLegalEntityId(req.legalEntityId());
    patch.setStatus(req.status());
    CostCenterEntity updated = costCenterService.update(id, patch);
    LegalEntityEntity le = legalEntityService.require(updated.getLegalEntityId());
    return ApiResponse.ok(toCostCenterDto(updated, le.getName()));
  }

  @DeleteMapping("/cost-centers/{id}")
  public ApiResponse<Map<String, Object>> deleteCostCenter(@PathVariable("id") long id) {
    requireOrgEdit();
    costCenterService.delete(id);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  // ----- Organization -----

  @GetMapping("/organizations/tree")
  public ApiResponse<List<Map<String, Object>>> getOrganizationTree(
      @RequestParam(required = false) String asOfDate
  ) {
    requireOrgView();
    LocalDate date = asOfDate == null || asOfDate.isBlank() ? LocalDate.now() : LocalDate.parse(asOfDate);
    List<OrganizationService.TreeNode> tree = organizationService.getTree(date);
    DictLabels labels = loadDictLabels();
    return ApiResponse.ok(tree.stream().map(n -> toTreeNodeDto(n, labels)).toList());
  }

  @GetMapping("/organizations/department-type-options")
  public ApiResponse<List<Map<String, Object>>> listDepartmentTypeOptions() {
    requireOrgView();
    return ApiResponse.ok(toDictOptions(organizationService.dictLabels("DEPARTMENT_TYPE")));
  }

  @GetMapping("/organizations/form-options")
  public ApiResponse<Map<String, Object>> getOrganizationFormOptions() {
    requireOrgView();
    Map<String, Object> out = new HashMap<>();
    out.put("locations", toDictOptions(organizationService.dictLabels("LOCATION")));
    out.put("legalCompanies", toDictOptions(organizationService.dictLabels("LEGAL_COMPANY")));
    out.put("departmentTypes", toDictOptions(organizationService.dictLabels("DEPARTMENT_TYPE")));
    out.put("departmentLevels", toDictOptions(organizationService.dictLabels("DEPARTMENT_LEVEL")));
    return ApiResponse.ok(out);
  }

  @GetMapping("/organizations/by-code/{code}/versions")
  public ApiResponse<List<Map<String, Object>>> getOrganizationVersions(@PathVariable("code") String code) {
    requireOrgView();
    LocalDate today = LocalDate.now();
    List<OrganizationEntity> versions = organizationService.listVersionsByCode(code);
    return ApiResponse.ok(versions.stream().map(v -> toVersionDto(v, today)).toList());
  }

  @GetMapping("/organizations/{id}")
  public ApiResponse<Map<String, Object>> getOrganization(@PathVariable("id") long id) {
    requireOrgView();
    OrganizationEntity e = organizationService.require(id);
    DictLabels labels = loadDictLabels();
    String parentName = resolveParentName(e.getParentCode(), e.getEffectiveStartDate());
    return ApiResponse.ok(toOrganizationDto(e, labels, parentName));
  }

  @PostMapping("/organizations")
  public ApiResponse<Map<String, Object>> createOrganization(@Valid @RequestBody OrganizationCreateRequest req) {
    requireOrgEdit();
    OrganizationEntity entity = fromCreateRequest(req);
    OrganizationEntity created = organizationService.create(entity);
    DictLabels labels = loadDictLabels();
    String parentName = resolveParentName(created.getParentCode(), created.getEffectiveStartDate());
    return ApiResponse.ok(toOrganizationDto(created, labels, parentName));
  }

  @PutMapping("/organizations/{id}")
  public ApiResponse<Map<String, Object>> updateOrganization(
      @PathVariable("id") long id,
      @Valid @RequestBody OrganizationUpdateRequest req
  ) {
    requireOrgEdit();
    OrganizationEntity patch = fromUpdateRequest(req);
    OrganizationEntity updated = organizationService.update(id, patch, req.editMode());
    DictLabels labels = loadDictLabels();
    String parentName = resolveParentName(updated.getParentCode(), updated.getEffectiveStartDate());
    return ApiResponse.ok(toOrganizationDto(updated, labels, parentName));
  }

  // ----- Position -----

  @GetMapping("/positions/form-options")
  public ApiResponse<Map<String, Object>> getPositionFormOptions() {
    requirePositionView();
    Map<String, Object> out = new HashMap<>();
    out.put("positionCategories", toDictOptions(positionService.dictLabels("POSITION_CATEGORY")));
    out.put("positionLevels", toDictOptions(positionService.dictLabels("POSITION_LEVEL")));
    out.put("identityCategories", toDictOptions(positionService.dictLabels("IDENTITY_CATEGORY")));
    return ApiResponse.ok(out);
  }

  @GetMapping("/positions")
  public ApiResponse<Map<String, Object>> listPositions(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) Long organizationId,
      @RequestParam(required = false) String asOfDate,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    requirePositionView();
    LocalDate date = asOfDate == null || asOfDate.isBlank() ? LocalDate.now() : LocalDate.parse(asOfDate);
    var p = positionService.page(keyword, organizationId, date, page, pageSize);
    Map<Long, OrganizationEntity> orgMap = positionService.orgMap(p.records());
    PositionDictLabels labels = loadPositionDictLabels();
    return ApiResponse.ok(pageOf(
        p.records().stream().map(e -> {
          OrganizationEntity org = orgMap.get(e.getOrganizationId());
          return toPositionDto(
              e,
              org == null ? null : org.getName(),
              org == null ? null : org.getCode(),
              labels
          );
        }).toList(),
        p.total(), page, pageSize
    ));
  }

  @GetMapping("/positions/by-code/{code}/versions")
  public ApiResponse<List<Map<String, Object>>> getPositionVersions(@PathVariable("code") String code) {
    requirePositionView();
    LocalDate today = LocalDate.now();
    List<PositionEntity> versions = positionService.listVersionsByCode(code);
    return ApiResponse.ok(versions.stream().map(v -> toPositionVersionDto(v, today)).toList());
  }

  @GetMapping("/positions/{id}")
  public ApiResponse<Map<String, Object>> getPosition(@PathVariable("id") long id) {
    requirePositionView();
    PositionEntity e = positionService.require(id);
    OrganizationEntity org = organizationService.require(e.getOrganizationId());
    return ApiResponse.ok(toPositionDto(e, org.getName(), org.getCode(), loadPositionDictLabels()));
  }

  @PostMapping("/positions")
  public ApiResponse<Map<String, Object>> createPosition(@Valid @RequestBody PositionCreateRequest req) {
    requirePositionEdit();
    PositionEntity entity = fromPositionCreateRequest(req);
    PositionEntity created = positionService.create(entity);
    OrganizationEntity org = organizationService.require(created.getOrganizationId());
    return ApiResponse.ok(toPositionDto(created, org.getName(), org.getCode(), loadPositionDictLabels()));
  }

  @PutMapping("/positions/{id}")
  public ApiResponse<Map<String, Object>> updatePosition(
      @PathVariable("id") long id,
      @Valid @RequestBody PositionUpdateRequest req
  ) {
    requirePositionEdit();
    PositionEntity patch = fromPositionUpdateRequest(req);
    PositionEntity updated = positionService.update(id, patch, req.editMode());
    OrganizationEntity org = organizationService.require(updated.getOrganizationId());
    return ApiResponse.ok(toPositionDto(updated, org.getName(), org.getCode(), loadPositionDictLabels()));
  }

  @DeleteMapping("/positions/{id}")
  public ApiResponse<Map<String, Object>> deletePosition(@PathVariable("id") long id) {
    requirePositionEdit();
    positionService.delete(id);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  // ----- helpers -----

  private void requireOrgView() { rbacService.requirePermission("organization:view"); }
  private void requireOrgEdit() { rbacService.requirePermission("organization:edit"); }
  private void requirePositionView() { rbacService.requirePermission("position:view"); }
  private void requirePositionEdit() { rbacService.requirePermission("position:edit"); }

  private Map<String, Object> pageOf(List<?> items, long total, long page, long pageSize) {
    Map<String, Object> m = new HashMap<>();
    m.put("items", items);
    m.put("total", total);
    m.put("page", page);
    m.put("pageSize", pageSize);
    return m;
  }

  private List<OrganizationEntity> flattenTree(List<OrganizationService.TreeNode> tree) {
    List<OrganizationEntity> out = new ArrayList<>();
    for (OrganizationService.TreeNode n : tree) {
      out.add(n.entity());
      out.addAll(flattenTree(n.children()));
    }
    return out;
  }

  private record DictLabels(
      Map<String, String> locations,
      Map<String, String> legalCompanies,
      Map<String, String> departmentTypes,
      Map<String, String> departmentLevels
  ) {}

  private DictLabels loadDictLabels() {
    return new DictLabels(
        organizationService.dictLabels("LOCATION"),
        organizationService.dictLabels("LEGAL_COMPANY"),
        organizationService.dictLabels("DEPARTMENT_TYPE"),
        organizationService.dictLabels("DEPARTMENT_LEVEL")
    );
  }

  private List<Map<String, Object>> toDictOptions(Map<String, String> labels) {
    return labels.entrySet().stream()
        .map(e -> Map.<String, Object>of("value", e.getKey(), "label", e.getValue()))
        .toList();
  }

  private String resolveParentName(String parentCode, LocalDate asOfDate) {
    if (parentCode == null || parentCode.isBlank()) return null;
    OrganizationEntity parent = organizationService.findActiveByCode(parentCode, asOfDate);
    return parent == null ? null : parent.getName();
  }

  private static String orgAttributeLabel(String value) {
    if (value == null) return null;
    return switch (value) {
      case "PHYSICAL" -> "实体";
      case "VIRTUAL" -> "虚拟";
      default -> value;
    };
  }

  private static String orgFunctionLabel(String value) {
    if (value == null) return null;
    return switch (value) {
      case "RND" -> "产研";
      case "MANUFACTURING" -> "制造";
      case "MARKET" -> "市场";
      case "FUNCTION" -> "职能";
      default -> value;
    };
  }

  private static String statusLabel(String value) {
    if (value == null) return null;
    return switch (value) {
      case "ACTIVE" -> "有效";
      case "INACTIVE" -> "无效";
      default -> value;
    };
  }

  private OrganizationEntity fromCreateRequest(OrganizationCreateRequest req) {
    OrganizationEntity entity = new OrganizationEntity();
    entity.setName(req.name());
    entity.setParentCode(req.parentCode());
    entity.setEffectiveStartDate(LocalDate.parse(req.effectiveStartDate()));
    entity.setStatus(req.status());
    entity.setLocation(req.location());
    entity.setLegalCompany(req.legalCompany());
    entity.setDepartmentType(req.departmentType());
    entity.setDepartmentLevel(req.departmentLevel());
    entity.setCostCenter(req.costCenter());
    entity.setOrgLeaderNo(req.orgLeaderNo());
    entity.setSupervisingLeaderNo(req.supervisingLeaderNo());
    entity.setOrgAttribute(req.orgAttribute());
    entity.setOrgFunction(req.orgFunction());
    entity.setOrgTags(req.orgTags());
    entity.setFinancialCode(req.financialCode());
    entity.setHrCoordinatorNo(req.hrCoordinatorNo());
    entity.setHrbpNo(req.hrbpNo());
    entity.setSscNo(req.sscNo());
    return entity;
  }

  private OrganizationEntity fromUpdateRequest(OrganizationUpdateRequest req) {
    OrganizationEntity patch = new OrganizationEntity();
    patch.setName(req.name());
    patch.setParentCode(req.parentCode());
    if (req.effectiveStartDate() != null && !req.effectiveStartDate().isBlank()) {
      patch.setEffectiveStartDate(LocalDate.parse(req.effectiveStartDate()));
    }
    patch.setStatus(req.status());
    patch.setLocation(req.location());
    patch.setLegalCompany(req.legalCompany());
    patch.setDepartmentType(req.departmentType());
    patch.setDepartmentLevel(req.departmentLevel());
    patch.setCostCenter(req.costCenter());
    patch.setOrgLeaderNo(req.orgLeaderNo());
    patch.setSupervisingLeaderNo(req.supervisingLeaderNo());
    patch.setOrgAttribute(req.orgAttribute());
    patch.setOrgFunction(req.orgFunction());
    patch.setOrgTags(req.orgTags());
    patch.setFinancialCode(req.financialCode());
    patch.setHrCoordinatorNo(req.hrCoordinatorNo());
    patch.setHrbpNo(req.hrbpNo());
    patch.setSscNo(req.sscNo());
    return patch;
  }

  private Map<String, Object> toLegalEntityDto(LegalEntityEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("creditCode", e.getCreditCode());
    dto.put("region", e.getRegion());
    dto.put("status", e.getStatus());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toCostCenterDto(CostCenterEntity e, String legalEntityName) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("legalEntityId", String.valueOf(e.getLegalEntityId()));
    dto.put("legalEntityName", legalEntityName);
    dto.put("status", e.getStatus());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toVersionDto(OrganizationEntity e, LocalDate today) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("effectiveStartDate", e.getEffectiveStartDate().toString());
    dto.put("effectiveEndDate", e.getEffectiveEndDate() == null ? null : e.getEffectiveEndDate().toString());
    dto.put("status", e.getStatus());
    dto.put("statusLabel", statusLabel(e.getStatus()));
    dto.put("isOpen", e.getEffectiveEndDate() == null);
    String temporal;
    String temporalLabel;
    if (e.getEffectiveEndDate() != null && e.getEffectiveEndDate().isBefore(today)) {
      temporal = "past";
      temporalLabel = "历史";
    } else if (e.getEffectiveStartDate().isAfter(today)) {
      temporal = "future";
      temporalLabel = "将来";
    } else {
      temporal = "present";
      temporalLabel = "当前";
    }
    dto.put("temporal", temporal);
    dto.put("temporalLabel", temporalLabel);
    return dto;
  }

  private Map<String, Object> toOrganizationDto(
      OrganizationEntity e,
      DictLabels labels,
      String parentName
  ) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("parentCode", e.getParentCode());
    dto.put("parentId", e.getParentId() == null ? null : String.valueOf(e.getParentId()));
    dto.put("parentName", parentName);
    dto.put("status", e.getStatus());
    dto.put("statusLabel", statusLabel(e.getStatus()));
    dto.put("effectiveStartDate", e.getEffectiveStartDate().toString());
    dto.put("effectiveEndDate", e.getEffectiveEndDate() == null ? null : e.getEffectiveEndDate().toString());
    dto.put("location", e.getLocation());
    dto.put("locationLabel", labelOf(labels.locations(), e.getLocation()));
    dto.put("legalCompany", e.getLegalCompany());
    dto.put("legalCompanyLabel", labelOf(labels.legalCompanies(), e.getLegalCompany()));
    dto.put("departmentType", e.getDepartmentType());
    dto.put("departmentTypeLabel", labelOf(labels.departmentTypes(), e.getDepartmentType()));
    dto.put("departmentLevel", e.getDepartmentLevel());
    dto.put("departmentLevelLabel", labelOf(labels.departmentLevels(), e.getDepartmentLevel()));
    dto.put("costCenter", e.getCostCenter());
    dto.put("orgLeaderNo", e.getOrgLeaderNo());
    dto.put("supervisingLeaderNo", e.getSupervisingLeaderNo());
    dto.put("orgAttribute", e.getOrgAttribute());
    dto.put("orgAttributeLabel", orgAttributeLabel(e.getOrgAttribute()));
    dto.put("orgFunction", e.getOrgFunction());
    dto.put("orgFunctionLabel", orgFunctionLabel(e.getOrgFunction()));
    dto.put("orgTags", e.getOrgTags());
    dto.put("financialCode", e.getFinancialCode());
    dto.put("hrCoordinatorNo", e.getHrCoordinatorNo());
    dto.put("hrbpNo", e.getHrbpNo());
    dto.put("sscNo", e.getSscNo());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private static String labelOf(Map<String, String> labels, String value) {
    if (value == null) return null;
    return labels.getOrDefault(value, value);
  }

  private Map<String, Object> toTreeNodeDto(
      OrganizationService.TreeNode node,
      DictLabels labels
  ) {
    OrganizationEntity e = node.entity();
    String parentName = resolveParentName(e.getParentCode(), e.getEffectiveStartDate());
    Map<String, Object> dto = toOrganizationDto(e, labels, parentName);
    dto.put("children", node.children().stream().map(c -> toTreeNodeDto(c, labels)).toList());
    return dto;
  }

  private PositionDictLabels loadPositionDictLabels() {
    return new PositionDictLabels(
        positionService.dictLabels("POSITION_CATEGORY"),
        positionService.dictLabels("POSITION_LEVEL"),
        positionService.dictLabels("IDENTITY_CATEGORY")
    );
  }

  private PositionEntity fromPositionCreateRequest(PositionCreateRequest req) {
    PositionEntity entity = new PositionEntity();
    entity.setName(req.name());
    entity.setEffectiveStartDate(LocalDate.parse(req.effectiveStartDate()));
    entity.setOrganizationId(req.organizationId());
    entity.setStatus(req.status());
    entity.setOccupationalDisease(req.occupationalDisease());
    entity.setPositionCategory(req.positionCategory());
    entity.setPositionKind(req.positionKind());
    entity.setPositionSequence(req.positionSequence());
    entity.setPositionLevel(req.positionLevel());
    entity.setKeyPosition(req.keyPosition());
    entity.setIdentityCategory(req.identityCategory());
    return entity;
  }

  private PositionEntity fromPositionUpdateRequest(PositionUpdateRequest req) {
    PositionEntity patch = new PositionEntity();
    patch.setName(req.name());
    if (req.effectiveStartDate() != null && !req.effectiveStartDate().isBlank()) {
      patch.setEffectiveStartDate(LocalDate.parse(req.effectiveStartDate()));
    }
    patch.setOrganizationId(req.organizationId());
    patch.setStatus(req.status());
    patch.setOccupationalDisease(req.occupationalDisease());
    patch.setPositionCategory(req.positionCategory());
    patch.setPositionKind(req.positionKind());
    patch.setPositionSequence(req.positionSequence());
    patch.setPositionLevel(req.positionLevel());
    patch.setKeyPosition(req.keyPosition());
    patch.setIdentityCategory(req.identityCategory());
    return patch;
  }

  private Map<String, Object> toPositionDto(
      PositionEntity e,
      String orgName,
      String orgCode,
      PositionDictLabels labels
  ) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("effectiveStartDate", e.getEffectiveStartDate() == null ? null : e.getEffectiveStartDate().toString());
    dto.put("effectiveEndDate", e.getEffectiveEndDate() == null ? null : e.getEffectiveEndDate().toString());
    dto.put("organizationId", String.valueOf(e.getOrganizationId()));
    dto.put("organizationName", orgName);
    dto.put("organizationCode", orgCode);
    dto.put("status", e.getStatus());
    dto.put("occupationalDisease", e.getOccupationalDisease() == null ? "NO" : e.getOccupationalDisease());
    dto.put("positionCategory", e.getPositionCategory());
    dto.put("positionCategoryLabel", labelOf(labels.positionCategories(), e.getPositionCategory()));
    dto.put("positionKind", e.getPositionKind());
    dto.put("positionSequence", e.getPositionSequence());
    dto.put("positionLevel", e.getPositionLevel());
    dto.put("positionLevelLabel", labelOf(labels.positionLevels(), e.getPositionLevel()));
    dto.put("keyPosition", e.getKeyPosition() == null ? "NO" : e.getKeyPosition());
    dto.put("identityCategory", e.getIdentityCategory());
    dto.put("identityCategoryLabel", labelOf(labels.identityCategories(), e.getIdentityCategory()));
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toPositionVersionDto(PositionEntity e, LocalDate today) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("effectiveStartDate", e.getEffectiveStartDate().toString());
    dto.put("effectiveEndDate", e.getEffectiveEndDate() == null ? null : e.getEffectiveEndDate().toString());
    dto.put("status", e.getStatus());
    dto.put("statusLabel", statusLabel(e.getStatus()));
    dto.put("isOpen", e.getEffectiveEndDate() == null);
    String temporal;
    String temporalLabel;
    if (e.getEffectiveEndDate() != null && e.getEffectiveEndDate().isBefore(today)) {
      temporal = "past";
      temporalLabel = "历史";
    } else if (e.getEffectiveStartDate().isAfter(today)) {
      temporal = "future";
      temporalLabel = "将来";
    } else {
      temporal = "present";
      temporalLabel = "当前";
    }
    dto.put("temporal", temporal);
    dto.put("temporalLabel", temporalLabel);
    return dto;
  }

  public record PositionDictLabels(
      Map<String, String> positionCategories,
      Map<String, String> positionLevels,
      Map<String, String> identityCategories
  ) {}

  public record LegalEntityCreateRequest(
      @NotBlank String code,
      @NotBlank String name,
      String creditCode,
      String region,
      String status
  ) {}

  public record LegalEntityUpdateRequest(String name, String creditCode, String region, String status) {}

  public record CostCenterCreateRequest(
      @NotBlank String code,
      @NotBlank String name,
      @NotNull Long legalEntityId,
      String status
  ) {}

  public record CostCenterUpdateRequest(String name, Long legalEntityId, String status) {}

  public record OrganizationCreateRequest(
      @NotBlank String name,
      String parentCode,
      @NotBlank String effectiveStartDate,
      String status,
      String location,
      String legalCompany,
      String departmentType,
      String departmentLevel,
      String costCenter,
      String orgLeaderNo,
      String supervisingLeaderNo,
      String orgAttribute,
      String orgFunction,
      String orgTags,
      String financialCode,
      String hrCoordinatorNo,
      String hrbpNo,
      String sscNo
  ) {}

  public record OrganizationUpdateRequest(
      String editMode,
      String name,
      String parentCode,
      String effectiveStartDate,
      String status,
      String location,
      String legalCompany,
      String departmentType,
      String departmentLevel,
      String costCenter,
      String orgLeaderNo,
      String supervisingLeaderNo,
      String orgAttribute,
      String orgFunction,
      String orgTags,
      String financialCode,
      String hrCoordinatorNo,
      String hrbpNo,
      String sscNo
  ) {}

  public record PositionCreateRequest(
      @NotBlank String name,
      @NotBlank String effectiveStartDate,
      @NotNull Long organizationId,
      String status,
      String occupationalDisease,
      String positionCategory,
      String positionKind,
      String positionSequence,
      String positionLevel,
      String keyPosition,
      String identityCategory
  ) {}

  public record PositionUpdateRequest(
      String editMode,
      String name,
      String effectiveStartDate,
      Long organizationId,
      String status,
      String occupationalDisease,
      String positionCategory,
      String positionKind,
      String positionSequence,
      String positionLevel,
      String keyPosition,
      String identityCategory
  ) {}
}
