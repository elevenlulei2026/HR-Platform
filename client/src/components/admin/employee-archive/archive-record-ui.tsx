import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Shield } from "lucide-react";

/** 分区工具栏「新增」按钮 */
export function ArchiveAddButton({
  label,
  onClick,
  icon: Icon = Plus,
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
  return <div className="space-y-2.5 p-3">{children}</div>;
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
        <div className="flex w-10 shrink-0 flex-col items-center pt-3.5 pl-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold tabular-nums text-primary ring-1 ring-primary/15">
            {index}
          </span>
        </div>
      ) : null}
      <div className="min-w-0 flex-1 py-3 pr-1">{children}</div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5 py-2.5 pr-2.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {actions}
        </div>
      ) : null}
    </article>
  );
}

/** 记录字段网格 */
export function ArchiveRecordFieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
  );
}

export function ArchiveRecordField({
  label,
  value,
  masked,
  mono,
  highlight,
}: {
  label: string;
  value?: string | null;
  masked?: boolean;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-2.5 py-2 transition-colors",
        highlight
          ? "bg-primary/5 ring-1 ring-primary/10"
          : "bg-muted/25 hover:bg-muted/40",
      )}
    >
      <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 text-sm leading-snug font-medium text-foreground",
          mono && "font-mono text-[13px]",
          !value && "text-muted-foreground/70",
        )}
      >
        {value || "—"}
        {masked ? <ArchiveMaskedBadge /> : null}
      </div>
    </div>
  );
}

export function ArchiveMaskedBadge() {
  return (
    <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px] font-normal">
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
  columns?: 1 | 2 | 3;
}) {
  const colClass =
    columns === 1 ? "grid-cols-1" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
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
