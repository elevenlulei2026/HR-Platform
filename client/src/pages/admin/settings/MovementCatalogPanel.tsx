import type {
  DictStatus,
  MovementCatalogTreeRow,
  MovementPhase,
  MovementReasonDef,
  MovementReasonSubDef,
  MovementTypeDef,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Eye,
  Inbox,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  MOVEMENT_PHASE_OPTIONS,
  createMovementReason,
  createMovementReasonSub,
  createMovementType,
  getMovementCatalogTree,
  listMovementReasonSubs,
  listMovementReasons,
  listMovementTypes,
  updateMovementReason,
  updateMovementReasonStatus,
  updateMovementReasonSub,
  updateMovementReasonSubStatus,
  updateMovementType,
  updateMovementTypeStatus,
} from "@/api/movement-catalog";
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
  | { type: "type-edit"; item: MovementTypeDef }
  | { type: "reason-new"; movementTypeCode: string }
  | { type: "reason-edit"; item: MovementReasonDef }
  | { type: "sub-new"; reasonId: string }
  | { type: "sub-edit"; item: MovementReasonSubDef };

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

export function MovementCatalogPanel() {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [typesState, setTypesState] = useState<LoadState<MovementTypeDef[]>>({ type: "loading" });
  const [reasonsState, setReasonsState] = useState<LoadState<MovementReasonDef[]>>({
    type: "ok",
    data: [],
  });
  const [subsState, setSubsState] = useState<LoadState<MovementReasonSubDef[]>>({
    type: "ok",
    data: [],
  });
  const [selectedTypeCode, setSelectedTypeCode] = useState<string | null>(null);
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [treeOpen, setTreeOpen] = useState(false);
  const [treeState, setTreeState] = useState<LoadState<MovementCatalogTreeRow[]>>({
    type: "loading",
  });

  const loadTypes = useCallback(async () => {
    setTypesState({ type: "loading" });
    try {
      const res = await listMovementTypes();
      setTypesState({ type: "ok", data: res.data });
      setSelectedTypeCode((prev) => prev ?? res.data[0]?.code ?? null);
    } catch (e: unknown) {
      setTypesState({ type: "error", error: e as ApiError });
    }
  }, []);

  const loadReasons = useCallback(async (typeCode: string) => {
    setReasonsState({ type: "loading" });
    try {
      const res = await listMovementReasons(typeCode);
      setReasonsState({ type: "ok", data: res.data });
      if (res.data.length > 0) {
        setSelectedReasonId((prev) =>
          prev && res.data.some((r) => r.id === prev) ? prev : res.data[0].id,
        );
      } else {
        setSelectedReasonId(null);
      }
    } catch (e: unknown) {
      setReasonsState({ type: "error", error: e as ApiError });
    }
  }, []);

  const loadSubs = useCallback(async (reasonId: string) => {
    setSubsState({ type: "loading" });
    try {
      const res = await listMovementReasonSubs(reasonId);
      setSubsState({ type: "ok", data: res.data });
    } catch (e: unknown) {
      setSubsState({ type: "error", error: e as ApiError });
    }
  }, []);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    if (!selectedTypeCode) return;
    void loadReasons(selectedTypeCode);
  }, [selectedTypeCode, loadReasons]);

  useEffect(() => {
    if (!selectedReasonId) {
      setSubsState({ type: "ok", data: [] });
      return;
    }
    void loadSubs(selectedReasonId);
  }, [selectedReasonId, loadSubs]);

  const types = typesState.type === "ok" ? typesState.data : [];
  const reasons = reasonsState.type === "ok" ? reasonsState.data : [];
  const subs = subsState.type === "ok" ? subsState.data : [];

  const filteredTypes = useMemo(() => {
    const q = debouncedKeyword.trim().toLowerCase();
    if (!q) return types;
    return types.filter(
      (t) => t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
    );
  }, [types, debouncedKeyword]);

  const selectedType = types.find((t) => t.code === selectedTypeCode);
  const selectedReason = reasons.find((r) => r.id === selectedReasonId);

  async function openTreePreview() {
    setTreeOpen(true);
    setTreeState({ type: "loading" });
    try {
      const res = await getMovementCatalogTree();
      setTreeState({ type: "ok", data: res.data });
    } catch (e: unknown) {
      setTreeState({ type: "error", error: e as ApiError });
    }
  }

  async function onSavedType() {
    await loadTypes();
    if (selectedTypeCode) await loadReasons(selectedTypeCode);
  }

  async function onSavedReason(typeCode: string) {
    await loadReasons(typeCode);
    if (selectedReasonId) await loadSubs(selectedReasonId);
  }

  async function onSavedSub(reasonId: string) {
    await loadSubs(reasonId);
    if (selectedTypeCode) await loadReasons(selectedTypeCode);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          维护入转调离操作码、原因码及原因子项；新单据仅使用「有效」项。
        </p>
        <Button variant="outline" size="sm" onClick={() => void openTreePreview()}>
          <Eye />
          预览整表
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-t-2 border-t-primary/70 bg-card shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[minmax(220px,260px)_minmax(260px,1fr)_minmax(240px,1fr)]">
          {/* 操作 */}
          <ColumnShell
            title="操作"
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
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索 code / 名称"
              />
            </InputGroup>

            {typesState.type === "loading" ? <PanelLoading message="正在加载操作码…" /> : null}
            {typesState.type === "error" ? (
              <PanelError error={typesState.error} onRetry={() => void loadTypes()} />
            ) : null}
            {typesState.type === "ok" && filteredTypes.length === 0 ? (
              <PanelEmpty title="暂无操作码" description="创建第一个职务异动操作类型。" />
            ) : null}
            {typesState.type === "ok" && filteredTypes.length > 0 ? (
              <div className="space-y-1.5">
                {filteredTypes.map((t) => (
                  <CatalogListItem
                    key={t.id}
                    active={selectedTypeCode === t.code}
                    title={t.name}
                    subtitle={`${t.code} · ${t.phaseLabel ?? t.phase}`}
                    status={t.status}
                    onSelect={() => {
                      setSelectedTypeCode(t.code);
                      setSelectedReasonId(null);
                    }}
                    onEdit={() => setSheet({ type: "type-edit", item: t })}
                  />
                ))}
              </div>
            ) : null}
          </ColumnShell>

          {/* 原因 */}
          <ColumnShell
            title="操作原因"
            description={selectedType ? `${selectedType.name}（${selectedType.code}）` : "请先选择操作"}
            action={
              selectedTypeCode ? (
                <Button
                  size="sm"
                  onClick={() => setSheet({ type: "reason-new", movementTypeCode: selectedTypeCode })}
                >
                  <Plus />
                  新建
                </Button>
              ) : null
            }
            bordered
          >
            {!selectedTypeCode ? (
              <PanelEmpty title="未选择操作" description="从左侧选择一个操作码。" />
            ) : null}
            {selectedTypeCode && reasonsState.type === "loading" ? (
              <PanelLoading message="正在加载原因码…" />
            ) : null}
            {selectedTypeCode && reasonsState.type === "error" ? (
              <PanelError
                error={reasonsState.error}
                onRetry={() => selectedTypeCode && void loadReasons(selectedTypeCode)}
              />
            ) : null}
            {selectedTypeCode && reasonsState.type === "ok" && reasons.length === 0 ? (
              <PanelEmpty
                title="暂无原因码"
                description="为该操作添加第一个原因码。"
                action={
                  <Button
                    size="sm"
                    onClick={() =>
                      setSheet({ type: "reason-new", movementTypeCode: selectedTypeCode })
                    }
                  >
                    <Plus />
                    新建原因
                  </Button>
                }
              />
            ) : null}
            {selectedTypeCode && reasonsState.type === "ok" && reasons.length > 0 ? (
              <div className="space-y-1.5">
                {reasons.map((r) => (
                  <CatalogListItem
                    key={r.id}
                    active={selectedReasonId === r.id}
                    title={r.name}
                    subtitle={`${r.code}${r.subCount ? ` · ${r.subCount} 个子项` : ""}`}
                    status={r.status}
                    onSelect={() => setSelectedReasonId(r.id)}
                    onEdit={() => setSheet({ type: "reason-edit", item: r })}
                  />
                ))}
              </div>
            ) : null}
          </ColumnShell>

          {/* 子项 */}
          <ColumnShell
            title="原因子项"
            description={
              selectedReason
                ? `${selectedReason.name}（${selectedReason.code}）`
                : "请先选择原因"
            }
            action={
              selectedReasonId ? (
                <Button size="sm" onClick={() => setSheet({ type: "sub-new", reasonId: selectedReasonId })}>
                  <Plus />
                  新建
                </Button>
              ) : null
            }
            bordered
          >
            {!selectedReasonId ? (
              <PanelEmpty title="未选择原因" description="从中间列选择一个操作原因。" />
            ) : null}
            {selectedReasonId && subsState.type === "loading" ? (
              <PanelLoading message="正在加载子项…" />
            ) : null}
            {selectedReasonId && subsState.type === "error" ? (
              <PanelError
                error={subsState.error}
                onRetry={() => selectedReasonId && void loadSubs(selectedReasonId)}
              />
            ) : null}
            {selectedReasonId && subsState.type === "ok" && subs.length === 0 ? (
              <PanelEmpty
                title="无原因子项"
                description="此原因无需子项；如需细分可手动添加。"
                action={
                  <Button
                    size="sm"
                    onClick={() => setSheet({ type: "sub-new", reasonId: selectedReasonId })}
                  >
                    <Plus />
                    添加子项
                  </Button>
                }
              />
            ) : null}
            {selectedReasonId && subsState.type === "ok" && subs.length > 0 ? (
              <div className="space-y-1.5">
                {subs.map((s) => (
                  <CatalogListItem
                    key={s.id}
                    active={false}
                    title={s.name}
                    subtitle={s.code}
                    status={s.status}
                    onSelect={() => setSheet({ type: "sub-edit", item: s })}
                    onEdit={() => setSheet({ type: "sub-edit", item: s })}
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
        onSavedReason={(typeCode) => void onSavedReason(typeCode)}
        onSavedSub={(reasonId) => void onSavedSub(reasonId)}
      />

      <MovementCatalogTreeDialog
        open={treeOpen}
        onOpenChange={setTreeOpen}
        state={treeState}
        onRetry={() => void openTreePreview()}
      />
    </div>
  );
}

function MovementCatalogTreeDialog({
  open,
  onOpenChange,
  state,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: LoadState<MovementCatalogTreeRow[]>;
  onRetry: () => void;
}) {
  const stats = useMemo(() => {
    if (state.type !== "ok") return null;
    const total = state.data.length;
    const inactive = state.data.filter(
      (row) =>
        row.movementTypeStatus === "DISABLED" ||
        row.reasonStatus === "DISABLED" ||
        row.reasonSubStatus === "DISABLED",
    ).length;
    return { total, active: total - inactive, inactive };
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[min(92dvh,960px)] w-[min(calc(100vw-1.5rem),1280px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none",
        )}
      >
        <DialogHeader className="shrink-0 space-y-3 border-b bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <DialogTitle className="text-lg">职务异动类型整表预览</DialogTitle>
              <DialogDescription>
                对齐业务材料扁平结构；左右可滚动查看完整列。失效项仅供历史参考。
              </DialogDescription>
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
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 shadow-sm backdrop-blur-sm">
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-[72px] px-4 py-3 font-medium whitespace-nowrap">操作</th>
                  <th className="min-w-[96px] px-4 py-3 font-medium whitespace-nowrap">操作描述</th>
                  <th className="w-[88px] px-4 py-3 font-medium whitespace-nowrap">操作原因</th>
                  <th className="min-w-[220px] px-4 py-3 font-medium">原因描述</th>
                  <th className="w-[72px] px-4 py-3 font-medium whitespace-nowrap">子项</th>
                  <th className="min-w-[180px] px-4 py-3 font-medium">子项描述</th>
                  <th className="w-[88px] px-4 py-3 font-medium whitespace-nowrap">备注</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((row, index) => {
                  const inactive =
                    row.movementTypeStatus === "DISABLED" ||
                    row.reasonStatus === "DISABLED" ||
                    row.reasonSubStatus === "DISABLED";
                  return (
                    <tr
                      key={`${row.movementTypeCode}-${row.reasonCode ?? ""}-${row.reasonSubCode ?? ""}-${index}`}
                      className={cn(
                        "border-b transition-colors hover:bg-muted/20",
                        inactive && "bg-muted/25 text-muted-foreground",
                      )}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                        {row.movementTypeCode}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{row.movementTypeName}</td>
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                        {row.reasonCode ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 leading-relaxed break-words">
                        {row.reasonName ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                        {row.reasonSubCode ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 leading-relaxed break-words">
                        {row.reasonSubName ?? "—"}
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

        {stats ? (
          <div className="shrink-0 border-t bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground sm:px-6">
            提示：若列较多，可在表格区域横向滚动；表头在纵向滚动时保持固定。
          </div>
        ) : null}
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
  onSavedType: () => void;
  onSavedReason: (typeCode: string) => void;
  onSavedSub: (reasonId: string) => void;
}) {
  const open = props.mode.type !== "closed";
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (props.mode.type === "closed") return;
    if (props.mode.type === "type-new") {
      setForm({ code: "", name: "", phase: "CHANGE", status: "ACTIVE", sort: "0", remark: "" });
      return;
    }
    if (props.mode.type === "type-edit") {
      setForm({
        code: props.mode.item.code,
        name: props.mode.item.name,
        phase: props.mode.item.phase,
        status: props.mode.item.status,
        sort: String(props.mode.item.sort),
        remark: props.mode.item.remark ?? "",
      });
      return;
    }
    if (props.mode.type === "reason-new") {
      setForm({
        movementTypeCode: props.mode.movementTypeCode,
        code: "",
        name: "",
        status: "ACTIVE",
        sort: "0",
        remark: "",
      });
      return;
    }
    if (props.mode.type === "reason-edit") {
      setForm({
        movementTypeCode: props.mode.item.movementTypeCode,
        code: props.mode.item.code,
        name: props.mode.item.name,
        status: props.mode.item.status,
        sort: String(props.mode.item.sort),
        remark: props.mode.item.remark ?? "",
      });
      return;
    }
    if (props.mode.type === "sub-new") {
      setForm({ reasonId: props.mode.reasonId, code: "", name: "", status: "ACTIVE", sort: "0" });
      return;
    }
    if (props.mode.type === "sub-edit") {
      setForm({
        reasonId: props.mode.item.reasonId,
        code: props.mode.item.code,
        name: props.mode.item.name,
        status: props.mode.item.status,
        sort: String(props.mode.item.sort),
      });
    }
  }, [props.mode]);

  const title =
    props.mode.type === "type-new"
      ? "新建操作码"
      : props.mode.type === "type-edit"
        ? "编辑操作码"
        : props.mode.type === "reason-new"
          ? "新建操作原因"
          : props.mode.type === "reason-edit"
            ? "编辑操作原因"
            : props.mode.type === "sub-new"
              ? "新建原因子项"
              : props.mode.type === "sub-edit"
                ? "编辑原因子项"
                : "";

  async function onSave() {
    try {
      setSaving(true);
      const sort = Number.isFinite(Number(form.sort)) ? Number(form.sort) : 0;
      const status = (form.status as DictStatus) || "ACTIVE";

      if (props.mode.type === "type-new") {
        await createMovementType({
          code: form.code.trim(),
          name: form.name.trim(),
          phase: form.phase as MovementPhase,
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedType();
        props.onClose();
        return;
      }
      if (props.mode.type === "type-edit") {
        await updateMovementType(props.mode.item.id, {
          name: form.name.trim(),
          phase: form.phase as MovementPhase,
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedType();
        props.onClose();
        return;
      }
      if (props.mode.type === "reason-new") {
        await createMovementReason({
          movementTypeCode: form.movementTypeCode,
          code: form.code.trim(),
          name: form.name.trim(),
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedReason(form.movementTypeCode);
        props.onClose();
        return;
      }
      if (props.mode.type === "reason-edit") {
        await updateMovementReason(props.mode.item.id, {
          name: form.name.trim(),
          status,
          sort,
          remark: form.remark?.trim() || undefined,
        });
        toast.success("保存成功");
        props.onSavedReason(props.mode.item.movementTypeCode);
        props.onClose();
        return;
      }
      if (props.mode.type === "sub-new") {
        await createMovementReasonSub({
          reasonId: form.reasonId,
          code: form.code.trim(),
          name: form.name.trim(),
          status,
          sort,
        });
        toast.success("保存成功");
        props.onSavedSub(form.reasonId);
        props.onClose();
        return;
      }
      if (props.mode.type === "sub-edit") {
        await updateMovementReasonSub(props.mode.item.id, {
          name: form.name.trim(),
          status,
          sort,
        });
        toast.success("保存成功");
        props.onSavedSub(props.mode.item.reasonId);
        props.onClose();
      }
    } catch (e: unknown) {
      const msg = typeof (e as { message?: string })?.message === "string" ? (e as { message: string }).message : "操作失败";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDisable() {
    try {
      setSaving(true);
      if (props.mode.type === "type-edit") {
        await updateMovementTypeStatus(props.mode.item.id, "DISABLED");
        toast.success("已停用");
        props.onSavedType();
        props.onClose();
        return;
      }
      if (props.mode.type === "reason-edit") {
        await updateMovementReasonStatus(props.mode.item.id, "DISABLED");
        toast.success("已停用");
        props.onSavedReason(props.mode.item.movementTypeCode);
        props.onClose();
        return;
      }
      if (props.mode.type === "sub-edit") {
        await updateMovementReasonSubStatus(props.mode.item.id, "DISABLED");
        toast.success("已停用");
        props.onSavedSub(props.mode.item.reasonId);
        props.onClose();
      }
    } catch (e: unknown) {
      const msg = typeof (e as { message?: string })?.message === "string" ? (e as { message: string }).message : "操作失败";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const canDisable =
    props.mode.type === "type-edit" ||
    props.mode.type === "reason-edit" ||
    props.mode.type === "sub-edit";

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? props.onClose() : null)}>
      <SheetContent className="gap-0 p-0">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>保存后将立即生效（内存缓存会自动刷新）。</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {(props.mode.type === "type-new" || props.mode.type === "type-edit") && (
            <>
              <FormField label="操作码" required>
                <Input
                  value={form.code || ""}
                  disabled={props.mode.type === "type-edit"}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="例如 XFR"
                />
              </FormField>
              <FormField label="操作描述" required>
                <Input
                  value={form.name || ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例如 调动"
                />
              </FormField>
              <FormField label="阶段">
                <OptionToggle
                  options={MOVEMENT_PHASE_OPTIONS}
                  value={(form.phase as MovementPhase) || "CHANGE"}
                  onChange={(v) => setForm((f) => ({ ...f, phase: v }))}
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

          {(props.mode.type === "reason-new" || props.mode.type === "reason-edit") && (
            <>
              <FormField label="所属操作">
                <Input value={form.movementTypeCode || ""} disabled />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="原因码" required>
                  <Input
                    value={form.code || ""}
                    disabled={props.mode.type === "reason-edit"}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="例如 X03"
                  />
                </FormField>
                <FormField label="原因描述" required>
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
            </>
          )}

          {(props.mode.type === "sub-new" || props.mode.type === "sub-edit") && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="子项码" required>
                  <Input
                    value={form.code || ""}
                    disabled={props.mode.type === "sub-edit"}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="例如 10"
                  />
                </FormField>
                <FormField label="子项描述" required>
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
