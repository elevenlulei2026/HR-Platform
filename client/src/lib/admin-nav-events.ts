/** 菜单配置变更后通知 AdminLayout 重新拉取顶栏导航 */
export const ADMIN_NAV_CHANGED_EVENT = "hr:admin-nav-changed";

export function notifyAdminNavChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_NAV_CHANGED_EVENT));
}
