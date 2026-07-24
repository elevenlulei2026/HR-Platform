import type {
  Employee,
  OffboardingCase,
  OffboardingReasonCode,
  OffboardingStatus,
  WorkflowTask,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Inbox, Plus, RefreshCw, Trash2, UserMinus } from "lucide-react";

import type { ApiError } from "@/api/http";
import { listEmployees } from "@/api/employee";
import {
  addOffboardingHandoverItem,
  cancelOffboardingCase,
  completeOffboardingCase,
  createOffboardingCase,
  getOffboardingCase,
  listOffboardingApprovalTasks,
  listOffboardingCases,
  OFFBOARDING_REASON_OPTIONS,
  OFFBOARDING_STATUS_OPTIONS,
  offboardingStatusLabel,
  removeOffboardingHandoverItem,
  submitOffboardingCase,
  updateOffboardingCase,
  updateOffboardingHandoverItem,
} from "@/api/offboarding";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormField } from "@/components/admin/form-field";
import { OffboardingCaseSummary } from "@/components/admin/offboarding/OffboardingCaseSummary";
import { OnboardingApprovalTimeline } from "@/components/admin/onboarding/OnboardingApprovalTimeline";
import { OptionSelect } from "@/components/admin/option-select";
import {
  NoPermissionCard,
  PageHeader,
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  PaginationBar,
  SearchInput,
} from "@/components/admin/page-shell";
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
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: OffboardingCase[]; total: number };

type SheetMode = { type: "closed" } | { type: "new" } | { type: "view"; id: string };

type FormState = {
  employeeId: string;
  employeeLabel: string;
  assignmentId: string;
  lastWorkDay: string;
  reasonCode: OffboardingReasonCode;
  remark: string;
  newItemTitle: string;
};

const EMPTY_FORM: FormState = {
  employeeId: "",
  employeeLabel: "",
  assignmentId: "",
  lastWorkDay: new Date().toISOString().slice(0, 10),
  reasonCode: "TA",
  remark: "",
  newItemTitle: "",
};

function isOffboardable(emp: Employee): boolean {
  return emp.status === "ACTIVE" || emp.status === "PROBATION";
}

function toEmployeePickerOption(emp: Employee): SearchableSelectOption {
  const org = emp.primaryOrganizationName?.trim();
  const position = emp.primaryPositionName?.trim();
  const dept = [org, position].filter(Boolean).join(" · ");
  const statusHint = emp.status === "PROBATION" ? "试用期" : "在职";
  return {
    value: emp.id,
    label: emp.fullName,
    code: emp.employeeNo,
    description: dept ? `${dept} · ${statusHint}` : statusHint,
    keywords: `${emp.employeeNo} ${emp.fullName} ${org ?? ""} ${position ?? ""}`,
  };
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "APPLIED":
      return "border-muted-foreground/20 bg-muted/40 text-muted-foreground";
    case "APPROVING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "HANDOVER":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400";
    case "SETTLING":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400";
    case "COMPLETED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "CANCELLED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "";
  }
}

export function AdminOffboardingPage() {
  const { has } = usePermission();
  const canView = has("offboarding:view");
  const canEdit = has("offboarding:edit");

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [statusFilter, setStatusFilter] = useState<OffboardingStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });

  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [detail, setDetail] = useState<OffboardingCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approvalTasks, setApprovalTasks] = useState<WorkflowTask[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<OffboardingCase | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState(false);

  const [empSearch, setEmpSearch] = useState("");
  const debouncedEmpSearch = useDebouncedValue(empSearch);
  const [empPickerOptions, setEmpPickerOptions] = useState<SearchableSelectOption[]>([]);
  const [empMetaById, setEmpMetaById] = useState<Record<string, Employee>>({});
  const [empLoading, setEmpLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listOffboardingCases({
        page,
        pageSize,
        keyword: debouncedKeyword.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      setState({ type: "error", error: e as ApiError });
    }
  }, [canView, page, pageSize, debouncedKeyword, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (sheet.type !== "new") return;
    let cancelled = false;
    void (async () => {
      setEmpLoading(true);
      try {
        const [activeRes, probationRes] = await Promise.all([
          listEmployees({
            page: 1,
            pageSize: 40,
            status: "ACTIVE",
            keyword: debouncedEmpSearch.trim() || undefined,
          }),
          listEmployees({
            page: 1,
            pageSize: 20,
            status: "PROBATION",
            keyword: debouncedEmpSearch.trim() || undefined,
          }),
        ]);
        if (cancelled) return;
        const merged = [...activeRes.data.items, ...probationRes.data.items].filter(isOffboardable);
        const byId = new Map(merged.map((e) => [e.id, e]));
        const list = [...byId.values()];
        setEmpPickerOptions(list.map(toEmployeePickerOption));
        setEmpMetaById((prev) => {
          const next = { ...prev };
          for (const item of list) next[item.id] = item;
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
      });
    }
    return [...byId.values()];
  }, [empPickerOptions, form.employeeId, form.employeeLabel]);

  const loadApprovalTasks = useCallback(async (id: string, hasWorkflow: boolean) => {
    if (!hasWorkflow) {
      setApprovalTasks([]);
      return;
    }
    setApprovalLoading(true);
    try {
      const res = await listOffboardingApprovalTasks(id);
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
      }));
      return;
    }
    const emp = empMetaById[employeeId];
    if (!emp) {
      setForm((prev) => ({ ...prev, employeeId }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      employeeId: emp.id,
      employeeLabel: `${emp.fullName}（${emp.employeeNo}）`,
      assignmentId: emp.primaryAssignment?.id || "",
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

  const openView = async (item: OffboardingCase) => {
    setSheet({ type: "view", id: item.id });
    setDetailLoading(true);
    setApprovalTasks([]);
    try {
      const res = await getOffboardingCase(item.id);
      setDetail(res.data);
      setForm({
        employeeId: res.data.employeeId,
        employeeLabel: `${res.data.employeeName || ""}（${res.data.employeeNo || ""}）`,
        assignmentId: res.data.assignmentId,
        lastWorkDay: res.data.lastWorkDay,
        reasonCode: res.data.reasonCode,
        remark: res.data.remark || "",
        newItemTitle: "",
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
    setCompleteConfirm(false);
  };

  const validate = () => {
    if (!form.employeeId) {
      toast.error("请选择员工");
      return false;
    }
    if (!form.lastWorkDay) {
      toast.error("请选择最后工作日");
      return false;
    }
    if (!form.reasonCode) {
      toast.error("请选择离职原因");
      return false;
    }
    return true;
  };

  const buildCreatePayload = () => ({
    employeeId: form.employeeId,
    assignmentId: form.assignmentId || undefined,
    lastWorkDay: form.lastWorkDay,
    reasonCode: form.reasonCode,
    remark: form.remark.trim() || undefined,
  });

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (sheet.type === "new") {
        const res = await createOffboardingCase(buildCreatePayload());
        toast.success("离职单已创建");
        setSheet({ type: "view", id: res.data.id });
        setDetail(res.data);
      } else if (detail?.status === "APPLIED") {
        const res = await updateOffboardingCase(detail.id, {
          lastWorkDay: form.lastWorkDay,
          reasonCode: form.reasonCode,
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
      let caseId = detail?.id;
      if (sheet.type === "new" || detail?.status === "APPLIED") {
        if (!caseId) {
          const created = await createOffboardingCase(buildCreatePayload());
          caseId = created.data.id;
          setDetail(created.data);
          setSheet({ type: "view", id: caseId });
        } else {
          await updateOffboardingCase(caseId, {
            lastWorkDay: form.lastWorkDay,
            reasonCode: form.reasonCode,
            remark: form.remark.trim() || undefined,
          });
        }
      }
      if (!caseId) return;
      const res = await submitOffboardingCase(caseId);
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

  const handleToggleItem = async (itemId: string, done: boolean) => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await updateOffboardingHandoverItem(detail.id, itemId, { done });
      setDetail(res.data);
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!detail) return;
    const title = form.newItemTitle.trim();
    if (!title) {
      toast.error("请输入交接项标题");
      return;
    }
    setSaving(true);
    try {
      const res = await addOffboardingHandoverItem(detail.id, { title });
      setDetail(res.data);
      setForm((prev) => ({ ...prev, newItemTitle: "" }));
      toast.success("已添加交接项");
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await removeOffboardingHandoverItem(detail.id, itemId);
      setDetail(res.data);
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await completeOffboardingCase(detail.id, {
        remark: form.remark.trim() || undefined,
      });
      toast.success("离职已完成");
      setDetail(res.data);
      setCompleteConfirm(false);
      await load();
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return (
      <NoPermissionCard
        icon={<UserMinus className="size-5 text-muted-foreground" />}
        title="无权限查看离职办理"
        description="需要 offboarding:view 权限"
      />
    );
  }

  const isEditable = sheet.type === "new" || detail?.status === "APPLIED";
  const showHandover = detail?.status === "HANDOVER" || detail?.status === "APPLIED";
  const canComplete =
    canEdit && detail?.status === "HANDOVER" && detail.items.length > 0 && detail.items.every((i) => i.done);
  const showReadonlySummary =
    sheet.type === "view" && detail && !["APPLIED"].includes(detail.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="离职办理"
        description="发起离职审批、办理工作交接，完成后更新员工状态与编制"
        actions={
          canEdit ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="size-4" />
              发起离职
            </Button>
          ) : undefined
        }
      />

      <PanelCard
        title="离职列表"
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
                setStatusFilter(v as OffboardingStatus | "ALL");
                setPage(1);
              }}
              placeholder="状态"
              className="w-[140px]"
              options={[
                { value: "ALL", label: "全部状态" },
                ...OFFBOARDING_STATUS_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
              ]}
            />
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" />
            </Button>
          </>
        }
      >
        {state.type === "loading" ? <PanelLoading message="加载单据…" /> : null}
        {state.type === "error" ? <PanelError error={state.error} onRetry={() => void load()} /> : null}
        {state.type === "ok" && state.items.length === 0 ? (
          <PanelEmpty
            title="暂无离职单"
            description="可选择在职/试用期员工发起离职并提交审批。"
            icon={<Inbox className="size-5 text-muted-foreground" />}
            action={
              canEdit ? (
                <Button size="sm" onClick={openNew}>
                  发起离职
                </Button>
              ) : undefined
            }
          />
        ) : null}
        {state.type === "ok" && state.items.length > 0 ? (
          <>
            <div className="divide-y">
              {state.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  onClick={() => void openView(it)}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30 text-muted-foreground">
                    <UserMinus className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium tracking-tight">
                        {it.employeeName || "—"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {it.employeeNo}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("font-normal", statusBadgeClass(it.status))}
                      >
                        {offboardingStatusLabel(it.status)}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span className="font-mono">{it.caseNo}</span>
                      <span>最后工作日 {it.lastWorkDay}</span>
                      <span>
                        {it.organizationName || "—"} · {it.positionName || "—"}
                      </span>
                    </div>
                  </div>
                </button>
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

      <Sheet open={sheet.type !== "closed"} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{sheet.type === "new" ? "发起离职" : "离职详情"}</SheetTitle>
            <SheetDescription>
              {sheet.type === "new"
                ? "填写最后工作日与离职原因，创建后可维护交接清单并提交审批。"
                : detail?.caseNo || "查看离职办理进度"}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {detailLoading ? <PanelLoading message="加载详情…" /> : null}

            {!detailLoading && isEditable ? (
              <div className="space-y-4">
                {sheet.type === "new" ? (
                  <FormField label="员工" required>
                    <SearchableDialogPicker
                      value={form.employeeId}
                      onChange={applySelectedEmployee}
                      options={mergedEmpPickerOptions}
                      dialogTitle="选择员工"
                      dialogDescription="仅展示在职或试用期员工"
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
                  </FormField>
                ) : (
                  <FormField label="员工">
                    <Input value={form.employeeLabel} disabled />
                  </FormField>
                )}
                <FormField label="最后工作日" required>
                  <Input
                    type="date"
                    value={form.lastWorkDay}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, lastWorkDay: e.target.value }))
                    }
                  />
                </FormField>
                <FormField label="离职原因" required>
                  <OptionSelect
                    value={form.reasonCode}
                    onValueChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        reasonCode: v as OffboardingReasonCode,
                      }))
                    }
                    options={OFFBOARDING_REASON_OPTIONS.map((o) => ({
                      value: o.id,
                      label: o.label,
                    }))}
                  />
                </FormField>
                <FormField label="备注">
                  <Textarea
                    value={form.remark}
                    onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                    rows={3}
                    placeholder="可选"
                  />
                </FormField>
              </div>
            ) : null}

            {!detailLoading && showReadonlySummary && detail ? (
              <OffboardingCaseSummary data={detail} />
            ) : null}

            {!detailLoading && detail && showHandover ? (
              <div className="space-y-3">
                <div className="text-sm font-medium">交接清单</div>
                <ul className="space-y-2">
                  {detail.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2"
                    >
                      {canEdit &&
                      (detail.status === "HANDOVER" || detail.status === "APPLIED") ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "size-7 shrink-0 p-0",
                            item.done &&
                              "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
                          )}
                          disabled={saving}
                          onClick={() => void handleToggleItem(item.id, !item.done)}
                          aria-label={item.done ? "取消完成" : "标记完成"}
                        >
                          <Check className="size-3.5" />
                        </Button>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex size-7 shrink-0 items-center justify-center rounded-md border",
                            item.done
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          <Check className="size-3.5" />
                        </span>
                      )}
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-sm",
                          item.done && "text-muted-foreground line-through",
                        )}
                      >
                        {item.title}
                      </span>
                      {canEdit && detail.status === "APPLIED" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-7 shrink-0 p-0 text-muted-foreground"
                          disabled={saving}
                          onClick={() => void handleRemoveItem(item.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {canEdit &&
                (detail.status === "APPLIED" || detail.status === "HANDOVER") ? (
                  <div className="flex gap-2">
                    <Input
                      value={form.newItemTitle}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, newItemTitle: e.target.value }))
                      }
                      placeholder="新增交接项"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => void handleAddItem()}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                ) : null}
                {detail.status === "APPLIED" ? (
                  <p className="text-[11px] text-muted-foreground">
                    提示：申请阶段可维护清单；审批通过进入交接后勾选完成。
                  </p>
                ) : null}
              </div>
            ) : null}

            {!detailLoading && detail?.workflowInstanceId ? (
              <OnboardingApprovalTimeline
                tasks={approvalTasks}
                loading={approvalLoading}
              />
            ) : null}
          </div>

          <SheetFooter className="flex flex-row flex-wrap justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={closeSheet}>
              关闭
            </Button>
            {canEdit && isEditable ? (
              <>
                <Button type="button" variant="secondary" disabled={saving} onClick={() => void handleSave()}>
                  保存
                </Button>
                <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
                  提交审批
                </Button>
              </>
            ) : null}
            {canEdit &&
            detail &&
            (detail.status === "APPLIED" || detail.status === "APPROVING") ? (
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={() => setCancelTarget(detail)}
              >
                取消
              </Button>
            ) : null}
            {canComplete ? (
              <Button
                type="button"
                disabled={saving}
                onClick={() => setCompleteConfirm(true)}
              >
                完成离职
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="取消离职单"
        description={`确定取消单据 ${cancelTarget?.caseNo ?? ""}？`}
        confirmLabel="确认取消"
        destructive
        elevated
        loading={saving}
        onConfirm={async () => {
          if (!cancelTarget) return;
          setSaving(true);
          try {
            await cancelOffboardingCase(cancelTarget.id);
            toast.success("已取消");
            setCancelTarget(null);
            if (sheet.type === "view" && sheet.id === cancelTarget.id) {
              closeSheet();
            }
            await load();
          } catch (e: unknown) {
            const err = e as ApiError;
            toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
          } finally {
            setSaving(false);
          }
        }}
      />

      <ConfirmDialog
        open={completeConfirm}
        onOpenChange={(open) => !open && setCompleteConfirm(false)}
        title="完成离职"
        description="将结束任职、员工状态改为已离职、写入异动并释放编制。此操作不可撤销。"
        confirmLabel="确认完成"
        elevated
        loading={saving}
        onConfirm={() => void handleComplete()}
      />
    </div>
  );
}
