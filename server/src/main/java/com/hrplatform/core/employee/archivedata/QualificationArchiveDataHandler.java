package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeQualificationEntity;
import com.hrplatform.core.employee.EmployeeQualificationMapper;
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
 * 资格证书批管。业务键：同工号 + 证书名称 + 证书号码 → 更新，否则新建。
 */
@Component
public class QualificationArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "qualifications";

  private static final String[] HEADERS = {
      "工号*", "证书名称*", "技能类型", "最早获证日期", "有效日到期日", "复审日期",
      "证书号码", "经办人", "发证机构", "备注"
  };

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeQualificationMapper qualificationMapper;

  public QualificationArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeQualificationMapper qualificationMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.qualificationMapper = qualificationMapper;
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

    LambdaQueryWrapper<EmployeeQualificationEntity> qw =
        new LambdaQueryWrapper<EmployeeQualificationEntity>()
            .orderByDesc(EmployeeQualificationEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeQualificationEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = qualificationMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeQualificationEntity> records = qualificationMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeQualificationEntity::getEmployeeId).toList()
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
    EmployeeQualificationEntity created =
        archiveService.createQualification(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeQualificationEntity current = qualificationMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("资格证书记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeQualificationEntity updated =
        archiveService.updateQualification(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeQualificationEntity current = qualificationMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("资格证书记录不存在");
    archiveService.deleteQualification(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("资格证书");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 16 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("PMP");
      sample.createCell(2).setCellValue("项目管理");
      sample.createCell(3).setCellValue("2022-06-01");
      sample.createCell(4).setCellValue("2025-06-01");
      sample.createCell(5).setCellValue("");
      sample.createCell(6).setCellValue("CERT-001");
      sample.createCell(7).setCellValue("");
      sample.createCell(8).setCellValue("PMI");
      sample.createCell(9).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、证书名称*：必填");
      hint.createRow(2).createCell(0).setCellValue("业务键：同工号 + 证书名称 + 证书号码 → 更新，否则新建");
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
      Sheet sheet = wb.createSheet("资格证书");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 16 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("certificateName")));
        row.createCell(2).setCellValue(str(item.get("skillType")));
        row.createCell(3).setCellValue(str(item.get("firstIssueDate")));
        row.createCell(4).setCellValue(str(item.get("expiryDate")));
        row.createCell(5).setCellValue(str(item.get("reviewDate")));
        row.createCell(6).setCellValue(str(item.get("certificateNo")));
        row.createCell(7).setCellValue(str(item.get("handlerName")));
        row.createCell(8).setCellValue(str(item.get("issuingOrg")));
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
    String certificateName = support.cell(row, 1);
    if (certificateName.isBlank()) throw new RowImportException("证书名称", "证书名称不能为空");
    String certificateNo = blankToNull(support.cell(row, 6));

    EmployeeQualificationEntity entity = new EmployeeQualificationEntity();
    entity.setCertificateName(certificateName.trim());
    entity.setSkillType(blankToNull(support.cell(row, 2)));
    entity.setFirstIssueDate(parseDate(support.cell(row, 3), "最早获证日期"));
    entity.setExpiryDate(parseDate(support.cell(row, 4), "有效日到期日"));
    entity.setReviewDate(parseDate(support.cell(row, 5), "复审日期"));
    entity.setCertificateNo(certificateNo);
    entity.setHandlerName(blankToNull(support.cell(row, 7)));
    entity.setIssuingOrg(blankToNull(support.cell(row, 8)));
    entity.setRemark(blankToNull(support.cell(row, 9)));

    EmployeeQualificationEntity existing =
        findExisting(employee.getId(), certificateName.trim(), certificateNo);
    if (existing != null) {
      archiveService.updateQualification(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createQualification(employee.getId(), entity);
    }
  }

  private EmployeeQualificationEntity findExisting(
      long employeeId,
      String certificateName,
      String certificateNo
  ) {
    LambdaQueryWrapper<EmployeeQualificationEntity> qw =
        new LambdaQueryWrapper<EmployeeQualificationEntity>()
            .eq(EmployeeQualificationEntity::getEmployeeId, employeeId)
            .eq(EmployeeQualificationEntity::getCertificateName, certificateName)
            .orderByDesc(EmployeeQualificationEntity::getId)
            .last("LIMIT 1");
    if (certificateNo == null || certificateNo.isBlank()) {
      qw.and(w -> w.isNull(EmployeeQualificationEntity::getCertificateNo)
          .or()
          .eq(EmployeeQualificationEntity::getCertificateNo, ""));
    } else {
      qw.eq(EmployeeQualificationEntity::getCertificateNo, certificateNo);
    }
    return qualificationMapper.selectOne(qw);
  }

  private EmployeeQualificationEntity mapEntity(Map<String, Object> body) {
    EmployeeQualificationEntity entity = new EmployeeQualificationEntity();
    String certificateName = str(body.get("certificateName"));
    if (certificateName.isBlank()) throw new IllegalArgumentException("证书名称不能为空");
    entity.setCertificateName(certificateName.trim());
    entity.setSkillType(blankToNull(str(body.get("skillType"))));
    entity.setFirstIssueDate(parseOptionalDate(body.get("firstIssueDate"), "最早获证日期"));
    entity.setExpiryDate(parseOptionalDate(body.get("expiryDate"), "有效日到期日"));
    entity.setReviewDate(parseOptionalDate(body.get("reviewDate"), "复审日期"));
    entity.setCertificateNo(blankToNull(str(body.get("certificateNo"))));
    entity.setHandlerName(blankToNull(str(body.get("handlerName"))));
    entity.setIssuingOrg(blankToNull(str(body.get("issuingOrg"))));
    entity.setRemark(blankToNull(str(body.get("remark"))));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeQualificationEntity row,
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
