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
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center truncate rounded-md bg-background/70 px-1.5 py-0.5 ring-1 ring-border/40",
        compact && "max-w-[220px]",
      )}
    >
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{item.effectiveDate}</span>
      <span className="mx-1 text-muted-foreground/35" aria-hidden>
        ·
      </span>
      <span className="font-medium text-foreground">{typeName}</span>
      {context ? (
        <>
          <span className="mx-1 text-muted-foreground/35" aria-hidden>
            ·
          </span>
          <span className="truncate text-muted-foreground">{context}</span>
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
        "flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-[10px] border border-border/50 bg-muted/20 px-3 py-2",
        "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.02)]",
        className,
      )}
    >
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary">
          <GitBranch className="size-3" strokeWidth={2.25} aria-hidden />
        </span>
        最近异动
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm">
        {recent.map((item, index) => (
          <SummaryLine key={item.id} item={item} compact={index > 0} />
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 cursor-pointer px-2 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
        onClick={onViewAll}
        title={summarizeMovementLine(recent[0]!)}
      >
        查看全部
      </Button>
    </div>
  );
}
