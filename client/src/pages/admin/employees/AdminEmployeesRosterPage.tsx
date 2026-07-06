import type {
  Employee,
  EmployeeArchive,
  EmployeeAssignment,
  EmployeeImportResult,
  EmployeeMovement,
  EmployeeStatus,
  OrganizationTreeNode,
} from "@shared/api.interface";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Inbox, Plus, RefreshCw, Shield, Upload } from "lucide-react";
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
  importEmployees,
  listEmployeeAssignments,
  listEmployeeMovements,
  listEmployees,
  statusBadgeClass,
  updateEmployee,
} from "@/api/employee";
import { flattenOrgTree, getOrganizationTree } from "@/api/organization";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/admin/searchable-select";
import { EmployeeArchiveDetailView } from "@/components/admin/employee-archive/EmployeeArchiveDetailView";
import { EmployeeMasterSheetForm } from "@/components/admin/employee-archive/EmployeeMasterSheetForm";
import type { EmployeeForm } from "@/components/admin/employee-archive/employee-master-form";
import { FormField } from "@/components/admin/form-field";
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
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";

type ListLoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: Employee[]; total: number };

type SheetMode =
  | { type: "closed" }
  | { type: "view"; employee: Employee; panel: "detail" | "edit-master" }
  | { type: "new" };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): EmployeeForm {
  return {
    fullName: "",
    gender: "MALE",
    mobile: "",
    mobileMasked: false,
    companyEmail: "",
    personalEmail: "",
    adAccount: "",
    maritalStatus: "",
    politicalAffiliation: "",
    highestEducation: "",
    highestEducationGradDate: "",
    fertilityStatus: "",
    ethnicity: "",
    hobbies: "",
    nationality: "",
    householdType: "",
    wechat: "",
    officePhone: "",
    officeExtension: "",
    homePhone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    householdLocation: "",
    idCardAddress: "",
    residenceAddress: "",
    recruitmentChannel: "",
    recruitmentChannelDetail: "",
    workStartDate: "",
    groupSeniorityStartDate: "",
    hireDate: todayStr(),
    status: "ACTIVE",
    partyOrgTransferred: "",
  };
}

function formFromEmployee(employee: Employee): EmployeeForm {
  return {
    fullName: employee.fullName,
    gender: employee.gender ?? "MALE",
    mobile: employee.mobile ?? "",
    mobileMasked: employee.mobileMasked,
    companyEmail: employee.companyEmail ?? "",
    personalEmail: employee.personalEmail ?? "",
    adAccount: employee.adAccount ?? "",
    maritalStatus: employee.maritalStatus ?? "",
    politicalAffiliation: employee.politicalAffiliation ?? "",
    highestEducation: employee.highestEducation ?? "",
    highestEducationGradDate: employee.highestEducationGradDate ?? "",
    fertilityStatus: employee.fertilityStatus ?? "",
    ethnicity: employee.ethnicity ?? "",
    hobbies: employee.hobbies ?? "",
    nationality: employee.nationality ?? "",
    householdType: employee.householdType ?? "",
    wechat: employee.wechat ?? "",
    officePhone: employee.officePhone ?? "",
    officeExtension: employee.officeExtension ?? "",
    homePhone: employee.homePhone ?? "",
    emergencyContactName: employee.emergencyContactName ?? "",
    emergencyContactPhone: employee.emergencyContactPhone ?? "",
    emergencyContactRelation: employee.emergencyContactRelation ?? "",
    householdLocation: employee.householdLocation ?? "",
    idCardAddress: employee.idCardAddress ?? "",
    residenceAddress: employee.residenceAddress ?? "",
    recruitmentChannel: employee.recruitmentChannel ?? "",
    recruitmentChannelDetail: employee.recruitmentChannelDetail ?? "",
    workStartDate: employee.workStartDate ?? "",
    groupSeniorityStartDate: employee.groupSeniorityStartDate ?? "",
    hireDate: employee.hireDate,
    status: employee.status,
    partyOrgTransferred:
      employee.partyOrgTransferred === undefined
        ? ""
        : employee.partyOrgTransferred
          ? "true"
          : "false",
  };
}

function buildEmployeeUpdatePayload(
  form: EmployeeForm,
  options?: { skipMaskedMobile?: boolean; originalMobile?: string },
) {
  const payload = {
    fullName: form.fullName.trim(),
    gender: form.gender,
    companyEmail: form.companyEmail || undefined,
    personalEmail: form.personalEmail || undefined,
    adAccount: form.adAccount || undefined,
    maritalStatus: form.maritalStatus || undefined,
    politicalAffiliation: form.politicalAffiliation || undefined,
    highestEducation: form.highestEducation || undefined,
    highestEducationGradDate: form.highestEducationGradDate || undefined,
    fertilityStatus: form.fertilityStatus || undefined,
    ethnicity: form.ethnicity || undefined,
    hobbies: form.hobbies || undefined,
    nationality: form.nationality || undefined,
    householdType: form.householdType || undefined,
    householdLocation: form.householdLocation || undefined,
    partyOrgTransferred:
      form.partyOrgTransferred === ""
        ? undefined
        : form.partyOrgTransferred === "true",
    workStartDate: form.workStartDate || undefined,
    wechat: form.wechat || undefined,
    officePhone: form.officePhone || undefined,
    officeExtension: form.officeExtension || undefined,
    homePhone: form.homePhone || undefined,
    idCardAddress: form.idCardAddress || undefined,
    residenceAddress: form.residenceAddress || undefined,
    emergencyContactName: form.emergencyContactName || undefined,
    emergencyContactPhone: form.emergencyContactPhone || undefined,
    emergencyContactRelation: form.emergencyContactRelation || undefined,
    recruitmentChannel: form.recruitmentChannel || undefined,
    recruitmentChannelDetail: form.recruitmentChannelDetail || undefined,
    groupSeniorityStartDate: form.groupSeniorityStartDate || undefined,
    hireDate: form.hireDate,
    status: form.status,
  };

  const mobile = form.mobile.trim();
  const unchangedMaskedMobile =
    options?.skipMaskedMobile && mobile === (options.originalMobile ?? "");
  if (mobile && !unchangedMaskedMobile) {
    return { ...payload, mobile };
  }
  return payload;
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminEmployeesRosterPage() {
  const perm = usePermission();
  const canView = perm.has("employee:roster:view");
  const canEdit = perm.has("employee:edit");
  const canExport = perm.has("employee:export");

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [statusFilter, setStatusFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ListLoadState>({ type: "loading" });
  const [orgs, setOrgs] = useState<OrganizationTreeNode[]>([]);
  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [form, setForm] = useState<EmployeeForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [archive, setArchive] = useState<EmployeeArchive | null>(null);
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [movements, setMovements] = useState<EmployeeMovement[]>([]);
  const [importResult, setImportResult] = useState<EmployeeImportResult | null>(null);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
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
      const tree = await getOrganizationTree();
      setOrgs(tree.data);
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `部门数据加载失败：${err.message}（traceId: ${err.traceId}）` : `部门数据加载失败：${err.message}`);
    }
  }, []);

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
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      setState({ type: "error", error: toApiError(e) });
    }
  }, [canView, debouncedKeyword, orgFilter, page, pageSize, statusFilter]);

  const loadArchiveOnly = useCallback(async (employeeId: string) => {
    const res = await getEmployeeArchive(employeeId);
    setArchive(res.data);
  }, []);

  const reloadAssignments = useCallback(async (employeeId: string) => {
    const assignmentRes = await listEmployeeAssignments(employeeId);
    setAssignments(assignmentRes.data);
  }, []);

  const loadDetailTabs = useCallback(
    async (employeeId: string) => {
      setDetailLoading(true);
      try {
        const [assignmentRes, movementRes, archiveRes] = await Promise.all([
          listEmployeeAssignments(employeeId),
          listEmployeeMovements(employeeId),
          getEmployeeArchive(employeeId),
        ]);
        setAssignments(assignmentRes.data);
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
    setPage(1);
  }, [debouncedKeyword, statusFilter, orgFilter]);

  const openView = async (employee: Employee) => {
    setSheet({ type: "view", employee, panel: "detail" });
    void loadDetailTabs(employee.id);
    try {
      const res = await getEmployee(employee.id);
      setSheet({ type: "view", employee: res.data, panel: "detail" });
    } catch {
      // 列表数据兜底展示
    }
  };

  const openNew = () => {
    setForm(emptyForm());
    setSheet({ type: "new" });
  };

  const openMasterEdit = async (employee: Employee) => {
    let data = employee;
    try {
      const res = await getEmployee(employee.id);
      data = res.data;
    } catch {
      // 列表数据兜底
    }
    setForm(formFromEmployee(data));
    setSheet({ type: "view", employee: data, panel: "edit-master" });
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
      const created = await createEmployee({
        fullName: form.fullName.trim(),
        gender: form.gender,
        mobile: form.mobile.trim(),
        companyEmail: form.companyEmail || undefined,
        personalEmail: form.personalEmail || undefined,
        adAccount: form.adAccount || undefined,
        maritalStatus: form.maritalStatus || undefined,
        wechat: form.wechat || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        householdLocation: form.householdLocation || undefined,
        workStartDate: form.workStartDate || undefined,
        hireDate: form.hireDate,
        status: form.status,
      });
      setSheet({ type: "view", employee: created.data, panel: "detail" });
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
    if (sheet.type !== "view" || sheet.panel !== "edit-master") return;
    if (!form.fullName.trim()) {
      toast.error("请填写姓名");
      return;
    }

    const employee = sheet.employee;
    setSaving(true);
    try {
      const updated = await updateEmployee(
        employee.id,
        buildEmployeeUpdatePayload(form, {
          skipMaskedMobile: employee.mobileMasked,
          originalMobile: employee.mobile,
        }),
      );
      setSheet({ type: "view", employee: updated.data, panel: "detail" });
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
    <div className="space-y-5">
      <PageHeader
        title="员工花名册"
        description="员工主档、档案二级模块与异动记录统一维护"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? (
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
            ) : null}
            {canExport ? (
              <Button variant="outline" size="sm" onClick={() => setExportConfirmOpen(true)}>
                <Download />
                导出
              </Button>
            ) : null}
            {canEdit ? (
              <Button size="sm" onClick={openNew}>
                <Plus />
                新建员工
              </Button>
            ) : null}
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
              "data-[side=right]:max-w-[min(1260px,100vw)]",
          )}
        >
          {sheet.type === "view" && sheet.panel === "detail" ? (
            <EmployeeArchiveDetailView
              employee={sheet.employee}
              archive={archive}
              assignments={assignments}
              movements={movements}
              detailLoading={detailLoading}
              canEdit={canEdit}
              orgs={orgs}
              onClose={() => setSheet({ type: "closed" })}
              onEditMaster={() => void openMasterEdit(sheet.employee)}
              onArchiveChanged={() => void loadArchiveOnly(sheet.employee.id)}
              onAssignmentsChanged={async () => {
                await reloadAssignments(sheet.employee.id);
                void load();
              }}
            />
          ) : null}

          {sheet.type === "view" && sheet.panel === "edit-master" ? (
            <EmployeeMasterSheetForm
              mode="edit"
              form={form}
              setForm={setForm}
              saving={saving}
              employee={sheet.employee}
              onCancel={() =>
                setSheet({ type: "view", employee: sheet.employee, panel: "detail" })
              }
              onSave={() => void saveMasterEdit()}
            />
          ) : null}

          {sheet.type === "new" ? (
            <EmployeeMasterSheetForm
              mode="create"
              form={form}
              setForm={setForm}
              saving={saving}
              onCancel={() => setSheet({ type: "closed" })}
              onSave={() => void saveNewEmployee()}
            />
          ) : null}

        </SheetContent>
      </Sheet>

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
  );
}
