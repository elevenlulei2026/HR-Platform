import type { ReactNode } from "react";

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * 实体详情抽屉顶部 Hero（查看态专用）。
 *
 * 适用：组织 / 员工 / 岗位等「打开某个业务实体看详情」。
 * 不适用：新建/编辑表单、配置工具、列选择等窄用途抽屉。
 */
export function SheetEntityHeader({
  icon,
  title,
  description,
  badges,
  summary,
  actions,
  className,
}: {
  /** 左侧视觉锚点：图标容器或头像 */
  icon?: ReactNode;
  title: ReactNode;
  /** 编码、路径、部门等副信息；可为纯文本或自定义节点 */
  description?: ReactNode;
  /** 状态 / 类型等 Badge 行 */
  badges?: ReactNode;
  /** 次要摘要条（负责人、关键指标等） */
  summary?: ReactNode;
  /** 右上角操作（编辑、切换视图等） */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <SheetHeader
      className={cn(
        "relative shrink-0 overflow-hidden border-b border-border/70 bg-background px-5 pb-4 pt-5 text-left",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/65 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-primary/[0.045]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.035] via-transparent to-transparent"
      />

      <div className="relative flex items-start gap-3.5">
        {icon ? <div className="shrink-0">{icon}</div> : null}
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1.5">
              <SheetTitle className="truncate text-xl font-semibold tracking-tight">{title}</SheetTitle>
              {description != null && description !== "" ? (
                <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-xs">
                  {description}
                </SheetDescription>
              ) : null}
            </div>
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{actions}</div>
            ) : null}
          </div>
          {badges ? <div className="flex flex-wrap items-center gap-1.5">{badges}</div> : null}
          {summary}
        </div>
      </div>
    </SheetHeader>
  );
}

/** 实体 Hero 左侧图标容器（与组织图详情一致） */
export function SheetEntityIcon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 实体 Hero 内次要摘要条（负责人、关键指标等） */
export function SheetEntitySummary({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
