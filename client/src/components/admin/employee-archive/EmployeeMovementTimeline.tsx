import type { EmployeeMovement, MovementType } from "@shared/api.interface";
import {
  ArrowLeftRight,
  ArrowUpCircle,
  Banknote,
  Briefcase,
  CircleDot,
  LogIn,
  LogOut,
  RefreshCw,
  Shuffle,
  TrendingDown,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PanelEmpty } from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MovementMeta = {
  code: MovementType;
  label: string;
  phase: "hire" | "change" | "leave";
  phaseLabel: string;
  icon: LucideIcon;
  accent: string;
  dot: string;
  ring: string;
  wash: string;
};

/** 入转调离全量异动类型定义 */
export const MOVEMENT_TYPE_CATALOG: MovementMeta[] = [
  {
    code: "HIR",
    label: "雇佣",
    phase: "hire",
    phaseLabel: "入职",
    icon: LogIn,
    accent: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/25",
    wash: "from-emerald-500/[0.07]",
  },
  {
    code: "REH",
    label: "重新雇佣",
    phase: "hire",
    phaseLabel: "入职",
    icon: RefreshCw,
    accent: "text-teal-600 dark:text-teal-400",
    dot: "bg-teal-500",
    ring: "ring-teal-500/25",
    wash: "from-teal-500/[0.07]",
  },
  {
    code: "PRC",
    label: "转正",
    phase: "change",
    phaseLabel: "在职",
    icon: UserCheck,
    accent: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
    ring: "ring-sky-500/25",
    wash: "from-sky-500/[0.07]",
  },
  {
    code: "SPR",
    label: "雇佣类型变更",
    phase: "change",
    phaseLabel: "在职",
    icon: Shuffle,
    accent: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
    ring: "ring-violet-500/25",
    wash: "from-violet-500/[0.07]",
  },
  {
    code: "PRO",
    label: "晋升晋级",
    phase: "change",
    phaseLabel: "在职",
    icon: ArrowUpCircle,
    accent: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    ring: "ring-amber-500/25",
    wash: "from-amber-500/[0.07]",
  },
  {
    code: "DEM",
    label: "降职降级",
    phase: "change",
    phaseLabel: "在职",
    icon: TrendingDown,
    accent: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
    ring: "ring-orange-500/25",
    wash: "from-orange-500/[0.07]",
  },
  {
    code: "DTA",
    label: "数据更改",
    phase: "change",
    phaseLabel: "在职",
    icon: CircleDot,
    accent: "text-slate-600 dark:text-slate-400",
    dot: "bg-slate-500",
    ring: "ring-slate-500/25",
    wash: "from-slate-500/[0.07]",
  },
  {
    code: "XFR",
    label: "调动",
    phase: "change",
    phaseLabel: "在职",
    icon: ArrowLeftRight,
    accent: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    ring: "ring-blue-500/25",
    wash: "from-blue-500/[0.07]",
  },
  {
    code: "PAY",
    label: "调薪",
    phase: "change",
    phaseLabel: "在职",
    icon: Banknote,
    accent: "text-yellow-700 dark:text-yellow-400",
    dot: "bg-yellow-500",
    ring: "ring-yellow-500/25",
    wash: "from-yellow-500/[0.07]",
  },
  {
    code: "TER",
    label: "离职",
    phase: "leave",
    phaseLabel: "离职",
    icon: LogOut,
    accent: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    ring: "ring-rose-500/25",
    wash: "from-rose-500/[0.07]",
  },
];

const MOVEMENT_META_MAP = Object.fromEntries(
  MOVEMENT_TYPE_CATALOG.map((item) => [item.code, item]),
) as Record<MovementType, MovementMeta>;

const PHASE_LEGEND = [
  { id: "hire", label: "入职", color: "bg-emerald-500" },
  { id: "change", label: "在职变动", color: "bg-blue-500" },
  { id: "leave", label: "离职", color: "bg-rose-500" },
] as const;

function metaFor(movement: EmployeeMovement): MovementMeta {
  return (
    MOVEMENT_META_MAP[movement.movementType] ?? {
      code: movement.movementType,
      label: movement.movementTypeName,
      phase: "change" as const,
      phaseLabel: "在职",
      icon: Briefcase,
      accent: "text-primary",
      dot: "bg-primary",
      ring: "ring-primary/25",
      wash: "from-primary/[0.07]",
    }
  );
}

type EmployeeMovementTimelineProps = {
  movements: EmployeeMovement[];
};

export function EmployeeMovementTimeline({ movements }: EmployeeMovementTimelineProps) {
  const sorted = [...movements].sort((a, b) => {
    const dateCmp = b.effectiveDate.localeCompare(a.effectiveDate);
    if (dateCmp !== 0) return dateCmp;
    return b.id.localeCompare(a.id);
  });

  return (
    <div className="space-y-5 p-4">
      {/* 类型图例：入转调离全量 */}
      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-background p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold tracking-tight">异动类型</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">覆盖入转调离全部职务数据操作码</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PHASE_LEGEND.map((phase) => (
              <span
                key={phase.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                <span className={cn("size-2 rounded-full", phase.color)} />
                {phase.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MOVEMENT_TYPE_CATALOG.map((type) => {
            const Icon = type.icon;
            const count = movements.filter((m) => m.movementType === type.code).length;
            return (
              <span
                key={type.code}
                title={type.label}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-[11px]",
                  count > 0 ? "font-medium text-foreground" : "text-muted-foreground/70",
                )}
              >
                <Icon className={cn("size-3", type.accent)} strokeWidth={2.25} />
                <span>{type.label}</span>
                <span className="font-mono text-[10px] opacity-60">{type.code}</span>
                {count > 0 ? (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">
                    {count}
                  </Badge>
                ) : null}
              </span>
            );
          })}
        </div>
      </div>

      {sorted.length === 0 ? (
        <PanelEmpty
          compact
          icon={<Briefcase className="size-4 text-muted-foreground" />}
          title="暂无异动记录"
          description="入转调离流程完成后将自动写入异动轨迹"
        />
      ) : (
        <div className="relative pl-2">
          {/* 时间线主轴 */}
          <div
            aria-hidden
            className="absolute top-3 bottom-3 left-[19px] w-px bg-gradient-to-b from-primary/40 via-border to-border/30"
          />

          <ol className="space-y-0">
            {sorted.map((movement, index) => {
              const meta = metaFor(movement);
              const Icon = meta.icon;
              const isFirst = index === 0;
              const isLast = index === sorted.length - 1;

              return (
                <li key={movement.id} className="relative pb-5 last:pb-0">
                  {/* 节点 */}
                  <div
                    className={cn(
                      "absolute top-3 left-0 z-[1] flex size-[38px] items-center justify-center rounded-full ring-4 ring-background",
                      meta.dot,
                      meta.ring,
                      isFirst && "shadow-[0_0_0_4px] shadow-primary/10",
                    )}
                  >
                    <Icon className="size-4 text-white" strokeWidth={2.25} />
                  </div>

                  {/* 卡片 */}
                  <article
                    className={cn(
                      "relative ml-14 overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br to-background shadow-sm transition-shadow hover:shadow-md",
                      meta.wash,
                      isFirst && "border-primary/25 shadow-md",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 bg-background/40 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className={cn("text-sm font-semibold tracking-tight", meta.accent)}>
                            {movement.movementTypeName || meta.label}
                          </h5>
                          <Badge variant="outline" className="font-mono text-[10px] font-normal">
                            {movement.movementType}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {meta.phaseLabel}
                          </Badge>
                        </div>
                        {movement.reasonDescription ? (
                          <p className="mt-1 text-sm text-foreground/90">{movement.reasonDescription}</p>
                        ) : null}
                      </div>
                      <time
                        dateTime={movement.effectiveDate}
                        className="shrink-0 rounded-lg bg-muted/50 px-2.5 py-1 font-mono text-xs font-medium text-foreground"
                      >
                        {movement.effectiveDate}
                      </time>
                    </div>

                    {(movement.reasonCode ||
                      movement.reasonSubDescription ||
                      movement.sourceRequestType ||
                      movement.remark) && (
                      <dl className="grid gap-2 px-4 py-3 text-xs sm:grid-cols-2">
                        {movement.reasonCode ? (
                          <div className="rounded-lg bg-muted/25 px-2.5 py-2">
                            <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                              原因码
                            </dt>
                            <dd className="mt-0.5 font-mono font-medium">{movement.reasonCode}</dd>
                          </div>
                        ) : null}
                        {movement.reasonSubDescription ? (
                          <div className="rounded-lg bg-muted/25 px-2.5 py-2">
                            <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                              子原因
                            </dt>
                            <dd className="mt-0.5 font-medium">{movement.reasonSubDescription}</dd>
                          </div>
                        ) : null}
                        {movement.sourceRequestType ? (
                          <div className="rounded-lg bg-muted/25 px-2.5 py-2">
                            <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                              来源
                            </dt>
                            <dd className="mt-0.5 font-medium">{movement.sourceRequestType}</dd>
                          </div>
                        ) : null}
                        {movement.remark ? (
                          <div className="rounded-lg bg-muted/25 px-2.5 py-2 sm:col-span-2">
                            <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                              备注
                            </dt>
                            <dd className="mt-0.5 font-medium">{movement.remark}</dd>
                          </div>
                        ) : null}
                      </dl>
                    )}

                    {isLast && sorted.length > 1 ? (
                      <div className="border-t border-border/30 bg-muted/15 px-4 py-2 text-[11px] text-muted-foreground">
                        最早记录 · 共 {sorted.length} 条异动
                      </div>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
