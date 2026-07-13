import { GitBranch } from "lucide-react";

import {
  summarizeMovementLine,
  summarizeRecentMovements,
  type MovementTimelineItem,
} from "@/components/admin/employee-archive/movement-timeline-data";
import type { EmployeeAssignment, EmployeeMovement } from "@shared/api.interface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MovementSummaryStripProps = {
  movements: EmployeeMovement[];
  assignments?: EmployeeAssignment[];
  onViewAll: () => void;
  className?: string;
};

function SummaryLine({ item, compact }: { item: MovementTimelineItem; compact?: boolean }) {
  const typeName = item.movementTypeName || item.movementType;
  const context = [item.organizationName, item.positionName].filter(Boolean).join(" · ");

  return (
    <span className={cn("min-w-0 truncate", compact && "max-w-[220px]")}>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{item.effectiveDate}</span>
      <span className="mx-1 text-muted-foreground/40">·</span>
      <span className="font-medium text-foreground">{typeName}</span>
      {context ? (
        <>
          <span className="mx-1 text-muted-foreground/40">·</span>
          <span className="text-muted-foreground">{context}</span>
        </>
      ) : null}
    </span>
  );
}

export function MovementSummaryStrip({
  movements,
  assignments,
  onViewAll,
  className,
}: MovementSummaryStripProps) {
  const recent = summarizeRecentMovements(movements, assignments, 3);

  if (recent.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-border/45 bg-muted/15 px-3 py-2",
        className,
      )}
    >
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <GitBranch className="size-3.5 text-primary/75" strokeWidth={2.25} />
        最近异动
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {recent.map((item, index) => (
          <SummaryLine key={item.id} item={item} compact={index > 0} />
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-xs text-primary"
        onClick={onViewAll}
        title={summarizeMovementLine(recent[0]!)}
      >
        查看全部
      </Button>
    </div>
  );
}
