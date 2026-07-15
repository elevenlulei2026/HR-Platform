package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeWorkExperienceEntity;
import com.hrplatform.core.employee.EmployeeWorkExperienceMapper;
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
 * 工作经历批管。业务键：同工号 + 单位 + 开始日期 → 更新，否则新建。
 */
@Component
public class WorkExperienceArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "work-experiences";

  private static final String[] HEADERS = {
      "工号*", "单位*", "部门", "岗位", "开始日期", "结束日期", "离职原因",
      "离职薪资", "证明人", "证明人电话", "薪酬频率", "货币代码", "详细描述"
  };
  private static final String DICT_CURRENCY = "CURRENCY";

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeWorkExperienceMapper workExperienceMapper;

  public WorkExperienceArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeWorkExperienceMapper workExperienceMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.workExperienceMapper = workExperienceMapper;
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

    LambdaQueryWrapper<EmployeeWorkExperienceEntity> qw =
        new LambdaQueryWrapper<EmployeeWorkExperienceEntity>()
            .orderByDesc(EmployeeWorkExperienceEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeWorkExperienceEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = workExperienceMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeWorkExperienceEntity> records = workExperienceMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeWorkExperienceEntity::getEmployeeId).toList()
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
    EmployeeWorkExperienceEntity created =
        archiveService.createWorkExperience(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeWorkExperienceEntity current = workExperienceMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("工作经历记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeWorkExperienceEntity updated =
        archiveService.updateWorkExperience(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeWorkExperienceEntity current = workExperienceMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("工作经历记录不存在");
    archiveService.deleteWorkExperience(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("工作经历");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 14 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("示例科技有限公司");
      sample.createCell(2).setCellValue("研发部");
      sample.createCell(3).setCellValue("工程师");
      sample.createCell(4).setCellValue("2020-01-01");
      sample.createCell(5).setCellValue("2023-12-31");
      sample.createCell(6).setCellValue("");
      sample.createCell(7).setCellValue("");
      sample.createCell(8).setCellValue("");
      sample.createCell(9).setCellValue("");
      sample.createCell(10).setCellValue("");
      sample.createCell(11).setCellValue(support.sampleDictLabel(DICT_CURRENCY, "CNY"));
      sample.createCell(12).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、单位*：必填");
      hint.createRow(2).createCell(0).setCellValue("货币代码：填字典名称或编码（如 人民币 / CNY）");
      hint.createRow(3).createCell(0).setCellValue("业务键：同工号 + 单位 + 开始日期 → 更新，否则新建");
      hint.setColumnWidth(0, 70 * 256);

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
    Map<String, String> currencyLabels = support.employeeService().dictLabels(DICT_CURRENCY);
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("工作经历");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 14 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("employerName")));
        row.createCell(2).setCellValue(str(item.get("department")));
        row.createCell(3).setCellValue(str(item.get("position")));
        row.createCell(4).setCellValue(str(item.get("startDate")));
        row.createCell(5).setCellValue(str(item.get("endDate")));
        row.createCell(6).setCellValue(str(item.get("leaveReason")));
        row.createCell(7).setCellValue(str(item.get("lastSalary")));
        row.createCell(8).setCellValue(str(item.get("referee")));
        row.createCell(9).setCellValue(str(item.get("refereePhone")));
        row.createCell(10).setCellValue(str(item.get("payFrequency")));
        String currency = str(item.get("currencyCodeLabel"));
        if (currency.isBlank()) {
          currency = dictDisplayName(currencyLabels, str(item.get("currencyCode")));
        }
        row.createCell(11).setCellValue(currency);
        row.createCell(12).setCellValue(str(item.get("description")));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private void upsertRow(Row row) {
    EmployeeEntity employee = support.requireByEmployeeNoForImport(support.cell(row, 0));
    String employerName = support.cell(row, 1);
    if (employerName.isBlank()) throw new RowImportException("单位", "单位不能为空");
    LocalDate startDate = parseDate(support.cell(row, 4), "开始日期");

    EmployeeWorkExperienceEntity entity = new EmployeeWorkExperienceEntity();
    entity.setEmployerName(employerName.trim());
    entity.setDepartment(blankToNull(support.cell(row, 2)));
    entity.setPosition(blankToNull(support.cell(row, 3)));
    entity.setStartDate(startDate);
    entity.setEndDate(parseDate(support.cell(row, 5), "结束日期"));
    entity.setLeaveReason(blankToNull(support.cell(row, 6)));
    entity.setLastSalary(parseFee(support.cell(row, 7), "离职薪资"));
    entity.setReferee(blankToNull(support.cell(row, 8)));
    entity.setRefereePhone(blankToNull(support.cell(row, 9)));
    entity.setPayFrequency(blankToNull(support.cell(row, 10)));
    entity.setCurrencyCode(support.resolveDictCode(DICT_CURRENCY, blankToNull(support.cell(row, 11)), "货币代码"));
    entity.setDescription(blankToNull(support.cell(row, 12)));

    EmployeeWorkExperienceEntity existing =
        findExisting(employee.getId(), employerName.trim(), startDate);
    if (existing != null) {
      archiveService.updateWorkExperience(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createWorkExperience(employee.getId(), entity);
    }
  }

  private EmployeeWorkExperienceEntity findExisting(
      long employeeId,
      String employerName,
      LocalDate startDate
  ) {
    LambdaQueryWrapper<EmployeeWorkExperienceEntity> qw =
        new LambdaQueryWrapper<EmployeeWorkExperienceEntity>()
            .eq(EmployeeWorkExperienceEntity::getEmployeeId, employeeId)
            .eq(EmployeeWorkExperienceEntity::getEmployerName, employerName)
            .orderByDesc(EmployeeWorkExperienceEntity::getId)
            .last("LIMIT 1");
    if (startDate == null) {
      qw.and(w -> w.isNull(EmployeeWorkExperienceEntity::getStartDate));
    } else {
      qw.eq(EmployeeWorkExperienceEntity::getStartDate, startDate);
    }
    return workExperienceMapper.selectOne(qw);
  }

  private EmployeeWorkExperienceEntity mapEntity(Map<String, Object> body) {
    EmployeeWorkExperienceEntity entity = new EmployeeWorkExperienceEntity();
    String employerName = str(body.get("employerName"));
    if (employerName.isBlank()) throw new IllegalArgumentException("单位不能为空");
    entity.setEmployerName(employerName.trim());
    entity.setDepartment(blankToNull(str(body.get("department"))));
    entity.setPosition(blankToNull(str(body.get("position"))));
    entity.setStartDate(parseOptionalDate(body.get("startDate"), "开始日期"));
    entity.setEndDate(parseOptionalDate(body.get("endDate"), "结束日期"));
    entity.setLeaveReason(blankToNull(str(body.get("leaveReason"))));
    entity.setLastSalary(parseOptionalDecimal(body.get("lastSalary"), "离职薪资"));
    entity.setReferee(blankToNull(str(body.get("referee"))));
    entity.setRefereePhone(blankToNull(str(body.get("refereePhone"))));
    entity.setPayFrequency(blankToNull(str(body.get("payFrequency"))));
    entity.setCurrencyCode(blankToNull(str(body.get("currencyCode"))));
    entity.setDescription(blankToNull(str(body.get("description"))));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeWorkExperienceEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    support.putDictLabel(dto, "currencyCode", DICT_CURRENCY, row.getCurrencyCode());
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }

  private static BigDecimal parseFee(String raw, String field) {
    if (raw == null || raw.isBlank()) return null;
    try {
      return new BigDecimal(raw.trim());
    } catch (NumberFormatException e) {
      throw new RowImportException(field, "须为数字");
    }
  }
}
