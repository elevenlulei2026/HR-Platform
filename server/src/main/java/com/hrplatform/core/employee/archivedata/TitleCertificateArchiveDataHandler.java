package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeTitleCertificateEntity;
import com.hrplatform.core.employee.EmployeeTitleCertificateMapper;
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
 * 职称证书批管。业务键：同工号 + 职称名称 + 证书号码 → 更新，否则新建。
 */
@Component
public class TitleCertificateArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "title-certificates";

  private static final String[] HEADERS = {
      "工号*", "职称名称*", "职称级别", "批准日期", "到期日", "证书号码", "签发单位", "备注"
  };

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeTitleCertificateMapper titleCertificateMapper;

  public TitleCertificateArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeTitleCertificateMapper titleCertificateMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.titleCertificateMapper = titleCertificateMapper;
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

    LambdaQueryWrapper<EmployeeTitleCertificateEntity> qw =
        new LambdaQueryWrapper<EmployeeTitleCertificateEntity>()
            .orderByDesc(EmployeeTitleCertificateEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeTitleCertificateEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = titleCertificateMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeTitleCertificateEntity> records = titleCertificateMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeTitleCertificateEntity::getEmployeeId).toList()
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
    EmployeeTitleCertificateEntity created =
        archiveService.createTitleCertificate(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeTitleCertificateEntity current = titleCertificateMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("职称证书记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeTitleCertificateEntity updated =
        archiveService.updateTitleCertificate(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeTitleCertificateEntity current = titleCertificateMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("职称证书记录不存在");
    archiveService.deleteTitleCertificate(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("职称证书");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 16 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("高级工程师");
      sample.createCell(2).setCellValue("副高级");
      sample.createCell(3).setCellValue("2020-06-01");
      sample.createCell(4).setCellValue("");
      sample.createCell(5).setCellValue("ZC-2020-001");
      sample.createCell(6).setCellValue("示例人社局");
      sample.createCell(7).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、职称名称*：必填");
      hint.createRow(2).createCell(0).setCellValue("业务键：同工号 + 职称名称 + 证书号码 → 更新，否则新建");
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
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("职称证书");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 16 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("titleName")));
        row.createCell(2).setCellValue(str(item.get("titleLevel")));
        row.createCell(3).setCellValue(str(item.get("approvalDate")));
        row.createCell(4).setCellValue(str(item.get("expiryDate")));
        row.createCell(5).setCellValue(str(item.get("certificateNo")));
        row.createCell(6).setCellValue(str(item.get("issuingOrg")));
        row.createCell(7).setCellValue(str(item.get("remark")));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private void upsertRow(Row row) {
    EmployeeEntity employee = support.requireByEmployeeNoForImport(support.cell(row, 0));
    String titleName = support.cell(row, 1);
    if (titleName.isBlank()) throw new RowImportException("职称名称", "职称名称不能为空");
    String certificateNo = blankToNull(support.cell(row, 5));

    EmployeeTitleCertificateEntity entity = new EmployeeTitleCertificateEntity();
    entity.setTitleName(titleName.trim());
    entity.setTitleLevel(blankToNull(support.cell(row, 2)));
    entity.setApprovalDate(parseDate(support.cell(row, 3), "批准日期"));
    entity.setExpiryDate(parseDate(support.cell(row, 4), "到期日"));
    entity.setCertificateNo(certificateNo);
    entity.setIssuingOrg(blankToNull(support.cell(row, 6)));
    entity.setRemark(blankToNull(support.cell(row, 7)));

    EmployeeTitleCertificateEntity existing =
        findExisting(employee.getId(), titleName.trim(), certificateNo);
    if (existing != null) {
      archiveService.updateTitleCertificate(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createTitleCertificate(employee.getId(), entity);
    }
  }

  private EmployeeTitleCertificateEntity findExisting(
      long employeeId,
      String titleName,
      String certificateNo
  ) {
    LambdaQueryWrapper<EmployeeTitleCertificateEntity> qw =
        new LambdaQueryWrapper<EmployeeTitleCertificateEntity>()
            .eq(EmployeeTitleCertificateEntity::getEmployeeId, employeeId)
            .eq(EmployeeTitleCertificateEntity::getTitleName, titleName)
            .orderByDesc(EmployeeTitleCertificateEntity::getId)
            .last("LIMIT 1");
    if (certificateNo == null || certificateNo.isBlank()) {
      qw.and(w -> w.isNull(EmployeeTitleCertificateEntity::getCertificateNo)
          .or()
          .eq(EmployeeTitleCertificateEntity::getCertificateNo, ""));
    } else {
      qw.eq(EmployeeTitleCertificateEntity::getCertificateNo, certificateNo);
    }
    return titleCertificateMapper.selectOne(qw);
  }

  private EmployeeTitleCertificateEntity mapEntity(Map<String, Object> body) {
    EmployeeTitleCertificateEntity entity = new EmployeeTitleCertificateEntity();
    String titleName = str(body.get("titleName"));
    if (titleName.isBlank()) throw new IllegalArgumentException("职称名称不能为空");
    entity.setTitleName(titleName.trim());
    entity.setTitleLevel(blankToNull(str(body.get("titleLevel"))));
    entity.setApprovalDate(parseOptionalDate(body.get("approvalDate"), "批准日期"));
    entity.setExpiryDate(parseOptionalDate(body.get("expiryDate"), "到期日"));
    entity.setCertificateNo(blankToNull(str(body.get("certificateNo"))));
    entity.setIssuingOrg(blankToNull(str(body.get("issuingOrg"))));
    entity.setRemark(blankToNull(str(body.get("remark"))));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeTitleCertificateEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    dto.remove("attachmentIdsData");
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }
}
