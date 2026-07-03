import type {
  DictItem,
  DictItemCreateRequest,
  DictItemUpdateRequest,
  DictType,
  DictTypeCreateRequest,
  DictTypeListQuery,
  DictTypeUpdateRequest,
  PageResult,
} from "@shared/api.interface";

import { deleteJson, getJson, postJson, putJson } from "@/api/http";

function toQueryString(query: DictTypeListQuery): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.keyword) params.set("keyword", query.keyword);
  return params.toString();
}

export async function listDictTypes(query: DictTypeListQuery) {
  const qs = toQueryString(query);
  return getJson<PageResult<DictType>>(`/api/v1/dict-types?${qs}`);
}

export async function createDictType(req: DictTypeCreateRequest) {
  return postJson<DictType, DictTypeCreateRequest>("/api/v1/dict-types", req);
}

export async function updateDictType(id: string, req: DictTypeUpdateRequest) {
  return putJson<DictType, DictTypeUpdateRequest>(`/api/v1/dict-types/${id}`, req);
}

export async function deleteDictType(id: string) {
  return deleteJson<{ id: string }>(`/api/v1/dict-types/${id}`);
}

export async function getDictType(id: string) {
  return getJson<DictType>(`/api/v1/dict-types/${id}`);
}

export async function listDictItemsByTypeCode(typeCode: string) {
  return getJson<DictItem[]>(`/api/v1/dict-types/${encodeURIComponent(typeCode)}/items`);
}

export async function createDictItem(req: DictItemCreateRequest) {
  return postJson<DictItem, DictItemCreateRequest>("/api/v1/dict-items", req);
}

export async function updateDictItem(id: string, req: DictItemUpdateRequest) {
  return putJson<DictItem, DictItemUpdateRequest>(`/api/v1/dict-items/${id}`, req);
}

export async function deleteDictItem(id: string) {
  return deleteJson<{ id: string }>(`/api/v1/dict-items/${id}`);
}

