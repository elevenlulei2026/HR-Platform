package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeRewardEntity;
import com.hrplatform.core.employee.EmployeeRewardMapper;
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
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 奖励记录批管。业务键：同工号 + 奖励类型 + 生效日期 → 更新，否则新建。
 */
@Component
public class RewardArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "rewards";

  private static final String PC_REWARD_TYPE = "REWARD_TYPE";
  private static final String DICT_PAYMENT = "REWARD_PAYMENT_METHOD";

  private static final String[] HEADERS = {
      "工号*", "奖励类型*", "级别", "生效日期", "归档日期", "见证人",
      "金额", "发放方式", "颁发单位", "文号", "备注描述"
  };

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeRewardMapper rewardMapper;

  public RewardArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeRewardMapper rewardMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.rewardMapper = rewardMapper;
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

    LambdaQueryWrapper<EmployeeRewardEntity> qw =
        new LambdaQueryWrapper<EmployeeRewardEntity>()
            .orderByDesc(EmployeeRewardEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeRewardEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = rewardMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeRewardEntity> records = rewardMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeRewardEntity::getEmployeeId).toList()
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
    EmployeeRewardEntity created = archiveService.createReward(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeRewardEntity current = rewardMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("奖励记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeRewardEntity updated = archiveService.updateReward(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeRewardEntity current = rewardMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("奖励记录不存在");
    archiveService.deleteReward(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("奖励记录");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 14 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("特殊嘉奖");
      sample.createCell(2).setCellValue("一等");
      sample.createCell(3).setCellValue("2024-06-01");
      sample.createCell(4).setCellValue("");
      sample.createCell(5).setCellValue("");
      sample.createCell(6).setCellValue("1000");
      sample.createCell(7).setCellValue("工资发放");
      sample.createCell(8).setCellValue("人力资源部");
      sample.createCell(9).setCellValue("HR-R-2024-01");
      sample.createCell(10).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、奖励类型*：必填；可填名称或编码");
      hint.createRow(2).createCell(0).setCellValue("级别：有二级选项时必填（如特殊嘉奖→一等/二等…）；一般奖励无级别，请留空");
      hint.createRow(3).createCell(0).setCellValue("发放方式：工资发放 / 现金发放（或对应编码）");
      hint.createRow(4).createCell(0).setCellValue("业务键：同工号 + 奖励类型 + 生效日期 → 更新，否则新建");
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
      Sheet sheet = wb.createSheet("奖励记录");
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
        row.createCell(8).setCellValue(str(item.get("issuingOrg")));
        row.createCell(9).setCellValue(str(item.get("documentNo")));
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
        PC_REWARD_TYPE, support.cell(row, 1), null, "奖励类型"
    );
    if (type == null || type.isBlank()) throw new RowImportException("奖励类型", "奖励类型不能为空");
    String level = support.resolveOptionalParentChildChildCode(
        PC_REWARD_TYPE, support.cell(row, 2), type, "级别"
    );
    LocalDate effectiveDate = parseDate(support.cell(row, 3), "生效日期");

    EmployeeRewardEntity entity = new EmployeeRewardEntity();
    entity.setType(type);
    entity.setLevel(level);
    entity.setEffectiveDate(effectiveDate);
    entity.setArchiveDate(parseDate(support.cell(row, 4), "归档日期"));
    entity.setWitness(blankToNull(support.cell(row, 5)));
    entity.setAmount(parseFee(support.cell(row, 6), "金额"));
    entity.setPaymentMethod(support.resolveDictCode(DICT_PAYMENT, blankToNull(support.cell(row, 7)), "发放方式"));
    entity.setIssuingOrg(blankToNull(support.cell(row, 8)));
    entity.setDocumentNo(blankToNull(support.cell(row, 9)));
    entity.setDescription(blankToNull(support.cell(row, 10)));

    EmployeeRewardEntity existing = findExisting(employee.getId(), type, effectiveDate);
    if (existing != null) {
      archiveService.updateReward(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createReward(employee.getId(), entity);
    }
  }

  private EmployeeRewardEntity findExisting(long employeeId, String type, LocalDate effectiveDate) {
    LambdaQueryWrapper<EmployeeRewardEntity> qw =
        new LambdaQueryWrapper<EmployeeRewardEntity>()
            .eq(EmployeeRewardEntity::getEmployeeId, employeeId)
            .eq(EmployeeRewardEntity::getType, type)
            .orderByDesc(EmployeeRewardEntity::getId)
            .last("LIMIT 1");
    if (effectiveDate == null) {
      qw.and(w -> w.isNull(EmployeeRewardEntity::getEffectiveDate));
    } else {
      qw.eq(EmployeeRewardEntity::getEffectiveDate, effectiveDate);
    }
    return rewardMapper.selectOne(qw);
  }

  private EmployeeRewardEntity mapEntity(Map<String, Object> body) {
    EmployeeRewardEntity entity = new EmployeeRewardEntity();
    String typeRaw = str(body.get("type"));
    if (typeRaw.isBlank()) throw new IllegalArgumentException("奖励类型不能为空");
    String type;
    try {
      type = support.resolveParentChildCode(PC_REWARD_TYPE, typeRaw, null, "奖励类型");
    } catch (RowImportException e) {
      throw new IllegalArgumentException(e.getMessage());
    }
    if (type == null || type.isBlank()) throw new IllegalArgumentException("奖励类型不能为空");
    entity.setType(type);
    try {
      entity.setLevel(support.resolveOptionalParentChildChildCode(
          PC_REWARD_TYPE, str(body.get("level")), type, "级别"
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
        entity.setPaymentMethod(support.resolveDictCode(DICT_PAYMENT, paymentRaw, "发放方式"));
      } catch (RowImportException e) {
        throw new IllegalArgumentException(e.getMessage());
      }
    } else {
      entity.setPaymentMethod(null);
    }
    entity.setIssuingOrg(blankToNull(str(body.get("issuingOrg"))));
    entity.setDocumentNo(blankToNull(str(body.get("documentNo"))));
    entity.setDescription(blankToNull(str(body.get("description"))));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeRewardEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    dto.put("typeLabel", support.parentChildDisplayName(PC_REWARD_TYPE, row.getType()));
    dto.put("levelLabel", support.parentChildDisplayName(PC_REWARD_TYPE, row.getLevel()));
    support.putDictLabel(dto, "paymentMethod", DICT_PAYMENT, row.getPaymentMethod());
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }

  private static String labelOrCode(Map<String, Object> item, String key) {
    String label = str(item.get(key + "Label"));
    return label.isBlank() ? str(item.get(key)) : label;
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
