import type {
  ContractChangeRequest,
  ContractChangeRequestType,
  ContractChangeStatus,
  ContractChangeTargetKind,
  EmployeeAgreement,
  EmployeeContract,
  WorkflowTask,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Inbox, Plus, RefreshCw } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  cancelContractChangeRequest,
  CONTRACT_CHANGE_STATUS_OPTIONS,
  CONTRACT_CHANGE_TARGET_OPTIONS,
  contractChangeStatusLabel,
  contractChangeTargetKindLabel,
  createContractChangeRequest,
  getContractChangeRequest,
  listContractChangeApprovalTasks,
  listContractChangeRequests,
  submitContractChangeRequest,
  updateContractChangeRequest,
} from "@/api/contract-change";
import { listEmployees } from "@/api/employee";
import { archiveCrud } from "@/api/employee-archive";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ContractChangeRequestSummary } from "@/components/admin/contract-change/ContractChangeRequestSummary";
import { FormField, OptionToggle } from "@/components/admin/form-field";
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
  | { type: "ok"; items: ContractChangeRequest[]; total: number };

type SheetMode = { type: "closed" } | { type: "new" } | { type: "view"; id: string };

type FormState = {
  employeeId: string;
  employeeLabel: string;
  targetKind: ContractChangeTargetKind;
  sourceRecordId: string;
  proposedStartDate: string;
  proposedEndDate: string;
  proposedEffectiveStartDate: string;
  contractCode: string;
  agreementCode: string;
  opinion: string;
  remark: string;
};

const EMPTY_FORM: FormState = {
  employeeId: "",
  employeeLabel: "",
  targetKind: "CONTRACT",
  sourceRecordId: "",
  proposedStartDate: new Date().toISOString().slice(0, 10),
  proposedEndDate: "",
  proposedEffectiveStartDate: new Date().toISOString().slice(0, 10),
  contractCode: "",
  agreementCode: "",
  opinion: "",
  remark: "",
};

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

function addYears(isoDate: string, years: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type ContractChangeBootstrap = {
  employeeId: string;
  employeeLabel: string;
  targetKind: ContractChangeTargetKind;
  sourceRecordId: string;
  sourceEndDate?: string;
  code?: string;
};

type Props = {
  requestType: ContractChangeRequestType;
  canEdit: boolean;
  bootstrap?: ContractChangeBootstrap | null;
  onBootstrapConsumed?: () => void;
};

export function ContractChangePanel({
  requestType,
  canEdit,
  bootstrap,
  onBootstrapConsumed,
}: Props) {
  const title = requestType === "RENEWAL" ? "续签" : "变更";

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [statusFilter, setStatusFilter] = useState<ContractChangeStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });

  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [detail, setDetail] = useState<ContractChangeRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approvalTasks, setApprovalTasks] = useState<WorkflowTask[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ContractChangeRequest | null>(null);

  const [empSearch, setEmpSearch] = useState("");
  const debouncedEmpSearch = useDebouncedValue(empSearch);
  const [empPickerOptions, setEmpPickerOptions] = useState<SearchableSelectOption[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [sourceOptions, setSourceOptions] = useState<SearchableSelectOption[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listContractChangeRequests({
        page,
        pageSize,
        requestType,
        keyword: debouncedKeyword.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      setState({ type: "error", error: e as ApiError });
    }
  }, [page, pageSize, requestType, debouncedKeyword, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!bootstrap) return;
    const start =
      bootstrap.sourceEndDate && requestType === "RENEWAL"
        ? addDays(bootstrap.sourceEndDate, 1)
        : new Date().toISOString().slice(0, 10);
    setForm({
      ...EMPTY_FORM,
      employeeId: bootstrap.employeeId,
      employeeLabel: bootstrap.employeeLabel,
      targetKind: bootstrap.targetKind,
      sourceRecordId: bootstrap.sourceRecordId,
      proposedStartDate: start,
      proposedEffectiveStartDate: start,
      proposedEndDate: addYears(start, 1),
      contractCode: bootstrap.targetKind === "CONTRACT" ? bootstrap.code || "" : "",
      agreementCode: bootstrap.targetKind === "AGREEMENT" ? bootstrap.code || "" : "",
    });
    setDetail(null);
    setApprovalTasks([]);
    setSheet({ type: "new" });
    onBootstrapConsumed?.();
  }, [bootstrap, onBootstrapConsumed, requestType]);

  useEffect(() => {
    if (sheet.type !== "new") return;
    let cancelled = false;
    void (async () => {
      setEmpLoading(true);
      try {
        const res = await listEmployees({
          page: 1,
          pageSize: 50,
          keyword: debouncedEmpSearch.trim() || undefined,
        });
        if (cancelled) return;
        setEmpPickerOptions(
          res.data.items.map((emp) => ({
            value: emp.id,
            label: emp.fullName,
            code: emp.employeeNo,
            description: [emp.primaryOrganizationName, emp.primaryPositionName]
              .filter(Boolean)
              .join(" · "),
            keywords: `${emp.employeeNo} ${emp.fullName}`,
          })),
        );
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

  useEffect(() => {
    if (sheet.type === "closed" || !form.employeeId) {
      setSourceOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setSourceLoading(true);
      try {
        if (form.targetKind === "CONTRACT") {
          const res = await archiveCrud.contracts.list(form.employeeId);
          if (cancelled) return;
          const items = res.data.filter((c) => c.status !== "INVALID");
          setSourceOptions(
            items.map((c: EmployeeContract) => ({
              value: c.id,
              label: c.contractCode || `合同 #${c.id}`,
              code: c.endDate ? `到期 ${c.endDate}` : c.status,
              description: [c.operationTypeLabel, c.statusLabel].filter(Boolean).join(" · "),
              keywords: `${c.contractCode ?? ""} ${c.id}`,
            })),
          );
        } else {
          const res = await archiveCrud.agreements.list(form.employeeId);
          if (cancelled) return;
          const items = res.data.filter((a) => a.status !== "INVALID");
          setSourceOptions(
            items.map((a: EmployeeAgreement) => ({
              value: a.id,
              label: a.agreementCode || `协议 #${a.id}`,
              code: a.endDate ? `到期 ${a.endDate}` : a.status,
              description: [a.operationTypeLabel, a.statusLabel].filter(Boolean).join(" · "),
              keywords: `${a.agreementCode ?? ""} ${a.id}`,
            })),
          );
        }
      } catch {
        if (!cancelled) setSourceOptions([]);
      } finally {
        if (!cancelled) setSourceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sheet.type, form.employeeId, form.targetKind]);

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
      const res = await listContractChangeApprovalTasks(id);
      setApprovalTasks(res.data);
    } catch {
      setApprovalTasks([]);
    } finally {
      setApprovalLoading(false);
    }
  }, []);

  const openNew = () => {
    setDetail(null);
    setApprovalTasks([]);
    setEmpSearch("");
    setEmpPickerOptions([]);
    setForm({ ...EMPTY_FORM });
    setSheet({ type: "new" });
  };

  const openView = async (item: ContractChangeRequest) => {
    setSheet({ type: "view", id: item.id });
    setDetailLoading(true);
    setApprovalTasks([]);
    try {
      const res = await getContractChangeRequest(item.id);
      setDetail(res.data);
      setForm({
        employeeId: res.data.employeeId,
        employeeLabel: `${res.data.employeeName || ""}（${res.data.employeeNo || ""}）`,
        targetKind: res.data.targetKind,
        sourceRecordId: res.data.sourceRecordId,
        proposedStartDate: res.data.proposedStartDate,
        proposedEndDate: res.data.proposedEndDate || "",
        proposedEffectiveStartDate: res.data.proposedEffectiveStartDate || res.data.proposedStartDate,
        contractCode: res.data.contractCode || "",
        agreementCode: res.data.agreementCode || "",
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
    if (!form.sourceRecordId) {
      toast.error("请选择源档案");
      return false;
    }
    if (!form.proposedStartDate) {
      toast.error("请填写拟开始日期");
      return false;
    }
    return true;
  };

  const buildCreatePayload = () => ({
    requestType,
    targetKind: form.targetKind,
    employeeId: form.employeeId,
    sourceRecordId: form.sourceRecordId,
    proposedStartDate: form.proposedStartDate,
    proposedEndDate: form.proposedEndDate || undefined,
    proposedEffectiveStartDate: form.proposedEffectiveStartDate || form.proposedStartDate,
    contractCode: form.targetKind === "CONTRACT" ? form.contractCode.trim() || undefined : undefined,
    agreementCode:
      form.targetKind === "AGREEMENT" ? form.agreementCode.trim() || undefined : undefined,
    opinion: form.opinion.trim() || undefined,
    remark: form.remark.trim() || undefined,
  });

  const buildUpdatePayload = () => ({
    proposedStartDate: form.proposedStartDate,
    proposedEndDate: form.proposedEndDate || undefined,
    proposedEffectiveStartDate: form.proposedEffectiveStartDate || form.proposedStartDate,
    contractCode: form.targetKind === "CONTRACT" ? form.contractCode.trim() || undefined : undefined,
    agreementCode:
      form.targetKind === "AGREEMENT" ? form.agreementCode.trim() || undefined : undefined,
    opinion: form.opinion.trim() || undefined,
    remark: form.remark.trim() || undefined,
  });

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (sheet.type === "new") {
        const res = await createContractChangeRequest(buildCreatePayload());
        toast.success("单据已创建");
        setSheet({ type: "view", id: res.data.id });
        setDetail(res.data);
      } else if (detail?.status === "DRAFT") {
        const res = await updateContractChangeRequest(detail.id, buildUpdatePayload());
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
          const created = await createContractChangeRequest(buildCreatePayload());
          requestId = created.data.id;
          setDetail(created.data);
          setSheet({ type: "view", id: requestId });
        } else {
          await updateContractChangeRequest(requestId, buildUpdatePayload());
        }
      }
      if (!requestId) return;
      const res = await submitContractChangeRequest(requestId);
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

  const items = state.type === "ok" ? state.items : [];
  const total = state.type === "ok" ? state.total : 0;
  const editable = canEdit && (sheet.type === "new" || detail?.status === "DRAFT");

  return (
    <>
      <PanelCard
        title={`${title}列表`}
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
                setStatusFilter(v as ContractChangeStatus | "ALL");
                setPage(1);
              }}
              placeholder="状态"
              className="w-[140px]"
              options={[
                { value: "ALL", label: "全部状态" },
                ...CONTRACT_CHANGE_STATUS_OPTIONS.map((o) => ({
                  value: o.id,
                  label: o.label,
                })),
              ]}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" />
            </Button>
            {canEdit ? (
              <Button type="button" size="sm" onClick={openNew}>
                <Plus className="size-4" />
                发起{title}
              </Button>
            ) : null}
          </>
        }
      >
        {state.type === "loading" ? <PanelLoading message="加载单据…" /> : null}
        {state.type === "error" ? (
          <PanelError error={state.error} onRetry={() => void load()} />
        ) : null}
        {state.type === "ok" && items.length === 0 ? (
          <PanelEmpty
            icon={<Inbox className="size-5 text-muted-foreground" />}
            title={`暂无${title}单据`}
            description={canEdit ? `点击右上角发起${title}。` : "当前筛选条件下无数据。"}
            action={
              canEdit ? (
                <Button size="sm" onClick={openNew}>
                  发起{title}
                </Button>
              ) : undefined
            }
          />
        ) : null}
        {state.type === "ok" && items.length > 0 ? (
          <>
            <div className="divide-y">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/30"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => void openView(item)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{item.employeeName || "—"}</span>
                      <Badge
                        variant="secondary"
                        className={cn("font-normal", statusBadgeClass(item.status))}
                      >
                        {contractChangeStatusLabel(item.status)}
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        {contractChangeTargetKindLabel(item.targetKind)}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {item.requestNo}
                      {item.employeeNo ? ` · ${item.employeeNo}` : ""}
                      {item.sourceCode ? ` · ${item.sourceCode}` : ""}
                      {item.proposedStartDate ? ` · 拟开始 ${item.proposedStartDate}` : ""}
                    </div>
                  </button>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => void openView(item)}>
                      {item.status === "DRAFT" && canEdit ? "编辑" : "查看"}
                    </Button>
                    {canEdit && (item.status === "DRAFT" || item.status === "PENDING") ? (
                      <Button size="sm" variant="ghost" onClick={() => setCancelTarget(item)}>
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
              total={total}
              itemCount={items.length}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        ) : null}
      </PanelCard>

      <Sheet open={sheet.type !== "closed"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b border-border/70 px-6 py-4">
            <SheetTitle>{sheet.type === "new" ? `发起${title}` : `${title}详情`}</SheetTitle>
            <SheetDescription>
              {sheet.type === "new"
                ? "选择员工与源档案，填写拟签日期后提交审批。"
                : detail?.requestNo || "查看单据与审批进度"}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {detailLoading ? <PanelLoading message="加载详情…" /> : null}

            {!detailLoading && detail && detail.status !== "DRAFT" ? (
              <ContractChangeRequestSummary data={detail} />
            ) : null}

            {!detailLoading && editable ? (
              <div className="space-y-4">
                <FormField label="员工" required>
                  {sheet.type === "new" ? (
                    <SearchableDialogPicker
                      value={form.employeeId}
                      onChange={(v) => {
                        const opt = mergedEmpPickerOptions.find((o) => o.value === v);
                        setForm((prev) => ({
                          ...prev,
                          employeeId: v,
                          employeeLabel: opt
                            ? `${opt.label}（${opt.code || opt.value}）`
                            : prev.employeeLabel,
                          sourceRecordId: "",
                        }));
                      }}
                      options={mergedEmpPickerOptions}
                      dialogTitle="选择员工"
                      dialogDescription="搜索姓名或工号选择员工"
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

                {sheet.type === "new" ? (
                  <FormField label="档案类型" required>
                    <OptionToggle
                      value={form.targetKind}
                      onChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          targetKind: v,
                          sourceRecordId: "",
                        }))
                      }
                      options={CONTRACT_CHANGE_TARGET_OPTIONS.map((o) => ({
                        id: o.id,
                        label: o.label,
                      }))}
                    />
                  </FormField>
                ) : (
                  <FormField label="档案类型">
                    <Input value={contractChangeTargetKindLabel(form.targetKind)} disabled />
                  </FormField>
                )}

                <FormField label="源档案" required>
                  {sheet.type === "new" ? (
                    <OptionSelect
                      value={form.sourceRecordId}
                      onValueChange={(v) =>
                        setForm((prev) => ({ ...prev, sourceRecordId: v }))
                      }
                      allowEmpty
                      emptyLabel={sourceLoading ? "加载中…" : "请选择"}
                      options={sourceOptions.map((o) => ({
                        value: o.value,
                        label: o.code ? `${o.label}（${o.code}）` : o.label,
                      }))}
                      disabled={!form.employeeId}
                      className="w-full"
                    />
                  ) : (
                    <Input
                      value={
                        detail?.sourceCode
                          ? `${detail.sourceCode}${detail.sourceEndDate ? ` · 到期 ${detail.sourceEndDate}` : ""}`
                          : form.sourceRecordId
                      }
                      disabled
                    />
                  )}
                </FormField>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="拟开始日" required>
                    <Input
                      type="date"
                      value={form.proposedStartDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          proposedStartDate: e.target.value,
                          proposedEffectiveStartDate:
                            prev.proposedEffectiveStartDate || e.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="拟结束日">
                    <Input
                      type="date"
                      value={form.proposedEndDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, proposedEndDate: e.target.value }))
                      }
                    />
                  </FormField>
                </div>

                <FormField label="档案生效日">
                  <Input
                    type="date"
                    value={form.proposedEffectiveStartDate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        proposedEffectiveStartDate: e.target.value,
                      }))
                    }
                  />
                </FormField>

                {form.targetKind === "CONTRACT" ? (
                  <FormField label="合同编号">
                    <Input
                      value={form.contractCode}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, contractCode: e.target.value }))
                      }
                      placeholder="可留空，默认沿用源合同"
                    />
                  </FormField>
                ) : (
                  <FormField label="协议编号">
                    <Input
                      value={form.agreementCode}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, agreementCode: e.target.value }))
                      }
                      placeholder="可留空，默认沿用源协议"
                    />
                  </FormField>
                )}

                <FormField label="意见">
                  <Textarea
                    value={form.opinion}
                    onChange={(e) => setForm((prev) => ({ ...prev, opinion: e.target.value }))}
                    rows={3}
                  />
                </FormField>
                <FormField label="备注">
                  <Textarea
                    value={form.remark}
                    onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                    rows={2}
                  />
                </FormField>
              </div>
            ) : null}

            {!detailLoading && detail?.workflowInstanceId ? (
              <OnboardingApprovalTimeline tasks={approvalTasks} loading={approvalLoading} />
            ) : null}
          </div>

          <SheetFooter className="border-t border-border/70 px-6 py-4">
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeSheet}>
                关闭
              </Button>
              {canEdit && detail && (detail.status === "DRAFT" || detail.status === "PENDING") ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saving}
                  onClick={() => setCancelTarget(detail)}
                >
                  取消单据
                </Button>
              ) : null}
              {editable ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void handleSave()}
                  >
                    保存草稿
                  </Button>
                  <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
                    提交审批
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
        loading={saving}
        elevated
        onConfirm={async () => {
          if (!cancelTarget) return;
          setSaving(true);
          try {
            await cancelContractChangeRequest(cancelTarget.id);
            toast.success("已取消");
            setCancelTarget(null);
            if (sheet.type === "view" && sheet.id === cancelTarget.id) closeSheet();
            await load();
          } catch (e: unknown) {
            const err = e as ApiError;
            toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
          } finally {
            setSaving(false);
          }
        }}
      />
    </>
  );
}
