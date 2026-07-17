import type {
  OnboardingCase,
  OnboardingCaseCreateRequest,
  OnboardingCaseListQuery,
  OnboardingCaseUpdateRequest,
  OnboardingSubmitRequest,
  PageResult,
} from "@shared/api.interface";

import { getJson, postJson, putJson } from "@/api/http";

function pageQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  return qs.toString();
}

export async function listOnboardingCases(query: OnboardingCaseListQuery) {
  return getJson<PageResult<OnboardingCase>>(
    `/api/v1/onboarding-cases?${pageQuery({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword,
      status: query.status,
    })}`,
  );
}

export async function getOnboardingCase(id: string) {
  return getJson<OnboardingCase>(`/api/v1/onboarding-cases/${id}`);
}

export async function createOnboardingCase(req: OnboardingCaseCreateRequest) {
  return postJson<OnboardingCase, OnboardingCaseCreateRequest>("/api/v1/onboarding-cases", req);
}

export async function updateOnboardingCase(id: string, req: OnboardingCaseUpdateRequest) {
  return putJson<OnboardingCase, OnboardingCaseUpdateRequest>(`/api/v1/onboarding-cases/${id}`, req);
}

export async function submitOnboardingCase(id: string, req?: OnboardingSubmitRequest) {
  return postJson<OnboardingCase, Record<string, unknown>>(
    `/api/v1/onboarding-cases/${id}/submit`,
    (req ?? {}) as Record<string, unknown>,
  );
}

export async function cancelOnboardingCase(id: string) {
  return postJson<OnboardingCase, Record<string, unknown>>(`/api/v1/onboarding-cases/${id}/cancel`, {});
}

export async function completeOnboardingCase(id: string) {
  return postJson<OnboardingCase, Record<string, unknown>>(`/api/v1/onboarding-cases/${id}/complete`, {});
}

export const ONBOARDING_STATUS_OPTIONS = [
  { id: "DRAFT" as const, label: "草稿" },
  { id: "PENDING" as const, label: "待审批" },
  { id: "IN_PROGRESS" as const, label: "办理中" },
  { id: "COMPLETED" as const, label: "已完成" },
  { id: "CANCELLED" as const, label: "已取消" },
];

export function onboardingStatusLabel(status: string): string {
  return ONBOARDING_STATUS_OPTIONS.find((o) => o.id === status)?.label ?? status;
}
