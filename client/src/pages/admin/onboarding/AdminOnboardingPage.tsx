import type {
  OnboardingCase,
  OnboardingStatus,
  OrganizationTreeNode,
  WorkflowTask,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Inbox, Link2, Plus, RefreshCw, Shield } from "lucide-react";

import type { ApiError } from "@/api/http";
import { EMPLOYMENT_TYPE_OPTIONS, GENDER_OPTIONS } from "@/api/employee";
import {
  cancelOnboardingCase,
  completeOnboardingCase,
  createOnboardingCase,
  getOnboardingCase,
  listOnboardingApprovalTasks,
  listOnboardingCases,
  ONBOARDING_STATUS_OPTIONS,
  onboardingStatusLabel,
  submitOnboardingCase,
  updateOnboardingCase,
} from "@/api/onboarding";
import {
  defaultDepartmentId,
  filterAssignableDepartments,
  flattenOrgTree,
  getOrganizationTree,
} from "@/api/organization";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormField, OptionToggle } from "@/components/admin/form-field";
import { DepartmentPositionFields } from "@/components/admin/employee-archive/DepartmentPositionFields";
import { OnboardingApprovalTimeline } from "@/components/admin/onboarding/OnboardingApprovalTimeline";
import { OnboardingCaseSummary } from "@/components/admin/onboarding/OnboardingCaseSummary";
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
import { formatWorkflowAssignee } from "@/lib/workflow-person";
import { cn } from "@/lib/utils";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: OnboardingCase[]; total: number };

type SheetMode =
  | { type: "closed" }
  | { type: "new" }
  | { type: "view"; id: string };

type StatusFilter = OnboardingStatus | "ALL";

type FormState = {
  candidateName: string;
  mobile: string;
  gender: string;
  organizationId: string;
  positionId: string;
  expectedHireDate: string;
  employmentType: string;
  remark: string;
};

const EMPTY_FORM: FormState = {
  candidateName: "",
  mobile: "",
  gender: "MALE",
  organizationId: "",
  positionId: "",
  expectedHireDate: new Date().toISOString().slice(0, 10),
  employmentType: "FULL_TIME",
  remark: "",
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "DRAFT":
      return "border-muted-foreground/20 bg-muted/40 text-muted-foreground";
    case "PENDING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "IN_PROGRESS":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400";
    case "COMPLETED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "CANCELLED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "";
  }
}

export function AdminOnboardingPage() {
  const perm = usePermission();
  const canView = perm.has("onboarding:view");
  const canEdit = perm.has("onboarding:edit");

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });

  const [orgs, setOrgs] = useState<OrganizationTreeNode[]>([]);

  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [detail, setDetail] = useState<OnboardingCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approvalTasks, setApprovalTasks] = useState<WorkflowTask[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<OnboardingCase | null>(null);

  const flatOrgs = useMemo(() => flattenOrgTree(orgs), [orgs]);
  const assignableOrgs = useMemo(() => filterAssignableDepartments(flatOrgs), [flatOrgs]);

  const loadRefs = useCallback(async () => {
    const treeRes = await getOrganizationTree();
    setOrgs(treeRes.data);
  }, []);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listOnboardingCases({
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
    if (!canView) return;
    void loadRefs().catch((e: unknown) => {
      toast.error((e as ApiError).message || "加载组织/岗位失败");
    });
  }, [canView, loadRefs]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadApprovalTasks = useCallback(async (caseId: string, hasWorkflow: boolean) => {
    if (!hasWorkflow) {
      setApprovalTasks([]);
      return;
    }
    setApprovalLoading(true);
    try {
      const res = await listOnboardingApprovalTasks(caseId);
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
    setForm({
      ...EMPTY_FORM,
      organizationId: defaultDepartmentId(flatOrgs),
    });
    setSheet({ type: "new" });
  };

  const openView = async (item: OnboardingCase) => {
    setSheet({ type: "view", id: item.id });
    setDetailLoading(true);
    setApprovalTasks([]);
    try {
      const res = await getOnboardingCase(item.id);
      setDetail(res.data);
      setForm({
        candidateName: res.data.candidateName,
        mobile: res.data.mobile,
        gender: res.data.gender || "MALE",
        organizationId: res.data.organizationId,
        positionId: res.data.positionId,
        expectedHireDate: res.data.expectedHireDate,
        employmentType: res.data.employmentType || "FULL_TIME",
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
    candidateName: form.candidateName.trim(),
    mobile: form.mobile.trim(),
    gender: form.gender || undefined,
    organizationId: form.organizationId,
    positionId: form.positionId,
    expectedHireDate: form.expectedHireDate,
    employmentType: form.employmentType || undefined,
    remark: form.remark.trim() || undefined,
  });

  const validateForm = () => {
    if (!form.candidateName.trim()) {
      toast.error("请填写姓名");
      return false;
    }
    if (!form.mobile.trim()) {
      toast.error("请填写手机号");
      return false;
    }
    if (!form.organizationId) {
      toast.error("请选择组织");
      return false;
    }
    if (!form.positionId) {
      toast.error("请选择岗位");
      return false;
    }
    if (!form.expectedHireDate) {
      toast.error("请选择预计入职日");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      if (sheet.type === "new") {
        const res = await createOnboardingCase(payload);
        toast.success("入职单已创建");
        setSheet({ type: "view", id: res.data.id });
        setDetail(res.data);
      } else if (sheet.type === "view" && detail?.status === "DRAFT") {
        const res = await updateOnboardingCase(detail.id, payload);
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
    if (!validateForm()) return;
    setSaving(true);
    try {
      let caseId = detail?.id;
      if (sheet.type === "new" || (detail && detail.status === "DRAFT")) {
        const payload = buildPayload();
        if (sheet.type === "new" || !caseId) {
          const created = await createOnboardingCase(payload);
          caseId = created.data.id;
          setDetail(created.data);
          setSheet({ type: "view", id: caseId });
        } else {
          await updateOnboardingCase(caseId, payload);
        }
      }
      if (!caseId) return;
      const res = await submitOnboardingCase(caseId);
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

  const handleComplete = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await completeOnboardingCase(detail.id);
      toast.success("入职办理已完成");
      setDetail(res.data);
      await load();
    } catch (e: unknown) {
      toast.error((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  const isEditable = sheet.type === "new" || detail?.status === "DRAFT";
  const showReadonly = sheet.type === "view" && detail && detail.status !== "DRAFT";

  if (!canView) {
    return (
      <div className="space-y-5">
        <PageHeader title="入职办理" description="管理待入职单据、审批与建档。" />
        <NoPermissionCard
          icon={<Shield className="size-5 text-muted-foreground" />}
          title="无查看权限"
          description="需要 onboarding:view 权限。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="入职办理"
        description="创建入职单 → 提交审批 → 建档后完成办理。信息采集可由 HR 代填。"
        actions={
          canEdit ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="size-4" />
              新建入职
            </Button>
          ) : null
        }
      />

      <PanelCard
        title="入职单列表"
        toolbar={
          <>
            <SearchInput
              value={keyword}
              onChange={(v) => {
                setKeyword(v);
                setPage(1);
              }}
              placeholder="单据号 / 姓名 / 手机"
            />
            <OptionSelect
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
              placeholder="状态"
              className="w-[140px]"
              options={[
                { value: "ALL", label: "全部状态" },
                ...ONBOARDING_STATUS_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
              ]}
            />
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" />
            </Button>
          </>
        }
      >
        {state.type === "loading" ? <PanelLoading message="加载入职单…" /> : null}
        {state.type === "error" ? <PanelError error={state.error} onRetry={() => void load()} /> : null}
        {state.type === "ok" && state.items.length === 0 ? (
          <PanelEmpty
            title="暂无入职单"
            description="可新建入职办理并提交审批。"
            icon={<Inbox className="size-5 text-muted-foreground" />}
            action={
              canEdit ? (
                <Button size="sm" onClick={openNew}>
                  新建入职
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
                      <span className="text-sm font-medium">{it.candidateName}</span>
                      <Badge variant="secondary" className={cn("font-normal", statusBadgeClass(it.status))}>
                        {onboardingStatusLabel(it.status)}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {it.caseNo} · {it.organizationName || it.organizationId} /{" "}
                      {it.positionName || it.positionId} · 预计 {it.expectedHireDate} · {it.mobile}
                      {it.employeeNo ? ` · 工号 ${it.employeeNo}` : ""}
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
                ? "新建入职"
                : detail
                  ? `${detail.candidateName} · ${onboardingStatusLabel(detail.status)}`
                  : "入职详情"}
            </SheetTitle>
            <SheetDescription>
              {sheet.type === "new"
                ? "填写待入职信息，可保存草稿或直接提交审批。"
                : detail?.caseNo
                  ? `单据号 ${detail.caseNo}`
                  : "查看或办理入职单"}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {detailLoading ? (
              <PanelLoading message="加载详情…" />
            ) : (
              <div className="space-y-4">
                {isEditable ? (
                  <>
                    <FormField label="姓名" required>
                      <Input
                        value={form.candidateName}
                        onChange={(e) => patchForm("candidateName", e.target.value)}
                        placeholder="待入职姓名"
                      />
                    </FormField>
                    <FormField label="手机号" required>
                      <Input
                        value={form.mobile}
                        onChange={(e) => patchForm("mobile", e.target.value)}
                        placeholder="11 位手机号"
                      />
                    </FormField>
                    <FormField label="性别">
                      <OptionToggle
                        options={GENDER_OPTIONS}
                        value={(form.gender as "MALE" | "FEMALE") || "MALE"}
                        onChange={(v) => patchForm("gender", v)}
                      />
                    </FormField>
                    <DepartmentPositionFields
                      layout="stack"
                      organizationId={form.organizationId}
                      positionId={form.positionId}
                      departments={assignableOrgs}
                      organizationsForPath={flatOrgs}
                      organizationRequired
                      positionRequired
                      onOrganizationChange={(organizationId) => {
                        setForm((prev) => ({
                          ...prev,
                          organizationId,
                          positionId: "",
                        }));
                      }}
                      onPositionChange={(positionId) => patchForm("positionId", positionId)}
                    />
                    <FormField label="预计入职日" required>
                      <Input
                        type="date"
                        value={form.expectedHireDate}
                        onChange={(e) => patchForm("expectedHireDate", e.target.value)}
                      />
                    </FormField>
                    <FormField label="用工类型">
                      <OptionToggle
                        options={EMPLOYMENT_TYPE_OPTIONS}
                        value={
                          (form.employmentType as "FULL_TIME" | "INTERN" | "CONTRACT") || "FULL_TIME"
                        }
                        onChange={(v) => patchForm("employmentType", v)}
                      />
                    </FormField>
                    <FormField label="备注">
                      <Textarea
                        value={form.remark}
                        onChange={(e) => patchForm("remark", e.target.value)}
                        rows={3}
                        placeholder="可选"
                      />
                    </FormField>
                    <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                      提交后按「平台 → 流程定义」中已发布的入职流程自动派单审批。默认链路为组织负责人 →
                      HR；可在流程定义中增删节点或调整派单规则。请确保组织已维护负责人，且对应员工已绑定登录账号。
                    </div>
                    <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      <div className="mb-2 font-medium text-foreground">材料 / 合同（占位）</div>
                      入职材料收集与劳动合同签署将在后续切片完善。当前由 HR 代填基础信息即可完成演示。
                      <div className="mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => toast.message("发送员工填写链接将在后续版本提供")}
                        >
                          <Link2 className="size-4" />
                          发送员工填写链接
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}

                {showReadonly && detail ? (
                  <>
                    <OnboardingCaseSummary caseData={detail} />
                    {detail.status === "PENDING" ? (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                        审批进行中
                        {(() => {
                          const pending = approvalTasks.find((t) => t.status === "PENDING");
                          if (!pending) return "。";
                          return `，当前待「${formatWorkflowAssignee(pending)}」处理。`;
                        })()}
                        通过后将自动创建员工档案。
                      </div>
                    ) : null}
                    {detail.status === "IN_PROGRESS" ? (
                      <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-muted-foreground">
                        员工已建档（工号 {detail.employeeNo}）。确认材料与合同办理后，点击「完成办理」。
                      </div>
                    ) : null}
                  </>
                ) : null}

                {(detail?.workflowInstanceId || approvalTasks.length > 0 || approvalLoading) &&
                sheet.type === "view" ? (
                  <div className={cn(showReadonly ? "pt-1" : "pt-2")}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">流程进度</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        disabled={approvalLoading || !detail}
                        onClick={() =>
                          detail &&
                          void loadApprovalTasks(detail.id, Boolean(detail.workflowInstanceId))
                        }
                      >
                        <RefreshCw className={cn("size-3.5", approvalLoading && "animate-spin")} />
                        刷新
                      </Button>
                    </div>
                    <OnboardingApprovalTimeline tasks={approvalTasks} loading={approvalLoading} />
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={closeSheet}>
                关闭
              </Button>
              {canEdit && isEditable ? (
                <>
                  <Button variant="outline" disabled={saving} onClick={() => void handleSave()}>
                    保存草稿
                  </Button>
                  <Button disabled={saving} onClick={() => void handleSubmit()}>
                    提交审批
                  </Button>
                </>
              ) : null}
              {canEdit && detail?.status === "IN_PROGRESS" ? (
                <Button disabled={saving} onClick={() => void handleComplete()}>
                  <CheckCircle2 className="size-4" />
                  完成办理
                </Button>
              ) : null}
              {canEdit && detail && (detail.status === "DRAFT" || detail.status === "PENDING") ? (
                <Button variant="ghost" disabled={saving} onClick={() => setCancelTarget(detail)}>
                  取消单据
                </Button>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="取消入职单"
        description={
          cancelTarget?.status === "PENDING"
            ? "将终止进行中的审批并释放在途编制，确定取消？"
            : "取消后单据不可再编辑，确定继续？"
        }
        confirmLabel="确认取消"
        onConfirm={async () => {
          if (!cancelTarget) return;
          try {
            await cancelOnboardingCase(cancelTarget.id);
            toast.success("已取消");
            setCancelTarget(null);
            if (sheet.type === "view" && sheet.id === cancelTarget.id) {
              const res = await getOnboardingCase(cancelTarget.id);
              setDetail(res.data);
            }
            await load();
          } catch (e: unknown) {
            toast.error((e as ApiError).message);
          }
        }}
        onOpenChange={(o) => !o && setCancelTarget(null)}
      />
    </div>
  );
}
