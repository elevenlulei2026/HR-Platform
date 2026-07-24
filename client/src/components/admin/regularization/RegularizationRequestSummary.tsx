import type { RegularizationRequest } from "@shared/api.interface";
import type { ReactNode } from "react";

import {
  regularizationReasonLabel,
  regularizationStatusLabel,
} from "@/api/regularization";
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

type RegularizationRequestSummaryProps = {
  data: RegularizationRequest;
  className?: string;
};

/** 转正单只读摘要 */
export function RegularizationRequestSummary({
  data,
  className,
}: RegularizationRequestSummaryProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/15",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium tracking-wide text-muted-foreground">转正信息</div>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground/90">{data.requestNo}</div>
        </div>
        <Badge variant="secondary" className="font-normal">
          {regularizationStatusLabel(data.status)}
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
        <Field label="转正类型">{regularizationReasonLabel(data.reasonCode)}</Field>
        <Field label="组织">
          <span className="break-words">
            {data.organizationName || data.organizationId || "—"}
          </span>
        </Field>
        <Field label="岗位">
          <span className="break-words">{data.positionName || data.positionId || "—"}</span>
        </Field>
        <Field label="预计转正日">
          <span className="font-mono tabular-nums">{data.expectedRegularizationDate || "—"}</span>
        </Field>
        <Field label="实际转正日">
          <span className="font-mono tabular-nums">{data.actualRegularizationDate || "—"}</span>
        </Field>
      </dl>

      <div className="space-y-3 border-t border-border/60 px-4 py-3">
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">转正意见</div>
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
