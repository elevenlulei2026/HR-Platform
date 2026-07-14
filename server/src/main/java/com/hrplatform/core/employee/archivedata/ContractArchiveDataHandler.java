package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeContractEntity;
import com.hrplatform.core.employee.EmployeeContractMapper;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.blankToNull;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalLong;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.resolveValidityStatus;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.validityStatusLabel;

/**
 * 合同信息批管。业务键：同工号 + 合同编号 → 更新，否则新建。
 */
@Component
public class ContractArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "contracts";

  private static final String[] HEADERS = {
      "工号*", "生效日期*", "合同编号*", "合同法人*", "操作类型*", "状态*",
      "合同类别*", "合同类别描述*", "开始日期*", "结束日期", "备注"
  };
  private static final String PC_CONTRACT_CATEGORY = "CONTRACT_CATEGORY";
  private static final Map<String, String> OPERATION_LABELS = new LinkedHashMap<>();

  static {
    OPERATION_LABELS.put("10", "新签");
    OPERATION_LABELS.put("20", "续签");
    OPERATION_LABELS.put("30", "变更");
    OPERATION_LABELS.put("40", "解除");
  }

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeContractMapper contractMapper;

  public ContractArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeContractMapper contractMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.contractMapper = contractMapper;
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

    LambdaQueryWrapper<EmployeeContractEntity> qw = new LambdaQueryWrapper<EmployeeContractEntity>()
        .orderByDesc(EmployeeContractEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeContractEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = contractMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeContractEntity> records = contractMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeContractEntity::getEmployeeId).toList()
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
    EmployeeContractEntity created = archiveService.createContract(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeContractEntity current = contractMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("合同记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeContractEntity updated = archiveService.updateContract(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeContractEntity current = contractMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("合同记录不存在");
    archiveService.deleteContract(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("合同信息");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 16 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("2024-01-01");
      sample.createCell(2).setCellValue("HT-2024-001");
      sample.createCell(3).setCellValue("示例法人");
      sample.createCell(4).setCellValue("新签");
      sample.createCell(5).setCellValue("有效");
      sample.createCell(6).setCellValue("");
      sample.createCell(7).setCellValue("");
      sample.createCell(8).setCellValue("2024-01-01");
      sample.createCell(9).setCellValue("2026-12-31");
      sample.createCell(10).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("带 * 为必填；合同法人填编码或名称");
      hint.createRow(2).createCell(0).setCellValue("操作类型：新签/续签/变更/解除 或 10/20/30/40");
      hint.createRow(3).createCell(0).setCellValue("状态：有效/无效 或 VALID/INVALID");
      hint.createRow(4).createCell(0).setCellValue("合同类别/描述：填父子值名称或编码（CONTRACT_CATEGORY）");
      hint.createRow(5).createCell(0).setCellValue("无固定期限合同（二级 120/150）结束日期可空");
      hint.createRow(6).createCell(0).setCellValue("业务键：同工号 + 合同编号 → 更新，否则新建");
      hint.setColumnWidth(0, 72 * 256);

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
      Sheet sheet = wb.createSheet("合同信息");
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
        row.createCell(2).setCellValue(str(item.get("contractCode")));
        String legal = str(item.get("legalEntityName"));
        if (legal.isBlank()) legal = str(item.get("legalEntityCode"));
        row.createCell(3).setCellValue(legal);
        row.createCell(4).setCellValue(operationLabel(str(item.get("operationType"))));
        row.createCell(5).setCellValue(validityStatusLabel(str(item.get("status"))));
        row.createCell(6).setCellValue(str(item.get("contractCategoryLabel")));
        if (str(item.get("contractCategoryLabel")).isBlank()) {
          row.getCell(6).setCellValue(support.parentChildDisplayName(
              PC_CONTRACT_CATEGORY, str(item.get("contractCategory"))
          ));
        }
        row.createCell(7).setCellValue(str(item.get("contractCategoryDescLabel")));
        if (str(item.get("contractCategoryDescLabel")).isBlank()) {
          row.getCell(7).setCellValue(support.parentChildDisplayName(
              PC_CONTRACT_CATEGORY, str(item.get("contractCategoryDesc"))
          ));
        }
        row.createCell(8).setCellValue(str(item.get("startDate")));
        row.createCell(9).setCellValue(str(item.get("endDate")));
        row.createCell(10).setCellValue(str(item.get("remark")));
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
    String contractCode = support.cell(row, 2);
    if (contractCode.isBlank()) throw new RowImportException("合同编号", "合同编号不能为空");
    Long legalEntityId = support.resolveLegalEntityId(support.cell(row, 3), "合同法人", true);
    String operationType = resolveOperationType(support.cell(row, 4));
    String status = resolveValidityStatus(support.cell(row, 5), "状态");
    if (status == null) throw new RowImportException("状态", "状态不能为空");
    String category = support.resolveParentChildCode(
        PC_CONTRACT_CATEGORY, support.cell(row, 6), null, "合同类别"
    );
    if (category == null || category.isBlank()) throw new RowImportException("合同类别", "合同类别不能为空");
    String categoryDesc = support.resolveParentChildCode(
        PC_CONTRACT_CATEGORY, support.cell(row, 7), category, "合同类别描述"
    );
    if (categoryDesc == null || categoryDesc.isBlank()) {
      throw new RowImportException("合同类别描述", "合同类别描述不能为空");
    }
    LocalDate startDate = parseDate(support.cell(row, 8), "开始日期");
    if (startDate == null) throw new RowImportException("开始日期", "开始日期不能为空");
    LocalDate endDate = parseDate(support.cell(row, 9), "结束日期");
    if (!isIndefinite(categoryDesc) && endDate == null) {
      throw new RowImportException("结束日期", "结束日期不能为空");
    }

    EmployeeContractEntity existing = findExisting(employee.getId(), contractCode.trim());
    EmployeeContractEntity entity = new EmployeeContractEntity();
    entity.setEffectiveStartDate(effectiveStart);
    entity.setContractCode(contractCode.trim());
    entity.setLegalEntityId(legalEntityId);
    entity.setOperationType(operationType);
    entity.setStatus(status);
    entity.setContractCategory(category);
    entity.setContractCategoryDesc(categoryDesc);
    entity.setStartDate(startDate);
    entity.setEndDate(endDate);
    entity.setRemark(blankToNull(support.cell(row, 10)));

    if (existing != null) {
      archiveService.updateContract(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createContract(employee.getId(), entity);
    }
  }

  private EmployeeContractEntity findExisting(long employeeId, String contractCode) {
    return contractMapper.selectOne(
        new LambdaQueryWrapper<EmployeeContractEntity>()
            .eq(EmployeeContractEntity::getEmployeeId, employeeId)
            .eq(EmployeeContractEntity::getContractCode, contractCode)
            .orderByDesc(EmployeeContractEntity::getId)
            .last("LIMIT 1")
    );
  }

  private EmployeeContractEntity mapEntity(Map<String, Object> body) {
    EmployeeContractEntity entity = new EmployeeContractEntity();
    entity.setEffectiveStartDate(parseOptionalDate(body.get("effectiveStartDate"), "生效日期"));
    if (entity.getEffectiveStartDate() == null) throw new IllegalArgumentException("生效日期不能为空");
    String contractCode = str(body.get("contractCode"));
    if (contractCode.isBlank()) throw new IllegalArgumentException("合同编号不能为空");
    entity.setContractCode(contractCode.trim());
    Long legalId = support.resolveLegalEntityIdFromBody(body.get("legalEntityId"));
    if (legalId == null) throw new IllegalArgumentException("请选择合同法人主体");
    entity.setLegalEntityId(legalId);
    String operationType = blankToNull(str(body.get("operationType")));
    if (operationType == null) throw new IllegalArgumentException("请选择操作类型");
    entity.setOperationType(operationType);
    String status = blankToNull(str(body.get("status")));
    if (status == null) throw new IllegalArgumentException("请选择状态");
    entity.setStatus(status);
    String category = blankToNull(str(body.get("contractCategory")));
    if (category == null) throw new IllegalArgumentException("请选择合同类别");
    entity.setContractCategory(category);
    String categoryDesc = blankToNull(str(body.get("contractCategoryDesc")));
    if (categoryDesc == null) throw new IllegalArgumentException("请选择合同类别描述");
    entity.setContractCategoryDesc(categoryDesc);
    entity.setStartDate(parseOptionalDate(body.get("startDate"), "开始日期"));
    if (entity.getStartDate() == null) throw new IllegalArgumentException("开始日期不能为空");
    entity.setEndDate(parseOptionalDate(body.get("endDate"), "结束日期"));
    if (!isIndefinite(categoryDesc) && entity.getEndDate() == null) {
      throw new IllegalArgumentException("结束日期不能为空");
    }
    entity.setFileAttachmentId(parseOptionalLong(body.get("fileAttachmentId"), "附件ID"));
    entity.setRemark(blankToNull(str(body.get("remark"))));
    entity.setEffectiveEndDate(parseOptionalDate(body.get("effectiveEndDate"), "生效结束日期"));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeContractEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    support.attachLegalEntityDisplay(dto, row.getLegalEntityId());
    dto.put("operationTypeLabel", operationLabel(row.getOperationType()));
    dto.put("statusLabel", validityStatusLabel(row.getStatus()));
    dto.put(
        "contractCategoryLabel",
        support.parentChildDisplayName(PC_CONTRACT_CATEGORY, row.getContractCategory())
    );
    dto.put(
        "contractCategoryDescLabel",
        support.parentChildDisplayName(PC_CONTRACT_CATEGORY, row.getContractCategoryDesc())
    );
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }

  private static boolean isIndefinite(String contractCategoryDesc) {
    return "120".equals(contractCategoryDesc) || "150".equals(contractCategoryDesc);
  }

  private static String resolveOperationType(String raw) {
    if (raw == null || raw.isBlank()) throw new RowImportException("操作类型", "操作类型不能为空");
    String input = raw.trim();
    if (OPERATION_LABELS.containsKey(input)) return input;
    for (Map.Entry<String, String> e : OPERATION_LABELS.entrySet()) {
      if (e.getValue().equals(input)) return e.getKey();
    }
    throw new RowImportException("操作类型", "无法识别的操作类型: " + input);
  }

  private static String operationLabel(String code) {
    if (code == null || code.isBlank()) return "";
    String trimmed = code.trim();
    return OPERATION_LABELS.getOrDefault(trimmed, trimmed);
  }
}
