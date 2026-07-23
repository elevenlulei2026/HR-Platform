import type { WorkflowTask, WorkflowTaskStatus } from "@shared/api.interface";

import { Check, CircleDashed, MessageSquareText, UserRound, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatWorkflowAssignee } from "@/lib/workflow-person";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  WorkflowTaskStatus,
  { label: string; action: string; rail: string; node: string; badge: string }
> = {
  PENDING: {
    label: "待处理",
    action: "等待审批",
    rail: "bg-amber-500/40",
    node: "border-amber-500/50 bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  APPROVED: {
    label: "已通过",
    action: "同意",
    rail: "bg-emerald-500/35",
    node: "border-emerald-500/45 bg-emerald-500/10 text-emerald-700 ring-emerald-500/15 dark:text-emerald-400",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  REJECTED: {
    label: "已驳回",
    action: "驳回",
    rail: "bg-destructive/35",
    node: "border-destructive/45 bg-destructive/10 text-destructive ring-destructive/15",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

function formatDateTime(value?: string) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatusIcon({ status }: { status: WorkflowTaskStatus }) {
  if (status === "APPROVED") return <Check className="size-3.5" strokeWidth={2.5} />;
  if (status === "REJECTED") return <X className="size-3.5" strokeWidth={2.5} />;
  return <CircleDashed className="size-3.5" strokeWidth={2.25} />;
}

type OnboardingApprovalTimelineProps = {
  tasks: WorkflowTask[];
  loading?: boolean;
};

/** 入职审批轨迹：审批人 / 操作 / 时间 / 意见 */
export function OnboardingApprovalTimeline({ tasks, loading }: OnboardingApprovalTimelineProps) {
  const pending = tasks.find((t) => t.status === "PENDING");

  if (loading) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-border/80 bg-muted/15 p-4">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded-lg bg-muted/70" />
        <div className="h-16 animate-pulse rounded-lg bg-muted/50" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-5 text-center text-xs text-muted-foreground">
        暂无审批记录
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border/80 bg-gradient-to-b from-muted/25 to-background">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold tracking-tight text-foreground">审批轨迹</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            共 {tasks.length} 个节点
            {pending
              ? ` · 当前待 ${formatWorkflowAssignee(pending)} 审批`
              : ""}
          </div>
        </div>
        {pending ? (
          <Badge variant="secondary" className={cn("font-normal", STATUS_META.PENDING.badge)}>
            进行中
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-normal">
            已结束
          </Badge>
        )}
      </header>

      <ol className="m-0 list-none space-y-0 p-4">
        {tasks.map((task, index) => {
          const meta = STATUS_META[task.status];
          const isLast = index === tasks.length - 1;
          const isCurrent = task.status === "PENDING";
          const completedAt = formatDateTime(task.completedAt);
          const createdAt = formatDateTime(task.createdAt);

          return (
            <li
              key={task.id}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
              style={{ animationDelay: `${Math.min(index, 6) * 45}ms`, animationFillMode: "both" }}
            >
              <div className="relative flex justify-center self-stretch" aria-hidden>
                {!isLast ? (
                  <span
                    className={cn("absolute left-1/2 top-8 bottom-0 w-px -translate-x-1/2", meta.rail)}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 flex size-8 items-center justify-center rounded-full border ring-2 ring-offset-1 ring-offset-background",
                    meta.node,
                    isCurrent && "shadow-[0_0_0_3px_hsl(var(--background)),0_0_12px_-2px] shadow-amber-500/30",
                  )}
                >
                  <StatusIcon status={task.status} />
                </span>
              </div>

              <article
                className={cn(
                  "mb-3 min-w-0 rounded-lg border bg-card/80 px-3.5 py-3 backdrop-blur-sm transition-colors",
                  isLast && "mb-0",
                  isCurrent
                    ? "border-amber-500/35 shadow-sm"
                    : "border-border/70 hover:border-border",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[13px] font-semibold tracking-tight text-foreground">
                        {task.nodeName}
                      </h4>
                      <Badge variant="secondary" className={cn("h-5 px-1.5 text-[11px] font-medium", meta.badge)}>
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="flex items-center gap-1.5 text-[12px] text-foreground/85">
                      <UserRound className="size-3 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{formatWorkflowAssignee(task)}</span>
                      <span className="text-muted-foreground">· {meta.action}</span>
                    </p>
                  </div>
                  <div className="text-right font-mono text-[11px] tabular-nums leading-relaxed text-muted-foreground">
                    {completedAt ? (
                      <>
                        <div>{completedAt}</div>
                        <div className="text-[10px] opacity-70">处理时间</div>
                      </>
                    ) : createdAt ? (
                      <>
                        <div>{createdAt}</div>
                        <div className="text-[10px] opacity-70">到达时间</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                {task.comment ? (
                  <blockquote className="mt-2.5 flex gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-[12px] leading-relaxed text-foreground/80">
                    <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="text-muted-foreground">意见 </span>
                      {task.comment}
                    </span>
                  </blockquote>
                ) : task.status !== "PENDING" ? (
                  <p className="mt-2 text-[11px] text-muted-foreground/80">未填写审批意见</p>
                ) : (
                  <p className="mt-2 text-[11px] text-amber-700/80 dark:text-amber-400/80">
                    请在「待办中心」处理该节点
                  </p>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
