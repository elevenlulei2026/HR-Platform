import type {
  OpenEmployeeAccountRequest,
  PageResult,
  RenameLoginRequest,
  ResetPasswordRequest,
  SysUserAccount,
  SysUserCreateRequest,
  SysUserListQuery,
  SysUserUpdateRequest,
} from "@shared/api.interface";

import { getJson, postJson, putJson } from "@/api/http";

function toQuery(query: SysUserListQuery) {
  const q = new URLSearchParams();
  q.set("page", String(query.page));
  q.set("pageSize", String(query.pageSize));
  if (query.keyword) q.set("keyword", query.keyword);
  if (query.status && query.status !== "ALL") q.set("status", query.status);
  if (query.roleCode) q.set("roleCode", query.roleCode);
  if (query.accountType && query.accountType !== "ALL") q.set("accountType", query.accountType);
  if (query.boundEmployee && query.boundEmployee !== "ALL") q.set("boundEmployee", query.boundEmployee);
  return q.toString();
}

export async function listUsers(query: SysUserListQuery) {
  return getJson<PageResult<SysUserAccount>>(`/api/v1/users?${toQuery(query)}`);
}

export async function getUser(id: string) {
  return getJson<SysUserAccount>(`/api/v1/users/${id}`);
}

export async function createSystemUser(req: SysUserCreateRequest) {
  return postJson<SysUserAccount, SysUserCreateRequest>("/api/v1/users", req);
}

export async function updateUser(id: string, req: SysUserUpdateRequest) {
  return putJson<SysUserAccount, SysUserUpdateRequest>(`/api/v1/users/${id}`, req);
}

export async function resetUserPassword(id: string, req: ResetPasswordRequest) {
  return postJson<{ id: string }, ResetPasswordRequest>(`/api/v1/users/${id}/reset-password`, req);
}

export async function renameUserLogin(id: string, req: RenameLoginRequest) {
  return postJson<SysUserAccount, RenameLoginRequest>(`/api/v1/users/${id}/rename-login`, req);
}

export async function openEmployeeAccount(employeeId: string, req: OpenEmployeeAccountRequest) {
  return postJson<SysUserAccount, OpenEmployeeAccountRequest>(
    `/api/v1/employees/${employeeId}/open-account`,
    req,
  );
}
