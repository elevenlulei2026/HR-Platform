import { ChevronRight, Edit, HeartHandshake, Trash2 } from "lucide-react";

import { ArchiveRecordActionButton } from "@/components/admin/employee-archive/archive-record-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ValuesAssessmentListItem = {
  id: string;
  assessmentTime?: string;
  finalLevel?: string;
  superiorEvaluation?: string;
  peerEvaluation?: string;
  subordinateEvaluation?: string;
  redLight?: string;
  yellowLight?: string;
  greenLight?: string;
};

function lightTone(kind: "red" | "yellow" | "green") {
  if (kind === "red") {
    return "border-rose-500/35 bg-rose-500/12 text-rose-800 dark:text-rose-200";
  }
  if (kind === "yellow") {
    return "border-amber-500/35 bg-amber-500/12 text-amber-900 dark:text-amber-200";
  }
  return "border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200";
}

function LightChip({
  kind,
  label,
  value,
}: {
  kind: "red" | "yellow" | "green";
  label: string;
  value?: string;
}) {
  const text = (value || "").trim();
  if (!text) return null;
  return (
    <Badge variant="outline" className={cn("h-5 max-w-[9rem] truncate px-1.5 text-[10px] font-medium", lightTone(kind))}>
      {label} {text}
    </Badge>
  );
}

/** 价值观评估紧凑行：考核时间 + 最终等级 + 灯色摘要 */
export function ValuesAssessmentDenseRow({
  item,
  index,
  canEdit,
  onEdit,
  onDelete,
  className,
}: {
  item: ValuesAssessmentListItem;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const metaBits = [
    item.superiorEvaluation ? `上级：${item.superiorEvaluation}` : null,
    item.peerEvaluation ? `同事：${item.peerEvaluation}` : null,
    item.subordinateEvaluation ? `下级：${item.subordinateEvaluation}` : null,
  ].filter(Boolean) as string[];

  return (
    <article
      className={cn(
        "group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 rounded-lg border border-border/45 bg-card/80 px-2.5 py-1.5",
        "transition-colors hover:border-border hover:bg-muted/20",
        className,
      )}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300">
        <HeartHandshake className="h-3.5 w-3.5" aria-hidden />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            {item.assessmentTime?.trim() || `记录 #${index}`}
          </span>
          {item.finalLevel?.trim() ? (
            <Badge
              variant="outline"
              className="h-5 border-sky-500/35 bg-sky-500/10 px-1.5 text-[10px] font-semibold text-sky-800 dark:text-sky-200"
            >
              {item.finalLevel.trim()}
            </Badge>
          ) : null}
          <LightChip kind="red" label="红" value={item.redLight} />
          <LightChip kind="yellow" label="黄" value={item.yellowLight} />
          <LightChip kind="green" label="绿" value={item.greenLight} />
        </div>
        {metaBits.length > 0 ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{metaBits.join(" · ")}</p>
        ) : null}
      </div>

      {canEdit ? (
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <ArchiveRecordActionButton icon={Edit} label="编辑" onClick={onEdit} />
          <ArchiveRecordActionButton icon={Trash2} label="删除" destructive onClick={onDelete} />
        </div>
      ) : null}
    </article>
  );
}

export function ValuesAssessmentsViewMoreButton({
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
      className="h-8 w-full justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      查看全部（另有 {hiddenCount} 条）
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
    </Button>
  );
}

export function resolveValuesAssessmentListItem(
  item: { id: string } & Record<string, string | number | boolean | null | undefined>,
): ValuesAssessmentListItem {
  return {
    id: item.id,
    assessmentTime: item.assessmentTime != null ? String(item.assessmentTime) : undefined,
    finalLevel: item.finalLevel != null ? String(item.finalLevel) : undefined,
    superiorEvaluation:
      item.superiorEvaluation != null ? String(item.superiorEvaluation) : undefined,
    peerEvaluation: item.peerEvaluation != null ? String(item.peerEvaluation) : undefined,
    subordinateEvaluation:
      item.subordinateEvaluation != null ? String(item.subordinateEvaluation) : undefined,
    redLight: item.redLight != null ? String(item.redLight) : undefined,
    yellowLight: item.yellowLight != null ? String(item.yellowLight) : undefined,
    greenLight: item.greenLight != null ? String(item.greenLight) : undefined,
  };
}

export function sortValuesAssessmentItems<T extends { assessmentTime?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = (a.assessmentTime || "").toString();
    const right = (b.assessmentTime || "").toString();
    return right.localeCompare(left, "zh-CN");
  });
}
