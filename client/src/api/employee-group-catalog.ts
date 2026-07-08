import type {
  DictStatus,
  EmployeeGroupCatalogOption,
  EmployeeGroupCatalogTreeRow,
  EmployeeGroupCreateRequest,
  EmployeeGroupDef,
  EmployeeGroupUpdateRequest,
  EmployeeSubgroupCreateRequest,
  EmployeeSubgroupDef,
  EmployeeSubgroupUpdateRequest,
} from "@shared/api.interface";

import { getJson, patchJson, postJson, putJson } from "@/api/http";

export async function listEmployeeGroups() {
  return getJson<EmployeeGroupDef[]>("/api/v1/employee-groups");
}

export async function createEmployeeGroup(req: EmployeeGroupCreateRequest) {
  return postJson<EmployeeGroupDef, EmployeeGroupCreateRequest>("/api/v1/employee-groups", req);
}

export async function updateEmployeeGroup(id: string, req: EmployeeGroupUpdateRequest) {
  return putJson<EmployeeGroupDef, EmployeeGroupUpdateRequest>(
    `/api/v1/employee-groups/${id}`,
    req,
  );
}

export async function updateEmployeeGroupStatus(id: string, status: DictStatus) {
  return patchJson<EmployeeGroupDef, { status: DictStatus }>(
    `/api/v1/employee-groups/${id}/status`,
    { status },
  );
}

export async function listEmployeeSubgroups(employeeGroupCode: string) {
  return getJson<EmployeeSubgroupDef[]>(
    `/api/v1/employee-groups/${encodeURIComponent(employeeGroupCode)}/subgroups`,
  );
}

export async function createEmployeeSubgroup(req: EmployeeSubgroupCreateRequest) {
  return postJson<EmployeeSubgroupDef, EmployeeSubgroupCreateRequest>(
    "/api/v1/employee-subgroups",
    req,
  );
}

export async function updateEmployeeSubgroup(id: string, req: EmployeeSubgroupUpdateRequest) {
  return putJson<EmployeeSubgroupDef, EmployeeSubgroupUpdateRequest>(
    `/api/v1/employee-subgroups/${id}`,
    req,
  );
}

export async function updateEmployeeSubgroupStatus(id: string, status: DictStatus) {
  return patchJson<EmployeeSubgroupDef, { status: DictStatus }>(
    `/api/v1/employee-subgroups/${id}/status`,
    { status },
  );
}

export async function getEmployeeGroupCatalogOptions() {
  return getJson<EmployeeGroupCatalogOption[]>("/api/v1/employee-group-catalog/options");
}

export async function getEmployeeGroupCatalogTree() {
  return getJson<EmployeeGroupCatalogTreeRow[]>("/api/v1/employee-group-catalog/tree");
}
