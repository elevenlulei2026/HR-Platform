import type { ApiError } from "@/api/http";
import type { DataScope } from "@shared/api.interface";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type LoadState<T> =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; data: T };

export function toApiError(e: unknown): ApiError {
  if (typeof (e as ApiError)?.message === "string") {
    return { message: (e as ApiError).message, traceId: (e as ApiError).traceId };
  }
  return { message: "请求失败，请重试" };
}

export const DATA_SCOPE_LABEL: Record<DataScope, string> = {
  SELF: "仅本人",
  DEPARTMENT: "本部门及下级",
  CUSTOM: "自定义组织",
  ALL: "全部数据",
};

export const DATA_SCOPE_OPTIONS: Array<{ id: DataScope; label: string; hint?: string }> = [
  { id: "SELF", label: "仅本人", hint: "只能查看与操作自己的数据" },
  { id: "DEPARTMENT", label: "本部门及下级", hint: "按任职部门及其子组织过滤" },
  { id: "CUSTOM", label: "自定义组织", hint: "在组织树中勾选可访问范围" },
  { id: "ALL", label: "全部数据", hint: "不受组织范围限制" },
];

export function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className={cn(
        active &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      )}
    >
      {active ? "启用" : status === "DISABLED" ? "停用" : status}
    </Badge>
  );
}

export function DataScopeBadge({ dataScope }: { dataScope: DataScope }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 text-xs font-medium",
        dataScope === "ALL" &&
          "border-sky-500/30 bg-sky-500/12 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/18 dark:text-sky-200",
        dataScope === "CUSTOM" &&
          "border-violet-500/30 bg-violet-500/12 text-violet-900 dark:border-violet-400/35 dark:bg-violet-500/18 dark:text-violet-100",
        dataScope === "DEPARTMENT" &&
          "border-amber-500/30 bg-amber-500/12 text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/18 dark:text-amber-100",
        dataScope === "SELF" && "border-border bg-muted/60 text-muted-foreground",
      )}
    >
      {DATA_SCOPE_LABEL[dataScope] ?? dataScope}
    </Badge>
  );
}
