import type { OrganizationTreeNode } from "@shared/api.interface";
import type { Employee, EmployeeAssignment } from "@shared/api.interface";

import { employeeStatusLabel } from "@/api/employee";

export type RosterColumnCategory = "core" | "master" | "assignment";

export type RosterColumnDef = {
  key: string;
  label: string;
  category: RosterColumnCategory;
  categoryLabel: string;
  defaultVisible?: boolean;
  minWidth?: string;
  align?: "left" | "right";
  mono?: boolean;
};

export const ROSTER_COLUMN_STORAGE_KEY = "hr-employee-roster-columns-v2";

export const DEFAULT_ROSTER_COLUMN_KEYS: string[] = [
  "fullName",
  "employeeNo",
  "mobile",
  "adAccount",
  "organizationPath",
  "primaryPositionName",
  "hireDate",
  "status",
];

export const ROSTER_COLUMNS: RosterColumnDef[] = [
  { key: "fullName", label: "姓名", category: "core", categoryLabel: "默认", defaultVisible: true },
  { key: "employeeNo", label: "工号", category: "core", categoryLabel: "默认", defaultVisible: true, mono: true },
  { key: "mobile", label: "电话", category: "core", categoryLabel: "默认", defaultVisible: true, mono: true },
  { key: "adAccount", label: "AD账号", category: "core", categoryLabel: "默认", defaultVisible: true, mono: true },
  { key: "organizationPath", label: "组织路径", category: "core", categoryLabel: "默认", defaultVisible: true, minWidth: "220px" },
  { key: "primaryPositionName", label: "岗位", category: "core", categoryLabel: "默认", defaultVisible: true },
  { key: "hireDate", label: "入职日期", category: "core", categoryLabel: "默认", defaultVisible: true, mono: true },
  { key: "status", label: "在职状态", category: "core", categoryLabel: "默认", defaultVisible: true },
  { key: "companyEmail", label: "公司邮箱", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "personalEmail", label: "个人邮箱", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "gender", label: "性别", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "maritalStatus", label: "婚育状况", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "politicalAffiliation", label: "政治面貌", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "highestEducation", label: "最高学历", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "highestEducationGradDate", label: "学历毕业日期", category: "master", categoryLabel: "个人信息 > 个人主档", mono: true },
  { key: "fertilityStatus", label: "生育状况", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "ethnicity", label: "民族", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "hobbies", label: "兴趣爱好", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "nationality", label: "国籍", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "householdType", label: "户口性质", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "householdLocation", label: "户籍地址", category: "master", categoryLabel: "个人信息 > 个人主档", minWidth: "180px" },
  { key: "partyOrgTransferred", label: "党组织关系是否转入", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "workStartDate", label: "参加工作日期", category: "master", categoryLabel: "个人信息 > 个人主档", mono: true },
  { key: "wechat", label: "微信", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "officePhone", label: "办公电话", category: "master", categoryLabel: "个人信息 > 个人主档", mono: true },
  { key: "officeExtension", label: "办公分机", category: "master", categoryLabel: "个人信息 > 个人主档", mono: true },
  { key: "homePhone", label: "家庭电话", category: "master", categoryLabel: "个人信息 > 个人主档", mono: true },
  { key: "idCardAddress", label: "身份证地址", category: "master", categoryLabel: "个人信息 > 个人主档", minWidth: "180px" },
  { key: "residenceAddress", label: "现居住地址", category: "master", categoryLabel: "个人信息 > 个人主档", minWidth: "180px" },
  { key: "emergencyContactName", label: "紧急联系人", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "emergencyContactPhone", label: "紧急联系人电话", category: "master", categoryLabel: "个人信息 > 个人主档", mono: true },
  { key: "emergencyContactRelation", label: "与员工关系", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "recruitmentChannel", label: "招聘渠道", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "recruitmentChannelDetail", label: "渠道明细", category: "master", categoryLabel: "个人信息 > 个人主档" },
  { key: "groupSeniorityStartDate", label: "集团司龄起算日", category: "master", categoryLabel: "个人信息 > 个人主档", mono: true },
  { key: "effectiveStartDate", label: "主档生效日期", category: "master", categoryLabel: "个人信息 > 个人主档", mono: true },
  { key: "assignmentIndicator", label: "职务指示", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "assignmentEffectiveStartDate", label: "任职生效日期", category: "assignment", categoryLabel: "工作信息 > 任职记录", mono: true },
  { key: "assignmentHireDate", label: "任职入职日期", category: "assignment", categoryLabel: "工作信息 > 任职记录", mono: true },
  { key: "companyTenure", label: "司龄", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "isRehire", label: "是否重新雇佣", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "groupResponsibilityStartDate", label: "集团责任制开始日期", category: "assignment", categoryLabel: "工作信息 > 任职记录", mono: true },
  { key: "assignmentGroupSeniorityStartDate", label: "集团工龄开始日期", category: "assignment", categoryLabel: "工作信息 > 任职记录", mono: true },
  { key: "supplier", label: "供应商", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "probationPeriod", label: "试用期期限", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "expectedRegularizationDate", label: "预计转正日期", category: "assignment", categoryLabel: "工作信息 > 任职记录", mono: true },
  { key: "actualRegularizationDate", label: "实际转正日期", category: "assignment", categoryLabel: "工作信息 > 任职记录", mono: true },
  { key: "movementTypeName", label: "操作", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "reasonDescription", label: "原因", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "reasonSubDescription", label: "原因子项", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "legalEntity", label: "法人实体", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "organizationName", label: "部门", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "positionCode", label: "岗位编码", category: "assignment", categoryLabel: "工作信息 > 任职记录", mono: true },
  { key: "jobSequence", label: "岗位序列", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "jobGrade", label: "职级", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "contractLocation", label: "合同地点", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "workLocation", label: "工作地点", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "isResponsibilitySystem", label: "责任制", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "approvalAuthority", label: "审批权限", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "employeeGroupName", label: "员工组", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "employeeSubgroupName", label: "员工子组", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "positionStartDate", label: "该岗位开始日期", category: "assignment", categoryLabel: "工作信息 > 任职记录", mono: true },
  { key: "tenureOnPosition", label: "在岗时间", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "employeeNature", label: "员工性质", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "groupAttrLevel", label: "集团属性分级", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "payrollCompany", label: "发薪公司", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "costLegalEntity", label: "成本归属法人", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "salaryGroup", label: "薪资组", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "handoverEmployeeName", label: "交接人", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "resignationDestination", label: "离职去向", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "nonCompeteCompanySuggest", label: "竞业限制-公司建议", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
  { key: "nonCompeteWithPay", label: "竞业限制-给薪", category: "assignment", categoryLabel: "工作信息 > 任职记录" },
];

const COLUMN_MAP = new Map(ROSTER_COLUMNS.map((col) => [col.key, col]));

const MASTER_LABEL_KEYS: Record<string, keyof Employee> = {
  gender: "genderLabel",
  maritalStatus: "maritalStatusLabel",
  politicalAffiliation: "politicalAffiliationLabel",
  highestEducation: "highestEducationLabel",
  fertilityStatus: "fertilityStatusLabel",
  ethnicity: "ethnicityLabel",
  nationality: "nationalityLabel",
  householdType: "householdTypeLabel",
  emergencyContactRelation: "emergencyContactRelationLabel",
  recruitmentChannel: "recruitmentChannelLabel",
};

const ASSIGNMENT_VALUE_KEYS: Record<string, keyof EmployeeAssignment | string> = {
  assignmentIndicator: "assignmentIndicatorLabel",
  assignmentEffectiveStartDate: "effectiveStartDate",
  assignmentHireDate: "hireDate",
  companyTenure: "companyTenure",
  isRehire: "isRehire",
  groupResponsibilityStartDate: "groupResponsibilityStartDate",
  assignmentGroupSeniorityStartDate: "groupSeniorityStartDate",
  supplier: "supplierLabel",
  probationPeriod: "probationPeriodLabel",
  expectedRegularizationDate: "expectedRegularizationDate",
  actualRegularizationDate: "actualRegularizationDate",
  movementTypeName: "movementTypeName",
  reasonDescription: "reasonDescription",
  reasonSubDescription: "reasonSubDescription",
  legalEntity: "legalEntityLabel",
  organizationName: "organizationName",
  positionCode: "positionCode",
  jobSequence: "jobSequenceLabel",
  jobGrade: "jobGradeLabel",
  contractLocation: "contractLocationLabel",
  workLocation: "workLocationLabel",
  isResponsibilitySystem: "isResponsibilitySystem",
  approvalAuthority: "approvalAuthorityLabel",
  employeeGroupName: "employeeGroupName",
  employeeSubgroupName: "employeeSubgroupName",
  positionStartDate: "positionStartDate",
  tenureOnPosition: "tenureOnPosition",
  employeeNature: "employeeNatureLabel",
  groupAttrLevel: "groupAttrLevelLabel",
  payrollCompany: "payrollCompanyLabel",
  costLegalEntity: "costLegalEntityLabel",
  salaryGroup: "salaryGroupLabel",
  handoverEmployeeName: "handoverEmployeeName",
  resignationDestination: "resignationDestination",
  nonCompeteCompanySuggest: "nonCompeteCompanySuggest",
  nonCompeteWithPay: "nonCompeteWithPay",
};

function formatBool(value: unknown): string {
  if (value === true) return "是";
  if (value === false) return "否";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function masterFieldValue(employee: Employee, key: string): string {
  const labelKey = MASTER_LABEL_KEYS[key];
  if (labelKey) {
    const label = employee[labelKey];
    if (typeof label === "string" && label) return label;
  }
  if (key === "partyOrgTransferred") return formatBool(employee.partyOrgTransferred);
  const raw = employee[key as keyof Employee];
  if (raw === null || raw === undefined || raw === "") return "—";
  return String(raw);
}

function assignmentFieldValue(assignment: EmployeeAssignment | undefined, key: string): string {
  if (!assignment) return "—";
  const field = ASSIGNMENT_VALUE_KEYS[key];
  if (!field) return "—";
  const raw = assignment[field as keyof EmployeeAssignment];
  if (key === "isRehire" || key === "isResponsibilitySystem" || key.startsWith("nonCompete")) {
    return formatBool(raw);
  }
  if (raw === null || raw === undefined || raw === "") return "—";
  return String(raw);
}

export function getRosterColumnDef(key: string): RosterColumnDef | undefined {
  return COLUMN_MAP.get(key);
}

export function loadVisibleColumnKeys(): string[] {
  try {
    const raw = localStorage.getItem(ROSTER_COLUMN_STORAGE_KEY);
    if (!raw) return [...DEFAULT_ROSTER_COLUMN_KEYS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_ROSTER_COLUMN_KEYS];
    const keys = parsed.filter((k): k is string => typeof k === "string" && COLUMN_MAP.has(k));
    return keys.length > 0 ? keys : [...DEFAULT_ROSTER_COLUMN_KEYS];
  } catch {
    return [...DEFAULT_ROSTER_COLUMN_KEYS];
  }
}

export function saveVisibleColumnKeys(keys: string[]) {
  localStorage.setItem(ROSTER_COLUMN_STORAGE_KEY, JSON.stringify(keys));
}

export function resolveRosterCellValue(employee: Employee, key: string, orgPath?: string): string {
  switch (key) {
    case "employeeNo":
      return employee.employeeNo || "—";
    case "fullName":
      return employee.fullName || "—";
    case "mobile":
      return employee.mobile || "—";
    case "companyEmail":
      return employee.companyEmail || "—";
    case "adAccount":
      return employee.adAccount || "—";
    case "personalEmail":
      return employee.personalEmail || "—";
    case "organizationPath":
      return employee.primaryOrganizationPath || orgPath || employee.primaryOrganizationName || "—";
    case "primaryPositionName":
      return employee.primaryPositionName || employee.primaryAssignment?.positionName || "—";
    case "hireDate":
      return employee.hireDate || "—";
    case "status":
      return employee.statusLabel ?? employeeStatusLabel(employee.status);
    default: {
      const def = getRosterColumnDef(key);
      if (!def) return "—";
      if (def.category === "master") return masterFieldValue(employee, key);
      if (def.category === "assignment") return assignmentFieldValue(employee.primaryAssignment, key);
      return "—";
    }
  }
}

export function buildOrgPathName(orgId: string, nodes: OrganizationTreeNode[]): string {
  if (!orgId) return "";
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byCode = new Map(nodes.map((n) => [n.code, n]));
  const start = byId.get(orgId);
  if (!start) return "";

  const names: string[] = [];
  const visitedCodes = new Set<string>();
  let cur: OrganizationTreeNode | undefined = start;
  while (cur) {
    if (cur.code && visitedCodes.has(cur.code)) break;
    if (cur.code) visitedCodes.add(cur.code);
    if (cur.name) names.unshift(cur.name);
    if (!cur.parentCode) break;
    cur = byCode.get(cur.parentCode);
  }
  return names.join(" / ");
}
