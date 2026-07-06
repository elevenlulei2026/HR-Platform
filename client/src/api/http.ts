import type { ApiResponse } from "@shared/api.interface";
import { agentLog } from "@/debug/agentLog";

export type ApiError = {
  message: string;
  traceId?: string;
};

const TOKEN_KEY = "hrPlatform.authToken";

const baseUrl =
  import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") ||
  "http://localhost:8087";

export function getAuthToken(): string | null {
  try {
    const v = localStorage.getItem(TOKEN_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (!token) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export async function getJson<T>(path: string): Promise<ApiResponse<T>> {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getAuthToken();

  // #region agent log
  agentLog({
    runId: "pre-fix",
    hypothesisId: "H1",
    location: "client/src/api/http.ts:getJson",
    message: "HTTP GET start",
    data: { path, hasToken: Boolean(token), baseUrl },
  });
  // #endregion agent log

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (e: unknown) {
    // #region agent log
    agentLog({
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "client/src/api/http.ts:getJson",
      message: "HTTP GET network error",
      data: { path, error: typeof (e as any)?.message === "string" ? (e as any).message : "unknown" },
    });
    // #endregion agent log
    throw { message: "网络错误：无法连接到服务" } satisfies ApiError;
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw { message: "服务返回非 JSON 响应" } satisfies ApiError;
  }

  if (!res.ok) {
    const traceId =
      typeof (json as any)?.traceId === "string" ? (json as any).traceId : undefined;
    const message =
      typeof (json as any)?.message === "string"
        ? (json as any).message
        : `请求失败（HTTP ${res.status}）`;

    // #region agent log
    agentLog({
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "client/src/api/http.ts:getJson",
      message: "HTTP GET error",
      data: { path, status: res.status, message, traceId: traceId || "" },
    });
    // #endregion agent log

    throw { message, traceId } satisfies ApiError;
  }

  // #region agent log
  agentLog({
    runId: "pre-fix",
    hypothesisId: "H1",
    location: "client/src/api/http.ts:getJson",
    message: "HTTP GET ok",
    data: { path, status: res.status },
  });
  // #endregion agent log

  return json as ApiResponse<T>;
}

export async function postJson<T, TBody extends Record<string, unknown>>(
  path: string,
  body: TBody,
): Promise<ApiResponse<T>> {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getAuthToken();

  // #region agent log
  agentLog({
    runId: "pre-fix",
    hypothesisId: "H2",
    location: "client/src/api/http.ts:postJson",
    message: "HTTP POST start",
    data: { path, hasToken: Boolean(token), baseUrl },
  });
  // #endregion agent log

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (e: unknown) {
    // #region agent log
    agentLog({
      runId: "pre-fix",
      hypothesisId: "H2",
      location: "client/src/api/http.ts:postJson",
      message: "HTTP POST network error",
      data: { path, error: typeof (e as any)?.message === "string" ? (e as any).message : "unknown" },
    });
    // #endregion agent log
    throw { message: "网络错误：无法连接到服务" } satisfies ApiError;
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw { message: "服务返回非 JSON 响应" } satisfies ApiError;
  }

  if (!res.ok) {
    const traceId =
      typeof (json as any)?.traceId === "string" ? (json as any).traceId : undefined;
    const message =
      typeof (json as any)?.message === "string"
        ? (json as any).message
        : `请求失败（HTTP ${res.status}）`;

    // #region agent log
    agentLog({
      runId: "pre-fix",
      hypothesisId: "H2",
      location: "client/src/api/http.ts:postJson",
      message: "HTTP POST error",
      data: { path, status: res.status, message, traceId: traceId || "" },
    });
    // #endregion agent log

    throw { message, traceId } satisfies ApiError;
  }

  // #region agent log
  agentLog({
    runId: "pre-fix",
    hypothesisId: "H2",
    location: "client/src/api/http.ts:postJson",
    message: "HTTP POST ok",
    data: { path, status: res.status },
  });
  // #endregion agent log

  return json as ApiResponse<T>;
}

export async function putJson<T, TBody extends Record<string, unknown>>(
  path: string,
  body: TBody,
): Promise<ApiResponse<T>> {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getAuthToken();

  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw { message: "网络错误：无法连接到服务" } satisfies ApiError;
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw { message: "服务返回非 JSON 响应" } satisfies ApiError;
  }

  if (!res.ok) {
    const traceId =
      typeof (json as any)?.traceId === "string" ? (json as any).traceId : undefined;
    const message =
      typeof (json as any)?.message === "string"
        ? (json as any).message
        : `请求失败（HTTP ${res.status}）`;
    throw { message, traceId } satisfies ApiError;
  }

  return json as ApiResponse<T>;
}

export async function deleteJson<T>(path: string): Promise<ApiResponse<T>> {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getAuthToken();

  let res: Response;
  try {
    res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw { message: "网络错误：无法连接到服务" } satisfies ApiError;
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw { message: "服务返回非 JSON 响应" } satisfies ApiError;
  }

  if (!res.ok) {
    const traceId =
      typeof (json as any)?.traceId === "string" ? (json as any).traceId : undefined;
    const message =
      typeof (json as any)?.message === "string"
        ? (json as any).message
        : `请求失败（HTTP ${res.status}）`;
    throw { message, traceId } satisfies ApiError;
  }

  return json as ApiResponse<T>;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getBlob(path: string): Promise<Blob> {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { method: "GET", headers: authHeaders() });
  if (!res.ok) {
    let message = `请求失败（HTTP ${res.status}）`;
    try {
      const json = await res.json();
      if (typeof (json as { message?: string }).message === "string") {
        message = (json as { message: string }).message;
      }
    } catch {
      // ignore
    }
    throw { message } satisfies ApiError;
  }
  return res.blob();
}

export async function postMultipart<T>(path: string, formData: FormData): Promise<ApiResponse<T>> {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { method: "POST", headers: authHeaders(), body: formData });
  const json = await res.json();
  if (!res.ok) {
    const traceId =
      typeof (json as { traceId?: string }).traceId === "string"
        ? (json as { traceId: string }).traceId
        : undefined;
    const message =
      typeof (json as { message?: string }).message === "string"
        ? (json as { message: string }).message
        : `请求失败（HTTP ${res.status}）`;
    throw { message, traceId } satisfies ApiError;
  }
  return json as ApiResponse<T>;
}

