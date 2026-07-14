import type { EmployeeAttendanceCard } from "@shared/api.interface";

export type AttendanceCardVersionTemporal = "past" | "present" | "future";

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function temporalHint(asOfDate: string) {
  const today = todayStr();
  if (asOfDate < today) return { label: "历史快照", variant: "secondary" as const };
  if (asOfDate > today) return { label: "未来预览", variant: "outline" as const };
  return { label: "当前生效", variant: "default" as const };
}

/** 同员工下：生效日 ≤ 今天且最新的一条为当前版本 */
export function pickPresentCardId(items: EmployeeAttendanceCard[]): string | undefined {
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

/** 按 asOfDate 快照取该员工有效版本 */
export function pickCardAtAsOfDate(items: EmployeeAttendanceCard[], asOfDate: string) {
  const matches = items.filter(
    (item) =>
      item.effectiveStartDate <= asOfDate &&
      (!item.effectiveEndDate || item.effectiveEndDate >= asOfDate),
  );
  if (matches.length === 0) return undefined;
  return [...matches].sort((a, b) => b.effectiveStartDate.localeCompare(a.effectiveStartDate))[0];
}

export function cardVersionTemporal(
  card: EmployeeAttendanceCard,
  siblings: EmployeeAttendanceCard[],
): { temporal: AttendanceCardVersionTemporal; temporalLabel: "过去" | "当前" | "将来" } {
  const today = todayStr();
  if (card.effectiveStartDate > today) {
    return { temporal: "future", temporalLabel: "将来" };
  }
  if (pickPresentCardId(siblings) === card.id) {
    return { temporal: "present", temporalLabel: "当前" };
  }
  return { temporal: "past", temporalLabel: "过去" };
}

export function temporalBadgeVariant(temporal: AttendanceCardVersionTemporal) {
  if (temporal === "present") return "default" as const;
  if (temporal === "future") return "outline" as const;
  return "secondary" as const;
}

export const ATTENDANCE_CARD_ACCENT_STYLES = {
  shell: "border-border/80 bg-card",
  badge: "bg-primary/10 text-primary",
  chipActive:
    "border-primary/50 bg-primary/[0.08] text-foreground shadow-sm ring-1 ring-primary/20",
  header: "bg-primary/[0.03]",
};
