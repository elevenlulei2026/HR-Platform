package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeAssignmentEntity;
import com.hrplatform.core.employee.EmployeeAssignmentMapper;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeInternalRelativeEntity;
import com.hrplatform.core.employee.EmployeeMapper;
import com.hrplatform.core.employee.EmployeeMovementEntity;
import com.hrplatform.core.employee.EmployeeMovementMapper;
import com.hrplatform.core.employee.EmployeeService;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.RowImportException;
import com.hrplatform.core.organization.LegalEntityEntity;
import com.hrplatform.core.organization.LegalEntityMapper;
import com.hrplatform.core.organization.OrganizationMapper;
import com.hrplatform.core.organization.PositionEntity;
import com.hrplatform.core.organization.PositionMapper;
import com.hrplatform.platform.parentchild.ParentChildCatalogService;
import com.hrplatform.platform.parentchild.ParentChildItemEntity;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 档案批管共享能力：员工解析、部门名、字典翻译、Excel 读写辅助。
 * 业务规则（创建/更新校验）仍须走 {@link com.hrplatform.core.employee.EmployeeArchiveService}。
 */
@Component
public class ArchiveDataSupport {
  private final EmployeeService employeeService;
  private final EmployeeMapper employeeMapper;
  private final EmployeeAssignmentMapper assignmentMapper;
  private final EmployeeMovementMapper movementMapper;
  private final OrganizationMapper organizationMapper;
  private final PositionMapper positionMapper;
  private final LegalEntityMapper legalEntityMapper;
  private final ParentChildCatalogService parentChildCatalogService;
  private final DataFormatter dataFormatter = new DataFormatter();

  public ArchiveDataSupport(
      EmployeeService employeeService,
      EmployeeMapper employeeMapper,
      EmployeeAssignmentMapper assignmentMapper,
      EmployeeMovementMapper movementMapper,
      OrganizationMapper organizationMapper,
      PositionMapper positionMapper,
      LegalEntityMapper legalEntityMapper,
      ParentChildCatalogService parentChildCatalogService
  ) {
    this.employeeService = employeeService;
    this.employeeMapper = employeeMapper;
    this.assignmentMapper = assignmentMapper;
    this.movementMapper = movementMapper;
    this.organizationMapper = organizationMapper;
    this.positionMapper = positionMapper;
    this.legalEntityMapper = legalEntityMapper;
    this.parentChildCatalogService = parentChildCatalogService;
  }

  public EmployeeService employeeService() {
    return employeeService;
  }

  public EmployeeEntity resolveEmployeeFromBody(Map<String, Object> body) {
    Object idObj = body.get("employeeId");
    Object noObj = body.get("employeeNo");
    if (idObj != null && !str(idObj).isBlank()) {
      return employeeService.require(Long.parseLong(str(idObj)));
    }
    if (noObj != null && !str(noObj).isBlank()) {
      return requireByEmployeeNo(str(noObj).trim());
    }
    throw new IllegalArgumentException("须指定 employeeId 或 employeeNo");
  }

  public EmployeeEntity requireByEmployeeNo(String employeeNo) {
    EmployeeEntity e = employeeMapper.selectOne(
        new LambdaQueryWrapper<EmployeeEntity>().eq(EmployeeEntity::getEmployeeNo, employeeNo)
    );
    if (e == null) throw new IllegalArgumentException("员工不存在: " + employeeNo);
    return e;
  }

  public EmployeeEntity requireByEmployeeNoForImport(String employeeNo) {
    if (employeeNo == null || employeeNo.isBlank()) {
      throw new RowImportException("工号", "工号不能为空");
    }
    EmployeeEntity e = employeeMapper.selectOne(
        new LambdaQueryWrapper<EmployeeEntity>().eq(EmployeeEntity::getEmployeeNo, employeeNo.trim())
    );
    if (e == null) throw new RowImportException("工号", "员工不存在: " + employeeNo.trim());
    return e;
  }

  /**
   * @return null 表示不过滤员工；空集合表示无匹配
   */
  public Set<Long> resolveEmployeeIds(String keyword, String employeeNo, Long organizationId) {
    Set<Long> filter = null;

    if (employeeNo != null && !employeeNo.isBlank()) {
      List<Long> ids = employeeMapper.selectList(
          new LambdaQueryWrapper<EmployeeEntity>().eq(EmployeeEntity::getEmployeeNo, employeeNo.trim())
      ).stream().map(EmployeeEntity::getId).toList();
      filter = new HashSet<>(ids);
      if (filter.isEmpty()) return filter;
    }

    if (keyword != null && !keyword.isBlank()) {
      String kw = keyword.trim();
      List<Long> ids = employeeMapper.selectList(
          new LambdaQueryWrapper<EmployeeEntity>()
              .and(w -> w.like(EmployeeEntity::getFullName, kw).or().like(EmployeeEntity::getEmployeeNo, kw))
      ).stream().map(EmployeeEntity::getId).toList();
      if (ids.isEmpty()) return Set.of();
      if (filter == null) filter = new HashSet<>(ids);
      else {
        filter.retainAll(ids);
        if (filter.isEmpty()) return filter;
      }
    }

    if (organizationId != null) {
      List<Long> orgIds = organizationMapper.selectOrgSubtreeIds(organizationId);
      if (orgIds == null || orgIds.isEmpty()) return Set.of();
      LocalDate asOf = LocalDate.now();
      List<Long> assignmentEmpIds = assignmentMapper.selectList(
          new LambdaQueryWrapper<EmployeeAssignmentEntity>()
              .in(EmployeeAssignmentEntity::getOrganizationId, orgIds)
              .le(EmployeeAssignmentEntity::getEffectiveStartDate, asOf)
              .and(w -> w.isNull(EmployeeAssignmentEntity::getEffectiveEndDate)
                  .or().ge(EmployeeAssignmentEntity::getEffectiveEndDate, asOf))
      ).stream().map(EmployeeAssignmentEntity::getEmployeeId).distinct().toList();
      if (assignmentEmpIds.isEmpty()) return Set.of();
      if (filter == null) filter = new HashSet<>(assignmentEmpIds);
      else filter.retainAll(assignmentEmpIds);
    }

    return filter;
  }

  public Map<Long, EmployeeEntity> loadEmployees(List<Long> ids) {
    if (ids == null || ids.isEmpty()) return Map.of();
    List<Long> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
    if (distinct.isEmpty()) return Map.of();
    return employeeMapper.selectBatchIds(distinct).stream()
        .collect(Collectors.toMap(EmployeeEntity::getId, e -> e, (a, b) -> a));
  }

  public Map<Long, String> loadOrgNames(Set<Long> employeeIds) {
    if (employeeIds == null || employeeIds.isEmpty()) return Map.of();
    LocalDate asOf = LocalDate.now();
    List<EmployeeAssignmentEntity> assignments = assignmentMapper.selectList(
        new LambdaQueryWrapper<EmployeeAssignmentEntity>()
            .in(EmployeeAssignmentEntity::getEmployeeId, employeeIds)
            .le(EmployeeAssignmentEntity::getEffectiveStartDate, asOf)
            .and(w -> w.isNull(EmployeeAssignmentEntity::getEffectiveEndDate)
                .or().ge(EmployeeAssignmentEntity::getEffectiveEndDate, asOf))
            .orderByDesc(EmployeeAssignmentEntity::getIsPrimary)
            .orderByDesc(EmployeeAssignmentEntity::getEffectiveStartDate)
    );
    Map<Long, Long> empOrgIds = new HashMap<>();
    for (EmployeeAssignmentEntity a : assignments) {
      empOrgIds.putIfAbsent(a.getEmployeeId(), a.getOrganizationId());
    }
    if (empOrgIds.isEmpty()) return Map.of();
    Set<Long> orgIds = empOrgIds.values().stream().filter(Objects::nonNull).collect(Collectors.toSet());
    if (orgIds.isEmpty()) return Map.of();
    Map<Long, String> orgNames = organizationMapper.selectBatchIds(orgIds).stream()
        .collect(Collectors.toMap(o -> o.getId(), o -> o.getName() == null ? "" : o.getName(), (a, b) -> a));
    Map<Long, String> out = new HashMap<>();
    for (Map.Entry<Long, Long> e : empOrgIds.entrySet()) {
      out.put(e.getKey(), orgNames.getOrDefault(e.getValue(), ""));
    }
    return out;
  }

  public void attachEmployeeDisplay(
      Map<String, Object> dto,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    if (employee != null) {
      dto.put("employeeNo", employee.getEmployeeNo());
      dto.put("employeeName", employee.getFullName());
      dto.put("organizationName", orgNameMap.get(employee.getId()));
    } else {
      dto.put("employeeNo", "");
      dto.put("employeeName", "");
    }
  }

  /**
   * 按关联员工当前任职填充内部亲属快照字段（与档案 Sheet 前端逻辑对齐）。
   */
  public void fillInternalRelativeSnapshot(EmployeeInternalRelativeEntity entity, EmployeeEntity relative) {
    if (relative == null) return;
    entity.setRelativeEmployeeId(relative.getId());
    entity.setHireDate(relative.getHireDate());
    entity.setEmploymentStatus(relative.getStatus());

    LocalDate asOf = LocalDate.now();
    List<EmployeeAssignmentEntity> assignments = assignmentMapper.selectList(
        new LambdaQueryWrapper<EmployeeAssignmentEntity>()
            .eq(EmployeeAssignmentEntity::getEmployeeId, relative.getId())
            .le(EmployeeAssignmentEntity::getEffectiveStartDate, asOf)
            .and(w -> w.isNull(EmployeeAssignmentEntity::getEffectiveEndDate)
                .or().ge(EmployeeAssignmentEntity::getEffectiveEndDate, asOf))
            .orderByDesc(EmployeeAssignmentEntity::getIsPrimary)
            .orderByDesc(EmployeeAssignmentEntity::getEffectiveStartDate)
    );
    EmployeeAssignmentEntity primary = assignments.isEmpty() ? null : assignments.get(0);
    if (primary != null) {
      String dept = primary.getDepartmentName();
      if ((dept == null || dept.isBlank()) && primary.getOrganizationId() != null) {
        var org = organizationMapper.selectById(primary.getOrganizationId());
        dept = org == null ? null : org.getName();
      }
      entity.setDepartmentName(dept);
      String positionName = null;
      if (primary.getPositionId() != null) {
        PositionEntity position = positionMapper.selectById(primary.getPositionId());
        positionName = position == null ? null : position.getName();
      }
      entity.setPositionName(positionName);
      entity.setJobGradeName(primary.getJobGradeCode());
    } else {
      entity.setDepartmentName(null);
      entity.setPositionName(null);
      entity.setJobGradeName(null);
    }

    if ("TERMINATED".equals(relative.getStatus())) {
      EmployeeMovementEntity ter = movementMapper.selectOne(
          new LambdaQueryWrapper<EmployeeMovementEntity>()
              .eq(EmployeeMovementEntity::getEmployeeId, relative.getId())
              .eq(EmployeeMovementEntity::getMovementType, "TER")
              .orderByDesc(EmployeeMovementEntity::getEffectiveDate)
              .last("LIMIT 1")
      );
      entity.setLastWorkDay(ter == null ? null : ter.getEffectiveDate());
    } else {
      entity.setLastWorkDay(null);
    }
  }

  public void putDictLabel(Map<String, Object> dto, String field, String dictType, String value) {
    dto.put(field + "Label", employeeService.dictLabel(dictType, value));
  }

  public Long resolveLegalEntityId(String raw, String fieldLabel, boolean required) {
    if (raw == null || raw.isBlank()) {
      if (required) throw new RowImportException(fieldLabel, fieldLabel + "不能为空");
      return null;
    }
    String input = raw.trim();
    try {
      Long id = Long.parseLong(input);
      LegalEntityEntity byId = legalEntityMapper.selectById(id);
      if (byId != null) return byId.getId();
    } catch (NumberFormatException ignored) {
      // 继续按编码/名称匹配
    }
    LegalEntityEntity byCode = legalEntityMapper.selectOne(
        new LambdaQueryWrapper<LegalEntityEntity>().eq(LegalEntityEntity::getCode, input)
    );
    if (byCode != null) return byCode.getId();
    List<LegalEntityEntity> byName = legalEntityMapper.selectList(
        new LambdaQueryWrapper<LegalEntityEntity>().eq(LegalEntityEntity::getName, input)
    );
    if (byName.size() == 1) return byName.get(0).getId();
    if (byName.size() > 1) {
      throw new RowImportException(fieldLabel, "法人名称重复，请改填法人编码: " + input);
    }
    throw new RowImportException(fieldLabel, "无法识别的法人: " + input);
  }

  public Long resolveLegalEntityIdFromBody(Object raw) {
    String s = str(raw);
    if (s.isBlank()) return null;
    try {
      return resolveLegalEntityId(s, "法人主体", false);
    } catch (RowImportException e) {
      throw new IllegalArgumentException(e.getMessage());
    }
  }

  public void attachLegalEntityDisplay(Map<String, Object> dto, Long legalEntityId) {
    if (legalEntityId == null) return;
    LegalEntityEntity entity = legalEntityMapper.selectById(legalEntityId);
    if (entity == null) return;
    dto.put("legalEntityId", String.valueOf(entity.getId()));
    dto.put("legalEntityCode", entity.getCode());
    dto.put("legalEntityName", entity.getName());
  }

  public String legalEntityDisplayName(Long legalEntityId) {
    if (legalEntityId == null) return "";
    LegalEntityEntity entity = legalEntityMapper.selectById(legalEntityId);
    if (entity == null) return String.valueOf(legalEntityId);
    if (entity.getName() != null && !entity.getName().isBlank()) return entity.getName();
    return entity.getCode() == null ? String.valueOf(legalEntityId) : entity.getCode();
  }

  /**
   * 解析父子值编码；parentCode 为空表示解析一级；非空表示在该父项下解析二级。
   */
  public String resolveParentChildCode(
      String typeCode,
      String raw,
      String parentCode,
      String fieldLabel
  ) {
    if (raw == null || raw.isBlank()) return null;
    String input = raw.trim();
    List<ParentChildItemEntity> candidates;
    if (parentCode == null) {
      candidates = parentChildCatalogService.listParents(typeCode);
    } else {
      candidates = parentChildCatalogService.listChildren(typeCode, parentCode);
    }
    for (ParentChildItemEntity item : candidates) {
      if (input.equals(item.getCode())) return item.getCode();
    }
    for (ParentChildItemEntity item : candidates) {
      if (input.equals(item.getName())) return item.getCode();
    }
    throw new RowImportException(fieldLabel, "无法识别的父子值: " + input);
  }

  public String parentChildDisplayName(String typeCode, String code) {
    if (code == null || code.isBlank()) return "";
    try {
      ParentChildItemEntity item = parentChildCatalogService.requireItemByCode(typeCode, code);
      return item.getName() == null || item.getName().isBlank() ? code : item.getName();
    } catch (Exception e) {
      return code;
    }
  }

  /** 指定父项下是否存在二级子项（用于「无子项则级别非必填」）。 */
  public boolean hasParentChildChildren(String typeCode, String parentCode) {
    if (typeCode == null || typeCode.isBlank() || parentCode == null || parentCode.isBlank()) {
      return false;
    }
    return !parentChildCatalogService.listChildren(typeCode, parentCode).isEmpty();
  }

  /**
   * 解析可选二级父子值：空白时若该父项有子项则报错；无子项则返回 null。
   */
  public String resolveOptionalParentChildChildCode(
      String typeCode,
      String raw,
      String parentCode,
      String fieldLabel
  ) {
    if (parentCode == null || parentCode.isBlank()) return null;
    boolean hasChildren = hasParentChildChildren(typeCode, parentCode);
    if (raw == null || raw.isBlank()) {
      if (hasChildren) throw new RowImportException(fieldLabel, fieldLabel + "不能为空");
      return null;
    }
    if (!hasChildren) {
      throw new RowImportException(fieldLabel, "该类型无二级选项，请留空");
    }
    return resolveParentChildCode(typeCode, raw, parentCode, fieldLabel);
  }

  public static String resolveValidityStatus(String raw, String fieldLabel) {
    if (raw == null || raw.isBlank()) return null;
    String v = raw.trim();
    if (Set.of("VALID", "有效", "Y", "1").contains(v) || "valid".equalsIgnoreCase(v)) return "VALID";
    if (Set.of("INVALID", "无效", "N", "0").contains(v) || "invalid".equalsIgnoreCase(v)) return "INVALID";
    throw new RowImportException(fieldLabel, "须为 有效/无效 或 VALID/INVALID");
  }

  public static String validityStatusLabel(String status) {
    if (status == null || status.isBlank()) return "";
    String s = status.trim();
    if ("VALID".equalsIgnoreCase(s) || "有效".equals(s)) return "有效";
    if ("INVALID".equalsIgnoreCase(s) || "无效".equals(s)) return "无效";
    return s;
  }

  public static BigDecimal parseOptionalDecimal(Object raw, String field) {
    String s = str(raw);
    if (s.isBlank()) return null;
    try {
      return new BigDecimal(s);
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException(field + "须为数字");
    }
  }

  public static BigDecimal parseDecimal(String raw, String field) {
    if (raw == null || raw.isBlank()) return null;
    try {
      return new BigDecimal(raw.trim());
    } catch (NumberFormatException e) {
      throw new RowImportException(field, "须为数字");
    }
  }

  public static Long parseOptionalLong(Object raw, String field) {
    String s = str(raw);
    if (s.isBlank()) return null;
    try {
      return Long.parseLong(s);
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException(field + "须为整数");
    }
  }

  public String cell(Row row, int idx) {
    Cell cell = row.getCell(idx);
    if (cell == null) return "";
    return dataFormatter.formatCellValue(cell).trim();
  }

  public boolean isBlankRow(Row row, int columnCount) {
    for (int i = 0; i < columnCount; i++) {
      if (!cell(row, i).isBlank()) return false;
    }
    return true;
  }

  public static String str(Object v) {
    return v == null ? "" : String.valueOf(v).trim();
  }

  public static String blankToNull(String v) {
    return v == null || v.isBlank() ? null : v.trim();
  }

  public static String dictDisplayName(Map<String, String> valueToLabel, String code) {
    if (code == null || code.isBlank()) return "";
    String label = valueToLabel.get(code);
    return label == null || label.isBlank() ? code : label;
  }

  public String sampleDictLabel(String typeCode, String fallbackCode) {
    String label = employeeService.dictLabel(typeCode, fallbackCode);
    return label == null || label.isBlank() ? fallbackCode : label;
  }

  public String resolveDictCode(String typeCode, String raw, String fieldLabel) {
    if (raw == null || raw.isBlank()) return null;
    String input = raw.trim();
    Map<String, String> valueToLabel = employeeService.dictLabels(typeCode);
    if (valueToLabel.containsKey(input)) return input;
    for (Map.Entry<String, String> e : valueToLabel.entrySet()) {
      if (input.equals(e.getValue())) return e.getKey();
    }
    throw new RowImportException(fieldLabel, "无法识别的字典值: " + input);
  }

  public static LocalDate parseDate(String raw, String field) {
    if (raw == null || raw.isBlank()) return null;
    try {
      return LocalDate.parse(raw.trim());
    } catch (DateTimeParseException e) {
      throw new RowImportException(field, "日期格式须为 YYYY-MM-DD");
    }
  }

  public static LocalDate parseOptionalDate(Object raw, String field) {
    String s = str(raw);
    if (s.isBlank()) return null;
    try {
      return LocalDate.parse(s);
    } catch (DateTimeParseException e) {
      throw new IllegalArgumentException(field + "日期格式须为 YYYY-MM-DD");
    }
  }

  public static Boolean parseYesNo(String raw, String fieldLabel) {
    if (raw == null || raw.isBlank()) return null;
    String v = raw.trim().toLowerCase();
    if (Set.of("是", "true", "1", "yes", "y").contains(v)) return Boolean.TRUE;
    if (Set.of("否", "false", "0", "no", "n").contains(v)) return Boolean.FALSE;
    throw new RowImportException(fieldLabel, "须为 是/否 或 true/false");
  }

  public static byte[] buildErrorReportExcel(List<ArchiveDataModels.RowError> errors) {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("导入错误报告");
      Row header = sheet.createRow(0);
      header.createCell(0).setCellValue("行号");
      header.createCell(1).setCellValue("字段");
      header.createCell(2).setCellValue("错误信息");
      sheet.setColumnWidth(0, 12 * 256);
      sheet.setColumnWidth(1, 24 * 256);
      sheet.setColumnWidth(2, 60 * 256);
      int rowIdx = 1;
      for (ArchiveDataModels.RowError error : errors) {
        Row row = sheet.createRow(rowIdx++);
        row.createCell(0).setCellValue(error.rowNumber());
        row.createCell(1).setCellValue(error.field() == null ? "" : error.field());
        row.createCell(2).setCellValue(error.message() == null ? "" : error.message());
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("生成错误报告失败", e);
    }
  }
}
