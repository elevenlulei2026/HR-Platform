package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeSocialInsuranceEntity;
import com.hrplatform.core.employee.EmployeeSocialInsuranceMapper;
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
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.blankToNull;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.dictDisplayName;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalDecimal;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseYesNo;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 社保公积金批管。业务键：同工号（每人仅一条）→ 已存在则更新，否则新建。
 */
@Component
public class SocialInsuranceArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "social-insurances";

  private static final String[] HEADERS = {
      "工号*", "社保账号", "社保基数", "公积金账号", "公积金基数", "公司", "参保地区", "公司代缴"
  };
  private static final String DICT_COMPANY = "PAYROLL_COMPANY";
  private static final String DICT_REGION = "INSURANCE_REGION";

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeSocialInsuranceMapper socialInsuranceMapper;
  private final FieldCryptoService fieldCryptoService;

  public SocialInsuranceArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeSocialInsuranceMapper socialInsuranceMapper,
      FieldCryptoService fieldCryptoService
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.socialInsuranceMapper = socialInsuranceMapper;
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

    LambdaQueryWrapper<EmployeeSocialInsuranceEntity> qw =
        new LambdaQueryWrapper<EmployeeSocialInsuranceEntity>()
            .orderByDesc(EmployeeSocialInsuranceEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeSocialInsuranceEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = socialInsuranceMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeSocialInsuranceEntity> records = socialInsuranceMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeSocialInsuranceEntity::getEmployeeId).toList()
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
    EmployeeSocialInsuranceEntity entity = mapEntity(body);
    EmployeeSocialInsuranceEntity existing = findExisting(employee.getId());
    EmployeeSocialInsuranceEntity saved;
    if (existing != null) {
      saved = archiveService.updateSocialInsurance(employee.getId(), existing.getId(), entity);
    } else {
      saved = archiveService.createSocialInsurance(employee.getId(), entity);
    }
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(saved, employee, orgNameMap, revealSensitive);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeSocialInsuranceEntity current = socialInsuranceMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("社保公积金记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeSocialInsuranceEntity updated =
        archiveService.updateSocialInsurance(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap, revealSensitive);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeSocialInsuranceEntity current = socialInsuranceMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("社保公积金记录不存在");
    archiveService.deleteSocialInsurance(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("社保公积金");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 16 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("110101199001011234");
      sample.createCell(2).setCellValue("10000");
      sample.createCell(3).setCellValue("1234567890");
      sample.createCell(4).setCellValue("10000");
      sample.createCell(5).setCellValue(support.sampleDictLabel(DICT_COMPANY, "LE-DEFAULT"));
      sample.createCell(6).setCellValue(support.sampleDictLabel(DICT_REGION, "BJ"));
      sample.createCell(7).setCellValue("是");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*：必填；每人仅一条社保公积金记录");
      hint.createRow(2).createCell(0).setCellValue("公司、参保地区：填字典名称或编码");
      hint.createRow(3).createCell(0).setCellValue("公司代缴：是/否");
      hint.createRow(4).createCell(0).setCellValue("业务键：同工号已存在则更新，否则新建");
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
    Map<String, String> companyLabels = support.employeeService().dictLabels(DICT_COMPANY);
    Map<String, String> regionLabels = support.employeeService().dictLabels(DICT_REGION);
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("社保公积金");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 16 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("socialSecurityNo")));
        row.createCell(2).setCellValue(str(item.get("socialBase")));
        row.createCell(3).setCellValue(str(item.get("housingFundNo")));
        row.createCell(4).setCellValue(str(item.get("housingBase")));
        row.createCell(5).setCellValue(dictDisplayName(companyLabels, str(item.get("company"))));
        row.createCell(6).setCellValue(dictDisplayName(regionLabels, str(item.get("insuranceRegion"))));
        Object payroll = item.get("isCompanyPayroll");
        row.createCell(7).setCellValue(
            Boolean.TRUE.equals(payroll) || "true".equalsIgnoreCase(str(payroll)) ? "是" : "否"
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
    EmployeeSocialInsuranceEntity entity = new EmployeeSocialInsuranceEntity();
    entity.setSocialSecurityNo(blankToNull(support.cell(row, 1)));
    entity.setSocialBase(parseDecimalCell(support.cell(row, 2), "社保基数"));
    entity.setHousingFundNo(blankToNull(support.cell(row, 3)));
    entity.setHousingBase(parseDecimalCell(support.cell(row, 4), "公积金基数"));
    entity.setCompany(support.resolveDictCode(DICT_COMPANY, blankToNull(support.cell(row, 5)), "公司"));
    entity.setInsuranceRegion(support.resolveDictCode(DICT_REGION, blankToNull(support.cell(row, 6)), "参保地区"));
    Boolean payroll = parseYesNo(support.cell(row, 7), "公司代缴");
    entity.setIsCompanyPayroll(payroll != null ? payroll : Boolean.FALSE);

    EmployeeSocialInsuranceEntity existing = findExisting(employee.getId());
    if (existing != null) {
      archiveService.updateSocialInsurance(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createSocialInsurance(employee.getId(), entity);
    }
  }

  private EmployeeSocialInsuranceEntity findExisting(long employeeId) {
    return socialInsuranceMapper.selectOne(
        new LambdaQueryWrapper<EmployeeSocialInsuranceEntity>()
            .eq(EmployeeSocialInsuranceEntity::getEmployeeId, employeeId)
            .orderByDesc(EmployeeSocialInsuranceEntity::getId)
            .last("LIMIT 1")
    );
  }

  private EmployeeSocialInsuranceEntity mapEntity(Map<String, Object> body) {
    EmployeeSocialInsuranceEntity entity = new EmployeeSocialInsuranceEntity();
    String socialNo = str(body.get("socialSecurityNo"));
    if (!socialNo.isBlank()) {
      entity.setSocialSecurityNo(socialNo.trim());
    }
    entity.setSocialBase(parseOptionalDecimal(body.get("socialBase"), "社保基数"));
    entity.setHousingFundNo(blankToNull(str(body.get("housingFundNo"))));
    entity.setHousingBase(parseOptionalDecimal(body.get("housingBase"), "公积金基数"));
    entity.setCompany(blankToNull(str(body.get("company"))));
    entity.setInsuranceRegion(blankToNull(str(body.get("insuranceRegion"))));
    entity.setIsCompanyPayroll(parseBooleanBody(body.get("isCompanyPayroll"), "公司代缴"));
    return entity;
  }

  private static BigDecimal parseDecimalCell(String raw, String field) {
    if (raw == null || raw.isBlank()) return null;
    try {
      return new BigDecimal(raw.trim());
    } catch (NumberFormatException e) {
      throw new RowImportException(field, "须为数字");
    }
  }

  private static Boolean parseBooleanBody(Object raw, String label) {
    if (raw instanceof Boolean b) return b;
    if (raw == null || str(raw).isBlank()) return Boolean.FALSE;
    Boolean parsed = parseYesNo(str(raw), label);
    return parsed != null ? parsed : Boolean.FALSE;
  }

  private Map<String, Object> toRow(
      EmployeeSocialInsuranceEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap,
      boolean revealSensitive
  ) {
    Map<String, Object> dto =
        EmployeeArchiveResponseMapper.toSocialInsuranceMap(row, fieldCryptoService, revealSensitive);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }
}
