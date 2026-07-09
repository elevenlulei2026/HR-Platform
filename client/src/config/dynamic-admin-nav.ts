import type { SysMenu } from "@shared/api.interface";

import type { AdminNavLink, AdminNavTopItem } from "@/config/admin-nav";
import { resolveMenuIcon } from "@/config/menu-icon-map";

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

/** 将 API 菜单树转换为 AdminLayout 顶栏结构 */
export function sysMenusToAdminTopNav(menus: SysMenu[]): AdminNavTopItem[] {
  const out: AdminNavTopItem[] = [];

  for (const menu of activeMenus(menus)) {
    if (menu.menuType === "MEGA") {
      const columns = activeMenus(menu.children)
        .filter((c) => c.menuType === "GROUP")
        .map((group) => ({
          title: group.title,
          links: activeMenus(group.children)
            .filter((c) => c.menuType === "ITEM")
            .map((item) => itemToLink(item, group.title)),
        }))
        .filter((col) => col.links.length > 0);
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
  return [];
}
