import type {
  PageResult,
  Permission,
  PermissionCreateRequest,
  PermissionListQuery,
  PermissionUpdateRequest,
  Role,
  RoleCreateRequest,
  RoleListQuery,
  RoleUpdateRequest,
  SetRoleOrgScopesRequest,
  SetRolePermissionsRequest,
  SetUserRolesRequest,
} from "@shared/api.interface";

import { deleteJson, getJson, postJson, putJson } from "@/api/http";

export async function listPermissions(query: PermissionListQuery) {
  const q = new URLSearchParams();
  q.set("page", String(query.page));
  q.set("pageSize", String(query.pageSize));
  if (query.keyword) q.set("keyword", query.keyword);
  if (query.status) q.set("status", query.status);
  if (query.menuId) q.set("menuId", query.menuId);
  if (query.moduleCode) q.set("moduleCode", query.moduleCode);
  return getJson<PageResult<Permission>>(`/api/v1/permissions?${q.toString()}`);
}

export async function createPermission(req: PermissionCreateRequest) {
  return postJson<Permission, PermissionCreateRequest>("/api/v1/permissions", req);
}

export async function updatePermission(id: string, req: PermissionUpdateRequest) {
  return putJson<Permission, PermissionUpdateRequest>(`/api/v1/permissions/${id}`, req);
}

export async function deletePermission(id: string) {
  return deleteJson<{ id: string }>(`/api/v1/permissions/${id}`);
}

export async function getPermission(id: string) {
  return getJson<Permission>(`/api/v1/permissions/${id}`);
}

export async function listRoles(query: RoleListQuery) {
  const q = new URLSearchParams();
  q.set("page", String(query.page));
  q.set("pageSize", String(query.pageSize));
  if (query.keyword) q.set("keyword", query.keyword);
  return getJson<PageResult<Role>>(`/api/v1/roles?${q.toString()}`);
}

export async function createRole(req: RoleCreateRequest) {
  return postJson<Role, RoleCreateRequest>("/api/v1/roles", req);
}

export async function updateRole(id: string, req: RoleUpdateRequest) {
  return putJson<Role, RoleUpdateRequest>(`/api/v1/roles/${id}`, req);
}

export async function deleteRole(id: string) {
  return deleteJson<{ id: string }>(`/api/v1/roles/${id}`);
}

export async function getRole(id: string) {
  return getJson<Role>(`/api/v1/roles/${id}`);
}

export async function listRolePermissions(id: string) {
  return getJson<string[]>(`/api/v1/roles/${id}/permissions`);
}

export async function setRolePermissions(id: string, req: SetRolePermissionsRequest) {
  return putJson<{ id: string }, SetRolePermissionsRequest>(`/api/v1/roles/${id}/permissions`, req);
}

export async function listRoleOrgScopes(id: string) {
  return getJson<string[]>(`/api/v1/roles/${id}/org-scopes`);
}

export async function setRoleOrgScopes(id: string, req: SetRoleOrgScopesRequest) {
  return putJson<{ id: string }, SetRoleOrgScopesRequest>(`/api/v1/roles/${id}/org-scopes`, req);
}

export async function listUserRoles(id: string) {
  return getJson<string[]>(`/api/v1/users/${id}/roles`);
}

export async function setUserRoles(id: string, req: SetUserRolesRequest) {
  return putJson<{ id: string }, SetUserRolesRequest>(`/api/v1/users/${id}/roles`, req);
}

