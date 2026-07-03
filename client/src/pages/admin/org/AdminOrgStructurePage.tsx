import type {
  Organization,
  OrganizationCreateRequest,
  OrganizationEditMode,
  OrganizationFormOptions,
  OrganizationTreeNode,
  OrganizationVersion,
  OrgAttribute,
  OrgFunction,
  OrgStatus,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  createOrganization,
  flattenOrgTree,
  getOrganization,
  getOrganizationFormOptions,
  getOrganizationTree,
  getOrganizationVersions,
  updateOrganization,
} from "@/api/organization";
import { FormField, OptionToggle } from "@/components/admin/form-field";
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
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  GitBranchPlus,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  UserRound,
} from "lucide-react";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; tree: OrganizationTreeNode[] };

type SheetMode =
  | { type: "closed" }
  | { type: "create"; parentCode?: string }
  | { type: "edit"; org: Organization };

type DeptForm = {
  name: string;
  parentCode?: string;
  effectiveStartDate: string;
  status: OrgStatus;
  location: string;
  legalCompany: string;
  departmentType: string;
  departmentLevel: string;
  costCenter: string;
  orgLeaderNo: string;
  supervisingLeaderNo: string;
  orgAttribute: OrgAttribute | "";
  orgFunction: OrgFunction | "";
  orgTags: string;
  financialCode: string;
  hrCoordinatorNo: string;
  hrbpNo: string;
  sscNo: string;
};

const STATUS_OPTIONS = [
  { id: "ACTIVE" as const, label: "有效" },
  { id: "INACTIVE" as const, label: "无效" },
];

const ORG_ATTRIBUTE_OPTIONS: Array<{ id: OrgAttribute; label: string }> = [
  { id: "PHYSICAL", label: "实体" },
  { id: "VIRTUAL", label: "虚拟" },
];

const ORG_FUNCTION_OPTIONS: Array<{ id: OrgFunction; label: string }> = [
  { id: "RND", label: "产研" },
  { id: "MANUFACTURING", label: "制造" },
  { id: "MARKET", label: "市场" },
  { id: "FUNCTION", label: "职能" },
];

const EDIT_MODE_OPTIONS: Array<{ id: OrganizationEditMode; label: string }> = [
  { id: "CURRENT", label: "修改当前版本" },
  { id: "NEW_VERSION", label: "新增生效版本" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function temporalHint(asOfDate: string) {
  const today = todayStr();
  if (asOfDate < today) return { label: "历史快照", variant: "secondary" as const };
  if (asOfDate > today) return { label: "未来预览", variant: "outline" as const };
  return { label: "当前有效", variant: "default" as const };
}

function emptyForm(asOfDate: string, parentCode?: string): DeptForm {
  return {
    name: "",
    parentCode,
    effectiveStartDate: asOfDate || todayStr(),
    status: "ACTIVE",
    location: "",
    legalCompany: "",
    departmentType: "",
    departmentLevel: "",
    costCenter: "",
    orgLeaderNo: "",
    supervisingLeaderNo: "",
    orgAttribute: "",
    orgFunction: "",
    orgTags: "",
    financialCode: "",
    hrCoordinatorNo: "",
    hrbpNo: "",
    sscNo: "",
  };
}

function formFromOrg(org: Organization): DeptForm {
  return {
    name: org.name,
    parentCode: org.parentCode,
    effectiveStartDate: org.effectiveStartDate,
    status: org.status,
    location: org.location ?? "",
    legalCompany: org.legalCompany ?? "",
    departmentType: org.departmentType ?? "",
    departmentLevel: org.departmentLevel ?? "",
    costCenter: org.costCenter ?? "",
    orgLeaderNo: org.orgLeaderNo ?? "",
    supervisingLeaderNo: org.supervisingLeaderNo ?? "",
    orgAttribute: org.orgAttribute ?? "",
    orgFunction: org.orgFunction ?? "",
    orgTags: org.orgTags ?? "",
    financialCode: org.financialCode ?? "",
    hrCoordinatorNo: org.hrCoordinatorNo ?? "",
    hrbpNo: org.hrbpNo ?? "",
    sscNo: org.sscNo ?? "",
  };
}

function toPayload(form: DeptForm): OrganizationCreateRequest {
  return {
    name: form.name.trim(),
    parentCode: form.parentCode || undefined,
    effectiveStartDate: form.effectiveStartDate,
    status: form.status,
    location: form.location || undefined,
    legalCompany: form.legalCompany || undefined,
    departmentType: form.departmentType || undefined,
    departmentLevel: form.departmentLevel || undefined,
    costCenter: form.costCenter || undefined,
    orgLeaderNo: form.orgLeaderNo || undefined,
    supervisingLeaderNo: form.supervisingLeaderNo || undefined,
    orgAttribute: form.orgAttribute || undefined,
    orgFunction: form.orgFunction || undefined,
    orgTags: form.orgTags || undefined,
    financialCode: form.financialCode || undefined,
    hrCoordinatorNo: form.hrCoordinatorNo || undefined,
    hrbpNo: form.hrbpNo || undefined,
    sscNo: form.sscNo || undefined,
  };
}

function displayValue(value?: string | null) {
  return value?.trim() ? value : "—";
}

function displayCodeName(code?: string | null, label?: string | null) {
  if (!code?.trim() && !label?.trim()) return "—";
  return formatCodeName({ value: code ?? "", label: label ?? "", code: code ?? undefined });
}

function displayParent(org: Organization) {
  if (!org.parentCode?.trim() && !org.parentName?.trim()) return "—";
  if (org.parentCode?.trim() && org.parentName?.trim()) {
    return `${org.parentCode} — ${org.parentName}`;
  }
  return org.parentName?.trim() || org.parentCode?.trim() || "—";
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

function dictOptions(options: Array<{ value: string; label: string }>): SearchableSelectOption[] {
  return options.map((opt) => ({
    value: opt.value,
    label: opt.label,
    code: opt.value,
  }));
}

function VersionTimeline({
  versions,
  activeId,
  onSelect,
}: {
  versions: OrganizationVersion[];
  activeId?: string;
  onSelect: (version: OrganizationVersion) => void;
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
                "group/version flex min-w-[148px] shrink-0 flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition-all",
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

function OrgTreeItem({
  node,
  depth,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  node: OrganizationTreeNode;
  depth: number;
  selectedId?: string;
  expanded: Set<string>;
  onToggle: (code: string) => void;
  onSelect: (org: Organization) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.code);
  const selected = selectedId === node.id;
  const inactive = node.status === "INACTIVE";

  return (
    <div>
      <button
        type="button"
        className={cn(
          "group flex w-full rounded-lg border border-transparent px-2 py-2 text-left transition-all",
          "hover:border-border/60 hover:bg-muted/40",
          selected && "border-primary/30 bg-primary/8 shadow-sm",
          inactive && "opacity-55",
        )}
        style={{ marginLeft: `${depth * 14}px`, width: `calc(100% - ${depth * 14}px)` }}
        onClick={() => onSelect(node)}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {hasChildren ? (
            <span
              className="inline-flex size-5 shrink-0 items-center justify-center rounded hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(node.code);
              }}
            >
              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </span>
          ) : (
            <span className="inline-block size-5 shrink-0" />
          )}
          <Building2 className="size-3.5 shrink-0 text-primary/70" />
          <span className="shrink-0 text-sm font-semibold tracking-tight">{node.name}</span>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {node.departmentTypeLabel ? (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                {node.departmentTypeLabel}
              </Badge>
            ) : null}
            {node.departmentLevelLabel ? (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                {node.departmentLevelLabel}
              </Badge>
            ) : null}
            {node.orgLeaderNo ? (
              <Badge variant="outline" className="h-4 gap-0.5 px-1.5 text-[10px] font-normal">
                <UserRound className="size-2.5" />
                {node.orgLeaderNo}
              </Badge>
            ) : null}
          </div>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{node.code}</span>
        </div>
      </button>
      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <OrgTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}

export function AdminOrgStructurePage() {
  const perm = usePermission();
  const canView = perm.has("organization:view");
  const canEdit = perm.has("organization:edit");

  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [state, setState] = useState<LoadState>({ type: "loading" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Organization | null>(null);
  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [saving, setSaving] = useState(false);
  const [formOptions, setFormOptions] = useState<OrganizationFormOptions | null>(null);
  const [form, setForm] = useState<DeptForm>(emptyForm(todayStr()));
  const [editMode, setEditMode] = useState<OrganizationEditMode>("CURRENT");
  const [versions, setVersions] = useState<OrganizationVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const temporal = useMemo(() => temporalHint(asOfDate), [asOfDate]);
  const isViewingToday = asOfDate === todayStr();

  const loadRefs = useCallback(async () => {
    const res = await getOrganizationFormOptions();
    setFormOptions(res.data);
  }, []);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await getOrganizationTree({ asOfDate });
      const tree = res.data;
      setState({ type: "ok", tree });
      setExpanded((prev) => {
        if (prev.size > 0) return prev;
        const codes = tree.map((n) => n.code);
        return new Set(codes.slice(0, 3));
      });
      setSelected((prev) => {
        if (!prev) return null;
        const flat = flattenOrgTree(tree);
        return flat.find((o) => o.code === prev.code) ?? null;
      });
    } catch (e: unknown) {
      const err: ApiError =
        typeof (e as ApiError)?.message === "string"
          ? { message: (e as ApiError).message, traceId: (e as ApiError).traceId }
          : { message: "加载失败" };
      setState({ type: "error", error: err });
    }
  }, [asOfDate, canView]);

  useEffect(() => {
    if (!canView) return;
    void loadRefs();
  }, [canView, loadRefs]);

  useEffect(() => {
    if (!canView) return;
    void load();
  }, [canView, load]);

  const loadVersions = useCallback(async (code: string) => {
    setVersionsLoading(true);
    try {
      const res = await getOrganizationVersions(code);
      setVersions(res.data);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected?.code) {
      setVersions([]);
      return;
    }
    void loadVersions(selected.code);
  }, [selected?.code, loadVersions]);

  const flatOrgs = useMemo(
    () => (state.type === "ok" ? flattenOrgTree(state.tree) : []),
    [state],
  );

  const parentOrgOptions = useMemo((): SearchableSelectOption[] => {
    const excludeCode = sheet.type === "edit" ? sheet.org.code : undefined;
    return flatOrgs
      .filter((o) => o.code !== excludeCode)
      .map((o) => ({
        value: o.code,
        label: o.name,
        code: o.code,
        keywords: `${o.code} ${o.name} ${o.departmentTypeLabel ?? ""} ${o.departmentLevelLabel ?? ""}`,
      }));
  }, [flatOrgs, sheet]);

  const openCreate = (parentCode?: string) => {
    setForm(emptyForm(asOfDate || todayStr(), parentCode));
    setEditMode("CURRENT");
    setSheet({ type: "create", parentCode });
  };

  const openEdit = (org: Organization) => {
    setForm(formFromOrg(org));
    setEditMode("CURRENT");
    setSheet({ type: "edit", org });
  };

  const viewVersion = async (version: OrganizationVersion) => {
    try {
      const res = await getOrganization(version.id);
      setSelected(res.data);
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.message ?? "加载版本详情失败");
    }
  };

  const patchForm = <K extends keyof DeptForm>(key: K, value: DeptForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("请填写部门名称");
      return;
    }
    if (!form.effectiveStartDate) {
      toast.error("请选择生效日期");
      return;
    }
    if (sheet.type === "edit" && editMode === "NEW_VERSION") {
      if (form.effectiveStartDate === sheet.org.effectiveStartDate) {
        toast.error("新版本须使用不同的生效日期");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (sheet.type === "create") {
        await createOrganization(payload);
        toast.success("部门已创建");
      } else if (sheet.type === "edit") {
        const res = await updateOrganization(sheet.org.id, {
          ...payload,
          editMode,
          effectiveStartDate:
            editMode === "NEW_VERSION" ? form.effectiveStartDate : sheet.org.effectiveStartDate,
        });
        toast.success(editMode === "NEW_VERSION" ? "已创建新版本" : "当前版本已更新");
        setSheet({ type: "closed" });
        await load();
        const detailRes = await getOrganization(res.data.id);
        setSelected(detailRes.data);
        void loadVersions(sheet.org.code);
        return;
      }
      setSheet({ type: "closed" });
      await load();
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return (
      <div className="space-y-5">
        <PageHeader title="组织架构" description="部门树与生效日期快照。" />
        <NoPermissionCard
          icon={<Shield className="size-5 text-muted-foreground" />}
          title="无查看权限"
          description="需要 organization:view 权限。"
        />
      </div>
    );
  }

  const opts = formOptions ?? {
    locations: [],
    legalCompanies: [],
    departmentTypes: [],
    departmentLevels: [],
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="组织架构"
        description="按生效日期查看过去、现在或将来的组织树；变更将按生效日版本化存档。"
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => openCreate()}>
              <Plus className="size-4" />
              新建部门
            </Button>
          ) : null
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <PanelCard
          title="组织树"
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={temporal.variant} className="gap-1">
                <CalendarClock className="size-3" />
                {temporal.label}
              </Badge>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="h-8 w-[150px]"
              />
              {!isViewingToday ? (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setAsOfDate(todayStr())}>
                  回到今天
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => void load()}>
                <RefreshCw className="size-4" />
                刷新
              </Button>
            </div>
          }
        >
          {state.type === "loading" ? <PanelLoading message="正在加载组织树…" /> : null}
          {state.type === "error" ? (
            <PanelError error={state.error} onRetry={() => void load()} />
          ) : null}
          {state.type === "ok" && state.tree.length === 0 ? (
            <PanelEmpty
              title="暂无组织"
              description="当前生效日期下没有有效部门，可调整日期或新建部门。"
              action={
                canEdit ? (
                  <Button size="sm" onClick={() => openCreate()}>
                    新建部门
                  </Button>
                ) : undefined
              }
            />
          ) : null}
          {state.type === "ok" && state.tree.length > 0 ? (
            <div className="max-h-[min(68vh,640px)] overflow-y-auto p-2">
              {state.tree.map((node) => (
                <OrgTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selected?.id}
                  expanded={expanded}
                  onToggle={(code) =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(code)) next.delete(code);
                      else next.add(code);
                      return next;
                    })
                  }
                  onSelect={setSelected}
                />
              ))}
            </div>
          ) : null}
        </PanelCard>

        <PanelCard title="组织详情">
          {!selected ? (
            <PanelEmpty title="未选择部门" description="点击左侧树节点查看完整部门信息。" />
          ) : (
            <div className="p-4">
              {versionsLoading ? (
                <div className="mb-4 h-16 animate-pulse rounded-lg bg-muted/30" />
              ) : (
                <VersionTimeline
                  versions={versions}
                  activeId={selected.id}
                  onSelect={(v) => void viewVersion(v)}
                />
              )}

              <div className="mb-4 flex items-start justify-between gap-3 border-b border-border/50 pb-4">
                <div className="min-w-0 space-y-1">
                  <div className="text-lg font-semibold tracking-tight">{selected.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{selected.code}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge variant={selected.status === "ACTIVE" ? "default" : "secondary"}>
                    {selected.statusLabel ?? (selected.status === "ACTIVE" ? "有效" : "无效")}
                  </Badge>
                </div>
              </div>

              <div className="space-y-5">
                <DetailSection title="基本信息">
                  <DetailCell label="上级组织" value={displayParent(selected)} />
                  <DetailCell
                    label="地点"
                    value={displayCodeName(selected.location, selected.locationLabel)}
                  />
                  <DetailCell
                    label="法人公司"
                    value={displayCodeName(selected.legalCompany, selected.legalCompanyLabel)}
                  />
                  <DetailCell
                    label="部门类型"
                    value={displayCodeName(selected.departmentType, selected.departmentTypeLabel)}
                  />
                  <DetailCell
                    label="部门层级"
                    value={displayCodeName(selected.departmentLevel, selected.departmentLevelLabel)}
                  />
                  <DetailCell label="成本中心" value={selected.costCenter} />
                  <DetailCell label="组织属性" value={selected.orgAttributeLabel} />
                  <DetailCell label="组织职能" value={selected.orgFunctionLabel} />
                  <DetailCell label="财务编码" value={selected.financialCode} />
                  <DetailCell label="组织标签" value={selected.orgTags} />
                </DetailSection>

                <DetailSection title="负责人与 HR">
                  <DetailCell label="组织负责人" value={selected.orgLeaderNo} />
                  <DetailCell label="分管领导" value={selected.supervisingLeaderNo} />
                  <DetailCell label="人资协调员" value={selected.hrCoordinatorNo} />
                  <DetailCell label="HRBP" value={selected.hrbpNo} />
                  <DetailCell label="SSC" value={selected.sscNo} />
                </DetailSection>
              </div>

              {canEdit ? (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-border/50 pt-4">
                  <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>
                    <Pencil className="size-3.5" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setForm(formFromOrg(selected));
                      setEditMode("NEW_VERSION");
                      setSheet({ type: "edit", org: selected });
                    }}
                  >
                    <History className="size-3.5" />
                    新增版本
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openCreate(selected.code)}>
                    <GitBranchPlus className="size-3.5" />
                    添加下级
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </PanelCard>
      </div>

      <Sheet open={sheet.type !== "closed"} onOpenChange={(o) => !o && setSheet({ type: "closed" })}>
        <SheetContent side="right" className="data-[side=right]:max-w-[min(840px,100vw)] gap-0 p-0">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>
              {sheet.type === "create" ? "新建部门" : editMode === "NEW_VERSION" ? "新增生效版本" : "编辑部门"}
            </SheetTitle>
            <SheetDescription>
              {sheet.type === "create" && sheet.parentCode
                ? `上级编号：${sheet.parentCode}`
                : sheet.type === "edit" && editMode === "CURRENT"
                  ? `修改当前版本（${sheet.org.effectiveStartDate}）的数据，不改变生效日期。`
                  : sheet.type === "edit"
                    ? "指定新生效日期，将基于当前表单内容创建新版本并自动衔接时间轴。"
                    : "填写部门信息并指定生效日期。"}
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
                        patchForm("effectiveStartDate", sheet.org.effectiveStartDate);
                      }
                    }}
                  />
                </FormField>
              </FormSection>
            ) : null}

            <FormSection title="基本信息">
              <div className="space-y-4">
                <FormField label="部门名称" required>
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
                  <FormField label="地点">
                    <SearchableSelect
                      value={form.location}
                      onChange={(v) => patchForm("location", v)}
                      options={dictOptions(opts.locations)}
                      placeholder="选择地点"
                      searchPlaceholder="搜索地点编码或名称…"
                      allowEmpty
                    />
                  </FormField>
                  <FormField label="法人公司">
                    <SearchableSelect
                      value={form.legalCompany}
                      onChange={(v) => patchForm("legalCompany", v)}
                      options={dictOptions(opts.legalCompanies)}
                      placeholder="选择法人公司"
                      searchPlaceholder="搜索法人公司编码或名称…"
                      allowEmpty
                    />
                  </FormField>
                  <FormField label="部门类型">
                    <SearchableSelect
                      value={form.departmentType}
                      onChange={(v) => patchForm("departmentType", v)}
                      options={dictOptions(opts.departmentTypes)}
                      placeholder="选择部门类型"
                      searchPlaceholder="搜索部门类型编码或名称…"
                      allowEmpty
                    />
                  </FormField>
                  <FormField label="部门层级">
                    <SearchableSelect
                      value={form.departmentLevel}
                      onChange={(v) => patchForm("departmentLevel", v)}
                      options={dictOptions(opts.departmentLevels)}
                      placeholder="选择部门层级"
                      searchPlaceholder="搜索部门层级编码或名称…"
                      allowEmpty
                    />
                  </FormField>
                  <FormField label="成本中心">
                    <Input value={form.costCenter} onChange={(e) => patchForm("costCenter", e.target.value)} />
                  </FormField>
                  <FormField label="财务编码">
                    <Input value={form.financialCode} onChange={(e) => patchForm("financialCode", e.target.value)} />
                  </FormField>
                </FormGrid>
                <FormField label="组织属性">
                  <OptionToggle
                    options={ORG_ATTRIBUTE_OPTIONS}
                    value={form.orgAttribute || "PHYSICAL"}
                    onChange={(v) => patchForm("orgAttribute", v)}
                  />
                </FormField>
                <FormField label="组织职能">
                  <OptionToggle
                    options={ORG_FUNCTION_OPTIONS}
                    value={form.orgFunction || "FUNCTION"}
                    onChange={(v) => patchForm("orgFunction", v)}
                  />
                </FormField>
                <FormField label="组织标签">
                  <Input
                    value={form.orgTags}
                    onChange={(e) => patchForm("orgTags", e.target.value)}
                    placeholder="多个标签可用逗号分隔"
                  />
                </FormField>
                {sheet.type === "create" || sheet.type === "edit" ? (
                  <FormField label="上级组织">
                    <SearchableSelect
                      variant="entity"
                      value={form.parentCode ?? ""}
                      onChange={(v) => patchForm("parentCode", v || undefined)}
                      options={parentOrgOptions}
                      placeholder="无（根节点）"
                      emptyLabel="无（根节点）"
                      searchPlaceholder="搜索上级部门编号或名称…"
                      allowEmpty
                      formatOption={(opt) => `${opt.code ?? opt.value} — ${opt.label}`}
                    />
                  </FormField>
                ) : null}
              </div>
            </FormSection>

            <FormSection title="负责人与 HR">
              <FormGrid>
                <FormField label="组织负责人" hint="暂填工号">
                  <Input value={form.orgLeaderNo} onChange={(e) => patchForm("orgLeaderNo", e.target.value)} />
                </FormField>
                <FormField label="分管领导" hint="暂填工号">
                  <Input
                    value={form.supervisingLeaderNo}
                    onChange={(e) => patchForm("supervisingLeaderNo", e.target.value)}
                  />
                </FormField>
                <FormField label="人资协调员" hint="暂填工号">
                  <Input
                    value={form.hrCoordinatorNo}
                    onChange={(e) => patchForm("hrCoordinatorNo", e.target.value)}
                  />
                </FormField>
                <FormField label="HRBP" hint="暂填工号">
                  <Input value={form.hrbpNo} onChange={(e) => patchForm("hrbpNo", e.target.value)} />
                </FormField>
                <FormField label="SSC" hint="暂填工号">
                  <Input value={form.sscNo} onChange={(e) => patchForm("sscNo", e.target.value)} />
                </FormField>
              </FormGrid>
            </FormSection>
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setSheet({ type: "closed" })}>
                取消
              </Button>
              <Button disabled={saving} onClick={() => void handleSave()}>
                {saving
                  ? "保存中…"
                  : sheet.type === "edit" && editMode === "NEW_VERSION"
                    ? "创建新版本"
                    : "保存"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
