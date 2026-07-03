import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/auth/AuthProvider";

export function RequireAuth(props: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="rounded-xl border bg-card px-6 py-4 text-sm text-muted-foreground">
          正在验证登录状态…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return props.children;
}
