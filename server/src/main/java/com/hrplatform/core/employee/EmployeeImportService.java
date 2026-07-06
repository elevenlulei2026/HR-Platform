package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.OrganizationMapper;
import com.hrplatform.core.organization.PositionEntity;
import com.hrplatform.core.organization.PositionMapper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class EmployeeImportService {
  private static final String[] TEMPLATE_HEADERS = {
      "姓名*", "性别*", "手机号*", "公司邮箱", "入职日期*", "状态*",
      "部门编码", "岗位编码", "雇佣类型"
  };

  private final EmployeeService employeeService;
  private final OrganizationMapper organizationMapper;
  private final PositionMapper positionMapper;
  private final DataFormatter dataFormatter = new DataFormatter();

  public EmployeeImportService(
      EmployeeService employeeService,
      OrganizationMapper organizationMapper,
      PositionMapper positionMapper
  ) {
    this.employeeService = employeeService;
    this.organizationMapper = organizationMapper;
    this.positionMapper = positionMapper;
  }

  public byte[] buildTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("员工导入");
      Row header = sheet.createRow(0);
      for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
        header.createCell(i).setCellValue(TEMPLATE_HEADERS[i]);
        sheet.setColumnWidth(i, 18 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("张三");
      sample.createCell(1).setCellValue("MALE");
      sample.createCell(2).setCellValue("13800138000");
      sample.createCell(3).setCellValue("zhangsan@company.com");
      sample.createCell(4).setCellValue("2026-01-01");
      sample.createCell(5).setCellValue("ACTIVE");
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("生成导入模板失败", e);
    }
  }

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
        if (row == null || isEmptyRow(row)) continue;
        total++;
        int rowNumber = i + 1;
        try {
          processRow(row);
          success++;
        } catch (RowImportException ex) {
          errors.add(new RowError(rowNumber, ex.field(), ex.getMessage()));
        } catch (Exception ex) {
          errors.add(new RowError(rowNumber, null, ex.getMessage()));
        }
      }
    } catch (IllegalArgumentException e) {
      throw e;
    } catch (Exception e) {
      throw new IllegalStateException("解析 Excel 失败", e);
    }

    return new ImportResult(total, success, errors.size(), errors);
  }

  private void processRow(Row row) {
    String fullName = cell(row, 0);
    String gender = cell(row, 1);
    String mobile = cell(row, 2);
    String companyEmail = cell(row, 3);
    String hireDateStr = cell(row, 4);
    String status = cell(row, 5);
    String orgCode = cell(row, 6);
    String positionCode = cell(row, 7);
    String employmentType = cell(row, 8);

    if (fullName.isBlank()) throw new RowImportException("姓名", "姓名不能为空");
    if (gender.isBlank()) throw new RowImportException("性别", "性别不能为空");
    if (mobile.isBlank()) throw new RowImportException("手机号", "手机号不能为空");
    if (hireDateStr.isBlank()) throw new RowImportException("入职日期", "入职日期不能为空");
    if (status.isBlank()) status = "ACTIVE";

    LocalDate hireDate;
    try {
      hireDate = LocalDate.parse(hireDateStr.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
    } catch (Exception e) {
      throw new RowImportException("入职日期", "入职日期格式应为 YYYY-MM-DD");
    }

    Long organizationId = null;
    Long positionId = null;
    if (!orgCode.isBlank()) {
      OrganizationEntity org = organizationMapper.selectOne(
          new LambdaQueryWrapper<OrganizationEntity>()
              .eq(OrganizationEntity::getCode, orgCode.trim())
              .isNull(OrganizationEntity::getEffectiveEndDate)
              .last("LIMIT 1")
      );
      if (org == null) throw new RowImportException("部门编码", "部门编码不存在: " + orgCode);
      organizationId = org.getId();
    }
    if (!positionCode.isBlank()) {
      PositionEntity pos = positionMapper.selectOne(
          new LambdaQueryWrapper<PositionEntity>()
              .eq(PositionEntity::getCode, positionCode.trim())
              .isNull(PositionEntity::getEffectiveEndDate)
              .last("LIMIT 1")
      );
      if (pos == null) throw new RowImportException("岗位编码", "岗位编码不存在: " + positionCode);
      positionId = pos.getId();
    }
    if ((organizationId == null) != (positionId == null)) {
      throw new RowImportException("部门/岗位", "部门编码与岗位编码须同时填写或同时留空");
    }

    employeeService.create(new EmployeeService.CreateCommand(
        fullName,
        gender,
        mobile,
        companyEmail.isBlank() ? null : companyEmail,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        hireDate,
        status,
        organizationId,
        positionId,
        employmentType.isBlank() ? null : employmentType,
        hireDate
    ));
  }

  public byte[] exportExcel(List<EmployeeEntity> employees, boolean revealSensitive) {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("花名册");
      String[] headers = {"工号", "姓名", "性别", "手机号", "公司邮箱", "入职日期", "状态"};
      Row header = sheet.createRow(0);
      for (int i = 0; i < headers.length; i++) {
        header.createCell(i).setCellValue(headers[i]);
      }
      int r = 1;
      for (EmployeeEntity e : employees) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(e.getEmployeeNo());
        row.createCell(1).setCellValue(e.getFullName());
        row.createCell(2).setCellValue(e.getGender() == null ? "" : e.getGender());
        row.createCell(3).setCellValue(employeeService.displayMobile(e, revealSensitive));
        row.createCell(4).setCellValue(e.getCompanyEmail() == null ? "" : e.getCompanyEmail());
        row.createCell(5).setCellValue(e.getHireDate() == null ? "" : e.getHireDate().toString());
        row.createCell(6).setCellValue(e.getStatus());
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  public byte[] buildErrorReport(List<RowError> errors) {
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
      for (RowError error : errors) {
        Row row = sheet.createRow(rowIdx++);
        row.createCell(0).setCellValue(error.rowNumber());
        row.createCell(1).setCellValue(error.field() == null ? "" : error.field());
        row.createCell(2).setCellValue(error.message() == null ? "" : error.message());
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("生成导入错误报告失败", e);
    }
  }

  private String cell(Row row, int idx) {
    Cell c = row.getCell(idx);
    if (c == null) return "";
    return dataFormatter.formatCellValue(c).trim();
  }

  private boolean isEmptyRow(Row row) {
    for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
      if (!cell(row, i).isBlank()) return false;
    }
    return true;
  }

  public record ImportResult(int totalRows, int successCount, int failureCount, List<RowError> errors) {}

  public record RowError(int rowNumber, String field, String message) {}

  private static class RowImportException extends RuntimeException {
    private final String field;

    RowImportException(String field, String message) {
      super(message);
      this.field = field;
    }

    String field() { return field; }
  }
}
