import type {
  ContractChangeRequest,
  ContractChangeRequestCreateRequest,
  ContractChangeRequestListQuery,
  ContractChangeRequestUpdateRequest,
  ContractChangeSubmitRequest,
  ContractExpiringListQuery,
  ContractExpiringRecord,
  ContractExpiryScanResult,
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

export async function listContractChangeRequests(query: ContractChangeRequestListQuery) {
  return getJson<{ items: ContractChangeRequest[]; total: number; page: number; pageSize: number }>(
    `/api/v1/contract-change-requests?${pageQuery({
      page: query.page,
      pageSize: query.pageSize,
      requestType: query.requestType,
      targetKind: query.targetKind,
      keyword: query.keyword,
      status: query.status,
    })}`,
  );
}

export async function getContractChangeRequest(id: string) {
  return getJson<ContractChangeRequest>(`/api/v1/contract-change-requests/${id}`);
}

export async function createContractChangeRequest(req: ContractChangeRequestCreateRequest) {
  return postJson<ContractChangeRequest, ContractChangeRequestCreateRequest>(
    "/api/v1/contract-change-requests",
    req,
  );
}

export async function updateContractChangeRequest(
  id: string,
  req: ContractChangeRequestUpdateRequest,
) {
  return putJson<ContractChangeRequest, ContractChangeRequestUpdateRequest>(
    `/api/v1/contract-change-requests/${id}`,
    req,
  );
}

export async function submitContractChangeRequest(id: string, req?: ContractChangeSubmitRequest) {
  return postJson<ContractChangeRequest, Record<string, unknown>>(
    `/api/v1/contract-change-requests/${id}/submit`,
    (req ?? {}) as Record<string, unknown>,
  );
}

export async function cancelContractChangeRequest(id: string) {
  return postJson<ContractChangeRequest, Record<string, unknown>>(
    `/api/v1/contract-change-requests/${id}/cancel`,
    {},
  );
}

export async function listContractChangeApprovalTasks(id: string) {
  return getJson<WorkflowTask[]>(`/api/v1/contract-change-requests/${id}/approval-tasks`);
}

export async function listExpiringContractRecords(query: ContractExpiringListQuery) {
  return getJson<{ items: ContractExpiringRecord[]; total: number; page: number; pageSize: number }>(
    `/api/v1/contract-change-requests/expiring?${pageQuery({
      page: query.page,
      pageSize: query.pageSize,
      days: query.days,
      targetKind: query.targetKind,
      keyword: query.keyword,
    })}`,
  );
}

export async function scanContractExpiryReminders() {
  return postJson<ContractExpiryScanResult, Record<string, never>>(
    "/api/v1/contract-change-requests/scan-expiry",
    {},
  );
}

export const CONTRACT_CHANGE_STATUS_OPTIONS = [
  { id: "DRAFT" as const, label: "草稿" },
  { id: "PENDING" as const, label: "待审批" },
  { id: "COMPLETED" as const, label: "已完成" },
  { id: "CANCELLED" as const, label: "已取消" },
];

export const CONTRACT_CHANGE_TARGET_OPTIONS = [
  { id: "CONTRACT" as const, label: "劳动合同" },
  { id: "AGREEMENT" as const, label: "协议" },
];

export function contractChangeStatusLabel(status: string): string {
  return CONTRACT_CHANGE_STATUS_OPTIONS.find((o) => o.id === status)?.label ?? status;
}

export function contractChangeRequestTypeLabel(type: string): string {
  return type === "RENEWAL" ? "续签" : type === "CHANGE" ? "变更" : type;
}

export function contractChangeTargetKindLabel(kind: string): string {
  return CONTRACT_CHANGE_TARGET_OPTIONS.find((o) => o.id === kind)?.label ?? kind;
}
