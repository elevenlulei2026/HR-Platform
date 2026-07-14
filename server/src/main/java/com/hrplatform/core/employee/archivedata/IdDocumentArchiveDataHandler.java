package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeIdDocumentEntity;
import com.hrplatform.core.employee.EmployeeIdDocumentMapper;
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
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseYesNo;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 证件信息批管 —— <b>通用开发模板的参考实现</b>。
 * <p>
 * 接入新 resource 时按本类拆分：分页查询 → CRUD（委托 ArchiveService）→ 模板/导入/导出。
 * 详见 {@code docs/档案数据批管开发模板.md}。
 */
@Component
public class IdDocumentArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "id-documents";

  private static final String[] HEADERS = {
      "工号*", "国家/地区", "证件类型", "证件号码*", "生效日期", "失效日期", "是否主证件"
  };
  private static final String DICT_COUNTRY_REGION = "COUNTRY_REGION";
  private static final String DICT_ID_TYPE = "ID_TYPE";

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeIdDocumentMapper idDocumentMapper;
  private final FieldCryptoService fieldCryptoService;

  public IdDocumentArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeIdDocumentMapper idDocumentMapper,
      FieldCryptoService fieldCryptoService
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.idDocumentMapper = idDocumentMapper;
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

    LambdaQueryWrapper<EmployeeIdDocumentEntity> qw = new LambdaQueryWrapper<EmployeeIdDocumentEntity>()
        .orderByDesc(EmployeeIdDocumentEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeIdDocumentEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = idDocumentMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeIdDocumentEntity> records = idDocumentMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeIdDocumentEntity::getEmployeeId).toList()
    );
    Map<Long, String> orgNameMap = support.loadOrgNames(empMap.keySet());

    List<Map<String, Object>> items = records.stream()
        .map(doc -> toRow(doc, empMap.get(doc.getEmployeeId()), orgNameMap, filter.revealSensitive()))
        .toList();
    return new PageResult<>(items, total == null ? 0 : total);
  }

  @Override
  @Transactional
  public Map<String, Object> create(Map<String, Object> body, boolean revealSensitive) {
    EmployeeEntity employee = support.resolveEmployeeFromBody(body);
    EmployeeIdDocumentEntity created = archiveService.createIdDocument(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap, revealSensitive);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeIdDocumentEntity current = idDocumentMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("证件记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeIdDocumentEntity updated = archiveService.updateIdDocument(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap, revealSensitive);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeIdDocumentEntity current = idDocumentMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("证件记录不存在");
    archiveService.deleteIdDocument(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("证件信息");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 18 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue(support.sampleDictLabel(DICT_COUNTRY_REGION, "CN"));
      sample.createCell(2).setCellValue(support.sampleDictLabel(DICT_ID_TYPE, "ID_CARD"));
      sample.createCell(3).setCellValue("110101199001011234");
      sample.createCell(4).setCellValue("2020-01-01");
      sample.createCell(5).setCellValue("2030-01-01");
      sample.createCell(6).setCellValue("是");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*：必填，须已在花名册存在");
      hint.createRow(2).createCell(0).setCellValue("国家/地区、证件类型：填写字典名称（推荐）或编码均可");
      hint.createRow(3).createCell(0).setCellValue("证件号码*：必填");
      hint.createRow(4).createCell(0).setCellValue("是否主证件：是/否、true/false、1/0");
      hint.createRow(5).createCell(0).setCellValue("业务键：同工号+证件类型已存在则更新，否则新建");
      hint.createRow(6).createCell(0).setCellValue("导出文件中的国家/地区、证件类型为名称，可直接改后回导");
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
    Map<String, String> countryLabels = support.employeeService().dictLabels(DICT_COUNTRY_REGION);
    Map<String, String> idTypeLabels = support.employeeService().dictLabels(DICT_ID_TYPE);
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("证件信息");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 18 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(dictDisplayName(countryLabels, str(item.get("countryRegion"))));
        row.createCell(2).setCellValue(dictDisplayName(idTypeLabels, str(item.get("idType"))));
        row.createCell(3).setCellValue(str(item.get("idNumber")));
        row.createCell(4).setCellValue(str(item.get("validFrom")));
        row.createCell(5).setCellValue(str(item.get("validTo")));
        Object primary = item.get("isPrimary");
        row.createCell(6).setCellValue(
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
    String employeeNo = support.cell(row, 0);
    EmployeeEntity employee = support.requireByEmployeeNoForImport(employeeNo);

    String countryRegion = support.resolveDictCode(DICT_COUNTRY_REGION, blankToNull(support.cell(row, 1)), "国家/地区");
    String idType = support.resolveDictCode(DICT_ID_TYPE, blankToNull(support.cell(row, 2)), "证件类型");
    String idNumber = support.cell(row, 3);
    if (idNumber.isBlank()) throw new RowImportException("证件号码", "证件号码不能为空");
    LocalDate validFrom = parseDate(support.cell(row, 4), "生效日期");
    LocalDate validTo = parseDate(support.cell(row, 5), "失效日期");
    Boolean isPrimary = parseYesNo(support.cell(row, 6), "是否主证件");

    EmployeeIdDocumentEntity existing = findExisting(employee.getId(), idType);
    EmployeeIdDocumentEntity entity = new EmployeeIdDocumentEntity();
    entity.setCountryRegion(countryRegion);
    entity.setIdType(idType);
    entity.setIdNumber(idNumber.trim());
    entity.setValidFrom(validFrom);
    entity.setValidTo(validTo);
    entity.setIsPrimary(isPrimary != null ? isPrimary : Boolean.FALSE);

    if (existing != null) {
      archiveService.updateIdDocument(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createIdDocument(employee.getId(), entity);
    }
  }

  private EmployeeIdDocumentEntity findExisting(long employeeId, String idType) {
    LambdaQueryWrapper<EmployeeIdDocumentEntity> qw = new LambdaQueryWrapper<EmployeeIdDocumentEntity>()
        .eq(EmployeeIdDocumentEntity::getEmployeeId, employeeId)
        .orderByDesc(EmployeeIdDocumentEntity::getId)
        .last("LIMIT 1");
    if (idType == null || idType.isBlank()) {
      qw.and(w -> w.isNull(EmployeeIdDocumentEntity::getIdType).or().eq(EmployeeIdDocumentEntity::getIdType, ""));
    } else {
      qw.eq(EmployeeIdDocumentEntity::getIdType, idType);
    }
    return idDocumentMapper.selectOne(qw);
  }

  private EmployeeIdDocumentEntity mapEntity(Map<String, Object> body) {
    EmployeeIdDocumentEntity entity = new EmployeeIdDocumentEntity();
    entity.setCountryRegion(blankToNull(str(body.get("countryRegion"))));
    entity.setIdType(blankToNull(str(body.get("idType"))));
    String idNumber = str(body.get("idNumber"));
    if (idNumber.isBlank()) throw new IllegalArgumentException("证件号码不能为空");
    entity.setIdNumber(idNumber.trim());
    entity.setValidFrom(parseOptionalDate(body.get("validFrom"), "生效日期"));
    entity.setValidTo(parseOptionalDate(body.get("validTo"), "失效日期"));
    Object primary = body.get("isPrimary");
    if (primary instanceof Boolean b) {
      entity.setIsPrimary(b);
    } else if (primary != null && !str(primary).isBlank()) {
      Boolean parsed = parseYesNo(str(primary), "是否主证件");
      entity.setIsPrimary(parsed != null ? parsed : Boolean.FALSE);
    } else {
      entity.setIsPrimary(Boolean.FALSE);
    }
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeIdDocumentEntity doc,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap,
      boolean revealSensitive
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toIdDocumentMap(doc, fieldCryptoService, revealSensitive);
    dto.put("id", String.valueOf(doc.getId()));
    dto.put("employeeId", String.valueOf(doc.getEmployeeId()));
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }
}
