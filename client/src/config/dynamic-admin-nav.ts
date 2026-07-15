import type { SysMenu } from "@shared/api.interface";
import { Database } from "lucide-react";

import type { AdminNavLink, AdminNavTopItem } from "@/config/admin-nav";
import { getArchiveDataResource } from "@/config/archive-data-resources";
import { ARCHIVE_DATA_HUB_VIEW_PERMISSIONS } from "@/config/archive-permissions";
import { resolveMenuIcon } from "@/config/menu-icon-map";

export type AdminNavColumn = {
  title: string;
  links: AdminNavLink[];
  /** @deprecated Mega 不再展开嵌套分区 */
  sections?: Array<{ title: string; links: AdminNavLink[] }>;
};

function activeMenus(menus: SysMenu[] | undefined): SysMenu[] {
  return (menus ?? [])
    .filter((m) => m.status === "ACTIVE")
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function itemToLink(menu: SysMenu, group: string): AdminNavLink {
  const link: AdminNavLink = {
    title: menu.title,
    description: menu.description,
    to: menu.path ?? "#",
    group,
    permission: menu.permissionCode,
    icon: resolveMenuIcon(menu.icon),
  };
  // 管理数据落地页：后端 permission_code 为空，前端用分区 view 任一即可见
  if (menu.path === "/admin/employees/data" || menu.code === "archive_data") {
    link.anyOfPermissions = ARCHIVE_DATA_HUB_VIEW_PERMISSIONS;
    link.permission = undefined;
  }
  return link;
}

function archiveDataHubLink(groupTitle = "员工主数据"): AdminNavLink {
  return {
    title: "管理数据",
    description: "跨员工批量维护档案子表（证件、合同、协议等）",
    to: "/admin/employees/data",
    group: groupTitle,
    anyOfPermissions: ARCHIVE_DATA_HUB_VIEW_PERMISSIONS,
    icon: Database,
  };
}

function isArchiveDataColumn(group: SysMenu): boolean {
  return (
    group.code === "group_archive_data" ||
    group.code === "archive_data" ||
    group.title === "管理数据"
  );
}

function groupToColumn(group: SysMenu): AdminNavColumn | null {
  const children = activeMenus(group.children);
  const nestedGroups = children.filter((c) => c.menuType === "GROUP");
  const directItems = children.filter((c) => c.menuType === "ITEM");

  // 旧版嵌套「管理数据」列：不渲染 26 子项，标记为空列供后续合并为单入口
  if (isArchiveDataColumn(group) && nestedGroups.length > 0) {
    return { title: group.title, links: [archiveDataHubLink(group.title)] };
  }

  const links = directItems.map((item) => itemToLink(item, group.title));
  if (links.length === 0) return null;
  return { title: group.title, links };
}

/** 将「管理数据」列并入「员工主数据」，恢复 3 列 Mega */
function coalesceArchiveDataColumn(columns: AdminNavColumn[]): AdminNavColumn[] {
  const archiveIdx = columns.findIndex(
    (c) => c.title === "管理数据" || c.links.some((l) => l.to === "/admin/employees/data" && c.title !== "员工主数据"),
  );
  if (archiveIdx < 0) return columns;

  const archiveCol = columns[archiveIdx];
  const employeeIdx = columns.findIndex((c) => c.title === "员工主数据");
  const hub =
    archiveCol.links.find((l) => l.to === "/admin/employees/data") ?? archiveDataHubLink();

  if (employeeIdx >= 0) {
    const emp = columns[employeeIdx];
    const hasHub = emp.links.some((l) => l.to === "/admin/employees/data");
    const nextEmp: AdminNavColumn = {
      ...emp,
      links: hasHub ? emp.links : [...emp.links, { ...hub, group: "员工主数据" }],
    };
    return columns
      .map((c, i) => (i === employeeIdx ? nextEmp : c))
      .filter((_, i) => i !== archiveIdx);
  }

  // 无员工主数据列时，把管理数据列收成单入口列（仍可能是 3+ 列，但不再带 26 子项）
  return columns.map((c, i) =>
    i === archiveIdx ? { title: "管理数据", links: [{ ...hub, group: "管理数据" }] } : c,
  );
}

/** 将 API 菜单树转换为 AdminLayout 顶栏结构 */
export function sysMenusToAdminTopNav(menus: SysMenu[]): AdminNavTopItem[] {
  const out: AdminNavTopItem[] = [];

  for (const menu of activeMenus(menus)) {
    if (menu.menuType === "MEGA") {
      const columns = coalesceArchiveDataColumn(
        activeMenus(menu.children)
          .filter((c) => c.menuType === "GROUP")
          .map((group) => groupToColumn(group))
          .filter((col): col is AdminNavColumn => col != null),
      );
      if (columns.length === 0) continue;
      out.push({
        type: "mega",
        title: menu.title,
        icon: resolveMenuIcon(menu.icon),
        columns,
      });
      continue;
    }

    if (menu.menuType === "ITEM" && menu.path) {
      out.push({
        type: "link",
        title: menu.title,
        to: menu.path,
        permission: menu.permissionCode,
        icon: resolveMenuIcon(menu.icon),
      });
    }
  }

  return out;
}

export function canSeeAdminNavLink(
  link: Pick<AdminNavLink, "permission" | "anyOfPermissions" | "to">,
  has: (code?: string) => boolean,
  hasAny: (...codes: string[]) => boolean,
): boolean {
  if (link.anyOfPermissions && link.anyOfPermissions.length > 0) {
    return hasAny(...link.anyOfPermissions);
  }
  if (link.to === "/admin/employees/data") {
    return hasAny(...ARCHIVE_DATA_HUB_VIEW_PERMISSIONS);
  }
  return has(link.permission);
}

export function flattenDynamicNavLinks(nav: AdminNavTopItem[]): AdminNavLink[] {
  const out: AdminNavLink[] = [];
  for (const item of nav) {
    if (item.type === "mega") {
      for (const col of item.columns) {
        out.push(...col.links);
      }
    }
  }
  return out;
}

export function getDynamicBreadcrumb(pathname: string, nav: AdminNavTopItem[]): string[] {
  for (const item of nav) {
    if (item.type === "link" && item.to === pathname) return [item.title];
  }
  for (const item of nav) {
    if (item.type !== "mega") continue;
    for (const col of item.columns) {
      for (const link of col.links) {
        if (link.to === pathname) return [item.title, col.title, link.title];
      }
    }
  }
  if (pathname === "/admin/employees/data") {
    return ["组织与员工", "员工主数据", "管理数据"];
  }
  const dataMatch = pathname.match(/^\/admin\/employees\/data\/([a-z0-9-]+)$/);
  if (dataMatch) {
    const title = getArchiveDataResource(dataMatch[1])?.title ?? dataMatch[1];
    return ["组织与员工", "员工主数据", "管理数据", title];
  }
  return [];
}
