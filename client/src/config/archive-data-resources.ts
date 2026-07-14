import type { ArchivePermissionSection, EmployeeArchiveResourcePath } from "@shared/api.interface";

import {
  PERSONAL_FAMILY_FIELDS,
  PERSONAL_ID_DOCUMENT_FIELDS,
  PERSONAL_INTERNAL_RELATIVE_FIELDS,
  SERVICE_ACCOMMODATION_FIELDS,
  SERVICE_ADMIN_INFO_FIELDS,
  SERVICE_ATTENDANCE_FIELDS,
  SERVICE_BANK_FIELDS,
  SERVICE_BENEFIT_FIELDS,
  SERVICE_SOCIAL_FIELDS,
  SERVICE_WORK_INJURY_FIELDS,
  WORK_AGREEMENT_FIELDS,
  WORK_CONTRACT_FIELDS,
  WORK_COST_CENTER_FIELDS,
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
  {
    path: "cost-center-allocations",
    title: "成本中心",
    section: "work",
    supported: true,
    description: "跨员工批量维护成本中心分摊，支持导入导出",
    formFields: WORK_COST_CENTER_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "legalEntityId", label: "成本归属法人" },
      { key: "costCenter", label: "成本中心" },
      { key: "percentage", label: "分摊比例(%)" },
      { key: "effectiveStartDate", label: "开始日期" },
      { key: "effectiveEndDate", label: "结束日期" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 成本中心 + 开始日期已存在则更新，否则新建。",
      fillSubHint: "法人请填编码或名称",
      templateSheetHint: "含「成本中心」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号、成本中心" },
        { text: "业务键：同工号 + 成本中心 + 开始日期 → 更新；否则新建" },
        { text: "分摊比例：0–100" },
      ],
    },
  },
  {
    path: "contracts",
    title: "合同信息",
    section: "service",
    supported: true,
    description: "跨员工批量维护合同档案，支持导入导出",
    formFields: WORK_CONTRACT_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "contractCode", label: "合同编号" },
      { key: "contractCategory", label: "合同类别" },
      { key: "legalEntityId", label: "合同法人" },
      { key: "operationType", label: "操作类型" },
      { key: "status", label: "状态" },
      { key: "startDate", label: "开始日期" },
      { key: "endDate", label: "结束日期" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 合同编号已存在则更新，否则新建。",
      fillSubHint: "类别/描述填父子值名称或编码；法人填编码或名称",
      templateSheetHint: "含「合同信息」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号、生效日期、合同编号、法人、操作类型、状态、类别、描述、开始日期" },
        { text: "业务键：同工号 + 合同编号 → 更新；否则新建" },
        { text: "无固定期限（二级 120/150）结束日期可空" },
      ],
    },
  },
  {
    path: "agreements",
    title: "协议信息",
    section: "service",
    supported: true,
    description: "跨员工批量维护协议档案，支持导入导出",
    formFields: WORK_AGREEMENT_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "agreementCode", label: "协议编号" },
      { key: "agreementCategory", label: "协议类别" },
      { key: "operationType", label: "操作类型" },
      { key: "legalEntityId", label: "协议法人" },
      { key: "status", label: "状态" },
      { key: "startDate", label: "开始日期" },
      { key: "endDate", label: "结束日期" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 协议编号已存在则更新，否则新建。",
      fillSubHint: "操作类型、协议类别请填字典名称；法人填编码或名称",
      templateSheetHint: "含「协议信息」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号、生效日期、协议编号、操作类型、状态、类别、法人、起止日期" },
        { text: "业务键：同工号 + 协议编号 → 更新；否则新建" },
        { text: "状态填写「有效 / 无效」" },
      ],
    },
  },
  {
    path: "attendance-cards",
    title: "考勤卡",
    section: "service",
    supported: true,
    description: "跨员工批量维护考勤卡（每人一套版本链），支持导入导出",
    formFields: SERVICE_ATTENDANCE_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "cardNo", label: "考勤卡号" },
      { key: "effectiveStartDate", label: "生效日期" },
      { key: "effectiveEndDate", label: "失效日期" },
      { key: "status", label: "状态" },
      { key: "participateInAttendance", label: "参与考勤" },
      { key: "remark", label: "备注" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 生效日期已存在则更新该版本；否则首条新建，已有卡则新增生效版本。",
      fillSubHint: "状态填「有效/无效」；是否参与考勤填「是/否」；失效日期由系统自动衔接",
      templateSheetHint: "含「考勤卡」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号、考勤卡号、生效日期" },
        { text: "业务键：同工号 + 生效日期 → 更新该版本；否则新建首条或新增生效版本" },
        { text: "状态默认有效；是否参与考勤默认是" },
      ],
    },
  },
  {
    path: "bank-accounts",
    title: "银行卡",
    section: "service",
    supported: true,
    description: "跨员工批量维护银行卡，支持导入导出",
    formFields: SERVICE_BANK_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "accountType", label: "账户类型" },
      { key: "bankId", label: "银行" },
      { key: "accountNo", label: "账号", sensitive: true },
      { key: "accountName", label: "户名" },
      { key: "currencyCode", label: "币种" },
      { key: "isPrimary", label: "主账户" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 账号已存在则更新，否则新建。",
      fillSubHint: "账户类型/国家/银行/支行/币种请填字典名称或编码",
      templateSheetHint: "含「银行卡」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号、账号" },
        { text: "业务键：同工号 + 账号 → 更新；否则新建" },
        { text: "主账户：填写「是 / 否」；设为主账户会取消该员工其他主账户" },
      ],
    },
  },
  {
    path: "social-insurances",
    title: "社保公积金",
    section: "service",
    supported: true,
    description: "跨员工批量维护社保公积金（每人一条），支持导入导出",
    formFields: SERVICE_SOCIAL_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "socialSecurityNo", label: "社保账号", sensitive: true },
      { key: "socialBase", label: "社保基数" },
      { key: "housingFundNo", label: "公积金账号" },
      { key: "housingBase", label: "公积金基数" },
      { key: "company", label: "公司" },
      { key: "insuranceRegion", label: "参保地区" },
      { key: "isCompanyPayroll", label: "公司代缴" },
    ],
    importConfig: {
      businessKeyHint: "同工号已存在则更新，否则新建（每人仅一条）。",
      fillSubHint: "公司、参保地区请填字典名称或编码",
      templateSheetHint: "含「社保公积金」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号" },
        { text: "业务键：同工号 → 更新；否则新建" },
        { text: "公司代缴：填写「是 / 否」" },
      ],
    },
  },
  {
    path: "special-benefits",
    title: "特殊福利",
    section: "service",
    supported: true,
    description: "跨员工批量维护特殊福利，支持导入导出",
    formFields: SERVICE_BENEFIT_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "hasSpecialBenefit", label: "是否有特殊福利" },
      { key: "endDate", label: "截止日期" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 是否有特殊福利 + 截止日期已存在则更新，否则新建。",
      fillSubHint: "是否有特殊福利填「是 / 否」",
      templateSheetHint: "含「特殊福利」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号、是否有特殊福利" },
        { text: "业务键：同工号 + 是否有特殊福利 + 截止日期 → 更新；否则新建" },
      ],
    },
  },
  {
    path: "work-injuries",
    title: "工伤信息",
    section: "service",
    supported: true,
    description: "跨员工批量维护工伤信息，支持导入导出",
    formFields: SERVICE_WORK_INJURY_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "accidentDate", label: "事故发生日期" },
      { key: "accidentReason", label: "事故原因" },
      { key: "isRecognized", label: "认定为工伤" },
      { key: "recognitionDate", label: "认定日期" },
      { key: "participatedLaborAssessment", label: "劳动力鉴定" },
      { key: "witness", label: "见证人" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 事故发生日期已存在则更新，否则新建。",
      fillSubHint: "是否认定/是否参加鉴定填「是 / 否」，可空",
      templateSheetHint: "含「工伤信息」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号" },
        { text: "业务键：同工号 + 事故发生日期 → 更新；否则新建" },
      ],
    },
  },
  {
    path: "admin-infos",
    title: "行政信息",
    section: "service",
    supported: true,
    description: "跨员工批量维护行政信息（每人一套版本链），支持导入导出",
    formFields: SERVICE_ADMIN_INFO_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "effectiveStartDate", label: "生效日期" },
      { key: "effectiveEndDate", label: "失效日期" },
      { key: "status", label: "状态" },
      { key: "workEnvironment", label: "工作环境" },
      { key: "takeShuttle", label: "乘坐班车" },
      { key: "parkingPermit", label: "停车证" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 生效日期已存在则更新该版本；否则首条新建，已有记录则新增生效版本。",
      fillSubHint: "工作环境填字典名称或编码；班车/停车证填「是/否」；失效日期由系统自动衔接",
      templateSheetHint: "含「行政信息」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号、生效日期、工作环境" },
        { text: "业务键：同工号 + 生效日期 → 更新该版本；否则新建首条或新增生效版本" },
        { text: "状态默认有效；班车/停车证默认否" },
      ],
    },
  },
  {
    path: "accommodations",
    title: "住宿信息",
    section: "service",
    supported: true,
    description: "跨员工批量维护住宿信息（每人一套版本链），支持导入导出",
    formFields: SERVICE_ACCOMMODATION_FIELDS,
    listColumns: [
      { key: "employeeNo", label: "工号" },
      { key: "employeeName", label: "姓名" },
      { key: "organizationName", label: "部门" },
      { key: "effectiveStartDate", label: "生效日期" },
      { key: "effectiveEndDate", label: "失效日期" },
      { key: "status", label: "状态" },
      { key: "hasAccommodation", label: "是否住宿" },
      { key: "accommodationFeeTotal", label: "住宿费汇总" },
    ],
    importConfig: {
      businessKeyHint: "同工号 + 生效日期已存在则更新该版本；否则首条新建，已有记录则新增生效版本。",
      fillSubHint: "是否住宿填「是/否」；失效日期由系统自动衔接",
      templateSheetHint: "含「住宿信息」数据表与「说明」工作表",
      fillHints: [
        { text: "必填：工号、生效日期" },
        { text: "业务键：同工号 + 生效日期 → 更新该版本；否则新建首条或新增生效版本" },
        { text: "状态默认有效；是否住宿默认否" },
      ],
    },
  },
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
