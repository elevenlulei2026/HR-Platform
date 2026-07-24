import type {
  JobMovementRequest,
  JobMovementRequestCreateRequest,
  JobMovementRequestListQuery,
  JobMovementRequestUpdateRequest,
  JobMovementSubmitRequest,
  JobMovementTypeCode,
  PageResult,
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

export async function listJobMovementRequests(query: JobMovementRequestListQuery) {
  return getJson<PageResult<JobMovementRequest>>(
    `/api/v1/job-movement-requests?${pageQuery({
      page: query.page,
      pageSize: query.pageSize,
      movementType: query.movementType,
      keyword: query.keyword,
      status: query.status,
    })}`,
  );
}

export async function getJobMovementRequest(id: string) {
  return getJson<JobMovementRequest>(`/api/v1/job-movement-requests/${id}`);
}

export async function createJobMovementRequest(req: JobMovementRequestCreateRequest) {
  return postJson<JobMovementRequest, JobMovementRequestCreateRequest>(
    "/api/v1/job-movement-requests",
    req,
  );
}

export async function updateJobMovementRequest(id: string, req: JobMovementRequestUpdateRequest) {
  return putJson<JobMovementRequest, JobMovementRequestUpdateRequest>(
    `/api/v1/job-movement-requests/${id}`,
    req,
  );
}

export async function submitJobMovementRequest(id: string, req?: JobMovementSubmitRequest) {
  return postJson<JobMovementRequest, Record<string, unknown>>(
    `/api/v1/job-movement-requests/${id}/submit`,
    (req ?? {}) as Record<string, unknown>,
  );
}

export async function cancelJobMovementRequest(id: string) {
  return postJson<JobMovementRequest, Record<string, unknown>>(
    `/api/v1/job-movement-requests/${id}/cancel`,
    {},
  );
}

export async function listJobMovementApprovalTasks(id: string) {
  return getJson<WorkflowTask[]>(`/api/v1/job-movement-requests/${id}/approval-tasks`);
}

export const JOB_MOVEMENT_STATUS_OPTIONS = [
  { id: "DRAFT" as const, label: "草稿" },
  { id: "PENDING" as const, label: "待审批" },
  { id: "COMPLETED" as const, label: "已完成" },
  { id: "CANCELLED" as const, label: "已取消" },
];

export const JOB_MOVEMENT_TYPE_META: Record<
  JobMovementTypeCode,
  { label: string; actionLabel: string; emptyTitle: string }
> = {
  PRO: { label: "晋升晋级", actionLabel: "发起晋升晋级", emptyTitle: "暂无晋升晋级单" },
  DEM: { label: "降职降级", actionLabel: "发起降职降级", emptyTitle: "暂无降职降级单" },
  SPR: { label: "雇佣类型变更", actionLabel: "发起雇佣类型变更", emptyTitle: "暂无雇佣类型变更单" },
};

export function jobMovementStatusLabel(status: string): string {
  return JOB_MOVEMENT_STATUS_OPTIONS.find((o) => o.id === status)?.label ?? status;
}
