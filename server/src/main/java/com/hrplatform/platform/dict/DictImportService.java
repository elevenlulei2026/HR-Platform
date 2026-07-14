package com.hrplatform.platform.dict;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class DictImportService {
  private static final String[] TEMPLATE_HEADERS = {
      "类型编码*", "类型名称*", "类型描述", "字典值*", "显示名*", "排序", "状态"
  };

  private final DictService dictService;
  private final DataFormatter dataFormatter = new DataFormatter();

  public DictImportService(DictService dictService) {
    this.dictService = dictService;
  }

  public byte[] buildTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("字典导入");
      Row header = sheet.createRow(0);
      for (int i = 0; i < TEMPLATE_HEADERS.length; i++) {
        header.createCell(i).setCellValue(TEMPLATE_HEADERS[i]);
        sheet.setColumnWidth(i, 18 * 256);
      }
      Row sample1 = sheet.createRow(1);
      sample1.createCell(0).setCellValue("EMPLOYEE_STATUS");
      sample1.createCell(1).setCellValue("员工状态");
      sample1.createCell(2).setCellValue("员工主数据状态");
      sample1.createCell(3).setCellValue("ACTIVE");
      sample1.createCell(4).setCellValue("在职");
      sample1.createCell(5).setCellValue("30");
      sample1.createCell(6).setCellValue("ACTIVE");

      Row sample2 = sheet.createRow(2);
      sample2.createCell(0).setCellValue("EMPLOYEE_STATUS");
      sample2.createCell(1).setCellValue("员工状态");
      sample2.createCell(2).setCellValue("员工主数据状态");
      sample2.createCell(3).setCellValue("TERMINATED");
      sample2.createCell(4).setCellValue("离职");
      sample2.createCell(5).setCellValue("40");
      sample2.createCell(6).setCellValue("ACTIVE");

      Sheet guide = wb.createSheet("填写说明");
      String[][] notes = {
          {"列名", "说明"},
          {"类型编码*", "字典类型唯一编码，同一类型多行填相同编码"},
          {"类型名称*", "新建类型时必填；类型已存在时可留空或重复填写"},
          {"类型描述", "可选，仅在新建或更新类型时生效"},
          {"字典值*", "字典项唯一值（同一类型内唯一）"},
          {"显示名*", "字典项展示名称"},
          {"排序", "数字，缺省为 0"},
          {"状态", "ACTIVE 或 DISABLED，缺省 ACTIVE"},
          {"", "已存在的类型+字典值将更新显示名/排序/状态（upsert）"},
      };
      for (int r = 0; r < notes.length; r++) {
        Row row = guide.createRow(r);
        row.createCell(0).setCellValue(notes[r][0]);
        row.createCell(1).setCellValue(notes[r][1]);
      }
      guide.setColumnWidth(0, 16 * 256);
      guide.setColumnWidth(1, 56 * 256);

      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("生成导入模板失败", e);
    }
  }

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
        if (row == null || isEmptyRow(row)) continue;
        total++;
        int rowNumber = i + 1;
        try {
          processRow(row);
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
      throw new IllegalStateException("解析 Excel 失败", e);
    }

    return new ImportResult(total, success, errors.size(), errors);
  }

  private void processRow(Row row) {
    String typeCode = cell(row, 0);
    String typeName = cell(row, 1);
    String typeDescription = cell(row, 2);
    String value = cell(row, 3);
    String label = cell(row, 4);
    String sortStr = cell(row, 5);
    String status = cell(row, 6);

    if (typeCode.isBlank()) throw new RowImportException("类型编码", "类型编码不能为空");
    if (value.isBlank()) throw new RowImportException("字典值", "字典值不能为空");
    if (label.isBlank()) throw new RowImportException("显示名", "显示名不能为空");

    if (!status.isBlank()) {
      String normalized = status.trim().toUpperCase(Locale.ROOT);
      if (!"ACTIVE".equals(normalized) && !"DISABLED".equals(normalized)) {
        throw new RowImportException("状态", "状态须为 ACTIVE 或 DISABLED");
      }
      status = normalized;
    } else {
      status = "ACTIVE";
    }

    Integer sort = 0;
    if (!sortStr.isBlank()) {
      try {
        sort = Integer.parseInt(sortStr.trim());
      } catch (NumberFormatException e) {
        throw new RowImportException("排序", "排序须为整数");
      }
    }

    DictTypeEntity type = dictService.findTypeByCode(typeCode);
    if (type == null) {
      if (typeName.isBlank()) {
        throw new RowImportException("类型名称", "新建字典类型时类型名称不能为空");
      }
      DictTypeEntity entity = new DictTypeEntity();
      entity.setCode(typeCode.trim());
      entity.setName(typeName.trim());
      entity.setDescription(typeDescription.isBlank() ? null : typeDescription.trim());
      entity.setStatus("ACTIVE");
      entity.setSort(0);
      dictService.createType(entity);
    } else if (!typeName.isBlank() || !typeDescription.isBlank()) {
      DictTypeEntity patch = new DictTypeEntity();
      if (!typeName.isBlank()) patch.setName(typeName.trim());
      if (!typeDescription.isBlank()) patch.setDescription(typeDescription.trim());
      dictService.updateType(type.getId(), patch);
    }

    DictItemEntity existing = dictService.findItemByTypeCodeAndValue(typeCode, value);
    if (existing == null) {
      DictItemEntity entity = new DictItemEntity();
      entity.setTypeCode(typeCode.trim());
      entity.setValue(value.trim());
      entity.setLabel(label.trim());
      entity.setStatus(status);
      entity.setSort(sort);
      dictService.createItem(entity);
    } else {
      DictItemEntity patch = new DictItemEntity();
      patch.setLabel(label.trim());
      patch.setStatus(status);
      patch.setSort(sort);
      dictService.updateItem(existing.getId(), patch);
    }
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
      sheet.setColumnWidth(2, 60 * 256);
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
      throw new IllegalStateException("生成导入错误报告失败", e);
    }
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

    String field() {
      return field;
    }
  }
}
