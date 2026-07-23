import type { OnboardingCase, WorkflowInstanceStatus, WorkflowTask } from "@shared/api.interface";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FlaskConical,
  Inbox,
  RefreshCw,
  UserRound,
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
  SearchInput,
} from "@/components/admin/page-shell";
import {
  SheetEntityHeader,
  SheetEntityIcon,
  SheetEntitySummary,
} from "@/components/admin/sheet-entity-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import {
  formatWorkflowAssignee,
  formatWorkflowInitiator,
} from "@/lib/workflow-person";
import { cn } from "@/lib/utils";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: WorkflowTask[]; total: number };

type TabKey = "todo" | "done";
type BizFilter = "ALL" | "ONBOARDING" | "WORKFLOW_TEST";

const TASK_STATUS_LABEL: Record<WorkflowTask["status"], string> = {
  PENDING: "待处理",
  APPROVED: "已通过",
  REJECTED: "已驳回",
};

const INSTANCE_STATUS_LABEL: Record<WorkflowInstanceStatus, string> = {
  RUNNING: "进行中",
  COMPLETED: "已完成",
  REJECTED: "已驳回",
  CANCELLED: "已取消",
};

const BUSINESS_TYPE_LABEL: Record<string, string> = {
  ONBOARDING: "入职办理",
  WORKFLOW_TEST: "流程测试",
};

const BIZ_FILTER_OPTIONS: Array<{ id: BizFilter; label: string }> = [
  { id: "ALL", label: "全部类型" },
  { id: "ONBOARDING", label: "入职办理" },
  { id: "WORKFLOW_TEST", label: "流程测试" },
];

function toApiError(e: unknown): ApiError {
  if (typeof (e as ApiError)?.message === "string") {
    return { message: (e as ApiError).message, traceId: (e as ApiError).traceId };
  }
  return { message: "请求失败，请重试" };
}

function parseTaskTime(value?: string) {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatShortTime(value?: string) {
  const d = parseTaskTime(value);
  if (!d) return value || "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRelativeTime(value?: string) {
  const d = parseTaskTime(value);
  if (!d) return "";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return formatShortTime(value);
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return formatShortTime(value);
}

function agingDays(value?: string) {
  const d = parseTaskTime(value);
  if (!d) return 0;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function isOnboardingTask(task: WorkflowTask) {
  return task.businessType === "ONBOARDING";
}

function businessTypeLabel(type: string) {
  return BUSINESS_TYPE_LABEL[type] || type;
}

function instanceStatusBadgeClass(status?: WorkflowInstanceStatus) {
  switch (status) {
    case "RUNNING":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400";
    case "COMPLETED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "REJECTED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "CANCELLED":
      return "border-muted-foreground/25 bg-muted/50 text-muted-foreground";
    default:
      return "";
  }
}

function taskStatusBadgeClass(status: WorkflowTask["status"]) {
  switch (status) {
    case "PENDING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "APPROVED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "REJECTED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
  }
}

function TaskTypeIcon({ type }: { type: string }) {
  if (type === "ONBOARDING") {
    return <BriefcaseBusiness className="size-4" />;
  }
  if (type === "WORKFLOW_TEST") {
    return <FlaskConical className="size-4" />;
  }
  return <ClipboardList className="size-4" />;
}

function typeIconClass(type: string) {
  if (type === "ONBOARDING") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400";
  }
  if (type === "WORKFLOW_TEST") {
    return "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-400";
  }
  return "border-border bg-muted/40 text-muted-foreground";
}

function railClass(task: WorkflowTask) {
  if (task.status === "PENDING") {
    const days = agingDays(task.createdAt);
    if (days >= 3) return "bg-destructive";
    return "bg-amber-500";
  }
  if (task.status === "APPROVED") return "bg-emerald-500";
  return "bg-destructive/80";
}

export function AdminTasksPage() {
  const { has } = usePermission();
  const canView = has("workflow:task:view");

  const [tab, setTab] = useState<TabKey>("todo");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [bizFilter, setBizFilter] = useState<BizFilter>("ALL");
  const [state, setState] = useState<LoadState>({ type: "loading" });
  const [todoTotal, setTodoTotal] = useState(0);
  const [doneTotal, setDoneTotal] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<WorkflowTask | null>(null);
  const [historyTasks, setHistoryTasks] = useState<WorkflowTask[]>([]);
  const [onboardingCase, setOnboardingCase] = useState<OnboardingCase | null>(null);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizError, setBizError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState(false);

  const businessType = bizFilter === "ALL" ? undefined : bizFilter;
  const keywordParam = debouncedKeyword.trim() || undefined;

  const loadCounts = useCallback(async () => {
    if (!canView) return;
    try {
      const [todoRes, doneRes] = await Promise.all([
        listTodoTasks({ page: 1, pageSize: 1 }),
        listDoneTasks({ page: 1, pageSize: 1 }),
      ]);
      setTodoTotal(todoRes.data.total);
      setDoneTotal(doneRes.data.total);
    } catch {
      /* 计数失败不阻断主列表 */
    }
  }, [canView]);

  const load = useCallback(async () => {
    if (!canView) {
      setState({ type: "error", error: { message: "无权限访问待办中心" } });
      return;
    }
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const query = {
        page,
        pageSize,
        keyword: keywordParam,
        businessType,
      };
      const res = tab === "todo" ? await listTodoTasks(query) : await listDoneTasks(query);
      setState({ type: "ok", items: res.data.items, total: res.data.total });
      // 概览计数保持未筛选总量；有筛选时不覆盖
      if (!keywordParam && !businessType) {
        if (tab === "todo") setTodoTotal(res.data.total);
        else setDoneTotal(res.data.total);
      }
    } catch (e: unknown) {
      const err = toApiError(e);
      setState({ type: "error", error: err });
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, [canView, tab, page, pageSize, keywordParam, businessType]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const switchTab = (next: TabKey) => {
    if (next === tab) return;
    setTab(next);
    setPage(1);
  };

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
      void loadCounts();
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
      void loadCounts();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setActing(false);
    }
  };

  const items = state.type === "ok" ? state.items : [];
  const total = state.type === "ok" ? state.total : 0;
  const hasFilter = Boolean(keywordParam || businessType);
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
        description="集中处理审批任务，快速定位待办与已办流程。"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void load();
              void loadCounts();
            }}
          >
            <RefreshCw />
            刷新
          </Button>
        }
      />

      <PanelCard
        title={tab === "todo" ? "待办任务" : "已办任务"}
        description={
          tab === "todo"
            ? "按到达时间倒序 · 点击卡片处理"
            : "按处理时间倒序 · 点击卡片查看审批轨迹"
        }
        toolbar={
          <>
            <SearchInput
              value={keyword}
              onChange={(v) => {
                setKeyword(v);
                setPage(1);
              }}
              placeholder="搜索节点、流程、发起人、单号…"
              className="sm:w-[280px]"
            />
            <div className="flex flex-wrap gap-1">
              {BIZ_FILTER_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  type="button"
                  size="sm"
                  variant={bizFilter === opt.id ? "default" : "outline"}
                  className="h-7"
                  onClick={() => {
                    setBizFilter(opt.id);
                    setPage(1);
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </>
        }
      >
        {/* 分段 Tab */}
        <div className="flex items-center gap-1 border-b border-border/70 bg-muted/15 px-3 py-2">
          <button
            type="button"
            onClick={() => switchTab("todo")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "todo"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Inbox className="size-3.5 opacity-70" />
            待办
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                tab === "todo"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {todoTotal}
            </span>
          </button>
          <button
            type="button"
            onClick={() => switchTab("done")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "done"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CheckCircle2 className="size-3.5 opacity-70" />
            已办
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                tab === "done"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {doneTotal}
            </span>
          </button>
        </div>

        {state.type === "loading" ? <PanelLoading message="正在加载任务…" /> : null}

        {state.type === "error" ? (
          <PanelError error={state.error} onRetry={() => void load()} />
        ) : null}

        {state.type === "ok" && items.length === 0 ? (
          <PanelEmpty
            title={
              hasFilter
                ? "未找到匹配任务"
                : tab === "todo"
                  ? "暂无待办"
                  : "暂无已办"
            }
            description={
              hasFilter
                ? "试试缩短关键词，或切换业务类型筛选。"
                : tab === "todo"
                  ? "可在流程配置页测试发起流程，或使用 manager/hr 账号登录处理。"
                  : "处理过的任务会出现在这里，便于回顾审批结果。"
            }
            icon={<Inbox className="size-5 text-muted-foreground" />}
            action={
              hasFilter ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setKeyword("");
                    setBizFilter("ALL");
                    setPage(1);
                  }}
                >
                  清除筛选
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {state.type === "ok" && items.length > 0 ? (
          <>
            <div className="space-y-2.5 p-3 sm:p-4">
              {items.map((task) => {
                const typeLabel = businessTypeLabel(task.businessType);
                const days = agingDays(task.createdAt);
                const aging = task.status === "PENDING" && days >= 3;
                const timeSource =
                  task.status === "PENDING"
                    ? task.createdAt
                    : task.completedAt || task.createdAt;
                const relative = formatRelativeTime(timeSource);
                const absolute = formatShortTime(timeSource);
                const showAbsoluteHint = Boolean(relative && absolute && relative !== absolute);

                return (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void openDetail(task)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void openDetail(task);
                      }
                    }}
                    className={cn(
                      "group relative flex cursor-pointer overflow-hidden rounded-xl border bg-card transition-all",
                      "hover:border-primary/25 hover:bg-primary/[0.02] hover:shadow-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      aging && "border-destructive/25",
                    )}
                  >
                    <div
                      aria-hidden
                      className={cn("w-1 shrink-0 self-stretch", railClass(task))}
                    />
                    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 px-3.5 py-3.5 sm:px-4">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          className={cn(
                            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border",
                            typeIconClass(task.businessType),
                          )}
                        >
                          <TaskTypeIcon type={task.businessType} />
                        </span>
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                              {task.nodeName}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn("font-normal", taskStatusBadgeClass(task.status))}
                            >
                              {TASK_STATUS_LABEL[task.status]}
                            </Badge>
                            {task.instanceStatus ? (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "font-normal",
                                  instanceStatusBadgeClass(task.instanceStatus),
                                )}
                              >
                                流程 · {INSTANCE_STATUS_LABEL[task.instanceStatus]}
                              </Badge>
                            ) : null}
                            {aging ? (
                              <Badge
                                variant="secondary"
                                className="border-destructive/30 bg-destructive/10 font-normal text-destructive"
                              >
                                已等待 {days} 天
                              </Badge>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                            <span className="font-medium text-foreground/80">{typeLabel}</span>
                            <span className="text-border">·</span>
                            <span className="truncate">{task.definitionName}</span>
                            {isOnboardingTask(task) ? (
                              <>
                                <span className="text-border">·</span>
                                <span className="font-mono text-xs text-muted-foreground/90">
                                  #{task.businessId}
                                </span>
                              </>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="size-3 opacity-70" />
                              发起人 {formatWorkflowInitiator(task)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="size-3 opacity-70" />
                              {task.status === "PENDING" ? "到达" : "处理"}{" "}
                              {relative || absolute || "—"}
                              {showAbsoluteHint ? (
                                <span className="text-muted-foreground/60">（{absolute}）</span>
                              ) : null}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {task.status === "PENDING" ? (
                          <Button
                            size="sm"
                            className="bg-blue-600 text-white hover:bg-blue-600/90 dark:bg-blue-600 dark:hover:bg-blue-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              void openDetail(task);
                            }}
                          >
                            处理
                            <ArrowRight />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              void openDetail(task);
                            }}
                          >
                            查看轨迹
                            <ArrowRight className="opacity-60" />
                          </Button>
                        )}
                      </div>
                    </div>
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
          {selected ? (
            <SheetEntityHeader
              icon={
                <SheetEntityIcon className={typeIconClass(selected.businessType)}>
                  <TaskTypeIcon type={selected.businessType} />
                </SheetEntityIcon>
              }
              title={selected.nodeName}
              description={
                onboardingCase
                  ? `${onboardingCase.candidateName} · ${onboardingCase.caseNo}`
                  : `${bizLabel} · ${selected.definitionName}`
              }
              badges={
                <>
                  <Badge
                    variant="secondary"
                    className={cn("font-normal", taskStatusBadgeClass(selected.status))}
                  >
                    我的审批 · {TASK_STATUS_LABEL[selected.status]}
                  </Badge>
                  {selected.instanceStatus ? (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "font-normal",
                        instanceStatusBadgeClass(selected.instanceStatus),
                      )}
                    >
                      流程 · {INSTANCE_STATUS_LABEL[selected.instanceStatus]}
                    </Badge>
                  ) : null}
                </>
              }
              summary={
                <SheetEntitySummary>
                  <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs text-muted-foreground">
                    发起人 {formatWorkflowInitiator(selected)}
                    {selected.createdAt
                      ? ` · 到达 ${formatShortTime(selected.createdAt)}`
                      : ""}
                  </span>
                </SheetEntitySummary>
              }
            />
          ) : null}

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
                <div className="space-y-2.5 rounded-xl border border-border/80 bg-gradient-to-b from-muted/25 to-background px-4 py-3.5 text-sm">
                  <div className="text-[13px] font-semibold tracking-tight">流程摘要</div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">流程</span>
                    <span className="text-right font-medium">{selected.definitionName}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">业务</span>
                    <span className="font-mono text-xs">
                      {selected.businessType}/{selected.businessId}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">处理人</span>
                    <span>{formatWorkflowAssignee(selected)}</span>
                  </div>
                  {selected.instanceStatus ? (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">流程状态</span>
                      <span>{INSTANCE_STATUS_LABEL[selected.instanceStatus]}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!bizLoading ? (
                <OnboardingApprovalTimeline tasks={historyTasks} loading={false} />
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
            <SheetFooter className="shrink-0 p-4">
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={acting}
                  className="h-9 min-w-[96px] border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/15 hover:text-destructive"
                  onClick={() => void handleReject()}
                >
                  <X />
                  驳回
                </Button>
                <Button
                  type="button"
                  disabled={acting}
                  className="h-9 min-w-[112px] bg-blue-600 text-white hover:bg-blue-600/90 dark:bg-blue-600 dark:hover:bg-blue-500"
                  onClick={() => void handleApprove()}
                >
                  <Check />
                  {acting ? "处理中…" : "通过"}
                </Button>
              </div>
            </SheetFooter>
          ) : selected ? (
            <SheetFooter className="shrink-0 p-4">
              <div className="flex w-full justify-end">
                <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
                  关闭
                </Button>
              </div>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
