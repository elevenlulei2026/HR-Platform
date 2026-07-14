package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeCostCenterAllocationEntity;
import com.hrplatform.core.employee.EmployeeCostCenterAllocationMapper;
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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.blankToNull;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseDecimal;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalDate;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.parseOptionalDecimal;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 成本中心分摊批管。业务键：同工号 + 成本中心 + 开始日期 → 更新，否则新建。
 */
@Component
public class CostCenterArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "cost-center-allocations";

  private static final String[] HEADERS = {
      "工号*", "成本归属法人", "成本中心*", "分摊比例(%)", "开始日期", "结束日期"
  };

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeCostCenterAllocationMapper costCenterMapper;

  public CostCenterArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeCostCenterAllocationMapper costCenterMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.costCenterMapper = costCenterMapper;
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

    LambdaQueryWrapper<EmployeeCostCenterAllocationEntity> qw =
        new LambdaQueryWrapper<EmployeeCostCenterAllocationEntity>()
            .orderByDesc(EmployeeCostCenterAllocationEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeCostCenterAllocationEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = costCenterMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeCostCenterAllocationEntity> records = costCenterMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeCostCenterAllocationEntity::getEmployeeId).toList()
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
    EmployeeCostCenterAllocationEntity created =
        archiveService.createCostCenterAllocation(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeCostCenterAllocationEntity current = costCenterMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("成本中心记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeCostCenterAllocationEntity updated =
        archiveService.updateCostCenterAllocation(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeCostCenterAllocationEntity current = costCenterMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("成本中心记录不存在");
    archiveService.deleteCostCenterAllocation(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("成本中心");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 18 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("示例法人");
      sample.createCell(2).setCellValue("CC001");
      sample.createCell(3).setCellValue("100");
      sample.createCell(4).setCellValue("2024-01-01");
      sample.createCell(5).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、成本中心*：必填");
      hint.createRow(2).createCell(0).setCellValue("成本归属法人：填法人编码或名称（推荐编码）");
      hint.createRow(3).createCell(0).setCellValue("分摊比例：0–100");
      hint.createRow(4).createCell(0).setCellValue("业务键：同工号 + 成本中心 + 开始日期 → 更新，否则新建");
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
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("成本中心");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 18 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        String legal = str(item.get("legalEntityName"));
        if (legal.isBlank()) legal = str(item.get("legalEntityCode"));
        row.createCell(1).setCellValue(legal);
        row.createCell(2).setCellValue(str(item.get("costCenter")));
        row.createCell(3).setCellValue(str(item.get("percentage")));
        row.createCell(4).setCellValue(str(item.get("effectiveStartDate")));
        row.createCell(5).setCellValue(str(item.get("effectiveEndDate")));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private void upsertRow(Row row) {
    EmployeeEntity employee = support.requireByEmployeeNoForImport(support.cell(row, 0));
    Long legalEntityId = support.resolveLegalEntityId(blankToNull(support.cell(row, 1)), "成本归属法人", false);
    String costCenter = support.cell(row, 2);
    if (costCenter.isBlank()) throw new RowImportException("成本中心", "成本中心不能为空");
    BigDecimal percentage = parseDecimal(support.cell(row, 3), "分摊比例(%)");
    LocalDate start = parseDate(support.cell(row, 4), "开始日期");
    LocalDate end = parseDate(support.cell(row, 5), "结束日期");

    EmployeeCostCenterAllocationEntity existing =
        findExisting(employee.getId(), costCenter.trim(), start);
    EmployeeCostCenterAllocationEntity entity = new EmployeeCostCenterAllocationEntity();
    entity.setLegalEntityId(legalEntityId);
    entity.setCostCenter(costCenter.trim());
    entity.setPercentage(percentage);
    entity.setEffectiveStartDate(start);
    entity.setEffectiveEndDate(end);

    if (existing != null) {
      archiveService.updateCostCenterAllocation(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createCostCenterAllocation(employee.getId(), entity);
    }
  }

  private EmployeeCostCenterAllocationEntity findExisting(
      long employeeId,
      String costCenter,
      LocalDate start
  ) {
    LambdaQueryWrapper<EmployeeCostCenterAllocationEntity> qw =
        new LambdaQueryWrapper<EmployeeCostCenterAllocationEntity>()
            .eq(EmployeeCostCenterAllocationEntity::getEmployeeId, employeeId)
            .eq(EmployeeCostCenterAllocationEntity::getCostCenter, costCenter)
            .orderByDesc(EmployeeCostCenterAllocationEntity::getId)
            .last("LIMIT 1");
    if (start == null) {
      qw.and(w -> w.isNull(EmployeeCostCenterAllocationEntity::getEffectiveStartDate));
    } else {
      qw.eq(EmployeeCostCenterAllocationEntity::getEffectiveStartDate, start);
    }
    return costCenterMapper.selectOne(qw);
  }

  private EmployeeCostCenterAllocationEntity mapEntity(Map<String, Object> body) {
    EmployeeCostCenterAllocationEntity entity = new EmployeeCostCenterAllocationEntity();
    entity.setLegalEntityId(support.resolveLegalEntityIdFromBody(body.get("legalEntityId")));
    String costCenter = str(body.get("costCenter"));
    if (costCenter.isBlank()) throw new IllegalArgumentException("成本中心不能为空");
    entity.setCostCenter(costCenter.trim());
    entity.setPercentage(parseOptionalDecimal(body.get("percentage"), "分摊比例(%)"));
    entity.setEffectiveStartDate(parseOptionalDate(body.get("effectiveStartDate"), "开始日期"));
    entity.setEffectiveEndDate(parseOptionalDate(body.get("effectiveEndDate"), "结束日期"));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeCostCenterAllocationEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    support.attachLegalEntityDisplay(dto, row.getLegalEntityId());
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }
}
