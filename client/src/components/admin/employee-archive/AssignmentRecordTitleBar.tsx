import type { EmployeeAssignment } from "@shared/api.interface";
import { Briefcase } from "lucide-react";

import type { AssignmentIndicatorAccent } from "@/components/admin/employee-archive/assignment-indicator";
import {
  assignmentVersionTemporal,
  temporalBadgeVariant,
} from "@/components/admin/employee-archive/assignment-indicator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AssignmentRecordTitleBarProps = {
  assignment: EmployeeAssignment;
  versionSiblings: EmployeeAssignment[];
  accent?: AssignmentIndicatorAccent;
  hideIndicator?: boolean;
};

const ICON_ACCENT: Record<AssignmentIndicatorAccent, string> = {
  sky: "bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400",
  amber: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-400",
};

function dateSlice(value?: string | null) {
  if (!value) return null;
  return value.length >= 10 ? value.slice(0, 10) : value;
}

/** 任职记录标题行：岗位名称 + 生效日期 + 版本态 + 创建日 */
export function AssignmentRecordTitleBar({
  assignment,
  versionSiblings,
  accent = "sky",
  hideIndicator,
}: AssignmentRecordTitleBarProps) {
  const created = dateSlice(assignment.createdAt);
  const { temporal, temporalLabel } = assignmentVersionTemporal(assignment, versionSiblings);
  const indicatorLabel =
    assignment.assignmentIndicatorLabel ??
    (assignment.isPrimary || assignment.assignmentIndicator === "PRIMARY" ? "主要职务" : "次要职务");

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md ring-1",
            ICON_ACCENT[accent],
          )}
        >
          <Briefcase className="size-3" />
        </div>
        <span className="truncate text-sm font-semibold tracking-tight">
          {assignment.organizationName ?? "—"} · {assignment.positionName ?? "—"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {!hideIndicator ? (
          <Badge variant="secondary" className="h-5 text-[10px] font-medium">
            {indicatorLabel}
          </Badge>
        ) : null}

        <Badge
          variant="outline"
          className="h-5 px-1.5 font-mono text-[10px] tabular-nums tracking-tight"
        >
          生效 {assignment.effectiveStartDate}
        </Badge>

        <Badge
          variant={temporalBadgeVariant(temporal)}
          className="h-5 text-[10px] font-medium"
        >
          {temporalLabel}
        </Badge>

        {created ? (
          <Badge
            variant="outline"
            className="h-5 border-dashed px-1.5 text-[10px] font-normal text-muted-foreground"
          >
            创建 {created}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
