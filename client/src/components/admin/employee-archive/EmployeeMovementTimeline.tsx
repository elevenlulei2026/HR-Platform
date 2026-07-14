import type { EmployeeAssignment, EmployeeMovement } from "@shared/api.interface";
import { Building2, GitBranch, MapPin } from "lucide-react";

import { PanelEmpty } from "@/components/admin/page-shell";
import { buildMovementTimelineItems } from "@/components/admin/employee-archive/movement-timeline-data";
import { visualForMovement } from "@/components/admin/employee-archive/movement-type-visual";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** 轨道节点中心相对行顶（图标环 size-8 的一半） */
const NODE_CENTER_Y = 16;

type EmployeeMovementTimelineProps = {
  movements: EmployeeMovement[];
  /** 任职记录：优先用于轨迹（异动类型 = 任职职务异动） */
  assignments?: EmployeeAssignment[];
};

function formatDateParts(iso: string) {
  const [year, month, day] = iso.split("-");
  return { year: year ?? iso, monthDay: month && day ? `${month}-${day}` : iso };
}

function contextLine(item: ReturnType<typeof buildMovementTimelineItems>[number]): string | undefined {
  const parts = [
    item.organizationName,
    item.positionName,
    item.jobGradeLabel ? `职级 ${item.jobGradeLabel}` : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** 异动轨迹：任职职务异动类型 + 生效日，卡片化时间轴 */
export function EmployeeMovementTimeline({
  movements,
  assignments,
}: EmployeeMovementTimelineProps) {
  const sorted = buildMovementTimelineItems(movements, assignments);

  if (sorted.length === 0) {
    return (
      <div className="p-5">
        <PanelEmpty
          compact
          icon={<GitBranch className="size-5 text-muted-foreground/70" />}
          title="暂无异动记录"
          description="该员工尚未维护任职职务异动。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-md border border-primary/20 bg-primary/10">
          <GitBranch className="size-3 text-primary" />
        </span>
        <span>
          共{" "}
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {sorted.length}
          </span>{" "}
          次 · 生效日倒序
        </span>
      </div>

      <ol className="m-0 list-none space-y-0 p-0">
        {sorted.map((item, index) => {
          const meta = visualForMovement(item.movementType, item.movementTypeName);
          const Icon = meta.icon;
          const isFirst = index === 0;
          const isLast = index === sorted.length - 1;
          const typeName = item.movementTypeName || meta.label;
          const { year, monthDay } = formatDateParts(item.effectiveDate);
          const place = contextLine(item);
          const reasonParts = [item.reasonDescription, item.reasonSubDescription].filter(Boolean);

          return (
            <li
              key={item.id}
              className="grid grid-cols-[4.25rem_2rem_minmax(0,1fr)] items-stretch gap-x-2.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, animationFillMode: "both" }}
            >
              <time
                dateTime={item.effectiveDate}
                className={cn(
                  "flex flex-col items-end gap-0.5 pt-1.5 text-right tabular-nums",
                  isFirst ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span className="font-mono text-xs tracking-wider opacity-70">{year}</span>
                <span
                  className={cn(
                    "font-mono text-sm leading-none tracking-tight",
                    isFirst && "font-semibold",
                  )}
                >
                  {monthDay}
                </span>
              </time>

              <div className="relative flex justify-center self-stretch" aria-hidden>
                {!isFirst ? (
                  <span
                    className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-border"
                    style={{ height: NODE_CENTER_Y }}
                  />
                ) : null}
                {!isLast ? (
                  <span
                    className="absolute left-1/2 bottom-0 w-px -translate-x-1/2 bg-border"
                    style={{ top: NODE_CENTER_Y }}
                  />
                ) : null}
                <span
                  className={cn(
                    "absolute left-1/2 top-0 z-10 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border bg-background transition-colors duration-200",
                    isFirst
                      ? "border-primary/40 text-primary ring-2 ring-primary/15"
                      : "border-border text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={2.25} />
                </span>
              </div>

              <div className={cn("min-w-0 pb-3", isLast && "pb-0")}>
                <article
                  className={cn(
                    "rounded-lg border bg-card px-3.5 py-3 transition-[border-color,box-shadow] duration-200",
                    isFirst
                      ? "border-primary/30 shadow-sm"
                      : "border-border/80 hover:border-primary/20",
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h4
                        className={cn(
                          "text-[13.5px] leading-5 tracking-tight",
                          isFirst ? "font-semibold text-foreground" : "font-medium text-foreground",
                        )}
                      >
                        {typeName}
                      </h4>
                      {isFirst ? (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium tracking-wide">
                          最近
                        </Badge>
                      ) : null}
                      {item.assignmentIndicatorLabel ? (
                        <Badge
                          variant="outline"
                          className="h-5 border-border px-1.5 text-[11px] font-normal text-muted-foreground"
                        >
                          {item.assignmentIndicatorLabel}
                        </Badge>
                      ) : null}
                      <span className="ml-auto font-mono text-xs tracking-wide text-muted-foreground/65">
                        {item.movementType}
                      </span>
                    </div>

                    {place ? (
                      <p className="flex items-start gap-1.5 text-[12px] leading-5 text-foreground/80">
                        <Building2 className="mt-0.5 size-3 shrink-0 text-muted-foreground/70" />
                        <span className="min-w-0">{place}</span>
                      </p>
                    ) : null}

                    {item.workLocationLabel ? (
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <MapPin className="size-2.5 shrink-0 opacity-70" />
                        {item.workLocationLabel}
                      </p>
                    ) : null}

                    {reasonParts.length > 0 ? (
                      <p className="border-t border-border/60 pt-2 text-[11px] leading-relaxed text-muted-foreground">
                        <span className="text-muted-foreground/70">原因 </span>
                        {reasonParts.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </article>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
