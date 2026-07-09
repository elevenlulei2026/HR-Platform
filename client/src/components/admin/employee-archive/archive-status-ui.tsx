import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** 劳动合同 / 协议：有效 / 无效 */
export const ARCHIVE_VALIDITY_STATUS_OPTIONS = [
  { id: "VALID" as const, label: "有效" },
  { id: "INVALID" as const, label: "无效" },
];

/** 考勤卡：有效 / 无效（与岗位状态语义一致） */
export const ATTENDANCE_CARD_STATUS_OPTIONS = [
  { id: "ACTIVE" as const, label: "有效" },
  { id: "INACTIVE" as const, label: "无效" },
];

/** 是 / 否 标签选择 */
export const YES_NO_TOGGLE_OPTIONS = [
  { id: "YES" as const, label: "是" },
  { id: "NO" as const, label: "否" },
];

export function archiveValidityStatusLabel(status?: string | null) {
  return ARCHIVE_VALIDITY_STATUS_OPTIONS.find((o) => o.id === status)?.label ?? status ?? "—";
}

export function attendanceCardStatusLabel(status?: string | null) {
  return ATTENDANCE_CARD_STATUS_OPTIONS.find((o) => o.id === status)?.label ?? status ?? "—";
}

export function yesNoToggleLabel(value?: string | null) {
  return YES_NO_TOGGLE_OPTIONS.find((o) => o.id === value)?.label ?? value ?? "—";
}

export function isArchiveValidityActive(status?: string | null) {
  return status === "VALID";
}

export function isAttendanceCardActive(status?: string | null) {
  return status === "ACTIVE";
}

export function isYesToggleValue(value?: string | null) {
  return value === "YES";
}

export function ArchiveStatusBadge({
  active,
  label,
  className,
}: {
  active: boolean;
  label: string;
  className?: string;
}) {
  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className={cn(
        "h-5 px-2 text-[11px] font-medium",
        active &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        className,
      )}
    >
      {label}
    </Badge>
  );
}
