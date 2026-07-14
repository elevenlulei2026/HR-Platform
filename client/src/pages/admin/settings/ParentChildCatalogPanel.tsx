import type {
  DictStatus,
  ParentChildItemDef,
  ParentChildTreeRow3,
  ParentChildTypeDef,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Eye, Inbox, Pencil, Plus, RefreshCw, Search, Tag } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  createChild,
  createParent,
  createParentChildType,
  getParentChildTree3,
  listChildrenByParent,
  listParentChildTypes,
  listParentsByType,
  updateChild,
  updateParent,
  updateParentChildItemStatus,
  updateParentChildType,
} from "@/api/parent-child-catalog";
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
  | { type: "type-new" }
  | { type: "type-edit"; item: ParentChildTypeDef }
  | { type: "parent-new"; typeCode: string }
  | { type: "parent-edit"; item: ParentChildItemDef }
  | { type: "child-new"; typeCode: string; parentCode: string }
  | { type: "child-edit"; item: ParentChildItemDef };

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
  subtitleClassName,
  onSelect,
  onEdit,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  status: string;
  subtitleClassName?: string;
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
      <button type="button" className="min-w-0 flex-1 px-3 py-2.5 text-left" onClick={onSelect}>
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          <StatusBadge status={status} />
        </div>
        <div
          className={cn(
            "mt-0.5 text-xs text-muted-foreground",
            subtitleClassName ?? "truncate font-mono",
          )}
        >
          {subtitle}
        </div>
      </button>
      <Button variant="ghost" size="icon-sm" className="shrink-0 rounded-none" onClick={onEdit}>
        <Pencil />
      </Button>
    </div>
  );
}

export function ParentChildCatalogPanel() {
  const [typeKeyword, setTypeKeyword] = useState("");
  const debouncedTypeKeyword = useDebouncedValue(typeKeyword);
  const [typesState, setTypesState] = useState<LoadState<ParentChildTypeDef[]>>({ type: "loading" });
  const [selectedTypeCode, setSelectedTypeCode] = useState<string | null>(null);

  const [parentsState, setParentsState] = useState<LoadState<ParentChildItemDef[]>>({ type: "ok", data: [] });
  const [selectedParentCode, setSelectedParentCode] = useState<string | null>(null);
  const [childrenState, setChildrenState] = useState<LoadState<ParentChildItemDef[]>>({ type: "ok", data: [] });
  const [selectedChildCode, setSelectedChildCode] = useState<string | null>(null);
  const [grandchildrenState, setGrandchildrenState] = useState<LoadState<ParentChildItemDef[]>>({
    type: "ok",
    data: [],
  });

  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [treeOpen, setTreeOpen] = useState(false);
  const [treeState, setTreeState] = useState<LoadState<ParentChildTreeRow3[]>>({ type: "loading" });

  const loadTypes = useCallback(async () => {
    setTypesState({ type: "loading" });
    try {
      const res = await listParentChildTypes();
      setTypesState({ type: "ok", data: res.data });
      setSelectedTypeCode((prev) => prev ?? res.data[0]?.code ?? null);
    } catch (e: unknown) {
      setTypesState({ type: "error", error: e as ApiError });
    }
  }, []);

  const loadParents = useCallback(async (typeCode: string) => {
    setParentsState({ type: "loading" });
    try {
      const res = await listParentsByType(typeCode);
      setParentsState({ type: "ok", data: res.data });
      setSelectedParentCode((prev) => prev ?? res.data[0]?.code ?? null);
    } catch (e: unknown) {
      setParentsState({ type: "error", error: e as ApiError });
    }
  }, []);

  const loadChildren = useCallback(async (typeCode: string, parentCode: string) => {
    setChildrenState({ type: "loading" });
    try {
      const res = await listChildrenByParent(typeCode, parentCode);
      setChildrenState({ type: "ok", data: res.data });
      setSelectedChildCode((prev) => prev ?? res.data[0]?.code ?? null);
    } catch (e: unknown) {
      setChildrenState({ type: "error", error: e as ApiError });
    }
  }, []);

  const loadGrandchildren = useCallback(async (typeCode: string, childCode: string) => {
    setGrandchildrenState({ type: "loading" });
    try {
      const res = await listChildrenByParent(typeCode, childCode);
      setGrandchildrenState({ type: "ok", data: res.data });
    } catch (e: unknown) {
      setGrandchildrenState({ type: "error", error: e as ApiError });
    }
  }, []);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    if (!selectedTypeCode) {
      setParentsState({ type: "ok", data: [] });
      setChildrenState({ type: "ok", data: [] });
      setSelectedParentCode(null);
      setSelectedChildCode(null);
      setGrandchildrenState({ type: "ok", data: [] });
      return;
    }
    void loadParents(selectedTypeCode);
  }, [selectedTypeCode, loadParents]);

  useEffect(() => {
    if (!selectedTypeCode || !selectedParentCode) {
      setChildrenState({ type: "ok", data: [] });
      setSelectedChildCode(null);
      setGrandchildrenState({ type: "ok", data: [] });
      return;
    }
    void loadChildren(selectedTypeCode, selectedParentCode);
  }, [selectedTypeCode, selectedParentCode, loadChildren]);

  useEffect(() => {
    if (!selectedTypeCode || !selectedChildCode) {
      setGrandchildrenState({ type: "ok", data: [] });
      return;
    }
    void loadGrandchildren(selectedTypeCode, selectedChildCode);
  }, [selectedTypeCode, selectedChildCode, loadGrandchildren]);

  const types = typesState.type === "ok" ? typesState.data : [];
  const parents = parentsState.type === "ok" ? parentsState.data : [];
  const children = childrenState.type === "ok" ? childrenState.data : [];
  const grandchildren = grandchildrenState.type === "ok" ? grandchildrenState.data : [];

  const filteredTypes = useMemo(() => {
    const q = debouncedTypeKeyword.trim().toLowerCase();
    if (!q) return types;
    return types.filter(
      (t) => t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
    );
  }, [types, debouncedTypeKeyword]);

  const selectedType = types.find((t) => t.code === selectedTypeCode) ?? null;
  const selectedParent = parents.find((p) => p.code === selectedParentCode) ?? null;
  const selectedChild = children.find((c) => c.code === selectedChildCode) ?? null;

  async function openTreePreview() {
    if (!selectedTypeCode) return;
    setTreeOpen(true);
    setTreeState({ type: "loading" });
    try {
      const res = await getParentChildTree3(selectedTypeCode);
      setTreeState({ type: "ok", data: res.data });
    } catch (e: unknown) {
      setTreeState({ type: "error", error: e as ApiError });
    }
  }

  async function onSavedType() {
    await loadTypes();
    if (selectedTypeCode) await loadParents(selectedTypeCode);
  }

  async function onSavedParent() {
    if (!selectedTypeCode) return;
    await loadParents(selectedTypeCode);
    if (selectedParentCode) await loadChildren(selectedTypeCode, selectedParentCode);
  }

  async function onSavedChild() {
    if (!selectedTypeCode || !selectedParentCode) return;
    await loadChildren(selectedTypeCode, selectedParentCode);
    if (selectedChildCode) await loadGrandchildren(selectedTypeCode, selectedChildCode);
    await loadParents(selectedTypeCode);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Tag className="size-4 opacity-60" />
          <span>维护通用父子值目录；业务模块可复用同一套“父→子”联动选项。</span>
        </div>
        <Button variant="outline" size="sm" disabled={!selectedTypeCode} onClick={() => void openTreePreview()}>
          <Eye />
          预览整表
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="grid gap-0 2xl:grid-cols-[minmax(280px,360px)_repeat(3,minmax(240px,1fr))]">
          <ColumnShell
            title="配置类型"
            description={`共 ${types.length} 项`}
            action={
              <Button size="sm" onClick={() => setSheet({ type: "type-new" })}>
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
                value={typeKeyword}
                onChange={(e) => setTypeKeyword(e.target.value)}
                placeholder="搜索编码 / 名称"
              />
            </InputGroup>

            {typesState.type === "loading" ? <PanelLoading message="正在加载类型…" /> : null}
            {typesState.type === "error" ? (
              <PanelError error={typesState.error} onRetry={() => void loadTypes()} />
            ) : null}
            {typesState.type === "ok" && filteredTypes.length === 0 ? (
              <PanelEmpty title="暂无类型" description="创建第一个父子值配置类型，例如 员工组/子组。" />
            ) : null}
            {typesState.type === "ok" && filteredTypes.length > 0 ? (
              <div className="space-y-1.5">
                {filteredTypes.map((t) => (
                  <CatalogListItem
                    key={t.id}
                    active={selectedTypeCode === t.code}
                    title={t.name}
                    subtitle={`${t.code}${t.description ? `\n${t.description}` : ""}`}
                    status={t.status}
                    subtitleClassName={t.description ? "line-clamp-2 whitespace-pre-line break-words" : undefined}
                    onSelect={() => setSelectedTypeCode(t.code)}
                    onEdit={() => setSheet({ type: "type-edit", item: t })}
                  />
                ))}
              </div>
            ) : null}
          </ColumnShell>

          <ColumnShell
            title="一级"
            description={selectedType ? `${selectedType.name}（${selectedType.code}）` : "请先选择类型"}
            action={
              selectedTypeCode ? (
                <Button size="sm" onClick={() => setSheet({ type: "parent-new", typeCode: selectedTypeCode })}>
                  <Plus />
                  新建
                </Button>
              ) : null
            }
            bordered
          >
            {!selectedTypeCode ? (
              <PanelEmpty title="未选择类型" description="从左侧选择一个配置类型。" />
            ) : null}
            {selectedTypeCode && parentsState.type === "loading" ? (
              <PanelLoading message="正在加载父项…" />
            ) : null}
            {selectedTypeCode && parentsState.type === "error" ? (
              <PanelError error={parentsState.error} onRetry={() => selectedTypeCode && void loadParents(selectedTypeCode)} />
            ) : null}
            {selectedTypeCode && parentsState.type === "ok" && parents.length === 0 ? (
              <PanelEmpty title="暂无父项" description="为该类型添加第一个父项。" />
            ) : null}
            {selectedTypeCode && parentsState.type === "ok" && parents.length > 0 ? (
              <div className="space-y-1.5">
                {parents.map((p) => (
                  <CatalogListItem
                    key={p.id}
                    active={selectedParentCode === p.code}
                    title={p.name}
                    subtitle={p.code}
                    status={p.status}
                    onSelect={() => setSelectedParentCode(p.code)}
                    onEdit={() => setSheet({ type: "parent-edit", item: p })}
                  />
                ))}
              </div>
            ) : null}
          </ColumnShell>

          <ColumnShell
            title="二级"
            description={
              selectedParent && selectedType
                ? `${selectedParent.name}（${selectedParent.code}）`
                : selectedType
                  ? "请先选择父项"
                  : "请先选择类型"
            }
            action={
              selectedTypeCode && selectedParentCode ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setSheet({ type: "child-new", typeCode: selectedTypeCode, parentCode: selectedParentCode })
                  }
                >
                  <Plus />
                  新建
                </Button>
              ) : null
            }
            bordered
          >
            {!selectedTypeCode ? (
              <PanelEmpty title="未选择类型" description="从左侧选择一个配置类型。" />
            ) : null}
            {selectedTypeCode && !selectedParentCode ? (
              <PanelEmpty title="未选择父项" description="从中间列表选择一个父项。" />
            ) : null}
            {selectedTypeCode && selectedParentCode && childrenState.type === "loading" ? (
              <PanelLoading message="正在加载子项…" />
            ) : null}
            {selectedTypeCode && selectedParentCode && childrenState.type === "error" ? (
              <PanelError
                error={childrenState.error}
                onRetry={() =>
                  selectedTypeCode && selectedParentCode && void loadChildren(selectedTypeCode, selectedParentCode)
                }
              />
            ) : null}
            {selectedTypeCode && selectedParentCode && childrenState.type === "ok" && children.length === 0 ? (
              <PanelEmpty
                title="暂无子项"
                description="为该父项添加第一个子项。"
                action={
                  <Button
                    size="sm"
                    onClick={() =>
                      selectedTypeCode &&
                      selectedParentCode &&
                      setSheet({ type: "child-new", typeCode: selectedTypeCode, parentCode: selectedParentCode })
                    }
                  >
                    <Plus />
                    新建子项
                  </Button>
                }
              />
            ) : null}
            {selectedTypeCode && selectedParentCode && childrenState.type === "ok" && children.length > 0 ? (
              <div className="space-y-1.5">
                {children.map((c) => (
                  <CatalogListItem
                    key={c.id}
                    active={selectedChildCode === c.code}
                    title={c.name}
                    subtitle={c.code}
                    status={c.status}
                    onSelect={() => setSelectedChildCode(c.code)}
                    onEdit={() => setSheet({ type: "child-edit", item: c })}
                  />
                ))}
              </div>
            ) : null}
          </ColumnShell>

          <ColumnShell
            title="三级"
            description={
              selectedChild && selectedParent
                ? `${selectedChild.name}（${selectedChild.code}）`
                : selectedParent
                  ? "请先选择二级"
                  : "请先选择一级"
            }
            action={
              selectedTypeCode && selectedChildCode ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setSheet({ type: "child-new", typeCode: selectedTypeCode, parentCode: selectedChildCode })
                  }
                >
                  <Plus />
                  新建
                </Button>
              ) : null
            }
            bordered
          >
            {!selectedTypeCode ? (
              <PanelEmpty title="未选择类型" description="从左侧选择一个配置类型。" />
            ) : null}
            {selectedTypeCode && !selectedParentCode ? (
              <PanelEmpty title="未选择一级" description="从一级列表选择一个项。" />
            ) : null}
            {selectedTypeCode && selectedParentCode && !selectedChildCode ? (
              <PanelEmpty title="未选择二级" description="从二级列表选择一个项。" />
            ) : null}
            {selectedTypeCode && selectedChildCode && grandchildrenState.type === "loading" ? (
              <PanelLoading message="正在加载三级…" />
            ) : null}
            {selectedTypeCode && selectedChildCode && grandchildrenState.type === "error" ? (
              <PanelError
                error={grandchildrenState.error}
                onRetry={() =>
                  selectedTypeCode && selectedChildCode && void loadGrandchildren(selectedTypeCode, selectedChildCode)
                }
              />
            ) : null}
            {selectedTypeCode && selectedChildCode && grandchildrenState.type === "ok" && grandchildren.length === 0 ? (
              <PanelEmpty
                title="暂无三级"
                description="为该二级项添加第一个三级项。"
                action={
                  <Button
                    size="sm"
                    onClick={() =>
                      selectedTypeCode &&
                      selectedChildCode &&
                      setSheet({ type: "child-new", typeCode: selectedTypeCode, parentCode: selectedChildCode })
                    }
                  >
                    <Plus />
                    新建三级
                  </Button>
                }
              />
            ) : null}
            {selectedTypeCode && selectedChildCode && grandchildrenState.type === "ok" && grandchildren.length > 0 ? (
              <div className="space-y-1.5">
                {grandchildren.map((g) => (
                  <CatalogListItem
                    key={g.id}
                    active={false}
                    title={g.name}
                    subtitle={g.code}
                    status={g.status}
                    onSelect={() => setSheet({ type: "child-edit", item: g })}
                    onEdit={() => setSheet({ type: "child-edit", item: g })}
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
        onSavedType={() => void onSavedType()}
        onSavedParent={() => void onSavedParent()}
        onSavedChild={() => void onSavedChild()}
      />

      <TreeDialog
        open={treeOpen}
        onOpenChange={setTreeOpen}
        state={treeState}
        title={selectedType ? `${selectedType.name} 整表预览` : "整表预览"}
        onRetry={() => void openTreePreview()}
      />
    </div>
  );
}

function TreeDialog({
  open,
  onOpenChange,
  state,
  onRetry,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: LoadState<ParentChildTreeRow3[]>;
  onRetry: () => void;
  title: string;
}) {
  const stats = useMemo(() => {
    if (state.type !== "ok") return null;
    const total = state.data.length;
    const inactive = state.data.filter(
      (row) =>
        row.level1Status === "DISABLED" ||
        row.level2Status === "DISABLED" ||
        row.level3Status === "DISABLED",
    ).length;
    return { total, active: total - inactive, inactive };
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[min(92dvh,820px)] w-[min(calc(100vw-1.5rem),980px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none",
        )}
      >
        <DialogHeader className="shrink-0 space-y-3 border-b bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription>扁平结构预览；失效项仅供历史参考。</DialogDescription>
            </div>
            {stats ? (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">共 {stats.total} 行</Badge>
                <Badge
                  variant="secondary"
                  className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                >
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
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 shadow-sm backdrop-blur-sm">
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-[140px] px-4 py-3 font-medium whitespace-nowrap">一级编码</th>
                  <th className="min-w-[180px] px-4 py-3 font-medium whitespace-nowrap">一级名称</th>
                  <th className="w-[140px] px-4 py-3 font-medium whitespace-nowrap">二级编码</th>
                  <th className="min-w-[200px] px-4 py-3 font-medium whitespace-nowrap">二级名称</th>
                  <th className="w-[140px] px-4 py-3 font-medium whitespace-nowrap">三级编码</th>
                  <th className="min-w-[240px] px-4 py-3 font-medium">三级名称</th>
                  <th className="w-[88px] px-4 py-3 font-medium whitespace-nowrap">状态</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((row, index) => {
                  const inactive =
                    row.level1Status === "DISABLED" ||
                    row.level2Status === "DISABLED" ||
                    row.level3Status === "DISABLED";
                  return (
                    <tr
                      key={`${row.level1Code}-${row.level2Code ?? ""}-${row.level3Code ?? ""}-${index}`}
                      className={cn(
                        "border-b transition-colors hover:bg-muted/20",
                        inactive && "bg-muted/25 text-muted-foreground",
                      )}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{row.level1Code}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{row.level1Name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{row.level2Code ?? "—"}</td>
                      <td className="px-4 py-2.5 leading-relaxed break-words">{row.level2Name ?? "—"}</td>
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{row.level3Code ?? "—"}</td>
                      <td className="px-4 py-2.5 leading-relaxed break-words">{row.level3Name ?? "—"}</td>
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
    <div
      className={cn(
        "flex h-[min(72dvh,760px)] min-h-[520px] flex-col border-b 2xl:border-b-0",
        bordered && "2xl:border-l",
      )}
    >
      <div className="shrink-0 flex items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

function CatalogSheet(props: {
  mode: SheetMode;
  onClose: () => void;
  onSavedType: () => void;
  onSavedParent: () => void;
  onSavedChild: () => void;
}) {
  const open = props.mode.type !== "closed";
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (props.mode.type === "closed") return;
    if (props.mode.type === "type-new") {
      setForm({ code: "", name: "", description: "", status: "ACTIVE", sort: "0" });
      return;
    }
    if (props.mode.type === "type-edit") {
      setForm({
        code: props.mode.item.code,
        name: props.mode.item.name,
        description: props.mode.item.description ?? "",
        status: props.mode.item.status,
        sort: String(props.mode.item.sort ?? 0),
      });
      return;
    }
    if (props.mode.type === "parent-new") {
      setForm({ typeCode: props.mode.typeCode, code: "", name: "", status: "ACTIVE", sort: "0", remark: "" });
      return;
    }
    if (props.mode.type === "parent-edit") {
      setForm({
        typeCode: props.mode.item.typeCode,
        code: props.mode.item.code,
        name: props.mode.item.name,
        status: props.mode.item.status,
        sort: String(props.mode.item.sort ?? 0),
        remark: props.mode.item.remark ?? "",
      });
      return;
    }
    if (props.mode.type === "child-new") {
      setForm({
        typeCode: props.mode.typeCode,
        parentCode: props.mode.parentCode,
        code: "",
        name: "",
        status: "ACTIVE",
        sort: "0",
        remark: "",
      });
      return;
    }
    if (props.mode.type === "child-edit") {
      setForm({
        typeCode: props.mode.item.typeCode,
        parentCode: props.mode.item.parentCode ?? "",
        code: props.mode.item.code,
        name: props.mode.item.name,
        status: props.mode.item.status,
        sort: String(props.mode.item.sort ?? 0),
        remark: props.mode.item.remark ?? "",
      });
    }
  }, [props.mode]);

  const title =
    props.mode.type === "type-new"
      ? "新建类型"
      : props.mode.type === "type-edit"
        ? "编辑类型"
        : props.mode.type === "parent-new"
          ? "新建父项"
          : props.mode.type === "parent-edit"
            ? "编辑父项"
            : props.mode.type === "child-new"
              ? "新建子项"
              : props.mode.type === "child-edit"
                ? "编辑子项"
                : "";

  async function onSave() {
    try {
      setSaving(true);
      const sort = Number.isFinite(Number(form.sort)) ? Number(form.sort) : 0;
      const status = (form.status as DictStatus) || "ACTIVE";

      if (props.mode.type === "type-new") {
        await createParentChildType({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description?.trim() || undefined,
          status,
          sort,
        });
        toast.success("保存成功");
        props.onSavedType();
        props.onClose();
        return;
      }
      if (props.mode.type === "type-edit") {
        await updateParentChildType(props.mode.item.id, {
          name: form.name.trim(),
          description: form.description?.trim() || undefined,
          status,
          sort,
        });
        toast.success("保存成功");
        props.onSavedType();
        props.onClose();
        return;
      }
      if (props.mode.type === "parent-new") {
        await createParent({
          typeCode: form.typeCode,
          code: form.code.trim(),
          name: form.name.trim(),
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedParent();
        props.onClose();
        return;
      }
      if (props.mode.type === "parent-edit") {
        await updateParent(props.mode.item.id, {
          name: form.name.trim(),
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedParent();
        props.onClose();
        return;
      }
      if (props.mode.type === "child-new") {
        await createChild({
          typeCode: form.typeCode,
          parentCode: form.parentCode,
          code: form.code.trim(),
          name: form.name.trim(),
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedChild();
        props.onClose();
        return;
      }
      if (props.mode.type === "child-edit") {
        await updateChild(props.mode.item.id, {
          name: form.name.trim(),
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedChild();
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
      if (props.mode.type === "parent-edit" || props.mode.type === "child-edit") {
        await updateParentChildItemStatus(props.mode.item.id, "DISABLED");
        toast.success("已停用");
        if (props.mode.type === "parent-edit") props.onSavedParent();
        else props.onSavedChild();
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

  const canDisable = props.mode.type === "parent-edit" || props.mode.type === "child-edit";

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? props.onClose() : null)}>
      <SheetContent className="gap-0 p-0">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>保存后将立即生效（缓存会自动刷新）。</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {props.mode.type === "type-new" || props.mode.type === "type-edit" ? (
            <>
              <FormField label="类型编码" required>
                <Input
                  value={form.code || ""}
                  disabled={props.mode.type === "type-edit"}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="例如 EMPLOYEE_GROUP"
                />
              </FormField>
              <FormField label="类型名称" required>
                <Input
                  value={form.name || ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例如 员工组/子组"
                />
              </FormField>
              <FormField label="描述">
                <Input
                  value={form.description || ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="可选"
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
            </>
          ) : null}

          {props.mode.type === "parent-new" || props.mode.type === "parent-edit" ? (
            <>
              <FormField label="typeCode" required>
                <Input value={form.typeCode || ""} disabled />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="父项编码" required>
                  <Input
                    value={form.code || ""}
                    disabled={props.mode.type === "parent-edit"}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="例如 10"
                  />
                </FormField>
                <FormField label="父项名称" required>
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
                <Input value={form.remark || ""} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} />
              </FormField>
            </>
          ) : null}

          {props.mode.type === "child-new" || props.mode.type === "child-edit" ? (
            <>
              <FormField label="typeCode" required>
                <Input value={form.typeCode || ""} disabled />
              </FormField>
              <FormField label="所属父项" required>
                <Input value={form.parentCode || ""} disabled />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="子项编码" required>
                  <Input
                    value={form.code || ""}
                    disabled={props.mode.type === "child-edit"}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="例如 1001"
                  />
                </FormField>
                <FormField label="子项名称" required>
                  <Input value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
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
                <Input value={form.remark || ""} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} />
              </FormField>
            </>
          ) : null}
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

