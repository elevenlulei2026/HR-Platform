import type { LoginRequest, LoginResponseData, UserProfile } from "@shared/api.interface";

import { getJson, postJson } from "@/api/http";

export async function login(req: LoginRequest) {
  return postJson<LoginResponseData, LoginRequest>("/api/v1/auth/login", req);
}

export async function me() {
  return getJson<UserProfile>("/api/v1/auth/me");
}

