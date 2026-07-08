import type { EmployeeAssignment } from "@shared/api.interface";
import { History } from "lucide-react";

import {
  ASSIGNMENT_ACCENT_STYLES,
  assignmentVersionTemporal,
  temporalBadgeVariant,
  type AssignmentIndicatorAccent,
} from "@/components/admin/employee-archive/assignment-indicator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AssignmentVersionTimelineProps = {
  indicatorShortLabel: string;
  accent: AssignmentIndicatorAccent;
  assignments: EmployeeAssignment[];
  activeId?: string;
  /** 嵌入职务详情容器时去掉外层边框 */
  embedded?: boolean;
  onSelect: (assignment: EmployeeAssignment) => void;
};

function positionSubtitle(assignment: EmployeeAssignment) {
  return assignment.organizationName && assignment.positionName
    ? `${assignment.organizationName} · ${assignment.positionName}`
    : assignment.organizationName ?? assignment.positionName ?? "";
}

/** 职务分区内生效版本时间轴（左侧职务标签 + 版本芯片） */
export function AssignmentVersionTimeline({
  indicatorShortLabel,
  accent,
  assignments,
  activeId,
  embedded = false,
  onSelect,
}: AssignmentVersionTimelineProps) {
  if (assignments.length === 0) return null;

  const styles = ASSIGNMENT_ACCENT_STYLES[accent];
  const sorted = [...assignments].sort((a, b) =>
    b.effectiveStartDate.localeCompare(a.effectiveStartDate),
  );

  return (
    <div
      className={cn(
        "flex gap-0 overflow-hidden",
        !embedded && "rounded-lg border border-border/55",
        !embedded && styles.shell,
      )}
    >
      <div className="flex w-[3.25rem] shrink-0 flex-col items-center justify-center gap-1 border-r border-border/40 px-1 py-2.5">
        <Badge
          className={cn(
            "h-auto whitespace-normal px-1 py-1 text-center text-[10px] font-semibold leading-tight ring-1",
            styles.badge,
          )}
        >
          {indicatorShortLabel}
        </Badge>
        <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
          {assignments.length}版
        </span>
      </div>

      <div className="min-w-0 flex-1 px-2.5 py-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <History className="size-3 shrink-0 opacity-70" />
            生效版本
          </div>
          <span className="text-[10px] text-muted-foreground/80">点击切换</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {sorted.map((assignment) => {
            const { temporal, temporalLabel } = assignmentVersionTemporal(assignment, assignments);
            const isActive = assignment.id === activeId;
            const subtitle = positionSubtitle(assignment);

            return (
              <button
                key={assignment.id}
                type="button"
                onClick={() => onSelect(assignment)}
                className={cn(
                  "flex min-w-[128px] shrink-0 flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left transition-all",
                  "border-border/45 bg-background/60 hover:border-border hover:bg-background",
                  isActive && cn("shadow-sm", styles.chipActive),
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                    {assignment.effectiveStartDate}
                  </span>
                  <Badge
                    variant={temporalBadgeVariant(temporal)}
                    className="h-3.5 px-1 text-[8px] font-normal leading-none"
                  >
                    {temporalLabel}
                  </Badge>
                </div>
                {subtitle ? (
                  <div className="truncate text-[10px] text-muted-foreground">{subtitle}</div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
