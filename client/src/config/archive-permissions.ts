import type { ArchivePermissionSection, PermissionAction } from "@shared/api.interface";

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
  "commute-accommodations": "service",
  attachments: "service",
  educations: "background",
  "work-experiences": "background",
  qualifications: "background",
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
