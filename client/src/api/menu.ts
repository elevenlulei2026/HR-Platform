import type { SysMenu, SysMenuCreateRequest, SysMenuUpdateRequest } from "@shared/api.interface";

import { deleteJson, getJson, postJson, putJson } from "@/api/http";

export async function getNavMenuTree() {
  return getJson<SysMenu[]>("/api/v1/menus/nav-tree");
}

export async function getAdminMenuTree() {
  return getJson<SysMenu[]>("/api/v1/menus/tree");
}

export async function createMenu(req: SysMenuCreateRequest) {
  return postJson<SysMenu, SysMenuCreateRequest>("/api/v1/menus", req);
}

export async function updateMenu(id: string, req: SysMenuUpdateRequest) {
  return putJson<SysMenu, SysMenuUpdateRequest>(`/api/v1/menus/${id}`, req);
}

export async function deleteMenu(id: string) {
  return deleteJson<{ id: string }>(`/api/v1/menus/${id}`);
}
