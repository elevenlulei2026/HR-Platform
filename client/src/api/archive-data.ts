import type {
  ArchiveDataCreateRequest,
  ArchiveDataImportErrorReportRequest,
  ArchiveDataImportResult,
  ArchiveDataListQuery,
  ArchiveDataResourceMeta,
  ArchiveDataRow,
  ArchiveDataUpdateRequest,
  EmployeeArchiveResourceByPath,
  EmployeeArchiveResourcePath,
  PageResult,
} from "@shared/api.interface";

import { deleteJson, getAuthToken, getJson, postJson, postMultipart, putJson } from "@/api/http";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") ||
  "http://localhost:8087";

function qs(query: Record<string, string | number | boolean | undefined | null>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function listArchiveDataResources() {
  return getJson<ArchiveDataResourceMeta[]>("/api/v1/archive-data/resources");
}

export async function listArchiveData<TPath extends EmployeeArchiveResourcePath>(
  resource: TPath,
  query: ArchiveDataListQuery,
) {
  return getJson<PageResult<ArchiveDataRow<EmployeeArchiveResourceByPath[TPath]>>>(
    `/api/v1/archive-data/${resource}${qs(query)}`,
  );
}

export async function createArchiveData<TPath extends EmployeeArchiveResourcePath>(
  resource: TPath,
  req: ArchiveDataCreateRequest<EmployeeArchiveResourceByPath[TPath]>,
) {
  return postJson<ArchiveDataRow<EmployeeArchiveResourceByPath[TPath]>>(
    `/api/v1/archive-data/${resource}`,
    req,
  );
}

export async function updateArchiveData<TPath extends EmployeeArchiveResourcePath>(
  resource: TPath,
  id: string,
  req: ArchiveDataUpdateRequest<EmployeeArchiveResourceByPath[TPath]>,
) {
  return putJson<ArchiveDataRow<EmployeeArchiveResourceByPath[TPath]>>(
    `/api/v1/archive-data/${resource}/${id}`,
    req,
  );
}

export async function deleteArchiveData(resource: EmployeeArchiveResourcePath, id: string) {
  return deleteJson<{ id: string; employeeId: string }>(`/api/v1/archive-data/${resource}/${id}`);
}

export async function downloadArchiveDataImportTemplate(resource: EmployeeArchiveResourcePath) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/v1/archive-data/${resource}/import-template`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`下载模板失败（HTTP ${res.status}）`);
  return res.blob();
}

export async function importArchiveData(resource: EmployeeArchiveResourcePath, file: File) {
  const form = new FormData();
  form.append("file", file);
  return postMultipart<ArchiveDataImportResult>(`/api/v1/archive-data/${resource}/import`, form);
}

export async function downloadArchiveDataImportErrorReport(
  resource: EmployeeArchiveResourcePath,
  req: ArchiveDataImportErrorReportRequest,
) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/v1/archive-data/${resource}/import-error-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`下载错误报告失败（HTTP ${res.status}）`);
  return res.blob();
}

export async function exportArchiveData(
  resource: EmployeeArchiveResourcePath,
  query?: Omit<ArchiveDataListQuery, "page" | "pageSize">,
) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/v1/archive-data/${resource}/export${qs(query ?? {})}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`导出失败（HTTP ${res.status}）`);
  return res.blob();
}
