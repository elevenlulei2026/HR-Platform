import type { Permission, Role, SysMenu } from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronRight, RefreshCw, Save, Shield } from "lucide-react";

import {
  createRole,
  deleteRole,
  listPermissions,
  listRoleOrgScopes,
  listRolePermissions,
  listRoles,
  setRoleOrgScopes,
  setRolePermissions,
  updateRole,
} from "@/api/rbac";
import { getAdminMenuTree } from "@/api/menu";
import { useAuth } from "@/auth/AuthProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
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
import { OrgScopePicker } from "@/components/admin/rbac/OrgScopePicker";
import {
  buildPermissionNavMenus,
  findMenuById,
  flattenMenus,
  permissionsForMenuNode,
} from "@/components/admin/rbac/menu-utils";
import {
  DataScopeBadge,
  DATA_SCOPE_OPTIONS,
  StatusBadge,
  toApiError,
  type LoadState,
} from "@/components/admin/rbac/rbac-shared";
import {
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  SearchInput,
} from "@/components/admin/page-shell";
import { cn } from "@/lib/utils";
import type { DataScope } from "@shared/api.interface";

type RoleForm = {
  code: string;
  name: string;
  description: string;
  status: "ACTIVE" | "DISABLED";
  dataScope: DataScope;
};

function PermissionCheckRow({
  permission,
  checked,
  onToggle,
}: {
  permission: Permission;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/60",
        checked && "bg-primary/5",
      )}
      onClick={onToggle}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
        )}
      >
        {checked ? <Check className="size-2.5" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{permission.name}</span>
        <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{permission.code}</span>
        {permission.description ? (
          <span className="mt-1 block text-xs text-muted-foreground">{permission.description}</span>
        ) : null}
      </span>
    </button>
  );
}

export function RoleAuthorizationTab() {
  const { refreshMe } = useAuth();
  const [roleKeyword, setRoleKeyword] = useState("");
  const debouncedRoleKeyword = useDebouncedValue(roleKeyword);

  const [rolesState, setRolesState] = useState<LoadState<Role[]>>({ type: "loading" });
  const [menusState, setMenusState] = useState<LoadState<SysMenu[]>>({ type: "loading" });
  const [permissionsState, setPermissionsState] = useState<LoadState<Permission[]>>({ type: "loading" });

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [rolePermState, setRolePermState] = useState<LoadState<Set<string>>>({ type: "loading" });
  const [orgScopeIds, setOrgScopeIds] = useState<string[]>([]);
  const [orgScopeDirty, setOrgScopeDirty] = useState(false);

  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [roleSheetMode, setRoleSheetMode] = useState<"create" | "edit">("create");
  const [roleEditing, setRoleEditing] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState<RoleForm>({
    code: "",
    name: "",
    description: "",
    status: "ACTIVE",
    dataScope: "ALL",
  });
  const [roleFormOrgIds, setRoleFormOrgIds] = useState<string[]>([]);

  const [deleteRoleTarget, setDeleteRoleTarget] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [scopeSaving, setScopeSaving] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const loadRoles = useCallback(async () => {
    try {
      setRolesState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listRoles({ page: 1, pageSize: 200, keyword: debouncedRoleKeyword.trim() || undefined });
      setRolesState({ type: "ok", data: res.data.items });
    } catch (e: unknown) {
      setRolesState({ type: "error", error: toApiError(e) });
    }
  }, [debouncedRoleKeyword]);

  const loadMenus = useCallback(async () => {
    try {
      setMenusState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await getAdminMenuTree();
      setMenusState({ type: "ok", data: res.data });
      setExpandedMenus((prev) => {
        if (prev.size > 0) return prev;
        return new Set(res.data.map((m) => m.id));
      });
    } catch (e: unknown) {
      setMenusState({ type: "error", error: toApiError(e) });
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    try {
      setPermissionsState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listPermissions({ page: 1, pageSize: 500, status: "ACTIVE" });
      setPermissionsState({ type: "ok", data: res.data.items });
    } catch (e: unknown) {
      setPermissionsState({ type: "error", error: toApiError(e) });
    }
  }, []);

  const loadRolePermissions = useCallback(async (roleId: string) => {
    try {
      setRolePermState({ type: "loading" });
      const res = await listRolePermissions(roleId);
      setRolePermState({ type: "ok", data: new Set(res.data) });
    } catch (e: unknown) {
      setRolePermState({ type: "error", error: toApiError(e) });
    }
  }, []);

  const loadOrgScopes = useCallback(async (roleId: string) => {
    try {
      const res = await listRoleOrgScopes(roleId);
      setOrgScopeIds(res.data);
      setOrgScopeDirty(false);
    } catch {
      setOrgScopeIds([]);
      setOrgScopeDirty(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);
  useEffect(() => {
    void loadMenus();
    void loadPermissions();
  }, [loadMenus, loadPermissions]);

  const roles = rolesState.type === "ok" ? rolesState.data : [];
  const menus = menusState.type === "ok" ? menusState.data : [];
  const permissions = permissionsState.type === "ok" ? permissionsState.data : [];

  const selectedRole = useMemo(
    () => (selectedRoleId ? roles.find((r) => r.id === selectedRoleId) ?? null : null),
    [roles, selectedRoleId],
  );

  useEffect(() => {
    if (!selectedRoleId) return;
    void loadRolePermissions(selectedRoleId);
    void loadOrgScopes(selectedRoleId);
  }, [loadOrgScopes, loadRolePermissions, selectedRoleId]);

  const navMenus = useMemo(() => buildPermissionNavMenus(menus), [menus]);

  useEffect(() => {
    if (!selectedMenuId && navMenus.length > 0) {
      const first = flattenMenus(navMenus).find((m) => m.menuType === "ITEM") ?? navMenus[0];
      setSelectedMenuId(first?.id ?? null);
    }
  }, [navMenus, selectedMenuId]);

  const selectedMenu = useMemo(
    () => (selectedMenuId ? findMenuById(navMenus, selectedMenuId) : null),
    [navMenus, selectedMenuId],
  );

  const visiblePermissions = useMemo(
    () => permissionsForMenuNode(selectedMenu, permissions, menus),
    [menus, permissions, selectedMenu],
  );

  const openCreateRole = () => {
    setRoleSheetMode("create");
    setRoleEditing(null);
    setRoleForm({ code: "", name: "", description: "", status: "ACTIVE", dataScope: "ALL" });
    setRoleFormOrgIds([]);
    setRoleSheetOpen(true);
  };

  const openEditRole = (role: Role) => {
    setRoleSheetMode("edit");
    setRoleEditing(role);
    setRoleForm({
      code: role.code,
      name: role.name,
      description: role.description || "",
      status: role.status,
      dataScope: role.dataScope,
    });
    setRoleFormOrgIds(role.orgScopeIds ?? []);
    void listRoleOrgScopes(role.id).then((res) => setRoleFormOrgIds(res.data));
    setRoleSheetOpen(true);
  };

  const submitRole = async () => {
    try {
      if (!roleForm.code.trim() && roleSheetMode === "create") throw new Error("请输入角色编码");
      if (!roleForm.name.trim()) throw new Error("请输入角色名称");
      if (roleForm.dataScope === "CUSTOM" && roleFormOrgIds.length === 0) {
        throw new Error("自定义组织范围至少选择一个组织");
      }

      if (roleSheetMode === "create") {
        const res = await createRole({
          code: roleForm.code.trim(),
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || undefined,
          status: roleForm.status,
          dataScope: roleForm.dataScope,
        });
        if (roleForm.dataScope === "CUSTOM") {
          await setRoleOrgScopes(res.data.id, { organizationIds: roleFormOrgIds });
        }
        toast.success("角色已创建");
        setSelectedRoleId(res.data.id);
      } else if (roleEditing) {
        await updateRole(roleEditing.id, {
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || undefined,
          status: roleForm.status,
          dataScope: roleForm.dataScope,
        });
        if (roleForm.dataScope === "CUSTOM") {
          await setRoleOrgScopes(roleEditing.id, { organizationIds: roleFormOrgIds });
        } else {
          await setRoleOrgScopes(roleEditing.id, { organizationIds: [] });
        }
        toast.success("角色已更新");
        if (selectedRoleId === roleEditing.id) void loadOrgScopes(roleEditing.id);
      }
      setRoleSheetOpen(false);
      await loadRoles();
      await refreshMe();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  };

  const confirmDeleteRole = async () => {
    if (!deleteRoleTarget) return;
    setDeleteLoading(true);
    try {
      await deleteRole(deleteRoleTarget.id);
      toast.success("角色已停用");
      if (selectedRoleId === deleteRoleTarget.id) {
        setSelectedRoleId(null);
        setRolePermState({ type: "loading" });
      }
      setDeleteRoleTarget(null);
      await loadRoles();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const togglePermission = (code: string) => {
    if (rolePermState.type !== "ok") return;
    const next = new Set(rolePermState.data);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setRolePermState({ type: "ok", data: next });
  };

  const toggleMenuGroup = (allCodes: string[], select: boolean) => {
    if (rolePermState.type !== "ok") return;
    const next = new Set(rolePermState.data);
    for (const code of allCodes) {
      if (select) next.add(code);
      else next.delete(code);
    }
    setRolePermState({ type: "ok", data: next });
  };

  const savePermissions = async () => {
    if (!selectedRoleId || rolePermState.type !== "ok") return;
    setPermSaving(true);
    try {
      await setRolePermissions(selectedRoleId, {
        permissionCodes: Array.from(rolePermState.data).sort(),
      });
      toast.success("功能权限已保存");
      await loadRolePermissions(selectedRoleId);
      await refreshMe();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setPermSaving(false);
    }
  };

  const saveOrgScopes = async () => {
    if (!selectedRoleId) return;
    setScopeSaving(true);
    try {
      await setRoleOrgScopes(selectedRoleId, { organizationIds: orgScopeIds });
      toast.success("组织范围已保存");
      setOrgScopeDirty(false);
      await refreshMe();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setScopeSaving(false);
    }
  };

  const renderMenuNav = (items: SysMenu[], depth = 0) =>
    items.map((m) => {
      const hasChildren = (m.children?.length ?? 0) > 0;
      const expanded = expandedMenus.has(m.id);
      const active = selectedMenuId === m.id;
      const perms = permissionsForMenuNode(m, permissions, menus);
      const selectedCount =
        rolePermState.type === "ok"
          ? perms.filter((p) => rolePermState.data.has(p.code)).length
          : 0;

      return (
        <div key={m.id}>
          <div
            className={cn(
              "flex items-center gap-1 rounded-md pr-1 transition-colors",
              active && "bg-primary/8",
            )}
            style={{ paddingLeft: depth * 12 + 4 }}
          >
            {hasChildren ? (
              <button
                type="button"
                className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                onClick={() =>
                  setExpandedMenus((prev) => {
                    const next = new Set(prev);
                    if (next.has(m.id)) next.delete(m.id);
                    else next.add(m.id);
                    return next;
                  })
                }
              >
                {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              </button>
            ) : (
              <span className="size-6 shrink-0" />
            )}
            <button
              type="button"
              className={cn(
                "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setSelectedMenuId(m.id)}
            >
              <span className="truncate">{m.title}</span>
              {perms.length > 0 ? (
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {selectedCount}/{perms.length}
                </span>
              ) : null}
            </button>
          </div>
          {hasChildren && expanded ? renderMenuNav(m.children!, depth + 1) : null}
        </div>
      );
    });

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <PanelCard
        title="角色列表"
        description="选择角色配置数据范围与功能权限"
        toolbar={
          <Button size="sm" onClick={openCreateRole}>
            新建
          </Button>
        }
      >
        <div className="space-y-3 p-4">
          <SearchInput value={roleKeyword} onChange={setRoleKeyword} placeholder="搜索角色" className="w-full" />
          {rolesState.type === "loading" ? <PanelLoading message="加载角色…" /> : null}
          {rolesState.type === "error" ? (
            <PanelError error={rolesState.error} onRetry={() => void loadRoles()} />
          ) : null}
          {rolesState.type === "ok" && roles.length === 0 ? (
            <PanelEmpty compact title="暂无角色" description="点击新建创建第一个角色" />
          ) : null}
          {rolesState.type === "ok" && roles.length > 0 ? (
            <div className="space-y-1.5">
              {roles.map((r) => {
                const active = selectedRoleId === r.id;
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "overflow-hidden rounded-lg border transition-colors",
                      active ? "border-primary/40 bg-primary/5" : "hover:bg-accent/40",
                    )}
                  >
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 text-left"
                      onClick={() => setSelectedRoleId(r.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{r.name}</span>
                        <DataScopeBadge dataScope={r.dataScope} />
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">{r.code}</div>
                      <div className="mt-2">
                        <StatusBadge status={r.status} />
                      </div>
                    </button>
                    <div className="flex gap-1 border-t px-2 py-1.5">
                      <Button size="sm" variant="ghost" onClick={() => openEditRole(r)}>
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={r.code === "admin"}
                        onClick={() => setDeleteRoleTarget(r)}
                      >
                        停用
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </PanelCard>

      <div className="space-y-4">
        {!selectedRole ? (
          <PanelCard>
            <PanelEmpty
              icon={<Shield className="size-5 text-muted-foreground" />}
              title="请选择角色"
              description="在左侧选择角色后，可配置数据范围与按菜单分组的功能权限"
            />
          </PanelCard>
        ) : (
          <>
            <PanelCard
              title={selectedRole.name}
              description={`角色编码 ${selectedRole.code}`}
              toolbar={
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditRole(selectedRole)}>
                    编辑角色
                  </Button>
                  {selectedRole.dataScope === "CUSTOM" ? (
                    <Button
                      size="sm"
                      onClick={() => void saveOrgScopes()}
                      disabled={!orgScopeDirty || scopeSaving}
                    >
                      <Save />
                      {scopeSaving ? "保存中…" : "保存组织范围"}
                    </Button>
                  ) : null}
                </div>
              }
            >
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedRole.status} />
                  <DataScopeBadge dataScope={selectedRole.dataScope} />
                </div>
                {selectedRole.description ? (
                  <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
                ) : null}

                {selectedRole.dataScope === "CUSTOM" ? (
                  <OrgScopePicker
                    value={orgScopeIds}
                    onChange={(ids) => {
                      setOrgScopeIds(ids);
                      setOrgScopeDirty(true);
                    }}
                  />
                ) : (
                  <p className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    当前数据范围为「{DATA_SCOPE_OPTIONS.find((o) => o.id === selectedRole.dataScope)?.label}」。
                    如需按组织树灵活授权，请在编辑角色时将数据范围改为「自定义组织」。
                  </p>
                )}
              </div>
            </PanelCard>

            <PanelCard
              title="功能权限"
              description="先选菜单分类，再勾选该分类下的权限点"
              toolbar={
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void loadPermissions()}>
                    <RefreshCw />
                    刷新
                  </Button>
                  <Button size="sm" onClick={() => void savePermissions()} disabled={permSaving}>
                    <Save />
                    {permSaving ? "保存中…" : "保存权限"}
                  </Button>
                </div>
              }
            >
              <div className="grid min-h-[420px] lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="border-b p-3 lg:border-b-0 lg:border-r">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">按菜单分类</div>
                  {menusState.type === "loading" ? (
                    <div className="text-xs text-muted-foreground">加载菜单…</div>
                  ) : (
                    <div className="max-h-[360px] space-y-0.5 overflow-auto">{renderMenuNav(navMenus)}</div>
                  )}
                </div>

                <div className="p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">
                        {selectedMenu?.title ?? "权限列表"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {visiblePermissions.length} 项权限
                        {rolePermState.type === "ok"
                          ? ` · 已选 ${visiblePermissions.filter((p) => rolePermState.data.has(p.code)).length} 项`
                          : null}
                      </div>
                    </div>
                    {visiblePermissions.length > 0 && rolePermState.type === "ok" ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleMenuGroup(
                              visiblePermissions.map((p) => p.code),
                              true,
                            )
                          }
                        >
                          全选
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleMenuGroup(
                              visiblePermissions.map((p) => p.code),
                              false,
                            )
                          }
                        >
                          清空
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {rolePermState.type === "loading" ? <PanelLoading message="加载角色权限…" /> : null}
                  {permissionsState.type === "error" ? (
                    <PanelError error={permissionsState.error} onRetry={() => void loadPermissions()} />
                  ) : null}

                  {rolePermState.type === "ok" ? (
                    <div className="max-h-[360px] overflow-auto rounded-lg border divide-y">
                      {visiblePermissions.length === 0 ? (
                        <PanelEmpty compact title="该分类下暂无权限点" description="可在「权限目录」Tab 中维护" />
                      ) : (
                        visiblePermissions.map((p) => (
                          <PermissionCheckRow
                            key={p.id}
                            permission={p}
                            checked={rolePermState.data.has(p.code)}
                            onToggle={() => togglePermission(p.code)}
                          />
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </PanelCard>
          </>
        )}
      </div>

      <Sheet open={roleSheetOpen} onOpenChange={setRoleSheetOpen}>
        <SheetContent side="right" className="gap-0 p-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{roleSheetMode === "create" ? "新建角色" : "编辑角色"}</SheetTitle>
            <SheetDescription>配置角色基本信息与数据访问范围。</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <FormField label="角色编码" required hint="创建后不可修改，建议小写英文">
              <Input
                value={roleForm.code}
                onChange={(e) => setRoleForm((s) => ({ ...s, code: e.target.value }))}
                disabled={roleSheetMode === "edit"}
                className="font-mono"
                placeholder="hr_manager"
              />
            </FormField>
            <FormField label="角色名称" required>
              <Input
                value={roleForm.name}
                onChange={(e) => setRoleForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="HR 经理"
              />
            </FormField>
            <FormField label="描述">
              <Textarea
                value={roleForm.description}
                onChange={(e) => setRoleForm((s) => ({ ...s, description: e.target.value }))}
                rows={3}
              />
            </FormField>
            <FormField label="状态">
              <OptionToggle
                options={STATUS_OPTIONS}
                value={roleForm.status}
                onChange={(status) => setRoleForm((s) => ({ ...s, status }))}
              />
            </FormField>
            <FormField label="数据范围" hint="决定该角色能访问哪些员工/组织数据">
              <div className="space-y-2">
                <OptionToggle
                  options={DATA_SCOPE_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                  value={roleForm.dataScope}
                  onChange={(dataScope) => setRoleForm((s) => ({ ...s, dataScope }))}
                />
                <p className="text-xs text-muted-foreground">
                  {DATA_SCOPE_OPTIONS.find((o) => o.id === roleForm.dataScope)?.hint}
                </p>
              </div>
            </FormField>
            {roleForm.dataScope === "CUSTOM" ? (
              <FormField label="组织范围" required hint="勾选可访问的组织节点（含下级）">
                <OrgScopePicker value={roleFormOrgIds} onChange={setRoleFormOrgIds} />
              </FormField>
            ) : null}
          </div>
          <SheetFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setRoleSheetOpen(false)}>
                取消
              </Button>
              <Button onClick={() => void submitRole()}>保存</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteRoleTarget}
        onOpenChange={(open) => !open && setDeleteRoleTarget(null)}
        title="停用角色"
        description={`确定停用角色「${deleteRoleTarget?.name ?? ""}」？已分配该角色的用户将失去对应权限。`}
        confirmLabel="停用"
        destructive
        loading={deleteLoading}
        onConfirm={confirmDeleteRole}
      />
    </div>
  );
}
