import type {
  Employee,
  RegularizationReasonCode,
  RegularizationRequest,
  RegularizationStatus,
  WorkflowTask,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Inbox, Plus, RefreshCw } from "lucide-react";

import type { ApiError } from "@/api/http";
import { listEmployees } from "@/api/employee";
import {
  cancelRegularizationRequest,
  createRegularizationRequest,
  getRegularizationRequest,
  listRegularizationApprovalTasks,
  listRegularizationRequests,
  REGULARIZATION_REASON_OPTIONS,
  REGULARIZATION_STATUS_OPTIONS,
  regularizationStatusLabel,
  submitRegularizationRequest,
  suggestRegularizationReason,
  updateRegularizationRequest,
} from "@/api/regularization";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormField } from "@/components/admin/form-field";
import { OnboardingApprovalTimeline } from "@/components/admin/onboarding/OnboardingApprovalTimeline";
import { OptionSelect } from "@/components/admin/option-select";
import {
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  PaginationBar,
  SearchInput,
} from "@/components/admin/page-shell";
import { RegularizationRequestSummary } from "@/components/admin/regularization/RegularizationRequestSummary";
import { SearchableDialogPicker } from "@/components/admin/searchable-dialog-picker";
import {
  formatCodeName,
  type SearchableSelectOption,
} from "@/components/admin/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: RegularizationRequest[]; total: number };

type SheetMode = { type: "closed" } | { type: "new" } | { type: "view"; id: string };

type FormState = {
  employeeId: string;
  employeeLabel: string;
  assignmentId: string;
  expectedRegularizationDate: string;
  actualRegularizationDate: string;
  reasonCode: RegularizationReasonCode;
  opinion: string;
  remark: string;
};

const EMPTY_FORM: FormState = {
  employeeId: "",
  employeeLabel: "",
  assignmentId: "",
  expectedRegularizationDate: "",
  actualRegularizationDate: new Date().toISOString().slice(0, 10),
  reasonCode: "P01",
  opinion: "",
  remark: "",
};

function isPendingRegularization(emp: Employee): boolean {
  if (emp.status !== "PROBATION") return false;
  return !emp.primaryAssignment?.actualRegularizationDate;
}

function toProbationPickerOption(emp: Employee): SearchableSelectOption {
  const org = emp.primaryOrganizationName?.trim();
  const position = emp.primaryPositionName?.trim();
  const dept = [org, position].filter(Boolean).join(" · ");
  const expected = emp.primaryAssignment?.expectedRegularizationDate;
  const expectedHint = expected ? `预计转正 ${expected}` : "未填预计转正日";
  return {
    value: emp.id,
    label: emp.fullName,
    code: emp.employeeNo,
    description: dept ? `${dept} · ${expectedHint}` : expectedHint,
    keywords: `${emp.employeeNo} ${emp.fullName} ${org ?? ""} ${position ?? ""}`,
  };
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "DRAFT":
      return "border-muted-foreground/20 bg-muted/40 text-muted-foreground";
    case "PENDING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "COMPLETED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "CANCELLED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "";
  }
}

type Props = { canEdit: boolean };

/** 转正列表 + 发起，交互对齐 JobMovementPanel */
export function RegularizationPanel({ canEdit }: Props) {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [statusFilter, setStatusFilter] = useState<RegularizationStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });

  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [detail, setDetail] = useState<RegularizationRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approvalTasks, setApprovalTasks] = useState<WorkflowTask[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<RegularizationRequest | null>(null);

  const [empSearch, setEmpSearch] = useState("");
  const debouncedEmpSearch = useDebouncedValue(empSearch);
  const [empPickerOptions, setEmpPickerOptions] = useState<SearchableSelectOption[]>([]);
  const [empMetaById, setEmpMetaById] = useState<Record<string, Employee>>({});
  const [empLoading, setEmpLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listRegularizationRequests({
        page,
        pageSize,
        keyword: debouncedKeyword.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      setState({ type: "error", error: e as ApiError });
    }
  }, [page, pageSize, debouncedKeyword, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (sheet.type !== "new") return;
    let cancelled = false;
    void (async () => {
      setEmpLoading(true);
      try {
        const res = await listEmployees({
          page: 1,
          pageSize: 50,
          status: "PROBATION",
          keyword: debouncedEmpSearch.trim() || undefined,
        });
        if (cancelled) return;
        const pending = res.data.items.filter(isPendingRegularization);
        setEmpPickerOptions(pending.map(toProbationPickerOption));
        setEmpMetaById((prev) => {
          const next = { ...prev };
          for (const item of pending) next[item.id] = item;
          return next;
        });
      } catch {
        if (!cancelled) setEmpPickerOptions([]);
      } finally {
        if (!cancelled) setEmpLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sheet.type, debouncedEmpSearch]);

  const mergedEmpPickerOptions = useMemo(() => {
    const byId = new Map(empPickerOptions.map((opt) => [opt.value, opt]));
    if (form.employeeId && !byId.has(form.employeeId)) {
      byId.set(form.employeeId, {
        value: form.employeeId,
        label: form.employeeLabel.replace(/（.*）$/, "") || form.employeeLabel,
        code: form.employeeLabel.match(/（(.+)）$/)?.[1],
        description: form.expectedRegularizationDate
          ? `预计转正 ${form.expectedRegularizationDate}`
          : undefined,
      });
    }
    return [...byId.values()];
  }, [empPickerOptions, form.employeeId, form.employeeLabel, form.expectedRegularizationDate]);

  const loadApprovalTasks = useCallback(async (id: string, hasWorkflow: boolean) => {
    if (!hasWorkflow) {
      setApprovalTasks([]);
      return;
    }
    setApprovalLoading(true);
    try {
      const res = await listRegularizationApprovalTasks(id);
      setApprovalTasks(res.data);
    } catch {
      setApprovalTasks([]);
    } finally {
      setApprovalLoading(false);
    }
  }, []);

  const applySelectedEmployee = (employeeId: string) => {
    if (!employeeId) {
      setForm((prev) => ({
        ...prev,
        employeeId: "",
        employeeLabel: "",
        assignmentId: "",
        expectedRegularizationDate: "",
      }));
      return;
    }
    const emp = empMetaById[employeeId];
    if (!emp) {
      setForm((prev) => ({ ...prev, employeeId }));
      return;
    }
    const expected = emp.primaryAssignment?.expectedRegularizationDate || "";
    const actual = form.actualRegularizationDate || new Date().toISOString().slice(0, 10);
    setForm((prev) => ({
      ...prev,
      employeeId: emp.id,
      employeeLabel: `${emp.fullName}（${emp.employeeNo}）`,
      assignmentId: emp.primaryAssignment?.id || "",
      expectedRegularizationDate: expected,
      reasonCode: suggestRegularizationReason(expected, actual),
    }));
  };

  const openNew = () => {
    setDetail(null);
    setApprovalTasks([]);
    setEmpSearch("");
    setEmpPickerOptions([]);
    setForm({ ...EMPTY_FORM });
    setSheet({ type: "new" });
  };

  const openView = async (item: RegularizationRequest) => {
    setSheet({ type: "view", id: item.id });
    setDetailLoading(true);
    setApprovalTasks([]);
    try {
      const res = await getRegularizationRequest(item.id);
      setDetail(res.data);
      setForm({
        employeeId: res.data.employeeId,
        employeeLabel: `${res.data.employeeName || ""}（${res.data.employeeNo || ""}）`,
        assignmentId: res.data.assignmentId,
        expectedRegularizationDate: res.data.expectedRegularizationDate || "",
        actualRegularizationDate: res.data.actualRegularizationDate,
        reasonCode: res.data.reasonCode,
        opinion: res.data.opinion || "",
        remark: res.data.remark || "",
      });
      void loadApprovalTasks(res.data.id, Boolean(res.data.workflowInstanceId));
    } catch (e: unknown) {
      toast.error((e as ApiError).message);
      setSheet({ type: "closed" });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeSheet = () => {
    setSheet({ type: "closed" });
    setDetail(null);
    setApprovalTasks([]);
  };

  const validate = () => {
    if (!form.employeeId) {
      toast.error("请选择员工");
      return false;
    }
    if (!form.actualRegularizationDate) {
      toast.error("请选择实际转正日期");
      return false;
    }
    if (!form.reasonCode) {
      toast.error("请选择操作原因");
      return false;
    }
    return true;
  };

  const buildPayload = () => ({
    employeeId: form.employeeId,
    assignmentId: form.assignmentId || undefined,
    actualRegularizationDate: form.actualRegularizationDate,
    reasonCode: form.reasonCode,
    opinion: form.opinion.trim() || undefined,
    remark: form.remark.trim() || undefined,
  });

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (sheet.type === "new") {
        const res = await createRegularizationRequest(buildPayload());
        toast.success("单据已创建");
        setSheet({ type: "view", id: res.data.id });
        setDetail(res.data);
      } else if (detail?.status === "DRAFT") {
        const res = await updateRegularizationRequest(detail.id, {
          actualRegularizationDate: form.actualRegularizationDate,
          reasonCode: form.reasonCode,
          opinion: form.opinion.trim() || undefined,
          remark: form.remark.trim() || undefined,
        });
        toast.success("已保存");
        setDetail(res.data);
      }
      await load();
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let requestId = detail?.id;
      if (sheet.type === "new" || detail?.status === "DRAFT") {
        if (!requestId) {
          const created = await createRegularizationRequest(buildPayload());
          requestId = created.data.id;
          setDetail(created.data);
          setSheet({ type: "view", id: requestId });
        } else {
          await updateRegularizationRequest(requestId, {
            actualRegularizationDate: form.actualRegularizationDate,
            reasonCode: form.reasonCode,
            opinion: form.opinion.trim() || undefined,
            remark: form.remark.trim() || undefined,
          });
        }
      }
      if (!requestId) return;
      const res = await submitRegularizationRequest(requestId);
      toast.success("已提交审批");
      setDetail(res.data);
      await loadApprovalTasks(res.data.id, Boolean(res.data.workflowInstanceId));
      await load();
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const isEditable = sheet.type === "new" || detail?.status === "DRAFT";
  const showReadonly = sheet.type === "view" && detail && detail.status !== "DRAFT";

  return (
    <>
      <PanelCard
        title="转正列表"
        toolbar={
          <>
            <SearchInput
              value={keyword}
              onChange={(v) => {
                setKeyword(v);
                setPage(1);
              }}
              placeholder="单据号 / 工号 / 姓名"
            />
            <OptionSelect
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as RegularizationStatus | "ALL");
                setPage(1);
              }}
              placeholder="状态"
              className="w-[140px]"
              options={[
                { value: "ALL", label: "全部状态" },
                ...REGULARIZATION_STATUS_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
              ]}
            />
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" />
            </Button>
            {canEdit ? (
              <Button size="sm" onClick={openNew}>
                <Plus className="size-4" />
                发起转正
              </Button>
            ) : null}
          </>
        }
      >
        {state.type === "loading" ? <PanelLoading message="加载单据…" /> : null}
        {state.type === "error" ? <PanelError error={state.error} onRetry={() => void load()} /> : null}
        {state.type === "ok" && state.items.length === 0 ? (
          <PanelEmpty
            title="暂无转正单"
            description="可选择待转正（试用期）员工发起并提交审批。"
            icon={<Inbox className="size-5 text-muted-foreground" />}
            action={
              canEdit ? (
                <Button size="sm" onClick={openNew}>
                  发起转正
                </Button>
              ) : undefined
            }
          />
        ) : null}
        {state.type === "ok" && state.items.length > 0 ? (
          <>
            <div className="divide-y">
              {state.items.map((it) => (
                <div
                  key={it.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/30"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => void openView(it)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{it.employeeName || "—"}</span>
                      <Badge
                        variant="secondary"
                        className={cn("font-normal", statusBadgeClass(it.status))}
                      >
                        {regularizationStatusLabel(it.status)}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {it.requestNo}
                      {it.employeeNo ? ` · ${it.employeeNo}` : ""} ·{" "}
                      {it.reasonLabel || it.reasonCode} · 实际转正 {it.actualRegularizationDate}
                      {it.organizationName || it.positionName
                        ? ` · ${it.organizationName || "—"} / ${it.positionName || "—"}`
                        : ""}
                    </div>
                  </button>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => void openView(it)}>
                      {it.status === "DRAFT" && canEdit ? "编辑" : "查看"}
                    </Button>
                    {canEdit && (it.status === "DRAFT" || it.status === "PENDING") ? (
                      <Button size="sm" variant="ghost" onClick={() => setCancelTarget(it)}>
                        取消
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={state.total}
              itemCount={state.items.length}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        ) : null}
      </PanelCard>

      <Sheet open={sheet.type !== "closed"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>
              {sheet.type === "new"
                ? "发起转正"
                : detail
                  ? `${detail.employeeName || "转正"} · ${regularizationStatusLabel(detail.status)}`
                  : "转正详情"}
            </SheetTitle>
            <SheetDescription>
              {sheet.type === "new"
                ? "选择待转正员工与转正原因，填写日期后提交审批。"
                : detail?.requestNo
                  ? `单据号 ${detail.requestNo}`
                  : "查看或办理单据"}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {detailLoading ? (
              <PanelLoading message="加载详情…" />
            ) : (
              <div className="space-y-4">
                {isEditable ? (
                  <>
                    <FormField label="员工" required>
                      {sheet.type === "new" ? (
                        <SearchableDialogPicker
                          value={form.employeeId}
                          onChange={applySelectedEmployee}
                          options={mergedEmpPickerOptions}
                          dialogTitle="选择员工"
                          dialogDescription="仅展示试用期且尚未转正的员工"
                          placeholder="点击搜索选择员工"
                          entityEmptyTitle="点击搜索选择员工"
                          entityEmptyHint="弹窗中搜索姓名或工号"
                          entitySelectedHint="已选择，点击可重新搜索"
                          searchPlaceholder="搜索员工姓名 / 工号…"
                          entityIcon="briefcase"
                          formatOption={formatCodeName}
                          loading={empLoading}
                          shouldFilter={false}
                          onSearchChange={setEmpSearch}
                          helperText="none"
                          allowEmpty
                          emptyLabel="不指定"
                          className="w-full"
                        />
                      ) : (
                        <Input value={form.employeeLabel || "—"} disabled />
                      )}
                    </FormField>

                    {form.expectedRegularizationDate ? (
                      <FormField label="预计转正日">
                        <Input
                          value={form.expectedRegularizationDate}
                          disabled
                          className="font-mono"
                        />
                      </FormField>
                    ) : null}

                    <FormField label="实际转正日" required>
                      <Input
                        type="date"
                        value={form.actualRegularizationDate}
                        onChange={(e) => {
                          const actual = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            actualRegularizationDate: actual,
                            reasonCode: suggestRegularizationReason(
                              prev.expectedRegularizationDate,
                              actual,
                            ),
                          }));
                        }}
                      />
                    </FormField>

                    <FormField label="操作原因" required>
                      <OptionSelect
                        value={form.reasonCode}
                        onValueChange={(v) =>
                          setForm((prev) => ({
                            ...prev,
                            reasonCode: v as RegularizationReasonCode,
                          }))
                        }
                        placeholder="选择原因"
                        options={REGULARIZATION_REASON_OPTIONS.map((o) => ({
                          value: o.id,
                          label: `${o.id} ${o.label}`,
                        }))}
                      />
                    </FormField>

                    <FormField label="意见">
                      <Textarea
                        value={form.opinion}
                        onChange={(e) => setForm((prev) => ({ ...prev, opinion: e.target.value }))}
                        placeholder="试用期表现与转正意见"
                        className="min-h-[72px] resize-none"
                      />
                    </FormField>

                    <FormField label="备注">
                      <Textarea
                        value={form.remark}
                        onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                        placeholder="可选"
                        className="min-h-[64px] resize-none"
                      />
                    </FormField>
                  </>
                ) : null}

                {showReadonly && detail ? (
                  <RegularizationRequestSummary data={detail} />
                ) : null}

                {sheet.type === "view" && detail?.workflowInstanceId ? (
                  <OnboardingApprovalTimeline tasks={approvalTasks} loading={approvalLoading} />
                ) : null}
              </div>
            )}
          </div>

          <SheetFooter className="shrink-0 border-t p-4">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeSheet}>
                关闭
              </Button>
              {canEdit && isEditable ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void handleSave()}
                  >
                    {saving ? "保存中…" : "保存草稿"}
                  </Button>
                  <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
                    {saving ? "提交中…" : "提交审批"}
                  </Button>
                </>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="取消单据"
        description={
          cancelTarget
            ? `确认取消 ${cancelTarget.employeeName || ""}（${cancelTarget.requestNo}）？`
            : ""
        }
        confirmLabel="确认取消"
        destructive
        onConfirm={async () => {
          if (!cancelTarget) return;
          try {
            await cancelRegularizationRequest(cancelTarget.id);
            toast.success("已取消");
            if (detail?.id === cancelTarget.id) closeSheet();
            setCancelTarget(null);
            await load();
          } catch (e: unknown) {
            toast.error((e as ApiError).message);
          }
        }}
      />
    </>
  );
}
