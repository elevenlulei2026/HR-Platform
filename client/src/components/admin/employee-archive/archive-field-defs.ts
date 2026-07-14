import type { ArchiveFieldDef } from "@/components/admin/employee-archive/ArchiveMultiSection";
import { ATTENDANCE_CARD_STATUS_OPTIONS, ARCHIVE_VALIDITY_STATUS_OPTIONS, YES_NO_TOGGLE_OPTIONS } from "@/components/admin/employee-archive/archive-status-ui";

export const BOOLEAN_OPTIONS = [
  { value: "true", label: "是" },
  { value: "false", label: "否" },
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
  { key: "effectiveStartDate", label: "生效日期", type: "date", required: true },
  { key: "contractCode", label: "合同编号", required: true },
  { key: "legalEntityId", label: "合同法人主体", type: "id", reference: "legalEntity", required: true },
  {
    key: "operationType",
    label: "操作类型",
    type: "toggle",
    required: true,
    options: [
      { value: "10", label: "新签" },
      { value: "20", label: "续签" },
      { value: "30", label: "变更" },
      { value: "40", label: "解除" },
    ],
  },
  {
    key: "status",
    label: "状态",
    type: "toggle",
    required: true,
    options: ARCHIVE_VALIDITY_STATUS_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
  },
  {
    key: "contractCategory",
    label: "合同类别",
    required: true,
    parentChildType: "CONTRACT_CATEGORY",
  },
  {
    key: "contractCategoryDesc",
    label: "合同类别描述",
    required: true,
    parentChildType: "CONTRACT_CATEGORY",
    parentFieldKey: "contractCategory",
  },
  { key: "startDate", label: "开始日期", type: "date", required: true },
  { key: "endDate", label: "结束日期", type: "date" },
  { key: "remark", label: "备注", type: "textarea" },
];

export const WORK_AGREEMENT_FIELDS: ArchiveFieldDef[] = [
  { key: "effectiveStartDate", label: "生效日期", type: "date", required: true },
  { key: "agreementCode", label: "协议编号", required: true },
  {
    key: "operationType",
    label: "操作类型",
    required: true,
    dictTypeCode: "AGREEMENT_OPERATION_TYPE",
  },
  {
    key: "status",
    label: "协议状态",
    type: "toggle",
    required: true,
    options: ARCHIVE_VALIDITY_STATUS_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
  },
  {
    key: "agreementCategory",
    label: "协议类别",
    required: true,
    dictTypeCode: "AGREEMENT_CATEGORY",
  },
  { key: "legalEntityId", label: "协议法人主体", type: "id", reference: "legalEntity", required: true },
  { key: "startDate", label: "开始日期", type: "date", required: true },
  { key: "endDate", label: "结束日期", type: "date", required: true },
  { key: "remark", label: "备注", type: "textarea" },
];

export const SERVICE_ATTENDANCE_FIELDS: ArchiveFieldDef[] = [
  { key: "cardNo", label: "考勤卡号", required: true },
  { key: "effectiveStartDate", label: "生效日期", type: "date", required: true },
  {
    key: "status",
    label: "状态",
    type: "toggle",
    required: true,
    options: ATTENDANCE_CARD_STATUS_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
  },
  {
    key: "participateInAttendance",
    label: "是否参与考勤",
    type: "toggle",
    required: true,
    options: YES_NO_TOGGLE_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
  },
  { key: "remark", label: "备注" },
];

export const SERVICE_BANK_FIELDS: ArchiveFieldDef[] = [
  { key: "accountType", label: "账户类型", dictKey: "bankAccountTypes" },
  { key: "countryCode", label: "国家代码", dictKey: "countryRegions" },
  { key: "bankId", label: "银行ID", dictKey: "bankIds" },
  { key: "branchId", label: "支行ID", dictKey: "branchIds" },
  { key: "accountNo", label: "账号", required: true, sensitive: true },
  { key: "accountName", label: "户名" },
  { key: "currencyCode", label: "币种", dictKey: "currencies" },
  { key: "cnapsCode", label: "联行号" },
  {
    key: "isPrimary",
    label: "主账户",
    type: "toggle",
    showInList: false,
    options: [
      { value: "false", label: "否" },
      { value: "true", label: "是" },
    ],
  },
];

export const SERVICE_SOCIAL_FIELDS: ArchiveFieldDef[] = [
  { key: "socialSecurityNo", label: "社保账号", sensitive: true },
  { key: "socialBase", label: "社保基数", type: "number" },
  { key: "housingFundNo", label: "公积金账号" },
  { key: "housingBase", label: "公积金基数", type: "number" },
  { key: "company", label: "公司", dictKey: "payrollCompanies" },
  { key: "insuranceRegion", label: "参保地区", dictKey: "insuranceRegions" },
  {
    key: "isCompanyPayroll",
    label: "公司代缴",
    type: "toggle",
    options: [
      { value: "true", label: "是" },
      { value: "false", label: "否" },
    ],
  },
];

export const SERVICE_BENEFIT_FIELDS: ArchiveFieldDef[] = [
  {
    key: "hasSpecialBenefit",
    label: "是否有特殊福利",
    type: "toggle",
    required: true,
    options: YES_NO_TOGGLE_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
  },
  { key: "endDate", label: "截止日期", type: "date" },
];

export const SERVICE_WORK_INJURY_FIELDS: ArchiveFieldDef[] = [
  { key: "accidentDate", label: "事故发生日期", type: "date" },
  { key: "accidentReason", label: "事故原因", type: "textarea" },
  { key: "witness", label: "见证人" },
  { key: "recognitionDate", label: "工伤认定日期", type: "date" },
  { key: "disabilityAssessmentDate", label: "伤残鉴定日期", type: "date" },
  {
    key: "isRecognized",
    label: "是否认定为工伤",
    type: "toggle",
    options: YES_NO_TOGGLE_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
  },
  {
    key: "participatedLaborAssessment",
    label: "是否参加劳动力鉴定",
    type: "toggle",
    options: YES_NO_TOGGLE_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
  },
  { key: "laborAssessmentLevel", label: "劳动力鉴定级别", type: "textarea" },
  { key: "remark", label: "备注", type: "textarea" },
];

export const BACKGROUND_EDUCATION_FIELDS: ArchiveFieldDef[] = [
  { key: "educationLevel", label: "学历", dictKey: "educations", displayKey: "educationLevelLabel" },
  { key: "degree", label: "学位", dictKey: "degrees", displayKey: "degreeLabel" },
  {
    key: "isHighest",
    label: "最高学历",
    type: "toggle",
    showInList: false,
    options: [
      { value: "true", label: "是" },
      { value: "false", label: "否" },
    ],
  },
  { key: "countryRegion", label: "国家/地区", dictKey: "countryRegions", displayKey: "countryRegionLabel" },
  { key: "schoolName", label: "学校", required: true },
  { key: "major", label: "专业" },
  { key: "startDate", label: "开始日期", type: "date" },
  { key: "endDate", label: "结束日期", type: "date" },
  { key: "diplomaNo", label: "毕业证编号" },
  { key: "degreeNo", label: "学位证编号" },
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
  { key: "certificateName", label: "证书名称", required: true },
  { key: "skillType", label: "技能类型" },
  { key: "firstIssueDate", label: "最早获证日期", type: "date" },
  { key: "expiryDate", label: "有效日到期日", type: "date" },
  { key: "reviewDate", label: "复审日期", type: "date" },
  { key: "certificateNo", label: "证书号码" },
  { key: "handlerName", label: "经办人" },
  { key: "issuingOrg", label: "发证机构" },
  { key: "remark", label: "备注" },
];

export const BACKGROUND_TITLE_CERTIFICATE_FIELDS: ArchiveFieldDef[] = [
  { key: "titleName", label: "职称名称", required: true },
  { key: "titleLevel", label: "职称级别" },
  { key: "approvalDate", label: "批准日期", type: "date" },
  { key: "expiryDate", label: "到期日", type: "date" },
  { key: "certificateNo", label: "证书号码" },
  { key: "issuingOrg", label: "签发单位" },
  { key: "remark", label: "备注" },
];

export const BACKGROUND_REWARD_FIELDS: ArchiveFieldDef[] = [
  { key: "effectiveDate", label: "生效日期", type: "date" },
  { key: "archiveDate", label: "归档日期", type: "date" },
  { key: "type", label: "奖励类型", required: true },
  { key: "level", label: "级别" },
  { key: "witness", label: "见证人" },
  { key: "amount", label: "金额", type: "number" },
  { key: "paymentMethod", label: "发放方式" },
  { key: "issuingOrg", label: "颁发单位" },
  { key: "documentNo", label: "文号" },
  { key: "description", label: "备注描述" },
];

export const BACKGROUND_PENALTY_FIELDS: ArchiveFieldDef[] = [
  { key: "effectiveDate", label: "生效日期", type: "date" },
  { key: "archiveDate", label: "归档日期", type: "date" },
  { key: "type", label: "惩处类型", required: true },
  { key: "level", label: "惩处类别" },
  { key: "witness", label: "见证人" },
  { key: "amount", label: "金额", type: "number" },
  { key: "paymentMethod", label: "扣款方式" },
  { key: "involvesCompensation", label: "涉及赔偿", type: "boolean" },
  { key: "issuingOrg", label: "发文单位" },
  { key: "description", label: "处罚描述" },
];

export const TALENT_TRAINING_FIELDS: ArchiveFieldDef[] = [
  { key: "courseName", label: "课程名称", required: true },
  { key: "startDate", label: "开始日期", type: "date" },
  { key: "endDate", label: "结束日期", type: "date" },
  { key: "hours", label: "时长(小时)", type: "number" },
  {
    key: "assessmentMethod",
    label: "考核方式",
    dictKey: "trainingAssessmentMethods",
    dictTypeCode: "TRAINING_ASSESSMENT_METHOD",
  },
  {
    key: "assessmentResult",
    label: "考核结果",
    dictKey: "trainingAssessmentResults",
    dictTypeCode: "TRAINING_ASSESSMENT_RESULT",
  },
  { key: "feedbackResult", label: "评估反馈结果", type: "textarea" },
  {
    key: "trainingForm",
    label: "培训形式",
    dictKey: "trainingForms",
    dictTypeCode: "TRAINING_FORM",
  },
  {
    key: "trainingType",
    label: "培训类型",
    dictKey: "trainingTypes",
    dictTypeCode: "TRAINING_TYPE",
  },
  { key: "trainingLocation", label: "培训地点" },
  { key: "trainer", label: "培训讲师" },
  { key: "trainingCost", label: "培训费用(元)", type: "number" },
  { key: "remark", label: "备注", type: "textarea" },
];

export const TALENT_PERFORMANCE_FIELDS: ArchiveFieldDef[] = [
  { key: "year", label: "年度", required: true },
  {
    key: "assessmentType",
    label: "考核类型",
    dictKey: "performanceAssessmentTypes",
    dictTypeCode: "PERFORMANCE_ASSESSMENT_TYPE",
  },
  { key: "performanceStartDate", label: "绩效开始日期", type: "date" },
  { key: "performanceEndDate", label: "绩效结束日期", type: "date" },
  {
    key: "valuesLevel",
    label: "价值观等级",
    dictKey: "performanceValuesLevels",
    dictTypeCode: "PERFORMANCE_VALUES_LEVEL",
  },
  {
    key: "performanceLevel",
    label: "绩效等级",
    dictKey: "performanceLevels",
    dictTypeCode: "PERFORMANCE_LEVEL",
  },
  { key: "performanceScore", label: "绩效得分" },
  { key: "valuesScore", label: "价值观得分" },
  { key: "remark", label: "备注", type: "textarea" },
];

export const TALENT_VALUES_FIELDS: ArchiveFieldDef[] = [
  { key: "assessmentTime", label: "考核时间", required: true },
  { key: "finalLevel", label: "最终等级" },
  { key: "superiorEvaluation", label: "上级评价", showInList: false },
  { key: "peerEvaluation", label: "同事评价", showInList: false },
  { key: "subordinateEvaluation", label: "下级评价", showInList: false },
  { key: "userFirst", label: "用户第一", showInList: false },
  { key: "goalFirst", label: "目标第一", showInList: false },
  { key: "pragmaticResponsibility", label: "实干担当", showInList: false },
  { key: "goodAtReview", label: "善于复盘", showInList: false },
  { key: "dareToLead", label: "敢为人先", showInList: false },
  { key: "qualityEfficiency", label: "提质增效", showInList: false },
  { key: "fullCommitment", label: "全情投入", showInList: false },
  { key: "loveCareer", label: "热爱事业", showInList: false },
  { key: "striveForFirst", label: "永争第一", showInList: false },
  { key: "braveChallenge", label: "勇于挑战", showInList: false },
  { key: "organizationFirst", label: "组织为重", showInList: false },
  { key: "helpOthersSucceed", label: "成就他人", showInList: false },
  { key: "integrityHonesty", label: "廉洁正直", showInList: false },
  { key: "lawAbiding", label: "遵纪守法", showInList: false },
  { key: "zeroScoreText", label: "0分文本", type: "textarea", showInList: false },
  { key: "fourScoreText", label: "4分文本", type: "textarea", showInList: false },
  { key: "redLight", label: "红灯" },
  { key: "yellowLight", label: "黄灯" },
  { key: "greenLight", label: "绿灯" },
];

export const TALENT_REVIEW_FIELDS: ArchiveFieldDef[] = [
  { key: "year", label: "年份", required: true },
  { key: "performanceScore", label: "绩效得分" },
  { key: "performancePlacement", label: "绩效落位" },
  { key: "potentialScore", label: "潜力得分" },
  { key: "potentialPlacement", label: "潜力落位" },
  { key: "valuesScore", label: "价值观得分" },
  { key: "nineBoxPlacement", label: "九宫格落位" },
  { key: "subjectiveEvaluation", label: "主观评价", type: "textarea", showInList: false },
];

export const TALENT_PROJECT_FIELDS: ArchiveFieldDef[] = [
  { key: "projectName", label: "项目名称", required: true },
  { key: "projectDescription", label: "项目描述", type: "textarea", showInList: false },
  { key: "startDate", label: "项目开始日期", type: "date" },
  { key: "endDate", label: "项目结束日期", type: "date" },
  { key: "role", label: "项目角色" },
  { key: "responsibilityDescription", label: "具体职责描述", type: "textarea", showInList: false },
  { key: "reportTo", label: "汇报对象" },
  { key: "subordinatesOrMentees", label: "下属或指导人员", showInList: false },
  { key: "coreSkills", label: "核心技能", type: "textarea", showInList: false },
  { key: "personalContribution", label: "个人主要贡献", type: "textarea", showInList: false },
  { key: "quantifiableResults", label: "可量化的成果和指标", type: "textarea", showInList: false },
  {
    key: "finalOutcome",
    label: "项目最终成果",
    dictKey: "projectFinalOutcomes",
    dictTypeCode: "PROJECT_FINAL_OUTCOME",
  },
];

export const TALENT_AGENT_FIELDS: ArchiveFieldDef[] = [
  {
    key: "primaryAgentTag",
    label: "主智能体标签",
    type: "toggle",
    options: YES_NO_TOGGLE_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
  },
  { key: "startDate", label: "开始日期", type: "date" },
  { key: "endDate", label: "结束日期", type: "date" },
  { key: "agentName", label: "智能体" },
  { key: "agentIdentity", label: "智能体识别" },
  { key: "agentRole", label: "智能体岗位角色" },
  {
    key: "isArchitect",
    label: "架构师",
    type: "toggle",
    options: YES_NO_TOGGLE_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
  },
  {
    key: "isMilitia",
    label: "民兵",
    type: "toggle",
    options: YES_NO_TOGGLE_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
  },
  {
    key: "isDataSteward",
    label: "数据治理师",
    type: "toggle",
    options: YES_NO_TOGGLE_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
  },
  { key: "percentage", label: "占比（%）", type: "number", min: 0, max: 100 },
];
