package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeInternalRelativeEntity;
import com.hrplatform.core.employee.EmployeeInternalRelativeMapper;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.blankToNull;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.dictDisplayName;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 内部亲属批管。业务键：同工号 + 关联员工工号 → 更新，否则新建。
 * 任职快照随关联员工自动填充（与档案 Sheet 一致）。
 */
@Component
public class InternalRelativeArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "internal-relatives";

  private static final String[] HEADERS = {
      "工号*", "关联员工工号*", "与员工关系", "说明"
  };
  private static final String DICT_RELATION = "EMPLOYEE_RELATION";
  private static final String DICT_STATUS = "EMPLOYEE_STATUS";

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeInternalRelativeMapper internalRelativeMapper;

  public InternalRelativeArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeInternalRelativeMapper internalRelativeMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.internalRelativeMapper = internalRelativeMapper;
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

    LambdaQueryWrapper<EmployeeInternalRelativeEntity> qw =
        new LambdaQueryWrapper<EmployeeInternalRelativeEntity>()
            .orderByDesc(EmployeeInternalRelativeEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeInternalRelativeEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = internalRelativeMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeInternalRelativeEntity> records = internalRelativeMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeInternalRelativeEntity::getEmployeeId).toList()
    );
    Map<Long, EmployeeEntity> relativeMap = support.loadEmployees(
        records.stream().map(EmployeeInternalRelativeEntity::getRelativeEmployeeId).toList()
    );
    Map<Long, String> orgNameMap = support.loadOrgNames(empMap.keySet());

    List<Map<String, Object>> items = records.stream()
        .map(row -> toRow(row, empMap.get(row.getEmployeeId()), relativeMap.get(row.getRelativeEmployeeId()), orgNameMap))
        .toList();
    return new PageResult<>(items, total == null ? 0 : total);
  }

  @Override
  @Transactional
  public Map<String, Object> create(Map<String, Object> body, boolean revealSensitive) {
    EmployeeEntity employee = support.resolveEmployeeFromBody(body);
    EmployeeInternalRelativeEntity entity = mapEntity(body);
    applySnapshot(entity);
    EmployeeInternalRelativeEntity created = archiveService.createInternalRelative(employee.getId(), entity);
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    EmployeeEntity relative = created.getRelativeEmployeeId() == null
        ? null
        : support.employeeService().require(created.getRelativeEmployeeId());
    return toRow(created, employee, relative, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeInternalRelativeEntity current = internalRelativeMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("内部亲属记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeInternalRelativeEntity entity = mapEntity(body);
    if (entity.getRelativeEmployeeId() == null) {
      entity.setRelativeEmployeeId(current.getRelativeEmployeeId());
    }
    applySnapshot(entity);
    EmployeeInternalRelativeEntity updated = archiveService.updateInternalRelative(employee.getId(), id, entity);
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    EmployeeEntity relative = updated.getRelativeEmployeeId() == null
        ? null
        : support.employeeService().require(updated.getRelativeEmployeeId());
    return toRow(updated, employee, relative, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeInternalRelativeEntity current = internalRelativeMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("内部亲属记录不存在");
    archiveService.deleteInternalRelative(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("内部亲属");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 20 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("E0002");
      sample.createCell(2).setCellValue(support.sampleDictLabel(DICT_RELATION, "SIBLING"));
      sample.createCell(3).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、关联员工工号*：必填，均须已在花名册存在");
      hint.createRow(2).createCell(0).setCellValue("与员工关系：填写字典名称（推荐）或编码均可");
      hint.createRow(3).createCell(0).setCellValue("部门/岗位/职级/入职日/在职状态等快照随关联员工自动带出，无需填写");
      hint.createRow(4).createCell(0).setCellValue("业务键：同工号 + 关联员工工号 → 更新，否则新建");
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
    Map<String, String> relationLabels = support.employeeService().dictLabels(DICT_RELATION);
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("内部亲属");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 20 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("relativeEmployeeNo")));
        row.createCell(2).setCellValue(dictDisplayName(relationLabels, str(item.get("relation"))));
        row.createCell(3).setCellValue(str(item.get("remark")));
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

    String relativeNo = support.cell(row, 1);
    if (relativeNo.isBlank()) throw new RowImportException("关联员工工号", "关联员工工号不能为空");
    EmployeeEntity relative;
    try {
      relative = support.requireByEmployeeNoForImport(relativeNo);
    } catch (RowImportException ex) {
      throw new RowImportException("关联员工工号", ex.getMessage());
    }
    if (relative.getId().equals(employee.getId())) {
      throw new RowImportException("关联员工工号", "关联员工不能是本人");
    }

    String relation = support.resolveDictCode(DICT_RELATION, blankToNull(support.cell(row, 2)), "与员工关系");
    String remark = blankToNull(support.cell(row, 3));

    EmployeeInternalRelativeEntity existing = findExisting(employee.getId(), relative.getId());
    EmployeeInternalRelativeEntity entity = new EmployeeInternalRelativeEntity();
    entity.setRelativeEmployeeId(relative.getId());
    entity.setRelation(relation);
    entity.setRemark(remark);
    support.fillInternalRelativeSnapshot(entity, relative);

    if (existing != null) {
      archiveService.updateInternalRelative(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createInternalRelative(employee.getId(), entity);
    }
  }

  private EmployeeInternalRelativeEntity findExisting(long employeeId, long relativeEmployeeId) {
    return internalRelativeMapper.selectOne(
        new LambdaQueryWrapper<EmployeeInternalRelativeEntity>()
            .eq(EmployeeInternalRelativeEntity::getEmployeeId, employeeId)
            .eq(EmployeeInternalRelativeEntity::getRelativeEmployeeId, relativeEmployeeId)
            .orderByDesc(EmployeeInternalRelativeEntity::getId)
            .last("LIMIT 1")
    );
  }

  private EmployeeInternalRelativeEntity mapEntity(Map<String, Object> body) {
    EmployeeInternalRelativeEntity entity = new EmployeeInternalRelativeEntity();
    Long relativeId = resolveRelativeEmployeeId(body);
    entity.setRelativeEmployeeId(relativeId);
    entity.setRelation(blankToNull(str(body.get("relation"))));
    entity.setRemark(blankToNull(str(body.get("remark"))));
    // 快照字段：优先用请求体，随后 applySnapshot 以关联员工为准刷新
    entity.setDepartmentName(blankToNull(str(body.get("departmentName"))));
    entity.setPositionName(blankToNull(str(body.get("positionName"))));
    entity.setJobGradeName(blankToNull(str(body.get("jobGradeName"))));
    if (body.get("hireDate") != null && !str(body.get("hireDate")).isBlank()) {
      entity.setHireDate(ArchiveDataSupport.parseOptionalDate(body.get("hireDate"), "入职日期"));
    }
    entity.setEmploymentStatus(blankToNull(str(body.get("employmentStatus"))));
    if (body.get("lastWorkDay") != null && !str(body.get("lastWorkDay")).isBlank()) {
      entity.setLastWorkDay(ArchiveDataSupport.parseOptionalDate(body.get("lastWorkDay"), "最后工作日"));
    }
    return entity;
  }

  private Long resolveRelativeEmployeeId(Map<String, Object> body) {
    Object idObj = body.get("relativeEmployeeId");
    if (idObj != null && !str(idObj).isBlank()) {
      try {
        return Long.parseLong(str(idObj));
      } catch (NumberFormatException e) {
        throw new IllegalArgumentException("关联员工 ID 无效");
      }
    }
    Object noObj = body.get("relativeEmployeeNo");
    if (noObj != null && !str(noObj).isBlank()) {
      return support.requireByEmployeeNo(str(noObj).trim()).getId();
    }
    return null;
  }

  private void applySnapshot(EmployeeInternalRelativeEntity entity) {
    if (entity.getRelativeEmployeeId() == null) {
      throw new IllegalArgumentException("请选择关联员工");
    }
    EmployeeEntity relative = support.employeeService().require(entity.getRelativeEmployeeId());
    support.fillInternalRelativeSnapshot(entity, relative);
  }

  private Map<String, Object> toRow(
      EmployeeInternalRelativeEntity relative,
      EmployeeEntity employee,
      EmployeeEntity relativeEmployee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(relative);
    dto.put("id", String.valueOf(relative.getId()));
    dto.put("employeeId", String.valueOf(relative.getEmployeeId()));
    if (relative.getRelativeEmployeeId() != null) {
      dto.put("relativeEmployeeId", String.valueOf(relative.getRelativeEmployeeId()));
    }
    support.putDictLabel(dto, "relation", DICT_RELATION, relative.getRelation());
    support.putDictLabel(dto, "employmentStatus", DICT_STATUS, relative.getEmploymentStatus());
    if (relativeEmployee != null) {
      dto.put("relativeEmployeeNo", relativeEmployee.getEmployeeNo());
      dto.put("relativeEmployeeName", relativeEmployee.getFullName());
    }
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }
}
