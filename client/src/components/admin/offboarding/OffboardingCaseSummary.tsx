import type { OffboardingCase } from "@shared/api.interface";
import type { ReactNode } from "react";

import {
  offboardingReasonLabel,
  offboardingStatusLabel,
} from "@/api/offboarding";
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

type OffboardingCaseSummaryProps = {
  data: OffboardingCase;
  className?: string;
};

/** 离职单只读摘要（详情 Sheet / 待办中心复用） */
export function OffboardingCaseSummary({ data, className }: OffboardingCaseSummaryProps) {
  const doneCount = data.items.filter((i) => i.done).length;
  const totalCount = data.items.length;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/15",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium tracking-wide text-muted-foreground">离职信息</div>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground/90">{data.caseNo}</div>
        </div>
        <Badge variant="secondary" className="font-normal">
          {offboardingStatusLabel(data.status)}
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
        <Field label="离职原因">{offboardingReasonLabel(data.reasonCode)}</Field>
        <Field label="组织">
          <span className="break-words">
            {data.organizationName || data.organizationId || "—"}
          </span>
        </Field>
        <Field label="岗位">
          <span className="break-words">{data.positionName || data.positionId || "—"}</span>
        </Field>
        <Field label="最后工作日">
          <span className="font-mono tabular-nums">{data.lastWorkDay || "—"}</span>
        </Field>
        <Field label="交接人">{data.handoverToEmployeeName || "—"}</Field>
        <Field label="交接进度">
          <span className="font-mono tabular-nums">
            {doneCount}/{totalCount}
          </span>
        </Field>
      </dl>

      {data.items.length > 0 ? (
        <div className="border-t border-border/60 px-4 py-3">
          <div className="text-[11px] font-medium text-muted-foreground">交接清单</div>
          <ul className="mt-2 space-y-1.5">
            {data.items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-2 text-[13px]",
                  item.done ? "text-muted-foreground line-through" : "text-foreground",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-1.5 shrink-0 rounded-full",
                    item.done ? "bg-emerald-500" : "bg-amber-500",
                  )}
                />
                {item.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-border/60 px-4 py-3">
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">备注</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
            {data.remark?.trim() ? data.remark : "—"}
          </p>
        </div>
        {data.certificatePlaceholder ? (
          <p className="text-[11px] text-muted-foreground">离职证明：模板 PDF 后期接入</p>
        ) : null}
      </div>
    </section>
  );
}
