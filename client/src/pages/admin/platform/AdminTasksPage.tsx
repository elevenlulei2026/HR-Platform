import type { OnboardingCase, WorkflowTask } from "@shared/api.interface";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BriefcaseBusiness,
  Check,
  ClipboardList,
  Inbox,
  RefreshCw,
  X,
} from "lucide-react";

import {
  approveTask,
  listDoneTasks,
  listTodoTasks,
  listWorkflowInstanceTasks,
  rejectTask,
} from "@/api/workflow";
import { getOnboardingCase } from "@/api/onboarding";
import type { ApiError } from "@/api/http";
import { FormField } from "@/components/admin/form-field";
import { OnboardingApprovalTimeline } from "@/components/admin/onboarding/OnboardingApprovalTimeline";
import { OnboardingCaseSummary } from "@/components/admin/onboarding/OnboardingCaseSummary";
import {
  NoPermissionCard,
  PageHeader,
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  PaginationBar,
} from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: WorkflowTask[]; total: number };

const TASK_STATUS_LABEL: Record<WorkflowTask["status"], string> = {
  PENDING: "待处理",
  APPROVED: "已通过",
  REJECTED: "已驳回",
};

const BUSINESS_TYPE_LABEL: Record<string, string> = {
  ONBOARDING: "入职办理",
  WORKFLOW_TEST: "流程测试",
};

function toApiError(e: unknown): ApiError {
  if (typeof (e as ApiError)?.message === "string") {
    return { message: (e as ApiError).message, traceId: (e as ApiError).traceId };
  }
  return { message: "请求失败，请重试" };
}

function formatShortTime(value?: string) {
  if (!value) return "";
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isOnboardingTask(task: WorkflowTask) {
  return task.businessType === "ONBOARDING";
}

export function AdminTasksPage() {
  const { has } = usePermission();
  const canView = has("workflow:task:view");

  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<WorkflowTask | null>(null);
  const [historyTasks, setHistoryTasks] = useState<WorkflowTask[]>([]);
  const [onboardingCase, setOnboardingCase] = useState<OnboardingCase | null>(null);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizError, setBizError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!canView) {
      setState({ type: "error", error: { message: "无权限访问待办中心" } });
      return;
    }
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res =
        tab === "todo"
          ? await listTodoTasks({ page, pageSize })
          : await listDoneTasks({ page, pageSize });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      const err = toApiError(e);
      setState({ type: "error", error: err });
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, [canView, tab, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (task: WorkflowTask) => {
    setSelected(task);
    setComment("");
    setOnboardingCase(null);
    setBizError(null);
    setHistoryTasks([]);
    setDetailOpen(true);
    setBizLoading(true);
    try {
      const historyPromise = listWorkflowInstanceTasks(task.instanceId)
        .then((res) => setHistoryTasks(res.data))
        .catch(() => setHistoryTasks([]));

      const casePromise = isOnboardingTask(task)
        ? getOnboardingCase(task.businessId)
            .then((res) => {
              setOnboardingCase(res.data);
              setBizError(null);
            })
            .catch((e: unknown) => {
              setOnboardingCase(null);
              setBizError(toApiError(e).message || "加载入职单失败");
            })
        : Promise.resolve();

      await Promise.all([historyPromise, casePromise]);
    } finally {
      setBizLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await approveTask(selected.id, { comment: comment.trim() || undefined });
      toast.success("已通过");
      setDetailOpen(false);
      void load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!comment.trim()) {
      toast.error("驳回请填写审批意见");
      return;
    }
    setActing(true);
    try {
      await rejectTask(selected.id, { comment: comment.trim() });
      toast.success("已驳回");
      setDetailOpen(false);
      void load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setActing(false);
    }
  };

  const items = state.type === "ok" ? state.items : [];
  const total = state.type === "ok" ? state.total : 0;
  const bizLabel = selected
    ? BUSINESS_TYPE_LABEL[selected.businessType] || selected.definitionName
    : "";

  if (!canView) {
    return (
      <NoPermissionCard
        icon={<ClipboardList className="size-5 text-muted-foreground" />}
        title="无权限访问待办中心"
        description="需要 workflow:task:view 权限"
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="待办中心"
        description="处理分配给你的审批任务，支持通过/驳回。"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as "todo" | "done");
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="todo">待办</TabsTrigger>
          <TabsTrigger value="done">已办</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <PanelCard>
            {state.type === "loading" ? <PanelLoading message="正在加载任务…" /> : null}

            {state.type === "error" ? (
              <PanelError error={state.error} onRetry={() => void load()} />
            ) : null}

            {state.type === "ok" && items.length === 0 ? (
              <PanelEmpty
                title={tab === "todo" ? "暂无待办" : "暂无已办"}
                description={
                  tab === "todo"
                    ? "可在流程配置页测试发起流程，或使用 manager/hr 账号登录处理。"
                    : "处理过的任务会出现在这里。"
                }
                icon={<Inbox className="size-5 text-muted-foreground" />}
              />
            ) : null}

            {state.type === "ok" && items.length > 0 ? (
              <>
                <div className="divide-y">
                  {items.map((task) => {
                    const typeLabel =
                      BUSINESS_TYPE_LABEL[task.businessType] || task.definitionName;
                    return (
                      <div
                        key={task.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/25"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => void openDetail(task)}
                        >
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {isOnboardingTask(task) ? (
                                <span className="flex size-6 items-center justify-center rounded-md border border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400">
                                  <BriefcaseBusiness className="size-3.5" />
                                </span>
                              ) : null}
                              <span className="font-medium tracking-tight">{task.nodeName}</span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "font-normal",
                                  task.status === "PENDING" &&
                                    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                                  task.status === "APPROVED" &&
                                    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                                  task.status === "REJECTED" &&
                                    "border-destructive/30 bg-destructive/10 text-destructive",
                                )}
                              >
                                {TASK_STATUS_LABEL[task.status]}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {typeLabel}
                              {isOnboardingTask(task) ? (
                                <span className="text-muted-foreground/80">
                                  {" "}
                                  · 单据 #{task.businessId}
                                </span>
                              ) : (
                                <span className="font-mono text-xs">
                                  {" "}
                                  · {task.businessType}/{task.businessId}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              发起人 {task.initiatorUsername || "—"}
                              {task.createdAt ? ` · ${formatShortTime(task.createdAt)}` : ""}
                            </div>
                          </div>
                        </button>
                        {task.status === "PENDING" ? (
                          <Button size="sm" variant="outline" onClick={() => void openDetail(task)}>
                            处理
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => void openDetail(task)}>
                            查看
                          </Button>
                        )}
                      </div>
                    );
                  })}
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
        </TabsContent>
      </Tabs>

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelected(null);
            setOnboardingCase(null);
            setHistoryTasks([]);
            setComment("");
          }
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0">
            <SheetTitle className="pr-2">
              {selected?.nodeName || "任务详情"}
              {onboardingCase ? (
                <span className="mt-1 block truncate text-sm font-normal text-muted-foreground">
                  {onboardingCase.candidateName} · {onboardingCase.caseNo}
                </span>
              ) : null}
            </SheetTitle>
            <SheetDescription>
              {selected
                ? `${bizLabel} · ${TASK_STATUS_LABEL[selected.status]} · 发起人 ${
                    selected.initiatorUsername || "—"
                  }`
                : ""}
            </SheetDescription>
          </SheetHeader>

          {selected ? (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {bizLoading ? <PanelLoading message="加载业务详情…" /> : null}

              {!bizLoading && isOnboardingTask(selected) ? (
                onboardingCase ? (
                  <OnboardingCaseSummary caseData={onboardingCase} />
                ) : (
                  <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-4 py-5 text-center text-xs text-destructive">
                    {bizError || "未能加载入职单详情"}
                  </div>
                )
              ) : null}

              {!bizLoading && !isOnboardingTask(selected) ? (
                <div className="space-y-2 rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">流程</span>
                    <span className="font-medium">{selected.definitionName}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">业务</span>
                    <span className="font-mono text-xs">
                      {selected.businessType}/{selected.businessId}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">处理人</span>
                    <span>{selected.assigneeUsername || selected.assigneeUserId}</span>
                  </div>
                </div>
              ) : null}

              {!bizLoading && historyTasks.length > 0 ? (
                <OnboardingApprovalTimeline tasks={historyTasks} />
              ) : null}

              {selected.status === "PENDING" ? (
                <FormField
                  label="审批意见"
                  hint="通过可选填；驳回必须填写原因"
                  required={false}
                >
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="请填写审批意见…"
                    className="min-h-[96px] resize-none"
                  />
                </FormField>
              ) : selected.comment ? (
                <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm">
                  <div className="text-xs text-muted-foreground">本节点意见</div>
                  <div className="mt-1">{selected.comment}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {selected?.status === "PENDING" ? (
            <SheetFooter className="shrink-0 flex-row items-center gap-2 p-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={acting}
                className="h-9 min-w-[96px] border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/15 hover:text-destructive"
                onClick={() => void handleReject()}
              >
                <X className="size-4" />
                驳回
              </Button>
              <Button
                type="button"
                disabled={acting}
                className="h-9 min-w-[112px] bg-blue-600 text-white hover:bg-blue-600/90 dark:bg-blue-600 dark:hover:bg-blue-500"
                onClick={() => void handleApprove()}
              >
                <Check className="size-4" />
                {acting ? "处理中…" : "通过"}
              </Button>
            </SheetFooter>
          ) : selected ? (
            <SheetFooter className="shrink-0 flex-row justify-end p-4">
              <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
                关闭
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
