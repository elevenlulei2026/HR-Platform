package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeFamilyMemberEntity;
import com.hrplatform.core.employee.EmployeeFamilyMemberMapper;
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
 * 家庭成员批管。业务键：同工号 + 姓名 + 与员工关系 → 更新，否则新建。
 */
@Component
public class FamilyMemberArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "family-members";

  private static final String[] HEADERS = {
      "工号*", "姓名*", "与员工关系", "本公司员工", "电话", "工作单位", "职位", "出生日期", "出生证明"
  };
  private static final String DICT_RELATION = "EMPLOYEE_RELATION";

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeFamilyMemberMapper familyMemberMapper;

  public FamilyMemberArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeFamilyMemberMapper familyMemberMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.familyMemberMapper = familyMemberMapper;
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

    LambdaQueryWrapper<EmployeeFamilyMemberEntity> qw = new LambdaQueryWrapper<EmployeeFamilyMemberEntity>()
        .orderByDesc(EmployeeFamilyMemberEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeFamilyMemberEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = familyMemberMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeFamilyMemberEntity> records = familyMemberMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeFamilyMemberEntity::getEmployeeId).toList()
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
    EmployeeFamilyMemberEntity created = archiveService.createFamilyMember(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeFamilyMemberEntity current = familyMemberMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("家庭成员记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeFamilyMemberEntity updated = archiveService.updateFamilyMember(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeFamilyMemberEntity current = familyMemberMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("家庭成员记录不存在");
    archiveService.deleteFamilyMember(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("家庭成员");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 16 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("张三");
      sample.createCell(2).setCellValue(support.sampleDictLabel(DICT_RELATION, "SPOUSE"));
      sample.createCell(3).setCellValue("否");
      sample.createCell(4).setCellValue("13800138000");
      sample.createCell(5).setCellValue("某公司");
      sample.createCell(6).setCellValue("工程师");
      sample.createCell(7).setCellValue("1990-01-01");
      sample.createCell(8).setCellValue("");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、姓名*：必填；工号须已在花名册存在");
      hint.createRow(2).createCell(0).setCellValue("与员工关系：填写字典名称（推荐）或编码均可");
      hint.createRow(3).createCell(0).setCellValue("本公司员工：是/否、true/false、1/0");
      hint.createRow(4).createCell(0).setCellValue("业务键：同工号 + 姓名 + 与员工关系 → 更新，否则新建");
      hint.createRow(5).createCell(0).setCellValue("导出文件中关系字段为名称，可直接改后回导");
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
      Sheet sheet = wb.createSheet("家庭成员");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 16 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("name")));
        row.createCell(2).setCellValue(dictDisplayName(relationLabels, str(item.get("relation"))));
        Object internal = item.get("isInternalEmployee");
        row.createCell(3).setCellValue(
            Boolean.TRUE.equals(internal) || "true".equalsIgnoreCase(str(internal)) ? "是" : "否"
        );
        row.createCell(4).setCellValue(str(item.get("phone")));
        row.createCell(5).setCellValue(str(item.get("employer")));
        row.createCell(6).setCellValue(str(item.get("position")));
        row.createCell(7).setCellValue(str(item.get("birthDate")));
        row.createCell(8).setCellValue(str(item.get("birthCertificate")));
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

    String name = support.cell(row, 1);
    if (name.isBlank()) throw new RowImportException("姓名", "姓名不能为空");
    String relation = support.resolveDictCode(DICT_RELATION, blankToNull(support.cell(row, 2)), "与员工关系");
    Boolean isInternal = parseYesNo(support.cell(row, 3), "本公司员工");
    LocalDate birthDate = parseDate(support.cell(row, 7), "出生日期");

    EmployeeFamilyMemberEntity existing = findExisting(employee.getId(), name.trim(), relation);
    EmployeeFamilyMemberEntity entity = new EmployeeFamilyMemberEntity();
    entity.setName(name.trim());
    entity.setRelation(relation);
    entity.setIsInternalEmployee(isInternal != null ? isInternal : Boolean.FALSE);
    entity.setPhone(blankToNull(support.cell(row, 4)));
    entity.setEmployer(blankToNull(support.cell(row, 5)));
    entity.setPosition(blankToNull(support.cell(row, 6)));
    entity.setBirthDate(birthDate);
    entity.setBirthCertificate(blankToNull(support.cell(row, 8)));

    if (existing != null) {
      archiveService.updateFamilyMember(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createFamilyMember(employee.getId(), entity);
    }
  }

  private EmployeeFamilyMemberEntity findExisting(long employeeId, String name, String relation) {
    LambdaQueryWrapper<EmployeeFamilyMemberEntity> qw = new LambdaQueryWrapper<EmployeeFamilyMemberEntity>()
        .eq(EmployeeFamilyMemberEntity::getEmployeeId, employeeId)
        .eq(EmployeeFamilyMemberEntity::getName, name)
        .orderByDesc(EmployeeFamilyMemberEntity::getId)
        .last("LIMIT 1");
    if (relation == null || relation.isBlank()) {
      qw.and(w -> w.isNull(EmployeeFamilyMemberEntity::getRelation).or().eq(EmployeeFamilyMemberEntity::getRelation, ""));
    } else {
      qw.eq(EmployeeFamilyMemberEntity::getRelation, relation);
    }
    return familyMemberMapper.selectOne(qw);
  }

  private EmployeeFamilyMemberEntity mapEntity(Map<String, Object> body) {
    EmployeeFamilyMemberEntity entity = new EmployeeFamilyMemberEntity();
    String name = str(body.get("name"));
    if (name.isBlank()) throw new IllegalArgumentException("姓名不能为空");
    entity.setName(name.trim());
    entity.setRelation(blankToNull(str(body.get("relation"))));
    Object internal = body.get("isInternalEmployee");
    if (internal instanceof Boolean b) {
      entity.setIsInternalEmployee(b);
    } else if (internal != null && !str(internal).isBlank()) {
      Boolean parsed = parseYesNo(str(internal), "本公司员工");
      entity.setIsInternalEmployee(parsed != null ? parsed : Boolean.FALSE);
    } else {
      entity.setIsInternalEmployee(Boolean.FALSE);
    }
    entity.setPhone(blankToNull(str(body.get("phone"))));
    entity.setEmployer(blankToNull(str(body.get("employer"))));
    entity.setPosition(blankToNull(str(body.get("position"))));
    entity.setBirthDate(parseOptionalDate(body.get("birthDate"), "出生日期"));
    entity.setBirthCertificate(blankToNull(str(body.get("birthCertificate"))));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeFamilyMemberEntity member,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(member);
    dto.put("id", String.valueOf(member.getId()));
    dto.put("employeeId", String.valueOf(member.getEmployeeId()));
    support.putDictLabel(dto, "relation", DICT_RELATION, member.getRelation());
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }
}
