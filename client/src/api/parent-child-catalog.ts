import type {
  ChildCreateRequest,
  DictStatus,
  ParentChildItemDef,
  ParentChildItemUpdateRequest,
  ParentChildTreeRow,
  ParentChildTreeRow3,
  ParentChildTypeCreateRequest,
  ParentChildTypeDef,
  ParentChildTypeUpdateRequest,
  ParentCreateRequest,
  ParentChildOption,
  ParentChildOption3,
} from "@shared/api.interface";

import { getJson, patchJson, postJson, putJson } from "@/api/http";

export async function listParentChildTypes() {
  return getJson<ParentChildTypeDef[]>("/api/v1/parent-child-types");
}

export async function createParentChildType(req: ParentChildTypeCreateRequest) {
  return postJson<ParentChildTypeDef, ParentChildTypeCreateRequest>("/api/v1/parent-child-types", req);
}

export async function updateParentChildType(id: string, req: ParentChildTypeUpdateRequest) {
  return putJson<ParentChildTypeDef, ParentChildTypeUpdateRequest>(`/api/v1/parent-child-types/${id}`, req);
}

export async function listParentsByType(typeCode: string) {
  return getJson<ParentChildItemDef[]>(
    `/api/v1/parent-child-types/${encodeURIComponent(typeCode)}/parents`,
  );
}

export async function listChildrenByParent(typeCode: string, parentCode: string) {
  return getJson<ParentChildItemDef[]>(
    `/api/v1/parent-child-types/${encodeURIComponent(typeCode)}/parents/${encodeURIComponent(parentCode)}/children`,
  );
}

export async function createParent(req: ParentCreateRequest) {
  return postJson<ParentChildItemDef, ParentCreateRequest>("/api/v1/parent-child-parents", req);
}

export async function updateParent(id: string, req: ParentChildItemUpdateRequest) {
  return putJson<ParentChildItemDef, ParentChildItemUpdateRequest>(`/api/v1/parent-child-parents/${id}`, req);
}

export async function createChild(req: ChildCreateRequest) {
  return postJson<ParentChildItemDef, ChildCreateRequest>("/api/v1/parent-child-children", req);
}

export async function updateChild(id: string, req: ParentChildItemUpdateRequest) {
  return putJson<ParentChildItemDef, ParentChildItemUpdateRequest>(`/api/v1/parent-child-children/${id}`, req);
}

export async function updateParentChildItemStatus(id: string, status: DictStatus) {
  return patchJson<ParentChildItemDef, { status: DictStatus }>(`/api/v1/parent-child-items/${id}/status`, {
    status,
  });
}

export async function getParentChildTree(typeCode: string) {
  return getJson<ParentChildTreeRow[]>(
    `/api/v1/parent-child-types/${encodeURIComponent(typeCode)}/tree`,
  );
}

export async function getParentChildTree3(typeCode: string) {
  return getJson<ParentChildTreeRow3[]>(
    `/api/v1/parent-child-types/${encodeURIComponent(typeCode)}/tree3`,
  );
}

export async function getParentChildOptions(typeCode: string) {
  return getJson<ParentChildOption[]>(
    `/api/v1/parent-child-types/${encodeURIComponent(typeCode)}/options`,
  );
}

export async function getParentChildOptions3(typeCode: string) {
  return getJson<ParentChildOption3[]>(
    `/api/v1/parent-child-types/${encodeURIComponent(typeCode)}/options3`,
  );
}

