/** 员工档案详情：一级分类 + 二级锚点模块（对齐领域模型 §4.1 共 27 项） */

export type ArchiveSectionDef = {
  id: string;
  label: string;
};

export type ArchiveCategoryDef = {
  id: string;
  label: string;
  sections: ArchiveSectionDef[];
};

export const ARCHIVE_NAV: ArchiveCategoryDef[] = [
  {
    id: "personal",
    label: "个人信息",
    sections: [
      { id: "personal-master", label: "个人主档" },
      { id: "id-documents", label: "证件信息" },
      { id: "family-members", label: "家庭成员" },
      { id: "internal-relatives", label: "内部亲属" },
    ],
  },
  {
    id: "work",
    label: "工作信息",
    sections: [
      { id: "assignments", label: "任职记录" },
      { id: "cost-center-allocations", label: "成本中心" },
      { id: "contracts", label: "合同信息" },
      { id: "agreements", label: "协议信息" },
    ],
  },
  {
    id: "service",
    label: "员工服务",
    sections: [
      { id: "attendance-cards", label: "考勤卡" },
      { id: "bank-accounts", label: "银行卡" },
      { id: "social-insurances", label: "社保公积金" },
      { id: "special-benefits", label: "特殊福利" },
      { id: "commute-accommodations", label: "通勤住宿" },
      { id: "attachments", label: "附件" },
    ],
  },
  {
    id: "background",
    label: "背景信息",
    sections: [
      { id: "educations", label: "教育经历" },
      { id: "work-experiences", label: "工作经历" },
      { id: "qualifications", label: "资格证书" },
      { id: "rewards", label: "奖励记录" },
      { id: "penalties", label: "惩处记录" },
    ],
  },
  {
    id: "talent",
    label: "人才发展",
    sections: [
      { id: "training-records", label: "培训记录" },
      { id: "performance-records", label: "绩效记录" },
      { id: "values-assessments", label: "价值观评估" },
      { id: "talent-reviews", label: "人才盘点" },
      { id: "projects", label: "项目信息" },
      { id: "agent-assignments", label: "智能体归属" },
    ],
  },
  {
    id: "movements",
    label: "异动轨迹",
    sections: [{ id: "movements", label: "异动记录" }],
  },
];

export const ALL_ARCHIVE_SECTION_IDS = ARCHIVE_NAV.flatMap((c) =>
  c.sections.map((s) => s.id),
);

export function findCategoryBySection(sectionId: string): string {
  for (const cat of ARCHIVE_NAV) {
    if (cat.sections.some((s) => s.id === sectionId)) return cat.id;
  }
  return ARCHIVE_NAV[0]?.id ?? "personal";
}

export function findSectionLabel(sectionId: string): string {
  for (const cat of ARCHIVE_NAV) {
    const sec = cat.sections.find((s) => s.id === sectionId);
    if (sec) return sec.label;
  }
  return sectionId;
}
