import type { ReactNode } from "react";

import type { ApiError } from "@/api/http";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  RefreshCw,
  Search,
} from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="text-[13px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PanelCard({
  title,
  description,
  toolbar,
  children,
  className,
}: {
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-t-2 border-t-primary/70 bg-card shadow-sm",
        className,
      )}
    >
      {title || toolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
          <div className="min-w-0">
            {title ? <div className="text-sm font-medium text-foreground">{title}</div> : null}
            {description ? (
              <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
            ) : null}
          </div>
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <InputGroup className={cn("w-full sm:w-[220px]", className)}>
      <InputGroupAddon>
        <Search className="size-4 opacity-60" />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </InputGroup>
  );
}

export function PanelLoading({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center px-6 py-16 text-sm text-muted-foreground">
      <RefreshCw className="mr-2 size-4 animate-spin opacity-60" />
      {message}
    </div>
  );
}

export function PanelError({
  error,
  onRetry,
  extra,
}: {
  error: ApiError;
  onRetry: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <div className="text-sm font-medium text-destructive">加载失败</div>
      <div className="mt-1 text-sm text-destructive/90">
        {error.traceId ? `${error.message}（traceId: ${error.traceId}）` : error.message}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onRetry}>
          重试
        </Button>
        {extra}
      </div>
    </div>
  );
}

export function PanelEmpty({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
        {icon ?? <Inbox className="size-5 text-muted-foreground" />}
      </div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PaginationBar({
  page,
  pageSize,
  total,
  itemCount,
  onPrev,
  onNext,
}: {
  page: number;
  pageSize: number;
  total: number;
  itemCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3">
      <span className="text-xs text-muted-foreground">
        共 {total} 条 · 第 {page}/{totalPages} 页
      </span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>
          <ChevronLeft />
          上一页
        </Button>
        <Button variant="outline" size="sm" disabled={itemCount < pageSize} onClick={onNext}>
          下一页
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export function NoPermissionCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-10 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
    </div>
  );
}
