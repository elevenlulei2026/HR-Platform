import { useEffect, useMemo, useState } from "react";

import type { HealthResponseData } from "@shared/api.interface";
import { getJson, type ApiError } from "@/api/http";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type ViewState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ready"; data: HealthResponseData };

export function AdminDevHealthPage() {
  const [state, setState] = useState<ViewState>({ type: "loading" });

  async function load() {
    setState({ type: "loading" });
    try {
      const res = await getJson<HealthResponseData>("/api/v1/health");
      setState({ type: "ready", data: res.data });
    } catch (e) {
      const err = (e ?? { message: "未知错误" }) as ApiError;
      setState({ type: "error", error: err });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const content = useMemo(() => {
    if (state.type === "loading") {
      return (
        <div className="rounded-xl border bg-card p-6">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      );
    }

    if (state.type === "error") {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-destructive">请求失败</div>
              <div className="mt-1 text-sm text-muted-foreground">{state.error.message}</div>
              {state.error.traceId ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  traceId：<span className="font-mono">{state.error.traceId}</span>
                </div>
              ) : null}
            </div>
            <Button onClick={load}>重试</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">后端健康检查</div>
          <Badge className="bg-emerald-600 hover:bg-emerald-600">OK</Badge>
        </div>
        <Separator className="my-4" />
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">status</dt>
            <dd className="mt-1 font-mono text-sm">{state.data.status}</dd>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">service</dt>
            <dd className="mt-1 font-mono text-sm">{state.data.service}</dd>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">version</dt>
            <dd className="mt-1 font-mono text-sm">{state.data.version}</dd>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">serverTime</dt>
            <dd className="mt-1 font-mono text-sm">{state.data.serverTime}</dd>
          </div>
        </dl>
      </div>
    );
  }, [state]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">健康检查</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            真实调用 <span className="font-mono text-foreground">/api/v1/health</span>，用于验收 Slice
            0 前后端联通与统一响应。
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          刷新
        </Button>
      </div>

      {content}
    </div>
  );
}

