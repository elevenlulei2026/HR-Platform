package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeValuesAssessmentEntity;
import com.hrplatform.core.employee.EmployeeValuesAssessmentMapper;
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
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 价值观评估批管。业务键：同工号 + 考核时间 → 更新，否则新建。
 */
@Component
public class ValuesAssessmentArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "values-assessments";

  private static final String[] HEADERS = {
      "工号*", "考核时间*", "最终等级", "上级评价", "同事评价", "下级评价",
      "用户第一", "目标第一", "实干担当", "善于复盘", "敢为人先", "提质增效",
      "全情投入", "热爱事业", "永争第一", "勇于挑战", "组织为重", "成就他人",
      "廉洁正直", "遵纪守法", "0分文本", "4分文本", "红灯", "黄灯", "绿灯"
  };

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeValuesAssessmentMapper valuesAssessmentMapper;

  public ValuesAssessmentArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeValuesAssessmentMapper valuesAssessmentMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.valuesAssessmentMapper = valuesAssessmentMapper;
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

    LambdaQueryWrapper<EmployeeValuesAssessmentEntity> qw =
        new LambdaQueryWrapper<EmployeeValuesAssessmentEntity>()
            .orderByDesc(EmployeeValuesAssessmentEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeValuesAssessmentEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = valuesAssessmentMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeValuesAssessmentEntity> records = valuesAssessmentMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeValuesAssessmentEntity::getEmployeeId).toList()
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
    EmployeeValuesAssessmentEntity created =
        archiveService.createValuesAssessment(employee.getId(), mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeValuesAssessmentEntity current = valuesAssessmentMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("价值观评估记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeValuesAssessmentEntity updated =
        archiveService.updateValuesAssessment(employee.getId(), id, mapEntity(body));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeValuesAssessmentEntity current = valuesAssessmentMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("价值观评估记录不存在");
    archiveService.deleteValuesAssessment(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("价值观评估");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i]);
        sheet.setColumnWidth(i, 14 * 256);
      }
      Row sample = sheet.createRow(1);
      sample.createCell(0).setCellValue("E0001");
      sample.createCell(1).setCellValue("2025H2");
      sample.createCell(2).setCellValue("A");
      sample.createCell(3).setCellValue("");
      sample.createCell(4).setCellValue("");
      sample.createCell(5).setCellValue("");
      sample.createCell(22).setCellValue("0");
      sample.createCell(23).setCellValue("0");
      sample.createCell(24).setCellValue("1");

      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("字段说明");
      hint.createRow(1).createCell(0).setCellValue("工号*、考核时间*：必填");
      hint.createRow(2).createCell(0).setCellValue("业务键：同工号 + 考核时间 → 更新，否则新建");
      hint.createRow(3).createCell(0).setCellValue("红黄绿灯可填分值或说明文本");
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
      Sheet sheet = wb.createSheet("价值观评估");
      Row header = sheet.createRow(0);
      for (int i = 0; i < HEADERS.length; i++) {
        header.createCell(i).setCellValue(HEADERS[i].replace("*", ""));
        sheet.setColumnWidth(i, 14 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        row.createCell(1).setCellValue(str(item.get("assessmentTime")));
        row.createCell(2).setCellValue(str(item.get("finalLevel")));
        row.createCell(3).setCellValue(str(item.get("superiorEvaluation")));
        row.createCell(4).setCellValue(str(item.get("peerEvaluation")));
        row.createCell(5).setCellValue(str(item.get("subordinateEvaluation")));
        row.createCell(6).setCellValue(str(item.get("userFirst")));
        row.createCell(7).setCellValue(str(item.get("goalFirst")));
        row.createCell(8).setCellValue(str(item.get("pragmaticResponsibility")));
        row.createCell(9).setCellValue(str(item.get("goodAtReview")));
        row.createCell(10).setCellValue(str(item.get("dareToLead")));
        row.createCell(11).setCellValue(str(item.get("qualityEfficiency")));
        row.createCell(12).setCellValue(str(item.get("fullCommitment")));
        row.createCell(13).setCellValue(str(item.get("loveCareer")));
        row.createCell(14).setCellValue(str(item.get("striveForFirst")));
        row.createCell(15).setCellValue(str(item.get("braveChallenge")));
        row.createCell(16).setCellValue(str(item.get("organizationFirst")));
        row.createCell(17).setCellValue(str(item.get("helpOthersSucceed")));
        row.createCell(18).setCellValue(str(item.get("integrityHonesty")));
        row.createCell(19).setCellValue(str(item.get("lawAbiding")));
        row.createCell(20).setCellValue(str(item.get("zeroScoreText")));
        row.createCell(21).setCellValue(str(item.get("fourScoreText")));
        row.createCell(22).setCellValue(str(item.get("redLight")));
        row.createCell(23).setCellValue(str(item.get("yellowLight")));
        row.createCell(24).setCellValue(str(item.get("greenLight")));
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private void upsertRow(Row row) {
    EmployeeEntity employee = support.requireByEmployeeNoForImport(support.cell(row, 0));
    String assessmentTime = support.cell(row, 1);
    if (assessmentTime.isBlank()) throw new RowImportException("考核时间", "考核时间不能为空");

    EmployeeValuesAssessmentEntity entity = new EmployeeValuesAssessmentEntity();
    entity.setAssessmentTime(assessmentTime.trim());
    entity.setFinalLevel(blankToNull(support.cell(row, 2)));
    entity.setSuperiorEvaluation(blankToNull(support.cell(row, 3)));
    entity.setPeerEvaluation(blankToNull(support.cell(row, 4)));
    entity.setSubordinateEvaluation(blankToNull(support.cell(row, 5)));
    entity.setUserFirst(blankToNull(support.cell(row, 6)));
    entity.setGoalFirst(blankToNull(support.cell(row, 7)));
    entity.setPragmaticResponsibility(blankToNull(support.cell(row, 8)));
    entity.setGoodAtReview(blankToNull(support.cell(row, 9)));
    entity.setDareToLead(blankToNull(support.cell(row, 10)));
    entity.setQualityEfficiency(blankToNull(support.cell(row, 11)));
    entity.setFullCommitment(blankToNull(support.cell(row, 12)));
    entity.setLoveCareer(blankToNull(support.cell(row, 13)));
    entity.setStriveForFirst(blankToNull(support.cell(row, 14)));
    entity.setBraveChallenge(blankToNull(support.cell(row, 15)));
    entity.setOrganizationFirst(blankToNull(support.cell(row, 16)));
    entity.setHelpOthersSucceed(blankToNull(support.cell(row, 17)));
    entity.setIntegrityHonesty(blankToNull(support.cell(row, 18)));
    entity.setLawAbiding(blankToNull(support.cell(row, 19)));
    entity.setZeroScoreText(blankToNull(support.cell(row, 20)));
    entity.setFourScoreText(blankToNull(support.cell(row, 21)));
    entity.setRedLight(blankToNull(support.cell(row, 22)));
    entity.setYellowLight(blankToNull(support.cell(row, 23)));
    entity.setGreenLight(blankToNull(support.cell(row, 24)));

    EmployeeValuesAssessmentEntity existing = findExisting(employee.getId(), assessmentTime.trim());
    if (existing != null) {
      archiveService.updateValuesAssessment(employee.getId(), existing.getId(), entity);
    } else {
      archiveService.createValuesAssessment(employee.getId(), entity);
    }
  }

  private EmployeeValuesAssessmentEntity findExisting(long employeeId, String assessmentTime) {
    return valuesAssessmentMapper.selectOne(
        new LambdaQueryWrapper<EmployeeValuesAssessmentEntity>()
            .eq(EmployeeValuesAssessmentEntity::getEmployeeId, employeeId)
            .eq(EmployeeValuesAssessmentEntity::getAssessmentTime, assessmentTime)
            .orderByDesc(EmployeeValuesAssessmentEntity::getId)
            .last("LIMIT 1")
    );
  }

  private EmployeeValuesAssessmentEntity mapEntity(Map<String, Object> body) {
    EmployeeValuesAssessmentEntity entity = new EmployeeValuesAssessmentEntity();
    String assessmentTime = str(body.get("assessmentTime"));
    if (assessmentTime.isBlank()) throw new IllegalArgumentException("考核时间不能为空");
    entity.setAssessmentTime(assessmentTime.trim());
    entity.setFinalLevel(blankToNull(str(body.get("finalLevel"))));
    entity.setSuperiorEvaluation(blankToNull(str(body.get("superiorEvaluation"))));
    entity.setPeerEvaluation(blankToNull(str(body.get("peerEvaluation"))));
    entity.setSubordinateEvaluation(blankToNull(str(body.get("subordinateEvaluation"))));
    entity.setUserFirst(blankToNull(str(body.get("userFirst"))));
    entity.setGoalFirst(blankToNull(str(body.get("goalFirst"))));
    entity.setPragmaticResponsibility(blankToNull(str(body.get("pragmaticResponsibility"))));
    entity.setGoodAtReview(blankToNull(str(body.get("goodAtReview"))));
    entity.setDareToLead(blankToNull(str(body.get("dareToLead"))));
    entity.setQualityEfficiency(blankToNull(str(body.get("qualityEfficiency"))));
    entity.setFullCommitment(blankToNull(str(body.get("fullCommitment"))));
    entity.setLoveCareer(blankToNull(str(body.get("loveCareer"))));
    entity.setStriveForFirst(blankToNull(str(body.get("striveForFirst"))));
    entity.setBraveChallenge(blankToNull(str(body.get("braveChallenge"))));
    entity.setOrganizationFirst(blankToNull(str(body.get("organizationFirst"))));
    entity.setHelpOthersSucceed(blankToNull(str(body.get("helpOthersSucceed"))));
    entity.setIntegrityHonesty(blankToNull(str(body.get("integrityHonesty"))));
    entity.setLawAbiding(blankToNull(str(body.get("lawAbiding"))));
    entity.setZeroScoreText(blankToNull(str(body.get("zeroScoreText"))));
    entity.setFourScoreText(blankToNull(str(body.get("fourScoreText"))));
    entity.setRedLight(blankToNull(str(body.get("redLight"))));
    entity.setYellowLight(blankToNull(str(body.get("yellowLight"))));
    entity.setGreenLight(blankToNull(str(body.get("greenLight"))));
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeValuesAssessmentEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }
}
