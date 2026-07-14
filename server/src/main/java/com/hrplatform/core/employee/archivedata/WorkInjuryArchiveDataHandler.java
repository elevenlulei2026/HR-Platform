package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeWorkInjuryEntity;
import com.hrplatform.core.employee.EmployeeWorkInjuryMapper;
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
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 工伤信息批管。业务键：同工号 + 事故发生日期 → 更新，否则新建。
 */
@Component
public class WorkInjuryArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "work-injuries";

  private static final String[] HEADERS = {
      "工号*", "事故发生日期", "事故原因", "见证人", "工伤认定日期", "伤残鉴定日期",
      "是否认定为工伤", "是否参加劳动力鉴定", "劳动力鉴定级别", "备注"
  };

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeWorkInjuryMapper workInjuryMapper;

  public WorkInjuryArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeWorkInjuryMapper workInjuryMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.workInjuryMapper = workInjuryMapper;
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

    LambdaQueryWrapper<EmployeeWorkInjuryEntity> qw =
        new LambdaQueryWrapper<EmployeeWorkInjuryEntity>()
            .orderByDesc(EmployeeWorkInjuryEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeWorkInjuryEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = workInjuryMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeWorkInjuryEntity> records = workInjuryMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeWorkInjuryEntity::getEmployeeId).toList()
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
    EmployeeWorkInjuryEntity created =
        archiveService.createWorkInjury(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeWorkInjuryEntity current = workInjuryMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("工伤信息记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeWorkInjuryEntity updated =
        archiveService.updateWorkInjury(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeWorkInjuryEntity current = workInjuryMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("工伤信息记录不存在");
    archiveService.deleteWorkInjury(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("工伤信息");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 18 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("2024-06-01");
      sample.createCell(2).setCellValue("示例事故原因");
      sample.createCell(3).setCellValue("李四");
      sample.createCell(4).setCellValue("2024-07-01");
      sample.createCell(5).setCellValue("");
      sample.createCell(6).setCellValue("是");
      sample.createCell(7).setCellValue("否");
      sample.createCell(8).setCellValue("");
      sample.createCell(9).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*：必填");
      hint.createRow(2).createCell(0).setCellValue("是否认定为工伤 / 是否参加劳动力鉴定：是/否（或 YES/NO），可空");
      hint.createRow(3).createCell(0).setCellValue("业务键：同工号 + 事故发生日期 → 更新，否则新建");
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
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("工伤信息");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 18 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("accidentDate")));
        row.createCell(2).setCellValue(str(item.get("accidentReason")));
        row.createCell(3).setCellValue(str(item.get("witness")));
        row.createCell(4).setCellValue(str(item.get("recognitionDate")));
        row.createCell(5).setCellValue(str(item.get("disabilityAssessmentDate")));
        row.createCell(6).setCellValue(yesNoLabel(str(item.get("isRecognized"))));
        row.createCell(7).setCellValue(yesNoLabel(str(item.get("participatedLaborAssessment"))));
        row.createCell(8).setCellValue(str(item.get("laborAssessmentLevel")));
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
    LocalDate accidentDate = parseDate(support.cell(row, 1), "事故发生日期");

    EmployeeWorkInjuryEntity entity = new EmployeeWorkInjuryEntity();
    entity.setAccidentDate(accidentDate);
    entity.setAccidentReason(blankToNull(support.cell(row, 2)));
    entity.setWitness(blankToNull(support.cell(row, 3)));
    entity.setRecognitionDate(parseDate(support.cell(row, 4), "工伤认定日期"));
    entity.setDisabilityAssessmentDate(parseDate(support.cell(row, 5), "伤残鉴定日期"));
    entity.setIsRecognized(resolveYesNoOptional(support.cell(row, 6), "是否认定为工伤"));
    entity.setParticipatedLaborAssessment(resolveYesNoOptional(support.cell(row, 7), "是否参加劳动力鉴定"));
    entity.setLaborAssessmentLevel(blankToNull(support.cell(row, 8)));
    entity.setRemark(blankToNull(support.cell(row, 9)));

    EmployeeWorkInjuryEntity existing = findExisting(employee.getId(), accidentDate);
    if (existing != null) {
      archiveService.updateWorkInjury(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createWorkInjury(employee.getId(), entity);
    }
  }

  private EmployeeWorkInjuryEntity findExisting(long employeeId, LocalDate accidentDate) {
    LambdaQueryWrapper<EmployeeWorkInjuryEntity> qw =
        new LambdaQueryWrapper<EmployeeWorkInjuryEntity>()
            .eq(EmployeeWorkInjuryEntity::getEmployeeId, employeeId)
            .orderByDesc(EmployeeWorkInjuryEntity::getId)
            .last("LIMIT 1");
    if (accidentDate == null) {
      qw.and(w -> w.isNull(EmployeeWorkInjuryEntity::getAccidentDate));
    } else {
      qw.eq(EmployeeWorkInjuryEntity::getAccidentDate, accidentDate);
    }
    return workInjuryMapper.selectOne(qw);
  }

  private EmployeeWorkInjuryEntity mapEntity(Map<String, Object> body) {
    EmployeeWorkInjuryEntity entity = new EmployeeWorkInjuryEntity();
    entity.setAccidentDate(parseOptionalDate(body.get("accidentDate"), "事故发生日期"));
    entity.setAccidentReason(blankToNull(str(body.get("accidentReason"))));
    entity.setWitness(blankToNull(str(body.get("witness"))));
    entity.setRecognitionDate(parseOptionalDate(body.get("recognitionDate"), "工伤认定日期"));
    entity.setDisabilityAssessmentDate(
        parseOptionalDate(body.get("disabilityAssessmentDate"), "伤残鉴定日期")
    );
    entity.setIsRecognized(resolveYesNoOptional(str(body.get("isRecognized")), "是否认定为工伤"));
    entity.setParticipatedLaborAssessment(
        resolveYesNoOptional(str(body.get("participatedLaborAssessment")), "是否参加劳动力鉴定")
    );
    entity.setLaborAssessmentLevel(blankToNull(str(body.get("laborAssessmentLevel"))));
    entity.setRemark(blankToNull(str(body.get("remark"))));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeWorkInjuryEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    dto.put("isRecognizedLabel", yesNoLabel(row.getIsRecognized()));
    dto.put("participatedLaborAssessmentLabel", yesNoLabel(row.getParticipatedLaborAssessment()));
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }

  private static String resolveYesNoOptional(String raw, String label) {
    if (raw == null || raw.isBlank()) return null;
    String v = raw.trim();
    if (Set.of("YES", "是", "Y", "1", "true", "TRUE").contains(v) || "yes".equalsIgnoreCase(v)) {
      return "YES";
    }
    if (Set.of("NO", "否", "N", "0", "false", "FALSE").contains(v) || "no".equalsIgnoreCase(v)) {
      return "NO";
    }
    throw new IllegalArgumentException(label + "仅支持是/否");
  }

  private static String yesNoLabel(String value) {
    if (value == null || value.isBlank()) return "";
    if ("YES".equalsIgnoreCase(value) || "是".equals(value)) return "是";
    if ("NO".equalsIgnoreCase(value) || "否".equals(value)) return "否";
    return value;
  }
}
