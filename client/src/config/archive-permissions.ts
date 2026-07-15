import type { ArchivePermissionSection, PermissionAction } from "@shared/api.interface";

/** 管理数据落地页 / Mega 入口：任一分区 view 即可看见 */
export const ARCHIVE_DATA_HUB_VIEW_PERMISSIONS = [
  "employee:archive:personal:view",
  "employee:archive:work:view",
  "employee:archive:service:view",
  "employee:archive:background:view",
  "employee:archive:development:view",
] as const;

export const ARCHIVE_SECTION_LABELS: Record<ArchivePermissionSection, string> = {
  personal: "个人信息",
  work: "工作信息",
  service: "员工服务",
  background: "背景信息",
  development: "人才发展",
};

export const ARCHIVE_SECTION_ORDER: ArchivePermissionSection[] = [
  "personal",
  "work",
  "service",
  "background",
  "development",
];

/** 档案 API resourcePath → 权限分区 */
export const ARCHIVE_RESOURCE_SECTION: Record<string, ArchivePermissionSection> = {
  "family-members": "personal",
  "internal-relatives": "personal",
  "id-documents": "personal",
  "cost-center-allocations": "work",
  contracts: "service",
  agreements: "service",
  "attendance-cards": "service",
  "bank-accounts": "service",
  "social-insurances": "service",
  "special-benefits": "service",
  "work-injuries": "service",
  "admin-infos": "service",
  accommodations: "service",
  attachments: "service",
  educations: "background",
  "work-experiences": "background",
  qualifications: "background",
  "title-certificates": "background",
  rewards: "background",
  penalties: "background",
  "training-records": "development",
  "performance-records": "development",
  "values-assessments": "development",
  "talent-reviews": "development",
  projects: "development",
  "agent-assignments": "development",
};

export function archiveSectionPermission(
  section: ArchivePermissionSection,
  action: PermissionAction,
): string {
  return `employee:archive:${section}:${action}`;
}

export function archiveResourcePermission(
  resourcePath: string,
  action: PermissionAction,
): string | undefined {
  const section = ARCHIVE_RESOURCE_SECTION[resourcePath];
  if (!section) return undefined;
  return archiveSectionPermission(section, action);
}
