import type { ArchivePermissionSection, PermissionAction } from "@shared/api.interface";

import { archiveSectionPermission } from "@/config/archive-permissions";
import { usePermission } from "@/hooks/usePermission";

const ROSTER_EDIT = ["employee:roster:edit", "employee:edit"] as const;
const ROSTER_CREATE = ["employee:roster:create", "employee:edit"] as const;
const ROSTER_IMPORT = ["employee:roster:import", "employee:edit"] as const;

export function useArchivePermission() {
  const perm = usePermission();

  function canSection(section: ArchivePermissionSection, action: PermissionAction): boolean {
    const code = archiveSectionPermission(section, action);
    if (action === "edit" || action === "create" || action === "delete") {
      return perm.has(code) || perm.has("employee:edit");
    }
    return perm.has(code) || perm.has("employee:roster:view");
  }

  return {
    canViewRoster: () => perm.has("employee:roster:view"),
    canCreateRoster: () => perm.hasAny(...ROSTER_CREATE),
    canEditRoster: () => perm.hasAny(...ROSTER_EDIT),
    canImportRoster: () => perm.hasAny(...ROSTER_IMPORT),
    canExportRoster: () => perm.has("employee:export"),
    canViewSensitive: () => perm.has("employee:sensitive:view"),
    canSection,
    canEditSection: (section: ArchivePermissionSection) => canSection(section, "edit"),
  };
}
