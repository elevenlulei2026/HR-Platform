import type {
  Employee,
  EmployeeArchive,
  EmployeeFormOptions,
  EmployeeImportResult,
  EmployeeMovement,
  EmployeeStatus,
  OrganizationTreeNode,
} from "@shared/api.interface";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, EyeOff, Inbox, Plus, RefreshCw, Shield, Upload } from "lucide-react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  downloadImportErrorReport,
  getEmployeeArchive,
} from "@/api/employee-archive";
import {
  EMPLOYEE_STATUS_OPTIONS,
  createEmployee,
  downloadEmployeeImportTemplate,
  employeeStatusLabel,
  exportEmployees,
  getEmployee,
  getEmployeeSnapshot,
  getEmployeeFormOptions,
  importEmployees,
  listEmployeeMovements,
  listEmployees,
  statusBadgeClass,
  updateEmployee,
} from "@/api/employee";
import { flattenOrgTree, getOrganizationTree } from "@/api/organization";
import { Can } from "@/components/admin/can";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/admin/searchable-select";
import { ArchiveFormDialog } from "@/components/admin/employee-archive/ArchiveFormDialog";
import { ArchiveDialogMountProvider } from "@/components/admin/employee-archive/archive-dialog-mount";
import { EmployeeArchiveDetailView } from "@/components/admin/employee-archive/EmployeeArchiveDetailView";
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
import { OptionSelect } from "@/components/admin/option-select";
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

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [statusFilter, setStatusFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ListLoadState>({ type: "loading" });
  const [orgs, setOrgs] = useState<OrganizationTreeNode[]>([]);
  const [formOptions, setFormOptions] = useState<EmployeeFormOptions | null>(null);
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
  const [archive, setArchive] = useState<EmployeeArchive | null>(null);
  const [movements, setMovements] = useState<EmployeeMovement[]>([]);
  const [importResult, setImportResult] = useState<EmployeeImportResult | null>(null);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
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

  const loadRefs = useCallback(async () => {
    try {
      const [tree, optionsRes] = await Promise.all([
        getOrganizationTree(),
        canEdit ? getEmployeeFormOptions() : Promise.resolve(null),
      ]);
      setOrgs(tree.data);
      if (optionsRes) {
        setFormOptions(optionsRes.data);
      }
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `部门数据加载失败：${err.message}（traceId: ${err.traceId}）` : `部门数据加载失败：${err.message}`);
    }
  }, [canEdit]);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listEmployees({
        page,
        pageSize,
        keyword: debouncedKeyword || undefined,
        status: (statusFilter || undefined) as EmployeeStatus | undefined,
        organizationId: orgFilter || undefined,
        revealSensitive: revealSensitive && canViewSensitive,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      setState({ type: "error", error: toApiError(e) });
    }
  }, [canView, canViewSensitive, debouncedKeyword, orgFilter, page, pageSize, revealSensitive, statusFilter]);

  const loadArchiveOnly = useCallback(async (employeeId: string) => {
    const res = await getEmployeeArchive(employeeId);
    setArchive(res.data);
  }, []);

  const loadDetailTabs = useCallback(
    async (employeeId: string) => {
      setDetailLoading(true);
      try {
        const [movementRes, archiveRes] = await Promise.all([
          listEmployeeMovements(employeeId),
          getEmployeeArchive(employeeId),
        ]);
        setMovements(movementRes.data);
        setArchive(archiveRes.data);
      } catch (e: unknown) {
        const err = toApiError(e);
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
  }, [debouncedKeyword, statusFilter, orgFilter]);

  const openView = async (employee: Employee) => {
    // 永远默认选中“当前有效”（今天）版本
    const today = todayStr();
    setDetailAsOfDate(today);
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

  const handleImport = async (file: File) => {
    try {
      const res = await importEmployees(file);
      setImportResult(res.data);
      if (res.data.failureCount > 0) {
        toast.error(`导入完成：成功 ${res.data.successCount} 条，失败 ${res.data.failureCount} 条`);
      } else {
        toast.success(`导入成功 ${res.data.successCount} 条`);
      }
      void load();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportEmployees({
        keyword: debouncedKeyword || undefined,
        status: (statusFilter || undefined) as EmployeeStatus | undefined,
        organizationId: orgFilter || undefined,
      });
      downloadBlob(blob, "employee-roster.xlsx");
      setExportConfirmOpen(false);
      toast.success("导出已开始下载");
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleTemplate = async () => {
    try {
      const blob = await downloadEmployeeImportTemplate();
      downloadBlob(blob, "employee-import-template.xlsx");
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  };

  const handleDownloadImportErrors = async () => {
    if (!importResult || importResult.failureCount === 0) return;
    try {
      const blob = await downloadImportErrorReport({ errors: importResult.errors });
      downloadBlob(blob, "employee-import-errors.xlsx");
      toast.success("失败明细已下载");
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
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
            <Can permission={["employee:roster:import", "employee:edit"]}>
              <>
                <Button variant="outline" size="sm" onClick={() => void handleTemplate()}>
                  <Download />
                  模板
                </Button>
                <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
                  <Upload />
                  导入
                </Button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImport(file);
                    event.target.value = "";
                  }}
                />
              </>
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

      {importResult && importResult.failureCount > 0 ? (
        <PanelCard title="导入异常明细">
          <div className="space-y-3 p-4">
            <div className="text-sm text-muted-foreground">
              本次导入成功 {importResult.successCount} 条，失败 {importResult.failureCount} 条。
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border bg-muted/20 p-3 text-sm">
              {importResult.errors.map((error, index) => (
                <div key={`${error.rowNumber}-${index}`}>
                  第 {error.rowNumber} 行{error.field ? `（${error.field}）` : ""}：{error.message}
                </div>
              ))}
            </div>
            <div>
              <Button size="sm" variant="outline" onClick={() => void handleDownloadImportErrors()}>
                <Download />
                下载错误报告
              </Button>
            </div>
          </div>
        </PanelCard>
      ) : null}

      <PanelCard
        title="筛选"
        toolbar={
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw />
            刷新
          </Button>
        }
      >
        <div className="flex flex-wrap items-end gap-3 p-4">
          <SearchInput placeholder="姓名 / 工号 / 邮箱" value={keyword} onChange={setKeyword} />
          <FormField label="状态">
            <OptionSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              allowEmpty
              emptyLabel="全部"
              options={EMPLOYEE_STATUS_OPTIONS.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
              className="w-[140px]"
            />
          </FormField>
          <FormField label="部门">
            <SearchableSelect
              value={orgFilter}
              onChange={setOrgFilter}
              options={departmentFilterOptions}
              placeholder="全部部门"
              searchPlaceholder="搜索部门编码 / 名称…"
              allowEmpty
              emptyLabel="全部部门"
              className="w-[260px]"
            />
          </FormField>
        </div>
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
                    <th className="px-4 py-3 text-left font-medium">员工</th>
                    <th className="px-4 py-3 text-left font-medium">工号</th>
                    <th className="px-4 py-3 text-left font-medium">部门 / 岗位</th>
                    <th className="px-4 py-3 text-left font-medium">状态</th>
                    <th className="px-4 py-3 text-left font-medium">入职日</th>
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((employee) => (
                    <tr
                      key={employee.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                      onClick={() => void openView(employee)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-xs">
                              {employee.fullName.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{employee.fullName}</div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-mono">{employee.mobile}</span>
                              {employee.mobileMasked ? (
                                <Badge variant="outline" className="h-4 px-1 text-[10px]">
                                  脱敏
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{employee.employeeNo}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{employee.primaryOrganizationName ?? "—"}</div>
                        <div className="text-xs">{employee.primaryPositionName ?? ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn(statusBadgeClass(employee.status))}>
                          {employee.statusLabel ?? employeeStatusLabel(employee.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{employee.hireDate}</td>
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
              detailLoading={detailLoading}
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
                    setMasterEditMode(v as MasterEditMode);
                    if (v === "CURRENT") {
                      setMasterEffectiveStartDate(masterEditEmployee?.effectiveStartDate ?? todayStr());
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
                hint={masterEditMode === "CURRENT" ? "修改当前版本时生效日期不可变更" : undefined}
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

      <ConfirmDialog
        open={exportConfirmOpen}
        onOpenChange={setExportConfirmOpen}
        title="确认导出员工花名册"
        description="导出将基于当前筛选条件生成文件，是否继续？"
        confirmLabel="确认导出"
        loading={exporting}
        onConfirm={() => void handleExport()}
      />
    </div>
    <div ref={archiveDialogMountRef} aria-hidden className="contents" />
    </ArchiveDialogMountProvider>
  );
}
