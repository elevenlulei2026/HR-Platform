import type { OnboardingCase } from "@shared/api.interface";
import type { ReactNode } from "react";

import { EMPLOYMENT_TYPE_OPTIONS, GENDER_OPTIONS } from "@/api/employee";
import { onboardingStatusLabel } from "@/api/onboarding";
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

function labelOf(
  options: ReadonlyArray<{ id: string; label: string }>,
  value?: string | null,
) {
  if (!value) return "—";
  return options.find((o) => o.id === value)?.label ?? value;
}

type OnboardingCaseSummaryProps = {
  caseData: OnboardingCase;
  className?: string;
};

/**
 * 入职单只读摘要：字段与「新建入职」表单一致
 * 姓名 / 手机号 / 性别 / 组织 / 岗位 / 预计入职日 / 用工类型 / 备注
 */
export function OnboardingCaseSummary({ caseData, className }: OnboardingCaseSummaryProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/15",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium tracking-wide text-muted-foreground">待入职信息</div>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground/90">{caseData.caseNo}</div>
        </div>
        <Badge variant="secondary" className="font-normal">
          {onboardingStatusLabel(caseData.status)}
        </Badge>
      </header>

      <dl className="grid grid-cols-1 gap-x-5 gap-y-4 p-4 sm:grid-cols-2">
        <Field label="姓名">
          <span className="font-semibold tracking-tight">{caseData.candidateName || "—"}</span>
        </Field>
        <Field label="手机号">{caseData.mobile || "—"}</Field>
        <Field label="性别">{labelOf(GENDER_OPTIONS, caseData.gender)}</Field>
        <Field label="用工类型">
          {labelOf(EMPLOYMENT_TYPE_OPTIONS, caseData.employmentType)}
        </Field>
        <Field label="组织">
          <span className="break-words">
            {caseData.organizationName || caseData.organizationId || "—"}
          </span>
        </Field>
        <Field label="岗位">
          <span className="break-words">{caseData.positionName || caseData.positionId || "—"}</span>
        </Field>
        <Field label="预计入职日">
          <span className="font-mono tabular-nums">{caseData.expectedHireDate || "—"}</span>
        </Field>
        {caseData.employeeNo ? (
          <Field label="员工工号">
            <span className="font-mono">{caseData.employeeNo}</span>
          </Field>
        ) : (
          <Field label="员工工号">
            <span className="text-muted-foreground">审批通过后生成</span>
          </Field>
        )}
      </dl>

      <div className="border-t border-border/60 px-4 py-3">
        <div className="text-[11px] font-medium text-muted-foreground">备注</div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
          {caseData.remark?.trim() ? caseData.remark : "—"}
        </p>
      </div>
    </section>
  );
}
