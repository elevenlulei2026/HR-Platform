import type {
  Employee,
  EmployeeArchive,
  EmployeeAssignment,
  EmployeeImportResult,
  EmployeeMovement,
  EmployeeStatus,
  OrganizationTreeNode,
  Position,
} from "@shared/api.interface";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Inbox, Plus, RefreshCw, Shield, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  downloadImportErrorReport,
  getEmployeeArchive,
} from "@/api/employee-archive";
import {
  EMPLOYEE_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
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
import { flattenOrgTree, getOrganizationTree, listPositions } from "@/api/organization";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ArchiveAttachmentSection } from "@/components/admin/employee-archive/ArchiveAttachmentSection";
import { ArchiveMultiSection } from "@/components/admin/employee-archive/ArchiveMultiSection";
import {
  BACKGROUND_EDUCATION_FIELDS,
  BACKGROUND_PENALTY_FIELDS,
  BACKGROUND_QUALIFICATION_FIELDS,
  BACKGROUND_REWARD_FIELDS,
  BACKGROUND_WORK_EXP_FIELDS,
  BOOLEAN_OPTIONS,
  PERSONAL_FAMILY_FIELDS,
  PERSONAL_ID_DOCUMENT_FIELDS,
  PERSONAL_INTERNAL_RELATIVE_FIELDS,
  SERVICE_ATTENDANCE_FIELDS,
  SERVICE_BANK_FIELDS,
  SERVICE_BENEFIT_FIELDS,
  SERVICE_COMMUTE_FIELDS,
  SERVICE_SOCIAL_FIELDS,
  TALENT_AGENT_FIELDS,
  TALENT_PERFORMANCE_FIELDS,
  TALENT_PROJECT_FIELDS,
  TALENT_REVIEW_FIELDS,
  TALENT_TRAINING_FIELDS,
  TALENT_VALUES_FIELDS,
  WORK_AGREEMENT_FIELDS,
  WORK_CONTRACT_FIELDS,
  WORK_COST_CENTER_FIELDS,
} from "@/components/admin/employee-archive/archive-field-defs";
import { AssignmentSection } from "@/components/admin/employee-archive/AssignmentSection";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";

type ListLoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: Employee[]; total: number };

type SheetMode =
  | { type: "closed" }
  | { type: "view"; employee: Employee }
  | { type: "new" }
  | { type: "edit"; employee: Employee };

type EmployeeForm = {
  fullName: string;
  gender: string;
  mobile: string;
  mobileMasked: boolean;
  companyEmail: string;
  personalEmail: string;
  adAccount: string;
  maritalStatus: string;
  politicalAffiliation: string;
  highestEducation: string;
  highestEducationGradDate: string;
  fertilityStatus: string;
  ethnicity: string;
  hobbies: string;
  nationality: string;
  householdType: string;
  wechat: string;
  officePhone: string;
  officeExtension: string;
  homePhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  householdLocation: string;
  idCardAddress: string;
  residenceAddress: string;
  recruitmentChannel: string;
  recruitmentChannelDetail: string;
  workStartDate: string;
  groupSeniorityStartDate: string;
  hireDate: string;
  status: EmployeeStatus;
  partyOrgTransferred: string;
};

type NewEmployeeAssignmentDraft = {
  organizationId: string;
  positionId: string;
  employmentType: string;
};

type DetailTab = "personal" | "work" | "service" | "background" | "talent" | "movements";

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

function emptyNewEmployeeAssignment(): NewEmployeeAssignmentDraft {
  return {
    organizationId: "",
    positionId: "",
    employmentType: "FULL_TIME",
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

function InfoRow({
  label,
  value,
  masked,
  mono,
}: {
  label: string;
  value?: string | null;
  masked?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-transparent bg-muted/20 px-3 py-2.5 transition-colors hover:border-border/60 hover:bg-muted/35">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 text-sm font-medium", mono && "font-mono text-[13px]")}>
        {value || "—"}
        {masked ? (
          <Badge variant="outline" className="ml-2 h-4 px-1 text-[10px] font-normal">
            <Shield className="mr-0.5 size-2.5" />
            脱敏
          </Badge>
        ) : null}
      </div>
    </div>
  );
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
  const [positions, setPositions] = useState<Position[]>([]);
  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [detailTab, setDetailTab] = useState<DetailTab>("personal");
  const [form, setForm] = useState<EmployeeForm>(emptyForm());
  const [newEmployeeAssignment, setNewEmployeeAssignment] = useState<NewEmployeeAssignmentDraft>(
    emptyNewEmployeeAssignment,
  );
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

  const loadRefs = useCallback(async () => {
    const [tree, pos] = await Promise.all([
      getOrganizationTree(),
      listPositions({ page: 1, pageSize: 500 }),
    ]);
    setOrgs(tree.data);
    setPositions(pos.data.items);
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
    setSheet({ type: "view", employee });
    setDetailTab("personal");
    void loadDetailTabs(employee.id);
    try {
      const res = await getEmployee(employee.id);
      setSheet({ type: "view", employee: res.data });
    } catch {
      // 列表数据兜底展示
    }
  };

  const openNew = () => {
    const nextForm = emptyForm();
    const nextAssignment = emptyNewEmployeeAssignment();
    if (flatOrgs[0]) nextAssignment.organizationId = flatOrgs[0].id;
    if (positions[0]) nextAssignment.positionId = positions[0].id;
    setForm(nextForm);
    setNewEmployeeAssignment(nextAssignment);
    setSheet({ type: "new" });
  };

  const openEdit = async (employee: Employee) => {
    try {
      const res = await getEmployee(employee.id);
      setForm(formFromEmployee(res.data));
      setSheet({ type: "edit", employee: res.data });
    } catch {
      setForm(formFromEmployee(employee));
      setSheet({ type: "edit", employee });
    }
  };

  const save = async () => {
    if (!form.fullName.trim()) {
      toast.error("请填写姓名");
      return;
    }
    if (sheet.type === "new" && !form.mobile.trim()) {
      toast.error("请填写手机号");
      return;
    }

    setSaving(true);
    try {
      if (sheet.type === "new") {
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
          organizationId: newEmployeeAssignment.organizationId || undefined,
          positionId: newEmployeeAssignment.positionId || undefined,
          employmentType: newEmployeeAssignment.employmentType || undefined,
          assignmentEffectiveStartDate: form.hireDate,
        });
        setSheet({ type: "view", employee: created.data });
        void loadDetailTabs(created.data.id);
        toast.success("员工已创建");
      } else if (sheet.type === "edit") {
        const updated = await updateEmployee(
          sheet.employee.id,
          buildEmployeeUpdatePayload(form, {
            skipMaskedMobile: sheet.employee.mobileMasked,
            originalMobile: sheet.employee.mobile,
          }),
        );
        setSheet({ type: "view", employee: updated.data });
        void loadDetailTabs(updated.data.id);
        toast.success("员工已更新");
      }
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
            <OptionSelect
              value={orgFilter}
              onValueChange={setOrgFilter}
              allowEmpty
              emptyLabel="全部"
              options={flatOrgs.map((org) => ({ value: org.id, label: `${org.code} ${org.name}` }))}
              className="w-[220px]"
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

      <Sheet open={sheet.type !== "closed"} onOpenChange={(open) => !open && setSheet({ type: "closed" })}>
        <SheetContent side="right" className="gap-0 p-0">
          {sheet.type === "view" ? (
            <>
              <SheetHeader className="border-b px-6 py-4 text-left">
                <div className="flex items-start gap-3">
                  <Avatar className="size-12">
                    <AvatarFallback>
                      <UserRound className="size-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <SheetTitle>{sheet.employee.fullName}</SheetTitle>
                    <SheetDescription className="font-mono">
                      {sheet.employee.employeeNo}
                      {sheet.employee.primaryOrganizationName ? ` · ${sheet.employee.primaryOrganizationName}` : ""}
                    </SheetDescription>
                    <Badge variant="secondary" className={cn("mt-2", statusBadgeClass(sheet.employee.status))}>
                      {sheet.employee.statusLabel ?? employeeStatusLabel(sheet.employee.status)}
                    </Badge>
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as DetailTab)} className="flex min-h-0 flex-1 flex-col">
                <TabsList className="mx-6 mt-3 grid grid-cols-6">
                  <TabsTrigger value="personal">个人</TabsTrigger>
                  <TabsTrigger value="work">工作</TabsTrigger>
                  <TabsTrigger value="service">服务</TabsTrigger>
                  <TabsTrigger value="background">背景</TabsTrigger>
                  <TabsTrigger value="talent">人才</TabsTrigger>
                  <TabsTrigger value="movements">异动</TabsTrigger>
                </TabsList>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                  {detailLoading ? (
                    <PanelLoading message="加载员工档案…" />
                  ) : (
                    <>
                      <TabsContent value="personal" className="mt-0 space-y-4">
                        <PanelCard title="个人主档信息">
                          <div className="space-y-5 p-4">
                            <div>
                              <p className="mb-2 text-xs font-semibold text-primary">基础信息</p>
                              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                                <InfoRow label="姓名" value={sheet.employee.fullName} />
                                <InfoRow label="工号" value={sheet.employee.employeeNo} mono />
                                <InfoRow label="AD 账号" value={sheet.employee.adAccount} mono />
                                <InfoRow label="性别" value={sheet.employee.genderLabel ?? sheet.employee.gender} />
                                <InfoRow label="婚姻状况" value={sheet.employee.maritalStatus} />
                                <InfoRow label="政治面貌" value={sheet.employee.politicalAffiliation} />
                                <InfoRow label="最高学历" value={sheet.employee.highestEducation} />
                                <InfoRow label="最高学历毕业时间" value={sheet.employee.highestEducationGradDate} />
                                <InfoRow label="生育状况" value={sheet.employee.fertilityStatus} />
                                <InfoRow label="民族" value={sheet.employee.ethnicity} />
                                <InfoRow label="国籍" value={sheet.employee.nationality} />
                                <InfoRow label="户口类别" value={sheet.employee.householdType} />
                                <InfoRow label="户口所在地" value={sheet.employee.householdLocation} />
                                <InfoRow label="兴趣爱好" value={sheet.employee.hobbies} />
                                <InfoRow
                                  label="党组织关系转入"
                                  value={
                                    sheet.employee.partyOrgTransferred === undefined
                                      ? undefined
                                      : sheet.employee.partyOrgTransferred
                                        ? "是"
                                        : "否"
                                  }
                                />
                                <InfoRow label="参加工作日期" value={sheet.employee.workStartDate} />
                                <InfoRow label="入职日期" value={sheet.employee.hireDate} />
                              </div>
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-semibold text-primary">联系方式</p>
                              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                                <InfoRow
                                  label="手机号"
                                  value={sheet.employee.mobile}
                                  masked={sheet.employee.mobileMasked}
                                />
                                <InfoRow label="公司邮箱" value={sheet.employee.companyEmail} />
                                <InfoRow label="个人邮箱" value={sheet.employee.personalEmail} />
                                <InfoRow label="微信" value={sheet.employee.wechat} />
                                <InfoRow label="座机" value={sheet.employee.officePhone} />
                                <InfoRow label="分机" value={sheet.employee.officeExtension} />
                                <InfoRow label="家庭电话" value={sheet.employee.homePhone} />
                              </div>
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-semibold text-primary">地址与紧急联系人</p>
                              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                                <InfoRow label="身份证地址" value={sheet.employee.idCardAddress} />
                                <InfoRow label="居住地地址" value={sheet.employee.residenceAddress} />
                                <InfoRow label="紧急联系人" value={sheet.employee.emergencyContactName} />
                                <InfoRow label="紧急联系人电话" value={sheet.employee.emergencyContactPhone} />
                                <InfoRow label="与员工关系" value={sheet.employee.emergencyContactRelation} />
                              </div>
                            </div>
                          </div>
                        </PanelCard>
                        {archive ? (
                          <>
                            <ArchiveMultiSection
                              title="证件信息"
                              employeeId={sheet.employee.id}
                              resourcePath="id-documents"
                              items={archive.idDocuments}
                              fieldDefs={PERSONAL_ID_DOCUMENT_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="家庭成员"
                              employeeId={sheet.employee.id}
                              resourcePath="family-members"
                              items={archive.familyMembers}
                              fieldDefs={PERSONAL_FAMILY_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="内部亲属"
                              employeeId={sheet.employee.id}
                              resourcePath="internal-relatives"
                              items={archive.internalRelatives}
                              fieldDefs={PERSONAL_INTERNAL_RELATIVE_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                          </>
                        ) : null}
                      </TabsContent>

                      <TabsContent value="work" className="mt-0 space-y-4">
                        <AssignmentSection
                          employeeId={sheet.employee.id}
                          assignments={assignments}
                          orgs={orgs}
                          positions={positions}
                          canEdit={canEdit}
                          onChanged={async () => {
                            await reloadAssignments(sheet.employee.id);
                            void load();
                          }}
                        />
                        {archive ? (
                          <>
                            <ArchiveMultiSection
                              title="成本中心分摊"
                              employeeId={sheet.employee.id}
                              resourcePath="cost-center-allocations"
                              items={archive.costCenterAllocations}
                              fieldDefs={WORK_COST_CENTER_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="合同信息"
                              employeeId={sheet.employee.id}
                              resourcePath="contracts"
                              items={archive.contracts}
                              fieldDefs={WORK_CONTRACT_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="协议信息"
                              employeeId={sheet.employee.id}
                              resourcePath="agreements"
                              items={archive.agreements}
                              fieldDefs={WORK_AGREEMENT_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                          </>
                        ) : null}
                      </TabsContent>

                      <TabsContent value="service" className="mt-0 space-y-4">
                        {archive ? (
                          <>
                            <ArchiveMultiSection
                              title="考勤卡"
                              employeeId={sheet.employee.id}
                              resourcePath="attendance-cards"
                              items={archive.attendanceCards}
                              fieldDefs={SERVICE_ATTENDANCE_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="银行卡"
                              employeeId={sheet.employee.id}
                              resourcePath="bank-accounts"
                              items={archive.bankAccounts}
                              fieldDefs={SERVICE_BANK_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="社保公积金"
                              employeeId={sheet.employee.id}
                              resourcePath="social-insurances"
                              items={archive.socialInsurances}
                              fieldDefs={SERVICE_SOCIAL_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="特殊福利"
                              employeeId={sheet.employee.id}
                              resourcePath="special-benefits"
                              items={archive.specialBenefits}
                              fieldDefs={SERVICE_BENEFIT_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="通勤与住宿"
                              employeeId={sheet.employee.id}
                              resourcePath="commute-accommodations"
                              items={archive.commuteAccommodations}
                              fieldDefs={SERVICE_COMMUTE_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveAttachmentSection
                              employeeId={sheet.employee.id}
                              items={archive.attachments}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                          </>
                        ) : null}
                      </TabsContent>

                      <TabsContent value="background" className="mt-0 space-y-4">
                        {archive ? (
                          <>
                            <ArchiveMultiSection
                              title="教育经历"
                              employeeId={sheet.employee.id}
                              resourcePath="educations"
                              items={archive.educations}
                              fieldDefs={BACKGROUND_EDUCATION_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="工作经历"
                              employeeId={sheet.employee.id}
                              resourcePath="work-experiences"
                              items={archive.workExperiences}
                              fieldDefs={BACKGROUND_WORK_EXP_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="资格证书"
                              employeeId={sheet.employee.id}
                              resourcePath="qualifications"
                              items={archive.qualifications}
                              fieldDefs={BACKGROUND_QUALIFICATION_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <div className="space-y-4">
                              <div className="text-sm font-medium text-muted-foreground">奖惩记录</div>
                              <ArchiveMultiSection
                                title="奖励记录"
                                employeeId={sheet.employee.id}
                                resourcePath="rewards"
                                items={archive.rewards}
                                fieldDefs={BACKGROUND_REWARD_FIELDS}
                                canEdit={canEdit}
                                onChanged={() => loadArchiveOnly(sheet.employee.id)}
                              />
                              <ArchiveMultiSection
                                title="惩处记录"
                                employeeId={sheet.employee.id}
                                resourcePath="penalties"
                                items={archive.penalties}
                                fieldDefs={BACKGROUND_PENALTY_FIELDS}
                                canEdit={canEdit}
                                onChanged={() => loadArchiveOnly(sheet.employee.id)}
                              />
                            </div>
                          </>
                        ) : null}
                      </TabsContent>

                      <TabsContent value="talent" className="mt-0 space-y-4">
                        <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          档案记录，非业务模块：仅维护人才发展历史信息，不代表启用独立绩效/培训/盘点系统。
                        </div>
                        {archive ? (
                          <>
                            <ArchiveMultiSection
                              title="培训记录"
                              employeeId={sheet.employee.id}
                              resourcePath="training-records"
                              items={archive.trainingRecords}
                              fieldDefs={TALENT_TRAINING_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="绩效记录"
                              employeeId={sheet.employee.id}
                              resourcePath="performance-records"
                              items={archive.performanceRecords}
                              fieldDefs={TALENT_PERFORMANCE_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="价值观评估"
                              employeeId={sheet.employee.id}
                              resourcePath="values-assessments"
                              items={archive.valuesAssessments}
                              fieldDefs={TALENT_VALUES_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="人才盘点"
                              employeeId={sheet.employee.id}
                              resourcePath="talent-reviews"
                              items={archive.talentReviews}
                              fieldDefs={TALENT_REVIEW_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="项目信息"
                              employeeId={sheet.employee.id}
                              resourcePath="projects"
                              items={archive.projects}
                              fieldDefs={TALENT_PROJECT_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                            <ArchiveMultiSection
                              title="智能体归属"
                              employeeId={sheet.employee.id}
                              resourcePath="agent-assignments"
                              items={archive.agentAssignments}
                              fieldDefs={TALENT_AGENT_FIELDS}
                              canEdit={canEdit}
                              onChanged={() => loadArchiveOnly(sheet.employee.id)}
                            />
                          </>
                        ) : null}
                      </TabsContent>

                      <TabsContent value="movements" className="mt-0">
                        {movements.length === 0 ? (
                          <PanelEmpty
                            icon={<Shield className="size-5 text-muted-foreground" />}
                            title="暂无异动记录"
                            description="入转调离流程完成后将自动写入异动轨迹"
                          />
                        ) : (
                          <div className="relative space-y-0 border-l-2 border-muted pl-4">
                            {movements.map((movement) => (
                              <div key={movement.id} className="relative pb-6 last:pb-0">
                                <div className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
                                <div className="text-sm font-medium">
                                  {movement.movementTypeName}
                                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                                    {movement.movementType}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {movement.effectiveDate}
                                  {movement.reasonDescription ? ` · ${movement.reasonDescription}` : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </>
                  )}
                </div>
              </Tabs>

              <SheetFooter className="border-t px-6 py-4">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setSheet({ type: "closed" })}>
                    关闭
                  </Button>
                  {canEdit ? (
                    <Button onClick={() => void openEdit(sheet.employee)}>编辑主档</Button>
                  ) : null}
                </div>
              </SheetFooter>
            </>
          ) : null}

          {sheet.type === "new" || sheet.type === "edit" ? (
            <>
              <SheetHeader className="border-b px-6 py-4 text-left">
                <SheetTitle>{sheet.type === "new" ? "新建员工" : "编辑员工"}</SheetTitle>
                <SheetDescription>编辑核心个人字段与主档信息</SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">基础信息</div>
                  <FormField label="姓名" required>
                    <Input
                      value={form.fullName}
                      onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="性别" required>
                    <OptionToggle
                      value={form.gender}
                      onChange={(value) => setForm((prev) => ({ ...prev, gender: value }))}
                      options={GENDER_OPTIONS}
                    />
                  </FormField>
                  <FormField label="手机号" required={sheet.type === "new"}>
                    <Input
                      value={form.mobile}
                      placeholder={form.mobileMasked ? "已脱敏，修改请填写完整号码" : undefined}
                      onChange={(event) => setForm((prev) => ({ ...prev, mobile: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="状态">
                    <OptionToggle
                      value={form.status}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, status: value as EmployeeStatus }))
                      }
                      options={EMPLOYEE_STATUS_OPTIONS}
                    />
                  </FormField>
                  <FormField label="入职日期" required>
                    <Input
                      type="date"
                      value={form.hireDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, hireDate: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="参加工作日期">
                    <Input
                      type="date"
                      value={form.workStartDate}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, workStartDate: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="集团司龄起算日">
                    <Input
                      type="date"
                      value={form.groupSeniorityStartDate}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, groupSeniorityStartDate: event.target.value }))
                      }
                    />
                  </FormField>
                </div>

                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">联系与账号</div>
                  <FormField label="公司邮箱">
                    <Input
                      value={form.companyEmail}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, companyEmail: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="个人邮箱">
                    <Input
                      value={form.personalEmail}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, personalEmail: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="AD账号">
                    <Input
                      value={form.adAccount}
                      onChange={(event) => setForm((prev) => ({ ...prev, adAccount: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="微信">
                    <Input
                      value={form.wechat}
                      onChange={(event) => setForm((prev) => ({ ...prev, wechat: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="办公电话">
                    <Input
                      value={form.officePhone}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, officePhone: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="办公分机">
                    <Input
                      value={form.officeExtension}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, officeExtension: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="家庭电话">
                    <Input
                      value={form.homePhone}
                      onChange={(event) => setForm((prev) => ({ ...prev, homePhone: event.target.value }))}
                    />
                  </FormField>
                </div>

                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">个人背景</div>
                  <FormField label="婚姻状态">
                    <Input
                      value={form.maritalStatus}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, maritalStatus: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="政治面貌">
                    <Input
                      value={form.politicalAffiliation}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, politicalAffiliation: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="最高学历">
                    <Input
                      value={form.highestEducation}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, highestEducation: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="最高学历毕业日期">
                    <Input
                      type="date"
                      value={form.highestEducationGradDate}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, highestEducationGradDate: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="生育状况">
                    <Input
                      value={form.fertilityStatus}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, fertilityStatus: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="民族">
                    <Input
                      value={form.ethnicity}
                      onChange={(event) => setForm((prev) => ({ ...prev, ethnicity: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="国籍">
                    <Input
                      value={form.nationality}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, nationality: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="户口性质">
                    <Input
                      value={form.householdType}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, householdType: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="兴趣爱好">
                    <Input
                      value={form.hobbies}
                      onChange={(event) => setForm((prev) => ({ ...prev, hobbies: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="党组织关系是否转入">
                    <OptionSelect
                      value={form.partyOrgTransferred}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, partyOrgTransferred: value }))
                      }
                      allowEmpty
                      emptyLabel="不填写"
                      options={BOOLEAN_OPTIONS}
                      className="w-full"
                    />
                  </FormField>
                </div>

                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">地址与紧急联系人</div>
                  <FormField label="户籍地址">
                    <Input
                      value={form.householdLocation}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, householdLocation: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="身份证地址">
                    <Input
                      value={form.idCardAddress}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, idCardAddress: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="现居住地址">
                    <Input
                      value={form.residenceAddress}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, residenceAddress: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="紧急联系人">
                    <Input
                      value={form.emergencyContactName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, emergencyContactName: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="紧急联系人电话">
                    <Input
                      value={form.emergencyContactPhone}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, emergencyContactPhone: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="紧急联系人关系">
                    <Input
                      value={form.emergencyContactRelation}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, emergencyContactRelation: event.target.value }))
                      }
                    />
                  </FormField>
                </div>

                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">招聘来源</div>
                  <FormField label="招聘渠道">
                    <Input
                      value={form.recruitmentChannel}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, recruitmentChannel: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="渠道明细">
                    <Input
                      value={form.recruitmentChannelDetail}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, recruitmentChannelDetail: event.target.value }))
                      }
                    />
                  </FormField>
                </div>

                {sheet.type === "new" ? (
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-muted-foreground">初始任职</div>
                    <FormField label="组织（可选，同时创建主任职）">
                      <OptionSelect
                        value={newEmployeeAssignment.organizationId}
                        onValueChange={(value) =>
                          setNewEmployeeAssignment((prev) => ({ ...prev, organizationId: value }))
                        }
                        options={flatOrgs.map((org) => ({ value: org.id, label: `${org.code} ${org.name}` }))}
                      />
                    </FormField>
                    <FormField label="岗位">
                      <OptionSelect
                        value={newEmployeeAssignment.positionId}
                        onValueChange={(value) =>
                          setNewEmployeeAssignment((prev) => ({ ...prev, positionId: value }))
                        }
                        options={positions.map((position) => ({
                          value: position.id,
                          label: `${position.code} ${position.name}`,
                        }))}
                      />
                    </FormField>
                    <FormField label="雇佣类型">
                      <OptionSelect
                        value={newEmployeeAssignment.employmentType}
                        onValueChange={(value) =>
                          setNewEmployeeAssignment((prev) => ({ ...prev, employmentType: value }))
                        }
                        options={EMPLOYMENT_TYPE_OPTIONS.map((option) => ({
                          value: option.id,
                          label: option.label,
                        }))}
                        className="w-full"
                      />
                    </FormField>
                  </div>
                ) : null}
              </div>
              <SheetFooter className="border-t px-6 py-4">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setSheet({ type: "closed" })}>
                    取消
                  </Button>
                  <Button disabled={saving} onClick={() => void save()}>
                    保存
                  </Button>
                </div>
              </SheetFooter>
            </>
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
