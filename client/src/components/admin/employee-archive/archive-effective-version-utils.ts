/** 档案生效版本通用工具（行政信息 / 住宿信息等） */

export type EffectiveDatedRecord = {
  id: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
};

export type VersionTemporal = "past" | "present" | "future";

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function temporalHint(asOfDate: string) {
  const today = todayStr();
  if (asOfDate < today) return { label: "历史快照", variant: "secondary" as const };
  if (asOfDate > today) return { label: "未来预览", variant: "outline" as const };
  return { label: "当前生效", variant: "default" as const };
}

export function pickPresentVersionId(items: EffectiveDatedRecord[]): string | undefined {
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

export function pickVersionAtAsOfDate(items: EffectiveDatedRecord[], asOfDate: string) {
  const matches = items.filter(
    (item) =>
      item.effectiveStartDate <= asOfDate &&
      (!item.effectiveEndDate || item.effectiveEndDate >= asOfDate),
  );
  if (matches.length === 0) return undefined;
  return [...matches].sort((a, b) => b.effectiveStartDate.localeCompare(a.effectiveStartDate))[0];
}

export function versionTemporal(
  item: EffectiveDatedRecord,
  siblings: EffectiveDatedRecord[],
): { temporal: VersionTemporal; temporalLabel: "过去" | "当前" | "将来" } {
  const today = todayStr();
  if (item.effectiveStartDate > today) {
    return { temporal: "future", temporalLabel: "将来" };
  }
  if (pickPresentVersionId(siblings) === item.id) {
    return { temporal: "present", temporalLabel: "当前" };
  }
  return { temporal: "past", temporalLabel: "过去" };
}

export function temporalBadgeVariant(temporal: VersionTemporal) {
  if (temporal === "present") return "default" as const;
  if (temporal === "future") return "outline" as const;
  return "secondary" as const;
}

export const ARCHIVE_VERSION_ACCENT_STYLES = {
  shell: "border-sky-500/20 bg-gradient-to-b from-sky-500/[0.05] to-card",
  chipActive: "border-sky-500/45 bg-sky-500/8",
};
