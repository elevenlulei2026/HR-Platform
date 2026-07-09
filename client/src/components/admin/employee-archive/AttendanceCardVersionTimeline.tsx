import type { EmployeeAttendanceCard } from "@shared/api.interface";
import { History } from "lucide-react";

import {
  ATTENDANCE_CARD_ACCENT_STYLES,
  cardVersionTemporal,
  temporalBadgeVariant,
} from "@/components/admin/employee-archive/attendance-card-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AttendanceCardVersionTimelineProps = {
  cards: EmployeeAttendanceCard[];
  activeId?: string;
  embedded?: boolean;
  onSelect: (card: EmployeeAttendanceCard) => void;
};

/** 考勤卡分区内生效版本时间轴 */
export function AttendanceCardVersionTimeline({
  cards,
  activeId,
  embedded = false,
  onSelect,
}: AttendanceCardVersionTimelineProps) {
  if (cards.length === 0) return null;

  const styles = ATTENDANCE_CARD_ACCENT_STYLES;
  const sorted = [...cards].sort((a, b) => b.effectiveStartDate.localeCompare(a.effectiveStartDate));

  return (
    <div
      className={cn(
        "flex gap-0 overflow-hidden",
        !embedded && "rounded-lg border border-border/55",
        !embedded && styles.shell,
      )}
    >
      <div className="min-w-0 flex-1 px-2.5 py-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <History className="size-3 shrink-0 opacity-70" />
            生效版本
            <Badge variant="secondary" className="h-4 px-1 text-[9px] font-normal">
              {cards.length} 个
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground/80">点击切换</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {sorted.map((card) => {
            const { temporal, temporalLabel } = cardVersionTemporal(card, cards);
            const isActive = card.id === activeId;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelect(card)}
                className={cn(
                  "flex min-w-[128px] shrink-0 flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left transition-all",
                  "border-border/45 bg-background/60 hover:border-border hover:bg-background",
                  isActive && cn("shadow-sm", styles.chipActive),
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                    {card.effectiveStartDate}
                  </span>
                  <Badge
                    variant={temporalBadgeVariant(temporal)}
                    className="h-3.5 px-1 text-[8px] font-normal leading-none"
                  >
                    {temporalLabel}
                  </Badge>
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {card.cardNo ? `卡号 ${card.cardNo}` : "未设置卡号"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
