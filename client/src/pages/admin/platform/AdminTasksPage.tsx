import type { WorkflowTask } from "@shared/api.interface";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  approveTask,
  listDoneTasks,
  listTodoTasks,
  listWorkflowInstanceTasks,
  rejectTask,
} from "@/api/workflow";
import type { ApiError } from "@/api/http";
import { FormField } from "@/components/admin/form-field";
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
import { Check, ClipboardList, Inbox, RefreshCw, X } from "lucide-react";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: WorkflowTask[]; total: number };

const TASK_STATUS_LABEL: Record<WorkflowTask["status"], string> = {
  PENDING: "待处理",
  APPROVED: "已通过",
  REJECTED: "已驳回",
};

function toApiError(e: unknown): ApiError {
  if (typeof (e as ApiError)?.message === "string") {
    return { message: (e as ApiError).message, traceId: (e as ApiError).traceId };
  }
  return { message: "请求失败，请重试" };
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
    setDetailOpen(true);
    try {
      const res = await listWorkflowInstanceTasks(task.instanceId);
      setHistoryTasks(res.data);
    } catch {
      setHistoryTasks([]);
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
    setActing(true);
    try {
      await rejectTask(selected.id, { comment: comment.trim() || undefined });
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
                  {items.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left transition-colors hover:opacity-80"
                        onClick={() => void openDetail(task)}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{task.nodeName}</span>
                            <Badge variant={task.status === "PENDING" ? "default" : "secondary"}>
                              {TASK_STATUS_LABEL[task.status]}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {task.definitionName} · {task.businessType}/{task.businessId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            发起人：{task.initiatorUsername || "—"}
                            {task.createdAt ? ` · ${task.createdAt}` : ""}
                          </div>
                        </div>
                      </button>
                      {task.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={acting}
                            onClick={() => void openDetail(task)}
                          >
                            <X className="size-3.5" />
                            驳回
                          </Button>
                          <Button
                            size="sm"
                            disabled={acting}
                            onClick={async () => {
                              setSelected(task);
                              setComment("");
                              setActing(true);
                              try {
                                await approveTask(task.id, {});
                                toast.success("已通过");
                                void load();
                              } catch (e: unknown) {
                                const err = toApiError(e);
                                toast.error(
                                  err.traceId
                                    ? `${err.message}（traceId: ${err.traceId}）`
                                    : err.message,
                                );
                              } finally {
                                setActing(false);
                              }
                            }}
                          >
                            <Check className="size-3.5" />
                            通过
                          </Button>
                        </div>
                      ) : null}
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
        </TabsContent>
      </Tabs>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="gap-0 p-0">
          <SheetHeader>
            <SheetTitle>{selected?.nodeName || "任务详情"}</SheetTitle>
            <SheetDescription>
              {selected
                ? `${selected.definitionName} · ${selected.businessType}/${selected.businessId}`
                : ""}
            </SheetDescription>
          </SheetHeader>

          {selected ? (
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
                <div>状态：{TASK_STATUS_LABEL[selected.status]}</div>
                <div>发起人：{selected.initiatorUsername || "—"}</div>
                <div>当前处理人：{selected.assigneeUsername || selected.assigneeUserId}</div>
                {selected.comment ? <div>意见：{selected.comment}</div> : null}
              </div>

              {historyTasks.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">审批轨迹</div>
                  <div className="space-y-2">
                    {historyTasks.map((t) => (
                      <div key={t.id} className="rounded-md border px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span>{t.nodeName}</span>
                          <Badge variant="outline">{TASK_STATUS_LABEL[t.status]}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t.assigneeUsername || t.assigneeUserId}
                          {t.completedAt ? ` · ${t.completedAt}` : ""}
                        </div>
                        {t.comment ? (
                          <div className="mt-1 text-xs text-muted-foreground">{t.comment}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selected.status === "PENDING" ? (
                <FormField label="审批意见">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="可选填写审批意见"
                    className="min-h-[80px]"
                  />
                </FormField>
              ) : null}
            </div>
          ) : null}

          {selected?.status === "PENDING" ? (
            <SheetFooter>
              <Button variant="outline" disabled={acting} onClick={() => void handleReject()}>
                <X className="size-4" />
                驳回
              </Button>
              <Button disabled={acting} onClick={() => void handleApprove()}>
                <Check className="size-4" />
                {acting ? "处理中…" : "通过"}
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
