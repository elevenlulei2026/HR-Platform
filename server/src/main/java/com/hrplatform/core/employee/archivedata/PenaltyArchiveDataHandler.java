package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeePenaltyEntity;
import com.hrplatform.core.employee.EmployeePenaltyMapper;
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
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalDecimal;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseYesNo;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 惩处记录批管。业务键：同工号 + 惩处类型 + 生效日期 → 更新，否则新建。
 */
@Component
public class PenaltyArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "penalties";

  private static final String PC_PENALTY_TYPE = "PENALTY_TYPE";
  private static final String DICT_PAYMENT = "PENALTY_PAYMENT_METHOD";

  private static final String[] HEADERS = {
      "工号*", "惩处类型*", "惩处类别", "生效日期", "归档日期", "见证人",
      "金额", "扣款方式", "涉及赔偿", "发文单位", "处罚描述"
  };

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeePenaltyMapper penaltyMapper;

  public PenaltyArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeePenaltyMapper penaltyMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.penaltyMapper = penaltyMapper;
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

    LambdaQueryWrapper<EmployeePenaltyEntity> qw =
        new LambdaQueryWrapper<EmployeePenaltyEntity>()
            .orderByDesc(EmployeePenaltyEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeePenaltyEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = penaltyMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeePenaltyEntity> records = penaltyMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeePenaltyEntity::getEmployeeId).toList()
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
    EmployeePenaltyEntity created = archiveService.createPenalty(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeePenaltyEntity current = penaltyMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("惩处记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeePenaltyEntity updated = archiveService.updatePenalty(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeePenaltyEntity current = penaltyMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("惩处记录不存在");
    archiveService.deletePenalty(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("惩处记录");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 14 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("行政处罚");
      sample.createCell(2).setCellValue("警告");
      sample.createCell(3).setCellValue("2024-03-01");
      sample.createCell(4).setCellValue("");
      sample.createCell(5).setCellValue("");
      sample.createCell(6).setCellValue("");
      sample.createCell(7).setCellValue("");
      sample.createCell(8).setCellValue("否");
      sample.createCell(9).setCellValue("人力资源部");
      sample.createCell(10).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、惩处类型*：必填；可填名称或编码");
      hint.createRow(2).createCell(0).setCellValue("惩处类别：有二级选项时必填（如行政处罚→警告/记过…）；经济处罚无类别，请留空");
      hint.createRow(3).createCell(0).setCellValue("扣款方式：填写字典名称或编码；涉及赔偿：是/否");
      hint.createRow(4).createCell(0).setCellValue("业务键：同工号 + 惩处类型 + 生效日期 → 更新，否则新建");
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
      Sheet sheet = wb.createSheet("惩处记录");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 14 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(labelOrCode(item, "type"));
        row.createCell(2).setCellValue(labelOrCode(item, "level"));
        row.createCell(3).setCellValue(str(item.get("effectiveDate")));
        row.createCell(4).setCellValue(str(item.get("archiveDate")));
        row.createCell(5).setCellValue(str(item.get("witness")));
        row.createCell(6).setCellValue(str(item.get("amount")));
        row.createCell(7).setCellValue(labelOrCode(item, "paymentMethod"));
        Object involves = item.get("involvesCompensation");
        row.createCell(8).setCellValue(
            Boolean.TRUE.equals(involves) || "true".equalsIgnoreCase(str(involves)) ? "是" : "否"
        );
        row.createCell(9).setCellValue(str(item.get("issuingOrg")));
        row.createCell(10).setCellValue(str(item.get("description")));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private void upsertRow(Row row) {
    EmployeeEntity employee = support.requireByEmployeeNoForImport(support.cell(row, 0));
    String type = support.resolveParentChildCode(
        PC_PENALTY_TYPE, support.cell(row, 1), null, "惩处类型"
    );
    if (type == null || type.isBlank()) throw new RowImportException("惩处类型", "惩处类型不能为空");
    String level = support.resolveOptionalParentChildChildCode(
        PC_PENALTY_TYPE, support.cell(row, 2), type, "惩处类别"
    );
    LocalDate effectiveDate = parseDate(support.cell(row, 3), "生效日期");

    EmployeePenaltyEntity entity = new EmployeePenaltyEntity();
    entity.setType(type);
    entity.setLevel(level);
    entity.setEffectiveDate(effectiveDate);
    entity.setArchiveDate(parseDate(support.cell(row, 4), "归档日期"));
    entity.setWitness(blankToNull(support.cell(row, 5)));
    entity.setAmount(parseFee(support.cell(row, 6), "金额"));
    entity.setPaymentMethod(support.resolveDictCode(DICT_PAYMENT, blankToNull(support.cell(row, 7)), "扣款方式"));
    Boolean involves = parseYesNo(support.cell(row, 8), "涉及赔偿");
    entity.setInvolvesCompensation(involves != null ? involves : Boolean.FALSE);
    entity.setIssuingOrg(blankToNull(support.cell(row, 9)));
    entity.setDescription(blankToNull(support.cell(row, 10)));

    EmployeePenaltyEntity existing = findExisting(employee.getId(), type, effectiveDate);
    if (existing != null) {
      archiveService.updatePenalty(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createPenalty(employee.getId(), entity);
    }
  }

  private EmployeePenaltyEntity findExisting(long employeeId, String type, LocalDate effectiveDate) {
    LambdaQueryWrapper<EmployeePenaltyEntity> qw =
        new LambdaQueryWrapper<EmployeePenaltyEntity>()
            .eq(EmployeePenaltyEntity::getEmployeeId, employeeId)
            .eq(EmployeePenaltyEntity::getType, type)
            .orderByDesc(EmployeePenaltyEntity::getId)
            .last("LIMIT 1");
    if (effectiveDate == null) {
      qw.and(w -> w.isNull(EmployeePenaltyEntity::getEffectiveDate));
    } else {
      qw.eq(EmployeePenaltyEntity::getEffectiveDate, effectiveDate);
    }
    return penaltyMapper.selectOne(qw);
  }

  private EmployeePenaltyEntity mapEntity(Map<String, Object> body) {
    EmployeePenaltyEntity entity = new EmployeePenaltyEntity();
    String typeRaw = str(body.get("type"));
    if (typeRaw.isBlank()) throw new IllegalArgumentException("惩处类型不能为空");
    String type;
    try {
      type = support.resolveParentChildCode(PC_PENALTY_TYPE, typeRaw, null, "惩处类型");
    } catch (RowImportException e) {
      throw new IllegalArgumentException(e.getMessage());
    }
    if (type == null || type.isBlank()) throw new IllegalArgumentException("惩处类型不能为空");
    entity.setType(type);
    try {
      entity.setLevel(support.resolveOptionalParentChildChildCode(
          PC_PENALTY_TYPE, str(body.get("level")), type, "惩处类别"
      ));
    } catch (RowImportException e) {
      throw new IllegalArgumentException(e.getMessage());
    }
    entity.setEffectiveDate(parseOptionalDate(body.get("effectiveDate"), "生效日期"));
    entity.setArchiveDate(parseOptionalDate(body.get("archiveDate"), "归档日期"));
    entity.setWitness(blankToNull(str(body.get("witness"))));
    entity.setAmount(parseOptionalDecimal(body.get("amount"), "金额"));
    String paymentRaw = blankToNull(str(body.get("paymentMethod")));
    if (paymentRaw != null) {
      try {
        entity.setPaymentMethod(support.resolveDictCode(DICT_PAYMENT, paymentRaw, "扣款方式"));
      } catch (RowImportException e) {
        throw new IllegalArgumentException(e.getMessage());
      }
    } else {
      entity.setPaymentMethod(null);
    }
    entity.setInvolvesCompensation(parseBooleanBody(body.get("involvesCompensation"), "涉及赔偿"));
    entity.setIssuingOrg(blankToNull(str(body.get("issuingOrg"))));
    entity.setDescription(blankToNull(str(body.get("description"))));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeePenaltyEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    dto.put("typeLabel", support.parentChildDisplayName(PC_PENALTY_TYPE, row.getType()));
    dto.put("levelLabel", support.parentChildDisplayName(PC_PENALTY_TYPE, row.getLevel()));
    support.putDictLabel(dto, "paymentMethod", DICT_PAYMENT, row.getPaymentMethod());
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }

  private static String labelOrCode(Map<String, Object> item, String key) {
    String label = str(item.get(key + "Label"));
    return label.isBlank() ? str(item.get(key)) : label;
  }

  private static Boolean parseBooleanBody(Object raw, String label) {
    if (raw instanceof Boolean b) return b;
    if (raw == null || str(raw).isBlank()) return Boolean.FALSE;
    Boolean parsed = parseYesNo(str(raw), label);
    return parsed != null ? parsed : Boolean.FALSE;
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
