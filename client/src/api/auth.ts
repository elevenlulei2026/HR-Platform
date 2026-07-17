import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponseData,
  UserProfile,
} from "@shared/api.interface";

import { getJson, postJson, putJson } from "@/api/http";

export async function login(req: LoginRequest) {
  return postJson<LoginResponseData, LoginRequest>("/api/v1/auth/login", req);
}

export async function me() {
  return getJson<UserProfile>("/api/v1/auth/me");
}

export async function changePassword(req: ChangePasswordRequest) {
  return putJson<{ ok: true }, ChangePasswordRequest>("/api/v1/auth/password", req);
}

