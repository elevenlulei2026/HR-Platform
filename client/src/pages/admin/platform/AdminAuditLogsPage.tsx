import type { AuditLog, AuditLogQuery } from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { listAuditLogs } from "@/api/audit-logs";
import type { ApiError } from "@/api/http";
import {
  PageHeader,
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  PaginationBar,
  SearchInput,
} from "@/components/admin/page-shell";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Inbox, RefreshCw } from "lucide-react";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: AuditLog[]; total: number };

export function AdminAuditLogsPage() {
  const navigate = useNavigate();
  const [operatorUsername, setOperatorUsername] = useState("");
  const debouncedOperatorUsername = useDebouncedValue(operatorUsername);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });

  const query = useMemo<AuditLogQuery>(
    () => ({
      page,
      pageSize,
      operatorUsername: debouncedOperatorUsername.trim() || undefined,
    }),
    [page, pageSize, debouncedOperatorUsername],
  );

  const load = useCallback(async () => {
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listAuditLogs(query);
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      const err: ApiError =
        typeof (e as ApiError)?.message === "string"
          ? { message: (e as ApiError).message, traceId: (e as ApiError).traceId }
          : { message: "加载失败，请重试" };
      setState({ type: "error", error: err });
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = state.type === "ok" ? state.items : [];
  const total = state.type === "ok" ? state.total : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="审计日志"
        description="记录系统关键操作（写操作为主，敏感读后续补齐）。"
      />

      <PanelCard
        title="操作记录"
        toolbar={
          <>
            <SearchInput
              value={operatorUsername}
              onChange={(v) => {
                setPage(1);
                setOperatorUsername(v);
              }}
              placeholder="按操作人用户名过滤"
            />
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" />
              刷新
            </Button>
          </>
        }
      >
        {state.type === "loading" ? <PanelLoading message="正在加载审计日志…" /> : null}

        {state.type === "error" ? (
          <PanelError
            error={state.error}
            onRetry={() => void load()}
            extra={
              state.error.message.includes("未登录") || state.error.message.includes("过期") ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/login", { replace: true })}
                >
                  去登录
                </Button>
              ) : null
            }
          />
        ) : null}

        {state.type === "ok" && items.length === 0 ? (
          <PanelEmpty
            title="暂无审计日志"
            description="可以先触发一次写操作（例如登录），再回来查看。"
            icon={<Inbox className="size-5 text-muted-foreground" />}
            action={
              <Button variant="outline" size="sm" onClick={() => void load()}>
                重新加载
              </Button>
            }
          />
        ) : null}

        {state.type === "ok" && items.length > 0 ? (
          <>
            <div className="divide-y">
              {items.map((it) => (
                <div key={it.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">
                      {it.action} · {it.resourceType}
                      {it.resourceId ? `#${it.resourceId}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {it.createdAt} · {it.operatorUsername || "-"} · {it.ipAddress || "-"}
                    </div>
                  </div>
                  <div className="mt-1 break-words text-xs text-muted-foreground">
                    traceId：{it.traceId || "-"} · path：
                    {typeof (it.detailJson as Record<string, unknown>)?.path === "string"
                      ? (it.detailJson as Record<string, string>).path
                      : "-"}
                  </div>
                </div>
              ))}
            </div>
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={total}
              itemCount={items.length}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        ) : null}
      </PanelCard>
    </div>
  );
}
