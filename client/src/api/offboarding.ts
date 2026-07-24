import type {
  OffboardingCase,
  OffboardingCaseCreateRequest,
  OffboardingCaseListQuery,
  OffboardingCaseUpdateRequest,
  OffboardingCompleteRequest,
  OffboardingHandoverItemCreateRequest,
  OffboardingHandoverItemUpdateRequest,
  OffboardingSubmitRequest,
  PageResult,
  WorkflowTask,
} from "@shared/api.interface";

import { deleteJson, getJson, postJson, putJson } from "@/api/http";

function pageQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  return qs.toString();
}

export async function listOffboardingCases(query: OffboardingCaseListQuery) {
  return getJson<PageResult<OffboardingCase>>(
    `/api/v1/offboarding-cases?${pageQuery({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword,
      status: query.status,
    })}`,
  );
}

export async function getOffboardingCase(id: string) {
  return getJson<OffboardingCase>(`/api/v1/offboarding-cases/${id}`);
}

export async function createOffboardingCase(req: OffboardingCaseCreateRequest) {
  return postJson<OffboardingCase, OffboardingCaseCreateRequest>("/api/v1/offboarding-cases", req);
}

export async function updateOffboardingCase(id: string, req: OffboardingCaseUpdateRequest) {
  return putJson<OffboardingCase, OffboardingCaseUpdateRequest>(
    `/api/v1/offboarding-cases/${id}`,
    req,
  );
}

export async function submitOffboardingCase(id: string, req?: OffboardingSubmitRequest) {
  return postJson<OffboardingCase, Record<string, unknown>>(
    `/api/v1/offboarding-cases/${id}/submit`,
    (req ?? {}) as Record<string, unknown>,
  );
}

export async function cancelOffboardingCase(id: string) {
  return postJson<OffboardingCase, Record<string, unknown>>(
    `/api/v1/offboarding-cases/${id}/cancel`,
    {},
  );
}

export async function listOffboardingApprovalTasks(id: string) {
  return getJson<WorkflowTask[]>(`/api/v1/offboarding-cases/${id}/approval-tasks`);
}

export async function addOffboardingHandoverItem(
  id: string,
  req: OffboardingHandoverItemCreateRequest,
) {
  return postJson<OffboardingCase, OffboardingHandoverItemCreateRequest>(
    `/api/v1/offboarding-cases/${id}/handover-items`,
    req,
  );
}

export async function updateOffboardingHandoverItem(
  id: string,
  itemId: string,
  req: OffboardingHandoverItemUpdateRequest,
) {
  return putJson<OffboardingCase, OffboardingHandoverItemUpdateRequest>(
    `/api/v1/offboarding-cases/${id}/handover-items/${itemId}`,
    req,
  );
}

export async function removeOffboardingHandoverItem(id: string, itemId: string) {
  return deleteJson<OffboardingCase>(`/api/v1/offboarding-cases/${id}/handover-items/${itemId}`);
}

export async function completeOffboardingCase(id: string, req?: OffboardingCompleteRequest) {
  return postJson<OffboardingCase, Record<string, unknown>>(
    `/api/v1/offboarding-cases/${id}/complete`,
    (req ?? {}) as Record<string, unknown>,
  );
}

export const OFFBOARDING_STATUS_OPTIONS = [
  { id: "APPLIED" as const, label: "申请中" },
  { id: "APPROVING" as const, label: "审批中" },
  { id: "HANDOVER" as const, label: "交接中" },
  { id: "SETTLING" as const, label: "待结算" },
  { id: "COMPLETED" as const, label: "已离职" },
  { id: "CANCELLED" as const, label: "已取消" },
];

export const OFFBOARDING_REASON_OPTIONS = [
  { id: "TA" as const, label: "主动离职" },
  { id: "TB" as const, label: "被动离职" },
  { id: "TC" as const, label: "结束兼职" },
  { id: "TD" as const, label: "退休" },
  { id: "TE" as const, label: "死亡" },
  { id: "TF" as const, label: "从集团内部转调" },
  { id: "TG" as const, label: "放弃报到" },
  { id: "TH" as const, label: "入职当天离职" },
];

export function offboardingStatusLabel(status: string): string {
  return OFFBOARDING_STATUS_OPTIONS.find((o) => o.id === status)?.label ?? status;
}

export function offboardingReasonLabel(code: string): string {
  return OFFBOARDING_REASON_OPTIONS.find((o) => o.id === code)?.label ?? code;
}
