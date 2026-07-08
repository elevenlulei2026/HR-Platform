import type { EmployeeAssignment } from "@shared/api.interface";

export type AssignmentFieldDef = {
  label: string;
  /** 取值函数，返回 null/空则展示 — */
  value: (a: EmployeeAssignment) => string | null | undefined;
  mono?: boolean;
  highlight?: boolean;
};

export type AssignmentFieldSection = {
  title: string;
  fields: AssignmentFieldDef[];
};

function boolLabel(value?: boolean | null) {
  if (value === true) return "是";
  if (value === false) return "否";
  return null;
}

function labelOrCode(
  label?: string | null,
  code?: string | null,
  fallback?: string | null,
) {
  return label ?? code ?? fallback ?? null;
}

function handoverDisplay(a: EmployeeAssignment) {
  if (a.handoverEmployeeNo || a.handoverEmployeeName) {
    return [a.handoverEmployeeNo, a.handoverEmployeeName].filter(Boolean).join(" — ");
  }
  return null;
}

/** §2.1 任职记录全部展示字段（分组） */
export const ASSIGNMENT_DISPLAY_SECTIONS: AssignmentFieldSection[] = [
  {
    title: "生效与雇工",
    fields: [
      { label: "入职日期", value: (a) => a.hireDate, mono: true },
      { label: "司龄", value: (a) => a.companyTenure },
      { label: "是否重新雇佣", value: (a) => boolLabel(a.isRehire) },
      { label: "集团责任制开始日期", value: (a) => a.groupResponsibilityStartDate, mono: true },
      { label: "集团工龄开始日期", value: (a) => a.groupSeniorityStartDate, mono: true },
      { label: "供应商", value: (a) => labelOrCode(a.supplierLabel, a.supplier) },
      { label: "试用期期限", value: (a) => labelOrCode(a.probationPeriodLabel, a.probationPeriod) },
      { label: "预计转正日期", value: (a) => a.expectedRegularizationDate, mono: true },
      { label: "实际转正日期", value: (a) => a.actualRegularizationDate, mono: true },
    ],
  },
  {
    title: "职务异动",
    fields: [
      { label: "操作", value: (a) => labelOrCode(a.movementTypeName, a.movementType) },
      { label: "原因", value: (a) => labelOrCode(a.reasonDescription, a.reasonCode) },
      { label: "原因子项", value: (a) => labelOrCode(a.reasonSubDescription, a.reasonSubCode) },
      {
        label: "职务指示",
        value: (a) =>
          a.assignmentIndicatorLabel ??
          (a.assignmentIndicator === "PRIMARY" || a.isPrimary ? "主要职务" : "次要职务"),
      },
    ],
  },
  {
    title: "岗位与组织",
    fields: [
      { label: "法人实体", value: (a) => labelOrCode(a.legalEntityLabel, a.legalEntityCode) },
      {
        label: "部门",
        value: (a) =>
          a.organizationName
            ? a.organizationCode
              ? `${a.organizationName}（${a.organizationCode}）`
              : a.organizationName
            : null,
      },
      {
        label: "岗位",
        value: (a) =>
          a.positionName
            ? a.positionCode
              ? `${a.positionName}（${a.positionCode}）`
              : a.positionName
            : null,
        highlight: true,
      },
      { label: "岗位序列", value: (a) => labelOrCode(a.jobSequenceLabel, a.jobSequence) },
      { label: "职级", value: (a) => labelOrCode(a.jobGradeLabel, a.jobGradeCode) },
      { label: "合同地点", value: (a) => labelOrCode(a.contractLocationLabel, a.contractLocation) },
      { label: "工作地点", value: (a) => labelOrCode(a.workLocationLabel, a.workLocation) },
      { label: "责任制", value: (a) => boolLabel(a.isResponsibilitySystem) },
      { label: "审批权限", value: (a) => labelOrCode(a.approvalAuthorityLabel, a.approvalAuthority) },
      { label: "员工组", value: (a) => labelOrCode(a.employeeGroupName, a.employeeGroupCode) },
      { label: "员工子组", value: (a) => labelOrCode(a.employeeSubgroupName, a.employeeSubgroupCode) },
      { label: "该岗位开始日期", value: (a) => a.positionStartDate, mono: true },
      { label: "在岗时间", value: (a) => a.tenureOnPosition },
      { label: "员工性质", value: (a) => labelOrCode(a.employeeNatureLabel, a.employeeNature) },
      { label: "集团属性分级", value: (a) => labelOrCode(a.groupAttrLevelLabel, a.groupAttrLevel) },
    ],
  },
  {
    title: "薪酬与法人",
    fields: [
      { label: "发薪公司", value: (a) => labelOrCode(a.payrollCompanyLabel, a.payrollCompanyCode) },
      { label: "成本归属法人", value: (a) => labelOrCode(a.costLegalEntityLabel, a.costLegalEntityCode) },
      { label: "薪资组", value: (a) => labelOrCode(a.salaryGroupLabel, a.salaryGroup) },
    ],
  },
  {
    title: "离职信息",
    fields: [
      { label: "真实离职原因(HRBP)", value: (a) => a.trueResignationReasonHrbp },
      { label: "真实离职原因子类(HRBP)", value: (a) => a.trueResignationReasonSubHrbp },
      { label: "交接人", value: handoverDisplay, mono: true },
      { label: "离职去向", value: (a) => a.resignationDestination },
      { label: "是否启动竞业限制-公司建议", value: (a) => boolLabel(a.nonCompeteCompanySuggest) },
      { label: "是否给薪", value: (a) => boolLabel(a.nonCompeteWithPay) },
    ],
  },
];
