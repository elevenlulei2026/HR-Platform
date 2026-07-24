import type { ContractChangeRequest } from "@shared/api.interface";
import type { ReactNode } from "react";

import {
  contractChangeRequestTypeLabel,
  contractChangeStatusLabel,
  contractChangeTargetKindLabel,
} from "@/api/contract-change";
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

type Props = {
  data: ContractChangeRequest;
  className?: string;
};

/** 合同续签/变更单只读摘要（待办中心与运营抽屉共用） */
export function ContractChangeRequestSummary({ data, className }: Props) {
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
            {contractChangeRequestTypeLabel(data.requestType)} ·{" "}
            {contractChangeTargetKindLabel(data.targetKind)}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground/90">{data.requestNo}</div>
        </div>
        <Badge variant="secondary" className="font-normal">
          {contractChangeStatusLabel(data.status)}
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
        <Field label="源档案">
          <span className="break-words">
            {data.sourceCode || data.sourceRecordId}
            {data.sourceEndDate ? (
              <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                到期 {data.sourceEndDate}
              </span>
            ) : null}
          </span>
        </Field>
        <Field label="拟开始日">
          <span className="font-mono tabular-nums">{data.proposedStartDate || "—"}</span>
        </Field>
        <Field label="拟结束日">
          <span className="font-mono tabular-nums">{data.proposedEndDate || "—"}</span>
        </Field>
        <Field label="法人">{data.legalEntityName || data.legalEntityId || "—"}</Field>
        {data.targetKind === "CONTRACT" ? (
          <Field label="合同编号">{data.contractCode || "—"}</Field>
        ) : (
          <Field label="协议编号">{data.agreementCode || "—"}</Field>
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
