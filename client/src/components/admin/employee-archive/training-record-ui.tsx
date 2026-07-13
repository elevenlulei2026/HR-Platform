import { ChevronRight, Edit, GraduationCap, Trash2 } from "lucide-react";

import { ArchiveRecordActionButton } from "@/components/admin/employee-archive/archive-record-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TrainingRecordListItem = {
  id: string;
  courseName?: string;
  startDate?: string;
  endDate?: string;
  hours?: number | string;
  assessmentMethodLabel?: string;
  assessmentResult?: string;
  assessmentResultLabel?: string;
  trainingFormLabel?: string;
  trainingTypeLabel?: string;
  trainingLocation?: string;
  trainer?: string;
  trainingCost?: number | string;
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

function resultTone(result?: string) {
  if (result === "10") return "emerald" as const;
  if (result === "20") return "rose" as const;
  return "slate" as const;
}

const RESULT_BADGE: Record<"emerald" | "rose" | "slate", string> = {
  emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rose: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  slate: "border-border/60 bg-muted/50 text-muted-foreground",
};

/** 培训记录紧凑行：一行展示核心信息 */
export function TrainingRecordDenseRow({
  item,
  index,
  canEdit,
  onEdit,
  onDelete,
  className,
}: {
  item: TrainingRecordListItem;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const metaBits = [
    item.trainingFormLabel,
    item.trainingTypeLabel,
    item.assessmentMethodLabel ? `考核：${item.assessmentMethodLabel}` : null,
    item.trainer ? `讲师：${item.trainer}` : null,
    item.trainingLocation,
    item.trainingCost !== undefined && item.trainingCost !== null && String(item.trainingCost) !== ""
      ? `¥${item.trainingCost}`
      : null,
  ].filter(Boolean) as string[];

  const resultLabel = item.assessmentResultLabel || item.assessmentResult;
  const tone = resultTone(item.assessmentResult);

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
            {item.courseName?.trim() || "未命名课程"}
          </p>
          {resultLabel ? (
            <Badge
              variant="outline"
              className={cn("h-5 shrink-0 px-1.5 text-[10px] font-medium", RESULT_BADGE[tone])}
            >
              {resultLabel}
            </Badge>
          ) : null}
        </div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground/80">
            {formatDateRange(item.startDate, item.endDate)}
          </span>
          {item.hours !== undefined && item.hours !== null && String(item.hours) !== "" ? (
            <>
              <span className="text-border">·</span>
              <span className="tabular-nums">{item.hours}h</span>
            </>
          ) : null}
          {metaBits.map((bit) => (
            <span key={bit} className="inline-flex min-w-0 items-center gap-1.5">
              <span className="text-border">·</span>
              <span className="truncate">{bit}</span>
            </span>
          ))}
        </div>
      </div>

      {canEdit ? (
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <ArchiveRecordActionButton icon={Edit} label="编辑" onClick={onEdit} />
          <ArchiveRecordActionButton icon={Trash2} label="删除" destructive onClick={onDelete} />
        </div>
      ) : null}
    </article>
  );
}

export function TrainingRecordsViewMoreButton({
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
        <GraduationCap className="size-3.5 opacity-70" />
        查看更多
        <span className="tabular-nums text-foreground/70">（另有 {hiddenCount} 条）</span>
      </span>
      <ChevronRight className="size-3.5 opacity-60" />
    </Button>
  );
}
