import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/auth/AuthProvider";
import { AppLogoMark } from "@/components/AppLogoMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/config/app";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type LocationState = {
  from?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, login } = useAuth();

  const from = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.from && state.from.startsWith("/admin") ? state.from : "/admin/dashboard";
  }, [location.state]);

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle("登录");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-xl border bg-card px-6 py-4 text-sm text-muted-foreground">
          正在验证登录状态…
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/admin/dashboard" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const u = username.trim();
    const p = password;
    if (!u) {
      setError("请输入用户名");
      return;
    }
    if (!p) {
      setError("请输入密码");
      return;
    }

    try {
      setSubmitting(true);
      await login(u, p);
      toast.success("登录成功");
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        typeof (err as any)?.message === "string" ? (err as any).message : "登录失败，请重试";
      const traceId =
        typeof (err as any)?.traceId === "string" ? (err as any).traceId : undefined;
      const finalMsg = traceId ? `${msg}（traceId: ${traceId}）` : msg;
      setError(finalMsg);
      toast.error(finalMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[520px] items-center px-4 py-10">
        <div className="w-full rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center space-y-3 text-center">
            <AppLogoMark className="h-12 w-12" />
            <div className="space-y-1">
              <div className="text-lg font-semibold tracking-tight text-foreground">{APP_NAME}</div>
              <div className="text-xl font-semibold tracking-tight text-foreground">登录</div>
              <div className="text-sm text-muted-foreground">
                使用管理员账号进入系统（MVP：用户名密码登录，后续可接 SSO）。
              </div>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">用户名</div>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">密码</div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "登录中…" : "登录"}
            </Button>
          </form>

          <div className="mt-4 text-xs text-muted-foreground">
            默认种子账号：admin / admin123
          </div>
        </div>
      </div>
    </div>
  );
}

