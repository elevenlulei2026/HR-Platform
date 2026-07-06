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
  const body = {
    ...req,
    organizationId: Number(req.organizationId),
  };
  return postJson<Position, typeof body>("/api/v1/positions", body);
}

export async function updatePosition(id: string, req: PositionUpdateRequest) {
  const body = {
    ...req,
    organizationId: req.organizationId ? Number(req.organizationId) : undefined,
  };
  return putJson<Position, typeof body>(`/api/v1/positions/${id}`, body);
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
