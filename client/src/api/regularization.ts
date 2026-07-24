import type {
  PageResult,
  RegularizationRequest,
  RegularizationRequestCreateRequest,
  RegularizationRequestListQuery,
  RegularizationRequestUpdateRequest,
  RegularizationSubmitRequest,
  WorkflowTask,
} from "@shared/api.interface";

import { getJson, postJson, putJson } from "@/api/http";

function pageQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  return qs.toString();
}

export async function listRegularizationRequests(query: RegularizationRequestListQuery) {
  return getJson<PageResult<RegularizationRequest>>(
    `/api/v1/regularization-requests?${pageQuery({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword,
      status: query.status,
    })}`,
  );
}

export async function getRegularizationRequest(id: string) {
  return getJson<RegularizationRequest>(`/api/v1/regularization-requests/${id}`);
}

export async function createRegularizationRequest(req: RegularizationRequestCreateRequest) {
  return postJson<RegularizationRequest, RegularizationRequestCreateRequest>(
    "/api/v1/regularization-requests",
    req,
  );
}

export async function updateRegularizationRequest(
  id: string,
  req: RegularizationRequestUpdateRequest,
) {
  return putJson<RegularizationRequest, RegularizationRequestUpdateRequest>(
    `/api/v1/regularization-requests/${id}`,
    req,
  );
}

export async function submitRegularizationRequest(id: string, req?: RegularizationSubmitRequest) {
  return postJson<RegularizationRequest, Record<string, unknown>>(
    `/api/v1/regularization-requests/${id}/submit`,
    (req ?? {}) as Record<string, unknown>,
  );
}

export async function cancelRegularizationRequest(id: string) {
  return postJson<RegularizationRequest, Record<string, unknown>>(
    `/api/v1/regularization-requests/${id}/cancel`,
    {},
  );
}

export async function listRegularizationApprovalTasks(id: string) {
  return getJson<WorkflowTask[]>(`/api/v1/regularization-requests/${id}/approval-tasks`);
}

export const REGULARIZATION_STATUS_OPTIONS = [
  { id: "DRAFT" as const, label: "草稿" },
  { id: "PENDING" as const, label: "待审批" },
  { id: "COMPLETED" as const, label: "已完成" },
  { id: "CANCELLED" as const, label: "已取消" },
];

export const REGULARIZATION_REASON_OPTIONS = [
  { id: "P01" as const, label: "正常转正" },
  { id: "P02" as const, label: "提前转正" },
  { id: "P03" as const, label: "延迟转正" },
];

export function regularizationStatusLabel(status: string): string {
  return REGULARIZATION_STATUS_OPTIONS.find((o) => o.id === status)?.label ?? status;
}

export function regularizationReasonLabel(code: string): string {
  return REGULARIZATION_REASON_OPTIONS.find((o) => o.id === code)?.label ?? code;
}

/** 按 actual vs expected 自动判定原因码 */
export function suggestRegularizationReason(
  expected?: string | null,
  actual?: string | null,
): "P01" | "P02" | "P03" {
  if (!expected || !actual) return "P01";
  if (actual < expected) return "P02";
  if (actual > expected) return "P03";
  return "P01";
}
