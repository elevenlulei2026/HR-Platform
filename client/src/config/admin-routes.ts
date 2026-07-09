import { adminTopNav, flattenAdminNavLinks, type AdminNavLink } from "@/config/admin-nav";

/** Admin 路由 → 菜单权限点（与 admin-nav 保持一致） */
export const adminRoutePermissions: Record<string, string | undefined> = {
  "/admin/dashboard": "dashboard:view",
  "/admin/reports": "report:view",
  "/admin/settings": "settings:view",
  "/admin/dev/health": "dev:health:view",
};

for (const item of adminTopNav) {
  if (item.type === "link") {
    adminRoutePermissions[item.to] = item.permission;
  }
}

for (const link of flattenAdminNavLinks()) {
  adminRoutePermissions[link.to] = link.permission;
}

export function getRoutePermission(pathname: string): string | undefined {
  return adminRoutePermissions[pathname];
}

export function collectAdminNavLinks(): AdminNavLink[] {
  return flattenAdminNavLinks();
}
