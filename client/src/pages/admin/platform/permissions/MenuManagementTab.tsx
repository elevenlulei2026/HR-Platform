import type { SysMenu, SysMenuType } from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";

import { createMenu, deleteMenu, getAdminMenuTree, updateMenu } from "@/api/menu";
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
import { PanelCard, PanelEmpty, PanelError, PanelLoading } from "@/components/admin/page-shell";
import { cn } from "@/lib/utils";

type MenuForm = {
  parentId: string;
  code: string;
  title: string;
  path: string;
  icon: string;
  menuType: SysMenuType;
  permissionCode: string;
  sortOrder: number;
  status: "ACTIVE" | "DISABLED";
  description: string;
};

const MENU_TYPE_OPTIONS: Array<{ id: SysMenuType; label: string }> = [
  { id: "MEGA", label: "顶栏 Mega" },
  { id: "GROUP", label: "分组" },
  { id: "ITEM", label: "菜单项" },
];

function emptyMenuForm(parentId = ""): MenuForm {
  return {
    parentId,
    code: "",
    title: "",
    path: "",
    icon: "",
    menuType: parentId ? "ITEM" : "MEGA",
    permissionCode: "",
    sortOrder: 10,
    status: "ACTIVE",
    description: "",
  };
}

function menuFormFromEntity(m: SysMenu): MenuForm {
  return {
    parentId: m.parentId ?? "",
    code: m.code,
    title: m.title,
    path: m.path ?? "",
    icon: m.icon ?? "",
    menuType: m.menuType,
    permissionCode: m.permissionCode ?? "",
    sortOrder: m.sortOrder,
    status: m.status,
    description: m.description ?? "",
  };
}

export function MenuManagementTab() {
  const [state, setState] = useState<LoadState<SysMenu[]>>({ type: "loading" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<SysMenu | null>(null);
  const [form, setForm] = useState<MenuForm>(emptyMenuForm());
  const [deleteTarget, setDeleteTarget] = useState<SysMenu | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await getAdminMenuTree();
      setState({ type: "ok", data: res.data });
      setExpanded((prev) => {
        if (prev.size > 0) return prev;
        return new Set(res.data.map((m) => m.id));
      });
    } catch (e: unknown) {
      setState({ type: "error", error: toApiError(e) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const menus = state.type === "ok" ? state.data : [];
  const flatMenus = useMemo(() => flattenMenus(menus), [menus]);
  const selected = useMemo(
    () => (selectedId ? flatMenus.find((m) => m.id === selectedId) ?? null : null),
    [flatMenus, selectedId],
  );

  const parentOptions = useMemo(
    () =>
      flatMenus
        .filter((m) => m.menuType !== "ITEM")
        .map((m) => ({ id: m.id, label: `${"—".repeat(m.depth)} ${m.title}` })),
    [flatMenus],
  );

  const openCreate = (parentId = "") => {
    setSheetMode("create");
    setEditing(null);
    setForm(emptyMenuForm(parentId));
    setSheetOpen(true);
  };

  const openEdit = (menu: SysMenu) => {
    setSheetMode("edit");
    setEditing(menu);
    setForm(menuFormFromEntity(menu));
    setSheetOpen(true);
  };

  const submit = async () => {
    try {
      if (!form.code.trim() && sheetMode === "create") throw new Error("请输入菜单编码");
      if (!form.title.trim()) throw new Error("请输入菜单标题");

      const payload = {
        parentId: form.parentId || undefined,
        title: form.title.trim(),
        path: form.path.trim() || undefined,
        icon: form.icon.trim() || undefined,
        menuType: form.menuType,
        permissionCode: form.permissionCode.trim() || undefined,
        sortOrder: form.sortOrder,
        status: form.status,
        description: form.description.trim() || undefined,
      };

      if (sheetMode === "create") {
        await createMenu({ ...payload, code: form.code.trim() });
        toast.success("菜单已创建");
      } else if (editing) {
        await updateMenu(editing.id, payload);
        toast.success("菜单已更新");
      }
      setSheetOpen(false);
      await load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteMenu(deleteTarget.id);
      toast.success("菜单已停用");
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderTree = (items: SysMenu[], depth = 0) =>
    items.map((m) => {
      const hasChildren = (m.children?.length ?? 0) > 0;
      const isExpanded = expanded.has(m.id);
      const active = selectedId === m.id;

      return (
        <div key={m.id}>
          <div
            className={cn(
              "group flex items-center gap-1 rounded-lg border border-transparent pr-2 transition-colors",
              active && "border-primary/30 bg-primary/5",
              !active && "hover:bg-accent/40",
            )}
            style={{ marginLeft: depth * 16 }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground"
                onClick={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(m.id)) next.delete(m.id);
                    else next.add(m.id);
                    return next;
                  })
                }
              >
                {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
            ) : (
              <span className="size-7 shrink-0" />
            )}
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
              onClick={() => setSelectedId(m.id)}
            >
              <span className="truncate text-sm font-medium">{m.title}</span>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {m.menuType}
              </span>
              <StatusBadge status={m.status} />
            </button>
            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              {m.menuType !== "ITEM" ? (
                <Button size="sm" variant="ghost" onClick={() => openCreate(m.id)}>
                  <Plus className="size-3.5" />
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => setDeleteTarget(m)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          {hasChildren && isExpanded ? renderTree(m.children!, depth + 1) : null}
        </div>
      );
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <PanelCard
        title="菜单树"
        description="维护 Admin 顶栏导航结构，与路由和菜单权限联动"
        toolbar={
          <Button size="sm" onClick={() => openCreate()}>
            <Plus />
            新建顶级菜单
          </Button>
        }
      >
        <div className="p-4">
          {state.type === "loading" ? <PanelLoading message="加载菜单树…" /> : null}
          {state.type === "error" ? <PanelError error={state.error} onRetry={() => void load()} /> : null}
          {state.type === "ok" && menus.length === 0 ? (
            <PanelEmpty
              icon={<FolderTree className="size-5 text-muted-foreground" />}
              title="暂无菜单"
              description="创建第一个菜单节点"
              action={
                <Button size="sm" onClick={() => openCreate()}>
                  新建菜单
                </Button>
              }
            />
          ) : null}
          {state.type === "ok" && menus.length > 0 ? (
            <div className="space-y-1">{renderTree(menus)}</div>
          ) : null}
        </div>
      </PanelCard>

      <PanelCard title="菜单详情" description="选中左侧节点查看">
        <div className="p-4">
          {!selected ? (
            <PanelEmpty compact title="未选择菜单" description="点击左侧菜单节点查看详情" />
          ) : (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">标题</dt>
                <dd className="font-medium">{selected.title}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">编码</dt>
                <dd className="font-mono text-xs">{selected.code}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">类型</dt>
                <dd>{selected.menuType}</dd>
              </div>
              {selected.path ? (
                <div>
                  <dt className="text-xs text-muted-foreground">路由</dt>
                  <dd className="font-mono text-xs">{selected.path}</dd>
                </div>
              ) : null}
              {selected.permissionCode ? (
                <div>
                  <dt className="text-xs text-muted-foreground">菜单权限点</dt>
                  <dd className="font-mono text-xs">{selected.permissionCode}</dd>
                </div>
              ) : null}
              {selected.description ? (
                <div>
                  <dt className="text-xs text-muted-foreground">说明</dt>
                  <dd className="text-muted-foreground">{selected.description}</dd>
                </div>
              ) : null}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                  编辑
                </Button>
                {selected.menuType !== "ITEM" ? (
                  <Button size="sm" onClick={() => openCreate(selected.id)}>
                    添加子菜单
                  </Button>
                ) : null}
              </div>
            </dl>
          )}
        </div>
      </PanelCard>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="gap-0 p-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{sheetMode === "create" ? "新建菜单" : "编辑菜单"}</SheetTitle>
            <SheetDescription>菜单变更将影响顶栏导航与权限分组展示。</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {sheetMode === "create" ? (
              <FormField label="菜单编码" required hint="唯一标识，创建后不可修改">
                <Input
                  value={form.code}
                  onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                  className="font-mono"
                  placeholder="employee_roster"
                />
              </FormField>
            ) : null}
            <FormField label="上级菜单">
              <OptionSelect
                value={form.parentId}
                onValueChange={(parentId) => setForm((s) => ({ ...s, parentId }))}
                options={parentOptions.map((o) => ({ value: o.id, label: o.label }))}
                allowEmpty
                emptyLabel="无（顶级）"
                disabled={sheetMode === "edit"}
                className="w-full"
              />
            </FormField>
            <FormField label="菜单标题" required>
              <Input
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              />
            </FormField>
            <FormField label="菜单类型">
              <OptionToggle
                options={MENU_TYPE_OPTIONS}
                value={form.menuType}
                onChange={(menuType) => setForm((s) => ({ ...s, menuType }))}
              />
            </FormField>
            {form.menuType === "ITEM" ? (
              <FormField label="路由路径" hint="对应 /admin/* 路径">
                <Input
                  value={form.path}
                  onChange={(e) => setForm((s) => ({ ...s, path: e.target.value }))}
                  className="font-mono"
                  placeholder="/admin/employees/roster"
                />
              </FormField>
            ) : null}
            <FormField label="图标" hint="lucide-react 图标名，如 Shield、Building2">
              <Input
                value={form.icon}
                onChange={(e) => setForm((s) => ({ ...s, icon: e.target.value }))}
                className="font-mono"
              />
            </FormField>
            <FormField label="菜单权限点" hint="控制该菜单是否可见，如 employee:roster:view">
              <Input
                value={form.permissionCode}
                onChange={(e) => setForm((s) => ({ ...s, permissionCode: e.target.value }))}
                className="font-mono"
              />
            </FormField>
            <FormField label="排序">
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((s) => ({ ...s, sortOrder: Number(e.target.value) || 0 }))}
              />
            </FormField>
            <FormField label="状态">
              <OptionToggle
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(status) => setForm((s) => ({ ...s, status }))}
              />
            </FormField>
            <FormField label="说明">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                rows={2}
              />
            </FormField>
          </div>
          <SheetFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                取消
              </Button>
              <Button onClick={() => void submit()}>保存</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="停用菜单"
        description={`确定停用「${deleteTarget?.title ?? ""}」？子菜单可能一并不可见。`}
        confirmLabel="停用"
        destructive
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
