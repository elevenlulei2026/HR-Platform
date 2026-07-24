import type {
  Employee,
  EmployeeAssignmentFormOptions,
  JobMovementRequest,
  JobMovementStatus,
  JobMovementTypeCode,
  OrganizationTreeNode,
  ParentChildOption3,
  WorkflowTask,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Inbox, Plus, RefreshCw } from "lucide-react";

import type { ApiError } from "@/api/http";
import { getEmployeeGroupCatalogOptions } from "@/api/employee-group-catalog";
import {
  EMPTY_EMPLOYEE_ASSIGNMENT_FORM_OPTIONS,
  getEmployee,
  getEmployeeAssignmentFormOptions,
  listEmployees,
} from "@/api/employee";
import {
  cancelJobMovementRequest,
  createJobMovementRequest,
  getJobMovementRequest,
  JOB_MOVEMENT_STATUS_OPTIONS,
  JOB_MOVEMENT_TYPE_META,
  jobMovementStatusLabel,
  listJobMovementApprovalTasks,
  listJobMovementRequests,
  submitJobMovementRequest,
  updateJobMovementRequest,
} from "@/api/job-movement";
import {
  defaultDepartmentId,
  filterAssignableDepartments,
  flattenOrgTree,
  getOrganizationTree,
} from "@/api/organization";
import { getParentChildOptions3 } from "@/api/parent-child-catalog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DepartmentPositionFields } from "@/components/admin/employee-archive/DepartmentPositionFields";
import { FormField } from "@/components/admin/form-field";
import { JobMovementRequestSummary } from "@/components/admin/job-movement/JobMovementRequestSummary";
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
  | { type: "ok"; items: JobMovementRequest[]; total: number };

type SheetMode = { type: "closed" } | { type: "new" } | { type: "view"; id: string };

type FormState = {
  employeeId: string;
  employeeLabel: string;
  fromAssignmentId: string;
  fromOrgId: string;
  fromPositionId: string;
  fromJobGradeCode: string;
  fromGroupCode: string;
  fromSubgroupCode: string;
  effectiveDate: string;
  reasonCode: string;
  reasonSubCode: string;
  organizationId: string;
  positionId: string;
  jobGradeCode: string;
  employeeGroupCode: string;
  employeeSubgroupCode: string;
  opinion: string;
  remark: string;
};

const EMPTY_FORM: FormState = {
  employeeId: "",
  employeeLabel: "",
  fromAssignmentId: "",
  fromOrgId: "",
  fromPositionId: "",
  fromJobGradeCode: "",
  fromGroupCode: "",
  fromSubgroupCode: "",
  effectiveDate: new Date().toISOString().slice(0, 10),
  reasonCode: "",
  reasonSubCode: "",
  organizationId: "",
  positionId: "",
  jobGradeCode: "",
  employeeGroupCode: "",
  employeeSubgroupCode: "",
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

type Props = {
  movementType: JobMovementTypeCode;
  canEdit: boolean;
};

export function JobMovementPanel({ movementType, canEdit }: Props) {
  const meta = JOB_MOVEMENT_TYPE_META[movementType];
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [statusFilter, setStatusFilter] = useState<JobMovementStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });

  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [detail, setDetail] = useState<JobMovementRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approvalTasks, setApprovalTasks] = useState<WorkflowTask[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<JobMovementRequest | null>(null);

  const [orgs, setOrgs] = useState<OrganizationTreeNode[]>([]);
  const [assignmentOptions, setAssignmentOptions] = useState<EmployeeAssignmentFormOptions>(
    EMPTY_EMPLOYEE_ASSIGNMENT_FORM_OPTIONS,
  );
  const [movementCatalog, setMovementCatalog] = useState<ParentChildOption3[]>([]);
  const [groupOptions, setGroupOptions] = useState<
    Array<{ employeeGroupCode: string; employeeGroupName: string; subgroups: Array<{ code: string; name: string }> }>
  >([]);

  const [empSearch, setEmpSearch] = useState("");
  const debouncedEmpSearch = useDebouncedValue(empSearch);
  const [empPickerOptions, setEmpPickerOptions] = useState<SearchableSelectOption[]>([]);
  const [empMetaById, setEmpMetaById] = useState<Record<string, Employee>>({});
  const [empLoading, setEmpLoading] = useState(false);

  const flatOrgs = useMemo(() => flattenOrgTree(orgs), [orgs]);
  const assignableOrgs = useMemo(() => filterAssignableDepartments(flatOrgs), [flatOrgs]);

  const reasons = useMemo(() => {
    const root = movementCatalog.find((m) => m.parentCode === movementType);
    return root?.children ?? [];
  }, [movementCatalog, movementType]);

  const selectedReason = reasons.find((r) => r.code === form.reasonCode);
  const reasonSubs = selectedReason?.children ?? [];
  const selectedGroup = groupOptions.find((g) => g.employeeGroupCode === form.employeeGroupCode);

  const load = useCallback(async () => {
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listJobMovementRequests({
        page,
        pageSize,
        movementType,
        keyword: debouncedKeyword.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      setState({ type: "error", error: e as ApiError });
    }
  }, [page, pageSize, movementType, debouncedKeyword, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void Promise.all([
      getOrganizationTree(),
      getEmployeeAssignmentFormOptions(),
      getParentChildOptions3("MOVEMENT_CATALOG"),
      getEmployeeGroupCatalogOptions(),
    ])
      .then(([tree, opts, catalog, groups]) => {
        setOrgs(tree.data);
        setAssignmentOptions(opts.data);
        setMovementCatalog(catalog.data);
        setGroupOptions(
          groups.data.map((g) => ({
            employeeGroupCode: g.employeeGroupCode,
            employeeGroupName: g.employeeGroupName,
            subgroups: g.subgroups.map((s) => ({ code: s.code, name: s.name })),
          })),
        );
      })
      .catch((e: unknown) => toast.error((e as ApiError).message || "加载选项失败"));
  }, []);

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
        const items = res.data.items.filter(
          (e) => e.status === "ACTIVE" || e.status === "PROBATION",
        );
        setEmpPickerOptions(
          items.map((emp) => ({
            value: emp.id,
            label: emp.fullName,
            code: emp.employeeNo,
            description: [emp.primaryOrganizationName, emp.primaryPositionName]
              .filter(Boolean)
              .join(" · "),
            keywords: `${emp.employeeNo} ${emp.fullName}`,
          })),
        );
        setEmpMetaById((prev) => {
          const next = { ...prev };
          for (const item of items) next[item.id] = item;
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

  const mergedEmpOptions = useMemo(() => {
    const byId = new Map(empPickerOptions.map((o) => [o.value, o]));
    if (form.employeeId && !byId.has(form.employeeId)) {
      byId.set(form.employeeId, {
        value: form.employeeId,
        label: form.employeeLabel.replace(/（.*）$/, "") || form.employeeLabel,
        code: form.employeeLabel.match(/（(.+)）$/)?.[1],
      });
    }
    return [...byId.values()];
  }, [empPickerOptions, form.employeeId, form.employeeLabel]);

  const applyEmployee = async (employeeId: string) => {
    if (!employeeId) {
      setForm((prev) => ({
        ...prev,
        employeeId: "",
        employeeLabel: "",
        fromAssignmentId: "",
        fromOrgId: "",
        fromPositionId: "",
        fromJobGradeCode: "",
        fromGroupCode: "",
        fromSubgroupCode: "",
        organizationId: "",
        positionId: "",
        jobGradeCode: "",
        employeeGroupCode: "",
        employeeSubgroupCode: "",
      }));
      return;
    }
    let emp = empMetaById[employeeId];
    if (!emp?.primaryAssignment) {
      try {
        const res = await getEmployee(employeeId);
        emp = res.data;
        setEmpMetaById((prev) => ({ ...prev, [employeeId]: emp! }));
      } catch (e: unknown) {
        toast.error((e as ApiError).message);
        return;
      }
    }
    const asg = emp.primaryAssignment;
    setForm((prev) => ({
      ...prev,
      employeeId: emp!.id,
      employeeLabel: `${emp!.fullName}（${emp!.employeeNo}）`,
      fromAssignmentId: asg?.id || "",
      fromOrgId: asg?.organizationId || emp!.primaryOrganizationId || "",
      fromPositionId: asg?.positionId || emp!.primaryPositionId || "",
      fromJobGradeCode: asg?.jobGradeCode || "",
      fromGroupCode: asg?.employeeGroupCode || "",
      fromSubgroupCode: asg?.employeeSubgroupCode || "",
      organizationId: asg?.organizationId || emp!.primaryOrganizationId || defaultDepartmentId(flatOrgs),
      positionId: asg?.positionId || emp!.primaryPositionId || "",
      jobGradeCode: asg?.jobGradeCode || "",
      employeeGroupCode: asg?.employeeGroupCode || "",
      employeeSubgroupCode: asg?.employeeSubgroupCode || "",
    }));
  };

  const loadApprovalTasks = useCallback(async (id: string, hasWorkflow: boolean) => {
    if (!hasWorkflow) {
      setApprovalTasks([]);
      return;
    }
    setApprovalLoading(true);
    try {
      const res = await listJobMovementApprovalTasks(id);
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
    setForm({ ...EMPTY_FORM });
    setSheet({ type: "new" });
  };

  const openView = async (item: JobMovementRequest) => {
    setSheet({ type: "view", id: item.id });
    setDetailLoading(true);
    try {
      const res = await getJobMovementRequest(item.id);
      setDetail(res.data);
      setForm({
        employeeId: res.data.employeeId,
        employeeLabel: `${res.data.employeeName || ""}（${res.data.employeeNo || ""}）`,
        fromAssignmentId: res.data.fromAssignmentId,
        fromOrgId: res.data.fromOrganizationId || "",
        fromPositionId: res.data.fromPositionId || "",
        fromJobGradeCode: res.data.fromJobGradeCode || "",
        fromGroupCode: res.data.fromEmployeeGroupCode || "",
        fromSubgroupCode: res.data.fromEmployeeSubgroupCode || "",
        effectiveDate: res.data.effectiveDate,
        reasonCode: res.data.reasonCode,
        reasonSubCode: res.data.reasonSubCode || "",
        organizationId: res.data.organizationId || "",
        positionId: res.data.positionId || "",
        jobGradeCode: res.data.jobGradeCode || "",
        employeeGroupCode: res.data.employeeGroupCode || "",
        employeeSubgroupCode: res.data.employeeSubgroupCode || "",
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

  const buildPayload = () => ({
    movementType,
    employeeId: form.employeeId,
    fromAssignmentId: form.fromAssignmentId || undefined,
    effectiveDate: form.effectiveDate,
    reasonCode: form.reasonCode,
    reasonSubCode: form.reasonSubCode || undefined,
    organizationId: form.organizationId || undefined,
    positionId: form.positionId || undefined,
    jobGradeCode: form.jobGradeCode || undefined,
    employeeGroupCode: form.employeeGroupCode || undefined,
    employeeSubgroupCode: form.employeeSubgroupCode || undefined,
    opinion: form.opinion.trim() || undefined,
    remark: form.remark.trim() || undefined,
  });

  const validate = () => {
    if (!form.employeeId) {
      toast.error("请选择员工");
      return false;
    }
    if (!form.effectiveDate) {
      toast.error("请选择生效日期");
      return false;
    }
    if (!form.reasonCode) {
      toast.error("请选择操作原因");
      return false;
    }
    if (reasonSubs.length > 0 && !form.reasonSubCode) {
      toast.error("请选择原因子项");
      return false;
    }
    if (movementType === "SPR" && !form.employeeGroupCode) {
      toast.error("请选择目标员工组");
      return false;
    }
    if (
      (movementType === "PRO" || movementType === "DEM") &&
      (form.reasonCode === "PR1" ||
        form.reasonCode === "PR2" ||
        form.reasonCode === "D01") &&
      !form.positionId
    ) {
      toast.error("请选择目标岗位");
      return false;
    }
    if (
      (form.reasonCode === "PR3" || form.reasonCode === "D02") &&
      !form.jobGradeCode
    ) {
      toast.error("请选择目标职级");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (sheet.type === "new") {
        const res = await createJobMovementRequest(buildPayload());
        toast.success("单据已创建");
        setSheet({ type: "view", id: res.data.id });
        setDetail(res.data);
      } else if (detail?.status === "DRAFT") {
        const res = await updateJobMovementRequest(detail.id, buildPayload());
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
      let id = detail?.id;
      if (sheet.type === "new" || detail?.status === "DRAFT") {
        if (!id) {
          const created = await createJobMovementRequest(buildPayload());
          id = created.data.id;
          setDetail(created.data);
          setSheet({ type: "view", id });
        } else {
          await updateJobMovementRequest(id, buildPayload());
        }
      }
      if (!id) return;
      const res = await submitJobMovementRequest(id);
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
  const needsPosition =
    form.reasonCode === "PR1" ||
    form.reasonCode === "PR2" ||
    form.reasonCode === "D01" ||
    movementType === "PRO" ||
    movementType === "DEM";
  const needsGrade =
    form.reasonCode === "PR3" ||
    form.reasonCode === "D02" ||
    movementType === "PRO" ||
    movementType === "DEM";

  return (
    <>
      <PanelCard
        title={`${meta.label}列表`}
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
                setStatusFilter(v as JobMovementStatus | "ALL");
                setPage(1);
              }}
              placeholder="状态"
              className="w-[140px]"
              options={[
                { value: "ALL", label: "全部状态" },
                ...JOB_MOVEMENT_STATUS_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
              ]}
            />
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" />
            </Button>
            {canEdit ? (
              <Button size="sm" onClick={openNew}>
                <Plus className="size-4" />
                {meta.actionLabel}
              </Button>
            ) : null}
          </>
        }
      >
        {state.type === "loading" ? <PanelLoading message="加载单据…" /> : null}
        {state.type === "error" ? <PanelError error={state.error} onRetry={() => void load()} /> : null}
        {state.type === "ok" && state.items.length === 0 ? (
          <PanelEmpty
            title={meta.emptyTitle}
            description="可选择在职员工发起并提交审批。"
            icon={<Inbox className="size-5 text-muted-foreground" />}
            action={
              canEdit ? (
                <Button size="sm" onClick={openNew}>
                  {meta.actionLabel}
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
                        {jobMovementStatusLabel(it.status)}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {it.requestNo}
                      {it.employeeNo ? ` · ${it.employeeNo}` : ""} ·{" "}
                      {it.reasonLabel || it.reasonCode}
                      {it.reasonSubLabel ? ` / ${it.reasonSubLabel}` : ""} · 生效{" "}
                      {it.effectiveDate}
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
                ? meta.actionLabel
                : detail
                  ? `${detail.employeeName || meta.label} · ${jobMovementStatusLabel(detail.status)}`
                  : meta.label}
            </SheetTitle>
            <SheetDescription>
              {sheet.type === "new"
                ? "选择员工与三级异动原因，填写变更目标后提交审批（上级 → HRBP）。"
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
                          onChange={(id) => void applyEmployee(id)}
                          options={mergedEmpOptions}
                          dialogTitle="选择员工"
                          dialogDescription="仅展示在职/试用期员工"
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

                    <FormField label="生效日期" required>
                      <Input
                        type="date"
                        value={form.effectiveDate}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))
                        }
                      />
                    </FormField>

                    <FormField label="操作原因" required>
                      <OptionSelect
                        value={form.reasonCode}
                        onValueChange={(v) =>
                          setForm((prev) => ({ ...prev, reasonCode: v, reasonSubCode: "" }))
                        }
                        placeholder="选择原因"
                        options={reasons.map((r) => ({
                          value: r.code,
                          label: `${r.code} ${r.name}`,
                        }))}
                      />
                    </FormField>

                    {reasonSubs.length > 0 ? (
                      <FormField label="原因子项" required>
                        <OptionSelect
                          value={form.reasonSubCode}
                          onValueChange={(v) =>
                            setForm((prev) => ({ ...prev, reasonSubCode: v }))
                          }
                          placeholder="选择子项"
                          options={reasonSubs.map((s) => ({
                            value: s.code,
                            label: `${s.code} ${s.name}`,
                          }))}
                        />
                      </FormField>
                    ) : null}

                    {movementType === "SPR" ? (
                      <>
                        <FormField label="目标员工组" required>
                          <OptionSelect
                            value={form.employeeGroupCode}
                            onValueChange={(v) =>
                              setForm((prev) => ({
                                ...prev,
                                employeeGroupCode: v,
                                employeeSubgroupCode: "",
                              }))
                            }
                            placeholder="选择员工组"
                            options={groupOptions.map((g) => ({
                              value: g.employeeGroupCode,
                              label: `${g.employeeGroupCode} ${g.employeeGroupName}`,
                            }))}
                          />
                        </FormField>
                        <FormField label="目标员工子组">
                          <OptionSelect
                            value={form.employeeSubgroupCode}
                            onValueChange={(v) =>
                              setForm((prev) => ({ ...prev, employeeSubgroupCode: v }))
                            }
                            placeholder="选择员工子组"
                            disabled={!form.employeeGroupCode}
                            options={(selectedGroup?.subgroups ?? []).map((s) => ({
                              value: s.code,
                              label: `${s.code} ${s.name}`,
                            }))}
                          />
                        </FormField>
                      </>
                    ) : (
                      <>
                        {needsPosition ? (
                          <DepartmentPositionFields
                            layout="stack"
                            organizationId={form.organizationId}
                            positionId={form.positionId}
                            departments={assignableOrgs}
                            organizationsForPath={flatOrgs}
                            onOrganizationChange={(orgId, posId) =>
                              setForm((prev) => ({
                                ...prev,
                                organizationId: orgId,
                                positionId: posId,
                              }))
                            }
                            onPositionChange={(posId) =>
                              setForm((prev) => ({ ...prev, positionId: posId }))
                            }
                            organizationRequired
                            positionRequired={
                              form.reasonCode === "PR1" ||
                              form.reasonCode === "PR2" ||
                              form.reasonCode === "D01"
                            }
                          />
                        ) : null}
                        {needsGrade ? (
                          <FormField
                            label="目标职级"
                            required={form.reasonCode === "PR3" || form.reasonCode === "D02"}
                          >
                            <OptionSelect
                              value={form.jobGradeCode}
                              onValueChange={(v) =>
                                setForm((prev) => ({ ...prev, jobGradeCode: v }))
                              }
                              placeholder="选择职级"
                              options={assignmentOptions.jobGrades.map((o) => ({
                                value: o.value,
                                label: o.label,
                              }))}
                            />
                          </FormField>
                        ) : null}
                      </>
                    )}

                    <FormField label="意见">
                      <Textarea
                        value={form.opinion}
                        onChange={(e) => setForm((prev) => ({ ...prev, opinion: e.target.value }))}
                        className="min-h-[72px] resize-none"
                        placeholder="可选"
                      />
                    </FormField>
                    <FormField label="备注">
                      <Textarea
                        value={form.remark}
                        onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                        className="min-h-[64px] resize-none"
                        placeholder="可选"
                      />
                    </FormField>
                  </>
                ) : null}

                {showReadonly && detail ? <JobMovementRequestSummary data={detail} /> : null}

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
            await cancelJobMovementRequest(cancelTarget.id);
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
