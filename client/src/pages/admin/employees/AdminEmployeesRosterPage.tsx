import type {
  Employee,
  EmployeeArchive,
  EmployeeFormOptions,
  EmployeeMovement,
  OrganizationTreeNode,
} from "@shared/api.interface";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, EyeOff, Inbox, Plus, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import { getEmployeeArchive } from "@/api/employee-archive";
import {
  createEmployee,
  employeeStatusLabel,
  exportEmployees,
  getEmployee,
  getEmployeeSnapshot,
  getEmployeeFormOptions,
  listEmployeeMovements,
  listEmployees,
  statusBadgeClass,
  updateEmployee,
} from "@/api/employee";
import { flattenOrgTree, getOrganizationTree, listAllPositions } from "@/api/organization";
import { Can } from "@/components/admin/can";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { SearchableSelectOption } from "@/components/admin/searchable-select";
import { ArchiveFormDialog } from "@/components/admin/employee-archive/ArchiveFormDialog";
import { ArchiveDialogMountProvider } from "@/components/admin/employee-archive/archive-dialog-mount";
import { EmployeeArchiveDetailView } from "@/components/admin/employee-archive/EmployeeArchiveDetailView";
import {
  RosterColumnPicker,
  RosterColumnPickerTrigger,
} from "@/components/admin/employees/RosterColumnPicker";
import {
  EMPTY_ROSTER_FILTER,
  RosterFilterPanel,
  rosterFilterToQuery,
  type RosterFilterState,
} from "@/components/admin/employees/RosterFilterPanel";
import {
  getRosterColumnDef,
  loadVisibleColumnKeys,
  resolveRosterCellValue,
  saveVisibleColumnKeys,
} from "@/components/admin/employees/roster-columns";
import {
  EmployeeMasterFormBody,
  EmployeeMasterSheetForm,
} from "@/components/admin/employee-archive/EmployeeMasterSheetForm";
import {
  buildEmployeeCreatePayload,
  buildEmployeeUpdatePayload,
  employeeFormFromEmployee,
  emptyEmployeeForm,
} from "@/components/admin/employee-archive/employee-master-form";
import { FormField, OptionToggle } from "@/components/admin/form-field";
import {
  NoPermissionCard,
  PageHeader,
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  PaginationBar,
} from "@/components/admin/page-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useArchivePermission } from "@/hooks/useArchivePermission";
import { cn } from "@/lib/utils";

type ListLoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: Employee[]; total: number };

type SheetMode =
  | { type: "closed" }
  | { type: "view"; employee: Employee }
  | { type: "new" };

type MasterEditMode = "CURRENT" | "NEW_VERSION";

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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminEmployeesRosterPage() {
  const archivePerm = useArchivePermission();
  const canView = archivePerm.canViewRoster();
  const canEdit = archivePerm.canEditRoster();
  const canViewSensitive = archivePerm.canViewSensitive();
  const [revealSensitive, setRevealSensitive] = useState(false);

  const [rosterFilter, setRosterFilter] = useState<RosterFilterState>(EMPTY_ROSTER_FILTER);
  const debouncedFilter = useDebouncedValue(rosterFilter, 280);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ListLoadState>({ type: "loading" });
  const [orgs, setOrgs] = useState<OrganizationTreeNode[]>([]);
  const [positions, setPositions] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [formOptions, setFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => loadVisibleColumnKeys());
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [detailAsOfDate, setDetailAsOfDate] = useState(todayStr());
  const [masterVersionsRefreshSeq, setMasterVersionsRefreshSeq] = useState(0);
  const [masterEditOpen, setMasterEditOpen] = useState(false);
  const [masterEditEmployee, setMasterEditEmployee] = useState<Employee | null>(null);
  const [masterEditMode, setMasterEditMode] = useState<MasterEditMode>("CURRENT");
  const [masterEffectiveStartDate, setMasterEffectiveStartDate] = useState(todayStr());
  const [form, setForm] = useState(emptyEmployeeForm());
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [archiveLoadError, setArchiveLoadError] = useState<ApiError | null>(null);
  const [archive, setArchive] = useState<EmployeeArchive | null>(null);
  const [movements, setMovements] = useState<EmployeeMovement[]>([]);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const archiveDialogMountRef = useRef<HTMLDivElement>(null);
  const pageSize = 20;

  const flatOrgs = useMemo(() => flattenOrgTree(orgs), [orgs]);
  const departmentFilterOptions = useMemo<SearchableSelectOption[]>(
    () =>
      flatOrgs.map((org) => ({
        value: org.id,
        label: org.name,
        code: org.code,
        keywords: `${org.code} ${org.name}`,
      })),
    [flatOrgs],
  );
  const positionFilterOptions = useMemo<SearchableSelectOption[]>(
    () =>
      positions.map((position) => ({
        value: position.id,
        label: position.name,
        code: position.code,
        keywords: `${position.code} ${position.name}`,
      })),
    [positions],
  );
  const visibleColumns = useMemo(
    () => visibleColumnKeys.map((key) => getRosterColumnDef(key)).filter((col) => col !== undefined),
    [visibleColumnKeys],
  );
  const listQuery = useMemo(
    () => rosterFilterToQuery(debouncedFilter),
    [debouncedFilter],
  );

  const loadRefs = useCallback(async () => {
    const [treeRes, optionsRes, positionsRes] = await Promise.allSettled([
      getOrganizationTree(),
      getEmployeeFormOptions(),
      listAllPositions(),
    ]);

    if (treeRes.status === "fulfilled") {
      setOrgs(treeRes.value.data);
    } else {
      const err = toApiError(treeRes.reason);
      toast.error(
        err.traceId
          ? `部门数据加载失败：${err.message}（traceId: ${err.traceId}）`
          : `部门数据加载失败：${err.message}`,
      );
    }

    if (optionsRes.status === "fulfilled") {
      setFormOptions(optionsRes.value.data);
    } else {
      const err = toApiError(optionsRes.reason);
      toast.error(
        err.traceId
          ? `字典选项加载失败：${err.message}（traceId: ${err.traceId}）`
          : `字典选项加载失败：${err.message}`,
      );
    }

    if (positionsRes.status === "fulfilled") {
      setPositions(positionsRes.value);
    } else {
      const err = toApiError(positionsRes.reason);
      toast.error(
        err.traceId
          ? `岗位数据加载失败：${err.message}（traceId: ${err.traceId}）`
          : `岗位数据加载失败：${err.message}`,
      );
    }
  }, []);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listEmployees({
        page,
        pageSize,
        ...listQuery,
        revealSensitive: revealSensitive && canViewSensitive,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      setState({ type: "error", error: toApiError(e) });
    }
  }, [canView, canViewSensitive, listQuery, page, pageSize, revealSensitive]);

  const loadArchiveOnly = useCallback(async (employeeId: string) => {
    const res = await getEmployeeArchive(employeeId);
    setArchive(res.data);
  }, []);

  const loadDetailTabs = useCallback(
    async (employeeId: string) => {
      setDetailLoading(true);
      setArchiveLoadError(null);
      setArchive(null);
      setMovements([]);
      try {
        const [movementRes, archiveRes] = await Promise.all([
          listEmployeeMovements(employeeId),
          getEmployeeArchive(employeeId),
        ]);
        setMovements(movementRes.data);
        setArchive(archiveRes.data);
      } catch (e: unknown) {
        const err = toApiError(e);
        setArchiveLoadError(err);
        toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (canView) void loadRefs();
  }, [canView, loadRefs]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (revealSensitive && canViewSensitive) void load();
  }, [revealSensitive, canViewSensitive, load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedFilter]);

  const openView = async (employee: Employee) => {
    const today = todayStr();
    setDetailAsOfDate(today);
    setArchive(null);
    setMovements([]);
    setArchiveLoadError(null);
    setSheet({ type: "view", employee });
    void loadDetailTabs(employee.id);
    try {
      const res = await getEmployeeSnapshot(employee.id, {
        asOfDate: today,
        revealSensitive: revealSensitive && canViewSensitive,
      });
      setSheet({ type: "view", employee: res.data });
    } catch {
      // 列表数据兜底展示
    }
  };

  const openNew = () => {
    setForm(emptyEmployeeForm());
    setSheet({ type: "new" });
  };

  const openMasterEdit = async (employee: Employee) => {
    let data = employee;
    try {
      const res = await getEmployee(employee.id, {
        revealSensitive: revealSensitive && canViewSensitive,
      });
      data = res.data;
    } catch {
      // 列表数据兜底
    }
    setForm(employeeFormFromEmployee(data));
    setMasterEditEmployee(data);
    setMasterEditMode("CURRENT");
    setMasterEffectiveStartDate(data.effectiveStartDate ?? todayStr());
    setMasterEditOpen(true);
  };

  const saveNewEmployee = async () => {
    if (!form.fullName.trim()) {
      toast.error("请填写姓名");
      return;
    }
    if (sheet.type === "new" && !form.mobile.trim()) {
      toast.error("请填写手机号");
      return;
    }

    if (sheet.type !== "new") return;

    setSaving(true);
    try {
      const created = await createEmployee(buildEmployeeCreatePayload(form));
      setSheet({ type: "view", employee: created.data });
      void loadDetailTabs(created.data.id);
      toast.success("员工已创建");
      void load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveMasterEdit = async () => {
    if (!masterEditEmployee) return;
    if (!form.fullName.trim()) {
      toast.error("请填写姓名");
      return;
    }
    if (masterEditMode === "NEW_VERSION") {
      if (!masterEffectiveStartDate) {
        toast.error("请选择新版本生效日期");
        return;
      }
      if (masterEffectiveStartDate === (masterEditEmployee.effectiveStartDate ?? "")) {
        toast.error("新版本须使用不同的生效日期");
        return;
      }
    }

    setSaving(true);
    try {
      const updated = await updateEmployee(
        masterEditEmployee.id,
        buildEmployeeUpdatePayload(form, {
          skipMaskedMobile: masterEditEmployee.mobileMasked,
          originalMobile: masterEditEmployee.mobile,
          editMode: masterEditMode,
          effectiveStartDate: masterEditMode === "NEW_VERSION" ? masterEffectiveStartDate : undefined,
        }),
      );
      setMasterEditOpen(false);
      setMasterEditEmployee(null);
      if (sheet.type === "view" && sheet.employee.id === updated.data.id) {
        setSheet({ type: "view", employee: updated.data });
      }
      // 保存成功后立即刷新“个人主档”的版本时间线与快照（无需关闭重开）
      setMasterVersionsRefreshSeq((prev) => prev + 1);
      if (sheet.type === "view" && sheet.employee.id === updated.data.id) {
        const today = todayStr();
        setDetailAsOfDate(today);
        try {
          const res = await getEmployeeSnapshot(sheet.employee.id, { asOfDate: today });
          setSheet({ type: "view", employee: res.data });
        } catch {
          // 失败时保留 updated.data 作为兜底
        }
      }
      toast.success("员工已更新");
      void load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportEmployees({
        ...listQuery,
        columns: visibleColumnKeys.join(","),
      });
      downloadBlob(blob, `employee-roster-${todayStr()}.xlsx`);
      setExportConfirmOpen(false);
      toast.success("导出已开始下载");
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleColumnChange = (keys: string[]) => {
    setVisibleColumnKeys(keys);
    saveVisibleColumnKeys(keys);
  };

  if (!canView) {
    return (
      <NoPermissionCard
        icon={<Shield className="size-8 text-muted-foreground" />}
        title="员工花名册"
        description="需要 employee:roster:view 权限"
      />
    );
  }

  return (
    <ArchiveDialogMountProvider mountRef={archiveDialogMountRef}>
    <div className="space-y-5">
      <PageHeader
        title="员工花名册"
        description="员工主档、档案二级模块与异动记录统一维护"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Can permission="employee:sensitive:view">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRevealSensitive((prev) => !prev);
                  if (!revealSensitive) toast.message("已开启敏感字段明文查看（将写入审计）");
                }}
              >
                {revealSensitive ? <EyeOff /> : <Eye />}
                {revealSensitive ? "隐藏敏感信息" : "查看敏感信息"}
              </Button>
            </Can>
            <Can permission="employee:export">
              <Button variant="outline" size="sm" onClick={() => setExportConfirmOpen(true)}>
                <Download />
                导出
              </Button>
            </Can>
            <Can permission={["employee:roster:create", "employee:edit"]}>
              <Button size="sm" onClick={openNew}>
                <Plus />
                新建员工
              </Button>
            </Can>
          </div>
        }
      />

      <PanelCard
        title="查询条件"
        description="今日生效快照"
        dense
        toolbar={
          <div className="flex items-center gap-1.5">
            <RosterColumnPickerTrigger
              visibleCount={visibleColumnKeys.length}
              onClick={() => setColumnPickerOpen(true)}
            />
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => void load()}>
              <RefreshCw />
              刷新
            </Button>
          </div>
        }
      >
        <RosterFilterPanel
          value={rosterFilter}
          onChange={setRosterFilter}
          departmentOptions={departmentFilterOptions}
          positionOptions={positionFilterOptions}
        />
      </PanelCard>

      <PanelCard title="花名册">
        {state.type === "loading" ? <PanelLoading message="加载花名册…" /> : null}
        {state.type === "error" ? <PanelError error={state.error} onRetry={() => void load()} /> : null}
        {state.type === "ok" && state.items.length === 0 ? (
          <PanelEmpty
            icon={<Inbox className="size-5 text-muted-foreground" />}
            title="暂无员工"
            description="可新建员工或调整筛选条件"
          />
        ) : null}
        {state.type === "ok" && state.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b">
                    {visibleColumns.map((column) => (
                      <th
                        key={column.key}
                        className="px-4 py-3 text-left font-medium"
                        style={column.minWidth ? { minWidth: column.minWidth } : undefined}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((employee) => (
                    <tr
                      key={employee.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                      onClick={() => void openView(employee)}
                    >
                      {visibleColumns.map((column) => {
                        const value = resolveRosterCellValue(employee, column.key);
                        if (column.key === "fullName") {
                          return (
                            <td key={column.key} className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-8">
                                  <AvatarFallback className="text-xs">
                                    {employee.fullName.slice(0, 1)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="font-medium">{employee.fullName}</div>
                              </div>
                            </td>
                          );
                        }
                        if (column.key === "status") {
                          return (
                            <td key={column.key} className="px-4 py-3">
                              <Badge variant="secondary" className={cn(statusBadgeClass(employee.status))}>
                                {employee.statusLabel ?? employeeStatusLabel(employee.status)}
                              </Badge>
                            </td>
                          );
                        }
                        if (column.key === "mobile") {
                          return (
                            <td key={column.key} className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("text-xs", column.mono && "font-mono")}>{value}</span>
                                {employee.mobileMasked ? (
                                  <Badge variant="outline" className="h-4 px-1 text-[10px]">
                                    脱敏
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td
                            key={column.key}
                            className={cn(
                              "px-4 py-3 text-muted-foreground",
                              column.mono && "font-mono text-xs",
                              column.key === "fullName" && "text-foreground",
                            )}
                          >
                            {value}
                          </td>
                        );
                      })}
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
              onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
              onNext={() => setPage((prev) => prev + 1)}
            />
          </>
        ) : null}
      </PanelCard>

      <Sheet
        open={sheet.type !== "closed"}
        onOpenChange={(open) => !open && setSheet({ type: "closed" })}
      >
        <SheetContent
          side="right"
          className={cn(
            "gap-0 p-0",
            (sheet.type === "view" || sheet.type === "new") &&
              "data-[side=right]:max-w-[min(1512px,100vw)]",
          )}
        >
          {sheet.type === "view" ? (
            <EmployeeArchiveDetailView
              employee={sheet.employee}
              asOfDate={detailAsOfDate}
              masterVersionsRefreshSeq={masterVersionsRefreshSeq}
              archive={archive}
              movements={movements}
              archiveLoadState={
                detailLoading ? "loading" : archiveLoadError ? "error" : archive ? "ready" : "loading"
              }
              archiveError={archiveLoadError}
              onArchiveRetry={() => void loadDetailTabs(sheet.employee.id)}
              revealSensitive={revealSensitive}
              canViewSensitive={canViewSensitive}
              onRevealSensitiveChange={async (next) => {
                setRevealSensitive(next);
                if (sheet.type !== "view") return;
                try {
                  const res = await getEmployeeSnapshot(sheet.employee.id, {
                    asOfDate: detailAsOfDate,
                    revealSensitive: next && canViewSensitive,
                  });
                  setSheet({ type: "view", employee: res.data });
                } catch (e: unknown) {
                  const err = toApiError(e);
                  toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
                }
              }}
              canEdit={canEdit}
              canEditSection={(section) => archivePerm.canEditSection(section)}
              orgs={orgs}
              archiveDictOptions={formOptions}
              onClose={() => setSheet({ type: "closed" })}
              onEditMaster={() => void openMasterEdit(sheet.employee)}
              onAsOfDateChange={async (next) => {
                setDetailAsOfDate(next);
                try {
                  const res = await getEmployeeSnapshot(sheet.employee.id, {
                    asOfDate: next,
                    revealSensitive: revealSensitive && canViewSensitive,
                  });
                  setSheet({ type: "view", employee: res.data });
                } catch (e: unknown) {
                  const err = toApiError(e);
                  toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
                }
              }}
              onArchiveChanged={() => void loadArchiveOnly(sheet.employee.id)}
              onAssignmentsChanged={async () => {
                try {
                  const res = await getEmployeeSnapshot(sheet.employee.id, {
                    asOfDate: detailAsOfDate,
                    revealSensitive: revealSensitive && canViewSensitive,
                  });
                  setSheet({ type: "view", employee: res.data });
                } catch {
                  // 刷新主任职摘要失败不阻断
                }
                void load();
              }}
            />
          ) : null}

          {sheet.type === "new" ? (
            <EmployeeMasterSheetForm
              mode="create"
              form={form}
              setForm={setForm}
              saving={saving}
              dictOptions={formOptions}
              onCancel={() => setSheet({ type: "closed" })}
              onSave={() => void saveNewEmployee()}
            />
          ) : null}

        </SheetContent>
      </Sheet>

      <ArchiveFormDialog
        open={masterEditOpen}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setMasterEditOpen(false);
            setMasterEditEmployee(null);
          }
        }}
        title="编辑个人主档"
        description="修改员工核心个人信息；证件、家属等多行信息请在档案分区中维护"
        extraWide
        saving={saving}
        onSave={() => void saveMasterEdit()}
      >
        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/10 p-4">
            <div className="mb-3 text-xs font-semibold tracking-tight text-foreground">版本</div>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="编辑方式" required>
                <OptionToggle
                  value={masterEditMode}
                  onChange={(v) => {
                    const mode = v as MasterEditMode;
                    setMasterEditMode(mode);
                    if (mode === "CURRENT") {
                      setMasterEffectiveStartDate(masterEditEmployee?.effectiveStartDate ?? todayStr());
                    } else {
                      setMasterEffectiveStartDate(todayStr());
                    }
                  }}
                  options={[
                    { id: "CURRENT" as const, label: "修改当前版本" },
                    { id: "NEW_VERSION" as const, label: "新增生效版本" },
                  ]}
                />
              </FormField>
              <FormField
                label="生效日期"
                required
                hint={
                  masterEditMode === "CURRENT"
                    ? "修改当前版本时生效日期不可变更"
                    : "指定新版本的生效开始日，默认今天"
                }
              >
                <Input
                  type="date"
                  value={masterEffectiveStartDate}
                  disabled={masterEditMode === "CURRENT"}
                  onChange={(e) => setMasterEffectiveStartDate(e.target.value)}
                />
              </FormField>
            </div>
          </div>

        <EmployeeMasterFormBody
          mode="edit"
          form={form}
          setForm={setForm}
          employee={masterEditEmployee ?? undefined}
          dictOptions={formOptions}
        />
        </div>
      </ArchiveFormDialog>

      <RosterColumnPicker
        open={columnPickerOpen}
        onOpenChange={setColumnPickerOpen}
        visibleKeys={visibleColumnKeys}
        onChange={handleColumnChange}
      />

      <ConfirmDialog
        open={exportConfirmOpen}
        onOpenChange={setExportConfirmOpen}
        title="确认导出员工花名册"
        description={`将导出当前筛选结果，共 ${visibleColumnKeys.length} 列（与列表显示一致）；字典字段导出名称，任职字段取今日有效主任职快照。`}
        confirmLabel="确认导出"
        loading={exporting}
        onConfirm={() => void handleExport()}
      />
    </div>
    <div ref={archiveDialogMountRef} aria-hidden className="contents" />
    </ArchiveDialogMountProvider>
  );
}
