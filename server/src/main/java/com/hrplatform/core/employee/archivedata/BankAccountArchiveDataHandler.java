package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeBankAccountEntity;
import com.hrplatform.core.employee.EmployeeBankAccountMapper;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ExportFilter;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ImportResult;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ListFilter;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.PageResult;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.RowError;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.RowImportException;
import com.hrplatform.platform.crypto.FieldCryptoService;
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
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.dictDisplayName;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseYesNo;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 银行卡批管。业务键：同工号 + 账号 → 更新，否则新建。
 */
@Component
public class BankAccountArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "bank-accounts";

  private static final String[] HEADERS = {
      "工号*", "账户类型", "国家/地区", "银行", "支行", "账号*", "户名", "币种", "联行号", "是否主账户"
  };
  private static final String DICT_ACCOUNT_TYPE = "BANK_ACCOUNT_TYPE";
  private static final String DICT_COUNTRY = "COUNTRY_REGION";
  private static final String DICT_BANK = "BANK_ID";
  private static final String DICT_BRANCH = "BRANCH_ID";
  private static final String DICT_CURRENCY = "CURRENCY";

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeBankAccountMapper bankAccountMapper;
  private final FieldCryptoService fieldCryptoService;

  public BankAccountArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeBankAccountMapper bankAccountMapper,
      FieldCryptoService fieldCryptoService
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.bankAccountMapper = bankAccountMapper;
    this.fieldCryptoService = fieldCryptoService;
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

    LambdaQueryWrapper<EmployeeBankAccountEntity> qw =
        new LambdaQueryWrapper<EmployeeBankAccountEntity>()
            .orderByDesc(EmployeeBankAccountEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeBankAccountEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = bankAccountMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeBankAccountEntity> records = bankAccountMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeBankAccountEntity::getEmployeeId).toList()
    );
    Map<Long, String> orgNameMap = support.loadOrgNames(empMap.keySet());

    List<Map<String, Object>> items = records.stream()
        .map(row -> toRow(row, empMap.get(row.getEmployeeId()), orgNameMap, filter.revealSensitive()))
        .toList();
    return new PageResult<>(items, total == null ? 0 : total);
  }

  @Override
  @Transactional
  public Map<String, Object> create(Map<String, Object> body, boolean revealSensitive) {
    EmployeeEntity employee = support.resolveEmployeeFromBody(body);
    EmployeeBankAccountEntity created =
        archiveService.createBankAccount(employee.getId(), mapEntity(body, true));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap, revealSensitive);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeBankAccountEntity current = bankAccountMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("银行卡记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeBankAccountEntity updated =
        archiveService.updateBankAccount(employee.getId(), id, mapEntity(body, false));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap, revealSensitive);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeBankAccountEntity current = bankAccountMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("银行卡记录不存在");
    archiveService.deleteBankAccount(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("银行卡");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 16 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue(support.sampleDictLabel(DICT_ACCOUNT_TYPE, "SALARY"));
      sample.createCell(2).setCellValue(support.sampleDictLabel(DICT_COUNTRY, "CN"));
      sample.createCell(3).setCellValue(support.sampleDictLabel(DICT_BANK, ""));
      sample.createCell(4).setCellValue(support.sampleDictLabel(DICT_BRANCH, ""));
      sample.createCell(5).setCellValue("6222021234567890123");
      sample.createCell(6).setCellValue("张三");
      sample.createCell(7).setCellValue(support.sampleDictLabel(DICT_CURRENCY, "CNY"));
      sample.createCell(8).setCellValue("");
      sample.createCell(9).setCellValue("是");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、账号*：必填");
      hint.createRow(2).createCell(0).setCellValue("账户类型/国家/银行/支行/币种：填字典名称或编码");
      hint.createRow(3).createCell(0).setCellValue("是否主账户：是/否（设为主账户会自动取消该员工其他主账户）");
      hint.createRow(4).createCell(0).setCellValue("业务键：同工号 + 账号 → 更新，否则新建");
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
    Map<String, String> accountTypeLabels = support.employeeService().dictLabels(DICT_ACCOUNT_TYPE);
    Map<String, String> countryLabels = support.employeeService().dictLabels(DICT_COUNTRY);
    Map<String, String> bankLabels = support.employeeService().dictLabels(DICT_BANK);
    Map<String, String> branchLabels = support.employeeService().dictLabels(DICT_BRANCH);
    Map<String, String> currencyLabels = support.employeeService().dictLabels(DICT_CURRENCY);
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("银行卡");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 16 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(dictDisplayName(accountTypeLabels, str(item.get("accountType"))));
        row.createCell(2).setCellValue(dictDisplayName(countryLabels, str(item.get("countryCode"))));
        row.createCell(3).setCellValue(dictDisplayName(bankLabels, str(item.get("bankId"))));
        row.createCell(4).setCellValue(dictDisplayName(branchLabels, str(item.get("branchId"))));
        row.createCell(5).setCellValue(str(item.get("accountNo")));
        row.createCell(6).setCellValue(str(item.get("accountName")));
        row.createCell(7).setCellValue(dictDisplayName(currencyLabels, str(item.get("currencyCode"))));
        row.createCell(8).setCellValue(str(item.get("cnapsCode")));
        Object primary = item.get("isPrimary");
        row.createCell(9).setCellValue(
            Boolean.TRUE.equals(primary) || "true".equalsIgnoreCase(str(primary)) ? "是" : "否"
        );
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private void upsertRow(Row row) {
    EmployeeEntity employee = support.requireByEmployeeNoForImport(support.cell(row, 0));
    String accountNo = support.cell(row, 5);
    if (accountNo.isBlank()) throw new RowImportException("账号", "账号不能为空");

    EmployeeBankAccountEntity entity = new EmployeeBankAccountEntity();
    entity.setAccountType(support.resolveDictCode(DICT_ACCOUNT_TYPE, blankToNull(support.cell(row, 1)), "账户类型"));
    entity.setCountryCode(support.resolveDictCode(DICT_COUNTRY, blankToNull(support.cell(row, 2)), "国家/地区"));
    entity.setBankId(support.resolveDictCode(DICT_BANK, blankToNull(support.cell(row, 3)), "银行"));
    entity.setBranchId(support.resolveDictCode(DICT_BRANCH, blankToNull(support.cell(row, 4)), "支行"));
    entity.setAccountNo(accountNo.trim());
    entity.setAccountName(blankToNull(support.cell(row, 6)));
    entity.setCurrencyCode(support.resolveDictCode(DICT_CURRENCY, blankToNull(support.cell(row, 7)), "币种"));
    entity.setCnapsCode(blankToNull(support.cell(row, 8)));
    Boolean isPrimary = parseYesNo(support.cell(row, 9), "是否主账户");
    entity.setIsPrimary(isPrimary != null ? isPrimary : Boolean.FALSE);

    EmployeeBankAccountEntity existing = findExisting(employee.getId(), accountNo.trim());
    if (existing != null) {
      archiveService.updateBankAccount(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createBankAccount(employee.getId(), entity);
    }
  }

  private EmployeeBankAccountEntity findExisting(long employeeId, String plainAccountNo) {
    List<EmployeeBankAccountEntity> list = bankAccountMapper.selectList(
        new LambdaQueryWrapper<EmployeeBankAccountEntity>()
            .eq(EmployeeBankAccountEntity::getEmployeeId, employeeId)
    );
    for (EmployeeBankAccountEntity row : list) {
      String plain = fieldCryptoService.decrypt(row.getAccountNo());
      if (plainAccountNo.equals(plain)) {
        return row;
      }
    }
    return null;
  }

  private EmployeeBankAccountEntity mapEntity(Map<String, Object> body, boolean requireAccountNo) {
    EmployeeBankAccountEntity entity = new EmployeeBankAccountEntity();
    entity.setAccountType(blankToNull(str(body.get("accountType"))));
    entity.setCountryCode(blankToNull(str(body.get("countryCode"))));
    entity.setBankId(blankToNull(str(body.get("bankId"))));
    entity.setBranchId(blankToNull(str(body.get("branchId"))));
    String accountNo = str(body.get("accountNo"));
    if (requireAccountNo && accountNo.isBlank()) {
      throw new IllegalArgumentException("账号不能为空");
    }
    if (!accountNo.isBlank()) {
      entity.setAccountNo(accountNo.trim());
    }
    entity.setAccountName(blankToNull(str(body.get("accountName"))));
    entity.setCurrencyCode(blankToNull(str(body.get("currencyCode"))));
    entity.setCnapsCode(blankToNull(str(body.get("cnapsCode"))));
    entity.setIsPrimary(parseBooleanBody(body.get("isPrimary"), "是否主账户"));
    return entity;
  }

  private static Boolean parseBooleanBody(Object raw, String label) {
    if (raw instanceof Boolean b) return b;
    if (raw == null || str(raw).isBlank()) return Boolean.FALSE;
    Boolean parsed = parseYesNo(str(raw), label);
    return parsed != null ? parsed : Boolean.FALSE;
  }

  private Map<String, Object> toRow(
      EmployeeBankAccountEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap,
      boolean revealSensitive
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toBankAccountMap(row, fieldCryptoService, revealSensitive);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }
}
