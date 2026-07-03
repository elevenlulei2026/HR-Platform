import type { Permission, Role } from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createPermission,
  createRole,
  deletePermission,
  deleteRole,
  listPermissions,
  listRolePermissions,
  listRoles,
  setRolePermissions,
  updatePermission,
  updateRole,
} from "@/api/rbac";
import type { ApiError } from "@/api/http";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import { useAuth } from "@/auth/AuthProvider";
import { usePermission } from "@/hooks/usePermission";
import { FormField, OptionToggle, STATUS_OPTIONS } from "@/components/admin/form-field";
import { cn } from "@/lib/utils";
import { Check, RefreshCw, Search, Shield } from "lucide-react";

type LoadState<T> =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; data: T };

type RoleEditorMode = "create" | "edit";
type PermissionEditorMode = "create" | "edit";

type RoleForm = {
  code: string;
  name: string;
  description: string;
  status: "ACTIVE" | "DISABLED";
  dataScope: "SELF" | "DEPARTMENT" | "ALL";
};

type PermissionForm = {
  code: string;
  name: string;
  description: string;
  status: "ACTIVE" | "DISABLED";
};

function toApiError(e: unknown): ApiError {
  if (typeof (e as any)?.message === "string") {
    return { message: (e as any).message, traceId: (e as any).traceId };
  }
  return { message: "请求失败，请重试" };
}

const DATA_SCOPE_LABEL: Record<RoleForm["dataScope"], string> = {
  SELF: "仅本人",
  DEPARTMENT: "本部门",
  ALL: "全部数据",
};

const DATA_SCOPE_OPTIONS: Array<{ id: RoleForm["dataScope"]; label: string }> = [
  { id: "SELF", label: "仅本人" },
  { id: "DEPARTMENT", label: "本部门" },
  { id: "ALL", label: "全部数据" },
];

function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className={cn(
        active &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      )}
    >
      {active ? "启用" : status === "DISABLED" ? "停用" : status}
    </Badge>
  );
}

function DataScopeBadge({ dataScope }: { dataScope: RoleForm["dataScope"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 text-xs font-medium",
        dataScope === "ALL" &&
          "border-sky-500/30 bg-sky-500/12 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/18 dark:text-sky-200",
        dataScope === "DEPARTMENT" &&
          "border-amber-500/30 bg-amber-500/12 text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/18 dark:text-amber-100",
        dataScope === "SELF" &&
          "border-border bg-muted/60 text-muted-foreground",
      )}
    >
      {DATA_SCOPE_LABEL[dataScope] ?? dataScope}
    </Badge>
  );
}

export function AdminPermissionsPage() {
  const { refreshMe } = useAuth();
  const perm = usePermission();

  const [roleKeyword, setRoleKeyword] = useState("");
  const [permissionKeyword, setPermissionKeyword] = useState("");
  const debouncedRoleKeyword = useDebouncedValue(roleKeyword);
  const debouncedPermissionKeyword = useDebouncedValue(permissionKeyword);

  const [rolesState, setRolesState] = useState<LoadState<Role[]>>({ type: "loading" });
  const [permissionsState, setPermissionsState] = useState<LoadState<Permission[]>>({
    type: "loading",
  });

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<LoadState<Set<string>>>({
    type: "loading",
  });

  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [roleSheetMode, setRoleSheetMode] = useState<RoleEditorMode>("create");
  const [roleEditing, setRoleEditing] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState<RoleForm>({
    code: "",
    name: "",
    description: "",
    status: "ACTIVE",
    dataScope: "ALL",
  });

  const [permissionSheetOpen, setPermissionSheetOpen] = useState(false);
  const [permissionSheetMode, setPermissionSheetMode] = useState<PermissionEditorMode>("create");
  const [permissionEditing, setPermissionEditing] = useState<Permission | null>(null);
  const [permissionForm, setPermissionForm] = useState<PermissionForm>({
    code: "",
    name: "",
    description: "",
    status: "ACTIVE",
  });

  const canManage = perm.has("permission:manage");

  const loadRoles = useCallback(async () => {
    try {
      setRolesState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listRoles({
        page: 1,
        pageSize: 200,
        keyword: debouncedRoleKeyword.trim() || undefined,
      });
      setRolesState({ type: "ok", data: res.data.items });
    } catch (e: unknown) {
      setRolesState({ type: "error", error: toApiError(e) });
    }
  }, [debouncedRoleKeyword]);

  const loadPermissions = useCallback(async () => {
    try {
      setPermissionsState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listPermissions({
        page: 1,
        pageSize: 200,
        keyword: debouncedPermissionKeyword.trim() || undefined,
      });
      setPermissionsState({ type: "ok", data: res.data.items });
    } catch (e: unknown) {
      setPermissionsState({ type: "error", error: toApiError(e) });
    }
  }, [debouncedPermissionKeyword]);

  const loadSelectedRolePermissions = useCallback(async (roleId: string) => {
    try {
      setSelectedRolePermissions({ type: "loading" });
      const res = await listRolePermissions(roleId);
      setSelectedRolePermissions({ type: "ok", data: new Set(res.data) });
    } catch (e: unknown) {
      setSelectedRolePermissions({ type: "error", error: toApiError(e) });
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const roles = rolesState.type === "ok" ? rolesState.data : [];
  const permissions = permissionsState.type === "ok" ? permissionsState.data : [];

  const selectedRole = useMemo<Role | null>(() => {
    if (!selectedRoleId) return null;
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (!selectedRoleId) return;
    void loadSelectedRolePermissions(selectedRoleId);
  }, [loadSelectedRolePermissions, selectedRoleId]);

  const openCreateRole = useCallback(() => {
    setRoleSheetMode("create");
    setRoleEditing(null);
    setRoleForm({ code: "", name: "", description: "", status: "ACTIVE", dataScope: "ALL" });
    setRoleSheetOpen(true);
  }, []);

  const openEditRole = useCallback((role: Role) => {
    setRoleSheetMode("edit");
    setRoleEditing(role);
    setRoleForm({
      code: role.code,
      name: role.name,
      description: role.description || "",
      status: role.status,
      dataScope: role.dataScope,
    });
    setRoleSheetOpen(true);
  }, []);

  const submitRole = useCallback(async () => {
    try {
      if (!roleForm.code.trim()) throw new Error("请输入角色 code");
      if (!roleForm.name.trim()) throw new Error("请输入角色名称");

      if (roleSheetMode === "create") {
        await createRole({
          code: roleForm.code.trim(),
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || undefined,
          status: roleForm.status,
          dataScope: roleForm.dataScope,
        });
        toast.success("角色已创建");
      } else {
        if (!roleEditing) return;
        await updateRole(roleEditing.id, {
          name: roleForm.name.trim(),
          description: roleForm.description.trim() || undefined,
          status: roleForm.status,
          dataScope: roleForm.dataScope,
        });
        toast.success("角色已更新");
      }
      setRoleSheetOpen(false);
      await loadRoles();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, [loadRoles, roleEditing, roleForm, roleSheetMode]);

  const openCreatePermission = useCallback(() => {
    setPermissionSheetMode("create");
    setPermissionEditing(null);
    setPermissionForm({ code: "", name: "", description: "", status: "ACTIVE" });
    setPermissionSheetOpen(true);
  }, []);

  const openEditPermission = useCallback((p: Permission) => {
    setPermissionSheetMode("edit");
    setPermissionEditing(p);
    setPermissionForm({
      code: p.code,
      name: p.name,
      description: p.description || "",
      status: p.status,
    });
    setPermissionSheetOpen(true);
  }, []);

  const submitPermission = useCallback(async () => {
    try {
      if (!permissionForm.code.trim()) throw new Error("请输入权限点 code");
      if (!permissionForm.name.trim()) throw new Error("请输入权限点名称");

      if (permissionSheetMode === "create") {
        await createPermission({
          code: permissionForm.code.trim(),
          name: permissionForm.name.trim(),
          description: permissionForm.description.trim() || undefined,
          status: permissionForm.status,
        });
        toast.success("权限点已创建");
      } else {
        if (!permissionEditing) return;
        await updatePermission(permissionEditing.id, {
          name: permissionForm.name.trim(),
          description: permissionForm.description.trim() || undefined,
          status: permissionForm.status,
        });
        toast.success("权限点已更新");
      }
      setPermissionSheetOpen(false);
      await loadPermissions();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, [loadPermissions, permissionEditing, permissionForm, permissionSheetMode]);

  const removeRole = useCallback(
    async (role: Role) => {
      try {
        await deleteRole(role.id);
        toast.success("角色已停用");
        if (selectedRoleId === role.id) {
          setSelectedRoleId(null);
          setSelectedRolePermissions({ type: "loading" });
        }
        await loadRoles();
      } catch (e: unknown) {
        const err = toApiError(e);
        toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
      }
    },
    [loadRoles, selectedRoleId],
  );

  const removePermission = useCallback(
    async (p: Permission) => {
      try {
        await deletePermission(p.id);
        toast.success("权限点已停用");
        await loadPermissions();
      } catch (e: unknown) {
        const err = toApiError(e);
        toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
      }
    },
    [loadPermissions],
  );

  const toggleRolePermission = useCallback(
    async (permissionCode: string) => {
      if (!selectedRoleId) return;
      if (selectedRolePermissions.type !== "ok") return;
      const next = new Set(selectedRolePermissions.data);
      if (next.has(permissionCode)) next.delete(permissionCode);
      else next.add(permissionCode);
      setSelectedRolePermissions({ type: "ok", data: next });
    },
    [selectedRoleId, selectedRolePermissions],
  );

  const saveRolePermissions = useCallback(async () => {
    if (!selectedRoleId) return;
    if (selectedRolePermissions.type !== "ok") return;
    try {
      await setRolePermissions(selectedRoleId, {
        permissionCodes: Array.from(selectedRolePermissions.data).sort(),
      });
      toast.success("权限已保存");
      await loadSelectedRolePermissions(selectedRoleId);
      await refreshMe();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, [loadSelectedRolePermissions, refreshMe, selectedRoleId, selectedRolePermissions]);

  if (!canManage) {
    return (
      <div className="rounded-xl border bg-card p-8">
        <div className="text-sm font-medium text-foreground">无权限访问</div>
        <div className="mt-1 text-sm text-muted-foreground">
          需要权限点 <span className="font-mono">permission:manage</span>。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">RBAC 权限</h1>
          <p className="text-[13px] text-muted-foreground">
            管理角色、权限点，以及角色-权限分配（后端强制鉴权，前端仅做显示与引导）。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadRoles()}>
            <RefreshCw />
            刷新角色
          </Button>
          <Button variant="outline" size="sm" onClick={() => void loadPermissions()}>
            <RefreshCw />
            刷新权限点
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-t-2 border-t-primary/70 bg-card shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-foreground">角色</div>
              <div className="text-xs text-muted-foreground">选择角色以配置权限</div>
            </div>
            <Button size="sm" onClick={openCreateRole} disabled={!canManage}>
              新建
            </Button>
          </div>

          <div className="p-4">
            <InputGroup className="mb-3">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={roleKeyword}
                onChange={(e) => setRoleKeyword(e.target.value)}
                placeholder="搜索角色 code / 名称"
              />
            </InputGroup>

            {rolesState.type === "loading" ? (
              <div className="text-sm text-muted-foreground">正在加载角色…</div>
            ) : null}

            {rolesState.type === "error" ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <div className="text-sm font-medium text-destructive">加载失败</div>
                <div className="mt-1 text-sm text-destructive/90">
                  {rolesState.error.traceId
                    ? `${rolesState.error.message}（traceId: ${rolesState.error.traceId}）`
                    : rolesState.error.message}
                </div>
                <div className="mt-3">
                  <Button size="sm" onClick={() => void loadRoles()}>
                    重试
                  </Button>
                </div>
              </div>
            ) : null}

            {rolesState.type === "ok" && roles.length === 0 ? (
              <div className="rounded-lg border bg-background p-6 text-center">
                <div className="text-sm font-medium text-foreground">暂无角色</div>
                <div className="mt-1 text-sm text-muted-foreground">你可以先新建一个角色。</div>
              </div>
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
                        active
                          ? "border-primary/40 bg-primary/5 shadow-sm"
                          : "hover:border-border hover:bg-accent/40",
                      )}
                    >
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        onClick={() => setSelectedRoleId(r.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 text-sm font-medium text-foreground">
                            {r.name}
                          </div>
                          <DataScopeBadge dataScope={r.dataScope} />
                        </div>
                        <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                          {r.code}
                        </div>
                        {r.description ? (
                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {r.description}
                          </div>
                        ) : null}
                        <div className="mt-2">
                          <StatusBadge status={r.status} />
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditRole(r)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void removeRole(r)}
                          disabled={r.code === "admin"}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-t-2 border-t-primary/70 bg-card shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-foreground">角色权限分配</div>
              <div className="text-xs text-muted-foreground">
                {selectedRole ? `正在为「${selectedRole.name}」配置权限` : "请先在左侧选择角色"}
              </div>
            </div>
            <Button size="sm" onClick={() => void saveRolePermissions()} disabled={!selectedRole}>
              保存权限
            </Button>
          </div>

          <div className="p-4">
            {!selectedRole ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
                  <Shield className="size-5 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium text-foreground">请选择一个角色</div>
                <div className="mt-1 max-w-sm text-sm text-muted-foreground">
                  左侧选择角色后，在这里勾选权限点并保存。
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-foreground">{selectedRole.name}</div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {selectedRole.code}
                    </Badge>
                    <StatusBadge status={selectedRole.status} />
                    <DataScopeBadge dataScope={selectedRole.dataScope} />
                  </div>
                  {selectedRole.description ? (
                    <div className="mt-2 text-sm text-muted-foreground">{selectedRole.description}</div>
                  ) : null}
                </div>

                {permissionsState.type === "loading" ? (
                  <div className="text-sm text-muted-foreground">正在加载权限点…</div>
                ) : null}

                {permissionsState.type === "error" ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <div className="text-sm font-medium text-destructive">加载失败</div>
                    <div className="mt-1 text-sm text-destructive/90">
                      {permissionsState.error.traceId
                        ? `${permissionsState.error.message}（traceId: ${permissionsState.error.traceId}）`
                        : permissionsState.error.message}
                    </div>
                    <div className="mt-3">
                      <Button size="sm" onClick={() => void loadPermissions()}>
                        重试
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-lg border bg-background p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">权限点列表</div>
                    {selectedRolePermissions.type === "ok" ? (
                      <span className="text-xs text-muted-foreground">
                        已选 {selectedRolePermissions.data.size} / {permissions.length} 项
                      </span>
                    ) : null}
                  </div>

                  <InputGroup className="mb-3">
                    <InputGroupAddon>
                      <Search />
                    </InputGroupAddon>
                    <InputGroupInput
                      value={permissionKeyword}
                      onChange={(e) => setPermissionKeyword(e.target.value)}
                      placeholder="搜索权限点 code / 名称"
                    />
                  </InputGroup>

                  {selectedRolePermissions.type === "loading" ? (
                    <div className="text-sm text-muted-foreground">正在加载该角色权限…</div>
                  ) : null}

                  {selectedRolePermissions.type === "error" ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <div className="text-sm font-medium text-destructive">加载失败</div>
                      <div className="mt-1 text-sm text-destructive/90">
                        {selectedRolePermissions.error.traceId
                          ? `${selectedRolePermissions.error.message}（traceId: ${selectedRolePermissions.error.traceId}）`
                          : selectedRolePermissions.error.message}
                      </div>
                      <div className="mt-3">
                        <Button
                          size="sm"
                          onClick={() =>
                            selectedRoleId ? void loadSelectedRolePermissions(selectedRoleId) : undefined
                          }
                        >
                          重试
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {selectedRolePermissions.type === "ok" ? (
                    <div className="max-h-[420px] overflow-auto rounded-lg border">
                      <div className="divide-y">
                        {permissions.map((p) => {
                          const checked = selectedRolePermissions.data.has(p.code);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className={cn(
                                "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/60",
                                checked && "bg-primary/5",
                              )}
                              onClick={() => void toggleRolePermission(p.code)}
                            >
                              <div
                                className={cn(
                                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                                  checked
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-input bg-background",
                                )}
                              >
                                {checked ? <Check className="size-2.5" strokeWidth={3} /> : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-foreground">{p.name}</div>
                                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  {p.code}
                                </div>
                                {p.description ? (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {p.description}
                                  </div>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-foreground">权限点维护</div>
                      <div className="text-xs text-muted-foreground">快捷新建与编辑常用权限点</div>
                    </div>
                    <Button size="sm" onClick={openCreatePermission}>
                      新建权限点
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {permissions.slice(0, 6).map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg border bg-muted/10 px-3 py-2.5 transition-colors hover:bg-muted/30"
                      >
                        <div className="text-sm font-medium text-foreground">{p.name}</div>
                        <div className="mt-0.5 font-mono text-xs text-muted-foreground">{p.code}</div>
                        {p.description ? (
                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {p.description}
                          </div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => openEditPermission(p)}>
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => void removePermission(p)}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    完整列表在上方勾选区可搜索查看；此处仅展示部分权限点快捷编辑。
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Sheet open={roleSheetOpen} onOpenChange={setRoleSheetOpen}>
        <SheetContent side="right" className="gap-0 p-0">
          <SheetHeader>
            <SheetTitle>{roleSheetMode === "create" ? "新建角色" : "编辑角色"}</SheetTitle>
            <SheetDescription>角色用于聚合权限点，并指定数据范围。</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <FormField label="角色 code" required hint="创建后不可修改，建议使用小写英文与下划线">
              <Input
                value={roleForm.code}
                onChange={(e) => setRoleForm((s) => ({ ...s, code: e.target.value }))}
                placeholder="例如 admin、hr_manager"
                disabled={roleSheetMode === "edit"}
                className="font-mono"
              />
            </FormField>

            <FormField label="角色名称" required>
              <Input
                value={roleForm.name}
                onChange={(e) => setRoleForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="例如：系统管理员"
              />
            </FormField>

            <FormField label="描述">
              <Textarea
                value={roleForm.description}
                onChange={(e) => setRoleForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="可选，说明该角色的职责范围"
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

            <FormField label="数据范围" hint="控制该角色可访问的数据边界">
              <OptionToggle
                options={DATA_SCOPE_OPTIONS}
                value={roleForm.dataScope}
                onChange={(dataScope) => setRoleForm((s) => ({ ...s, dataScope }))}
              />
            </FormField>
          </div>

          <SheetFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setRoleSheetOpen(false)}>
                取消
              </Button>
              <Button onClick={() => void submitRole()} disabled={!canManage}>
                保存
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={permissionSheetOpen} onOpenChange={setPermissionSheetOpen}>
        <SheetContent side="right" className="gap-0 p-0">
          <SheetHeader>
            <SheetTitle>
              {permissionSheetMode === "create" ? "新建权限点" : "编辑权限点"}
            </SheetTitle>
            <SheetDescription>权限点用于控制菜单、按钮与后端接口访问。</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <FormField
              label="权限点 code"
              required
              hint="格式：模块:资源:操作，创建后不可修改"
            >
              <Input
                value={permissionForm.code}
                onChange={(e) => setPermissionForm((s) => ({ ...s, code: e.target.value }))}
                placeholder="例如 employee:roster:view"
                disabled={permissionSheetMode === "edit"}
                className="font-mono"
              />
            </FormField>

            <FormField label="权限点名称" required>
              <Input
                value={permissionForm.name}
                onChange={(e) => setPermissionForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="例如：花名册查看"
              />
            </FormField>

            <FormField label="描述">
              <Textarea
                value={permissionForm.description}
                onChange={(e) => setPermissionForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="可选，说明该权限点的用途"
                rows={3}
              />
            </FormField>

            <FormField label="状态">
              <OptionToggle
                options={STATUS_OPTIONS}
                value={permissionForm.status}
                onChange={(status) => setPermissionForm((s) => ({ ...s, status }))}
              />
            </FormField>
          </div>

          <SheetFooter>
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setPermissionSheetOpen(false)}>
                取消
              </Button>
              <Button onClick={() => void submitPermission()} disabled={!canManage}>
                保存
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

