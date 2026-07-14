import type {
  Employee,
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

import { listEmployees } from "@/api/employee";
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
import { SearchableDialogPicker } from "@/components/admin/searchable-dialog-picker";
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
  SearchInput,
} from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  GitBranchPlus,
  History,
  MoreHorizontal,
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
  | { type: "view"; org: Organization }
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

/** 组织负责人类字段：库中存工号，表单用弹窗选人 */
const ORG_PERSON_NO_FIELDS = [
  "orgLeaderNo",
  "supervisingLeaderNo",
  "hrCoordinatorNo",
  "hrbpNo",
  "sscNo",
] as const;

type OrgPersonNoField = (typeof ORG_PERSON_NO_FIELDS)[number];

const ORG_PERSON_FIELD_META: Array<{ key: OrgPersonNoField; label: string }> = [
  { key: "orgLeaderNo", label: "组织负责人" },
  { key: "supervisingLeaderNo", label: "分管领导" },
  { key: "hrCoordinatorNo", label: "人资协调员" },
  { key: "hrbpNo", label: "HRBP" },
  { key: "sscNo", label: "SSC" },
];

function toEmployeeOption(item: Employee): SearchableSelectOption {
  const org = item.primaryOrganizationName?.trim();
  const position = item.primaryPositionName?.trim();
  const description = [org, position].filter(Boolean).join(" · ") || undefined;
  return {
    value: item.employeeNo,
    label: item.fullName,
    code: item.employeeNo,
    description,
    keywords: `${item.employeeNo} ${item.fullName} ${org ?? ""} ${position ?? ""}`,
  };
}

function collectPersonNos(
  source: Partial<Record<OrgPersonNoField, string | undefined>> | Organization | DeptForm,
): string[] {
  const nos = new Set<string>();
  for (const key of ORG_PERSON_NO_FIELDS) {
    const value = source[key]?.trim();
    if (value) nos.add(value);
  }
  return [...nos];
}

async function resolveEmployeeOptionsByNos(
  nos: string[],
): Promise<Record<string, SearchableSelectOption>> {
  const unique = [...new Set(nos.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  const entries = await Promise.all(
    unique.map(async (employeeNo) => {
      try {
        const res = await listEmployees({
          page: 1,
          pageSize: 1,
          filterMode: "ADVANCED",
          employeeNo,
        });
        const item = res.data.items[0];
        if (item?.employeeNo) {
          return [employeeNo, toEmployeeOption(item)] as const;
        }
      } catch {
        // 解析失败时仍保留工号，便于展示与再次选择
      }
      return [
        employeeNo,
        { value: employeeNo, label: employeeNo, code: employeeNo, keywords: employeeNo },
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}

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

function nodeMatchesKeyword(
  node: OrganizationTreeNode,
  keyword: string,
  employeeByNo?: Record<string, SearchableSelectOption>,
) {
  const q = keyword.toLowerCase();
  const leaderName = resolvedEmployeeName(node.orgLeaderNo, employeeByNo ?? {})?.toLowerCase();
  return (
    node.name.toLowerCase().includes(q) ||
    node.code.toLowerCase().includes(q) ||
    (leaderName?.includes(q) ?? false) ||
    (node.departmentTypeLabel?.toLowerCase().includes(q) ?? false) ||
    (node.departmentLevelLabel?.toLowerCase().includes(q) ?? false) ||
    (node.orgAttributeLabel?.toLowerCase().includes(q) ?? false)
  );
}

function filterOrgTree(
  nodes: OrganizationTreeNode[],
  keyword: string,
  employeeByNo?: Record<string, SearchableSelectOption>,
): OrganizationTreeNode[] {
  const q = keyword.trim();
  if (!q) return nodes;

  function walk(node: OrganizationTreeNode): OrganizationTreeNode | null {
    const filteredChildren = node.children
      .map(walk)
      .filter((n): n is OrganizationTreeNode => n !== null);
    if (nodeMatchesKeyword(node, q, employeeByNo) || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  }

  return nodes.map(walk).filter((n): n is OrganizationTreeNode => n !== null);
}

function collectExpandCodesForSearch(
  nodes: OrganizationTreeNode[],
  keyword: string,
  employeeByNo?: Record<string, SearchableSelectOption>,
): Set<string> {
  const codes = new Set<string>();
  const q = keyword.trim();
  if (!q) return codes;

  function walk(node: OrganizationTreeNode, ancestors: string[]): boolean {
    let childMatch = false;
    for (const child of node.children) {
      if (walk(child, [...ancestors, node.code])) childMatch = true;
    }
    const selfMatch = nodeMatchesKeyword(node, q, employeeByNo);
    if (selfMatch || childMatch) {
      for (const c of ancestors) codes.add(c);
      if (childMatch) codes.add(node.code);
      return true;
    }
    return false;
  }

  for (const n of nodes) walk(n, []);
  return codes;
}

function collectAllCodes(nodes: OrganizationTreeNode[]): string[] {
  const codes: string[] = [];
  for (const n of nodes) {
    codes.push(n.code);
    if (n.children.length) codes.push(...collectAllCodes(n.children));
  }
  return codes;
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

function displayEmployeeNo(
  employeeNo: string | undefined,
  employeeByNo: Record<string, SearchableSelectOption>,
) {
  const no = employeeNo?.trim();
  if (!no) return "—";
  const opt = employeeByNo[no];
  if (opt?.label && opt.label !== no) {
    return formatCodeName({ value: no, label: opt.label, code: no });
  }
  return no;
}

/** 仅返回已解析的姓名；未解析或解析失败时不回退工号 */
function resolvedEmployeeName(
  employeeNo: string | undefined,
  employeeByNo: Record<string, SearchableSelectOption>,
) {
  const no = employeeNo?.trim();
  if (!no) return undefined;
  const label = employeeByNo[no]?.label?.trim();
  if (!label || label === no) return undefined;
  return label;
}

function OrgPersonPicker({
  label,
  value,
  onChange,
  options,
  loading,
  onSearchChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  loading: boolean;
  onSearchChange: (query: string) => void;
}) {
  return (
    <FormField label={label}>
      <SearchableDialogPicker
        value={value}
        onChange={onChange}
        options={options}
        dialogTitle={`选择${label}`}
        dialogDescription="输入员工姓名或工号搜索，点击条目完成选择"
        placeholder={`点击搜索选择${label}`}
        entityEmptyTitle={`点击搜索选择${label}`}
        entityEmptyHint="在弹窗中搜索员工姓名或工号"
        entitySelectedHint={`已选择${label}，点击可重新搜索`}
        searchPlaceholder="搜索员工姓名 / 工号…"
        entityIcon="briefcase"
        formatOption={formatCodeName}
        loading={loading}
        shouldFilter={false}
        onSearchChange={onSearchChange}
        helperText="none"
        allowEmpty
        emptyLabel="不指定"
        className="w-full"
      />
    </FormField>
  );
}

function OrgDetailContent({
  org,
  versions,
  versionsLoading,
  onSelectVersion,
  employeeByNo,
}: {
  org: Organization;
  versions: OrganizationVersion[];
  versionsLoading: boolean;
  onSelectVersion: (version: OrganizationVersion) => void;
  employeeByNo: Record<string, SearchableSelectOption>;
}) {
  return (
    <div className="space-y-5">
      {versionsLoading ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted/30" />
      ) : (
        <VersionTimeline versions={versions} activeId={org.id} onSelect={onSelectVersion} />
      )}

      <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-4">
        <div className="min-w-0 space-y-1">
          <div className="text-lg font-semibold tracking-tight">{org.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{org.code}</div>
        </div>
        <Badge variant={org.status === "ACTIVE" ? "default" : "secondary"}>
          {org.statusLabel ?? (org.status === "ACTIVE" ? "有效" : "无效")}
        </Badge>
      </div>

      <DetailSection title="基本信息">
        <DetailCell label="上级组织" value={displayParent(org)} />
        <DetailCell label="生效日期" value={org.effectiveStartDate} />
        <DetailCell
          label="地点"
          value={displayCodeName(org.location, org.locationLabel)}
        />
        <DetailCell
          label="法人公司"
          value={displayCodeName(org.legalCompany, org.legalCompanyLabel)}
        />
        <DetailCell
          label="部门类型"
          value={displayCodeName(org.departmentType, org.departmentTypeLabel)}
        />
        <DetailCell
          label="部门层级"
          value={displayCodeName(org.departmentLevel, org.departmentLevelLabel)}
        />
        <DetailCell label="成本中心" value={org.costCenter} />
        <DetailCell label="组织属性" value={org.orgAttributeLabel} />
        <DetailCell label="组织职能" value={org.orgFunctionLabel} />
        <DetailCell label="财务编码" value={org.financialCode} />
        <DetailCell label="组织标签" value={org.orgTags} />
      </DetailSection>

      <DetailSection title="负责人与 HR">
        {ORG_PERSON_FIELD_META.map(({ key, label }) => (
          <DetailCell key={key} label={label} value={displayEmployeeNo(org[key], employeeByNo)} />
        ))}
      </DetailSection>
    </div>
  );
}

function OrgTreeItem({
  node,
  depth,
  selectedId,
  expanded,
  canEdit,
  employeeByNo,
  onToggle,
  onSelect,
  onAddChild,
  onAddSibling,
  onEdit,
  onNewVersion,
}: {
  node: OrganizationTreeNode;
  depth: number;
  selectedId?: string;
  expanded: Set<string>;
  canEdit: boolean;
  employeeByNo: Record<string, SearchableSelectOption>;
  onToggle: (code: string) => void;
  onSelect: (org: Organization) => void;
  onAddChild: (org: Organization) => void;
  onAddSibling: (org: Organization) => void;
  onEdit: (org: Organization) => void;
  onNewVersion: (org: Organization) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.code);
  const selected = selectedId === node.id;
  const inactive = node.status === "INACTIVE";
  const orgLeaderName = resolvedEmployeeName(node.orgLeaderNo, employeeByNo);

  return (
    <div>
      <div
        className={cn(
          "group/node relative flex items-center rounded-lg border border-transparent transition-all",
          "hover:border-border/60 hover:bg-muted/40",
          selected && "border-primary/30 bg-primary/8 shadow-sm",
          inactive && "opacity-55",
        )}
        style={{ marginLeft: `${depth * 14}px`, width: `calc(100% - ${depth * 14}px)` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-muted"
            onClick={() => onToggle(node.code)}
            aria-label={isExpanded ? "收起" : "展开"}
          >
            {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="inline-block size-7 shrink-0" />
        )}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left"
          onClick={() => onSelect(node)}
        >
          <Building2 className="size-3.5 shrink-0 text-primary/70" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex min-w-0 items-baseline gap-1.5">
              <span className="shrink-0 text-sm font-semibold tracking-tight">{node.name}</span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                {node.code}
              </span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {node.departmentLevelLabel ? (
                <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                  {node.departmentLevelLabel}
                </Badge>
              ) : null}
              {node.departmentTypeLabel ? (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                  {node.departmentTypeLabel}
                </Badge>
              ) : null}
              {node.orgAttributeLabel ? (
                <Badge variant="outline" className="h-4 border-dashed px-1.5 text-[10px] font-normal">
                  {node.orgAttributeLabel}
                </Badge>
              ) : null}
              {orgLeaderName ? (
                <Badge variant="outline" className="h-4 gap-0.5 px-1.5 text-[10px] font-normal">
                  <UserRound className="size-2.5" />
                  {orgLeaderName}
                </Badge>
              ) : null}
            </div>
          </div>
        </button>

        <div
          className={cn(
            "ml-auto flex shrink-0 items-center gap-0.5 border-l border-transparent pl-2 pr-1 transition-opacity",
            "group-hover/node:border-border/40",
            "opacity-0 group-hover/node:opacity-100 group-focus-within/node:opacity-100",
            selected && "border-border/40 opacity-100",
          )}
        >
          {canEdit ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="添加下级"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(node);
                }}
              >
                <GitBranchPlus />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="添加同级"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSibling(node);
                }}
              >
                <Plus />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                  title="更多操作"
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onEdit(node)}>
                    <Pencil />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNewVersion(node)}>
                    <History />
                    新增版本
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSelect(node)}>查看详情</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>
      </div>
      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <OrgTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              canEdit={canEdit}
              employeeByNo={employeeByNo}
              onToggle={onToggle}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              onEdit={onEdit}
              onNewVersion={onNewVersion}
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
  const [treeSearch, setTreeSearch] = useState("");
  const debouncedSearch = useDebouncedValue(treeSearch, 280);
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
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<SearchableSelectOption[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeByNo, setEmployeeByNo] = useState<Record<string, SearchableSelectOption>>({});
  const debouncedEmployeeSearch = useDebouncedValue(employeeSearch, 280);

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

  const treeLeaderNosKey = useMemo(() => {
    const nos = [
      ...new Set(
        flatOrgs
          .map((org) => org.orgLeaderNo?.trim())
          .filter((no): no is string => Boolean(no)),
      ),
    ].sort();
    return nos.join("|");
  }, [flatOrgs]);

  const filteredTree = useMemo(() => {
    if (state.type !== "ok") return [];
    return filterOrgTree(state.tree, debouncedSearch, employeeByNo);
  }, [state, debouncedSearch, employeeByNo]);

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

  const mergeEmployeeByNo = useCallback((options: Record<string, SearchableSelectOption>) => {
    setEmployeeByNo((prev) => ({ ...prev, ...options }));
  }, []);

  const rememberEmployeeOption = useCallback((option: SearchableSelectOption) => {
    setEmployeeByNo((prev) => ({ ...prev, [option.value]: option }));
  }, []);

  useEffect(() => {
    if (!treeLeaderNosKey) return;
    const nos = treeLeaderNosKey.split("|").filter(Boolean);
    const missing = nos.filter((no) => {
      const label = employeeByNo[no]?.label?.trim();
      return !label || label === no;
    });
    if (missing.length === 0) return;
    let cancelled = false;
    void resolveEmployeeOptionsByNos(missing).then((resolved) => {
      if (!cancelled) mergeEmployeeByNo(resolved);
    });
    return () => {
      cancelled = true;
    };
    // employeeByNo 仅用于跳过已解析项，不放入 deps 以免循环请求
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeEmployeeByNo, treeLeaderNosKey]);

  useEffect(() => {
    if (state.type !== "ok" || !debouncedSearch.trim()) return;
    const codes = collectExpandCodesForSearch(state.tree, debouncedSearch, employeeByNo);
    if (codes.size === 0) return;
    setExpanded((prev) => new Set([...prev, ...codes]));
  }, [debouncedSearch, employeeByNo, state]);

  useEffect(() => {
    if (sheet.type !== "create" && sheet.type !== "edit") return;
    setEmployeeLoading(true);
    void listEmployees({
      page: 1,
      pageSize: 20,
      keyword: debouncedEmployeeSearch || undefined,
    })
      .then((res) => {
        const options = res.data.items.map(toEmployeeOption);
        setEmployeeOptions(options);
        mergeEmployeeByNo(Object.fromEntries(options.map((opt) => [opt.value, opt])));
      })
      .catch(() => setEmployeeOptions([]))
      .finally(() => setEmployeeLoading(false));
  }, [debouncedEmployeeSearch, mergeEmployeeByNo, sheet.type]);

  useEffect(() => {
    if (sheet.type !== "create" && sheet.type !== "edit") return;
    const nos = collectPersonNos(form);
    if (nos.length === 0) return;
    let cancelled = false;
    void resolveEmployeeOptionsByNos(nos).then((resolved) => {
      if (!cancelled) mergeEmployeeByNo(resolved);
    });
    return () => {
      cancelled = true;
    };
    // 仅在表单工号变更时回填姓名，避免与 employeeByNo 形成循环
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally scoped to person no fields
  }, [
    form.hrCoordinatorNo,
    form.hrbpNo,
    form.orgLeaderNo,
    form.sscNo,
    form.supervisingLeaderNo,
    mergeEmployeeByNo,
    sheet.type,
  ]);

  useEffect(() => {
    const org = sheet.type === "view" ? sheet.org : selected;
    if (!org) return;
    const nos = collectPersonNos(org);
    if (nos.length === 0) return;
    let cancelled = false;
    void resolveEmployeeOptionsByNos(nos).then((resolved) => {
      if (!cancelled) mergeEmployeeByNo(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [mergeEmployeeByNo, selected, sheet]);

  const employeePickerOptions = useMemo(() => {
    const byValue = new Map<string, SearchableSelectOption>();
    for (const key of ORG_PERSON_NO_FIELDS) {
      const no = form[key]?.trim();
      if (!no) continue;
      byValue.set(
        no,
        employeeByNo[no] ?? {
          value: no,
          label: no,
          code: no,
          keywords: no,
        },
      );
    }
    for (const opt of employeeOptions) {
      byValue.set(opt.value, opt);
    }
    return [...byValue.values()];
  }, [employeeByNo, employeeOptions, form]);

  const openView = (org: Organization) => {
    setSelected(org);
    setSheet({ type: "view", org });
  };

  const openCreate = (parentCode?: string) => {
    setEmployeeSearch("");
    setEmployeeOptions([]);
    setForm(emptyForm(asOfDate || todayStr(), parentCode));
    setEditMode("CURRENT");
    setSheet({ type: "create", parentCode });
  };

  const openAddSibling = (org: Organization) => {
    openCreate(org.parentCode);
  };

  const openEdit = (org: Organization) => {
    setEmployeeSearch("");
    setEmployeeOptions([]);
    setForm(formFromOrg(org));
    setEditMode("CURRENT");
    setSheet({ type: "edit", org });
  };

  const openNewVersion = (org: Organization) => {
    setEmployeeSearch("");
    setEmployeeOptions([]);
    const next = formFromOrg(org);
    next.effectiveStartDate = todayStr();
    setForm(next);
    setEditMode("NEW_VERSION");
    setSheet({ type: "edit", org });
  };

  const closeSheet = () => {
    setSheet({ type: "closed" });
    setEmployeeSearch("");
    setEmployeeOptions([]);
  };

  const viewVersion = async (version: OrganizationVersion) => {
    try {
      const res = await getOrganization(version.id);
      setSelected(res.data);
      setSheet((prev) => (prev.type === "view" ? { type: "view", org: res.data } : prev));
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.message ?? "加载版本详情失败");
    }
  };

  const patchForm = <K extends keyof DeptForm>(key: K, value: DeptForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const patchPersonNo = (key: OrgPersonNoField, value: string) => {
    patchForm(key, value);
    if (!value) return;
    const selectedOpt =
      employeePickerOptions.find((opt) => opt.value === value) ?? employeeByNo[value];
    if (selectedOpt) rememberEmployeeOption(selectedOpt);
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
        setSheet({ type: "view", org: detailRes.data });
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

      <PanelCard
        title="组织树"
        description={
          state.type === "ok"
            ? `共 ${flatOrgs.length} 个部门 · 点击节点查看详情，悬停可快捷操作`
            : undefined
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={treeSearch}
              onChange={setTreeSearch}
              placeholder="搜索部门名称、编号…"
              className="sm:w-[200px]"
            />
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
            {state.type === "ok" && state.tree.length > 0 ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  title="全部展开"
                  onClick={() => setExpanded(new Set(collectAllCodes(state.tree)))}
                >
                  <ChevronsUpDown />
                </Button>
                <Button variant="outline" size="sm" title="全部收起" onClick={() => setExpanded(new Set())}>
                  <ChevronsDownUp />
                </Button>
              </>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw />
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
        {state.type === "ok" && state.tree.length > 0 && filteredTree.length === 0 ? (
          <PanelEmpty
            title="无匹配部门"
            description={`未找到与「${debouncedSearch}」相关的部门，请调整关键词。`}
            action={
              <Button size="sm" variant="outline" onClick={() => setTreeSearch("")}>
                清除搜索
              </Button>
            }
          />
        ) : null}
        {state.type === "ok" && filteredTree.length > 0 ? (
          <div className="h-[calc(100dvh-280px)] min-h-[420px] overflow-y-auto p-2">
            {filteredTree.map((node) => (
              <OrgTreeItem
                key={node.id}
                node={node}
                depth={0}
                selectedId={selected?.id}
                expanded={expanded}
                canEdit={canEdit}
                employeeByNo={employeeByNo}
                onToggle={(code) =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(code)) next.delete(code);
                    else next.add(code);
                    return next;
                  })
                }
                onSelect={openView}
                onAddChild={(org) => openCreate(org.code)}
                onAddSibling={openAddSibling}
                onEdit={openEdit}
                onNewVersion={openNewVersion}
              />
            ))}
          </div>
        ) : null}
      </PanelCard>

      <Sheet open={sheet.type !== "closed"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent
          side="right"
          className={cn(
            "gap-0 p-0",
            sheet.type === "view"
              ? "data-[side=right]:max-w-[min(640px,100vw)]"
              : "data-[side=right]:max-w-[min(840px,100vw)]",
          )}
        >
          {sheet.type === "view" ? (
            <>
              <SheetHeader className="border-b px-6 py-4">
                <SheetTitle>部门详情</SheetTitle>
                <SheetDescription>
                  {sheet.org.name}（{sheet.org.code}）· 生效日 {sheet.org.effectiveStartDate}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <OrgDetailContent
                  org={sheet.org}
                  versions={versions}
                  versionsLoading={versionsLoading}
                  onSelectVersion={(v) => void viewVersion(v)}
                  employeeByNo={employeeByNo}
                />
              </div>
              <SheetFooter className="border-t px-6 py-4">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button variant="outline" onClick={closeSheet}>
                    关闭
                  </Button>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(sheet.org)}>
                        <Pencil />
                        编辑
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openNewVersion(sheet.org)}>
                        <History />
                        新增版本
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openCreate(sheet.org.code)}>
                        <GitBranchPlus />
                        添加下级
                      </Button>
                    </div>
                  ) : null}
                </div>
              </SheetFooter>
            </>
          ) : (
            <>
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
                      if (sheet.type !== "edit") return;
                      if (mode === "CURRENT") {
                        patchForm("effectiveStartDate", sheet.org.effectiveStartDate);
                      } else {
                        patchForm("effectiveStartDate", todayStr());
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
                      entityEmptyHint="作为顶层部门，不挂载上级"
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
                {ORG_PERSON_FIELD_META.map(({ key, label }) => (
                  <OrgPersonPicker
                    key={key}
                    label={label}
                    value={form[key]}
                    onChange={(value) => patchPersonNo(key, value)}
                    options={employeePickerOptions}
                    loading={employeeLoading}
                    onSearchChange={setEmployeeSearch}
                  />
                ))}
              </FormGrid>
            </FormSection>
          </div>
              <SheetFooter className="border-t px-6 py-4">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={closeSheet}>
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
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
