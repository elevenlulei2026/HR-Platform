import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-xl space-y-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">404：页面不存在</h1>
      <p className="text-sm text-muted-foreground">
        访问路径：<span className="font-mono text-foreground">{location.pathname}</span>
      </p>
      <div className="flex gap-3">
        <Button onClick={() => navigate("/admin/dev/health")}>回到健康检查</Button>
        <Button variant="outline" onClick={() => navigate(-1)}>
          返回上一页
        </Button>
      </div>
    </div>
  );
}

