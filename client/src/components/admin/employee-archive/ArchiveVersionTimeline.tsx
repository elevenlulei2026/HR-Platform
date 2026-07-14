import { History } from "lucide-react";

import type { EffectiveDatedRecord } from "@/components/admin/employee-archive/archive-effective-version-utils";
import {
  ARCHIVE_VERSION_ACCENT_STYLES,
  temporalBadgeVariant,
  versionTemporal,
} from "@/components/admin/employee-archive/archive-effective-version-utils";
import { Badge } from "@/components/ui/badge";
import { adminChipActive, adminChipIdle } from "@/components/admin/selection-styles";
import { cn } from "@/lib/utils";

type ArchiveVersionTimelineProps<T extends EffectiveDatedRecord> = {
  items: T[];
  activeId?: string;
  embedded?: boolean;
  subtitle?: (item: T) => string;
  onSelect: (item: T) => void;
};

/** 档案分区内生效版本时间轴 */
export function ArchiveVersionTimeline<T extends EffectiveDatedRecord>({
  items,
  activeId,
  embedded = false,
  subtitle,
  onSelect,
}: ArchiveVersionTimelineProps<T>) {
  if (items.length === 0) return null;

  const styles = ARCHIVE_VERSION_ACCENT_STYLES;
  const sorted = [...items].sort((a, b) => b.effectiveStartDate.localeCompare(a.effectiveStartDate));

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
              {items.length} 个
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground/80">点击切换</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {sorted.map((item) => {
            const { temporal, temporalLabel } = versionTemporal(item, items);
            const isActive = item.id === activeId;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  "flex min-w-[128px] shrink-0 flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left",
                  isActive ? adminChipActive : adminChipIdle,
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                    {item.effectiveStartDate}
                  </span>
                  <Badge
                    variant={temporalBadgeVariant(temporal)}
                    className="h-3.5 px-1 text-[8px] font-normal leading-none"
                  >
                    {temporalLabel}
                  </Badge>
                </div>
                {subtitle ? (
                  <div className="truncate text-[10px] text-muted-foreground">{subtitle(item)}</div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
