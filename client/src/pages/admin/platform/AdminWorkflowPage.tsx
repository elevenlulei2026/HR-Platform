import type {
  OrganizationTreeNode,
  Role,
  WorkflowAssigneeOption,
  WorkflowAssigneePreviewItem,
  WorkflowDefinition,
  WorkflowDefinitionJson,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  FlaskConical,
  Inbox,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Rocket,
  Workflow,
} from "lucide-react";

import { getOrganizationTree } from "@/api/organization";
import { listRoles } from "@/api/rbac";
import {
  createWorkflowDefinition,
  DEFAULT_ONBOARDING_DEFINITION,
  deleteWorkflowDefinition,
  disableWorkflowDefinition,
  enableWorkflowDefinition,
  listAssigneeOptions,
  listWorkflowDefinitions,
  previewWorkflowAssignees,
  publishWorkflowDefinition,
  reviseWorkflowDefinition,
  startWorkflowInstance,
  updateWorkflowDefinition,
  validateWorkflowDefinitionJson,
  assigneeRuleLabel,
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
import { WorkflowFlowEditor } from "@/components/admin/workflow/WorkflowFlowEditor";
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
  | { type: "ok"; items: WorkflowDefinition[]; total: number };

const STATUS_LABEL: Record<WorkflowDefinition["status"], string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  DISABLED: "已停用",
  ARCHIVED: "已归档",
};

const STATUS_FILTER = [
  { id: "" as const, label: "全部" },
  { id: "DRAFT" as const, label: "草稿" },
  { id: "PUBLISHED" as const, label: "已发布" },
  { id: "DISABLED" as const, label: "已停用" },
];

function toApiError(e: unknown): ApiError {
  if (typeof (e as ApiError)?.message === "string") {
    return { message: (e as ApiError).message, traceId: (e as ApiError).traceId };
  }
  return { message: "请求失败，请重试" };
}

function flattenOrgTree(nodes: OrganizationTreeNode[], depth = 0): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const n of nodes) {
    const pad = depth > 0 ? `${"—".repeat(Math.min(depth, 3))} ` : "";
    out.push({ id: n.id, label: `${pad}${n.name}` });
    if (n.children?.length) {
      out.push(...flattenOrgTree(n.children, depth + 1));
    }
  }
  return out;
}

export function AdminWorkflowPage() {
  const { has } = usePermission();
  const canManage = has("workflow:manage");

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [statusFilter, setStatusFilter] = useState<"" | WorkflowDefinition["status"]>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowDefinition | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDefinition, setFormDefinition] = useState<WorkflowDefinitionJson>(
    DEFAULT_ONBOARDING_DEFINITION,
  );
  const [saving, setSaving] = useState(false);
  const [roleOptions, setRoleOptions] = useState<Array<{ id: string; label: string }>>([]);

  const [deleteTarget, setDeleteTarget] = useState<WorkflowDefinition | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [testOpen, setTestOpen] = useState(false);
  const [testDefinition, setTestDefinition] = useState<WorkflowDefinition | null>(null);
  const [testBusinessId, setTestBusinessId] = useState("");
  const [assigneeOptions, setAssigneeOptions] = useState<WorkflowAssigneeOption[]>([]);
  const [orgOptions, setOrgOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [initiatorUserId, setInitiatorUserId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [nodeAssignees, setNodeAssignees] = useState<Record<string, string>>({});
  const [previewItems, setPreviewItems] = useState<WorkflowAssigneePreviewItem[]>([]);
  const [previewing, setPreviewing] = useState(false);
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
        status: statusFilter || undefined,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      const err = toApiError(e);
      setState({ type: "error", error: err });
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, [canManage, page, pageSize, debouncedKeyword, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canManage) return;
    void (async () => {
      try {
        const res = await listRoles({ page: 1, pageSize: 200 });
        setRoleOptions(
          (res.data.items as Role[]).map((r) => ({
            id: r.code,
            label: `${r.name}（${r.code}）`,
          })),
        );
      } catch {
        setRoleOptions([]);
      }
    })();
  }, [canManage]);

  const selectNodes = useMemo(() => {
    if (!testDefinition) return [];
    return testDefinition.definitionJson.nodes.filter(
      (n) => n.assigneeRule.type === "INITIATOR_SELECT",
    );
  }, [testDefinition]);

  const openCreate = () => {
    setEditing(null);
    setFormCode("onboarding");
    setFormName("入职审批");
    setFormDescription("顺序审批：组织负责人 → HRBP → HR");
    setFormDefinition(structuredClone(DEFAULT_ONBOARDING_DEFINITION));
    setEditorOpen(true);
  };

  const openEdit = (item: WorkflowDefinition) => {
    setEditing(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormDescription(item.description || "");
    setFormDefinition(structuredClone(item.definitionJson));
    setEditorOpen(true);
  };

  const handleSave = async () => {
    const validationError = validateWorkflowDefinitionJson(formDefinition);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!formName.trim()) {
      toast.error("请填写流程名称");
      return;
    }
    if (!editing && !formCode.trim()) {
      toast.error("请填写流程编码");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateWorkflowDefinition(editing.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          definitionJson: formDefinition,
        });
        toast.success("流程定义已更新");
      } else {
        await createWorkflowDefinition({
          code: formCode.trim(),
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          definitionJson: formDefinition,
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

  const handleDisable = async (item: WorkflowDefinition) => {
    try {
      await disableWorkflowDefinition(item.id);
      toast.success("流程已停用，业务将无法新发起");
      void load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  };

  const handleEnable = async (item: WorkflowDefinition) => {
    try {
      await enableWorkflowDefinition(item.id);
      toast.success("流程已启用");
      void load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  };

  const handleRevise = async (item: WorkflowDefinition) => {
    try {
      const res = await reviseWorkflowDefinition(item.id);
      toast.success("已生成新草稿版本，可继续编辑");
      void load();
      openEdit(res.data);
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
    setOrganizationId("");
    setNodeAssignees({});
    setPreviewItems([]);
    setTestOpen(true);
    try {
      const [usersRes, orgRes] = await Promise.all([
        listAssigneeOptions(),
        getOrganizationTree(),
      ]);
      setAssigneeOptions(usersRes.data);
      setOrgOptions(flattenOrgTree(orgRes.data).slice(0, 80));
    } catch {
      setAssigneeOptions([]);
      setOrgOptions([]);
    }
  };

  const handlePreview = async () => {
    if (!testDefinition) return;
    if (!initiatorUserId) {
      toast.error("请选择发起人");
      return;
    }
    setPreviewing(true);
    try {
      const res = await previewWorkflowAssignees(testDefinition.id, {
        initiatorUserId,
        organizationId: organizationId || undefined,
        nodeAssignees,
      });
      setPreviewItems(res.data.items);
      const failed = res.data.items.filter((i) => !i.resolvable);
      if (failed.length > 0) {
        toast.message(`有 ${failed.length} 个节点暂无法解析审批人`);
      } else {
        toast.success("审批链预览完成");
      }
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setPreviewing(false);
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
    for (const node of selectNodes) {
      if (!nodeAssignees[node.key]) {
        toast.error(`请为「${node.name}」指定审批人`);
        return;
      }
    }

    setStarting(true);
    try {
      await startWorkflowInstance({
        definitionCode: testDefinition.code,
        businessType: "WORKFLOW_TEST",
        businessId: testBusinessId.trim(),
        initiatorUserId,
        organizationId: organizationId || undefined,
        nodeAssignees,
      });
      toast.success("测试流程已发起，可在待办中心按环节处理");
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
  const editorReadOnly = Boolean(editing && editing.status !== "DRAFT");

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
        description="图形化编排顺序审批：拖拽式增删节点，配置汇报线 / 组织角色 / 系统角色；支持修订版本、启停与审批链测试。"
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
            <OptionToggle
              options={STATUS_FILTER}
              value={statusFilter}
              onChange={(v) => {
                setPage(1);
                setStatusFilter(v);
              }}
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
            description="可新建入职审批等流程模板，用图形化方式配置审批链。"
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
                      <Badge
                        variant={
                          item.status === "PUBLISHED"
                            ? "default"
                            : item.status === "DISABLED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {STATUS_LABEL[item.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">v{item.version}</span>
                    </div>
                    {item.description ? (
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    ) : null}
                    <div className="text-xs text-muted-foreground">
                      {item.definitionJson.nodes
                        .map((n) => assigneeRuleLabel(n.assigneeRule.type))
                        .join(" → ")}
                      {item.publishedAt ? ` · 发布于 ${item.publishedAt}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.status === "DRAFT" ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                          <Pencil className="size-3.5" />
                          编辑
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void handlePublish(item)}>
                          <Rocket className="size-3.5" />
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
                      <>
                        <Button size="sm" variant="ghost" onClick={() => void openTestStart(item)}>
                          <FlaskConical className="size-3.5" />
                          测试
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void handleRevise(item)}>
                          <Copy className="size-3.5" />
                          修订
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void handleDisable(item)}>
                          <PowerOff className="size-3.5" />
                          停用
                        </Button>
                      </>
                    ) : null}
                    {item.status === "DISABLED" ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => void handleEnable(item)}>
                          <Power className="size-3.5" />
                          启用
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void handleRevise(item)}>
                          <Copy className="size-3.5" />
                          修订
                        </Button>
                      </>
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
        <SheetContent
          side="right"
          className="gap-0 p-0 data-[side=right]:max-w-[min(1100px,100vw)] sm:max-w-[min(1100px,100vw)]"
        >
          <SheetHeader>
            <SheetTitle>{editing ? "编辑流程定义" : "新建流程定义"}</SheetTitle>
            <SheetDescription>
              用图形化方式配置审批节点与审批人规则，无需手写 JSON。
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="编码" required>
                <Input
                  value={formCode}
                  disabled={Boolean(editing)}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="onboarding"
                />
              </FormField>
              <FormField label="名称" required>
                <Input
                  value={formName}
                  disabled={editorReadOnly}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="说明">
              <Textarea
                value={formDescription}
                disabled={editorReadOnly}
                onChange={(e) => setFormDescription(e.target.value)}
                className="min-h-[60px]"
                placeholder="可选填写流程说明"
              />
            </FormField>
            <FormField label="审批链" required>
              <WorkflowFlowEditor
                value={formDefinition}
                onChange={setFormDefinition}
                readOnly={editorReadOnly}
                roleOptions={roleOptions}
              />
            </FormField>
          </div>
          <SheetFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={saving} onClick={() => setEditorOpen(false)}>
                取消
              </Button>
              {!editorReadOnly ? (
                <Button disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "保存中…" : "保存"}
                </Button>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={testOpen} onOpenChange={setTestOpen}>
        <SheetContent
          side="right"
          className="gap-0 p-0 data-[side=right]:max-w-[min(640px,100vw)] sm:max-w-[min(640px,100vw)]"
        >
          <SheetHeader>
            <SheetTitle>测试流程 · {testDefinition?.name}</SheetTitle>
            <SheetDescription>
              先预览各环节审批人，确认无误后再发起测试实例（businessType=WORKFLOW_TEST）。
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <FormField label="发起人" required hint="影响汇报线 / 任职角色解析；请选择已绑定员工的账号">
              <OptionToggle
                options={assigneeOptions.map((opt) => ({
                  id: opt.id,
                  label: opt.displayName || opt.username,
                }))}
                value={initiatorUserId}
                onChange={setInitiatorUserId}
              />
            </FormField>
            <FormField
              label="组织上下文（可选）"
              hint="用于 ORG_* 规则覆盖；入职类场景可指定待入职组织"
            >
              {orgOptions.length > 0 ? (
                <OptionToggle
                  options={[{ id: "", label: "按发起人主任职" }, ...orgOptions]}
                  value={organizationId}
                  onChange={setOrganizationId}
                />
              ) : (
                <Input
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  placeholder="组织 ID（可选）"
                />
              )}
            </FormField>
            <FormField label="业务单据 ID" required>
              <Input
                value={testBusinessId}
                onChange={(e) => setTestBusinessId(e.target.value)}
                placeholder="DEMO-001"
              />
            </FormField>

            {selectNodes.map((node) => (
              <FormField key={node.key} label={`指定审批人 · ${node.name}`} required>
                <OptionToggle
                  options={assigneeOptions.map((opt) => ({
                    id: opt.id,
                    label: opt.displayName || opt.username,
                  }))}
                  value={nodeAssignees[node.key] ?? ""}
                  onChange={(v) =>
                    setNodeAssignees((prev) => ({
                      ...prev,
                      [node.key]: v,
                    }))
                  }
                />
              </FormField>
            ))}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">审批链预览</div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={previewing}
                  onClick={() => void handlePreview()}
                >
                  {previewing ? "解析中…" : "解析各环节审批人"}
                </Button>
              </div>
              {previewItems.length === 0 ? (
                <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  选择发起人后点击「解析」，查看每个节点将由谁审批
                </div>
              ) : (
                <ol className="space-y-2">
                  {previewItems.map((item, idx) => (
                    <li
                      key={item.nodeKey}
                      className={cn(
                        "rounded-lg border px-3 py-2.5",
                        item.resolvable
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-destructive/30 bg-destructive/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {idx + 1}. {item.nodeName}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {assigneeRuleLabel(item.assigneeRule.type)}
                          </div>
                        </div>
                        {item.resolvable ? (
                          <Badge variant="outline">
                            {item.assigneeDisplayName || item.assigneeUsername}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">无法解析</Badge>
                        )}
                      </div>
                      {!item.resolvable && item.errorMessage ? (
                        <p className="mt-1.5 text-xs text-destructive">{item.errorMessage}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
          <SheetFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={starting} onClick={() => setTestOpen(false)}>
                取消
              </Button>
              <Button disabled={starting} onClick={() => void handleTestStart()}>
                {starting ? "发起中…" : "发起测试"}
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
