package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEducationEntity;
import com.hrplatform.core.employee.EmployeeEducationMapper;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.blankToNull;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.dictDisplayName;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseYesNo;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 教育经历批管。业务键：同工号 + 学校 + 开始日期 → 更新，否则新建。
 */
@Component
public class EducationArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "educations";

  private static final String[] HEADERS = {
      "工号*", "学历", "学位", "最高学历", "国家/地区", "学校*", "专业", "开始日期", "结束日期", "毕业证编号", "学位证编号"
  };
  private static final String DICT_EDUCATION = "EDUCATION";
  private static final String DICT_DEGREE = "DEGREE";
  private static final String DICT_COUNTRY = "COUNTRY_REGION";

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeEducationMapper educationMapper;

  public EducationArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeEducationMapper educationMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.educationMapper = educationMapper;
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

    LambdaQueryWrapper<EmployeeEducationEntity> qw =
        new LambdaQueryWrapper<EmployeeEducationEntity>()
            .orderByDesc(EmployeeEducationEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeEducationEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = educationMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeEducationEntity> records = educationMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeEducationEntity::getEmployeeId).toList()
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
    EmployeeEducationEntity created = archiveService.createEducation(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeEducationEntity current = educationMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("教育经历记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeEducationEntity updated = archiveService.updateEducation(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeEducationEntity current = educationMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("教育经历记录不存在");
    archiveService.deleteEducation(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("教育经历");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 14 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue(support.sampleDictLabel(DICT_EDUCATION, ""));
      sample.createCell(2).setCellValue(support.sampleDictLabel(DICT_DEGREE, ""));
      sample.createCell(3).setCellValue("是");
      sample.createCell(4).setCellValue(support.sampleDictLabel(DICT_COUNTRY, "CN"));
      sample.createCell(5).setCellValue("示例大学");
      sample.createCell(6).setCellValue("计算机科学");
      sample.createCell(7).setCellValue("2015-09-01");
      sample.createCell(8).setCellValue("2019-06-30");
      sample.createCell(9).setCellValue("");
      sample.createCell(10).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、学校*：必填");
      hint.createRow(2).createCell(0).setCellValue("学历/学位/国家地区：填字典名称或编码");
      hint.createRow(3).createCell(0).setCellValue("最高学历：是/否");
      hint.createRow(4).createCell(0).setCellValue("业务键：同工号 + 学校 + 开始日期 → 更新，否则新建");
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
    Map<String, String> eduLabels = support.employeeService().dictLabels(DICT_EDUCATION);
    Map<String, String> degreeLabels = support.employeeService().dictLabels(DICT_DEGREE);
    Map<String, String> countryLabels = support.employeeService().dictLabels(DICT_COUNTRY);
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("教育经历");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 14 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(firstNonBlank(
            str(item.get("educationLevelLabel")),
            dictDisplayName(eduLabels, str(item.get("educationLevel")))
        ));
        row.createCell(2).setCellValue(firstNonBlank(
            str(item.get("degreeLabel")),
            dictDisplayName(degreeLabels, str(item.get("degree")))
        ));
        Object highest = item.get("isHighest");
        row.createCell(3).setCellValue(
            Boolean.TRUE.equals(highest) || "true".equalsIgnoreCase(str(highest)) ? "是" : "否"
        );
        row.createCell(4).setCellValue(firstNonBlank(
            str(item.get("countryRegionLabel")),
            dictDisplayName(countryLabels, str(item.get("countryRegion")))
        ));
        row.createCell(5).setCellValue(str(item.get("schoolName")));
        row.createCell(6).setCellValue(str(item.get("major")));
        row.createCell(7).setCellValue(str(item.get("startDate")));
        row.createCell(8).setCellValue(str(item.get("endDate")));
        row.createCell(9).setCellValue(str(item.get("diplomaNo")));
        row.createCell(10).setCellValue(str(item.get("degreeNo")));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private void upsertRow(Row row) {
    EmployeeEntity employee = support.requireByEmployeeNoForImport(support.cell(row, 0));
    String schoolName = support.cell(row, 5);
    if (schoolName.isBlank()) throw new RowImportException("学校", "学校不能为空");
    LocalDate startDate = parseDate(support.cell(row, 7), "开始日期");

    EmployeeEducationEntity entity = new EmployeeEducationEntity();
    entity.setEducationLevel(support.resolveDictCode(DICT_EDUCATION, blankToNull(support.cell(row, 1)), "学历"));
    entity.setDegree(support.resolveDictCode(DICT_DEGREE, blankToNull(support.cell(row, 2)), "学位"));
    Boolean isHighest = parseYesNo(support.cell(row, 3), "最高学历");
    entity.setIsHighest(isHighest != null ? isHighest : Boolean.FALSE);
    entity.setCountryRegion(support.resolveDictCode(DICT_COUNTRY, blankToNull(support.cell(row, 4)), "国家/地区"));
    entity.setSchoolName(schoolName.trim());
    entity.setMajor(blankToNull(support.cell(row, 6)));
    entity.setStartDate(startDate);
    entity.setEndDate(parseDate(support.cell(row, 8), "结束日期"));
    entity.setDiplomaNo(blankToNull(support.cell(row, 9)));
    entity.setDegreeNo(blankToNull(support.cell(row, 10)));

    EmployeeEducationEntity existing = findExisting(employee.getId(), schoolName.trim(), startDate);
    if (existing != null) {
      archiveService.updateEducation(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createEducation(employee.getId(), entity);
    }
  }

  private EmployeeEducationEntity findExisting(long employeeId, String schoolName, LocalDate startDate) {
    LambdaQueryWrapper<EmployeeEducationEntity> qw =
        new LambdaQueryWrapper<EmployeeEducationEntity>()
            .eq(EmployeeEducationEntity::getEmployeeId, employeeId)
            .eq(EmployeeEducationEntity::getSchoolName, schoolName)
            .orderByDesc(EmployeeEducationEntity::getId)
            .last("LIMIT 1");
    if (startDate == null) {
      qw.and(w -> w.isNull(EmployeeEducationEntity::getStartDate));
    } else {
      qw.eq(EmployeeEducationEntity::getStartDate, startDate);
    }
    return educationMapper.selectOne(qw);
  }

  private EmployeeEducationEntity mapEntity(Map<String, Object> body) {
    EmployeeEducationEntity entity = new EmployeeEducationEntity();
    String schoolName = str(body.get("schoolName"));
    if (schoolName.isBlank()) throw new IllegalArgumentException("学校不能为空");
    entity.setSchoolName(schoolName.trim());
    entity.setEducationLevel(blankToNull(str(body.get("educationLevel"))));
    entity.setDegree(blankToNull(str(body.get("degree"))));
    entity.setIsHighest(parseBooleanBody(body.get("isHighest"), "最高学历"));
    entity.setCountryRegion(blankToNull(str(body.get("countryRegion"))));
    entity.setMajor(blankToNull(str(body.get("major"))));
    entity.setStartDate(parseOptionalDate(body.get("startDate"), "开始日期"));
    entity.setEndDate(parseOptionalDate(body.get("endDate"), "结束日期"));
    entity.setDiplomaNo(blankToNull(str(body.get("diplomaNo"))));
    entity.setDegreeNo(blankToNull(str(body.get("degreeNo"))));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeEducationEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    dto.remove("attachmentIdsData");
    support.putDictLabel(dto, "educationLevel", DICT_EDUCATION, row.getEducationLevel());
    support.putDictLabel(dto, "degree", DICT_DEGREE, row.getDegree());
    support.putDictLabel(dto, "countryRegion", DICT_COUNTRY, row.getCountryRegion());
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }

  private static Boolean parseBooleanBody(Object raw, String label) {
    if (raw instanceof Boolean b) return b;
    if (raw == null || str(raw).isBlank()) return Boolean.FALSE;
    Boolean parsed = parseYesNo(str(raw), label);
    return parsed != null ? parsed : Boolean.FALSE;
  }

  private static String firstNonBlank(String a, String b) {
    return a != null && !a.isBlank() ? a : (b == null ? "" : b);
  }
}
