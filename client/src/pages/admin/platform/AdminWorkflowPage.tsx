import type {
  WorkflowAssigneeOption,
  WorkflowDefinition,
  WorkflowDefinitionJson,
} from "@shared/api.interface";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createWorkflowDefinition,
  DEFAULT_ONBOARDING_DEFINITION,
  deleteWorkflowDefinition,
  listAssigneeOptions,
  listWorkflowDefinitions,
  publishWorkflowDefinition,
  startWorkflowInstance,
  updateWorkflowDefinition,
  validateWorkflowDefinitionJson,
} from "@/api/workflow";
import type { ApiError } from "@/api/http";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormField, OptionToggle } from "@/components/admin/form-field";
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
import { Inbox, Plus, RefreshCw, Workflow } from "lucide-react";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: WorkflowDefinition[]; total: number };

const STATUS_LABEL: Record<WorkflowDefinition["status"], string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  ARCHIVED: "已归档",
};

function toApiError(e: unknown): ApiError {
  if (typeof (e as ApiError)?.message === "string") {
    return { message: (e as ApiError).message, traceId: (e as ApiError).traceId };
  }
  return { message: "请求失败，请重试" };
}

function parseDefinitionJson(text: string): WorkflowDefinitionJson | null {
  try {
    return JSON.parse(text) as WorkflowDefinitionJson;
  } catch {
    return null;
  }
}

export function AdminWorkflowPage() {
  const { has } = usePermission();
  const canManage = has("workflow:manage");

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowDefinition | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formJsonText, setFormJsonText] = useState(
    JSON.stringify(DEFAULT_ONBOARDING_DEFINITION, null, 2),
  );
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<WorkflowDefinition | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [testOpen, setTestOpen] = useState(false);
  const [testDefinition, setTestDefinition] = useState<WorkflowDefinition | null>(null);
  const [testBusinessId, setTestBusinessId] = useState("");
  const [assigneeOptions, setAssigneeOptions] = useState<WorkflowAssigneeOption[]>([]);
  const [initiatorUserId, setInitiatorUserId] = useState("");
  const [finalAssigneeId, setFinalAssigneeId] = useState("");
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    if (!canManage) {
      setState({ type: "error", error: { message: "无权限访问流程配置" } });
      return;
    }
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listWorkflowDefinitions({
        page,
        pageSize,
        keyword: debouncedKeyword.trim() || undefined,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      const err = toApiError(e);
      setState({ type: "error", error: err });
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, [canManage, page, pageSize, debouncedKeyword]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormCode("onboarding");
    setFormName("入职审批");
    setFormDescription("顺序审批：直属上级 → HR → 发起人自选");
    setFormJsonText(JSON.stringify(DEFAULT_ONBOARDING_DEFINITION, null, 2));
    setEditorOpen(true);
  };

  const openEdit = (item: WorkflowDefinition) => {
    setEditing(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormDescription(item.description || "");
    setFormJsonText(JSON.stringify(item.definitionJson, null, 2));
    setEditorOpen(true);
  };

  const handleSave = async () => {
    const parsed = parseDefinitionJson(formJsonText);
    if (!parsed) {
      toast.error("definitionJson 不是合法 JSON");
      return;
    }
    const validationError = validateWorkflowDefinitionJson(parsed);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateWorkflowDefinition(editing.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          definitionJson: parsed,
        });
        toast.success("流程定义已更新");
      } else {
        await createWorkflowDefinition({
          code: formCode.trim(),
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          definitionJson: parsed,
        });
        toast.success("流程定义已创建");
      }
      setEditorOpen(false);
      void load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (item: WorkflowDefinition) => {
    try {
      await publishWorkflowDefinition(item.id);
      toast.success("流程定义已发布");
      void load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWorkflowDefinition(deleteTarget.id);
      toast.success("草稿已删除");
      setDeleteTarget(null);
      void load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setDeleting(false);
    }
  };

  const openTestStart = async (item: WorkflowDefinition) => {
    setTestDefinition(item);
    setTestBusinessId(`DEMO-${Date.now()}`);
    setInitiatorUserId("");
    setFinalAssigneeId("");
    setTestOpen(true);
    try {
      const res = await listAssigneeOptions();
      setAssigneeOptions(res.data);
    } catch {
      setAssigneeOptions([]);
    }
  };

  const handleTestStart = async () => {
    if (!testDefinition) return;
    if (!initiatorUserId) {
      toast.error("请选择发起人");
      return;
    }
    if (!testBusinessId.trim()) {
      toast.error("请填写业务单据 ID");
      return;
    }

    const needsFinalAssignee = testDefinition.definitionJson.nodes.some(
      (n) => n.assigneeRule.type === "INITIATOR_SELECT",
    );
    if (needsFinalAssignee && !finalAssigneeId) {
      toast.error("请选择 INITIATOR_SELECT 节点的审批人");
      return;
    }

    setStarting(true);
    try {
      const nodeAssignees: Record<string, string> = {};
      const selectNode = testDefinition.definitionJson.nodes.find(
        (n) => n.assigneeRule.type === "INITIATOR_SELECT",
      );
      if (selectNode && finalAssigneeId) {
        nodeAssignees[selectNode.key] = finalAssigneeId;
      }

      await startWorkflowInstance({
        definitionCode: testDefinition.code,
        businessType: "ONBOARDING",
        businessId: testBusinessId.trim(),
        initiatorUserId,
        nodeAssignees,
      });
      toast.success("流程已发起，可在待办中心处理");
      setTestOpen(false);
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setStarting(false);
    }
  };

  const items = state.type === "ok" ? state.items : [];
  const total = state.type === "ok" ? state.total : 0;

  if (!canManage) {
    return (
      <NoPermissionCard
        icon={<Workflow className="size-5 text-muted-foreground" />}
        title="无权限访问流程配置"
        description="需要 workflow:manage 权限"
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="流程配置"
        description="配置顺序审批流程定义（JSON），发布后可被业务模块或测试发起引用。"
      />

      <PanelCard
        title="流程定义列表"
        toolbar={
          <>
            <SearchInput
              value={keyword}
              onChange={(v) => {
                setPage(1);
                setKeyword(v);
              }}
              placeholder="按编码/名称搜索"
            />
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw />
              刷新
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus />
              新建流程
            </Button>
          </>
        }
      >
        {state.type === "loading" ? <PanelLoading message="正在加载流程定义…" /> : null}

        {state.type === "error" ? (
          <PanelError error={state.error} onRetry={() => void load()} />
        ) : null}

        {state.type === "ok" && items.length === 0 ? (
          <PanelEmpty
            title="暂无流程定义"
            description="可新建入职审批等流程模板。"
            icon={<Inbox className="size-5 text-muted-foreground" />}
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus />
                新建流程
              </Button>
            }
          />
        ) : null}

        {state.type === "ok" && items.length > 0 ? (
          <>
            <div className="divide-y">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="outline">{item.code}</Badge>
                      <Badge variant={item.status === "PUBLISHED" ? "default" : "secondary"}>
                        {STATUS_LABEL[item.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">v{item.version}</span>
                    </div>
                    {item.description ? (
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    ) : null}
                    <div className="text-xs text-muted-foreground">
                      节点数：{item.definitionJson.nodes.length}
                      {item.publishedAt ? ` · 发布于 ${item.publishedAt}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.status === "DRAFT" ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                          编辑
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void handlePublish(item)}>
                          发布
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(item)}
                        >
                          删除
                        </Button>
                      </>
                    ) : null}
                    {item.status === "PUBLISHED" ? (
                      <Button size="sm" variant="ghost" onClick={() => void openTestStart(item)}>
                        测试发起
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

      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent side="right" className="gap-0 p-0">
          <SheetHeader>
            <SheetTitle>{editing ? "编辑流程定义" : "新建流程定义"}</SheetTitle>
            <SheetDescription>
              definitionJson 须包含顺序 nodes 数组，支持 DIRECT_MANAGER / ROLE / INITIATOR_SELECT。
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <FormField label="编码" required>
              <Input
                value={formCode}
                disabled={Boolean(editing)}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="onboarding"
              />
            </FormField>
            <FormField label="名称" required>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </FormField>
            <FormField label="说明">
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="min-h-[60px]"
                placeholder="可选填写流程说明"
              />
            </FormField>
            <FormField label="definitionJson" required hint="JSON 格式，包含 nodes 顺序审批节点">
              <Textarea
                className="min-h-[280px] font-mono text-xs"
                value={formJsonText}
                onChange={(e) => setFormJsonText(e.target.value)}
              />
            </FormField>
          </div>
          <SheetFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={saving} onClick={() => setEditorOpen(false)}>
                取消
              </Button>
              <Button disabled={saving} onClick={() => void handleSave()}>
                {saving ? "保存中…" : "保存"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={testOpen} onOpenChange={setTestOpen}>
        <SheetContent side="right" className="gap-0 p-0">
          <SheetHeader>
            <SheetTitle>测试发起流程</SheetTitle>
            <SheetDescription>
              模拟 HR 代发起：请选择真实发起人（影响直属上级节点），businessType 固定为 ONBOARDING。
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <FormField
              label="发起人"
              required
              hint="入职流程首个节点为直属上级，请选 employee（上级为 manager）"
            >
              <OptionToggle
                options={assigneeOptions.map((opt) => ({
                  id: opt.id,
                  label: opt.username,
                }))}
                value={initiatorUserId}
                onChange={setInitiatorUserId}
              />
            </FormField>
            <FormField label="业务单据 ID" required>
              <Input
                value={testBusinessId}
                onChange={(e) => setTestBusinessId(e.target.value)}
                placeholder="ONB-2026-0001"
              />
            </FormField>
            {testDefinition?.definitionJson.nodes.some(
              (n) => n.assigneeRule.type === "INITIATOR_SELECT",
            ) ? (
              <FormField label="指定审批人（INITIATOR_SELECT）" required>
                <OptionToggle
                  options={assigneeOptions.map((opt) => ({
                    id: opt.id,
                    label: opt.username,
                  }))}
                  value={finalAssigneeId}
                  onChange={setFinalAssigneeId}
                />
              </FormField>
            ) : null}
          </div>
          <SheetFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={starting} onClick={() => setTestOpen(false)}>
                取消
              </Button>
              <Button disabled={starting} onClick={() => void handleTestStart()}>
                {starting ? "发起中…" : "发起"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="删除草稿"
        description={`确认删除草稿「${deleteTarget?.name ?? ""}」？删除后不可恢复。`}
        confirmLabel="删除"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
