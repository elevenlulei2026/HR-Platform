import type {
  Employee,
  EmployeeStatus,
  OrganizationTreeNode,
  ReportingLine,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  GitBranchPlus,
  Inbox,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  EMPLOYEE_STATUS_OPTIONS,
  LINE_TYPE_OPTIONS,
  createReportingLine,
  deleteReportingLine,
  listEmployees,
  listReportingLines,
  syncReportingLinesFromOrg,
  updateReportingLine,
} from "@/api/employee";
import { flattenOrgTree, getOrganizationTree } from "@/api/organization";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormField } from "@/components/admin/form-field";
import {
  adminFilterInputClassName,
  adminFilterInputGroupClassName,
  adminFilterSearchableTriggerClassName,
  adminFilterSelectTriggerClassName,
} from "@/components/admin/form-control-styles";
import { OptionSelect } from "@/components/admin/option-select";
import {
  NoPermissionCard,
  PageHeader,
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  PaginationBar,
} from "@/components/admin/page-shell";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/admin/searchable-select";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: ReportingLine[]; total: number };

type SheetMode =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: ReportingLine };

type FilterState = {
  keyword: string;
  status: EmployeeStatus | "";
  organizationId: string;
  lineType: string;
  asOfDate: string;
};

const EMPTY_FILTER: FilterState = {
  keyword: "",
  status: "",
  organizationId: "",
  lineType: "",
  asOfDate: todayStr(),
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function countActiveFilters(value: FilterState): number {
  return [
    value.keyword,
    value.status,
    value.organizationId,
    value.lineType,
    value.asOfDate !== todayStr() ? value.asOfDate : "",
  ].filter(Boolean).length;
}

function CompactField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="truncate text-[11px] font-medium leading-none text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function toEmployeeOption(item: Employee): SearchableSelectOption {
  const org = item.primaryOrganizationName?.trim();
  const position = item.primaryPositionName?.trim();
  const description = [org, position].filter(Boolean).join(" · ") || undefined;
  return {
    value: item.id,
    label: item.fullName,
    code: item.employeeNo,
    description,
    keywords: `${item.employeeNo} ${item.fullName} ${org ?? ""} ${position ?? ""}`,
  };
}

function toApiError(e: unknown): ApiError {
  if (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return e as ApiError;
  }
  return { message: "请求失败，请稍后重试" };
}

export function AdminReportingLinesPage() {
  const perm = usePermission();
  const canView = perm.has("reporting-line:view");
  const canEdit = perm.has("reporting-line:edit");

  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const debouncedFilter = useDebouncedValue(filter, 280);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });
  const [orgs, setOrgs] = useState<OrganizationTreeNode[]>([]);
  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoSynced, setAutoSynced] = useState(false);

  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formManagerId, setFormManagerId] = useState("");
  const [formLineType, setFormLineType] = useState("DIRECT");
  const [formStart, setFormStart] = useState(todayStr());
  const [formEnd, setFormEnd] = useState("");

  const [employeeOptions, setEmployeeOptions] = useState<SearchableSelectOption[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [managerOptions, setManagerOptions] = useState<SearchableSelectOption[]>([]);
  const [managerSearch, setManagerSearch] = useState("");
  const [managerLoading, setManagerLoading] = useState(false);
  const debouncedEmployeeSearch = useDebouncedValue(employeeSearch, 280);
  const debouncedManagerSearch = useDebouncedValue(managerSearch, 280);
  const [selectedEmployeeOption, setSelectedEmployeeOption] = useState<SearchableSelectOption | null>(
    null,
  );
  const [selectedManagerOption, setSelectedManagerOption] = useState<SearchableSelectOption | null>(
    null,
  );

  const flatOrgs = useMemo(() => flattenOrgTree(orgs), [orgs]);
  const departmentOptions = useMemo<SearchableSelectOption[]>(
    () =>
      flatOrgs.map((org) => ({
        value: org.id,
        label: org.name,
        code: org.code,
        keywords: `${org.code} ${org.name}`,
      })),
    [flatOrgs],
  );

  const activeFilterCount = countActiveFilters(filter);

  const loadOrgs = useCallback(async () => {
    try {
      const res = await getOrganizationTree({ asOfDate: debouncedFilter.asOfDate || todayStr() });
      setOrgs(res.data);
    } catch (e) {
      toast.error(`部门数据加载失败：${toApiError(e).message}`);
    }
  }, [debouncedFilter.asOfDate]);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listReportingLines({
        page,
        pageSize,
        keyword: debouncedFilter.keyword || undefined,
        asOfDate: debouncedFilter.asOfDate || undefined,
        lineType: (debouncedFilter.lineType || undefined) as "DIRECT" | "DOTTED" | undefined,
        organizationId: debouncedFilter.organizationId || undefined,
        status: debouncedFilter.status || undefined,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e) {
      setState({ type: "error", error: e as ApiError });
    }
  }, [canView, page, pageSize, debouncedFilter]);

  const runSync = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!canEdit) return;
      setSyncing(true);
      try {
        const res = await syncReportingLinesFromOrg({
          asOfDate: filter.asOfDate || todayStr(),
        });
        const d = res.data;
        if (!opts?.silent) {
          toast.success(
            `已按组织同步：新建 ${d.created}，更新 ${d.updated}，不变 ${d.unchanged}，跳过 ${d.skipped}`,
          );
        }
        await load();
      } catch (e) {
        toast.error(toApiError(e).message);
      } finally {
        setSyncing(false);
      }
    },
    [canEdit, filter.asOfDate, load],
  );

  useEffect(() => {
    if (canView) void loadOrgs();
  }, [canView, loadOrgs]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedFilter]);

  // 列表为空时自动按组织生成一次 DIRECT 汇报关系
  useEffect(() => {
    if (!canEdit || autoSynced || state.type !== "ok") return;
    if (state.total > 0) {
      setAutoSynced(true);
      return;
    }
    setAutoSynced(true);
    void runSync({ silent: true }).then(() => {
      toast.message("已按组织自动生成实线汇报关系");
    });
  }, [autoSynced, canEdit, runSync, state]);

  useEffect(() => {
    if (sheet.type === "closed") return;
    setEmployeeLoading(true);
    void listEmployees({
      page: 1,
      pageSize: 20,
      keyword: debouncedEmployeeSearch || undefined,
      asOfDate: filter.asOfDate || todayStr(),
    })
      .then((res) => setEmployeeOptions(res.data.items.map(toEmployeeOption)))
      .catch(() => setEmployeeOptions([]))
      .finally(() => setEmployeeLoading(false));
  }, [debouncedEmployeeSearch, filter.asOfDate, sheet.type]);

  useEffect(() => {
    if (sheet.type === "closed") return;
    setManagerLoading(true);
    void listEmployees({
      page: 1,
      pageSize: 20,
      keyword: debouncedManagerSearch || undefined,
      asOfDate: filter.asOfDate || todayStr(),
    })
      .then((res) =>
        setManagerOptions(
          res.data.items
            .filter((item) => item.id !== formEmployeeId)
            .map(toEmployeeOption),
        ),
      )
      .catch(() => setManagerOptions([]))
      .finally(() => setManagerLoading(false));
  }, [debouncedManagerSearch, filter.asOfDate, formEmployeeId, sheet.type]);

  const employeeSelectOptions = useMemo(() => {
    const byValue = new Map<string, SearchableSelectOption>();
    if (selectedEmployeeOption) byValue.set(selectedEmployeeOption.value, selectedEmployeeOption);
    for (const opt of employeeOptions) byValue.set(opt.value, opt);
    return Array.from(byValue.values());
  }, [employeeOptions, selectedEmployeeOption]);

  const managerSelectOptions = useMemo(() => {
    const byValue = new Map<string, SearchableSelectOption>();
    if (selectedManagerOption) byValue.set(selectedManagerOption.value, selectedManagerOption);
    for (const opt of managerOptions) byValue.set(opt.value, opt);
    return Array.from(byValue.values());
  }, [managerOptions, selectedManagerOption]);

  const openNew = () => {
    setFormEmployeeId("");
    setFormManagerId("");
    setSelectedEmployeeOption(null);
    setSelectedManagerOption(null);
    setEmployeeSearch("");
    setManagerSearch("");
    setFormStart(todayStr());
    setFormEnd("");
    setFormLineType("DIRECT");
    setSheet({ type: "new" });
  };

  const openEdit = (item: ReportingLine) => {
    setFormEmployeeId(item.employeeId);
    setFormManagerId(item.managerEmployeeId);
    setSelectedEmployeeOption({
      value: item.employeeId,
      label: item.employeeName ?? item.employeeNo ?? item.employeeId,
      code: item.employeeNo,
      keywords: `${item.employeeNo ?? ""} ${item.employeeName ?? ""}`,
    });
    setSelectedManagerOption({
      value: item.managerEmployeeId,
      label: item.managerEmployeeName ?? item.managerEmployeeNo ?? item.managerEmployeeId,
      code: item.managerEmployeeNo,
      keywords: `${item.managerEmployeeNo ?? ""} ${item.managerEmployeeName ?? ""}`,
    });
    setEmployeeSearch("");
    setManagerSearch("");
    setFormLineType(item.lineType);
    setFormStart(item.effectiveStartDate);
    setFormEnd(item.effectiveEndDate ?? "");
    setSheet({ type: "edit", item });
  };

  const save = async () => {
    if (!formEmployeeId || !formManagerId) {
      toast.error("请选择下属与上级");
      return;
    }
    setSaving(true);
    try {
      if (sheet.type === "new") {
        await createReportingLine({
          employeeId: formEmployeeId,
          managerEmployeeId: formManagerId,
          lineType: formLineType as "DIRECT" | "DOTTED",
          effectiveStartDate: formStart,
          effectiveEndDate: formEnd || undefined,
        });
        toast.success("汇报关系已创建");
      } else if (sheet.type === "edit") {
        await updateReportingLine(sheet.item.id, {
          managerEmployeeId: formManagerId,
          lineType: formLineType as "DIRECT" | "DOTTED",
          effectiveStartDate: formStart,
          effectiveEndDate: formEnd || undefined,
        });
        toast.success("已保存");
      }
      setSheet({ type: "closed" });
      void load();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReportingLine(deleteId);
      toast.success("已删除");
      setDeleteId(null);
      void load();
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  if (!canView) {
    return (
      <NoPermissionCard
        icon={<Shield className="size-8 text-muted-foreground" />}
        title="汇报关系"
        description="需要 reporting-line:view 权限"
      />
    );
  }

  const patchFilter = (partial: Partial<FilterState>) => setFilter((prev) => ({ ...prev, ...partial }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="汇报关系"
        description="默认按组织负责人 / 分管领导自上而下自动生成；支持 asOfDate 历史快照"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? (
              <Button
                variant="outline"
                size="sm"
                disabled={syncing}
                onClick={() => void runSync()}
              >
                <GitBranchPlus className="mr-1.5 size-4" />
                {syncing ? "同步中…" : "按组织同步"}
              </Button>
            ) : null}
            {canEdit ? (
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-1.5 size-4" />
                新建
              </Button>
            ) : null}
          </div>
        }
      />

      <PanelCard
        title="筛选"
        dense
        toolbar={
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" />
            刷新
          </Button>
        }
      >
        <div className="space-y-2 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="min-w-0 flex-1 truncate text-[11px] leading-none text-muted-foreground/85">
              按姓名、工号、部门、状态与关系类型筛选；完整汇报线由组织主数据衍生
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {activeFilterCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-6 gap-1 rounded-md px-1.5 text-[11px] font-normal"
                >
                  <Sparkles className="size-3 text-primary/80" />
                  {activeFilterCount}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className="h-6 gap-1 rounded-md px-1.5 text-[11px] font-normal text-muted-foreground"
                title="列表按所选 asOfDate 取生效快照"
              >
                <CalendarClock className="size-3" />
                {filter.asOfDate || todayStr()}
              </Badge>
              {activeFilterCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => setFilter({ ...EMPTY_FILTER, asOfDate: todayStr() })}
                >
                  <RotateCcw className="size-3" />
                  清空
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(110px,0.4fr)_minmax(160px,0.65fr)_minmax(100px,0.35fr)_minmax(140px,0.45fr)]">
            <CompactField label="关键词">
              <InputGroup
                className={adminFilterInputGroupClassName({ empty: !filter.keyword.trim() })}
              >
                <InputGroupAddon className="pl-2.5">
                  <Search className="size-3.5 opacity-50" />
                </InputGroupAddon>
                <InputGroupInput
                  value={filter.keyword}
                  onChange={(e) => patchFilter({ keyword: e.target.value })}
                  placeholder="姓名、工号…"
                  className={cn(
                    "h-8 !text-sm",
                    filter.keyword.trim()
                      ? "font-medium text-foreground"
                      : "font-normal text-muted-foreground",
                  )}
                />
              </InputGroup>
            </CompactField>
            <CompactField label="在职状态">
              <OptionSelect
                value={filter.status}
                onValueChange={(status) => patchFilter({ status: status as EmployeeStatus | "" })}
                allowEmpty
                emptyLabel="全部状态"
                options={EMPLOYEE_STATUS_OPTIONS.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
                className={adminFilterSelectTriggerClassName}
              />
            </CompactField>
            <CompactField label="所属部门">
              <SearchableSelect
                value={filter.organizationId}
                onChange={(organizationId) => patchFilter({ organizationId })}
                options={departmentOptions}
                placeholder="全部部门"
                searchPlaceholder="搜索部门编码 / 名称…"
                allowEmpty
                emptyLabel="全部部门"
                className={adminFilterSearchableTriggerClassName}
              />
            </CompactField>
            <CompactField label="关系类型">
              <OptionSelect
                value={filter.lineType}
                onValueChange={(lineType) => patchFilter({ lineType })}
                allowEmpty
                emptyLabel="全部"
                options={LINE_TYPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                className={adminFilterSelectTriggerClassName}
              />
            </CompactField>
            <CompactField label="快照日期">
              <Input
                type="date"
                value={filter.asOfDate}
                onChange={(e) => patchFilter({ asOfDate: e.target.value || todayStr() })}
                className={adminFilterInputClassName({ empty: !filter.asOfDate })}
              />
            </CompactField>
          </div>
        </div>
      </PanelCard>

      <PanelCard title="汇报关系列表" description={`当前快照：${filter.asOfDate || todayStr()}`}>
        {state.type === "loading" && <PanelLoading message="加载汇报关系…" />}
        {state.type === "error" && (
          <PanelError error={state.error} onRetry={() => void load()} />
        )}
        {state.type === "ok" && state.items.length === 0 && (
          <PanelEmpty
            icon={<Inbox className="size-5 text-muted-foreground" />}
            title="暂无汇报关系"
            description={
              canEdit
                ? "可「按组织同步」自动生成，或新建手工记录"
                : "调整筛选条件后重试"
            }
          />
        )}
        {state.type === "ok" && state.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium">下属</th>
                    <th className="min-w-[180px] px-4 py-3 text-left font-medium">组织路径</th>
                    <th className="px-4 py-3 text-left font-medium">上级</th>
                    <th className="px-4 py-3 text-left font-medium">类型</th>
                    <th className="min-w-[220px] px-4 py-3 text-left font-medium">汇报线</th>
                    <th className="px-4 py-3 text-left font-medium">生效期</th>
                    {canEdit && <th className="px-4 py-3 text-right font-medium">操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-medium">{l.employeeName}</div>
                        <div className="font-mono text-xs text-muted-foreground">{l.employeeNo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="max-w-[280px] text-xs leading-relaxed text-muted-foreground"
                          title={l.organizationPath}
                        >
                          {l.organizationPath || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{l.managerEmployeeName}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {l.managerEmployeeNo}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{l.lineTypeLabel ?? l.lineType}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="max-w-[360px] text-xs leading-relaxed text-muted-foreground"
                          title={l.reportingChain}
                        >
                          {l.reportingChain || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {l.effectiveStartDate}
                        {l.effectiveEndDate ? ` → ${l.effectiveEndDate}` : " → 至今"}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>
                              编辑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeleteId(l.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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
        )}
      </PanelCard>

      <Sheet open={sheet.type !== "closed"} onOpenChange={(o) => !o && setSheet({ type: "closed" })}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>{sheet.type === "new" ? "新建汇报关系" : "编辑汇报关系"}</SheetTitle>
            <SheetDescription>实线 / 虚线汇报，须指定生效日期</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <FormField label="下属员工" required>
              <SearchableSelect
                value={formEmployeeId}
                onChange={(id) => {
                  setFormEmployeeId(id);
                  const opt = employeeSelectOptions.find((o) => o.value === id) ?? null;
                  setSelectedEmployeeOption(opt);
                  if (id && id === formManagerId) {
                    setFormManagerId("");
                    setSelectedManagerOption(null);
                  }
                }}
                options={employeeSelectOptions}
                placeholder="搜索姓名 / 工号…"
                searchPlaceholder="搜索姓名 / 工号…"
                disabled={sheet.type === "edit"}
                shouldFilter={false}
                onSearchChange={setEmployeeSearch}
                loading={employeeLoading}
                portal
              />
            </FormField>
            <FormField label="上级员工" required>
              <SearchableSelect
                value={formManagerId}
                onChange={(id) => {
                  setFormManagerId(id);
                  const opt = managerSelectOptions.find((o) => o.value === id) ?? null;
                  setSelectedManagerOption(opt);
                }}
                options={managerSelectOptions}
                placeholder="搜索姓名 / 工号…"
                searchPlaceholder="搜索姓名 / 工号…"
                shouldFilter={false}
                onSearchChange={setManagerSearch}
                loading={managerLoading}
                portal
              />
            </FormField>
            <FormField label="关系类型">
              <OptionSelect
                value={formLineType}
                onValueChange={setFormLineType}
                options={LINE_TYPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
              />
            </FormField>
            <FormField label="生效开始" required>
              <Input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
            </FormField>
            <FormField label="生效结束" hint="留空表示当前有效">
              <Input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
            </FormField>
          </div>
          <SheetFooter className="flex-row border-t px-6 py-4">
            <Button variant="outline" onClick={() => setSheet({ type: "closed" })}>
              取消
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              保存
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="删除汇报关系"
        description="删除后不可恢复，确认继续？"
        confirmLabel="删除"
        destructive
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
