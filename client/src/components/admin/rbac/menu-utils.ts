import type { Permission, SysMenu } from "@shared/api.interface";

/** 扁平化菜单树（保留深度） */
export function flattenMenus(
  menus: SysMenu[],
  depth = 0,
): Array<SysMenu & { depth: number }> {
  const out: Array<SysMenu & { depth: number }> = [];
  for (const m of menus) {
    out.push({ ...m, depth });
    if (m.children?.length) {
      out.push(...flattenMenus(m.children, depth + 1));
    }
  }
  return out;
}

/** 收集菜单及其所有后代的 id */
export function collectMenuDescendantIds(menu: SysMenu): string[] {
  const ids = [menu.id];
  for (const child of menu.children ?? []) {
    ids.push(...collectMenuDescendantIds(child));
  }
  return ids;
}

/** 在树中按 id 查找菜单 */
export function findMenuById(menus: SysMenu[], id: string): SysMenu | null {
  for (const m of menus) {
    if (m.id === id) return m;
    if (m.children?.length) {
      const found = findMenuById(m.children, id);
      if (found) return found;
    }
  }
  return null;
}

type MenuMatchRule = {
  menuCode: string;
  match: (code: string) => boolean;
};

/** 与 V36 / PermissionMenuResolver 保持一致 */
const PERMISSION_MENU_RULES: MenuMatchRule[] = [
  { menuCode: "tasks", match: (c) => c.startsWith("workflow:task:") },
  {
    menuCode: "workflow",
    match: (c) => c.startsWith("workflow:") && !c.startsWith("workflow:task:"),
  },
  {
    menuCode: "employee_roster",
    match: (c) =>
      c.startsWith("employee:roster:")
      || c.startsWith("employee:archive:")
      || c === "employee:edit"
      || c === "employee:export"
      || c === "employee:sensitive:view",
  },
  { menuCode: "org_structure", match: (c) => c.startsWith("organization:") },
  { menuCode: "org_positions", match: (c) => c.startsWith("position:") },
  { menuCode: "org_headcount", match: (c) => c.startsWith("headcount:") },
  { menuCode: "reporting_lines", match: (c) => c.startsWith("reporting-line:") },
  { menuCode: "onboarding", match: (c) => c.startsWith("onboarding:") },
  { menuCode: "movements", match: (c) => c.startsWith("employee:movement:") },
  { menuCode: "offboarding", match: (c) => c.startsWith("offboarding:") },
  { menuCode: "contracts", match: (c) => c.startsWith("contract:") },
  { menuCode: "permissions", match: (c) => c.startsWith("permission:") },
  { menuCode: "audit", match: (c) => c.startsWith("audit:") },
  { menuCode: "settings", match: (c) => c.startsWith("settings:") || c === "dict:manage" },
  { menuCode: "reports", match: (c) => c.startsWith("report:") },
  { menuCode: "dashboard", match: (c) => c.startsWith("dashboard:") },
  { menuCode: "dev_health", match: (c) => c.startsWith("dev:") },
];

const itemMenuByCodeCache = new WeakMap<SysMenu[], Map<string, string>>();

function itemMenuIdByCode(menus: SysMenu[]): Map<string, string> {
  const cached = itemMenuByCodeCache.get(menus);
  if (cached) return cached;
  const map = new Map<string, string>();
  for (const item of flattenMenus(menus)) {
    if (item.menuType === "ITEM") map.set(item.code, item.id);
  }
  itemMenuByCodeCache.set(menus, map);
  return map;
}

/** 解析权限所属菜单 ITEM id（优先后端 menuId，否则按 code 规则推断） */
export function resolvePermissionMenuId(permission: Permission, menus: SysMenu[]): string | null {
  if (permission.menuId) return permission.menuId;
  const menuIds = itemMenuIdByCode(menus);
  for (const rule of PERMISSION_MENU_RULES) {
    if (rule.match(permission.code)) {
      const menuId = menuIds.get(rule.menuCode);
      if (menuId) return menuId;
    }
  }
  return null;
}

/** 按菜单节点筛选权限（含子菜单 ITEM） */
export function permissionsForMenuNode(
  menu: SysMenu | null,
  permissions: Permission[],
  menus: SysMenu[],
): Permission[] {
  if (!menu) return [];
  const resolved = findMenuById(menus, menu.id) ?? menu;
  const menuIds = new Set(collectMenuDescendantIds(resolved));
  return permissions.filter((p) => {
    const ownerMenuId = resolvePermissionMenuId(p, menus);
    return ownerMenuId != null && menuIds.has(ownerMenuId);
  });
}

/** 角色授权左侧菜单导航（仅真实菜单树，不追加「其他权限」） */
export function buildPermissionNavMenus(menus: SysMenu[]): SysMenu[] {
  return menus;
}
