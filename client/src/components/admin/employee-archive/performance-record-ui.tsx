import { ChevronRight, Target } from "lucide-react";

import { ArchiveDeleteRecordButton, ArchiveEditRecordButton } from "@/components/admin/employee-archive/archive-record-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PerformanceRecordListItem = {
  id: string;
  year?: string;
  assessmentTypeLabel?: string;
  performanceStartDate?: string;
  performanceEndDate?: string;
  valuesLevel?: string;
  valuesLevelLabel?: string;
  performanceLevel?: string;
  performanceLevelLabel?: string;
  performanceScore?: string;
  valuesScore?: string;
  remark?: string;
};

function formatDateRange(start?: string, end?: string) {
  if (!start && !end) return "—";
  if (start && end) {
    if (start.slice(0, 4) === end.slice(0, 4)) {
      return `${start} → ${end.slice(5)}`;
    }
    return `${start} → ${end}`;
  }
  return start || end || "—";
}

type GradeTone = "a" | "bPlus" | "b" | "bMinus" | "c" | "d" | "na";

function gradeTone(level?: string): GradeTone {
  switch (level) {
    case "A":
      return "a";
    case "B+":
      return "bPlus";
    case "B":
      return "b";
    case "B-":
      return "bMinus";
    case "C":
      return "c";
    case "D":
      return "d";
    default:
      return "na";
  }
}

/** 绩效等级主标签：按档位着色，作为行内视觉焦点 */
const GRADE_BADGE: Record<GradeTone, string> = {
  a: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] dark:text-emerald-200",
  bPlus:
    "border-sky-500/40 bg-sky-500/15 text-sky-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] dark:text-sky-200",
  b: "border-teal-500/35 bg-teal-500/12 text-teal-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] dark:text-teal-200",
  bMinus:
    "border-amber-500/40 bg-amber-500/15 text-amber-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] dark:text-amber-200",
  c: "border-orange-500/40 bg-orange-500/15 text-orange-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] dark:text-orange-200",
  d: "border-rose-500/40 bg-rose-500/15 text-rose-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)] dark:text-rose-200",
  na: "border-border/70 bg-muted/60 text-muted-foreground",
};

const VALUES_BADGE: Record<GradeTone, string> = {
  a: "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
  bPlus: "border-sky-500/25 bg-sky-500/8 text-sky-700 dark:text-sky-300",
  b: "border-teal-500/25 bg-teal-500/8 text-teal-700 dark:text-teal-300",
  bMinus: "border-amber-500/25 bg-amber-500/8 text-amber-800 dark:text-amber-300",
  c: "border-orange-500/25 bg-orange-500/8 text-orange-800 dark:text-orange-300",
  d: "border-rose-500/25 bg-rose-500/8 text-rose-700 dark:text-rose-300",
  na: "border-border/60 bg-muted/50 text-muted-foreground",
};

export function PerformanceGradeBadge({
  level,
  label,
  size = "md",
  className,
}: {
  level?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text = (label || level || "").trim();
  if (!text) return null;
  const tone = gradeTone(level || label);
  const sizeClass =
    size === "lg"
      ? "h-9 min-w-11 px-2.5 text-base font-bold tracking-wide"
      : size === "sm"
        ? "h-5 px-1.5 text-[10px] font-semibold"
        : "h-7 min-w-9 px-2 text-sm font-bold tracking-wide";

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md tabular-nums",
        sizeClass,
        GRADE_BADGE[tone],
        className,
      )}
      title="绩效等级"
    >
      {text}
    </Badge>
  );
}

/** 绩效记录紧凑行：绩效等级为视觉焦点 */
export function PerformanceRecordDenseRow({
  item,
  index,
  canEdit,
  onEdit,
  onDelete,
  className,
}: {
  item: PerformanceRecordListItem;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const gradeLabel = item.performanceLevelLabel || item.performanceLevel;
  const valuesLabel = item.valuesLevelLabel || item.valuesLevel;
  const valuesTone = gradeTone(item.valuesLevel || valuesLabel);

  const metaBits = [
    item.performanceScore ? `绩效得分 ${item.performanceScore}` : null,
    item.valuesScore ? `价值观得分 ${item.valuesScore}` : null,
    item.remark?.trim() ? item.remark.trim() : null,
  ].filter(Boolean) as string[];

  return (
    <article
      className={cn(
        "group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 rounded-lg border border-border/45 bg-card/80 px-2.5 py-1.5",
        "transition-colors hover:border-border hover:bg-muted/20",
        className,
      )}
    >
      <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-semibold tabular-nums text-primary ring-1 ring-primary/15">
        {index}
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="truncate text-[13px] font-semibold tracking-tight text-foreground">
            {item.year?.trim() || "未填年度"}
          </p>
          {item.assessmentTypeLabel ? (
            <Badge
              variant="outline"
              className="h-5 shrink-0 border-border/60 bg-muted/40 px-1.5 text-[10px] font-medium text-muted-foreground"
            >
              {item.assessmentTypeLabel}
            </Badge>
          ) : null}
          {valuesLabel ? (
            <Badge
              variant="outline"
              className={cn("h-5 shrink-0 px-1.5 text-[10px] font-medium", VALUES_BADGE[valuesTone])}
            >
              价值观 {valuesLabel}
            </Badge>
          ) : null}
        </div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground/80">
            {formatDateRange(item.performanceStartDate, item.performanceEndDate)}
          </span>
          {metaBits.map((bit) => (
            <span key={bit} className="inline-flex min-w-0 items-center gap-1.5">
              <span className="text-border">·</span>
              <span className="truncate">{bit}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <PerformanceGradeBadge level={item.performanceLevel} label={gradeLabel} size="lg" />
        {canEdit ? (
          <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <ArchiveEditRecordButton onClick={onEdit} />
            <ArchiveDeleteRecordButton onClick={onDelete} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function PerformanceRecordsViewMoreButton({
  hiddenCount,
  onClick,
}: {
  hiddenCount: number;
  onClick: () => void;
}) {
  if (hiddenCount <= 0) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-full justify-between rounded-lg border border-dashed border-border/60 bg-muted/15 px-3 text-xs text-muted-foreground hover:bg-muted/35 hover:text-foreground"
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1.5">
        <Target className="size-3.5 opacity-70" />
        查看更多
        <span className="tabular-nums text-foreground/70">（另有 {hiddenCount} 条）</span>
      </span>
      <ChevronRight className="size-3.5 opacity-60" />
    </Button>
  );
}
