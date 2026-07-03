import type {
  CodeRule,
  CodeRuleCreateRequest,
  CodeRuleListQuery,
  CodeRuleUpdateRequest,
  GenerateCodeRequest,
  GenerateCodeResponseData,
  PageResult,
} from "@shared/api.interface";

import { deleteJson, getJson, postJson, putJson } from "@/api/http";

function toQueryString(query: CodeRuleListQuery): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.keyword) params.set("keyword", query.keyword);
  return params.toString();
}

export async function listCodeRules(query: CodeRuleListQuery) {
  const qs = toQueryString(query);
  return getJson<PageResult<CodeRule>>(`/api/v1/code-rules?${qs}`);
}

export async function createCodeRule(req: CodeRuleCreateRequest) {
  return postJson<CodeRule, CodeRuleCreateRequest>("/api/v1/code-rules", req);
}

export async function updateCodeRule(id: string, req: CodeRuleUpdateRequest) {
  return putJson<CodeRule, CodeRuleUpdateRequest>(`/api/v1/code-rules/${id}`, req);
}

export async function deleteCodeRule(id: string) {
  return deleteJson<{ id: string }>(`/api/v1/code-rules/${id}`);
}

export async function generateCode(req: GenerateCodeRequest) {
  return postJson<GenerateCodeResponseData, GenerateCodeRequest>("/api/v1/codes/generate", req);
}

