package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeePerformanceRecordEntity;
import com.hrplatform.core.employee.EmployeePerformanceRecordMapper;
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
 * 绩效记录批管。业务键：同工号 + 年度 + 考核类型 + 绩效开始日期 → 更新，否则新建。
 */
@Component
public class PerformanceRecordArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "performance-records";

  private static final String DICT_ASSESSMENT_TYPE = "PERFORMANCE_ASSESSMENT_TYPE";
  private static final String DICT_VALUES_LEVEL = "PERFORMANCE_VALUES_LEVEL";
  private static final String DICT_PERFORMANCE_LEVEL = "PERFORMANCE_LEVEL";

  private static final String[] HEADERS = {
      "工号*", "年度*", "考核类型", "绩效开始日期", "绩效结束日期",
      "价值观等级", "绩效等级", "绩效得分", "价值观得分", "备注"
  };

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeePerformanceRecordMapper performanceRecordMapper;

  public PerformanceRecordArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeePerformanceRecordMapper performanceRecordMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.performanceRecordMapper = performanceRecordMapper;
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

    LambdaQueryWrapper<EmployeePerformanceRecordEntity> qw =
        new LambdaQueryWrapper<EmployeePerformanceRecordEntity>()
            .orderByDesc(EmployeePerformanceRecordEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeePerformanceRecordEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = performanceRecordMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeePerformanceRecordEntity> records = performanceRecordMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeePerformanceRecordEntity::getEmployeeId).toList()
    );
    Map<Long, String> orgNameMap = support.loadOrgNames(empMap.keySet());

    List<Map<String, Object>> items = records.stream()
        .map(row -> toRow(row, empMap.get(row.getEmployeeId()), orgNameMap))
        .toList();
    return new PageResult<>(items, total == null ? 0 : total);
  }

  @Override
  @Transactional
  public Map<String, Object> create(Map<String, Object> body, boolean revealSensitive) {
    EmployeeEntity employee = support.resolveEmployeeFromBody(body);
    EmployeePerformanceRecordEntity created =
        archiveService.createPerformanceRecord(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeePerformanceRecordEntity current = performanceRecordMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("绩效记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeePerformanceRecordEntity updated =
        archiveService.updatePerformanceRecord(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeePerformanceRecordEntity current = performanceRecordMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("绩效记录不存在");
    archiveService.deletePerformanceRecord(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("绩效记录");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 14 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("2025");
      sample.createCell(2).setCellValue(support.sampleDictLabel(DICT_ASSESSMENT_TYPE, ""));
      sample.createCell(3).setCellValue("2025-01-01");
      sample.createCell(4).setCellValue("2025-12-31");
      sample.createCell(5).setCellValue(support.sampleDictLabel(DICT_VALUES_LEVEL, ""));
      sample.createCell(6).setCellValue(support.sampleDictLabel(DICT_PERFORMANCE_LEVEL, ""));
      sample.createCell(7).setCellValue("A");
      sample.createCell(8).setCellValue("A");
      sample.createCell(9).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、年度*：必填");
      hint.createRow(2).createCell(0).setCellValue("考核类型/价值观等级/绩效等级：可填字典名称或编码");
      hint.createRow(3).createCell(0).setCellValue("业务键：同工号 + 年度 + 考核类型 + 绩效开始日期 → 更新，否则新建");
      hint.setColumnWidth(0, 86 * 256);

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
    Map<String, String> assessmentTypeLabels = support.employeeService().dictLabels(DICT_ASSESSMENT_TYPE);
    Map<String, String> valuesLevelLabels = support.employeeService().dictLabels(DICT_VALUES_LEVEL);
    Map<String, String> performanceLevelLabels = support.employeeService().dictLabels(DICT_PERFORMANCE_LEVEL);
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("绩效记录");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 14 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("year")));
        row.createCell(2).setCellValue(firstNonBlank(
            str(item.get("assessmentTypeLabel")),
            dictDisplayName(assessmentTypeLabels, str(item.get("assessmentType")))
        ));
        row.createCell(3).setCellValue(str(item.get("performanceStartDate")));
        row.createCell(4).setCellValue(str(item.get("performanceEndDate")));
        row.createCell(5).setCellValue(firstNonBlank(
            str(item.get("valuesLevelLabel")),
            dictDisplayName(valuesLevelLabels, str(item.get("valuesLevel")))
        ));
        row.createCell(6).setCellValue(firstNonBlank(
            str(item.get("performanceLevelLabel")),
            dictDisplayName(performanceLevelLabels, str(item.get("performanceLevel")))
        ));
        row.createCell(7).setCellValue(str(item.get("performanceScore")));
        row.createCell(8).setCellValue(str(item.get("valuesScore")));
        row.createCell(9).setCellValue(str(item.get("remark")));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private void upsertRow(Row row) {
    EmployeeEntity employee = support.requireByEmployeeNoForImport(support.cell(row, 0));
    String year = support.cell(row, 1);
    if (year.isBlank()) throw new RowImportException("年度", "年度不能为空");
    String assessmentType = support.resolveDictCode(
        DICT_ASSESSMENT_TYPE, blankToNull(support.cell(row, 2)), "考核类型"
    );
    LocalDate performanceStartDate = parseDate(support.cell(row, 3), "绩效开始日期");

    EmployeePerformanceRecordEntity entity = new EmployeePerformanceRecordEntity();
    entity.setYear(year.trim());
    entity.setAssessmentType(assessmentType);
    entity.setPerformanceStartDate(performanceStartDate);
    entity.setPerformanceEndDate(parseDate(support.cell(row, 4), "绩效结束日期"));
    entity.setValuesLevel(support.resolveDictCode(
        DICT_VALUES_LEVEL, blankToNull(support.cell(row, 5)), "价值观等级"
    ));
    entity.setPerformanceLevel(support.resolveDictCode(
        DICT_PERFORMANCE_LEVEL, blankToNull(support.cell(row, 6)), "绩效等级"
    ));
    entity.setPerformanceScore(blankToNull(support.cell(row, 7)));
    entity.setValuesScore(blankToNull(support.cell(row, 8)));
    entity.setRemark(blankToNull(support.cell(row, 9)));

    EmployeePerformanceRecordEntity existing = findExisting(
        employee.getId(), year.trim(), assessmentType, performanceStartDate
    );
    if (existing != null) {
      archiveService.updatePerformanceRecord(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createPerformanceRecord(employee.getId(), entity);
    }
  }

  private EmployeePerformanceRecordEntity findExisting(
      long employeeId,
      String year,
      String assessmentType,
      LocalDate performanceStartDate
  ) {
    LambdaQueryWrapper<EmployeePerformanceRecordEntity> qw =
        new LambdaQueryWrapper<EmployeePerformanceRecordEntity>()
            .eq(EmployeePerformanceRecordEntity::getEmployeeId, employeeId)
            .eq(EmployeePerformanceRecordEntity::getYear, year)
            .orderByDesc(EmployeePerformanceRecordEntity::getId)
            .last("LIMIT 1");
    if (assessmentType == null) {
      qw.and(w -> w.isNull(EmployeePerformanceRecordEntity::getAssessmentType));
    } else {
      qw.eq(EmployeePerformanceRecordEntity::getAssessmentType, assessmentType);
    }
    if (performanceStartDate == null) {
      qw.and(w -> w.isNull(EmployeePerformanceRecordEntity::getPerformanceStartDate));
    } else {
      qw.eq(EmployeePerformanceRecordEntity::getPerformanceStartDate, performanceStartDate);
    }
    return performanceRecordMapper.selectOne(qw);
  }

  private EmployeePerformanceRecordEntity mapEntity(Map<String, Object> body) {
    EmployeePerformanceRecordEntity entity = new EmployeePerformanceRecordEntity();
    String year = str(body.get("year"));
    if (year.isBlank()) throw new IllegalArgumentException("年度不能为空");
    entity.setYear(year.trim());
    entity.setAssessmentType(resolveDictCodeBody(DICT_ASSESSMENT_TYPE, body.get("assessmentType"), "考核类型"));
    entity.setPerformanceStartDate(parseOptionalDate(body.get("performanceStartDate"), "绩效开始日期"));
    entity.setPerformanceEndDate(parseOptionalDate(body.get("performanceEndDate"), "绩效结束日期"));
    entity.setValuesLevel(resolveDictCodeBody(DICT_VALUES_LEVEL, body.get("valuesLevel"), "价值观等级"));
    entity.setPerformanceLevel(resolveDictCodeBody(DICT_PERFORMANCE_LEVEL, body.get("performanceLevel"), "绩效等级"));
    entity.setPerformanceScore(blankToNull(str(body.get("performanceScore"))));
    entity.setValuesScore(blankToNull(str(body.get("valuesScore"))));
    entity.setRemark(blankToNull(str(body.get("remark"))));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeePerformanceRecordEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    support.putDictLabel(dto, "assessmentType", DICT_ASSESSMENT_TYPE, row.getAssessmentType());
    support.putDictLabel(dto, "valuesLevel", DICT_VALUES_LEVEL, row.getValuesLevel());
    support.putDictLabel(dto, "performanceLevel", DICT_PERFORMANCE_LEVEL, row.getPerformanceLevel());
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }

  private String resolveDictCodeBody(String typeCode, Object raw, String fieldLabel) {
    String v = blankToNull(str(raw));
    if (v == null) return null;
    try {
      return support.resolveDictCode(typeCode, v, fieldLabel);
    } catch (RowImportException e) {
      throw new IllegalArgumentException(e.getMessage());
    }
  }

  private static String firstNonBlank(String a, String b) {
    return a != null && !a.isBlank() ? a : (b == null ? "" : b);
  }
}
