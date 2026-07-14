import type { SysMenu } from "@shared/api.interface";

import type { AdminNavLink, AdminNavTopItem } from "@/config/admin-nav";
import { resolveMenuIcon } from "@/config/menu-icon-map";

export type AdminNavColumn = {
  title: string;
  links: AdminNavLink[];
  /** 嵌套分组（如「管理数据」下的 5 个档案分区） */
  sections?: Array<{ title: string; links: AdminNavLink[] }>;
};

function activeMenus(menus: SysMenu[] | undefined): SysMenu[] {
  return (menus ?? [])
    .filter((m) => m.status === "ACTIVE")
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function itemToLink(menu: SysMenu, group: string): AdminNavLink {
  return {
    title: menu.title,
    description: menu.description,
    to: menu.path ?? "#",
    group,
    permission: menu.permissionCode,
    icon: resolveMenuIcon(menu.icon),
  };
}

function groupToColumn(group: SysMenu): AdminNavColumn | null {
  const children = activeMenus(group.children);
  const nestedGroups = children.filter((c) => c.menuType === "GROUP");
  const directItems = children.filter((c) => c.menuType === "ITEM");

  if (nestedGroups.length > 0) {
    const sections = nestedGroups
      .map((sec) => ({
        title: sec.title,
        links: activeMenus(sec.children)
          .filter((c) => c.menuType === "ITEM")
          .map((item) => itemToLink(item, `${group.title} / ${sec.title}`)),
      }))
      .filter((sec) => sec.links.length > 0);
    if (sections.length === 0 && directItems.length === 0) return null;
    return {
      title: group.title,
      links: directItems.map((item) => itemToLink(item, group.title)),
      sections,
    };
  }

  const links = directItems.map((item) => itemToLink(item, group.title));
  if (links.length === 0) return null;
  return { title: group.title, links };
}

/** 将 API 菜单树转换为 AdminLayout 顶栏结构 */
export function sysMenusToAdminTopNav(menus: SysMenu[]): AdminNavTopItem[] {
  const out: AdminNavTopItem[] = [];

  for (const menu of activeMenus(menus)) {
    if (menu.menuType === "MEGA") {
      const columns = activeMenus(menu.children)
        .filter((c) => c.menuType === "GROUP")
        .map((group) => groupToColumn(group))
        .filter((col): col is AdminNavColumn => col != null);
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

export function flattenDynamicNavLinks(nav: AdminNavTopItem[]): AdminNavLink[] {
  const out: AdminNavLink[] = [];
  for (const item of nav) {
    if (item.type === "mega") {
      for (const col of item.columns) {
        out.push(...col.links);
        if (col.sections) {
          for (const sec of col.sections) {
            out.push(...sec.links);
          }
        }
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
      if (col.sections) {
        for (const sec of col.sections) {
          for (const link of sec.links) {
            if (link.to === pathname) return [item.title, col.title, sec.title, link.title];
          }
        }
      }
    }
  }
  return [];
}
