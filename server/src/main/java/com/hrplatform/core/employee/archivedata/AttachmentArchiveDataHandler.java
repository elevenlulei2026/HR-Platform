package com.hrplatform.core.employee.archivedata;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeArchiveResponseMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeAttachmentEntity;
import com.hrplatform.core.employee.EmployeeAttachmentMapper;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ExportFilter;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ImportResult;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ListFilter;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.PageResult;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.blankToNull;
import static com.hrplatform.core.employee.archivedata.ArchiveDataSupport.str;

/**
 * 附件批管。文件本体经上传接口取得 storageKey 后再创建记录；不支持 Excel 导入文件。
 * 导出仅为台账元数据（不含文件内容）。
 */
@Component
public class AttachmentArchiveDataHandler implements ArchiveDataResourceHandler {
  public static final String PATH = "attachments";

  private static final String[] EXPORT_HEADERS = {
      "工号", "附件类型", "文件名", "上传时间"
  };

  private static final Map<String, String> TYPE_LABELS = new LinkedHashMap<>();

  static {
    TYPE_LABELS.put("PHOTO", "照片");
    TYPE_LABELS.put("ID_CARD", "身份证");
    TYPE_LABELS.put("DIPLOMA", "学历证");
    TYPE_LABELS.put("RESUME", "简历");
    TYPE_LABELS.put("BANK_CARD", "银行卡");
    TYPE_LABELS.put("MEDICAL", "体检单");
    TYPE_LABELS.put("OFFER", "应聘登记表");
    TYPE_LABELS.put("RESIGNATION", "离职证明");
    TYPE_LABELS.put("CERTIFICATE", "资格证书");
    TYPE_LABELS.put("TITLE_CERTIFICATE", "职称证书");
    TYPE_LABELS.put("OTHER", "其他");
  }

  private final ArchiveDataSupport support;
  private final EmployeeArchiveService archiveService;
  private final EmployeeAttachmentMapper attachmentMapper;

  public AttachmentArchiveDataHandler(
      ArchiveDataSupport support,
      EmployeeArchiveService archiveService,
      EmployeeAttachmentMapper attachmentMapper
  ) {
    this.support = support;
    this.archiveService = archiveService;
    this.attachmentMapper = attachmentMapper;
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

    LambdaQueryWrapper<EmployeeAttachmentEntity> qw =
        new LambdaQueryWrapper<EmployeeAttachmentEntity>()
            .orderByDesc(EmployeeAttachmentEntity::getUploadedAt)
            .orderByDesc(EmployeeAttachmentEntity::getId);
    if (employeeIds != null) {
      qw.in(EmployeeAttachmentEntity::getEmployeeId, employeeIds);
    }

    long p = Math.max(1, filter.page());
    long ps = Math.max(1, Math.min(200, filter.pageSize()));
    Long total = attachmentMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    List<EmployeeAttachmentEntity> records = attachmentMapper.selectList(qw);
    Map<Long, EmployeeEntity> empMap = support.loadEmployees(
        records.stream().map(EmployeeAttachmentEntity::getEmployeeId).toList()
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
    EmployeeAttachmentEntity created =
        archiveService.createAttachment(employee.getId(), mapEntity(body, true));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(created, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive) {
    EmployeeAttachmentEntity current = attachmentMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("附件记录不存在");
    EmployeeEntity employee = support.employeeService().require(current.getEmployeeId());
    EmployeeAttachmentEntity updated =
        archiveService.updateAttachment(employee.getId(), id, mapEntity(body, false));
    Map<Long, String> orgNameMap = support.loadOrgNames(Set.of(employee.getId()));
    return toRow(updated, employee, orgNameMap);
  }

  @Override
  @Transactional
  public Map<String, Object> delete(long id) {
    EmployeeAttachmentEntity current = attachmentMapper.selectById(id);
    if (current == null) throw new IllegalArgumentException("附件记录不存在");
    archiveService.deleteAttachment(current.getEmployeeId(), id);
    Map<String, Object> out = new HashMap<>();
    out.put("id", String.valueOf(id));
    out.put("employeeId", String.valueOf(current.getEmployeeId()));
    return out;
  }

  @Override
  public byte[] buildImportTemplate() {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet hint = wb.createSheet("说明");
      hint.createRow(0).createCell(0).setCellValue("附件批管说明");
      hint.createRow(1).createCell(0).setCellValue("附件为文件对象，不支持通过 Excel 导入文件本体。");
      hint.createRow(2).createCell(0).setCellValue("请在「管理数据 › 附件」页面选择员工、附件类型并上传文件。");
      hint.createRow(3).createCell(0).setCellValue("导出功能仅导出附件台账元数据（工号/类型/文件名/上传时间），不含文件内容。");
      hint.createRow(4).createCell(0).setCellValue(
          "附件类型编码：" + String.join("、", TYPE_LABELS.entrySet().stream()
              .map(e -> e.getKey() + "=" + e.getValue())
              .toList())
      );
      hint.setColumnWidth(0, 100 * 256);
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("生成导入模板失败", e);
    }
  }

  @Override
  public ImportResult importExcel(MultipartFile file) {
    throw new IllegalArgumentException("附件不支持 Excel 导入，请在页面「新建」中选择员工并上传文件");
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
      Sheet sheet = wb.createSheet("附件台账");
      Row header = sheet.createRow(0);
      for (int i = 0; i < EXPORT_HEADERS.length; i++) {
        header.createCell(i).setCellValue(EXPORT_HEADERS[i]);
        sheet.setColumnWidth(i, 22 * 256);
      }
      int r = 1;
      for (Map<String, Object> item : page.records()) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(str(item.get("employeeNo")));
        String type = str(item.get("attachmentType"));
        String typeLabel = str(item.get("attachmentTypeLabel"));
        row.createCell(1).setCellValue(typeLabel.isBlank() ? typeLabelOf(type) : typeLabel);
        row.createCell(2).setCellValue(str(item.get("originalFilename")));
        String uploaded = str(item.get("uploadedAt"));
        if (uploaded.length() >= 10) uploaded = uploaded.substring(0, 10);
        row.createCell(3).setCellValue(uploaded);
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private EmployeeAttachmentEntity mapEntity(Map<String, Object> body, boolean requireFile) {
    EmployeeAttachmentEntity entity = new EmployeeAttachmentEntity();
    String type = blankToNull(str(body.get("attachmentType")));
    if (type == null) throw new IllegalArgumentException("请选择附件类型");
    type = type.trim().toUpperCase();
    if (!TYPE_LABELS.containsKey(type)) {
      throw new IllegalArgumentException("无效的附件类型: " + type);
    }
    entity.setAttachmentType(type);

    String storageKey = blankToNull(str(body.get("storageKey")));
    String filename = blankToNull(str(body.get("originalFilename")));
    if (requireFile) {
      if (storageKey == null) throw new IllegalArgumentException("请先上传文件");
      entity.setStorageKey(storageKey);
      entity.setOriginalFilename(filename);
    } else {
      // 编辑仅允许改类型；勿用空值覆盖已有 storageKey
      if (storageKey != null) entity.setStorageKey(storageKey);
      if (filename != null) entity.setOriginalFilename(filename);
    }
    return entity;
  }

  private Map<String, Object> toRow(
      EmployeeAttachmentEntity row,
      EmployeeEntity employee,
      Map<Long, String> orgNameMap
  ) {
    Map<String, Object> dto = EmployeeArchiveResponseMapper.toPlainMap(row);
    dto.put("id", String.valueOf(row.getId()));
    dto.put("employeeId", String.valueOf(row.getEmployeeId()));
    // 列表不回传 storageKey，避免前端误展示内部路径
    dto.remove("storageKey");
    dto.put("attachmentTypeLabel", typeLabelOf(row.getAttachmentType()));
    support.attachEmployeeDisplay(dto, employee, orgNameMap);
    return dto;
  }

  private static String typeLabelOf(String type) {
    if (type == null || type.isBlank()) return "";
    return TYPE_LABELS.getOrDefault(type.trim().toUpperCase(), type);
  }
}
