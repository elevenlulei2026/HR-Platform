import type {
  Employee,
  Role,
  SysUserAccount,
  SysUserListQuery,
  UserAccountType,
  UserStatus,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Plus, RefreshCw, Users } from "lucide-react";

import { listEmployees } from "@/api/employee";
import { listRoles, setUserRoles } from "@/api/rbac";
import {
  createSystemUser,
  listUsers,
  openEmployeeAccount,
  renameUserLogin,
  resetUserPassword,
  updateUser,
} from "@/api/users";
import type { ApiError } from "@/api/http";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormField, OptionToggle, STATUS_OPTIONS } from "@/components/admin/form-field";
import {
  PageHeader,
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  PaginationBar,
  SearchInput,
} from "@/components/admin/page-shell";
import { SearchableDialogPicker } from "@/components/admin/searchable-dialog-picker";
import {
  formatCodeName,
  type SearchableSelectOption,
} from "@/components/admin/searchable-select";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: SysUserAccount[]; total: number };

type SheetMode = "create-system" | "create-employee" | "edit";

type EmployeePickMeta = {
  id: string;
  employeeNo: string;
  fullName: string;
  adAccount?: string;
};

/** 开号 / 新建账号默认初始密码（须首次登录修改） */
const DEFAULT_INITIAL_PASSWORD = "eco@1234";

const ACCOUNT_TYPE_FILTER = [
  { id: "ALL" as const, label: "全部类型" },
  { id: "SYSTEM" as const, label: "系统账号" },
  { id: "EMPLOYEE" as const, label: "员工账号" },
];

const STATUS_FILTER = [
  { id: "ALL" as const, label: "全部状态" },
  { id: "ACTIVE" as const, label: "启用" },
  { id: "DISABLED" as const, label: "停用" },
];

function toApiError(e: unknown): ApiError {
  if (typeof (e as ApiError)?.message === "string") {
    return { message: (e as ApiError).message, traceId: (e as ApiError).traceId };
  }
  return { message: "操作失败，请重试" };
}

function toOpenAccountOption(item: Employee): SearchableSelectOption {
  const org = item.primaryOrganizationName?.trim();
  const position = item.primaryPositionName?.trim();
  const ad = item.adAccount?.trim();
  const adHint = ad ? `AD：${ad}` : "未填写 AD账号";
  const dept = [org, position].filter(Boolean).join(" · ");
  return {
    value: item.id,
    label: item.fullName,
    code: item.employeeNo,
    description: dept ? `${adHint} · ${dept}` : adHint,
    keywords: `${item.employeeNo} ${item.fullName} ${ad ?? ""} ${org ?? ""} ${position ?? ""}`,
  };
}

function toEmployeeMeta(item: Employee): EmployeePickMeta {
  return {
    id: item.id,
    employeeNo: item.employeeNo,
    fullName: item.fullName,
    adAccount: item.adAccount?.trim() || undefined,
  };
}

export function AdminUsersPage() {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [status, setStatus] = useState<"ALL" | UserStatus>("ALL");
  const [accountType, setAccountType] = useState<"ALL" | UserAccountType>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });

  const [roles, setRoles] = useState<Role[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("create-system");
  const [editing, setEditing] = useState<SysUserAccount | null>(null);
  const [saving, setSaving] = useState(false);

  const [formUsername, setFormUsername] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formPassword, setFormPassword] = useState(DEFAULT_INITIAL_PASSWORD);
  const [formStatus, setFormStatus] = useState<UserStatus>("ACTIVE");
  const [formRoleCodes, setFormRoleCodes] = useState<string[]>([]);

  const [employeeSearch, setEmployeeSearch] = useState("");
  const debouncedEmpSearch = useDebouncedValue(employeeSearch, 280);
  const [employeePickerOptions, setEmployeePickerOptions] = useState<SearchableSelectOption[]>([]);
  const [employeeMetaById, setEmployeeMetaById] = useState<Record<string, EmployeePickMeta>>({});
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [resetTarget, setResetTarget] = useState<SysUserAccount | null>(null);
  const [resetPassword, setResetPassword] = useState(DEFAULT_INITIAL_PASSWORD);
  const [resetLoading, setResetLoading] = useState(false);

  const [renameTarget, setRenameTarget] = useState<SysUserAccount | null>(null);
  const [newAdAccount, setNewAdAccount] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  const [disableTarget, setDisableTarget] = useState<SysUserAccount | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);

  const query = useMemo<SysUserListQuery>(
    () => ({
      page,
      pageSize,
      keyword: debouncedKeyword.trim() || undefined,
      status,
      accountType,
    }),
    [page, pageSize, debouncedKeyword, status, accountType],
  );

  const load = useCallback(async () => {
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listUsers(query);
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      const err = toApiError(e);
      setState({ type: "error", error: err });
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await listRoles({ page: 1, pageSize: 200 });
        setRoles(res.data.items.filter((r) => r.status === "ACTIVE"));
      } catch {
        setRoles([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (sheetMode !== "create-employee" || !sheetOpen) return;
    setEmployeeLoading(true);
    void listEmployees({
      page: 1,
      pageSize: 20,
      keyword: debouncedEmpSearch.trim() || undefined,
    })
      .then((res) => {
        const items = res.data.items;
        setEmployeePickerOptions(items.map(toOpenAccountOption));
        setEmployeeMetaById((prev) => {
          const next = { ...prev };
          for (const item of items) {
            next[item.id] = toEmployeeMeta(item);
          }
          return next;
        });
      })
      .catch(() => setEmployeePickerOptions([]))
      .finally(() => setEmployeeLoading(false));
  }, [debouncedEmpSearch, sheetMode, sheetOpen]);

  const items = state.type === "ok" ? state.items : [];
  const total = state.type === "ok" ? state.total : 0;
  const selectedEmployee = selectedEmployeeId
    ? employeeMetaById[selectedEmployeeId] ?? null
    : null;

  const mergedEmployeePickerOptions = useMemo(() => {
    const byId = new Map(employeePickerOptions.map((opt) => [opt.value, opt]));
    if (selectedEmployee && !byId.has(selectedEmployee.id)) {
      byId.set(selectedEmployee.id, {
        value: selectedEmployee.id,
        label: selectedEmployee.fullName,
        code: selectedEmployee.employeeNo,
        description: selectedEmployee.adAccount
          ? `AD：${selectedEmployee.adAccount}`
          : "未填写 AD账号",
        keywords: `${selectedEmployee.employeeNo} ${selectedEmployee.fullName} ${selectedEmployee.adAccount ?? ""}`,
      });
    }
    return [...byId.values()];
  }, [employeePickerOptions, selectedEmployee]);

  const openCreateSystem = () => {
    setSheetMode("create-system");
    setEditing(null);
    setFormUsername("");
    setFormDisplayName("");
    setFormPassword(DEFAULT_INITIAL_PASSWORD);
    setFormRoleCodes([]);
    setSheetOpen(true);
  };

  const openCreateEmployee = () => {
    setSheetMode("create-employee");
    setEditing(null);
    setFormPassword(DEFAULT_INITIAL_PASSWORD);
    // 仅预选库中真实存在的角色；若尚无 employee 角色则不预选
    setFormRoleCodes(roles.some((r) => r.code === "employee") ? ["employee"] : []);
    setEmployeeSearch("");
    setEmployeePickerOptions([]);
    setSelectedEmployeeId("");
    setSheetOpen(true);
  };

  const openEdit = (user: SysUserAccount) => {
    setSheetMode("edit");
    setEditing(user);
    setFormDisplayName(user.displayName || "");
    setFormStatus(user.status);
    setFormRoleCodes(user.roles || []);
    setSheetOpen(true);
  };

  const toggleRole = (code: string) => {
    setFormRoleCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const saveSheet = async () => {
    try {
      setSaving(true);
      if (sheetMode === "create-system") {
        const created = await createSystemUser({
          accountType: "SYSTEM",
          username: formUsername.trim(),
          displayName: formDisplayName.trim() || undefined,
          password: formPassword,
          mustChangePassword: true,
        });
        if (formRoleCodes.length > 0) {
          await setUserRoles(created.data.id, { roleCodes: formRoleCodes });
        }
        toast.success("系统账号已创建");
      } else if (sheetMode === "create-employee") {
        if (!selectedEmployeeId) {
          toast.error("请选择员工");
          return;
        }
        if (!selectedEmployee?.adAccount) {
          toast.error("该员工尚未维护 AD账号，请先在档案中填写");
          return;
        }
        await openEmployeeAccount(selectedEmployeeId, {
          password: formPassword || DEFAULT_INITIAL_PASSWORD,
          roleCodes: formRoleCodes,
          mustChangePassword: true,
        });
        toast.success("员工账号已开通");
      } else if (editing) {
        await updateUser(editing.id, {
          displayName: editing.accountType === "SYSTEM" ? formDisplayName.trim() || undefined : undefined,
          status: formStatus,
        });
        await setUserRoles(editing.id, { roleCodes: formRoleCodes });
        toast.success("账号已更新");
      }
      setSheetOpen(false);
      await load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmReset = async () => {
    if (!resetTarget) return;
    try {
      setResetLoading(true);
      await resetUserPassword(resetTarget.id, {
        newPassword: resetPassword,
        mustChangePassword: true,
      });
      toast.success("密码已重置");
      setResetTarget(null);
      setResetPassword(DEFAULT_INITIAL_PASSWORD);
    } catch (e: unknown) {
      toast.error(toApiError(e).message);
    } finally {
      setResetLoading(false);
    }
  };

  const confirmRename = async () => {
    if (!renameTarget) return;
    try {
      setRenameLoading(true);
      await renameUserLogin(renameTarget.id, { newAdAccount: newAdAccount.trim() });
      toast.success("登录名已变更");
      setRenameTarget(null);
      setNewAdAccount("");
      await load();
    } catch (e: unknown) {
      toast.error(toApiError(e).message);
    } finally {
      setRenameLoading(false);
    }
  };

  const confirmDisable = async () => {
    if (!disableTarget) return;
    try {
      setDisableLoading(true);
      await updateUser(disableTarget.id, { status: "DISABLED" });
      toast.success("账号已停用");
      setDisableTarget(null);
      await load();
    } catch (e: unknown) {
      toast.error(toApiError(e).message);
    } finally {
      setDisableLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="账号管理"
        description="管理系统登录账号：系统账号与员工 AD 登录、启停、重置密码与角色挂接。"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={openCreateEmployee}>
              <Plus className="size-4" />
              开通员工账号
            </Button>
            <Button size="sm" onClick={openCreateSystem}>
              <Plus className="size-4" />
              新建系统账号
            </Button>
          </div>
        }
      />

      <PanelCard
        title="账号列表"
        toolbar={
          <>
            <SearchInput
              value={keyword}
              onChange={(v) => {
                setPage(1);
                setKeyword(v);
              }}
              placeholder="登录名 / 展示名 / 工号 / 姓名 / AD"
            />
            <OptionToggle
              options={STATUS_FILTER}
              value={status}
              onChange={(v) => {
                setPage(1);
                setStatus(v);
              }}
            />
            <OptionToggle
              options={ACCOUNT_TYPE_FILTER}
              value={accountType}
              onChange={(v) => {
                setPage(1);
                setAccountType(v);
              }}
            />
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" />
              刷新
            </Button>
          </>
        }
      >
        {state.type === "loading" ? <PanelLoading message="正在加载账号…" /> : null}
        {state.type === "error" ? (
          <PanelError error={state.error} onRetry={() => void load()} />
        ) : null}
        {state.type === "ok" && items.length === 0 ? (
          <PanelEmpty
            title="暂无账号"
            description="可新建系统账号，或为已维护 AD账号的员工开通登录。"
            icon={<Users className="size-5 text-muted-foreground" />}
          />
        ) : null}
        {state.type === "ok" && items.length > 0 ? (
          <>
            <div className="divide-y">
              {items.map((u) => (
                <div key={u.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium">{u.username}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {u.accountType === "SYSTEM" ? "系统" : "员工"}
                      </span>
                      <span
                        className={
                          u.status === "ACTIVE"
                            ? "text-xs text-emerald-600"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {u.status === "ACTIVE" ? "启用" : "停用"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.accountType === "EMPLOYEE"
                        ? `${u.employeeNo || "—"} · ${u.employeeName || u.displayName || "—"}`
                        : u.displayName || "—"}
                      {u.roles?.length ? ` · 角色：${u.roles.join(", ")}` : " · 无角色"}
                      {u.lastLoginAt ? ` · 最近登录 ${u.lastLoginAt}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setResetTarget(u);
                        setResetPassword(DEFAULT_INITIAL_PASSWORD);
                      }}
                    >
                      <KeyRound className="size-3.5" />
                      重置密码
                    </Button>
                    {u.accountType === "EMPLOYEE" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRenameTarget(u);
                          setNewAdAccount(u.username);
                        }}
                      >
                        变更登录名
                      </Button>
                    ) : null}
                    {u.status === "ACTIVE" ? (
                      <Button size="sm" variant="destructive" onClick={() => setDisableTarget(u)}>
                        停用
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await updateUser(u.id, { status: "ACTIVE" });
                            toast.success("账号已启用");
                            await load();
                          } catch (e: unknown) {
                            toast.error(toApiError(e).message);
                          }
                        }}
                      >
                        启用
                      </Button>
                    )}
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>
              {sheetMode === "create-system"
                ? "新建系统账号"
                : sheetMode === "create-employee"
                  ? "开通员工账号"
                  : "编辑账号"}
            </SheetTitle>
            <SheetDescription>
              {sheetMode === "create-employee"
                ? "弹窗选人后，登录名自动等于档案 AD账号；默认初始密码 eco@1234。"
                : "账号管登录与权限；人事身份仍在员工档案维护。"}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 overflow-y-auto px-6 py-4">
            {sheetMode === "create-system" ? (
              <>
                <FormField label="登录名" required>
                  <Input
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="如 admin_ops"
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="展示名">
                  <Input
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="可选"
                  />
                </FormField>
                <FormField
                  label="初始密码"
                  required
                  hint={`默认 ${DEFAULT_INITIAL_PASSWORD}，创建后须首次登录修改`}
                >
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </FormField>
              </>
            ) : null}

            {sheetMode === "create-employee" ? (
              <>
                <FormField
                  label="选择员工"
                  required
                  hint="与组织管理相同：弹窗搜索工号 / 姓名后点选"
                >
                  <SearchableDialogPicker
                    value={selectedEmployeeId}
                    onChange={setSelectedEmployeeId}
                    options={mergedEmployeePickerOptions}
                    dialogTitle="选择员工"
                    dialogDescription="输入员工姓名或工号搜索，点击条目完成选择。开号前请确认档案已维护 AD账号。"
                    placeholder="点击搜索选择员工"
                    entityEmptyTitle="点击搜索选择员工"
                    entityEmptyHint="在弹窗中搜索员工姓名或工号"
                    entitySelectedHint="已选择员工，点击可重新搜索"
                    searchPlaceholder="搜索员工姓名 / 工号…"
                    entityIcon="briefcase"
                    formatOption={formatCodeName}
                    loading={employeeLoading}
                    shouldFilter={false}
                    onSearchChange={setEmployeeSearch}
                    helperText="none"
                    className="w-full"
                  />
                </FormField>

                {selectedEmployee ? (
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                    <div className="text-xs font-medium text-muted-foreground">开号预览</div>
                    <div className="mt-1.5 space-y-1 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">员工</span>
                        <span className="font-medium text-foreground">
                          {selectedEmployee.employeeNo} — {selectedEmployee.fullName}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">登录名（AD）</span>
                        <span
                          className={
                            selectedEmployee.adAccount
                              ? "font-mono text-foreground"
                              : "text-destructive"
                          }
                        >
                          {selectedEmployee.adAccount || "未填写，无法开号"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                <FormField
                  label="初始密码"
                  required
                  hint={`默认 ${DEFAULT_INITIAL_PASSWORD}，开通后须首次登录修改`}
                >
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </FormField>
              </>
            ) : null}

            {sheetMode === "edit" && editing ? (
              <>
                <FormField label="登录名">
                  <Input value={editing.username} readOnly disabled />
                </FormField>
                {editing.accountType === "SYSTEM" ? (
                  <FormField label="展示名">
                    <Input
                      value={formDisplayName}
                      onChange={(e) => setFormDisplayName(e.target.value)}
                    />
                  </FormField>
                ) : (
                  <FormField label="员工" hint="姓名来自档案，不在此维护">
                    <Input
                      value={`${editing.employeeNo || ""} ${editing.employeeName || ""}`.trim()}
                      readOnly
                      disabled
                    />
                  </FormField>
                )}
                <FormField label="状态">
                  <OptionToggle options={STATUS_OPTIONS} value={formStatus} onChange={setFormStatus} />
                </FormField>
              </>
            ) : null}

            <FormField label="角色">
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <Button
                    key={r.id}
                    type="button"
                    size="sm"
                    variant={formRoleCodes.includes(r.code) ? "default" : "outline"}
                    className="h-8"
                    onClick={() => toggleRole(r.code)}
                  >
                    {r.name}
                  </Button>
                ))}
                {roles.length === 0 ? (
                  <span className="text-xs text-muted-foreground">暂无可用角色</span>
                ) : null}
              </div>
            </FormField>
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
                取消
              </Button>
              <Button onClick={() => void saveSheet()} disabled={saving}>
                {saving ? "保存中…" : "保存"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(resetTarget)}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
      >
        <SheetContent className="gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>重置密码</SheetTitle>
            <SheetDescription>
              {resetTarget
                ? `将重置账号 ${resetTarget.username} 的密码，并要求下次登录后修改。`
                : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-6 py-4">
            <FormField label="新密码" required hint={`默认 ${DEFAULT_INITIAL_PASSWORD}，重置后须首次登录修改`}>
              <Input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                autoComplete="new-password"
              />
            </FormField>
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" disabled={resetLoading} onClick={() => setResetTarget(null)}>
                取消
              </Button>
              <Button disabled={resetLoading} onClick={() => void confirmReset()}>
                {resetLoading ? "处理中…" : "确认重置"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <SheetContent className="gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>变更 AD / 登录名</SheetTitle>
            <SheetDescription>将同步更新员工档案当前有效 AD账号与系统登录名。</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-6 py-4">
            <FormField label="新 AD账号" required>
              <Input value={newAdAccount} onChange={(e) => setNewAdAccount(e.target.value)} />
            </FormField>
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" disabled={renameLoading} onClick={() => setRenameTarget(null)}>
                取消
              </Button>
              <Button disabled={renameLoading} onClick={() => void confirmRename()}>
                {renameLoading ? "处理中…" : "确认变更"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(disableTarget)}
        onOpenChange={(open) => {
          if (!open) setDisableTarget(null);
        }}
        title="停用账号"
        description={
          disableTarget ? `停用后 ${disableTarget.username} 将立即无法登录。` : "确认停用该账号？"
        }
        confirmLabel="确认停用"
        destructive
        loading={disableLoading}
        onConfirm={() => void confirmDisable()}
      />
    </div>
  );
}
