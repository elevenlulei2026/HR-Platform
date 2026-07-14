package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeAdminInfoEntity;
import com.hrplatform.core.employee.EmployeeAdminInfoMapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ExportFilter;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ImportResult;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ListFilter;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.PageResult;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.RowError;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.RowImportException;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.blankToNull;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.dictDisplayName;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 行政信息批管（版本化）。业务键：同工号 + 生效日期 → 更新当前版本，否则新建首条或新增生效版本。
 */
@Component
public class AdminInfoArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "admin-infos";

  private static final String[] HEADERS = {
      "工号*", "生效日期*", "状态", "工作环境*", "是否乘坐班车", "是否有停车证"
  };
  private static final String DICT_WORK_ENV = "WORK_ENVIRONMENT";

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeAdminInfoMapper adminInfoMapper;

  public AdminInfoArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeAdminInfoMapper adminInfoMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.adminInfoMapper = adminInfoMapper;
  }

  @Override
  public String path() {
    return PATH;
  }

  @Override
  public PageResult<Map<String, Object>> page(ListFilter filter) {
    Set<Long> employeeIds = support.resolveEmployeeIds(
        filter.keyword(), filter.employeeNo(), filter.organizationId()
    );
    if (employeeIds != null && employeeIds.isEmpty()) {
      return new PageResult<>(List.of(), 0);
    }

    LambdaQueryWrapper<EmployeeAdminInfoEntity> qw =
        new LambdaQueryWrapper<EmployeeAdminInfoEntity>()
            .orderByDesc(EmployeeAdminInfoEntity::getEffectiveStartDate)
            .orderByDesc(EmployeeAdminInfoEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeAdminInfoEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = adminInfoMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeAdminInfoEntity> records = adminInfoMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeAdminInfoEntity::getEmployeeId).toList()
    );
    Map<Long, String> orgNameMap = support.loadOrgNames(empMap.keySet());
    Map<String, String> envLabels = support.employeeService().dictLabels(DICT_WORK_ENV);

    List<Map<String, Object>> items = records.stream()
        .map(row -> toRow(row, empMap.get(row.getEmployeeId()), orgNameMap, envLabels))
        .toList();
    return new PageResult<>(items, total == null ? 0 : total);
  }

  @Override
  @Transactional
  public Map<String, Object> create(Map<String, Object> body, boolean revealSensitive) {
    EmployeeEntity employee = support.resolveEmployeeFromBody(body);
    EmployeeAdminInfoEntity patch = mapEntity(body);
    List<EmployeeAdminInfoEntity> existing = listByEmployee(employee.getId());
    EmployeeAdminInfoEntity saved;
    if (existing.isEmpty()) {
      saved = archiveService.createAdminInfo(employee.getId(), patch);
    } else {
      EmployeeAdminInfoEntity sameStart = findByStart(existing, patch.getEffectiveStartDate());
      if (sameStart != null) {
        patch.setEditMode("CURRENT");
        saved = archiveService.updateAdminInfo(employee.getId(), sameStart.getId(), patch);
      } else {
        EmployeeAdminInfoEntity base = pickBaseVersion(existing);
        patch.setEditMode("NEW_VERSION");
        saved = archiveService.updateAdminInfo(employee.getId(), base.getId(), patch);
      }
    }
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    Map<String, String> envLabels = support.employeeService().dictLabels(DICT_WORK_ENV);
    return toRow(saved, employee, orgNameMap, envLabels);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeAdminInfoEntity current = adminInfoMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("行政信息记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeAdminInfoEntity patch = mapEntity(body);
    if (patch.getEditMode() == null || patch.getEditMode().isBlank()) {
      patch.setEditMode("CURRENT");
    }
    EmployeeAdminInfoEntity updated =
        archiveService.updateAdminInfo(employee.getId(), id, patch);
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    Map<String, String> envLabels = support.employeeService().dictLabels(DICT_WORK_ENV);
    return toRow(updated, employee, orgNameMap, envLabels);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeAdminInfoEntity current = adminInfoMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("行政信息记录不存在");
    archiveService.deleteAdminInfo(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("行政信息");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 18 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("2024-01-01");
      sample.createCell(2).setCellValue("有效");
      sample.createCell(3).setCellValue(support.sampleDictLabel(DICT_WORK_ENV, ""));
      sample.createCell(4).setCellValue("否");
      sample.createCell(5).setCellValue("否");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、生效日期*、工作环境*：必填");
      hint.createRow(2).createCell(0).setCellValue("状态：有效/无效（或 ACTIVE/INACTIVE），默认有效");
      hint.createRow(3).createCell(0).setCellValue("是否乘坐班车 / 是否有停车证：是/否，默认否");
      hint.createRow(4).createCell(0).setCellValue(
          "业务键：同工号 + 生效日期 → 更新该版本；否则首条新建，已有记录则新增生效版本"
      );
      hint.createRow(5).createCell(0).setCellValue("失效日期由系统按版本链自动衔接，无需填写");
      hint.setColumnWidth(0, 90 * 256);

      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("生成导入模板失败", e);
    }
  }

  @Override
  @Transactional
  public ImportResult importExcel(MultipartFile file) {
    if (file == null || file.isEmpty()) throw new IllegalArgumentException("请上传 Excel 文件");

    List<RowError> errors = new ArrayList<>();
    int success = 0;
    int total = 0;

    try (InputStream in = file.getInputStream(); Workbook wb = new XSSFWorkbook(in)) {
      Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
      if (sheet == null) throw new IllegalArgumentException("Excel 无有效工作表");

      for (int i = 1; i <= sheet.getLastRowNum(); i++) {
        Row row = sheet.getRow(i);
        if (row == null || support.isBlankRow(row, HEADERS.length)) continue;
        total++;
        int rowNumber = i + 1;
        try {
          upsertRow(row);
          success++;
        } catch (RowImportException ex) {
          errors.add(new RowError(rowNumber, ex.field(), ex.getMessage()));
        } catch (Exception ex) {
          errors.add(new RowError(rowNumber, null, ex.getMessage() == null ? "导入失败" : ex.getMessage()));
        }
      }
    } catch (IllegalArgumentException e) {
      throw e;
    } catch (Exception e) {
      throw new IllegalStateException("解析 Excel 失败: " + e.getMessage(), e);
    }

    return new ImportResult(total, success, errors.size(), errors);
  }

  @Override
  public byte[] exportExcel(ExportFilter filter) {
    PageResult<Map<String, Object>> page = page(new ListFilter(
        filter.keyword(),
        filter.employeeNo(),
        filter.organizationId(),
        filter.revealSensitive(),
        1,
        10_000
    ));
    Map<String, String> envLabels = support.employeeService().dictLabels(DICT_WORK_ENV);
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("行政信息");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 18 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("effectiveStartDate")));
        row.createCell(2).setCellValue(statusLabel(str(item.get("status"))));
        String env = str(item.get("workEnvironmentLabel"));
        if (env.isBlank()) env = dictDisplayName(envLabels, str(item.get("workEnvironment")));
        row.createCell(3).setCellValue(env);
        row.createCell(4).setCellValue(yesNoLabel(str(item.get("takeShuttle"))));
        row.createCell(5).setCellValue(yesNoLabel(str(item.get("parkingPermit"))));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private void upsertRow(Row row) {
    EmployeeEntity employee = support.requireByEmployeeNoForImport(support.cell(row, 0));
    LocalDate start = parseDate(support.cell(row, 1), "生效日期");
    if (start == null) throw new RowImportException("生效日期", "生效日期不能为空");
    String workEnv = support.resolveDictCode(DICT_WORK_ENV, blankToNull(support.cell(row, 3)), "工作环境");
    if (workEnv == null || workEnv.isBlank()) {
      throw new RowImportException("工作环境", "工作环境不能为空");
    }

    EmployeeAdminInfoEntity entity = new EmployeeAdminInfoEntity();
    entity.setEffectiveStartDate(start);
    entity.setStatus(resolveStatus(blankToNull(support.cell(row, 2)), true));
    entity.setWorkEnvironment(workEnv);
    entity.setTakeShuttle(resolveYesNo(blankToNull(support.cell(row, 4)), "是否乘坐班车", true, "NO"));
    entity.setParkingPermit(resolveYesNo(blankToNull(support.cell(row, 5)), "是否有停车证", true, "NO"));

    List<EmployeeAdminInfoEntity> existing = listByEmployee(employee.getId());
    EmployeeAdminInfoEntity sameStart = findByStart(existing, start);
    if (sameStart != null) {
      entity.setEditMode("CURRENT");
      archiveService.updateAdminInfo(employee.getId(), sameStart.getId(), entity);
    } else if (existing.isEmpty()) {
      archiveService.createAdminInfo(employee.getId(), entity);
    } else {
      EmployeeAdminInfoEntity base = pickBaseVersion(existing);
      entity.setEditMode("NEW_VERSION");
      archiveService.updateAdminInfo(employee.getId(), base.getId(), entity);
    }
  }

  private List<EmployeeAdminInfoEntity> listByEmployee(long employeeId) {
    return adminInfoMapper.selectList(
        new LambdaQueryWrapper<EmployeeAdminInfoEntity>()
            .eq(EmployeeAdminInfoEntity::getEmployeeId, employeeId)
            .orderByDesc(EmployeeAdminInfoEntity::getEffectiveStartDate)
    );
  }

  private static EmployeeAdminInfoEntity findByStart(
      List<EmployeeAdminInfoEntity> existing,
      LocalDate start
  ) {
    if (start == null) return null;
    return existing.stream()
        .filter(v -> start.equals(v.getEffectiveStartDate()))
        .findFirst()
        .orElse(null);
  }

  private static EmployeeAdminInfoEntity pickBaseVersion(List<EmployeeAdminInfoEntity> existing) {
    LocalDate today = LocalDate.now();
    return existing.stream()
        .filter(v -> v.getEffectiveStartDate() != null && !v.getEffectiveStartDate().isAfter(today))
        .max(Comparator.comparing(EmployeeAdminInfoEntity::getEffectiveStartDate))
        .orElse(existing.get(0));
  }

  private EmployeeAdminInfoEntity mapEntity(Map<String, Object> body) {
    EmployeeAdminInfoEntity entity = new EmployeeAdminInfoEntity();
    LocalDate start = parseOptionalDate(body.get("effectiveStartDate"), "生效日期");
    if (start == null) throw new IllegalArgumentException("生效日期不能为空");
    entity.setEffectiveStartDate(start);
    entity.setStatus(resolveStatus(str(body.get("status")), false));
    String workEnv = blankToNull(str(body.get("workEnvironment")));
    if (workEnv == null) throw new IllegalArgumentException("工作环境不能为空");
    entity.setWorkEnvironment(workEnv);
    entity.setTakeShuttle(resolveYesNo(str(body.get("takeShuttle")), "是否乘坐班车", false, "NO"));
    entity.setParkingPermit(resolveYesNo(str(body.get("parkingPermit")), "是否有停车证", false, "NO"));
    String editMode = str(body.get("editMode"));
    if (!editMode.isBlank()) {
      entity.setEditMode(editMode.trim().toUpperCase());
    }
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeAdminInfoEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap,
      Map<String, String> envLabels
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    dto.put("statusLabel", statusLabel(row.getStatus()));
    dto.put("workEnvironmentLabel", dictDisplayName(envLabels, row.getWorkEnvironment()));
    dto.put("takeShuttleLabel", yesNoLabel(row.getTakeShuttle()));
    dto.put("parkingPermitLabel", yesNoLabel(row.getParkingPermit()));
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }

  private static String resolveStatus(String raw, boolean forImport) {
    if (raw == null || raw.isBlank()) return "ACTIVE";
    String v = raw.trim();
    if (Set.of("ACTIVE", "有效", "启用").contains(v) || "active".equalsIgnoreCase(v)) return "ACTIVE";
    if (Set.of("INACTIVE", "无效", "停用").contains(v) || "inactive".equalsIgnoreCase(v)) return "INACTIVE";
    if (forImport) throw new RowImportException("状态", "须为 有效/无效 或 ACTIVE/INACTIVE");
    throw new IllegalArgumentException("状态须为 ACTIVE/INACTIVE 或 有效/无效");
  }

  private static String resolveYesNo(String raw, String label, boolean forImport, String defaultValue) {
    if (raw == null || raw.isBlank()) return defaultValue;
    String v = raw.trim();
    if (Set.of("YES", "是", "Y", "1", "true", "TRUE").contains(v) || "yes".equalsIgnoreCase(v)) {
      return "YES";
    }
    if (Set.of("NO", "否", "N", "0", "false", "FALSE").contains(v) || "no".equalsIgnoreCase(v)) {
      return "NO";
    }
    if (forImport) throw new RowImportException(label, "须为 是/否 或 YES/NO");
    throw new IllegalArgumentException(label + "须为 YES/NO 或 是/否");
  }

  private static String statusLabel(String status) {
    if (status == null || status.isBlank()) return "";
    if ("ACTIVE".equalsIgnoreCase(status) || "有效".equals(status)) return "有效";
    if ("INACTIVE".equalsIgnoreCase(status) || "无效".equals(status)) return "无效";
    return status;
  }

  private static String yesNoLabel(String value) {
    if (value == null || value.isBlank()) return "";
    if ("YES".equalsIgnoreCase(value) || "是".equals(value)) return "是";
    if ("NO".equalsIgnoreCase(value) || "否".equals(value)) return "否";
    return value;
  }
}
