import type { ReactNode } from "react";
import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GitBranchPlus, PencilLine, Plus, Shield, Trash2 } from "lucide-react";

/** 档案操作按钮统一图标 */
export const ARCHIVE_ACTION_ICONS = {
  add: Plus,
  edit: PencilLine,
  editCurrentVersion: PencilLine,
  newEffectiveVersion: GitBranchPlus,
  delete: Trash2,
} as const;

/** 分区工具栏「新增」按钮 */
export function ArchiveAddButton({
  label,
  onClick,
  icon: Icon = ARCHIVE_ACTION_ICONS.add,
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <Button size="sm" className="shadow-sm" disabled={disabled} onClick={onClick}>
      <Icon className="size-3.5" />
      {label}
    </Button>
  );
}

/** 档案记录列表容器 */
export function ArchiveRecordList({ children }: { children: ReactNode }) {
  return <div className="space-y-2 p-2.5">{children}</div>;
}

type ArchiveRecordCardProps = {
  index?: number;
  children: ReactNode;
  actions?: ReactNode;
  accent?: "primary" | "sky" | "amber" | "emerald";
  className?: string;
};

const ACCENT_BORDER: Record<NonNullable<ArchiveRecordCardProps["accent"]>, string> = {
  primary: "border-l-primary/70",
  sky: "border-l-sky-500/60",
  amber: "border-l-amber-500/60",
  emerald: "border-l-emerald-500/60",
};

/** 单条档案记录卡片 */
export function ArchiveRecordCard({
  index,
  children,
  actions,
  accent = "primary",
  className,
}: ArchiveRecordCardProps) {
  return (
    <article
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/15",
        "border-l-[3px] shadow-sm transition-all duration-200",
        "hover:border-border hover:shadow-md",
        ACCENT_BORDER[accent],
        className,
      )}
    >
      {index !== undefined ? (
        <div className="flex w-8 shrink-0 flex-col items-center pt-2.5 pl-2.5">
          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary ring-1 ring-primary/15">
            {index}
          </span>
        </div>
      ) : null}
      <div className={cn("min-w-0 flex-1 py-2.5", index !== undefined ? "pr-1" : "px-3")}>
        {children}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5 py-2 pr-2 opacity-90 transition-opacity group-focus-within:opacity-100 sm:opacity-75">
          {actions}
        </div>
      ) : null}
    </article>
  );
}

/** 记录字段网格（详情抽屉内一行四列；fluid 按容器宽度自适应，避免超宽左偏） */
export function ArchiveRecordFieldGrid({
  children,
  columns = 4,
  layout = "fixed",
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6 | 7;
  /** fluid：auto-fit 填满行宽；字段少时也会均分，不挤在左侧 */
  layout?: "fixed" | "fluid";
  className?: string;
}) {
  if (layout === "fluid") {
    return (
      <div
        className={cn(
          "grid gap-x-3 gap-y-2.5",
          "grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))]",
          className,
        )}
      >
        {children}
      </div>
    );
  }
  const colClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-3"
        : columns === 7
          ? "grid-cols-7"
        : columns === 5
          ? "grid-cols-5"
          : columns === 6
            ? "grid-cols-6"
            : "grid-cols-4";
  return <div className={cn("grid gap-x-4 gap-y-3", colClass, className)}>{children}</div>;
}

export function ArchiveRecordField({
  label,
  value,
  masked,
  mono,
  highlight,
  wide,
  icon: Icon,
  compact = false,
}: {
  label: string;
  value?: ReactNode;
  masked?: boolean;
  mono?: boolean;
  highlight?: boolean;
  /** 跨两列展示（地址、长文本） */
  wide?: boolean;
  icon?: LucideIcon;
  compact?: boolean;
}) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div
      className={cn(
        "min-w-0",
        wide && "col-span-2",
        highlight && "rounded-md bg-primary/[0.04] px-2 py-1.5 ring-1 ring-primary/10",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 text-xs font-medium text-muted-foreground",
          compact && "text-[11px]",
        )}
      >
        {Icon ? <Icon className="size-3 shrink-0 opacity-50" /> : null}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "mt-0.5 text-sm leading-snug font-medium text-foreground",
          mono && "font-mono text-[13px]",
          isEmpty && "text-muted-foreground/70",
        )}
      >
        {isEmpty ? "—" : React.isValidElement(value) ? value : (value as ReactNode)}
        {masked ? <ArchiveMaskedBadge /> : null}
      </div>
    </div>
  );
}

export function ArchiveMaskedBadge() {
  return (
    <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-[11px] font-normal">
      <Shield className="mr-0.5 size-2.5" />
      脱敏
    </Badge>
  );
}

/** 记录行操作按钮 */
export function ArchiveRecordActionButton({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(
        "size-8 text-muted-foreground hover:bg-muted",
        destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive",
      )}
      onClick={onClick}
      title={label}
    >
      <Icon className="size-3.5" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

/** 编辑单条档案记录 */
export function ArchiveEditRecordButton({ onClick }: { onClick: () => void }) {
  return (
    <ArchiveRecordActionButton
      icon={ARCHIVE_ACTION_ICONS.edit}
      label="编辑"
      onClick={onClick}
    />
  );
}

/** 修改当前生效版本 */
export function ArchiveEditCurrentVersionButton({ onClick }: { onClick: () => void }) {
  return (
    <ArchiveRecordActionButton
      icon={ARCHIVE_ACTION_ICONS.editCurrentVersion}
      label="修改当前版本"
      onClick={onClick}
    />
  );
}

/** 基于当前记录新增后续生效版本 */
export function ArchiveNewEffectiveVersionButton({ onClick }: { onClick: () => void }) {
  return (
    <ArchiveRecordActionButton
      icon={ARCHIVE_ACTION_ICONS.newEffectiveVersion}
      label="新增生效版本"
      onClick={onClick}
    />
  );
}

/** 删除档案记录 */
export function ArchiveDeleteRecordButton({ onClick }: { onClick: () => void }) {
  return (
    <ArchiveRecordActionButton
      icon={ARCHIVE_ACTION_ICONS.delete}
      label="删除"
      destructive
      onClick={onClick}
    />
  );
}

/** 弹窗内表单分区标题 */
export function ArchiveFormSection({
  title,
  description,
  children,
  columns = 2,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
}) {
  const colClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "md:grid-cols-3"
        : columns === 4
          ? "md:grid-cols-4"
          : "md:grid-cols-2";
  return (
    <section className="overflow-hidden rounded-xl border border-border/50 bg-card/60 shadow-sm">
      <div className="border-b border-border/40 bg-muted/20 px-4 py-3">
        <h4 className="text-sm font-semibold tracking-tight text-foreground">{title}</h4>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className={cn("grid gap-4 p-4", colClass)}>{children}</div>
    </section>
  );
}
