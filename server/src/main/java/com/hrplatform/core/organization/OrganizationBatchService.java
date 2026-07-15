package com.hrplatform.core.organization;

import com.hrplatform.platform.dict.DictItemEntity;
import com.hrplatform.platform.dict.DictService;
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
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class OrganizationBatchService {
  private static final String[] TEMPLATE_HEADERS = {
      "部门编码（更新时必填）",
      "部门名称*",
      "生效日期*",
      "上级部门编码",
      "状态",
      "地点",
      "法人公司",
      "部门类型",
      "部门层级",
      "成本中心",
      "组织属性",
      "组织职能",
      "组织标签",
      "财务编码",
      "组织负责人",
      "分管领导",
      "人资协调员",
      "HRBP",
      "SSC"
  };

  private final OrganizationService organizationService;
  private final DictService dictService;
  private final DataFormatter dataFormatter = new DataFormatter();

  public OrganizationBatchService(
      OrganizationService organizationService,
      DictService dictService
  ) {
    this.organizationService = organizationService;
    this.dictService = dictService;
  }

  public byte[] buildTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("组织导入");
      Row header = sheet.createRow(0);
      for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
        header.createCell(i).setCellValue(TEMPLATE_HEADERS[i]);
        sheet.setColumnWidth(i, 22 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("");
      sample.createCell(1).setCellValue("研发平台部");
      sample.createCell(2).setCellValue(LocalDate.now().toString());
      sample.createCell(3).setCellValue("20000001");
      sample.createCell(4).setCellValue("有效");
      sample.createCell(5).setCellValue("深圳");
      sample.createCell(6).setCellValue("华南法人");
      sample.createCell(7).setCellValue("业务部门");
      sample.createCell(8).setCellValue("L3");
      sample.createCell(9).setCellValue("CC-10086");
      sample.createCell(10).setCellValue("实体");
      sample.createCell(11).setCellValue("产研");
      sample.createCell(12).setCellValue("平台,研发");
      sample.createCell(13).setCellValue("FIN-001");
      sample.createCell(14).setCellValue("100001");
      sample.createCell(15).setCellValue("100002");
      sample.createCell(16).setCellValue("100003");
      sample.createCell(17).setCellValue("100004");
      sample.createCell(18).setCellValue("100005");
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("生成组织导入模板失败", e);
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
      DictLookup lookup = loadDictLookup();
      for (int i = 1; i <= sheet.getLastRowNum(); i++) {
        Row row = sheet.getRow(i);
        if (row == null || isEmptyRow(row)) continue;
        total++;
        int rowNumber = i + 1;
        try {
          processRow(row, lookup);
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

  public byte[] buildErrorReport(List<RowError> errors) {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("导入错误报告");
      Row header = sheet.createRow(0);
      header.createCell(0).setCellValue("行号");
      header.createCell(1).setCellValue("字段");
      header.createCell(2).setCellValue("错误信息");
      sheet.setColumnWidth(0, 12 * 256);
      sheet.setColumnWidth(1, 24 * 256);
      sheet.setColumnWidth(2, 72 * 256);
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
      throw new IllegalStateException("生成组织导入错误报告失败", e);
    }
  }

  public byte[] exportExcel(List<OrganizationEntity> organizations) {
    DictLookup lookup = loadDictLookup();
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("组织架构");
      Row header = sheet.createRow(0);
      for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
        header.createCell(i).setCellValue(TEMPLATE_HEADERS[i]);
        sheet.setColumnWidth(i, 22 * 256);
      }
      int rowIdx = 1;
      for (OrganizationEntity item : organizations) {
        Row row = sheet.createRow(rowIdx++);
        row.createCell(0).setCellValue(nvl(item.getCode()));
        row.createCell(1).setCellValue(nvl(item.getName()));
        row.createCell(2).setCellValue(item.getEffectiveStartDate() == null ? "" : item.getEffectiveStartDate().toString());
        row.createCell(3).setCellValue(nvl(item.getParentCode()));
        row.createCell(4).setCellValue(statusLabel(item.getStatus()));
        row.createCell(5).setCellValue(lookup.labelByCode("LOCATION", item.getLocation()));
        row.createCell(6).setCellValue(lookup.labelByCode("LEGAL_COMPANY", item.getLegalCompany()));
        row.createCell(7).setCellValue(lookup.labelByCode("DEPARTMENT_TYPE", item.getDepartmentType()));
        row.createCell(8).setCellValue(lookup.labelByCode("DEPARTMENT_LEVEL", item.getDepartmentLevel()));
        row.createCell(9).setCellValue(nvl(item.getCostCenter()));
        row.createCell(10).setCellValue(attributeLabel(item.getOrgAttribute()));
        row.createCell(11).setCellValue(functionLabel(item.getOrgFunction()));
        row.createCell(12).setCellValue(nvl(item.getOrgTags()));
        row.createCell(13).setCellValue(nvl(item.getFinancialCode()));
        row.createCell(14).setCellValue(nvl(item.getOrgLeaderNo()));
        row.createCell(15).setCellValue(nvl(item.getSupervisingLeaderNo()));
        row.createCell(16).setCellValue(nvl(item.getHrCoordinatorNo()));
        row.createCell(17).setCellValue(nvl(item.getHrbpNo()));
        row.createCell(18).setCellValue(nvl(item.getSscNo()));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出组织架构失败", e);
    }
  }

  private void processRow(Row row, DictLookup lookup) {
    String code = cell(row, 0);
    String name = cell(row, 1);
    String effectiveStartDate = cell(row, 2);
    String parentCode = cell(row, 3);
    String statusText = cell(row, 4);
    String locationText = cell(row, 5);
    String legalCompanyText = cell(row, 6);
    String departmentTypeText = cell(row, 7);
    String departmentLevelText = cell(row, 8);
    String costCenter = cell(row, 9);
    String orgAttributeText = cell(row, 10);
    String orgFunctionText = cell(row, 11);
    String orgTags = cell(row, 12);
    String financialCode = cell(row, 13);
    String orgLeaderNo = cell(row, 14);
    String supervisingLeaderNo = cell(row, 15);
    String hrCoordinatorNo = cell(row, 16);
    String hrbpNo = cell(row, 17);
    String sscNo = cell(row, 18);

    if (name.isBlank()) throw new RowImportException("部门名称", "部门名称不能为空");
    if (effectiveStartDate.isBlank()) throw new RowImportException("生效日期", "生效日期不能为空");

    LocalDate date;
    try {
      date = LocalDate.parse(effectiveStartDate.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
    } catch (Exception e) {
      throw new RowImportException("生效日期", "生效日期格式应为 YYYY-MM-DD");
    }

    OrganizationEntity patch = new OrganizationEntity();
    patch.setName(name.trim());
    patch.setEffectiveStartDate(date);
    patch.setParentCode(parentCode.isBlank() ? null : parentCode.trim());
    patch.setStatus(parseStatus(statusText));
    patch.setLocation(lookup.resolveCode("LOCATION", locationText, "地点"));
    patch.setLegalCompany(lookup.resolveCode("LEGAL_COMPANY", legalCompanyText, "法人公司"));
    patch.setDepartmentType(lookup.resolveCode("DEPARTMENT_TYPE", departmentTypeText, "部门类型"));
    patch.setDepartmentLevel(lookup.resolveCode("DEPARTMENT_LEVEL", departmentLevelText, "部门层级"));
    patch.setCostCenter(blankToNull(costCenter));
    patch.setOrgAttribute(parseOrgAttribute(orgAttributeText));
    patch.setOrgFunction(parseOrgFunction(orgFunctionText));
    patch.setOrgTags(blankToNull(orgTags));
    patch.setFinancialCode(blankToNull(financialCode));
    patch.setOrgLeaderNo(blankToNull(orgLeaderNo));
    patch.setSupervisingLeaderNo(blankToNull(supervisingLeaderNo));
    patch.setHrCoordinatorNo(blankToNull(hrCoordinatorNo));
    patch.setHrbpNo(blankToNull(hrbpNo));
    patch.setSscNo(blankToNull(sscNo));

    if (code.isBlank()) {
      organizationService.create(patch);
      return;
    }

    OrganizationEntity sameDate = organizationService.findByCodeAndEffectiveStartDate(code.trim(), date);
    if (sameDate != null) {
      organizationService.update(sameDate.getId(), patch, "CURRENT");
      return;
    }
    OrganizationEntity latest = organizationService.findLatestVersionByCode(code.trim());
    if (latest == null) {
      throw new RowImportException("部门编码", "部门编码不存在: " + code + "；留空该列可新建部门");
    }
    organizationService.update(latest.getId(), patch, "NEW_VERSION");
  }

  private DictLookup loadDictLookup() {
    return new DictLookup(
        dictCodeLabel("LOCATION"),
        dictCodeLabel("LEGAL_COMPANY"),
        dictCodeLabel("DEPARTMENT_TYPE"),
        dictCodeLabel("DEPARTMENT_LEVEL")
    );
  }

  private Map<String, String> dictCodeLabel(String typeCode) {
    Map<String, String> map = new LinkedHashMap<>();
    for (DictItemEntity item : dictService.listItemsByTypeCode(typeCode)) {
      map.put(item.getValue(), item.getLabel());
    }
    return map;
  }

  private String parseStatus(String value) {
    if (value == null || value.isBlank()) return "ACTIVE";
    String normalized = value.trim().toUpperCase();
    return switch (normalized) {
      case "ACTIVE", "有效" -> "ACTIVE";
      case "INACTIVE", "无效" -> "INACTIVE";
      default -> throw new RowImportException("状态", "状态仅支持 ACTIVE/INACTIVE 或 有效/无效");
    };
  }

  private String parseOrgAttribute(String value) {
    if (value == null || value.isBlank()) return null;
    String normalized = normalize(value);
    return switch (normalized) {
      case "PHYSICAL", "实体" -> "PHYSICAL";
      case "VIRTUAL", "虚拟" -> "VIRTUAL";
      default -> throw new RowImportException("组织属性", "组织属性仅支持 PHYSICAL/VIRTUAL 或 实体/虚拟");
    };
  }

  private String parseOrgFunction(String value) {
    if (value == null || value.isBlank()) return null;
    String normalized = normalize(value);
    return switch (normalized) {
      case "RND", "产研" -> "RND";
      case "MANUFACTURING", "制造" -> "MANUFACTURING";
      case "MARKET", "市场" -> "MARKET";
      case "FUNCTION", "职能" -> "FUNCTION";
      default -> throw new RowImportException("组织职能", "组织职能仅支持 RND/MANUFACTURING/MARKET/FUNCTION 或 中文名称");
    };
  }

  private String statusLabel(String value) {
    if ("ACTIVE".equals(value)) return "有效";
    if ("INACTIVE".equals(value)) return "无效";
    return nvl(value);
  }

  private String attributeLabel(String value) {
    if ("PHYSICAL".equals(value)) return "实体";
    if ("VIRTUAL".equals(value)) return "虚拟";
    return nvl(value);
  }

  private String functionLabel(String value) {
    if ("RND".equals(value)) return "产研";
    if ("MANUFACTURING".equals(value)) return "制造";
    if ("MARKET".equals(value)) return "市场";
    if ("FUNCTION".equals(value)) return "职能";
    return nvl(value);
  }

  private String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private String normalize(String value) {
    return value.trim().replace(" ", "").replace("　", "").toUpperCase();
  }

  private String nvl(String value) {
    return value == null ? "" : value;
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

  private static class DictLookup {
    private final Map<String, Map<String, String>> codeToLabel = new HashMap<>();
    private final Map<String, Map<String, String>> normalizedLabelToCode = new HashMap<>();

    DictLookup(
        Map<String, String> locations,
        Map<String, String> legalCompanies,
        Map<String, String> departmentTypes,
        Map<String, String> departmentLevels
    ) {
      put("LOCATION", locations);
      put("LEGAL_COMPANY", legalCompanies);
      put("DEPARTMENT_TYPE", departmentTypes);
      put("DEPARTMENT_LEVEL", departmentLevels);
    }

    private void put(String typeCode, Map<String, String> codeLabel) {
      codeToLabel.put(typeCode, codeLabel);
      Map<String, String> labelCode = new HashMap<>();
      for (Map.Entry<String, String> entry : codeLabel.entrySet()) {
        if (entry.getValue() != null && !entry.getValue().isBlank()) {
          labelCode.put(normalize(entry.getValue()), entry.getKey());
        }
      }
      normalizedLabelToCode.put(typeCode, labelCode);
    }

    String resolveCode(String typeCode, String text, String fieldName) {
      if (text == null || text.isBlank()) return null;
      String raw = text.trim();
      Map<String, String> codeLabel = codeToLabel.getOrDefault(typeCode, Map.of());
      if (codeLabel.containsKey(raw)) return raw;
      String byLabel = normalizedLabelToCode.getOrDefault(typeCode, Map.of()).get(normalize(raw));
      if (byLabel != null) return byLabel;
      throw new RowImportException(fieldName, fieldName + "取值无效: " + text);
    }

    String labelByCode(String typeCode, String code) {
      if (code == null || code.isBlank()) return "";
      return codeToLabel.getOrDefault(typeCode, Map.of()).getOrDefault(code, code);
    }

    private String normalize(String value) {
      return value.trim().replace(" ", "").replace("　", "").toUpperCase();
    }
  }
}
