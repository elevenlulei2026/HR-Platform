import type { EmployeeMovement, MovementCatalogOption } from "@shared/api.interface";

import { useEffect, useMemo, useState } from "react";

import { getMovementCatalogOptions } from "@/api/movement-catalog";
import { PanelEmpty } from "@/components/admin/page-shell";
import {
  MOVEMENT_TYPE_VISUALS,
  MOVEMENT_VISUAL_MAP,
  visualForMovement,
} from "@/components/admin/employee-archive/movement-type-visual";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PHASE_LEGEND = [
  { id: "hire", label: "入职", color: "bg-emerald-500" },
  { id: "change", label: "在职变动", color: "bg-blue-500" },
  { id: "leave", label: "离职", color: "bg-rose-500" },
] as const;

function phaseFromApi(phase: string): "hire" | "change" | "leave" {
  if (phase === "HIRE") return "hire";
  if (phase === "LEAVE") return "leave";
  return "change";
}

type EmployeeMovementTimelineProps = {
  movements: EmployeeMovement[];
};

export function EmployeeMovementTimeline({ movements }: EmployeeMovementTimelineProps) {
  const [catalogOptions, setCatalogOptions] = useState<MovementCatalogOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getMovementCatalogOptions()
      .then((res) => {
        if (!cancelled) setCatalogOptions(res.data);
      })
      .catch(() => {
        if (!cancelled) setCatalogOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const typeLegend = useMemo(() => {
    if (catalogOptions.length === 0) {
      return MOVEMENT_TYPE_VISUALS.map((visual) => ({
        code: visual.code,
        label: visual.code,
        visual,
      }));
    }
    return catalogOptions.map((opt) => {
      const visual = MOVEMENT_VISUAL_MAP[opt.movementType as keyof typeof MOVEMENT_VISUAL_MAP];
      return {
        code: opt.movementType,
        label: opt.movementTypeName,
        visual: visual
          ? { ...visual, phase: phaseFromApi(opt.phase) }
          : visualForMovement(opt.movementType, opt.movementTypeName),
      };
    });
  }, [catalogOptions]);

  const sorted = [...movements].sort((a, b) => {
    const dateCmp = b.effectiveDate.localeCompare(a.effectiveDate);
    if (dateCmp !== 0) return dateCmp;
    return b.id.localeCompare(a.id);
  });

  return (
    <div className="space-y-5 p-4">
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
          {typeLegend.map((type) => {
            const Icon = type.visual.icon;
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
                <Icon className={cn("size-3", type.visual.accent)} strokeWidth={2.25} />
                <span>{type.label}</span>
                <span className="font-mono text-[10px] opacity-60">{type.code}</span>
                {count > 0 ? (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {count}
                  </Badge>
                ) : null}
              </span>
            );
          })}
        </div>
      </div>

      {sorted.length === 0 ? (
        <PanelEmpty title="暂无异动记录" description="该员工尚未产生职务数据异动事件。" />
      ) : (
        <ol className="relative space-y-0">
          {sorted.map((movement, index) => {
            const meta = visualForMovement(movement.movementType, movement.movementTypeName);
            const Icon = meta.icon;
            const isLast = index === sorted.length - 1;

            return (
              <li key={movement.id} className="relative pb-5 last:pb-0">
                {!isLast ? (
                  <span
                    aria-hidden
                    className="absolute left-[17px] top-9 bottom-0 w-px bg-border/80"
                  />
                ) : null}

                <div
                  className={cn(
                    "relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-x-0 top-0 h-12 bg-gradient-to-b to-transparent opacity-80",
                      meta.wash,
                    )}
                  />
                  <div className="relative flex gap-3 p-4">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background",
                        meta.ring,
                        "bg-background",
                      )}
                    >
                      <Icon className={cn("size-4", meta.accent)} strokeWidth={2.25} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="text-sm font-semibold tracking-tight">
                              {movement.movementTypeName || meta.label}
                            </h5>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {movement.movementType}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {meta.phaseLabel}
                            </Badge>
                          </div>
                          {movement.reasonDescription ? (
                            <p className="mt-1 text-sm text-foreground/90">{movement.reasonDescription}</p>
                          ) : null}
                        </div>
                        <time
                          dateTime={movement.effectiveDate}
                          className="shrink-0 text-xs font-medium text-muted-foreground"
                        >
                          {movement.effectiveDate}
                        </time>
                      </div>

                      {(movement.reasonCode ||
                        movement.reasonSubDescription ||
                        movement.sourceRequestType ||
                        movement.remark) && (
                        <dl className="mt-3 grid gap-2 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs sm:grid-cols-2">
                          {movement.reasonCode ? (
                            <div>
                              <dt className="text-muted-foreground">原因码</dt>
                              <dd className="mt-0.5 font-mono font-medium">{movement.reasonCode}</dd>
                            </div>
                          ) : null}
                          {movement.reasonSubDescription ? (
                            <div>
                              <dt className="text-muted-foreground">原因子项</dt>
                              <dd className="mt-0.5 font-medium">{movement.reasonSubDescription}</dd>
                            </div>
                          ) : null}
                          {movement.sourceRequestType ? (
                            <div>
                              <dt className="text-muted-foreground">来源</dt>
                              <dd className="mt-0.5 font-medium">{movement.sourceRequestType}</dd>
                            </div>
                          ) : null}
                          {movement.remark ? (
                            <div className="sm:col-span-2">
                              <dt className="text-muted-foreground">备注</dt>
                              <dd className="mt-0.5 font-medium">{movement.remark}</dd>
                            </div>
                          ) : null}
                        </dl>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
