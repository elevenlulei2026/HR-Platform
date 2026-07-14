import type { ArchivePermissionSection, EmployeeArchiveResourcePath } from "@shared/api.interface";

import {
  PERSONAL_FAMILY_FIELDS,
  PERSONAL_ID_DOCUMENT_FIELDS,
  PERSONAL_INTERNAL_RELATIVE_FIELDS,
} from "@/components/admin/employee-archive/archive-field-defs";
import type { ArchiveFieldDef } from "@/components/admin/employee-archive/ArchiveMultiSection";
import type { ArchiveDataImportFillHint } from "@/components/admin/archive-data/ArchiveDataImportDialog";
import { ARCHIVE_RESOURCE_SECTION } from "@/config/archive-permissions";

export type ArchiveDataResourceDef = {
  path: EmployeeArchiveResourcePath;
  title: string;
  section: ArchivePermissionSection;
  /** 已实现批管 Handler + 前端表单则为 true */
  supported: boolean;
  description: string;
  listColumns: Array<{ key: string; label: string; sensitive?: boolean }>;
  formFields: ArchiveFieldDef[];
  /** 导入弹窗配置（supported 模块必填） */
  importConfig?: {
    businessKeyHint: string;
    fillHints: ArchiveDataImportFillHint[];
    fillSubHint?: string;
    templateSheetHint?: string;
  };
};

const BASE: Array<
  Omit<ArchiveDataResourceDef, "formFields" | "listColumns"> & {
    formFields?: ArchiveFieldDef[];
    listColumns?: ArchiveDataResourceDef["listColumns"];
  }
> = [
  {
    path: "id-documents",
    title: "证件信息",
    section: "personal",
    supported: true,
    description: "跨员工批量维护证件信息，支持导入导出",
    formFields: PERSONAL_ID_DOCUMENT_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "countryRegion", label: "国家/地区" },
      { key: "idType", label: "证件类型" },
      { key: "idNumber", label: "证件号码", sensitive: true },
      { key: "validFrom", label: "生效日期" },
      { key: "validTo", label: "失效日期" },
      { key: "isPrimary", label: "主证件" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 证件类型已存在则更新，否则新建。",
      fillSubHint: "国家/地区、证件类型请填字典名称（与页面展示一致）",
      templateSheetHint: "含「证件信息」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号、证件号码" },
        { text: "业务键：同工号 + 证件类型 → 更新；否则新建" },
        { text: "主证件：填写「是 / 否」" },
      ],
    },
  },
  {
    path: "family-members",
    title: "家庭成员",
    section: "personal",
    supported: true,
    description: "跨员工批量维护家庭成员，支持导入导出",
    formFields: PERSONAL_FAMILY_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "name", label: "成员姓名" },
      { key: "relation", label: "关系" },
      { key: "isInternalEmployee", label: "本公司员工" },
      { key: "phone", label: "电话" },
      { key: "employer", label: "工作单位" },
      { key: "position", label: "职位" },
      { key: "birthDate", label: "出生日期" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 姓名 + 与员工关系已存在则更新，否则新建。",
      fillSubHint: "与员工关系请填字典名称（与页面展示一致）",
      templateSheetHint: "含「家庭成员」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号、姓名" },
        { text: "业务键：同工号 + 姓名 + 与员工关系 → 更新；否则新建" },
        { text: "本公司员工：填写「是 / 否」" },
      ],
    },
  },
  {
    path: "internal-relatives",
    title: "内部亲属",
    section: "personal",
    supported: true,
    description: "跨员工批量维护内部亲属，支持导入导出",
    formFields: PERSONAL_INTERNAL_RELATIVE_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "relativeEmployeeId", label: "关联员工" },
      { key: "relation", label: "关系" },
      { key: "departmentName", label: "关联部门" },
      { key: "positionName", label: "关联岗位" },
      { key: "employmentStatus", label: "在职状态" },
      { key: "hireDate", label: "入职日期" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 关联员工工号已存在则更新，否则新建。",
      fillSubHint: "任职快照随关联员工自动带出；关系请填字典名称",
      templateSheetHint: "含「内部亲属」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号、关联员工工号" },
        { text: "业务键：同工号 + 关联员工工号 → 更新；否则新建" },
        { text: "部门/岗位等快照勿填，系统自动同步" },
      ],
    },
  },
  { path: "cost-center-allocations", title: "成本中心", section: "work", supported: false, description: "能力建设中" },
  { path: "contracts", title: "合同信息", section: "service", supported: false, description: "能力建设中" },
  { path: "agreements", title: "协议信息", section: "service", supported: false, description: "能力建设中" },
  { path: "attendance-cards", title: "考勤卡", section: "service", supported: false, description: "能力建设中" },
  { path: "bank-accounts", title: "银行卡", section: "service", supported: false, description: "能力建设中" },
  { path: "social-insurances", title: "社保公积金", section: "service", supported: false, description: "能力建设中" },
  { path: "special-benefits", title: "特殊福利", section: "service", supported: false, description: "能力建设中" },
  { path: "work-injuries", title: "工伤信息", section: "service", supported: false, description: "能力建设中" },
  { path: "admin-infos", title: "行政信息", section: "service", supported: false, description: "能力建设中" },
  { path: "accommodations", title: "住宿信息", section: "service", supported: false, description: "能力建设中" },
  { path: "attachments", title: "附件", section: "service", supported: false, description: "能力建设中" },
  { path: "educations", title: "教育经历", section: "background", supported: false, description: "能力建设中" },
  { path: "work-experiences", title: "工作经历", section: "background", supported: false, description: "能力建设中" },
  { path: "qualifications", title: "资格证书", section: "background", supported: false, description: "能力建设中" },
  { path: "title-certificates", title: "职称证书", section: "background", supported: false, description: "能力建设中" },
  { path: "rewards", title: "奖励记录", section: "background", supported: false, description: "能力建设中" },
  { path: "penalties", title: "惩处记录", section: "background", supported: false, description: "能力建设中" },
  { path: "training-records", title: "培训记录", section: "development", supported: false, description: "能力建设中" },
  { path: "performance-records", title: "绩效记录", section: "development", supported: false, description: "能力建设中" },
  { path: "values-assessments", title: "价值观评估", section: "development", supported: false, description: "能力建设中" },
  { path: "talent-reviews", title: "人才盘点", section: "development", supported: false, description: "能力建设中" },
  { path: "projects", title: "项目信息", section: "development", supported: false, description: "能力建设中" },
  { path: "agent-assignments", title: "智能体归属", section: "development", supported: false, description: "能力建设中" },
];

export const ARCHIVE_DATA_RESOURCES: ArchiveDataResourceDef[] = BASE.map((item) => ({
  ...item,
  section: item.section ?? ARCHIVE_RESOURCE_SECTION[item.path] ?? "personal",
  formFields: item.formFields ?? [],
  listColumns: item.listColumns ?? [
    { key: "employeeNo", label: "工号" },
    { key: "employeeName", label: "姓名" },
  ],
}));

export function getArchiveDataResource(path: string): ArchiveDataResourceDef | undefined {
  return ARCHIVE_DATA_RESOURCES.find((r) => r.path === path);
}

export function isArchiveDataResourcePath(path: string): path is EmployeeArchiveResourcePath {
  return ARCHIVE_DATA_RESOURCES.some((r) => r.path === path);
}
