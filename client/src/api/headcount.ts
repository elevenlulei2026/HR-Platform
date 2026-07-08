import type {
  HeadcountCheckRequest,
  HeadcountCheckResult,
  HeadcountPlan,
  HeadcountPlanCreateRequest,
  HeadcountPlanListQuery,
  HeadcountPlanUpdateRequest,
  PageResult,
} from "@shared/api.interface";

import { deleteJson, getJson, postJson, putJson } from "@/api/http";

function pageQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  return qs.toString();
}

export async function listHeadcountPlans(query: HeadcountPlanListQuery) {
  return getJson<PageResult<HeadcountPlan>>(`/api/v1/headcount-plans?${pageQuery(query)}`);
}

export async function createHeadcountPlan(req: HeadcountPlanCreateRequest) {
  return postJson<HeadcountPlan, HeadcountPlanCreateRequest>("/api/v1/headcount-plans", req);
}

export async function updateHeadcountPlan(id: string, req: HeadcountPlanUpdateRequest) {
  return putJson<HeadcountPlan, HeadcountPlanUpdateRequest>(`/api/v1/headcount-plans/${id}`, req);
}

export async function deleteHeadcountPlan(id: string) {
  return deleteJson<{ id: string }>(`/api/v1/headcount-plans/${id}`);
}

export async function checkHeadcount(req: HeadcountCheckRequest) {
  return postJson<HeadcountCheckResult, HeadcountCheckRequest>("/api/v1/headcount/check", req);
}
