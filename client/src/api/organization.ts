import type {
  LegalEntity,
  LegalEntityCreateRequest,
  LegalEntityListQuery,
  LegalEntityUpdateRequest,
  Organization,
  OrganizationCreateRequest,
  OrganizationFormOptions,
  OrganizationTreeNode,
  OrganizationTreeQuery,
  OrganizationUpdateRequest,
  OrganizationVersion,
  PageResult,
  Position,
  PositionCreateRequest,
  PositionFormOptions,
  PositionListQuery,
  PositionUpdateRequest,
  PositionVersion,
} from "@shared/api.interface";

import { deleteJson, getJson, postJson, putJson } from "@/api/http";
import { normalizeNumericId } from "@/lib/numeric-id";

function pageQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  return qs.toString();
}

export async function listLegalEntities(query: LegalEntityListQuery) {
  return getJson<PageResult<LegalEntity>>(`/api/v1/legal-entities?${pageQuery(query)}`);
}

export async function createLegalEntity(req: LegalEntityCreateRequest) {
  return postJson<LegalEntity, LegalEntityCreateRequest>("/api/v1/legal-entities", req);
}

export async function updateLegalEntity(id: string, req: LegalEntityUpdateRequest) {
  return putJson<LegalEntity, LegalEntityUpdateRequest>(`/api/v1/legal-entities/${id}`, req);
}

export async function deleteLegalEntity(id: string) {
  return deleteJson<{ id: string }>(`/api/v1/legal-entities/${id}`);
}

export async function getOrganizationTree(query?: OrganizationTreeQuery) {
  const qs = query?.asOfDate ? `?asOfDate=${encodeURIComponent(query.asOfDate)}` : "";
  return getJson<OrganizationTreeNode[]>(`/api/v1/organizations/tree${qs}`);
}

export async function listDepartmentTypeOptions() {
  return getJson<OrganizationFormOptions["departmentTypes"]>("/api/v1/organizations/department-type-options");
}

export async function getOrganizationFormOptions() {
  return getJson<OrganizationFormOptions>("/api/v1/organizations/form-options");
}

export async function getOrganizationVersions(code: string) {
  return getJson<OrganizationVersion[]>(`/api/v1/organizations/by-code/${encodeURIComponent(code)}/versions`);
}

export async function getOrganization(id: string) {
  return getJson<Organization>(`/api/v1/organizations/${id}`);
}

export async function createOrganization(req: OrganizationCreateRequest) {
  return postJson<Organization, OrganizationCreateRequest>("/api/v1/organizations", req);
}

export async function updateOrganization(id: string, req: OrganizationUpdateRequest) {
  return putJson<Organization, OrganizationUpdateRequest>(`/api/v1/organizations/${id}`, req);
}

export async function getPositionFormOptions() {
  return getJson<PositionFormOptions>("/api/v1/positions/form-options");
}

export async function getPosition(id: string) {
  return getJson<Position>(`/api/v1/positions/${id}`);
}

export async function getPositionVersions(code: string) {
  return getJson<PositionVersion[]>(
    `/api/v1/positions/by-code/${encodeURIComponent(code)}/versions`,
  );
}

export async function listPositions(query: PositionListQuery) {
  return getJson<PageResult<Position>>(`/api/v1/positions?${pageQuery(query)}`);
}

export async function createPosition(req: PositionCreateRequest) {
  return postJson<Position, PositionCreateRequest>("/api/v1/positions", req);
}

export async function updatePosition(id: string, req: PositionUpdateRequest) {
  return putJson<Position, PositionUpdateRequest>(`/api/v1/positions/${id}`, req);
}

export async function deletePosition(id: string) {
  return deleteJson<{ id: string }>(`/api/v1/positions/${id}`);
}

export function flattenOrgTree(nodes: OrganizationTreeNode[]): OrganizationTreeNode[] {
  const out: OrganizationTreeNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.children?.length) out.push(...flattenOrgTree(n.children));
  }
  return out;
}

/** 任职可选部门：当前生效、启用中，排除集团根节点 */
export function filterAssignableDepartments(
  departments: OrganizationTreeNode[],
): OrganizationTreeNode[] {
  return departments.filter((org) => org.status === "ACTIVE" && org.code !== "ORG-ROOT");
}

/** 将任职记录中的部门 ID 解析为当前可选部门（按编码回退到最新生效版本） */
export function resolveOrganizationIdForAssignment(
  organizationId: string,
  organizationCode: string | undefined,
  assignable: OrganizationTreeNode[],
): string {
  if (organizationId && assignable.some((org) => org.id === organizationId)) {
    return organizationId;
  }
  if (organizationCode) {
    const matched = assignable.find((org) => org.code === organizationCode);
    if (matched) return matched.id;
  }
  return "";
}

/** 新建任职/员工时默认部门 */
export function defaultDepartmentId(departments: OrganizationTreeNode[]): string {
  return filterAssignableDepartments(departments)[0]?.id ?? "";
}
