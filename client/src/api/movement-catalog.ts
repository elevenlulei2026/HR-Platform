import type {
  DictStatus,
  MovementCatalogOption,
  MovementCatalogTreeRow,
  MovementPhase,
  MovementReasonCreateRequest,
  MovementReasonDef,
  MovementReasonSubCreateRequest,
  MovementReasonSubDef,
  MovementReasonSubUpdateRequest,
  MovementReasonUpdateRequest,
  MovementTypeCreateRequest,
  MovementTypeDef,
  MovementTypeUpdateRequest,
} from "@shared/api.interface";

import { getJson, patchJson, postJson, putJson } from "@/api/http";

export async function listMovementTypes() {
  return getJson<MovementTypeDef[]>("/api/v1/movement-types");
}

export async function createMovementType(req: MovementTypeCreateRequest) {
  return postJson<MovementTypeDef, MovementTypeCreateRequest>("/api/v1/movement-types", req);
}

export async function updateMovementType(id: string, req: MovementTypeUpdateRequest) {
  return putJson<MovementTypeDef, MovementTypeUpdateRequest>(`/api/v1/movement-types/${id}`, req);
}

export async function updateMovementTypeStatus(id: string, status: DictStatus) {
  return patchJson<MovementTypeDef, { status: DictStatus }>(
    `/api/v1/movement-types/${id}/status`,
    { status },
  );
}

export async function listMovementReasons(movementTypeCode: string) {
  return getJson<MovementReasonDef[]>(
    `/api/v1/movement-types/${encodeURIComponent(movementTypeCode)}/reasons`,
  );
}

export async function createMovementReason(req: MovementReasonCreateRequest) {
  return postJson<MovementReasonDef, MovementReasonCreateRequest>("/api/v1/movement-reasons", req);
}

export async function updateMovementReason(id: string, req: MovementReasonUpdateRequest) {
  return putJson<MovementReasonDef, MovementReasonUpdateRequest>(
    `/api/v1/movement-reasons/${id}`,
    req,
  );
}

export async function updateMovementReasonStatus(id: string, status: DictStatus) {
  return patchJson<MovementReasonDef, { status: DictStatus }>(
    `/api/v1/movement-reasons/${id}/status`,
    { status },
  );
}

export async function listMovementReasonSubs(reasonId: string) {
  return getJson<MovementReasonSubDef[]>(`/api/v1/movement-reasons/${reasonId}/subs`);
}

export async function createMovementReasonSub(req: MovementReasonSubCreateRequest) {
  return postJson<MovementReasonSubDef, MovementReasonSubCreateRequest>(
    "/api/v1/movement-reason-subs",
    req,
  );
}

export async function updateMovementReasonSub(id: string, req: MovementReasonSubUpdateRequest) {
  return putJson<MovementReasonSubDef, MovementReasonSubUpdateRequest>(
    `/api/v1/movement-reason-subs/${id}`,
    req,
  );
}

export async function updateMovementReasonSubStatus(id: string, status: DictStatus) {
  return patchJson<MovementReasonSubDef, { status: DictStatus }>(
    `/api/v1/movement-reason-subs/${id}/status`,
    { status },
  );
}

export async function getMovementCatalogOptions() {
  return getJson<MovementCatalogOption[]>("/api/v1/movement-catalog/options");
}

export async function getMovementCatalogTree() {
  return getJson<MovementCatalogTreeRow[]>("/api/v1/movement-catalog/tree");
}

export const MOVEMENT_PHASE_OPTIONS: Array<{ id: MovementPhase; label: string }> = [
  { id: "HIRE", label: "入职" },
  { id: "CHANGE", label: "在职" },
  { id: "LEAVE", label: "离职" },
];
