package com.hrplatform.core.organization;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
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
public class PositionBatchService {
  private static final String[] TEMPLATE_HEADERS = {
      "岗位编码（更新时必填）",
      "岗位名称*",
      "生效日期*",
      "直属部门编码*",
      "状态",
      "职业病岗位",
      "岗位分类",
      "岗位类别",
      "岗位序列",
      "岗位职级",
      "关键岗位",
      "身份类别"
  };

  private final PositionService positionService;
  private final PositionMapper positionMapper;
  private final OrganizationMapper organizationMapper;
  private final DictService dictService;
  private final DataFormatter dataFormatter = new DataFormatter();

  public PositionBatchService(
      PositionService positionService,
      PositionMapper positionMapper,
      OrganizationMapper organizationMapper,
      DictService dictService
  ) {
    this.positionService = positionService;
    this.positionMapper = positionMapper;
    this.organizationMapper = organizationMapper;
    this.dictService = dictService;
  }

  public byte[] buildTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("岗位导入");
      Row header = sheet.createRow(0);
      for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
        header.createCell(i).setCellValue(TEMPLATE_HEADERS[i]);
        sheet.setColumnWidth(i, 22 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("");
      sample.createCell(1).setCellValue("高级测试工程师");
      sample.createCell(2).setCellValue(LocalDate.now().toString());
      sample.createCell(3).setCellValue("20000001");
      sample.createCell(4).setCellValue("有效");
      sample.createCell(5).setCellValue("否");
      sample.createCell(6).setCellValue("专业技术");
      sample.createCell(7).setCellValue("Office");
      sample.createCell(8).setCellValue("P");
      sample.createCell(9).setCellValue("P6");
      sample.createCell(10).setCellValue("否");
      sample.createCell(11).setCellValue("正式员工");
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("生成岗位导入模板失败", e);
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
      throw new IllegalStateException("生成岗位导入错误报告失败", e);
    }
  }

  public byte[] exportExcel(
      List<PositionEntity> positions,
      Map<Long, OrganizationEntity> orgMap
  ) {
    DictLookup lookup = loadDictLookup();
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("岗位体系");
      Row header = sheet.createRow(0);
      for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
        header.createCell(i).setCellValue(TEMPLATE_HEADERS[i]);
        sheet.setColumnWidth(i, 22 * 256);
      }
      int rowIdx = 1;
      for (PositionEntity item : positions) {
        OrganizationEntity org = orgMap.get(item.getOrganizationId());
        Row row = sheet.createRow(rowIdx++);
        row.createCell(0).setCellValue(nvl(item.getCode()));
        row.createCell(1).setCellValue(nvl(item.getName()));
        row.createCell(2).setCellValue(item.getEffectiveStartDate() == null ? "" : item.getEffectiveStartDate().toString());
        row.createCell(3).setCellValue(org == null ? "" : nvl(org.getCode()));
        row.createCell(4).setCellValue(statusLabel(item.getStatus()));
        row.createCell(5).setCellValue(yesNoLabel(item.getOccupationalDisease()));
        row.createCell(6).setCellValue(lookup.labelByCode("POSITION_CATEGORY", item.getPositionCategory()));
        row.createCell(7).setCellValue(kindLabel(item.getPositionKind()));
        row.createCell(8).setCellValue(nvl(item.getPositionSequence()));
        row.createCell(9).setCellValue(lookup.labelByCode("POSITION_LEVEL", item.getPositionLevel()));
        row.createCell(10).setCellValue(yesNoLabel(item.getKeyPosition()));
        row.createCell(11).setCellValue(lookup.labelByCode("IDENTITY_CATEGORY", item.getIdentityCategory()));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出岗位失败", e);
    }
  }

  private void processRow(Row row, DictLookup lookup) {
    String code = cell(row, 0);
    String name = cell(row, 1);
    String effectiveStartDate = cell(row, 2);
    String organizationCode = cell(row, 3);
    String statusText = cell(row, 4);
    String occupationalDiseaseText = cell(row, 5);
    String positionCategoryText = cell(row, 6);
    String positionKindText = cell(row, 7);
    String positionSequenceText = cell(row, 8);
    String positionLevelText = cell(row, 9);
    String keyPositionText = cell(row, 10);
    String identityCategoryText = cell(row, 11);

    if (name.isBlank()) throw new RowImportException("岗位名称", "岗位名称不能为空");
    if (effectiveStartDate.isBlank()) throw new RowImportException("生效日期", "生效日期不能为空");
    if (organizationCode.isBlank()) throw new RowImportException("直属部门编码", "直属部门编码不能为空");

    LocalDate date;
    try {
      date = LocalDate.parse(effectiveStartDate.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
    } catch (Exception e) {
      throw new RowImportException("生效日期", "生效日期格式应为 YYYY-MM-DD");
    }

    OrganizationEntity org = findOrganizationByCode(organizationCode.trim());
    if (org == null) {
      throw new RowImportException("直属部门编码", "直属部门编码不存在: " + organizationCode);
    }

    PositionEntity patch = new PositionEntity();
    patch.setName(name.trim());
    patch.setEffectiveStartDate(date);
    patch.setOrganizationId(org.getId());
    patch.setStatus(parseStatus(statusText));
    patch.setOccupationalDisease(parseYesNo(occupationalDiseaseText, "职业病岗位", "NO"));
    patch.setPositionCategory(lookup.resolveCode("POSITION_CATEGORY", positionCategoryText, "岗位分类"));
    patch.setPositionKind(parseKind(positionKindText));
    patch.setPositionSequence(parseSequence(positionSequenceText));
    patch.setPositionLevel(lookup.resolveCode("POSITION_LEVEL", positionLevelText, "岗位职级"));
    patch.setKeyPosition(parseYesNo(keyPositionText, "关键岗位", "NO"));
    patch.setIdentityCategory(lookup.resolveCode("IDENTITY_CATEGORY", identityCategoryText, "身份类别"));

    if (code.isBlank()) {
      positionService.create(patch);
      return;
    }

    PositionEntity sameDate = positionService.findByCodeAndEffectiveStartDate(code.trim(), date);
    if (sameDate != null) {
      positionService.update(sameDate.getId(), patch, "CURRENT");
      return;
    }
    PositionEntity latest = positionService.findLatestVersionByCode(code.trim());
    if (latest == null) {
      throw new RowImportException("岗位编码", "岗位编码不存在: " + code + "；留空该列可新建岗位");
    }
    positionService.update(latest.getId(), patch, "NEW_VERSION");
  }

  private DictLookup loadDictLookup() {
    return new DictLookup(
        dictCodeLabel("POSITION_CATEGORY"),
        dictCodeLabel("POSITION_LEVEL"),
        dictCodeLabel("IDENTITY_CATEGORY")
    );
  }

  private Map<String, String> dictCodeLabel(String typeCode) {
    Map<String, String> map = new LinkedHashMap<>();
    for (DictItemEntity item : dictService.listItemsByTypeCode(typeCode)) {
      map.put(item.getValue(), item.getLabel());
    }
    return map;
  }

  private OrganizationEntity findOrganizationByCode(String code) {
    if (code == null || code.isBlank()) return null;
    LocalDate today = LocalDate.now();
    OrganizationEntity active = organizationMapper.selectOne(
        new LambdaQueryWrapper<OrganizationEntity>()
            .eq(OrganizationEntity::getCode, code)
            .le(OrganizationEntity::getEffectiveStartDate, today)
            .and(w -> w.isNull(OrganizationEntity::getEffectiveEndDate)
                .or().ge(OrganizationEntity::getEffectiveEndDate, today))
            .orderByDesc(OrganizationEntity::getEffectiveStartDate)
            .last("LIMIT 1")
    );
    if (active != null) return active;
    return organizationMapper.selectOne(
        new LambdaQueryWrapper<OrganizationEntity>()
            .eq(OrganizationEntity::getCode, code)
            .orderByDesc(OrganizationEntity::getEffectiveStartDate)
            .last("LIMIT 1")
    );
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

  private String parseYesNo(String value, String fieldName, String defaultValue) {
    if (value == null || value.isBlank()) return defaultValue;
    String normalized = value.trim().toUpperCase();
    return switch (normalized) {
      case "YES", "Y", "TRUE", "1", "是" -> "YES";
      case "NO", "N", "FALSE", "0", "否" -> "NO";
      default -> throw new RowImportException(fieldName, fieldName + "仅支持 是/否 或 YES/NO");
    };
  }

  private String parseKind(String value) {
    if (value == null || value.isBlank()) return null;
    String normalized = value.trim().toUpperCase();
    return switch (normalized) {
      case "OFFICE" -> "OFFICE";
      case "NON_OFFICE", "NON-OFFICE", "非 OFFICE", "非OFFICE", "非 OFFICE 岗位", "非OFFICE岗位", "非 OFFICE岗", "非OFFICE岗" ->
          "NON_OFFICE";
      default -> throw new RowImportException("岗位类别", "岗位类别仅支持 OFFICE / NON_OFFICE / 非 Office");
    };
  }

  private String parseSequence(String value) {
    if (value == null || value.isBlank()) return null;
    String normalized = value.trim().toUpperCase();
    if ("P".equals(normalized) || "M".equals(normalized) || "T".equals(normalized)) return normalized;
    throw new RowImportException("岗位序列", "岗位序列仅支持 P / M / T");
  }

  private String statusLabel(String value) {
    if ("ACTIVE".equals(value)) return "有效";
    if ("INACTIVE".equals(value)) return "无效";
    return nvl(value);
  }

  private String kindLabel(String value) {
    if ("OFFICE".equals(value)) return "Office";
    if ("NON_OFFICE".equals(value)) return "非 Office";
    return nvl(value);
  }

  private String yesNoLabel(String value) {
    if ("YES".equals(value)) return "是";
    if ("NO".equals(value)) return "否";
    return nvl(value);
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
        Map<String, String> positionCategory,
        Map<String, String> positionLevel,
        Map<String, String> identityCategory
    ) {
      put("POSITION_CATEGORY", positionCategory);
      put("POSITION_LEVEL", positionLevel);
      put("IDENTITY_CATEGORY", identityCategory);
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
