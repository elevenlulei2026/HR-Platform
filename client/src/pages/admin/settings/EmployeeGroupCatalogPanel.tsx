import type {
  DictStatus,
  EmployeeGroupCatalogTreeRow,
  EmployeeGroupDef,
  EmployeeSubgroupDef,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Eye, Inbox, Pencil, Plus, RefreshCw, Search } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  createEmployeeGroup,
  createEmployeeSubgroup,
  getEmployeeGroupCatalogTree,
  listEmployeeGroups,
  listEmployeeSubgroups,
  updateEmployeeGroup,
  updateEmployeeGroupStatus,
  updateEmployeeSubgroup,
  updateEmployeeSubgroupStatus,
} from "@/api/employee-group-catalog";
import { FormField, OptionToggle, STATUS_OPTIONS } from "@/components/admin/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

type LoadState<T> =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; data: T };

type SheetMode =
  | { type: "closed" }
  | { type: "group-new" }
  | { type: "group-edit"; item: EmployeeGroupDef }
  | { type: "subgroup-new"; employeeGroupCode: string }
  | { type: "subgroup-edit"; item: EmployeeSubgroupDef };

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
      {active ? "有效" : "失效"}
    </Badge>
  );
}

function PanelLoading({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center px-6 py-16 text-sm text-muted-foreground">
      <RefreshCw className="mr-2 size-4 animate-spin opacity-60" />
      {message}
    </div>
  );
}

function PanelError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <div className="text-sm font-medium text-destructive">加载失败</div>
      <div className="mt-1 text-sm text-destructive/90">
        {error.traceId ? `${error.message}（traceId: ${error.traceId}）` : error.message}
      </div>
      <Button className="mt-4" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

function PanelEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function CatalogListItem({
  active,
  title,
  subtitle,
  status,
  onSelect,
  onEdit,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  status: string;
  onSelect: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden rounded-lg border transition-colors",
        active
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-transparent hover:border-border hover:bg-accent/50",
      )}
    >
      <button
        type="button"
        className="min-w-0 flex-1 px-3 py-2.5 text-left"
        onClick={onSelect}
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          <StatusBadge status={status} />
        </div>
        <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{subtitle}</div>
      </button>
      <Button variant="ghost" size="icon-sm" className="shrink-0 rounded-none" onClick={onEdit}>
        <Pencil />
      </Button>
    </div>
  );
}

export function EmployeeGroupCatalogPanel() {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [groupsState, setGroupsState] = useState<LoadState<EmployeeGroupDef[]>>({ type: "loading" });
  const [subgroupsState, setSubgroupsState] = useState<LoadState<EmployeeSubgroupDef[]>>({
    type: "ok",
    data: [],
  });
  const [selectedGroupCode, setSelectedGroupCode] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [treeOpen, setTreeOpen] = useState(false);
  const [treeState, setTreeState] = useState<LoadState<EmployeeGroupCatalogTreeRow[]>>({
    type: "loading",
  });

  const loadGroups = useCallback(async () => {
    setGroupsState({ type: "loading" });
    try {
      const res = await listEmployeeGroups();
      setGroupsState({ type: "ok", data: res.data });
      setSelectedGroupCode((prev) => prev ?? res.data[0]?.code ?? null);
    } catch (e: unknown) {
      setGroupsState({ type: "error", error: e as ApiError });
    }
  }, []);

  const loadSubgroups = useCallback(async (groupCode: string) => {
    setSubgroupsState({ type: "loading" });
    try {
      const res = await listEmployeeSubgroups(groupCode);
      setSubgroupsState({ type: "ok", data: res.data });
    } catch (e: unknown) {
      setSubgroupsState({ type: "error", error: e as ApiError });
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!selectedGroupCode) {
      setSubgroupsState({ type: "ok", data: [] });
      return;
    }
    void loadSubgroups(selectedGroupCode);
  }, [selectedGroupCode, loadSubgroups]);

  const groups = groupsState.type === "ok" ? groupsState.data : [];
  const subgroups = subgroupsState.type === "ok" ? subgroupsState.data : [];

  const filteredGroups = useMemo(() => {
    const q = debouncedKeyword.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) => g.code.toLowerCase().includes(q) || g.name.toLowerCase().includes(q),
    );
  }, [groups, debouncedKeyword]);

  const selectedGroup = groups.find((g) => g.code === selectedGroupCode);

  async function openTreePreview() {
    setTreeOpen(true);
    setTreeState({ type: "loading" });
    try {
      const res = await getEmployeeGroupCatalogTree();
      setTreeState({ type: "ok", data: res.data });
    } catch (e: unknown) {
      setTreeState({ type: "error", error: e as ApiError });
    }
  }

  async function onSavedGroup() {
    await loadGroups();
    if (selectedGroupCode) await loadSubgroups(selectedGroupCode);
  }

  async function onSavedSubgroup(groupCode: string) {
    await loadSubgroups(groupCode);
    await loadGroups();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          维护员工组与员工子组；任职信息选择时按组联动子组，新单据仅使用「有效」项。
        </p>
        <Button variant="outline" size="sm" onClick={() => void openTreePreview()}>
          <Eye />
          预览整表
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-t-2 border-t-primary/70 bg-card shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[minmax(240px,300px)_1fr]">
          <ColumnShell
            title="员工组"
            description={`共 ${groups.length} 项`}
            action={
              <Button size="sm" onClick={() => setSheet({ type: "group-new" })}>
                <Plus />
                新建
              </Button>
            }
          >
            <InputGroup className="mb-3">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索编码 / 名称"
              />
            </InputGroup>

            {groupsState.type === "loading" ? <PanelLoading message="正在加载员工组…" /> : null}
            {groupsState.type === "error" ? (
              <PanelError error={groupsState.error} onRetry={() => void loadGroups()} />
            ) : null}
            {groupsState.type === "ok" && filteredGroups.length === 0 ? (
              <PanelEmpty title="暂无员工组" description="创建第一个员工组。" />
            ) : null}
            {groupsState.type === "ok" && filteredGroups.length > 0 ? (
              <div className="space-y-1.5">
                {filteredGroups.map((g) => (
                  <CatalogListItem
                    key={g.id}
                    active={selectedGroupCode === g.code}
                    title={g.name}
                    subtitle={`${g.code}${g.subgroupCount ? ` · ${g.subgroupCount} 个子组` : ""}`}
                    status={g.status}
                    onSelect={() => setSelectedGroupCode(g.code)}
                    onEdit={() => setSheet({ type: "group-edit", item: g })}
                  />
                ))}
              </div>
            ) : null}
          </ColumnShell>

          <ColumnShell
            title="员工子组"
            description={selectedGroup ? `${selectedGroup.name}（${selectedGroup.code}）` : "请先选择员工组"}
            action={
              selectedGroupCode ? (
                <Button
                  size="sm"
                  onClick={() => setSheet({ type: "subgroup-new", employeeGroupCode: selectedGroupCode })}
                >
                  <Plus />
                  新建
                </Button>
              ) : null
            }
            bordered
          >
            {!selectedGroupCode ? (
              <PanelEmpty title="未选择员工组" description="从左侧选择一个员工组。" />
            ) : null}
            {selectedGroupCode && subgroupsState.type === "loading" ? (
              <PanelLoading message="正在加载员工子组…" />
            ) : null}
            {selectedGroupCode && subgroupsState.type === "error" ? (
              <PanelError
                error={subgroupsState.error}
                onRetry={() => selectedGroupCode && void loadSubgroups(selectedGroupCode)}
              />
            ) : null}
            {selectedGroupCode && subgroupsState.type === "ok" && subgroups.length === 0 ? (
              <PanelEmpty
                title="暂无员工子组"
                description="为该员工组添加第一个子组。"
                action={
                  <Button
                    size="sm"
                    onClick={() =>
                      setSheet({ type: "subgroup-new", employeeGroupCode: selectedGroupCode })
                    }
                  >
                    <Plus />
                    新建子组
                  </Button>
                }
              />
            ) : null}
            {selectedGroupCode && subgroupsState.type === "ok" && subgroups.length > 0 ? (
              <div className="space-y-1.5">
                {subgroups.map((s) => (
                  <CatalogListItem
                    key={s.id}
                    active={false}
                    title={s.name}
                    subtitle={s.code}
                    status={s.status}
                    onSelect={() => setSheet({ type: "subgroup-edit", item: s })}
                    onEdit={() => setSheet({ type: "subgroup-edit", item: s })}
                  />
                ))}
              </div>
            ) : null}
          </ColumnShell>
        </div>
      </div>

      <CatalogSheet
        mode={sheet}
        onClose={() => setSheet({ type: "closed" })}
        onSavedGroup={() => void onSavedGroup()}
        onSavedSubgroup={(groupCode) => void onSavedSubgroup(groupCode)}
      />

      <EmployeeGroupCatalogTreeDialog
        open={treeOpen}
        onOpenChange={setTreeOpen}
        state={treeState}
        onRetry={() => void openTreePreview()}
      />
    </div>
  );
}

function EmployeeGroupCatalogTreeDialog({
  open,
  onOpenChange,
  state,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: LoadState<EmployeeGroupCatalogTreeRow[]>;
  onRetry: () => void;
}) {
  const stats = useMemo(() => {
    if (state.type !== "ok") return null;
    const total = state.data.length;
    const inactive = state.data.filter(
      (row) => row.employeeGroupStatus === "DISABLED" || row.employeeSubgroupStatus === "DISABLED",
    ).length;
    return { total, active: total - inactive, inactive };
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[min(92dvh,800px)] w-[min(calc(100vw-1.5rem),960px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none",
        )}
      >
        <DialogHeader className="shrink-0 space-y-3 border-b bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <DialogTitle className="text-lg">员工组/子组整表预览</DialogTitle>
              <DialogDescription>对齐业务材料扁平结构；失效项仅供历史参考。</DialogDescription>
            </div>
            {stats ? (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">共 {stats.total} 行</Badge>
                <Badge variant="secondary" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700">
                  有效 {stats.active}
                </Badge>
                <Badge variant="outline">失效 {stats.inactive}</Badge>
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto">
          {state.type === "loading" ? <PanelLoading message="正在加载整表…" /> : null}
          {state.type === "error" ? <PanelError error={state.error} onRetry={onRetry} /> : null}
          {state.type === "ok" ? (
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 shadow-sm backdrop-blur-sm">
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-[100px] px-4 py-3 font-medium whitespace-nowrap">员工组编码</th>
                  <th className="min-w-[120px] px-4 py-3 font-medium whitespace-nowrap">员工组名称</th>
                  <th className="w-[100px] px-4 py-3 font-medium whitespace-nowrap">子组编码</th>
                  <th className="min-w-[160px] px-4 py-3 font-medium">子组名称</th>
                  <th className="w-[88px] px-4 py-3 font-medium whitespace-nowrap">状态</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((row, index) => {
                  const inactive =
                    row.employeeGroupStatus === "DISABLED" ||
                    row.employeeSubgroupStatus === "DISABLED";
                  return (
                    <tr
                      key={`${row.employeeGroupCode}-${row.employeeSubgroupCode ?? ""}-${index}`}
                      className={cn(
                        "border-b transition-colors hover:bg-muted/20",
                        inactive && "bg-muted/25 text-muted-foreground",
                      )}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                        {row.employeeGroupCode}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{row.employeeGroupName}</td>
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                        {row.employeeSubgroupCode ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 leading-relaxed break-words">
                        {row.employeeSubgroupName ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {inactive ? (
                          <Badge variant="outline">失效</Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          >
                            有效
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ColumnShell({
  title,
  description,
  action,
  bordered,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  bordered?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("border-b xl:border-b-0", bordered && "xl:border-l")}>
      <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function CatalogSheet(props: {
  mode: SheetMode;
  onClose: () => void;
  onSavedGroup: () => void;
  onSavedSubgroup: (groupCode: string) => void;
}) {
  const open = props.mode.type !== "closed";
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (props.mode.type === "closed") return;
    if (props.mode.type === "group-new") {
      setForm({ code: "", name: "", status: "ACTIVE", sort: "0", remark: "" });
      return;
    }
    if (props.mode.type === "group-edit") {
      setForm({
        code: props.mode.item.code,
        name: props.mode.item.name,
        status: props.mode.item.status,
        sort: String(props.mode.item.sort),
        remark: props.mode.item.remark ?? "",
      });
      return;
    }
    if (props.mode.type === "subgroup-new") {
      setForm({
        employeeGroupCode: props.mode.employeeGroupCode,
        code: "",
        name: "",
        status: "ACTIVE",
        sort: "0",
        remark: "",
      });
      return;
    }
    if (props.mode.type === "subgroup-edit") {
      setForm({
        employeeGroupCode: props.mode.item.employeeGroupCode,
        code: props.mode.item.code,
        name: props.mode.item.name,
        status: props.mode.item.status,
        sort: String(props.mode.item.sort),
        remark: props.mode.item.remark ?? "",
      });
    }
  }, [props.mode]);

  const title =
    props.mode.type === "group-new"
      ? "新建员工组"
      : props.mode.type === "group-edit"
        ? "编辑员工组"
        : props.mode.type === "subgroup-new"
          ? "新建员工子组"
          : props.mode.type === "subgroup-edit"
            ? "编辑员工子组"
            : "";

  async function onSave() {
    try {
      setSaving(true);
      const sort = Number.isFinite(Number(form.sort)) ? Number(form.sort) : 0;
      const status = (form.status as DictStatus) || "ACTIVE";

      if (props.mode.type === "group-new") {
        await createEmployeeGroup({
          code: form.code.trim(),
          name: form.name.trim(),
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedGroup();
        props.onClose();
        return;
      }
      if (props.mode.type === "group-edit") {
        await updateEmployeeGroup(props.mode.item.id, {
          name: form.name.trim(),
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedGroup();
        props.onClose();
        return;
      }
      if (props.mode.type === "subgroup-new") {
        await createEmployeeSubgroup({
          employeeGroupCode: form.employeeGroupCode,
          code: form.code.trim(),
          name: form.name.trim(),
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedSubgroup(form.employeeGroupCode);
        props.onClose();
        return;
      }
      if (props.mode.type === "subgroup-edit") {
        await updateEmployeeSubgroup(props.mode.item.id, {
          name: form.name.trim(),
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedSubgroup(props.mode.item.employeeGroupCode);
        props.onClose();
      }
    } catch (e: unknown) {
      const msg =
        typeof (e as { message?: string })?.message === "string"
          ? (e as { message: string }).message
          : "操作失败";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDisable() {
    try {
      setSaving(true);
      if (props.mode.type === "group-edit") {
        await updateEmployeeGroupStatus(props.mode.item.id, "DISABLED");
        toast.success("已停用");
        props.onSavedGroup();
        props.onClose();
        return;
      }
      if (props.mode.type === "subgroup-edit") {
        await updateEmployeeSubgroupStatus(props.mode.item.id, "DISABLED");
        toast.success("已停用");
        props.onSavedSubgroup(props.mode.item.employeeGroupCode);
        props.onClose();
      }
    } catch (e: unknown) {
      const msg =
        typeof (e as { message?: string })?.message === "string"
          ? (e as { message: string }).message
          : "操作失败";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const canDisable = props.mode.type === "group-edit" || props.mode.type === "subgroup-edit";

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? props.onClose() : null)}>
      <SheetContent className="gap-0 p-0">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>保存后将立即生效（内存缓存会自动刷新）。</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {(props.mode.type === "group-new" || props.mode.type === "group-edit") && (
            <>
              <FormField label="员工组编码" required>
                <Input
                  value={form.code || ""}
                  disabled={props.mode.type === "group-edit"}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="例如 10"
                />
              </FormField>
              <FormField label="员工组名称" required>
                <Input
                  value={form.name || ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例如 正式员工"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="状态">
                  <OptionToggle
                    options={STATUS_OPTIONS}
                    value={(form.status as DictStatus) || "ACTIVE"}
                    onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  />
                </FormField>
                <FormField label="排序">
                  <Input
                    value={form.sort || "0"}
                    onChange={(e) => setForm((f) => ({ ...f, sort: e.target.value }))}
                  />
                </FormField>
              </div>
              <FormField label="备注">
                <Input
                  value={form.remark || ""}
                  onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                />
              </FormField>
            </>
          )}

          {(props.mode.type === "subgroup-new" || props.mode.type === "subgroup-edit") && (
            <>
              <FormField label="所属员工组">
                <Input value={form.employeeGroupCode || ""} disabled />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="子组编码" required>
                  <Input
                    value={form.code || ""}
                    disabled={props.mode.type === "subgroup-edit"}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="例如 1001"
                  />
                </FormField>
                <FormField label="子组名称" required>
                  <Input
                    value={form.name || ""}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="状态">
                  <OptionToggle
                    options={STATUS_OPTIONS}
                    value={(form.status as DictStatus) || "ACTIVE"}
                    onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  />
                </FormField>
                <FormField label="排序">
                  <Input
                    value={form.sort || "0"}
                    onChange={(e) => setForm((f) => ({ ...f, sort: e.target.value }))}
                  />
                </FormField>
              </div>
              <FormField label="备注">
                <Input
                  value={form.remark || ""}
                  onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                />
              </FormField>
            </>
          )}
        </div>

        <SheetFooter>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {canDisable ? (
              <Button variant="destructive" disabled={saving} onClick={() => void onDisable()}>
                停用
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" disabled={saving} onClick={props.onClose}>
                取消
              </Button>
              <Button disabled={saving} onClick={() => void onSave()}>
                保存
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
