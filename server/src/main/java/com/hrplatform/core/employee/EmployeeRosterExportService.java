package com.hrplatform.core.employee;

import com.hrplatform.core.organization.OrganizationEntity;
import com.hrplatform.core.organization.PositionEntity;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Service
public class EmployeeRosterExportService {
  private final EmployeeService employeeService;
  private final EmployeeAssignmentHelper assignmentHelper;

  public EmployeeRosterExportService(
      EmployeeService employeeService,
      EmployeeAssignmentHelper assignmentHelper
  ) {
    this.employeeService = employeeService;
    this.assignmentHelper = assignmentHelper;
  }

  public byte[] exportExcel(
      List<String> columnKeys,
      List<EmployeeEntity> employees,
      Map<Long, EmployeeMasterVersionEntity> masterMap,
      Map<Long, EmployeeAssignmentEntity> primaryMap,
      Map<Long, OrganizationEntity> orgMap,
      Map<Long, PositionEntity> posMap,
      Map<Long, String> orgPathMap,
      Map<Long, EmployeeEntity> handoverMap,
      boolean revealSensitive,
      LocalDate asOfDate
  ) {
    List<ColumnDef> columns = resolveColumns(columnKeys);
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("花名册");
      Row header = sheet.createRow(0);
      for (int i = 0; i < columns.size(); i++) {
        header.createCell(i).setCellValue(columns.get(i).label());
        sheet.setColumnWidth(i, Math.min(48, Math.max(12, columns.get(i).label().length() + 4)) * 256);
      }
      int rowIdx = 1;
      LocalDate snapshot = asOfDate == null ? LocalDate.now() : asOfDate;
      for (EmployeeEntity employee : employees) {
        EmployeeMasterVersionEntity master = masterMap.get(employee.getId());
        EmployeeAssignmentEntity primary = primaryMap.get(employee.getId());
        if (primary != null) {
          assignmentHelper.computeDerivedFields(primary, List.of(primary), snapshot);
        }
        Map<String, Object> assignmentDto = primary == null
            ? Map.of()
            : assignmentHelper.enrichDto(primary, handoverMap, employeeService::dictLabel);
        OrganizationEntity org = primary == null ? null : orgMap.get(primary.getOrganizationId());
        PositionEntity pos = primary == null ? null : posMap.get(primary.getPositionId());
        if (org != null) {
          assignmentDto.put("organizationName", org.getName());
          assignmentDto.put("organizationCode", org.getCode());
        }
        if (pos != null) {
          assignmentDto.put("positionName", pos.getName());
          assignmentDto.put("positionCode", pos.getCode());
        }
        ExportRowContext ctx = new ExportRowContext(
            employee,
            master,
            primary,
            assignmentDto,
            orgPathMap.get(primary == null ? null : primary.getOrganizationId()),
            revealSensitive,
            employeeService
        );
        Row row = sheet.createRow(rowIdx++);
        for (int c = 0; c < columns.size(); c++) {
          Object value = columns.get(c).extractor().apply(ctx);
          row.createCell(c).setCellValue(value == null ? "" : String.valueOf(value));
        }
      }
      wb.write(out);
      return out.toByteArray();
    } catch (Exception e) {
      throw new IllegalStateException("导出失败", e);
    }
  }

  private List<ColumnDef> resolveColumns(List<String> keys) {
    Map<String, ColumnDef> registry = columnRegistry();
    if (keys == null || keys.isEmpty()) {
      return List.of(
          registry.get("fullName"),
          registry.get("employeeNo"),
          registry.get("mobile"),
          registry.get("adAccount"),
          registry.get("organizationPath"),
          registry.get("primaryPositionName"),
          registry.get("hireDate"),
          registry.get("status")
      );
    }
    List<ColumnDef> out = new ArrayList<>();
    for (String key : keys) {
      if (key == null || key.isBlank()) continue;
      ColumnDef def = registry.get(key.trim());
      if (def != null) out.add(def);
    }
    if (out.isEmpty()) {
      return resolveColumns(List.of());
    }
    return out;
  }

  private Map<String, ColumnDef> columnRegistry() {
    Map<String, ColumnDef> map = new LinkedHashMap<>();
    map.put("employeeNo", col("employeeNo", "工号", c -> c.employee().getEmployeeNo()));
    map.put("fullName", col("fullName", "姓名", c -> masterVal(c, EmployeeMasterVersionEntity::getFullName, c.employee().getFullName())));
    map.put("mobile", col("mobile", "电话", c -> {
      if (c.master() != null) {
        return c.employeeService().displayMobileEncrypted(c.master().getMobile(), c.revealSensitive());
      }
      return c.employeeService().displayMobile(c.employee(), c.revealSensitive());
    }));
    map.put("companyEmail", col("companyEmail", "公司邮箱", c -> masterVal(c, EmployeeMasterVersionEntity::getCompanyEmail, c.employee().getCompanyEmail())));
    map.put("personalEmail", col("personalEmail", "个人邮箱", c -> masterVal(c, EmployeeMasterVersionEntity::getPersonalEmail, null)));
    map.put("organizationPath", col("organizationPath", "组织路径", c -> c.organizationPath() == null ? "" : c.organizationPath()));
    map.put("primaryPositionName", col("primaryPositionName", "岗位", c -> {
      Object name = c.assignmentDto().get("positionName");
      return name == null ? "" : name;
    }));
    map.put("hireDate", col("hireDate", "入职日期", c -> {
      if (c.master() != null && c.master().getHireDate() != null) return c.master().getHireDate().toString();
      return c.employee().getHireDate() == null ? "" : c.employee().getHireDate().toString();
    }));
    map.put("status", col("status", "在职状态", c -> {
      String status = c.master() == null ? c.employee().getStatus() : c.master().getStatus();
      return c.employeeService().dictLabel("EMPLOYEE_STATUS", status);
    }));

    map.put("gender", col("gender", "性别", c -> labelOrCode(c, "gender", "genderLabel")));
    map.put("adAccount", col("adAccount", "AD账号", c -> masterVal(c, EmployeeMasterVersionEntity::getAdAccount, null)));
    map.put("maritalStatus", col("maritalStatus", "婚育状况", c -> dictMaster(c, "MARITAL_STATUS", EmployeeMasterVersionEntity::getMaritalStatus)));
    map.put("politicalAffiliation", col("politicalAffiliation", "政治面貌", c -> dictMaster(c, "POLITICAL_AFFILIATION", EmployeeMasterVersionEntity::getPoliticalAffiliation)));
    map.put("highestEducation", col("highestEducation", "最高学历", c -> dictMaster(c, "EDUCATION", EmployeeMasterVersionEntity::getHighestEducation)));
    map.put("highestEducationGradDate", col("highestEducationGradDate", "学历毕业日期", c -> dateMaster(c, EmployeeMasterVersionEntity::getHighestEducationGradDate)));
    map.put("fertilityStatus", col("fertilityStatus", "生育状况", c -> dictMaster(c, "FERTILITY_STATUS", EmployeeMasterVersionEntity::getFertilityStatus)));
    map.put("ethnicity", col("ethnicity", "民族", c -> dictMaster(c, "ETHNICITY", EmployeeMasterVersionEntity::getEthnicity)));
    map.put("hobbies", col("hobbies", "兴趣爱好", c -> masterVal(c, EmployeeMasterVersionEntity::getHobbies, null)));
    map.put("nationality", col("nationality", "国籍", c -> dictMaster(c, "NATIONALITY", EmployeeMasterVersionEntity::getNationality)));
    map.put("householdType", col("householdType", "户口性质", c -> dictMaster(c, "HOUSEHOLD_TYPE", EmployeeMasterVersionEntity::getHouseholdType)));
    map.put("householdLocation", col("householdLocation", "户籍地址", c -> masterVal(c, EmployeeMasterVersionEntity::getHouseholdLocation, null)));
    map.put("partyOrgTransferred", col("partyOrgTransferred", "党组织关系是否转入", c -> yesNo(masterVal(c, EmployeeMasterVersionEntity::getPartyOrgTransferred, null))));
    map.put("workStartDate", col("workStartDate", "参加工作日期", c -> dateMaster(c, EmployeeMasterVersionEntity::getWorkStartDate)));
    map.put("wechat", col("wechat", "微信", c -> masterVal(c, EmployeeMasterVersionEntity::getWechat, null)));
    map.put("officePhone", col("officePhone", "办公电话", c -> masterVal(c, EmployeeMasterVersionEntity::getOfficePhone, null)));
    map.put("officeExtension", col("officeExtension", "办公分机", c -> masterVal(c, EmployeeMasterVersionEntity::getOfficeExtension, null)));
    map.put("homePhone", col("homePhone", "家庭电话", c -> masterVal(c, EmployeeMasterVersionEntity::getHomePhone, null)));
    map.put("idCardAddress", col("idCardAddress", "身份证地址", c -> masterVal(c, EmployeeMasterVersionEntity::getIdCardAddress, null)));
    map.put("residenceAddress", col("residenceAddress", "现居住地址", c -> masterVal(c, EmployeeMasterVersionEntity::getResidenceAddress, null)));
    map.put("emergencyContactName", col("emergencyContactName", "紧急联系人", c -> masterVal(c, EmployeeMasterVersionEntity::getEmergencyContactName, null)));
    map.put("emergencyContactPhone", col("emergencyContactPhone", "紧急联系人电话", c -> masterVal(c, EmployeeMasterVersionEntity::getEmergencyContactPhone, null)));
    map.put("emergencyContactRelation", col("emergencyContactRelation", "与员工关系", c -> dictMaster(c, "EMPLOYEE_RELATION", EmployeeMasterVersionEntity::getEmergencyContactRelation)));
    map.put("recruitmentChannel", col("recruitmentChannel", "招聘渠道", c -> dictMaster(c, "RECRUITMENT_CHANNEL", EmployeeMasterVersionEntity::getRecruitmentChannel)));
    map.put("recruitmentChannelDetail", col("recruitmentChannelDetail", "渠道明细", c -> masterVal(c, EmployeeMasterVersionEntity::getRecruitmentChannelDetail, null)));
    map.put("groupSeniorityStartDate", col("groupSeniorityStartDate", "集团司龄起算日", c -> dateMaster(c, EmployeeMasterVersionEntity::getGroupSeniorityStartDate)));
    map.put("effectiveStartDate", col("effectiveStartDate", "主档生效日期", c -> dateMaster(c, EmployeeMasterVersionEntity::getEffectiveStartDate)));

    assignmentCol(map, "assignmentIndicator", "职务指示", "assignmentIndicatorLabel");
    assignmentCol(map, "assignmentEffectiveStartDate", "任职生效日期", "effectiveStartDate");
    assignmentCol(map, "assignmentHireDate", "任职入职日期", "hireDate");
    assignmentCol(map, "companyTenure", "司龄", "companyTenure");
    assignmentCol(map, "isRehire", "是否重新雇佣", "isRehire");
    assignmentCol(map, "groupResponsibilityStartDate", "集团责任制开始日期", "groupResponsibilityStartDate");
    assignmentCol(map, "assignmentGroupSeniorityStartDate", "集团工龄开始日期", "groupSeniorityStartDate");
    assignmentCol(map, "supplier", "供应商", "supplierLabel");
    assignmentCol(map, "probationPeriod", "试用期期限", "probationPeriodLabel");
    assignmentCol(map, "expectedRegularizationDate", "预计转正日期", "expectedRegularizationDate");
    assignmentCol(map, "actualRegularizationDate", "实际转正日期", "actualRegularizationDate");
    assignmentCol(map, "movementTypeName", "操作", "movementTypeName");
    assignmentCol(map, "reasonDescription", "原因", "reasonDescription");
    assignmentCol(map, "reasonSubDescription", "原因子项", "reasonSubDescription");
    assignmentCol(map, "legalEntity", "法人实体", "legalEntityLabel");
    assignmentCol(map, "organizationName", "部门", "organizationName");
    assignmentCol(map, "positionCode", "岗位编码", "positionCode");
    assignmentCol(map, "jobSequence", "岗位序列", "jobSequenceLabel");
    assignmentCol(map, "jobGrade", "职级", "jobGradeLabel");
    assignmentCol(map, "contractLocation", "合同地点", "contractLocationLabel");
    assignmentCol(map, "workLocation", "工作地点", "workLocationLabel");
    assignmentCol(map, "isResponsibilitySystem", "责任制", "isResponsibilitySystem");
    assignmentCol(map, "approvalAuthority", "审批权限", "approvalAuthorityLabel");
    assignmentCol(map, "employeeGroupName", "员工组", "employeeGroupName");
    assignmentCol(map, "employeeSubgroupName", "员工子组", "employeeSubgroupName");
    assignmentCol(map, "positionStartDate", "该岗位开始日期", "positionStartDate");
    assignmentCol(map, "tenureOnPosition", "在岗时间", "tenureOnPosition");
    assignmentCol(map, "employeeNature", "员工性质", "employeeNatureLabel");
    assignmentCol(map, "groupAttrLevel", "集团属性分级", "groupAttrLevelLabel");
    assignmentCol(map, "payrollCompany", "发薪公司", "payrollCompanyLabel");
    assignmentCol(map, "costLegalEntity", "成本归属法人", "costLegalEntityLabel");
    assignmentCol(map, "salaryGroup", "薪资组", "salaryGroupLabel");
    assignmentCol(map, "handoverEmployeeName", "交接人", "handoverEmployeeName");
    assignmentCol(map, "resignationDestination", "离职去向", "resignationDestination");
    assignmentCol(map, "nonCompeteCompanySuggest", "竞业限制-公司建议", "nonCompeteCompanySuggest");
    assignmentCol(map, "nonCompeteWithPay", "竞业限制-给薪", "nonCompeteWithPay");

    return map;
  }

  private void assignmentCol(Map<String, ColumnDef> map, String key, String label, String dtoField) {
    map.put(key, col(key, label, c -> formatAssignmentValue(c.assignmentDto().get(dtoField))));
  }

  private static ColumnDef col(String key, String label, Function<ExportRowContext, Object> extractor) {
    return new ColumnDef(key, label, extractor);
  }

  private static String yesNo(Object value) {
    if (value == null) return "";
    if (value instanceof Boolean b) return b ? "是" : "否";
    return String.valueOf(value);
  }

  private static String formatAssignmentValue(Object value) {
    if (value == null) return "";
    if (value instanceof Boolean b) return b ? "是" : "否";
    return String.valueOf(value);
  }

  private static String masterVal(
      ExportRowContext c,
      Function<EmployeeMasterVersionEntity, ?> getter,
      String fallback
  ) {
    if (c.master() != null) {
      Object v = getter.apply(c.master());
      return v == null ? (fallback == null ? "" : fallback) : String.valueOf(v);
    }
    return fallback == null ? "" : fallback;
  }

  private static String dateMaster(
      ExportRowContext c,
      Function<EmployeeMasterVersionEntity, java.time.LocalDate> getter
  ) {
    if (c.master() == null) return "";
    java.time.LocalDate d = getter.apply(c.master());
    return d == null ? "" : d.toString();
  }

  private static String dictMaster(
      ExportRowContext c,
      String dictType,
      Function<EmployeeMasterVersionEntity, String> getter
  ) {
    if (c.master() == null) return "";
    String code = getter.apply(c.master());
    return c.employeeService().dictLabel(dictType, code);
  }

  private static String labelOrCode(ExportRowContext c, String codeField, String labelField) {
    if (c.master() == null) return "";
    if ("MALE".equals(c.master().getGender())) return "男";
    if ("FEMALE".equals(c.master().getGender())) return "女";
    return c.master().getGender() == null ? "" : c.master().getGender();
  }

  private record ColumnDef(String key, String label, Function<ExportRowContext, Object> extractor) {}

  private record ExportRowContext(
      EmployeeEntity employee,
      EmployeeMasterVersionEntity master,
      EmployeeAssignmentEntity primary,
      Map<String, Object> assignmentDto,
      String organizationPath,
      boolean revealSensitive,
      EmployeeService employeeService
  ) {}
}
