import type {
  OrganizationTreeNode,
  Position,
  PositionEditMode,
  PositionFormOptions,
  PositionKind,
  PositionSequence,
  PositionVersion,
  YesNo,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  createPosition,
  deletePosition,
  flattenOrgTree,
  getOrganizationTree,
  getPosition,
  getPositionFormOptions,
  getPositionVersions,
  listPositions,
  updatePosition,
} from "@/api/organization";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormField, OptionToggle } from "@/components/admin/form-field";
import { OptionSelect } from "@/components/admin/option-select";
import {
  formatCodeName,
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/admin/searchable-select";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import {
  BriefcaseBusiness,
  CalendarClock,
  ChevronRight,
  History,
  Inbox,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: Position[]; total: number };

type SheetMode =
  | { type: "closed" }
  | { type: "view"; position: Position }
  | { type: "new" }
  | { type: "edit"; item: Position };

type PositionForm = {
  name: string;
  effectiveStartDate: string;
  organizationId: string;
  status: "ACTIVE" | "INACTIVE";
  occupationalDisease: YesNo;
  positionCategory: string;
  positionKind: PositionKind | "";
  positionSequence: PositionSequence | "";
  positionLevel: string;
  keyPosition: YesNo;
  identityCategory: string;
};

const STATUS_OPTIONS = [
  { id: "ACTIVE" as const, label: "有效" },
  { id: "INACTIVE" as const, label: "无效" },
];

const YES_NO_OPTIONS = [
  { id: "YES" as const, label: "是" },
  { id: "NO" as const, label: "否" },
];

const POSITION_KIND_OPTIONS = [
  { id: "OFFICE" as const, label: "Office" },
  { id: "NON_OFFICE" as const, label: "非 Office" },
];

const POSITION_SEQUENCE_OPTIONS = [
  { id: "P" as const, label: "P" },
  { id: "M" as const, label: "M" },
  { id: "T" as const, label: "T" },
];

const EDIT_MODE_OPTIONS = [
  { id: "CURRENT" as const, label: "修改当前版本" },
  { id: "NEW_VERSION" as const, label: "新增生效版本" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function temporalHint(asOfDate: string) {
  const today = todayStr();
  if (asOfDate < today) return { label: "历史快照", variant: "secondary" as const };
  if (asOfDate > today) return { label: "未来预览", variant: "outline" as const };
  return { label: "当前生效", variant: "default" as const };
}

function emptyForm(asOfDate: string): PositionForm {
  return {
    name: "",
    effectiveStartDate: asOfDate || todayStr(),
    organizationId: "",
    status: "ACTIVE",
    occupationalDisease: "NO",
    positionCategory: "",
    positionKind: "",
    positionSequence: "",
    positionLevel: "",
    keyPosition: "NO",
    identityCategory: "",
  };
}

function formFromPosition(item: Position): PositionForm {
  return {
    name: item.name,
    effectiveStartDate: item.effectiveStartDate,
    organizationId: item.organizationId,
    status: item.status,
    occupationalDisease: item.occupationalDisease,
    positionCategory: item.positionCategory ?? "",
    positionKind: item.positionKind ?? "",
    positionSequence: item.positionSequence ?? "",
    positionLevel: item.positionLevel ?? "",
    keyPosition: item.keyPosition,
    identityCategory: item.identityCategory ?? "",
  };
}

function displayValue(value?: string | null) {
  return value?.trim() ? value : "—";
}

function displayCodeName(code?: string | null, label?: string | null) {
  if (!code?.trim() && !label?.trim()) return "—";
  return formatCodeName({ value: code ?? "", label: label ?? "", code: code ?? undefined });
}

function yesNoLabel(value?: YesNo) {
  if (value === "YES") return "是";
  if (value === "NO") return "否";
  return "—";
}

function positionKindLabel(kind?: PositionKind) {
  if (kind === "OFFICE") return "Office";
  if (kind === "NON_OFFICE") return "非 Office";
  return "—";
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function DetailCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 rounded-md border border-border/40 bg-muted/10 px-3 py-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{displayValue(value)}</dd>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function VersionTimeline({
  versions,
  activeId,
  onSelect,
}: {
  versions: PositionVersion[];
  activeId?: string;
  onSelect: (version: PositionVersion) => void;
}) {
  if (versions.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-border/60 bg-muted/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <History className="size-3.5" />
          生效版本
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
            {versions.length} 个
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">点击切换查看快照</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {versions.map((v) => {
          const isActive = v.id === activeId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v)}
              className={cn(
                "flex min-w-[148px] shrink-0 flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition-all",
                "hover:border-primary/40 hover:bg-background",
                isActive ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/50 bg-background/50",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                  {v.effectiveStartDate}
                </span>
                <Badge
                  variant={v.temporal === "present" ? "default" : v.temporal === "future" ? "outline" : "secondary"}
                  className="h-4 px-1 text-[9px] font-normal"
                >
                  {v.temporalLabel}
                </Badge>
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {v.effectiveEndDate ? `至 ${v.effectiveEndDate}` : "至今"}
                {v.isOpen ? " · 开放" : ""}
              </div>
              <div className="truncate text-[11px] font-medium text-foreground/90">{v.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdminOrgPositionsPage() {
  const perm = usePermission();
  const canView = perm.has("position:view");
  const canEdit = perm.has("position:edit");

  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [state, setState] = useState<LoadState>({ type: "loading" });
  const [orgs, setOrgs] = useState<OrganizationTreeNode[]>([]);
  const [formOptions, setFormOptions] = useState<PositionFormOptions | null>(null);
  const [versions, setVersions] = useState<PositionVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [editMode, setEditMode] = useState<PositionEditMode>("CURRENT");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PositionForm>(emptyForm(todayStr()));

  const temporal = useMemo(() => temporalHint(asOfDate), [asOfDate]);
  const flatOrgs = useMemo(() => flattenOrgTree(orgs), [orgs]);
  const viewPosition = sheet.type === "view" ? sheet.position : null;

  const orgSelectOptions = useMemo<SearchableSelectOption[]>(
    () =>
      flatOrgs.map((o) => ({
        value: o.id,
        label: o.name,
        code: o.code,
        keywords: `${o.name} ${o.code}`,
      })),
    [flatOrgs],
  );

  const patchForm = <K extends keyof PositionForm>(key: K, value: PositionForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadRefs = useCallback(async () => {
    const [tree, opts] = await Promise.all([
      getOrganizationTree({ asOfDate }),
      getPositionFormOptions(),
    ]);
    setOrgs(tree.data);
    setFormOptions(opts.data);
  }, [asOfDate]);

  const loadVersions = useCallback(async (code: string) => {
    setVersionsLoading(true);
    try {
      const res = await getPositionVersions(code);
      setVersions(res.data);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listPositions({
        page,
        pageSize,
        asOfDate,
        keyword: debouncedKeyword.trim() || undefined,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      setState({ type: "error", error: e as ApiError });
    }
  }, [page, pageSize, debouncedKeyword, asOfDate]);

  useEffect(() => {
    if (!canView) return;
    void loadRefs();
  }, [canView, loadRefs]);

  useEffect(() => {
    if (!canView) return;
    void loadPositions();
  }, [canView, loadPositions]);

  useEffect(() => {
    if (sheet.type !== "view") return;
    void loadVersions(sheet.position.code);
  }, [sheet, loadVersions]);

  const openView = async (item: Position) => {
    try {
      const res = await getPosition(item.id);
      setSheet({ type: "view", position: res.data });
    } catch (e: unknown) {
      toast.error((e as ApiError).message ?? "加载岗位详情失败");
    }
  };

  const viewVersion = async (version: PositionVersion) => {
    try {
      const res = await getPosition(version.id);
      setSheet({ type: "view", position: res.data });
    } catch (e: unknown) {
      toast.error((e as ApiError).message ?? "加载版本详情失败");
    }
  };

  const openNew = () => {
    const next = emptyForm(asOfDate);
    next.organizationId = flatOrgs[0]?.id ?? "";
    setForm(next);
    setEditMode("CURRENT");
    setSheet({ type: "new" });
  };

  const openEdit = (item: Position, mode: PositionEditMode = "CURRENT") => {
    setForm(formFromPosition(item));
    setEditMode(mode);
    setSheet({ type: "edit", item });
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    organizationId: form.organizationId,
    status: form.status,
    occupationalDisease: form.occupationalDisease,
    positionCategory: form.positionCategory || undefined,
    positionKind: form.positionKind || undefined,
    positionSequence: form.positionSequence || undefined,
    positionLevel: form.positionLevel || undefined,
    keyPosition: form.keyPosition,
    identityCategory: form.identityCategory || undefined,
  });

  const savePosition = async () => {
    if (!form.name.trim() || !form.effectiveStartDate || !form.organizationId) {
      toast.error("请填写岗位名称、生效日期与直属部门");
      return;
    }
    if (sheet.type === "edit" && editMode === "NEW_VERSION") {
      if (form.effectiveStartDate === sheet.item.effectiveStartDate) {
        toast.error("新版本须使用不同的生效日期");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (sheet.type === "new") {
        const res = await createPosition({ ...payload, effectiveStartDate: form.effectiveStartDate });
        toast.success("岗位已创建");
        await loadPositions();
        const detailRes = await getPosition(res.data.id);
        setSheet({ type: "view", position: detailRes.data });
      } else if (sheet.type === "edit") {
        const res = await updatePosition(sheet.item.id, {
          ...payload,
          editMode,
          effectiveStartDate:
            editMode === "NEW_VERSION" ? form.effectiveStartDate : sheet.item.effectiveStartDate,
        });
        toast.success(editMode === "NEW_VERSION" ? "已创建新版本" : "当前版本已更新");
        await loadPositions();
        const detailRes = await getPosition(res.data.id);
        setSheet({ type: "view", position: detailRes.data });
      }
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePosition(deleteTarget.id);
      toast.success("岗位已设为无效");
      setDeleteTarget(null);
      if (sheet.type === "view" && sheet.position.id === deleteTarget.id) {
        setSheet({ type: "closed" });
      }
      void loadPositions();
    } catch (e: unknown) {
      toast.error((e as ApiError).message);
    }
  };

  const sheetOpen = sheet.type !== "closed";
  const isFormSheet = sheet.type === "new" || sheet.type === "edit";

  if (!canView) {
    return (
      <div className="space-y-5">
        <PageHeader title="岗位体系" description="维护企业岗位主数据与分类属性。" />
        <NoPermissionCard
          icon={<Shield className="size-5 text-muted-foreground" />}
          title="无查看权限"
          description="需要 position:view 权限。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="岗位体系"
        description="按生效日期查看岗位快照；点击列表项查看详情，可修改当前版本或新增生效版本。"
        actions={
          canEdit ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="size-4" />
              新建岗位
            </Button>
          ) : null
        }
      />

      <PanelCard
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={temporal.variant} className="gap-1">
              <CalendarClock className="size-3" />
              {temporal.label}
            </Badge>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => {
                setAsOfDate(e.target.value);
                setPage(1);
              }}
              className="h-8 w-[148px]"
            />
            <SearchInput
              value={keyword}
              onChange={(v) => {
                setKeyword(v);
                setPage(1);
              }}
              placeholder="搜索岗位编码或名称"
            />
            <Button variant="outline" size="sm" onClick={() => void loadPositions()}>
              <RefreshCw className="size-4" />
              刷新
            </Button>
          </div>
        }
      >
        {state.type === "loading" ? <PanelLoading message="加载岗位…" /> : null}
        {state.type === "error" ? (
          <PanelError error={state.error} onRetry={() => void loadPositions()} />
        ) : null}

        {state.type === "ok" && state.items.length === 0 ? (
          <PanelEmpty
            title="暂无岗位"
            description="可调整生效日期或点击右上角新建岗位。"
            icon={<Inbox className="size-5 text-muted-foreground" />}
            action={
              canEdit ? (
                <Button size="sm" onClick={openNew}>
                  新建岗位
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {state.type === "ok" && state.items.length > 0 ? (
          <>
            <div className="divide-y">
              {state.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => void openView(it)}
                  className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <BriefcaseBusiness className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{it.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{it.code}</span>
                      <Badge variant={it.status === "ACTIVE" ? "secondary" : "outline"}>
                        {it.status === "ACTIVE" ? "有效" : "无效"}
                      </Badge>
                      {it.keyPosition === "YES" ? (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
                          <Sparkles className="mr-1 size-3" />
                          关键
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      生效 {it.effectiveStartDate}
                      {it.organizationName ? ` · ${it.organizationName}` : ""}
                      {it.positionSequence ? ` · ${it.positionSequence}` : ""}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={state.total}
              itemCount={state.items.length}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        ) : null}
      </PanelCard>

      {/* 详情 Sheet */}
      <Sheet
        open={sheetOpen && sheet.type === "view"}
        onOpenChange={(o) => !o && setSheet({ type: "closed" })}
      >
        <SheetContent side="right" className="data-[side=right]:max-w-[min(840px,100vw)] gap-0 p-0">
          {viewPosition ? (
            <>
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle>岗位详情</SheetTitle>
                <SheetDescription>
                  {viewPosition.code} · 生效 {viewPosition.effectiveStartDate}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {versionsLoading ? (
                  <div className="mb-4 h-16 animate-pulse rounded-lg bg-muted/30" />
                ) : (
                  <VersionTimeline
                    versions={versions}
                    activeId={viewPosition.id}
                    onSelect={(v) => void viewVersion(v)}
                  />
                )}

                <div className="mb-4 flex items-start justify-between gap-3 border-b border-border/50 pb-4">
                  <div className="min-w-0 space-y-1">
                    <div className="text-lg font-semibold tracking-tight">{viewPosition.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{viewPosition.code}</div>
                  </div>
                  <Badge variant={viewPosition.status === "ACTIVE" ? "default" : "secondary"}>
                    {viewPosition.status === "ACTIVE" ? "有效" : "无效"}
                  </Badge>
                </div>

                <div className="space-y-5">
                  <DetailSection title="基本信息">
                    <DetailCell label="生效日期" value={viewPosition.effectiveStartDate} />
                    <DetailCell
                      label="失效日期"
                      value={viewPosition.effectiveEndDate ?? "至今"}
                    />
                    <DetailCell
                      label="直属部门"
                      value={displayCodeName(viewPosition.organizationCode, viewPosition.organizationName)}
                    />
                    <DetailCell label="岗位序列" value={viewPosition.positionSequence} />
                    <DetailCell label="岗位类别" value={positionKindLabel(viewPosition.positionKind)} />
                  </DetailSection>

                  <DetailSection title="分类属性">
                    <DetailCell
                      label="岗位分类"
                      value={displayCodeName(viewPosition.positionCategory, viewPosition.positionCategoryLabel)}
                    />
                    <DetailCell
                      label="岗位职级"
                      value={displayCodeName(viewPosition.positionLevel, viewPosition.positionLevelLabel)}
                    />
                    <DetailCell
                      label="身份类别"
                      value={displayCodeName(viewPosition.identityCategory, viewPosition.identityCategoryLabel)}
                    />
                  </DetailSection>

                  <DetailSection title="标识">
                    <DetailCell label="职业病岗位" value={yesNoLabel(viewPosition.occupationalDisease)} />
                    <DetailCell label="关键岗位" value={yesNoLabel(viewPosition.keyPosition)} />
                  </DetailSection>
                </div>

                {canEdit ? (
                  <div className="mt-6 flex flex-wrap gap-2 border-t border-border/50 pt-4">
                    <Button size="sm" variant="outline" onClick={() => openEdit(viewPosition, "CURRENT")}>
                      <Pencil className="size-3.5" />
                      编辑
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(viewPosition, "NEW_VERSION")}>
                      <History className="size-3.5" />
                      新增版本
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDeleteTarget({ id: viewPosition.id, name: viewPosition.name })
                      }
                    >
                      <Trash2 className="size-3.5" />
                      设为无效
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* 新建 / 编辑 Sheet */}
      <Sheet
        open={sheetOpen && isFormSheet}
        onOpenChange={(o) => !o && setSheet({ type: "closed" })}
      >
        <SheetContent side="right" className="data-[side=right]:max-w-[min(840px,100vw)] gap-0 p-0">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>
              {sheet.type === "new"
                ? "新建岗位"
                : editMode === "NEW_VERSION"
                  ? "新增生效版本"
                  : "编辑岗位"}
            </SheetTitle>
            <SheetDescription>
              {sheet.type === "new"
                ? "岗位编码将由系统自动生成（八位流水，从 20000000 起）。"
                : sheet.type === "edit" && editMode === "CURRENT"
                  ? `修改当前版本（${sheet.item.effectiveStartDate}）的数据，不改变生效日期。`
                  : sheet.type === "edit"
                    ? "指定新生效日期，将基于当前表单内容创建新版本并自动衔接时间轴。"
                    : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {sheet.type === "edit" ? (
              <FormSection title="版本">
                <FormField label="编辑方式" required>
                  <OptionToggle
                    options={EDIT_MODE_OPTIONS}
                    value={editMode}
                    onChange={(mode) => {
                      setEditMode(mode);
                      if (mode === "CURRENT" && sheet.type === "edit") {
                        patchForm("effectiveStartDate", sheet.item.effectiveStartDate);
                      }
                    }}
                  />
                </FormField>
              </FormSection>
            ) : null}

            <FormSection title="基本信息">
              <div className="space-y-4">
                {sheet.type === "edit" ? (
                  <FormField label="岗位编码">
                    <Input value={sheet.item.code} disabled className="font-mono" />
                  </FormField>
                ) : null}
                <FormField label="岗位名称" required>
                  <Input value={form.name} onChange={(e) => patchForm("name", e.target.value)} />
                </FormField>
                <FormGrid>
                  <FormField
                    label="生效日期"
                    required
                    hint={
                      sheet.type === "edit" && editMode === "CURRENT"
                        ? "修改当前版本时生效日期不可变更"
                        : undefined
                    }
                  >
                    <Input
                      type="date"
                      value={form.effectiveStartDate}
                      disabled={sheet.type === "edit" && editMode === "CURRENT"}
                      onChange={(e) => patchForm("effectiveStartDate", e.target.value)}
                    />
                  </FormField>
                  <FormField label="状态">
                    <OptionToggle
                      options={STATUS_OPTIONS}
                      value={form.status}
                      onChange={(v) => patchForm("status", v)}
                    />
                  </FormField>
                </FormGrid>
              </div>
            </FormSection>

            <FormSection title="组织归属">
              <FormField label="直属部门" required>
                <SearchableSelect
                  value={form.organizationId}
                  onChange={(v) => patchForm("organizationId", v)}
                  options={orgSelectOptions}
                  placeholder="选择直属部门"
                  searchPlaceholder="搜索部门名称或编码"
                  variant="entity"
                  formatOption={(o) => formatCodeName(o)}
                />
              </FormField>
            </FormSection>

            <FormSection title="分类属性">
              <FormGrid>
                <FormField label="岗位分类">
                  <OptionSelect
                    value={form.positionCategory}
                    onValueChange={(v) => patchForm("positionCategory", v)}
                    placeholder="选择岗位分类"
                    allowEmpty
                    options={(formOptions?.positionCategories ?? []).map((o) => ({
                      value: o.value,
                      label: o.label,
                    }))}
                  />
                </FormField>
                <FormField label="岗位类别">
                  <OptionSelect
                    value={form.positionKind}
                    onValueChange={(v) => patchForm("positionKind", v as PositionKind | "")}
                    placeholder="选择岗位类别"
                    allowEmpty
                    options={POSITION_KIND_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                  />
                </FormField>
                <FormField label="岗位序列">
                  <OptionSelect
                    value={form.positionSequence}
                    onValueChange={(v) => patchForm("positionSequence", v as PositionSequence | "")}
                    placeholder="选择 P / M / T"
                    allowEmpty
                    options={POSITION_SEQUENCE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                  />
                </FormField>
                <FormField label="岗位职级">
                  <OptionSelect
                    value={form.positionLevel}
                    onValueChange={(v) => patchForm("positionLevel", v)}
                    placeholder="选择职级 1~15"
                    allowEmpty
                    options={(formOptions?.positionLevels ?? []).map((o) => ({
                      value: o.value,
                      label: o.label,
                    }))}
                  />
                </FormField>
                <FormField label="身份类别">
                  <OptionSelect
                    value={form.identityCategory}
                    onValueChange={(v) => patchForm("identityCategory", v)}
                    placeholder="选择身份类别"
                    allowEmpty
                    options={(formOptions?.identityCategories ?? []).map((o) => ({
                      value: o.value,
                      label: o.label,
                    }))}
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection title="标识">
              <FormGrid>
                <FormField label="职业病岗位">
                  <OptionToggle
                    options={YES_NO_OPTIONS}
                    value={form.occupationalDisease}
                    onChange={(v) => patchForm("occupationalDisease", v)}
                  />
                </FormField>
                <FormField label="关键岗位">
                  <OptionToggle
                    options={YES_NO_OPTIONS}
                    value={form.keyPosition}
                    onChange={(v) => patchForm("keyPosition", v)}
                  />
                </FormField>
              </FormGrid>
            </FormSection>
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (sheet.type === "edit") {
                    void (async () => {
                      const res = await getPosition(sheet.item.id);
                      setSheet({ type: "view", position: res.data });
                    })();
                  } else {
                    setSheet({ type: "closed" });
                  }
                }}
              >
                取消
              </Button>
              <Button disabled={saving} onClick={() => void savePosition()}>
                {sheet.type === "edit" && editMode === "NEW_VERSION" ? "创建新版本" : "保存"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="确认停用"
        description={deleteTarget ? `确定将「${deleteTarget.name}」当前版本设为无效？` : ""}
        confirmLabel="设为无效"
        onConfirm={() => void confirmDelete()}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      />
    </div>
  );
}
