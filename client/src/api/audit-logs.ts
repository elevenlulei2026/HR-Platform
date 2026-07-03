import type { AuditLog, AuditLogQuery, PageResult } from "@shared/api.interface";

import { getJson } from "@/api/http";

function toQueryString(query: AuditLogQuery): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.action) params.set("action", query.action);
  if (query.resourceType) params.set("resourceType", query.resourceType);
  if (query.operatorUsername) params.set("operatorUsername", query.operatorUsername);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return params.toString();
}

export async function listAuditLogs(query: AuditLogQuery) {
  const qs = toQueryString(query);
  return getJson<PageResult<AuditLog>>(`/api/v1/audit-logs?${qs}`);
}

