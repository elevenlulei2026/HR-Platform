package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeTrainingRecordEntity;
import com.hrplatform.core.employee.EmployeeTrainingRecordMapper;
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
import java.math.BigDecimal;
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
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalDecimal;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 培训记录批管。业务键：同工号 + 课程名称 + 开始日期 → 更新，否则新建。
 */
@Component
public class TrainingRecordArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "training-records";

  private static final String DICT_ASSESSMENT_METHOD = "TRAINING_ASSESSMENT_METHOD";
  private static final String DICT_ASSESSMENT_RESULT = "TRAINING_ASSESSMENT_RESULT";
  private static final String DICT_TRAINING_FORM = "TRAINING_FORM";
  private static final String DICT_TRAINING_TYPE = "TRAINING_TYPE";

  private static final String[] HEADERS = {
      "工号*", "课程名称*", "开始日期", "结束日期", "时长(小时)",
      "考核方式", "考核结果", "评估反馈结果", "培训形式", "培训类型",
      "培训地点", "培训讲师", "培训费用(元)", "备注"
  };

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeTrainingRecordMapper trainingRecordMapper;

  public TrainingRecordArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeTrainingRecordMapper trainingRecordMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.trainingRecordMapper = trainingRecordMapper;
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

    LambdaQueryWrapper<EmployeeTrainingRecordEntity> qw =
        new LambdaQueryWrapper<EmployeeTrainingRecordEntity>()
            .orderByDesc(EmployeeTrainingRecordEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeTrainingRecordEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = trainingRecordMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeTrainingRecordEntity> records = trainingRecordMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeTrainingRecordEntity::getEmployeeId).toList()
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
    EmployeeTrainingRecordEntity created =
        archiveService.createTrainingRecord(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeTrainingRecordEntity current = trainingRecordMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("培训记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeTrainingRecordEntity updated =
        archiveService.updateTrainingRecord(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeTrainingRecordEntity current = trainingRecordMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("培训记录不存在");
    archiveService.deleteTrainingRecord(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("培训记录");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 14 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("新员工入职培训");
      sample.createCell(2).setCellValue("2026-01-10");
      sample.createCell(3).setCellValue("2026-01-10");
      sample.createCell(4).setCellValue("8");
      sample.createCell(5).setCellValue(support.sampleDictLabel(DICT_ASSESSMENT_METHOD, ""));
      sample.createCell(6).setCellValue(support.sampleDictLabel(DICT_ASSESSMENT_RESULT, ""));
      sample.createCell(7).setCellValue("");
      sample.createCell(8).setCellValue(support.sampleDictLabel(DICT_TRAINING_FORM, ""));
      sample.createCell(9).setCellValue(support.sampleDictLabel(DICT_TRAINING_TYPE, ""));
      sample.createCell(10).setCellValue("");
      sample.createCell(11).setCellValue("");
      sample.createCell(12).setCellValue("500");
      sample.createCell(13).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、课程名称*：必填");
      hint.createRow(2).createCell(0).setCellValue("考核方式/考核结果/培训形式/培训类型：可填字典名称或编码");
      hint.createRow(3).createCell(0).setCellValue("业务键：同工号 + 课程名称 + 开始日期 → 更新，否则新建");
      hint.setColumnWidth(0, 80 * 256);

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
    Map<String, String> methodLabels = support.employeeService().dictLabels(DICT_ASSESSMENT_METHOD);
    Map<String, String> resultLabels = support.employeeService().dictLabels(DICT_ASSESSMENT_RESULT);
    Map<String, String> formLabels = support.employeeService().dictLabels(DICT_TRAINING_FORM);
    Map<String, String> typeLabels = support.employeeService().dictLabels(DICT_TRAINING_TYPE);
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("培训记录");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 14 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("courseName")));
        row.createCell(2).setCellValue(str(item.get("startDate")));
        row.createCell(3).setCellValue(str(item.get("endDate")));
        row.createCell(4).setCellValue(str(item.get("hours")));
        row.createCell(5).setCellValue(firstNonBlank(
            str(item.get("assessmentMethodLabel")),
            dictDisplayName(methodLabels, str(item.get("assessmentMethod")))
        ));
        row.createCell(6).setCellValue(firstNonBlank(
            str(item.get("assessmentResultLabel")),
            dictDisplayName(resultLabels, str(item.get("assessmentResult")))
        ));
        row.createCell(7).setCellValue(str(item.get("feedbackResult")));
        row.createCell(8).setCellValue(firstNonBlank(
            str(item.get("trainingFormLabel")),
            dictDisplayName(formLabels, str(item.get("trainingForm")))
        ));
        row.createCell(9).setCellValue(firstNonBlank(
            str(item.get("trainingTypeLabel")),
            dictDisplayName(typeLabels, str(item.get("trainingType")))
        ));
        row.createCell(10).setCellValue(str(item.get("trainingLocation")));
        row.createCell(11).setCellValue(str(item.get("trainer")));
        row.createCell(12).setCellValue(str(item.get("trainingCost")));
        row.createCell(13).setCellValue(str(item.get("remark")));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private void upsertRow(Row row) {
    EmployeeEntity employee = support.requireByEmployeeNoForImport(support.cell(row, 0));
    String courseName = support.cell(row, 1);
    if (courseName.isBlank()) throw new RowImportException("课程名称", "课程名称不能为空");
    LocalDate startDate = parseDate(support.cell(row, 2), "开始日期");

    EmployeeTrainingRecordEntity entity = new EmployeeTrainingRecordEntity();
    entity.setCourseName(courseName.trim());
    entity.setStartDate(startDate);
    entity.setEndDate(parseDate(support.cell(row, 3), "结束日期"));
    entity.setHours(parseDecimal(support.cell(row, 4), "时长(小时)"));
    entity.setAssessmentMethod(support.resolveDictCode(
        DICT_ASSESSMENT_METHOD, blankToNull(support.cell(row, 5)), "考核方式"
    ));
    entity.setAssessmentResult(support.resolveDictCode(
        DICT_ASSESSMENT_RESULT, blankToNull(support.cell(row, 6)), "考核结果"
    ));
    entity.setFeedbackResult(blankToNull(support.cell(row, 7)));
    entity.setTrainingForm(support.resolveDictCode(
        DICT_TRAINING_FORM, blankToNull(support.cell(row, 8)), "培训形式"
    ));
    entity.setTrainingType(support.resolveDictCode(
        DICT_TRAINING_TYPE, blankToNull(support.cell(row, 9)), "培训类型"
    ));
    entity.setTrainingLocation(blankToNull(support.cell(row, 10)));
    entity.setTrainer(blankToNull(support.cell(row, 11)));
    entity.setTrainingCost(parseDecimal(support.cell(row, 12), "培训费用(元)"));
    entity.setRemark(blankToNull(support.cell(row, 13)));

    EmployeeTrainingRecordEntity existing = findExisting(employee.getId(), courseName.trim(), startDate);
    if (existing != null) {
      archiveService.updateTrainingRecord(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createTrainingRecord(employee.getId(), entity);
    }
  }

  private EmployeeTrainingRecordEntity findExisting(long employeeId, String courseName, LocalDate startDate) {
    LambdaQueryWrapper<EmployeeTrainingRecordEntity> qw =
        new LambdaQueryWrapper<EmployeeTrainingRecordEntity>()
            .eq(EmployeeTrainingRecordEntity::getEmployeeId, employeeId)
            .eq(EmployeeTrainingRecordEntity::getCourseName, courseName)
            .orderByDesc(EmployeeTrainingRecordEntity::getId)
            .last("LIMIT 1");
    if (startDate == null) {
      qw.and(w -> w.isNull(EmployeeTrainingRecordEntity::getStartDate));
    } else {
      qw.eq(EmployeeTrainingRecordEntity::getStartDate, startDate);
    }
    return trainingRecordMapper.selectOne(qw);
  }

  private EmployeeTrainingRecordEntity mapEntity(Map<String, Object> body) {
    EmployeeTrainingRecordEntity entity = new EmployeeTrainingRecordEntity();
    String courseName = str(body.get("courseName"));
    if (courseName.isBlank()) throw new IllegalArgumentException("课程名称不能为空");
    entity.setCourseName(courseName.trim());
    entity.setStartDate(parseOptionalDate(body.get("startDate"), "开始日期"));
    entity.setEndDate(parseOptionalDate(body.get("endDate"), "结束日期"));
    entity.setHours(parseOptionalDecimal(body.get("hours"), "时长(小时)"));
    entity.setAssessmentMethod(resolveDictCodeBody(DICT_ASSESSMENT_METHOD, body.get("assessmentMethod"), "考核方式"));
    entity.setAssessmentResult(resolveDictCodeBody(DICT_ASSESSMENT_RESULT, body.get("assessmentResult"), "考核结果"));
    entity.setFeedbackResult(blankToNull(str(body.get("feedbackResult"))));
    entity.setTrainingForm(resolveDictCodeBody(DICT_TRAINING_FORM, body.get("trainingForm"), "培训形式"));
    entity.setTrainingType(resolveDictCodeBody(DICT_TRAINING_TYPE, body.get("trainingType"), "培训类型"));
    entity.setTrainingLocation(blankToNull(str(body.get("trainingLocation"))));
    entity.setTrainer(blankToNull(str(body.get("trainer"))));
    entity.setTrainingCost(parseOptionalDecimal(body.get("trainingCost"), "培训费用(元)"));
    entity.setRemark(blankToNull(str(body.get("remark"))));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeTrainingRecordEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    support.putDictLabel(dto, "assessmentMethod", DICT_ASSESSMENT_METHOD, row.getAssessmentMethod());
    support.putDictLabel(dto, "assessmentResult", DICT_ASSESSMENT_RESULT, row.getAssessmentResult());
    support.putDictLabel(dto, "trainingForm", DICT_TRAINING_FORM, row.getTrainingForm());
    support.putDictLabel(dto, "trainingType", DICT_TRAINING_TYPE, row.getTrainingType());
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }

  private static BigDecimal parseDecimal(String raw, String field) {
    if (raw == null || raw.isBlank()) return null;
    try {
      return new BigDecimal(raw.trim());
    } catch (NumberFormatException e) {
      throw new RowImportException(field, "须为数字");
    }
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
