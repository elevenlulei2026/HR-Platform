import type { UserProfile } from "@shared/api.interface";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { me as fetchMe, login as loginApi } from "@/api/auth";
import { getAuthToken, setAuthToken } from "@/api/http";
import { agentLog } from "@/debug/agentLog";

export type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(props: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      return;
    }

    try {
      // #region agent log
      agentLog({
        runId: "pre-fix",
        hypothesisId: "H6",
        location: "client/src/auth/AuthProvider.tsx",
        message: "refreshMe start",
        data: { hasToken: true },
      });
      // #endregion agent log
      const res = await fetchMe();
      setUser(res.data);
    } catch {
      // #region agent log
      agentLog({
        runId: "pre-fix",
        hypothesisId: "H6",
        location: "client/src/auth/AuthProvider.tsx",
        message: "refreshMe failed -> clear token",
        data: {},
      });
      // #endregion agent log
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshMe();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await loginApi({ username, password });
    setAuthToken(res.data.token);
    // 登录响应已含 roles/permissions；再拉一次 /me 确保与后端鉴权状态一致
    if (res.data.user.roles && res.data.user.permissions) {
      setUser(res.data.user);
    } else {
      await refreshMe();
    }
  }, [refreshMe]);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, refreshMe }),
    [user, loading, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return ctx;
}

