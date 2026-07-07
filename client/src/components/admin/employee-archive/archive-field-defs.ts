import type { ArchiveFieldDef } from "@/components/admin/employee-archive/ArchiveMultiSection";

export const BOOLEAN_OPTIONS = [
  { value: "true", label: "是" },
  { value: "false", label: "否" },
];

export const RECORD_TYPE_OPTIONS = [
  { value: "SHUTTLE", label: "班车" },
  { value: "ACCOMMODATION", label: "住宿" },
];

export const PERSONAL_ID_DOCUMENT_FIELDS: ArchiveFieldDef[] = [
  { key: "countryRegion", label: "国家/地区", dictKey: "countryRegions" },
  { key: "idType", label: "证件类型", dictKey: "idTypes" },
  { key: "idNumber", label: "证件号码", required: true, sensitive: true },
  { key: "validFrom", label: "生效日期", type: "date" },
  { key: "validTo", label: "失效日期", type: "date" },
  { key: "isPrimary", label: "主证件", type: "boolean", options: BOOLEAN_OPTIONS },
];

export const PERSONAL_FAMILY_FIELDS: ArchiveFieldDef[] = [
  { key: "name", label: "姓名", required: true },
  { key: "relation", label: "与员工关系", dictKey: "employeeRelations" },
  { key: "isInternalEmployee", label: "本公司员工", type: "boolean", options: BOOLEAN_OPTIONS },
  { key: "phone", label: "电话" },
  { key: "employer", label: "工作单位" },
  { key: "position", label: "职位" },
  { key: "birthDate", label: "出生日期", type: "date" },
  { key: "birthCertificate", label: "出生证明" },
];

export const PERSONAL_INTERNAL_RELATIVE_FIELDS: ArchiveFieldDef[] = [
  { key: "relativeEmployeeId", label: "关联员工", reference: "employee" },
  { key: "relation", label: "与员工关系", dictKey: "employeeRelations" },
  { key: "departmentName", label: "部门名称", readOnly: true },
  { key: "positionName", label: "岗位名称", readOnly: true },
  { key: "jobGradeName", label: "职级名称", readOnly: true },
  { key: "hireDate", label: "入职日期", type: "date", readOnly: true },
  { key: "employmentStatus", label: "在职状态", readOnly: true, displayKey: "employmentStatusLabel" },
  { key: "lastWorkDay", label: "最后工作日", type: "date", readOnly: true },
  { key: "remark", label: "说明" },
];

export const WORK_COST_CENTER_FIELDS: ArchiveFieldDef[] = [
  { key: "legalEntityId", label: "成本归属法人", type: "id", reference: "legalEntity" },
  { key: "costCenter", label: "成本中心", required: true },
  { key: "percentage", label: "分摊比例(%)", type: "number", min: 0, max: 100 },
  { key: "effectiveStartDate", label: "开始日期", type: "date" },
  { key: "effectiveEndDate", label: "结束日期", type: "date" },
];

export const WORK_CONTRACT_FIELDS: ArchiveFieldDef[] = [
  { key: "contractCode", label: "合同编号", required: true },
  { key: "contractType", label: "合同类型" },
  { key: "legalEntityId", label: "合同法人主体", type: "id", reference: "legalEntity" },
  { key: "operationType", label: "操作类型" },
  { key: "startDate", label: "开始日期", type: "date" },
  { key: "endDate", label: "结束日期", type: "date" },
  { key: "effectiveDate", label: "生效日期", type: "date" },
  { key: "status", label: "状态" },
  { key: "fileAttachmentId", label: "附件ID" },
  { key: "remark", label: "备注" },
];

export const WORK_AGREEMENT_FIELDS: ArchiveFieldDef[] = [
  { key: "agreementType", label: "协议类型", required: true },
  { key: "legalEntityId", label: "协议法人主体", type: "id", reference: "legalEntity" },
  { key: "startDate", label: "开始日期", type: "date" },
  { key: "endDate", label: "结束日期", type: "date" },
  { key: "status", label: "状态" },
  { key: "fileAttachmentId", label: "附件ID" },
  { key: "remark", label: "备注" },
];

export const SERVICE_ATTENDANCE_FIELDS: ArchiveFieldDef[] = [
  { key: "cardNo", label: "考勤卡号", required: true },
  { key: "deviceId", label: "设备编号" },
  { key: "workLocation", label: "考勤地点" },
  { key: "effectiveStartDate", label: "开始日期", type: "date" },
  { key: "effectiveEndDate", label: "结束日期", type: "date" },
  { key: "status", label: "状态" },
  { key: "remark", label: "备注" },
];

export const SERVICE_BANK_FIELDS: ArchiveFieldDef[] = [
  { key: "accountType", label: "账户类型" },
  { key: "countryCode", label: "国家代码" },
  { key: "bankId", label: "银行ID" },
  { key: "branchId", label: "支行ID" },
  { key: "accountNo", label: "账号", required: true, sensitive: true },
  { key: "accountName", label: "户名" },
  { key: "currencyCode", label: "币种" },
  { key: "cnapsCode", label: "联行号" },
  { key: "isPrimary", label: "主账户", type: "boolean", options: BOOLEAN_OPTIONS },
];

export const SERVICE_SOCIAL_FIELDS: ArchiveFieldDef[] = [
  { key: "socialSecurityNo", label: "社保账号", sensitive: true },
  { key: "socialBase", label: "社保基数", type: "number" },
  { key: "housingFundNo", label: "公积金账号" },
  { key: "housingBase", label: "公积金基数", type: "number" },
  { key: "company", label: "参保公司" },
  { key: "insuranceRegion", label: "参保地区" },
  { key: "isCompanyPayroll", label: "公司代缴", type: "boolean", options: BOOLEAN_OPTIONS },
];

export const SERVICE_BENEFIT_FIELDS: ArchiveFieldDef[] = [
  { key: "benefitType", label: "福利类型", required: true },
  { key: "benefitName", label: "福利名称" },
  { key: "amount", label: "金额", type: "number" },
  { key: "currencyCode", label: "币种" },
  { key: "effectiveStartDate", label: "开始日期", type: "date" },
  { key: "effectiveEndDate", label: "结束日期", type: "date" },
  { key: "remark", label: "备注" },
];

export const SERVICE_COMMUTE_FIELDS: ArchiveFieldDef[] = [
  { key: "recordType", label: "记录类型", required: true, options: RECORD_TYPE_OPTIONS },
  { key: "routeOrAddress", label: "路线/地址" },
  { key: "effectiveStartDate", label: "开始日期", type: "date" },
  { key: "effectiveEndDate", label: "结束日期", type: "date" },
  { key: "remark", label: "备注" },
];

export const BACKGROUND_EDUCATION_FIELDS: ArchiveFieldDef[] = [
  { key: "degree", label: "学位" },
  { key: "educationLevel", label: "学历层次" },
  { key: "isHighest", label: "最高学历", type: "boolean", options: BOOLEAN_OPTIONS },
  { key: "countryRegion", label: "国家/地区" },
  { key: "schoolName", label: "学校", required: true },
  { key: "major", label: "专业" },
  { key: "startDate", label: "开始日期", type: "date" },
  { key: "endDate", label: "结束日期", type: "date" },
  { key: "diplomaNo", label: "毕业证编号" },
  { key: "degreeNo", label: "学位证编号" },
  { key: "attachmentId", label: "附件ID" },
];

export const BACKGROUND_WORK_EXP_FIELDS: ArchiveFieldDef[] = [
  { key: "employerName", label: "单位", required: true },
  { key: "department", label: "部门" },
  { key: "position", label: "岗位" },
  { key: "startDate", label: "开始日期", type: "date" },
  { key: "endDate", label: "结束日期", type: "date" },
  { key: "leaveReason", label: "离职原因" },
  { key: "lastSalary", label: "离职薪资", type: "number" },
  { key: "referee", label: "证明人" },
  { key: "refereePhone", label: "证明人电话" },
  { key: "payFrequency", label: "薪酬频率" },
  { key: "currencyCode", label: "货币代码" },
  { key: "description", label: "详细描述" },
];

export const BACKGROUND_QUALIFICATION_FIELDS: ArchiveFieldDef[] = [
  { key: "titleName", label: "资格/职称", required: true },
  { key: "titleLevel", label: "等级" },
  { key: "approvalDate", label: "批准日期", type: "date" },
  { key: "expiryDate", label: "失效日期", type: "date" },
  { key: "certificateNo", label: "证书编号" },
  { key: "issuingOrg", label: "签发单位" },
  { key: "attachmentId", label: "附件ID" },
];

export const BACKGROUND_REWARD_FIELDS: ArchiveFieldDef[] = [
  { key: "type", label: "奖励类型", required: true },
  { key: "level", label: "级别" },
  { key: "effectiveDate", label: "生效日期", type: "date" },
  { key: "archiveDate", label: "归档日期", type: "date" },
  { key: "witness", label: "见证人" },
  { key: "amount", label: "金额", type: "number" },
  { key: "paymentMethod", label: "发放方式" },
  { key: "issuingOrg", label: "颁发单位" },
  { key: "documentNo", label: "文号" },
  { key: "description", label: "备注描述" },
];

export const BACKGROUND_PENALTY_FIELDS: ArchiveFieldDef[] = [
  { key: "type", label: "惩处类型", required: true },
  { key: "level", label: "惩处类别" },
  { key: "effectiveDate", label: "生效日期", type: "date" },
  { key: "archiveDate", label: "归档日期", type: "date" },
  { key: "witness", label: "见证人" },
  { key: "amount", label: "金额", type: "number" },
  { key: "paymentMethod", label: "扣款方式" },
  { key: "issuingOrg", label: "发文单位" },
  { key: "description", label: "处罚描述" },
];

export const TALENT_TRAINING_FIELDS: ArchiveFieldDef[] = [
  { key: "trainingName", label: "培训名称", required: true },
  { key: "trainingType", label: "培训类型" },
  { key: "provider", label: "培训机构" },
  { key: "startDate", label: "开始日期", type: "date" },
  { key: "endDate", label: "结束日期", type: "date" },
  { key: "hours", label: "时长(小时)", type: "number" },
  { key: "result", label: "考核结果" },
  { key: "certificateNo", label: "证书编号" },
  { key: "attachmentId", label: "附件ID" },
  { key: "remark", label: "备注" },
];

export const TALENT_PERFORMANCE_FIELDS: ArchiveFieldDef[] = [
  { key: "period", label: "绩效周期", required: true },
  { key: "rating", label: "绩效等级" },
  { key: "ratingLabel", label: "等级描述" },
  { key: "score", label: "分数", type: "number" },
  { key: "reviewerName", label: "评估人" },
  { key: "reviewDate", label: "评估日期", type: "date" },
  { key: "sourceType", label: "来源类型" },
  { key: "remark", label: "备注" },
];

export const TALENT_VALUES_FIELDS: ArchiveFieldDef[] = [
  { key: "period", label: "评估周期", required: true },
  { key: "dimension", label: "维度" },
  { key: "score", label: "得分", type: "number" },
  { key: "level", label: "等级" },
  { key: "assessorName", label: "评估人" },
  { key: "assessDate", label: "评估日期", type: "date" },
  { key: "remark", label: "备注" },
];

export const TALENT_REVIEW_FIELDS: ArchiveFieldDef[] = [
  { key: "reviewCycle", label: "盘点周期", required: true },
  { key: "gridPosition", label: "九宫格位置" },
  { key: "potentialLevel", label: "潜力等级" },
  { key: "performanceLevel", label: "绩效等级" },
  { key: "reviewerName", label: "盘点人" },
  { key: "reviewDate", label: "盘点日期", type: "date" },
  { key: "remark", label: "备注" },
];

export const TALENT_PROJECT_FIELDS: ArchiveFieldDef[] = [
  { key: "projectName", label: "项目名称", required: true },
  { key: "projectCode", label: "项目编码" },
  { key: "role", label: "项目角色" },
  { key: "startDate", label: "开始日期", type: "date" },
  { key: "endDate", label: "结束日期", type: "date" },
  { key: "contribution", label: "主要贡献" },
  { key: "remark", label: "备注" },
];

export const TALENT_AGENT_FIELDS: ArchiveFieldDef[] = [
  { key: "agentId", label: "智能体ID" },
  { key: "agentName", label: "智能体名称", required: true },
  { key: "assignmentType", label: "归属类型" },
  { key: "effectiveStartDate", label: "开始日期", type: "date" },
  { key: "effectiveEndDate", label: "结束日期", type: "date" },
  { key: "remark", label: "备注" },
];
