import type { EmployeeAssignment, EmployeeMovement } from "@shared/api.interface";

export type MovementTimelineItem = {
  id: string;
  effectiveDate: string;
  movementType: string;
  movementTypeName: string;
  reasonDescription?: string;
  reasonSubDescription?: string;
  organizationName?: string;
  positionName?: string;
  jobGradeLabel?: string;
  workLocationLabel?: string;
  assignmentIndicatorLabel?: string;
};

function fromAssignments(assignments: EmployeeAssignment[]): MovementTimelineItem[] {
  return assignments
    .filter((a) => Boolean(a.movementType))
    .map((a) => ({
      id: `asg-${a.id}`,
      effectiveDate: a.effectiveStartDate,
      movementType: a.movementType!,
      movementTypeName: a.movementTypeName || a.movementType!,
      reasonDescription: a.reasonDescription,
      reasonSubDescription: a.reasonSubDescription,
      organizationName: a.organizationName,
      positionName: a.positionName,
      jobGradeLabel: a.jobGradeLabel,
      workLocationLabel: a.workLocationLabel,
      assignmentIndicatorLabel: a.assignmentIndicatorLabel,
    }));
}

function fromMovements(movements: EmployeeMovement[]): MovementTimelineItem[] {
  return movements.map((m) => ({
    id: `mov-${m.id}`,
    effectiveDate: m.effectiveDate,
    movementType: m.movementType,
    movementTypeName: m.movementTypeName,
    reasonDescription: m.reasonDescription,
    reasonSubDescription: m.reasonSubDescription,
  }));
}

export function buildMovementTimelineItems(
  movements: EmployeeMovement[],
  assignments?: EmployeeAssignment[],
): MovementTimelineItem[] {
  const fromAsg = assignments ? fromAssignments(assignments) : [];
  const items = fromAsg.length > 0 ? fromAsg : fromMovements(movements);
  return [...items].sort((a, b) => {
    const dateCmp = b.effectiveDate.localeCompare(a.effectiveDate);
    if (dateCmp !== 0) return dateCmp;
    return b.id.localeCompare(a.id);
  });
}

export function summarizeMovementLine(item: MovementTimelineItem): string {
  const typeName = item.movementTypeName || item.movementType;
  const context = [item.organizationName, item.positionName].filter(Boolean).join(" · ");
  return context ? `${item.effectiveDate} ${typeName} · ${context}` : `${item.effectiveDate} ${typeName}`;
}

export function summarizeRecentMovements(
  movements: EmployeeMovement[],
  assignments: EmployeeAssignment[] | undefined,
  limit = 3,
): MovementTimelineItem[] {
  return buildMovementTimelineItems(movements, assignments).slice(0, limit);
}
