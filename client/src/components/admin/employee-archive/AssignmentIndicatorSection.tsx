import type {
  AssignmentIndicator,
  EmployeeAssignment,
  EmployeeAssignmentEditMode,
  OrganizationTreeNode,
} from "@shared/api.interface";
import { CalendarClock, Edit } from "lucide-react";

import { AssignmentRecordDisplay } from "@/components/admin/employee-archive/AssignmentRecordDisplay";
import { AssignmentVersionTimeline } from "@/components/admin/employee-archive/AssignmentVersionTimeline";
import {
  ASSIGNMENT_ACCENT_STYLES,
  assignmentVersionTemporal,
  type AssignmentIndicatorAccent,
} from "@/components/admin/employee-archive/assignment-indicator";
import { ArchiveRecordActionButton } from "@/components/admin/employee-archive/archive-record-ui";
import { cn } from "@/lib/utils";

type AssignmentIndicatorSectionProps = {
  indicator: AssignmentIndicator;
  indicatorShortLabel: string;
  accent: AssignmentIndicatorAccent;
  assignments: EmployeeAssignment[];
  /** 用于渲染“组织路径”的完整组织列表（包含根节点） */
  orgsForPath: OrganizationTreeNode[];
  focusedId?: string;
  onFocus: (assignmentId: string) => void;
  onEdit: (assignment: EmployeeAssignment, mode: EmployeeAssignmentEditMode) => void;
  canEdit: boolean;
};

function dateSlice(value?: string | null) {
  if (!value) return null;
  return value.length >= 10 ? value.slice(0, 10) : value;
}

/** 单种职务：版本时间轴 + 详情一体容器 */
export function AssignmentIndicatorSection({
  indicator,
  indicatorShortLabel,
  accent,
  assignments,
  orgsForPath,
  focusedId,
  onFocus,
  onEdit,
  canEdit,
}: AssignmentIndicatorSectionProps) {
  const active = assignments.find((item) => item.id === focusedId) ?? assignments[0];
  const styles = ASSIGNMENT_ACCENT_STYLES[accent];

  if (assignments.length === 0 || !active) return null;

  const { temporalLabel } = assignmentVersionTemporal(active, assignments);
  const created = dateSlice(active.createdAt);
  const metaParts = [
    `生效 ${active.effectiveStartDate}`,
    temporalLabel,
    created ? `创建 ${created}` : null,
  ].filter(Boolean);

  return (
    <div
      className={cn("overflow-hidden rounded-lg border shadow-sm", styles.shell)}
      data-assignment-indicator={indicator}
    >
      <AssignmentVersionTimeline
        embedded
        indicatorShortLabel={indicatorShortLabel}
        accent={accent}
        assignments={assignments}
        activeId={focusedId ?? active.id}
        onSelect={(assignment) => onFocus(assignment.id)}
      />

      <div
        id={`assignment-record-${active.id}`}
        className="scroll-mt-4 border-t border-border/45"
      >
        <div
          className={cn(
            "flex items-start justify-between gap-3 px-3 py-2.5",
            styles.header,
          )}
        >
          <div className="min-w-0 flex-1">
            <h5 className="truncate text-sm font-semibold tracking-tight text-foreground">
              {active.organizationName ?? "—"} · {active.positionName ?? "—"}
            </h5>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {metaParts.join(" · ")}
            </p>
          </div>
          {canEdit ? (
            <div className="flex shrink-0 items-center gap-0.5">
              <ArchiveRecordActionButton
                icon={Edit}
                label="编辑任职"
                onClick={() => onEdit(active, "CURRENT")}
              />
              <ArchiveRecordActionButton
                icon={CalendarClock}
                label="新增生效版本"
                onClick={() => onEdit(active, "NEW_VERSION")}
              />
            </div>
          ) : null}
        </div>

        <div className="border-t border-border/30 bg-card/50 px-3 py-3">
          <AssignmentRecordDisplay assignment={active} orgsForPath={orgsForPath} />
        </div>
      </div>
    </div>
  );
}
