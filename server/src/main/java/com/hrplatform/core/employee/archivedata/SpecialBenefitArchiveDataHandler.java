package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeSpecialBenefitEntity;
import com.hrplatform.core.employee.EmployeeSpecialBenefitMapper;
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
 * 特殊福利批管。业务键：同工号 + 是否有特殊福利 + 截止日期 → 更新，否则新建。
 */
@Component
public class SpecialBenefitArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "special-benefits";

  private static final String[] HEADERS = {
      "工号*", "是否有特殊福利*", "截止日期"
  };

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeSpecialBenefitMapper specialBenefitMapper;

  public SpecialBenefitArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeSpecialBenefitMapper specialBenefitMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.specialBenefitMapper = specialBenefitMapper;
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

    LambdaQueryWrapper<EmployeeSpecialBenefitEntity> qw =
        new LambdaQueryWrapper<EmployeeSpecialBenefitEntity>()
            .orderByDesc(EmployeeSpecialBenefitEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeSpecialBenefitEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = specialBenefitMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeSpecialBenefitEntity> records = specialBenefitMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeSpecialBenefitEntity::getEmployeeId).toList()
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
    EmployeeSpecialBenefitEntity created =
        archiveService.createSpecialBenefit(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeSpecialBenefitEntity current = specialBenefitMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("特殊福利记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeSpecialBenefitEntity updated =
        archiveService.updateSpecialBenefit(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeSpecialBenefitEntity current = specialBenefitMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("特殊福利记录不存在");
    archiveService.deleteSpecialBenefit(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("特殊福利");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 20 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("是");
      sample.createCell(2).setCellValue("2025-12-31");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、是否有特殊福利*：必填");
      hint.createRow(2).createCell(0).setCellValue("是否有特殊福利：是/否（或 YES/NO）");
      hint.createRow(3).createCell(0).setCellValue("业务键：同工号 + 是否有特殊福利 + 截止日期 → 更新，否则新建");
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
      Sheet sheet = wb.createSheet("特殊福利");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 20 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(yesNoLabel(str(item.get("hasSpecialBenefit"))));
        row.createCell(2).setCellValue(str(item.get("endDate")));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private void upsertRow(Row row) {
    EmployeeEntity employee = support.requireByEmployeeNoForImport(support.cell(row, 0));
    String has = resolveYesNo(support.cell(row, 1), "是否有特殊福利", true);
    LocalDate endDate = parseDate(support.cell(row, 2), "截止日期");

    EmployeeSpecialBenefitEntity entity = new EmployeeSpecialBenefitEntity();
    entity.setHasSpecialBenefit(has);
    entity.setEndDate(endDate);

    EmployeeSpecialBenefitEntity existing = findExisting(employee.getId(), has, endDate);
    if (existing != null) {
      archiveService.updateSpecialBenefit(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createSpecialBenefit(employee.getId(), entity);
    }
  }

  private EmployeeSpecialBenefitEntity findExisting(long employeeId, String has, LocalDate endDate) {
    LambdaQueryWrapper<EmployeeSpecialBenefitEntity> qw =
        new LambdaQueryWrapper<EmployeeSpecialBenefitEntity>()
            .eq(EmployeeSpecialBenefitEntity::getEmployeeId, employeeId)
            .eq(EmployeeSpecialBenefitEntity::getHasSpecialBenefit, has)
            .orderByDesc(EmployeeSpecialBenefitEntity::getId)
            .last("LIMIT 1");
    if (endDate == null) {
      qw.and(w -> w.isNull(EmployeeSpecialBenefitEntity::getEndDate));
    } else {
      qw.eq(EmployeeSpecialBenefitEntity::getEndDate, endDate);
    }
    return specialBenefitMapper.selectOne(qw);
  }

  private EmployeeSpecialBenefitEntity mapEntity(Map<String, Object> body) {
    EmployeeSpecialBenefitEntity entity = new EmployeeSpecialBenefitEntity();
    entity.setHasSpecialBenefit(resolveYesNo(str(body.get("hasSpecialBenefit")), "是否有特殊福利", false));
    entity.setEndDate(parseOptionalDate(body.get("endDate"), "截止日期"));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeSpecialBenefitEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    dto.put("hasSpecialBenefitLabel", yesNoLabel(row.getHasSpecialBenefit()));
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }

  private static String resolveYesNo(String raw, String label, boolean forImport) {
    if (raw == null || raw.isBlank()) {
      if (forImport) throw new RowImportException(label, label + "不能为空");
      throw new IllegalArgumentException("请选择" + label);
    }
    String v = raw.trim();
    if (Set.of("YES", "是", "Y", "1", "true", "TRUE").contains(v) || "yes".equalsIgnoreCase(v)) {
      return "YES";
    }
    if (Set.of("NO", "否", "N", "0", "false", "FALSE").contains(v) || "no".equalsIgnoreCase(v)) {
      return "NO";
    }
    if (forImport) throw new RowImportException(label, "须为 是/否 或 YES/NO");
    throw new IllegalArgumentException(label + "仅支持是/否");
  }

  private static String yesNoLabel(String value) {
    if (value == null || value.isBlank()) return "";
    if ("YES".equalsIgnoreCase(value) || "是".equals(value)) return "是";
    if ("NO".equalsIgnoreCase(value) || "否".equals(value)) return "否";
    return value;
  }
}
