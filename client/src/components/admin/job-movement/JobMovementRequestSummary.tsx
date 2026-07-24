import type { JobMovementRequest } from "@shared/api.interface";
import type { ReactNode } from "react";

import { jobMovementStatusLabel } from "@/api/job-movement";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-[13.5px] leading-5 text-foreground">{children ?? "—"}</dd>
    </div>
  );
}

type Props = { data: JobMovementRequest; className?: string };

export function JobMovementRequestSummary({ data, className }: Props) {
  const isSpr = data.movementType === "SPR";
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/15",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium tracking-wide text-muted-foreground">
            {data.movementTypeName || data.movementType}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground/90">{data.requestNo}</div>
        </div>
        <Badge variant="secondary" className="font-normal">
          {jobMovementStatusLabel(data.status)}
        </Badge>
      </header>

      <dl className="grid grid-cols-1 gap-x-5 gap-y-4 p-4 sm:grid-cols-2">
        <Field label="员工">
          <span className="font-semibold tracking-tight">
            {data.employeeName || "—"}
            {data.employeeNo ? (
              <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
                {data.employeeNo}
              </span>
            ) : null}
          </span>
        </Field>
        <Field label="生效日">
          <span className="font-mono tabular-nums">{data.effectiveDate || "—"}</span>
        </Field>
        <Field label="操作原因">
          {data.reasonLabel || data.reasonCode}
          {data.reasonSubLabel || data.reasonSubCode
            ? ` / ${data.reasonSubLabel || data.reasonSubCode}`
            : ""}
        </Field>
        <Field label="当前组织">
          <span className="break-words">{data.fromOrganizationName || "—"}</span>
        </Field>
        {isSpr ? (
          <>
            <Field label="目标员工组">
              {[data.employeeGroupCode, data.employeeGroupName].filter(Boolean).join(" ") || "—"}
            </Field>
            <Field label="目标员工子组">
              {[data.employeeSubgroupCode, data.employeeSubgroupName].filter(Boolean).join(" ") ||
                "—"}
            </Field>
          </>
        ) : (
          <>
            <Field label="目标岗位">
              <span className="break-words">{data.positionName || data.positionId || "—"}</span>
            </Field>
            <Field label="目标职级">{data.jobGradeCode || "—"}</Field>
          </>
        )}
      </dl>

      <div className="space-y-3 border-t border-border/60 px-4 py-3">
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">意见</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
            {data.opinion?.trim() ? data.opinion : "—"}
          </p>
        </div>
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">备注</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
            {data.remark?.trim() ? data.remark : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
