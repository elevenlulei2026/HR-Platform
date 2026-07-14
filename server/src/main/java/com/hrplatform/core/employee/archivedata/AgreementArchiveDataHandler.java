package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeAgreementEntity;
import com.hrplatform.core.employee.EmployeeAgreementMapper;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.blankToNull;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.dictDisplayName;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalLong;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.resolveValidityStatus;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.validityStatusLabel;

/**
 * 协议信息批管。业务键：同工号 + 协议编号 → 更新，否则新建。
 */
@Component
public class AgreementArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "agreements";

  private static final String[] HEADERS = {
      "工号*", "生效日期*", "协议编号*", "操作类型*", "协议状态*", "协议类别*",
      "协议法人*", "开始日期*", "结束日期*", "备注"
  };
  private static final String DICT_OPERATION = "AGREEMENT_OPERATION_TYPE";
  private static final String DICT_CATEGORY = "AGREEMENT_CATEGORY";

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeAgreementMapper agreementMapper;

  public AgreementArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeAgreementMapper agreementMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.agreementMapper = agreementMapper;
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

    LambdaQueryWrapper<EmployeeAgreementEntity> qw = new LambdaQueryWrapper<EmployeeAgreementEntity>()
        .orderByDesc(EmployeeAgreementEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeAgreementEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = agreementMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeAgreementEntity> records = agreementMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeAgreementEntity::getEmployeeId).toList()
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
    EmployeeAgreementEntity created = archiveService.createAgreement(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeAgreementEntity current = agreementMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("协议记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeAgreementEntity updated = archiveService.updateAgreement(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeAgreementEntity current = agreementMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("协议记录不存在");
    archiveService.deleteAgreement(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("协议信息");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 16 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("2024-01-01");
      sample.createCell(2).setCellValue("XY-2024-001");
      sample.createCell(3).setCellValue(support.sampleDictLabel(DICT_OPERATION, ""));
      sample.createCell(4).setCellValue("有效");
      sample.createCell(5).setCellValue(support.sampleDictLabel(DICT_CATEGORY, ""));
      sample.createCell(6).setCellValue("示例法人");
      sample.createCell(7).setCellValue("2024-01-01");
      sample.createCell(8).setCellValue("2025-12-31");
      sample.createCell(9).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("带 * 为必填；协议法人填编码或名称");
      hint.createRow(2).createCell(0).setCellValue("操作类型、协议类别：填字典名称（推荐）或编码");
      hint.createRow(3).createCell(0).setCellValue("协议状态：有效/无效 或 VALID/INVALID");
      hint.createRow(4).createCell(0).setCellValue("业务键：同工号 + 协议编号 → 更新，否则新建");
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
    Map<String, String> opLabels = support.employeeService().dictLabels(DICT_OPERATION);
    Map<String, String> catLabels = support.employeeService().dictLabels(DICT_CATEGORY);
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("协议信息");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 16 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("effectiveStartDate")));
        row.createCell(2).setCellValue(str(item.get("agreementCode")));
        row.createCell(3).setCellValue(dictDisplayName(opLabels, str(item.get("operationType"))));
        row.createCell(4).setCellValue(validityStatusLabel(str(item.get("status"))));
        row.createCell(5).setCellValue(dictDisplayName(catLabels, str(item.get("agreementCategory"))));
        String legal = str(item.get("legalEntityName"));
        if (legal.isBlank()) legal = str(item.get("legalEntityCode"));
        row.createCell(6).setCellValue(legal);
        row.createCell(7).setCellValue(str(item.get("startDate")));
        row.createCell(8).setCellValue(str(item.get("endDate")));
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
    LocalDate effectiveStart = parseDate(support.cell(row, 1), "生效日期");
    if (effectiveStart == null) throw new RowImportException("生效日期", "生效日期不能为空");
    String agreementCode = support.cell(row, 2);
    if (agreementCode.isBlank()) throw new RowImportException("协议编号", "协议编号不能为空");
    String operationType = support.resolveDictCode(DICT_OPERATION, support.cell(row, 3), "操作类型");
    if (operationType == null) throw new RowImportException("操作类型", "操作类型不能为空");
    String status = resolveValidityStatus(support.cell(row, 4), "协议状态");
    if (status == null) throw new RowImportException("协议状态", "协议状态不能为空");
    String category = support.resolveDictCode(DICT_CATEGORY, support.cell(row, 5), "协议类别");
    if (category == null) throw new RowImportException("协议类别", "协议类别不能为空");
    Long legalEntityId = support.resolveLegalEntityId(support.cell(row, 6), "协议法人", true);
    LocalDate startDate = parseDate(support.cell(row, 7), "开始日期");
    if (startDate == null) throw new RowImportException("开始日期", "开始日期不能为空");
    LocalDate endDate = parseDate(support.cell(row, 8), "结束日期");
    if (endDate == null) throw new RowImportException("结束日期", "结束日期不能为空");

    EmployeeAgreementEntity existing = findExisting(employee.getId(), agreementCode.trim());
    EmployeeAgreementEntity entity = new EmployeeAgreementEntity();
    entity.setEffectiveStartDate(effectiveStart);
    entity.setAgreementCode(agreementCode.trim());
    entity.setOperationType(operationType);
    entity.setStatus(status);
    entity.setAgreementCategory(category);
    entity.setLegalEntityId(legalEntityId);
    entity.setStartDate(startDate);
    entity.setEndDate(endDate);
    entity.setRemark(blankToNull(support.cell(row, 9)));

    if (existing != null) {
      archiveService.updateAgreement(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createAgreement(employee.getId(), entity);
    }
  }

  private EmployeeAgreementEntity findExisting(long employeeId, String agreementCode) {
    return agreementMapper.selectOne(
        new LambdaQueryWrapper<EmployeeAgreementEntity>()
            .eq(EmployeeAgreementEntity::getEmployeeId, employeeId)
            .eq(EmployeeAgreementEntity::getAgreementCode, agreementCode)
            .orderByDesc(EmployeeAgreementEntity::getId)
            .last("LIMIT 1")
    );
  }

  private EmployeeAgreementEntity mapEntity(Map<String, Object> body) {
    EmployeeAgreementEntity entity = new EmployeeAgreementEntity();
    entity.setEffectiveStartDate(parseOptionalDate(body.get("effectiveStartDate"), "生效日期"));
    if (entity.getEffectiveStartDate() == null) throw new IllegalArgumentException("生效日期不能为空");
    String agreementCode = str(body.get("agreementCode"));
    if (agreementCode.isBlank()) throw new IllegalArgumentException("协议编号不能为空");
    entity.setAgreementCode(agreementCode.trim());
    String operationType = blankToNull(str(body.get("operationType")));
    if (operationType == null) throw new IllegalArgumentException("请选择操作类型");
    entity.setOperationType(operationType);
    String status = blankToNull(str(body.get("status")));
    if (status == null) throw new IllegalArgumentException("请选择协议状态");
    entity.setStatus(status);
    String category = blankToNull(str(body.get("agreementCategory")));
    if (category == null) throw new IllegalArgumentException("请选择协议类别");
    entity.setAgreementCategory(category);
    Long legalId = support.resolveLegalEntityIdFromBody(body.get("legalEntityId"));
    if (legalId == null) throw new IllegalArgumentException("请选择协议法人主体");
    entity.setLegalEntityId(legalId);
    entity.setStartDate(parseOptionalDate(body.get("startDate"), "开始日期"));
    if (entity.getStartDate() == null) throw new IllegalArgumentException("开始日期不能为空");
    entity.setEndDate(parseOptionalDate(body.get("endDate"), "结束日期"));
    if (entity.getEndDate() == null) throw new IllegalArgumentException("结束日期不能为空");
    entity.setFileAttachmentId(parseOptionalLong(body.get("fileAttachmentId"), "附件ID"));
    entity.setRemark(blankToNull(str(body.get("remark"))));
    entity.setEffectiveEndDate(parseOptionalDate(body.get("effectiveEndDate"), "生效结束日期"));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeAgreementEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    support.attachLegalEntityDisplay(dto, row.getLegalEntityId());
    support.putDictLabel(dto, "operationType", DICT_OPERATION, row.getOperationType());
    support.putDictLabel(dto, "agreementCategory", DICT_CATEGORY, row.getAgreementCategory());
    dto.put("statusLabel", validityStatusLabel(row.getStatus()));
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }
}
