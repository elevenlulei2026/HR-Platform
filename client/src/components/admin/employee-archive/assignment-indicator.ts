import type { AssignmentIndicator, EmployeeAssignment } from "@shared/api.interface";

import { todayStr } from "@/components/admin/employee-archive/assignment-form";

export type AssignmentIndicatorAccent = "sky" | "amber";
export type AssignmentVersionTemporal = "past" | "present" | "future";

export function assignmentIndicatorOf(assignment: EmployeeAssignment): AssignmentIndicator {
  if (assignment.assignmentIndicator === "SECONDARY") return "SECONDARY";
  if (assignment.assignmentIndicator === "PRIMARY") return "PRIMARY";
  return assignment.isPrimary ? "PRIMARY" : "SECONDARY";
}

export function filterAssignmentsByIndicator(
  assignments: EmployeeAssignment[],
  indicator: AssignmentIndicator,
) {
  return assignments.filter((item) => assignmentIndicatorOf(item) === indicator);
}

/** 同职务类型下：生效日 ≤ 今天且最新的一条为当前版本 */
export function pickPresentAssignmentId(items: EmployeeAssignment[]): string | undefined {
  if (items.length === 0) return undefined;
  const today = todayStr();
  const present = [...items]
    .filter((item) => item.effectiveStartDate <= today)
    .sort((a, b) => b.effectiveStartDate.localeCompare(a.effectiveStartDate))[0];
  if (present) return present.id;
  const nearestFuture = [...items].sort((a, b) =>
    a.effectiveStartDate.localeCompare(b.effectiveStartDate),
  )[0];
  return nearestFuture?.id;
}

/** 仅依据生效日期与同职务版本链判断：过去 / 当前 / 将来 */
export function assignmentVersionTemporal(
  assignment: EmployeeAssignment,
  siblings: EmployeeAssignment[],
): { temporal: AssignmentVersionTemporal; temporalLabel: "过去" | "当前" | "将来" } {
  const today = todayStr();
  if (assignment.effectiveStartDate > today) {
    return { temporal: "future", temporalLabel: "将来" };
  }
  if (pickPresentAssignmentId(siblings) === assignment.id) {
    return { temporal: "present", temporalLabel: "当前" };
  }
  return { temporal: "past", temporalLabel: "过去" };
}

export function temporalBadgeVariant(temporal: AssignmentVersionTemporal) {
  if (temporal === "present") return "default" as const;
  if (temporal === "future") return "outline" as const;
  return "secondary" as const;
}

export const ASSIGNMENT_ACCENT_STYLES: Record<
  AssignmentIndicatorAccent,
  { shell: string; badge: string; chipActive: string; header: string }
> = {
  sky: {
    shell: "border-sky-500/20 bg-gradient-to-b from-sky-500/[0.05] to-card",
    badge: "bg-sky-500/12 text-sky-700 ring-sky-500/25 dark:text-sky-300",
    chipActive: "border-sky-500/45 bg-sky-500/8",
    header: "bg-sky-500/[0.04]",
  },
  amber: {
    shell: "border-amber-500/20 bg-gradient-to-b from-amber-500/[0.05] to-card",
    badge: "bg-amber-500/12 text-amber-800 ring-amber-500/25 dark:text-amber-300",
    chipActive: "border-amber-500/45 bg-amber-500/8",
    header: "bg-amber-500/[0.04]",
  },
};

export const ASSIGNMENT_INDICATOR_ZONES: Array<{
  indicator: AssignmentIndicator;
  shortLabel: string;
  accent: AssignmentIndicatorAccent;
}> = [
  { indicator: "PRIMARY", shortLabel: "主要", accent: "sky" },
  { indicator: "SECONDARY", shortLabel: "次要", accent: "amber" },
];
