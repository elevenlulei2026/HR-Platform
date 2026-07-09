import type { Permission, RbacStatus } from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Wand2 } from "lucide-react";

import { getAdminMenuTree } from "@/api/menu";
import {
  createPermission,
  deletePermission,
  listPermissions,
  updatePermission,
} from "@/api/rbac";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
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
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormField, OptionToggle, STATUS_OPTIONS } from "@/components/admin/form-field";
import { OptionSelect } from "@/components/admin/option-select";
import { flattenMenus } from "@/components/admin/rbac/menu-utils";
import { StatusBadge, toApiError, type LoadState } from "@/components/admin/rbac/rbac-shared";
import {
  PERMISSION_CATALOG,
  buildPermissionCode,
  buildPermissionName,
  findCatalogModule,
  findCatalogResource,
} from "@/config/permission-catalog";
import {
  PaginationBar,
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  SearchInput,
} from "@/components/admin/page-shell";
import { cn } from "@/lib/utils";

type StatusFilter = RbacStatus | "ALL";

type WizardForm = {
  moduleCode: string;
  resourceCode: string;
  selectedActions: string[];
  namePrefix: string;
  description: string;
  menuId: string;
};

function emptyWizard(): WizardForm {
  const first = PERMISSION_CATALOG[0];
  const firstRes = first.resources[0];
  return {
    moduleCode: first.code,
    resourceCode: firstRes.code,
    selectedActions: [],
    namePrefix: "",
    description: "",
    menuId: "",
  };
}

export function PermissionCatalogTab() {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [moduleFilter, setModuleFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [state, setState] = useState<LoadState<{ items: Permission[]; total: number }>>({
    type: "loading",
  });
  const [menusState, setMenusState] = useState<LoadState<Array<{ id: string; label: string }>>>({
    type: "loading",
  });

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizard, setWizard] = useState<WizardForm>(emptyWizard);
  const [wizardSaving, setWizardSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<RbacStatus>("ACTIVE");

  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listPermissions({
        page,
        pageSize,
        keyword: debouncedKeyword.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        moduleCode: moduleFilter || undefined,
      });
      setState({ type: "ok", data: { items: res.data.items, total: res.data.total } });
    } catch (e: unknown) {
      setState({ type: "error", error: toApiError(e) });
    }
  }, [debouncedKeyword, moduleFilter, page, pageSize, statusFilter]);

  const loadMenus = useCallback(async () => {
    try {
      const res = await getAdminMenuTree();
      const flat = flattenMenus(res.data);
      setMenusState({
        type: "ok",
        data: flat
          .filter((m) => m.menuType === "ITEM")
          .map((m) => ({ id: m.id, label: m.title })),
      });
    } catch (e: unknown) {
      setMenusState({ type: "error", error: toApiError(e) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadMenus();
  }, [loadMenus]);

  const items = state.type === "ok" ? state.data.items : [];
  const total = state.type === "ok" ? state.data.total : 0;

  const wizardModule = findCatalogModule(wizard.moduleCode);
  const wizardResource = findCatalogResource(wizard.moduleCode, wizard.resourceCode);

  const previewCodes = useMemo(() => {
    if (!wizardResource) return [];
    return wizard.selectedActions.map((action) =>
      buildPermissionCode(wizard.moduleCode, wizard.resourceCode, action),
    );
  }, [wizard.moduleCode, wizard.resourceCode, wizard.selectedActions, wizardResource]);

  const openEdit = (p: Permission) => {
    setEditing(p);
    setEditName(p.name);
    setEditDesc(p.description ?? "");
    setEditStatus(p.status);
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      await updatePermission(editing.id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        status: editStatus,
      });
      toast.success("权限点已更新");
      setEditOpen(false);
      await load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  };

  const submitWizard = async () => {
    if (wizard.selectedActions.length === 0) {
      toast.error("请至少选择一个操作");
      return;
    }
    setWizardSaving(true);
    try {
      let okCount = 0;
      const failed: string[] = [];
      for (const action of wizard.selectedActions) {
        const code = buildPermissionCode(wizard.moduleCode, wizard.resourceCode, action);
        const autoName = buildPermissionName(wizard.moduleCode, wizard.resourceCode, action);
        const name = wizard.namePrefix.trim()
          ? `${wizard.namePrefix.trim()}-${autoName.split("-").pop()}`
          : autoName;
        try {
          await createPermission({
            code,
            name,
            description: wizard.description.trim() || undefined,
            menuId: wizard.menuId || undefined,
            moduleCode: wizard.moduleCode,
            resourceCode: wizard.resourceCode,
            actionCode: action,
          });
          okCount += 1;
        } catch (e: unknown) {
          failed.push(code);
          const err = toApiError(e);
          if (failed.length === 1) {
            toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
          }
        }
      }
      if (okCount > 0) {
        toast.success(
          failed.length > 0
            ? `已处理 ${okCount} 项，${failed.length} 项失败（${failed.join("、")}）`
            : `已处理 ${okCount} 项权限点（新建或更新已有项）`,
        );
        setWizardOpen(false);
        setWizard(emptyWizard());
        await load();
      }
    } finally {
      setWizardSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deletePermission(deleteTarget.id);
      toast.success("权限点已停用");
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleWizardAction = (action: string) => {
    setWizard((s) => {
      const set = new Set(s.selectedActions);
      if (set.has(action)) set.delete(action);
      else set.add(action);
      return { ...s, selectedActions: Array.from(set) };
    });
  };

  return (
    <div className="space-y-4">
      <PanelCard
        title="权限目录"
        description="维护系统权限点；推荐使用向导按模块/资源/操作自动生成编码"
        toolbar={
          <Button size="sm" onClick={() => { setWizard(emptyWizard()); setWizardOpen(true); }}>
            <Wand2 />
            权限向导
          </Button>
        }
      >
        <div className="space-y-3 border-b px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={keyword}
              onChange={(v) => { setKeyword(v); setPage(1); }}
              placeholder="搜索名称或 code"
              className="w-full sm:w-[240px]"
            />
            <OptionSelect
              value={moduleFilter}
              onValueChange={(v) => { setModuleFilter(v); setPage(1); }}
              options={PERMISSION_CATALOG.map((m) => ({ value: m.code, label: m.label }))}
              allowEmpty
              emptyLabel="全部模块"
              className="w-full sm:w-[160px]"
            />
            <OptionToggle
              options={[
                { id: "ACTIVE" as const, label: "启用" },
                { id: "DISABLED" as const, label: "停用" },
                { id: "ALL" as const, label: "全部" },
              ]}
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
            />
          </div>
        </div>

        {state.type === "loading" ? <PanelLoading message="加载权限点…" /> : null}
        {state.type === "error" ? (
          <PanelError error={state.error} onRetry={() => void load()} />
        ) : null}

        {state.type === "ok" && items.length === 0 ? (
          <PanelEmpty title="暂无权限点" description="使用权限向导快速创建" />
        ) : null}

        {state.type === "ok" && items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">名称</th>
                    <th className="px-4 py-2.5 font-medium">权限 code</th>
                    <th className="px-4 py-2.5 font-medium">模块</th>
                    <th className="px-4 py-2.5 font-medium">状态</th>
                    <th className="px-4 py-2.5 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        {p.description ? (
                          <div className="mt-0.5 text-xs text-muted-foreground">{p.description}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.code}</td>
                      <td className="px-4 py-3">
                        {p.moduleCode ? (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {p.moduleCode}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            disabled={p.status === "DISABLED"}
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent side="right" className="gap-0 p-0 sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>权限向导</SheetTitle>
            <SheetDescription>
              无需手写 code：选择模块、资源和操作后，系统自动生成标准权限编码。
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <FormField label="1. 选择模块">
              <div className="flex flex-wrap gap-1.5">
                {PERMISSION_CATALOG.map((m) => (
                  <Button
                    key={m.code}
                    type="button"
                    size="sm"
                    variant={wizard.moduleCode === m.code ? "default" : "outline"}
                    onClick={() =>
                      setWizard((s) => ({
                        ...s,
                        moduleCode: m.code,
                        resourceCode: m.resources[0]?.code ?? "",
                        selectedActions: [],
                      }))
                    }
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </FormField>

            <FormField label="2. 选择资源">
              <div className="flex flex-wrap gap-1.5">
                {(wizardModule?.resources ?? []).map((r) => (
                  <Button
                    key={r.code}
                    type="button"
                    size="sm"
                    variant={wizard.resourceCode === r.code ? "default" : "outline"}
                    onClick={() =>
                      setWizard((s) => ({ ...s, resourceCode: r.code, selectedActions: [] }))
                    }
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </FormField>

            <FormField label="3. 勾选操作（可多选）">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(wizardResource?.actions ?? []).map((a) => {
                  const checked = wizard.selectedActions.includes(a.code);
                  return (
                    <button
                      key={a.code}
                      type="button"
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        checked ? "border-primary bg-primary/8" : "hover:bg-accent/50",
                      )}
                      onClick={() => toggleWizardAction(a.code)}
                    >
                      <div className="font-medium">{a.label}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{a.code}</div>
                    </button>
                  );
                })}
              </div>
            </FormField>

            <FormField label="关联菜单（可选）" hint="关联后可在角色授权时按菜单分组">
              <OptionSelect
                value={wizard.menuId}
                onValueChange={(menuId) => setWizard((s) => ({ ...s, menuId }))}
                options={menusState.type === "ok" ? menusState.data.map((m) => ({ value: m.id, label: m.label })) : []}
                allowEmpty
                emptyLabel="不关联"
                className="w-full"
              />
            </FormField>

            <FormField label="名称前缀（可选）" hint="留空则使用「资源-操作」自动命名">
              <Input
                value={wizard.namePrefix}
                onChange={(e) => setWizard((s) => ({ ...s, namePrefix: e.target.value }))}
                placeholder="例如：花名册"
              />
            </FormField>

            <FormField label="说明">
              <Textarea
                value={wizard.description}
                onChange={(e) => setWizard((s) => ({ ...s, description: e.target.value }))}
                rows={2}
              />
            </FormField>

            {previewCodes.length > 0 ? (
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs font-medium text-muted-foreground">将创建以下权限 code</div>
                <ul className="mt-2 space-y-1 font-mono text-xs">
                  {previewCodes.map((code) => (
                    <li key={code}>{code}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <SheetFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setWizardOpen(false)}>
                取消
              </Button>
              <Button onClick={() => void submitWizard()} disabled={wizardSaving}>
                {wizardSaving ? "创建中…" : `创建 ${wizard.selectedActions.length} 项`}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="gap-0 p-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>编辑权限点</SheetTitle>
            <SheetDescription>权限 code 创建后不可修改。</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <FormField label="权限 code">
              <Input value={editing?.code ?? ""} disabled className="font-mono" />
            </FormField>
            <FormField label="名称" required>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </FormField>
            <FormField label="说明">
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
            </FormField>
            <FormField label="状态">
              <OptionToggle
                options={STATUS_OPTIONS}
                value={editStatus}
                onChange={setEditStatus}
              />
            </FormField>
          </div>
          <SheetFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button onClick={() => void submitEdit()}>保存</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="停用权限点"
        description={`确定停用「${deleteTarget?.name ?? ""}」（${deleteTarget?.code ?? ""}）？停用后默认列表不再显示，角色授权中也会移除。`}
        confirmLabel="停用"
        destructive
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
