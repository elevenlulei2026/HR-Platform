import type {
  AssignmentIndicator,
  Employee,
  EmployeeAssignment,
  EmployeeAssignmentEditMode,
  EmployeeAssignmentFormOptions,
  EmployeeAssignmentUpdateRequest,
  MovementCatalogOption,
  OrganizationTreeNode,
} from "@shared/api.interface";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import { getEmployeeGroupCatalogOptions } from "@/api/employee-group-catalog";
import {
  ASSIGNMENT_INDICATOR_OPTIONS,
  ASSIGNMENT_STATUS_OPTIONS,
  EMPTY_EMPLOYEE_ASSIGNMENT_FORM_OPTIONS,
  createEmployeeAssignment,
  getEmployeeAssignmentFormOptions,
  listEmployeeAssignments,
  listEmployees,
  updateEmployeeAssignment,
} from "@/api/employee";
import { getMovementCatalogOptions } from "@/api/movement-catalog";
import { defaultDepartmentId, flattenOrgTree, getPosition } from "@/api/organization";
import { ArchiveFormDialogPortal } from "@/components/admin/employee-archive/ArchiveFormDialogPortal";
import { AssignmentIndicatorSection } from "@/components/admin/employee-archive/AssignmentIndicatorSection";
import {
  ASSIGNMENT_INDICATOR_ZONES,
  assignmentIndicatorOf,
  filterAssignmentsByIndicator,
  pickPresentAssignmentId,
} from "@/components/admin/employee-archive/assignment-indicator";
import {
  ArchiveAddButton,
  ArchiveFormSection,
} from "@/components/admin/employee-archive/archive-record-ui";
import {
  buildAssignmentPayload,
  computeExpectedRegularizationPreview,
  emptyAssignmentForm,
  formFromAssignment,
  todayStr,
  type AssignmentForm,
} from "@/components/admin/employee-archive/assignment-form";
import { DepartmentPositionFields } from "@/components/admin/employee-archive/DepartmentPositionFields";
import { FormField, OptionToggle } from "@/components/admin/form-field";
import { OptionSelect } from "@/components/admin/option-select";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/admin/searchable-select";
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const BOOLEAN_OPTIONS = [
  { value: "true", label: "是" },
  { value: "false", label: "否" },
];

type SheetState =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: EmployeeAssignment; editMode: EmployeeAssignmentEditMode };

type AssignmentSectionProps = {
  employee: Employee;
  orgs: OrganizationTreeNode[];
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

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

function AssignmentFormFields({
  form,
  setForm,
  flatOrgs,
  dictOptions,
  movementOptions,
  employeeGroupOptions,
  employeeOptions,
  employeeLoading,
  onEmployeeSearch,
  readOnlyComputed,
  isNew,
  versioningHint = false,
  editMode,
  onEditModeChange,
}: {
  form: AssignmentForm;
  setForm: React.Dispatch<React.SetStateAction<AssignmentForm>>;
  flatOrgs: ReturnType<typeof flattenOrgTree>;
  dictOptions: EmployeeAssignmentFormOptions;
  movementOptions: MovementCatalogOption[];
  employeeGroupOptions: Array<{ employeeGroupCode: string; employeeGroupName: string; subgroups: Array<{ code: string; name: string }> }>;
  employeeOptions: SearchableSelectOption[];
  employeeLoading: boolean;
  onEmployeeSearch: (keyword: string) => void;
  readOnlyComputed: {
    expectedRegularizationDate: string;
    companyTenure: string;
    positionStartDate: string;
    tenureOnPosition: string;
    createdAt: string;
  };
  isNew: boolean;
  versioningHint?: boolean;
  editMode?: EmployeeAssignmentEditMode;
  onEditModeChange?: (mode: EmployeeAssignmentEditMode) => void;
}) {
  const set = (key: keyof AssignmentForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectedMovement = movementOptions.find((m) => m.movementType === form.movementType);
  const selectedReason = selectedMovement?.reasons.find((r) => r.code === form.reasonCode);
  const subgroupOptions = useMemo(() => {
    const group = employeeGroupOptions.find((g) => g.employeeGroupCode === form.employeeGroupCode);
    return group?.subgroups ?? [];
  }, [employeeGroupOptions, form.employeeGroupCode]);

  const handlePositionChange = useCallback(
    async (positionId: string) => {
      set("positionId", positionId);
      if (!positionId) {
        setForm((prev) => ({ ...prev, jobSequence: "", jobGradeCode: "" }));
        return;
      }
      try {
        const res = await getPosition(positionId);
        const pos = res.data;
        setForm((prev) => ({
          ...prev,
          positionId,
          jobSequence: pos.positionSequence ?? prev.jobSequence,
          jobGradeCode: pos.positionLevel ?? prev.jobGradeCode,
        }));
      } catch {
        set("positionId", positionId);
      }
    },
    [setForm],
  );

  const expectedPreview =
    readOnlyComputed.expectedRegularizationDate ||
    computeExpectedRegularizationPreview(form.hireDate, form.probationPeriod, dictOptions.probationPeriods);

  const effectiveStartLocked = !isNew && editMode === "CURRENT";

  return (
    <div className="space-y-4">
      <ArchiveFormSection title="生效期" columns={4}>
        {isNew ? (
          <FormField label="职务指示" required hint="默认主要职务，兼岗请选择次要职务">
            <OptionToggle
              value={form.assignmentIndicator}
              onChange={(value) => set("assignmentIndicator", value)}
              options={ASSIGNMENT_INDICATOR_OPTIONS}
            />
          </FormField>
        ) : (
          <FormField label="职务指示">
            <Input
              disabled
              value={form.assignmentIndicator === "PRIMARY" ? "主要职务" : "次要职务"}
            />
          </FormField>
        )}
        {!isNew && editMode && onEditModeChange ? (
          <FormField label="编辑方式" required>
            <OptionToggle
              value={editMode}
              onChange={(value) => onEditModeChange(value as EmployeeAssignmentEditMode)}
              options={[
                { id: "CURRENT", label: "修改当前版本" },
                { id: "NEW_VERSION", label: "新增生效版本" },
              ]}
            />
          </FormField>
        ) : null}
        <FormField
          label="生效日期"
          required
          hint={
            isNew && versioningHint
              ? "同职务类型已有任职时，将按新生效日创建版本"
              : effectiveStartLocked
                ? "修改当前版本时生效日期不可变更"
                : editMode === "NEW_VERSION"
                  ? "指定新版本的生效开始日"
                  : "版本按生效日期区分过去、当前、将来"
          }
        >
          <Input
            type="date"
            value={form.effectiveStartDate}
            disabled={effectiveStartLocked}
            onChange={(e) => set("effectiveStartDate", e.target.value)}
          />
        </FormField>
        {!isNew ? (
          <FormField label="创建日期">
            <Input value={readOnlyComputed.createdAt || "—"} disabled />
          </FormField>
        ) : null}
      </ArchiveFormSection>

      <ArchiveFormSection title="生效与雇工" columns={4}>
        <FormField label="入职日期">
          <Input type="date" value={form.hireDate} onChange={(e) => set("hireDate", e.target.value)} />
        </FormField>
        <FormField label="司龄">
          <Input value={readOnlyComputed.companyTenure || "—"} disabled />
        </FormField>
        <FormField label="是否重新雇佣">
          <OptionSelect
            value={form.isRehire}
            onValueChange={(value) => set("isRehire", value)}
            allowEmpty
            emptyLabel="不填写"
            options={BOOLEAN_OPTIONS}
            className="w-full"
          />
        </FormField>
        <FormField label="集团责任制开始日期">
          <Input
            type="date"
            value={form.groupResponsibilityStartDate}
            onChange={(e) => set("groupResponsibilityStartDate", e.target.value)}
          />
        </FormField>
        <FormField label="集团工龄开始日期">
          <Input
            type="date"
            value={form.groupSeniorityStartDate}
            onChange={(e) => set("groupSeniorityStartDate", e.target.value)}
          />
        </FormField>
        <FormField label="供应商">
          <OptionSelect
            value={form.supplier}
            onValueChange={(value) => set("supplier", value)}
            allowEmpty
            emptyLabel="请选择"
            options={dictOptions.suppliers.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
        <FormField label="试用期期限">
          <OptionSelect
            value={form.probationPeriod}
            onValueChange={(value) => set("probationPeriod", value)}
            allowEmpty
            emptyLabel="请选择"
            options={dictOptions.probationPeriods.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
        <FormField label="预计转正日期">
          <Input value={expectedPreview || "—"} disabled />
        </FormField>
        <FormField label="实际转正日期">
          <Input
            type="date"
            value={form.actualRegularizationDate}
            onChange={(e) => set("actualRegularizationDate", e.target.value)}
          />
        </FormField>
      </ArchiveFormSection>

      <ArchiveFormSection title="职务异动" columns={4}>
        <FormField label="操作">
          <OptionSelect
            value={form.movementType}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, movementType: value, reasonCode: "", reasonSubCode: "" }))
            }
            allowEmpty
            emptyLabel="请选择"
            options={movementOptions.map((m) => ({
              value: m.movementType,
              label: `${m.movementType} ${m.movementTypeName}`,
            }))}
            className="w-full"
          />
        </FormField>
        <FormField label="原因">
          <OptionSelect
            value={form.reasonCode}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, reasonCode: value, reasonSubCode: "" }))
            }
            allowEmpty
            emptyLabel="请先选择操作"
            options={(selectedMovement?.reasons ?? []).map((r) => ({
              value: r.code,
              label: `${r.code} ${r.name}`,
            }))}
            className="w-full"
            disabled={!form.movementType}
          />
        </FormField>
        <FormField label="原因子项">
          <OptionSelect
            value={form.reasonSubCode}
            onValueChange={(value) => set("reasonSubCode", value)}
            allowEmpty
            emptyLabel={selectedReason?.requiresSub ? "请选择" : "无子项"}
            options={(selectedReason?.subs ?? []).map((s) => ({
              value: s.code,
              label: `${s.code} ${s.name}`,
            }))}
            className="w-full"
            disabled={!form.reasonCode || !(selectedReason?.subs.length)}
          />
        </FormField>
      </ArchiveFormSection>

      <ArchiveFormSection title="岗位与组织" columns={4}>
        <FormField label="法人实体">
          <OptionSelect
            value={form.legalEntityCode}
            onValueChange={(value) => set("legalEntityCode", value)}
            allowEmpty
            emptyLabel="请选择"
            options={dictOptions.legalCompanies.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
        <DepartmentPositionFields
          organizationId={form.organizationId}
          positionId={form.positionId}
          departments={flatOrgs}
          organizationRequired
          positionRequired
          onOrganizationChange={(organizationId) => {
            setForm((prev) => ({ ...prev, organizationId, positionId: "" }));
          }}
          onPositionChange={(positionId) => void handlePositionChange(positionId)}
        />
        <FormField label="岗位序列">
          <Input value={form.jobSequence || "—"} disabled />
        </FormField>
        <FormField label="职级">
          <OptionSelect
            value={form.jobGradeCode}
            onValueChange={(value) => set("jobGradeCode", value)}
            allowEmpty
            emptyLabel="请选择或手选"
            options={dictOptions.jobGrades.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
        <FormField label="合同地点">
          <OptionSelect
            value={form.contractLocation}
            onValueChange={(value) => set("contractLocation", value)}
            allowEmpty
            emptyLabel="请选择"
            options={dictOptions.contractLocations.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
        <FormField label="工作地点">
          <OptionSelect
            value={form.workLocation}
            onValueChange={(value) => set("workLocation", value)}
            allowEmpty
            emptyLabel="请选择"
            options={dictOptions.workLocations.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
        <FormField label="责任制">
          <OptionSelect
            value={form.isResponsibilitySystem}
            onValueChange={(value) => set("isResponsibilitySystem", value)}
            allowEmpty
            emptyLabel="不填写"
            options={BOOLEAN_OPTIONS}
            className="w-full"
          />
        </FormField>
        <FormField label="审批权限">
          <OptionSelect
            value={form.approvalAuthority}
            onValueChange={(value) => set("approvalAuthority", value)}
            allowEmpty
            emptyLabel="请选择"
            options={dictOptions.approvalAuthorities.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
        <FormField label="员工组">
          <OptionSelect
            value={form.employeeGroupCode}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, employeeGroupCode: value, employeeSubgroupCode: "" }))
            }
            allowEmpty
            emptyLabel="请选择"
            options={employeeGroupOptions.map((g) => ({
              value: g.employeeGroupCode,
              label: `${g.employeeGroupCode} ${g.employeeGroupName}`,
            }))}
            className="w-full"
          />
        </FormField>
        <FormField label="员工子组">
          <OptionSelect
            value={form.employeeSubgroupCode}
            onValueChange={(value) => set("employeeSubgroupCode", value)}
            allowEmpty
            emptyLabel="请先选择员工组"
            options={subgroupOptions.map((s) => ({
              value: s.code,
              label: `${s.code} ${s.name}`,
            }))}
            className="w-full"
            disabled={!form.employeeGroupCode}
          />
        </FormField>
        <FormField label="该岗位开始日期">
          <Input value={readOnlyComputed.positionStartDate || "—"} disabled />
        </FormField>
        <FormField label="在岗时间">
          <Input value={readOnlyComputed.tenureOnPosition || "—"} disabled />
        </FormField>
        <FormField label="员工性质">
          <OptionSelect
            value={form.employeeNature}
            onValueChange={(value) => set("employeeNature", value)}
            allowEmpty
            emptyLabel="请选择"
            options={dictOptions.employeeNatures.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
        <FormField label="集团属性分级">
          <OptionSelect
            value={form.groupAttrLevel}
            onValueChange={(value) => set("groupAttrLevel", value)}
            allowEmpty
            emptyLabel="请选择"
            options={dictOptions.groupAttrLevels.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
      </ArchiveFormSection>

      <ArchiveFormSection title="薪酬与法人" columns={4}>
        <FormField label="发薪公司">
          <OptionSelect
            value={form.payrollCompanyCode}
            onValueChange={(value) => set("payrollCompanyCode", value)}
            allowEmpty
            emptyLabel="请选择"
            options={dictOptions.payrollCompanies.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
        <FormField label="成本归属法人">
          <OptionSelect
            value={form.costLegalEntityCode}
            onValueChange={(value) => set("costLegalEntityCode", value)}
            allowEmpty
            emptyLabel="请选择"
            options={dictOptions.legalCompanies.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
        <FormField label="薪资组">
          <OptionSelect
            value={form.salaryGroup}
            onValueChange={(value) => set("salaryGroup", value)}
            allowEmpty
            emptyLabel="请选择"
            options={dictOptions.salaryGroups.map((o) => ({ value: o.value, label: o.label }))}
            className="w-full"
          />
        </FormField>
        {!isNew ? (
          <FormField label="状态">
            <OptionSelect
              value={form.status}
              onValueChange={(value) => set("status", value)}
              options={ASSIGNMENT_STATUS_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
              className="w-full"
            />
          </FormField>
        ) : null}
      </ArchiveFormSection>

      <ArchiveFormSection title="离职信息" columns={4}>
        <FormField label="真实离职原因(HRBP)">
          <Input
            value={form.trueResignationReasonHrbp}
            onChange={(e) => set("trueResignationReasonHrbp", e.target.value)}
          />
        </FormField>
        <FormField label="真实离职原因子类(HRBP)">
          <Input
            value={form.trueResignationReasonSubHrbp}
            onChange={(e) => set("trueResignationReasonSubHrbp", e.target.value)}
          />
        </FormField>
        <FormField label="交接人">
          <SearchableSelect
            value={form.handoverEmployeeId}
            onChange={(value) => set("handoverEmployeeId", value)}
            options={employeeOptions}
            variant="entity"
            placeholder="搜索员工姓名或工号"
            entityEmptyTitle="搜索员工"
            entityEmptyHint="输入姓名或工号"
            entitySelectedHint="已选择交接人"
            searchPlaceholder="搜索员工…"
            loading={employeeLoading}
            shouldFilter={false}
            onSearchChange={onEmployeeSearch}
            className="w-full"
          />
        </FormField>
        <FormField label="离职去向">
          <Input
            value={form.resignationDestination}
            onChange={(e) => set("resignationDestination", e.target.value)}
          />
        </FormField>
        <FormField label="是否启动竞业限制-公司建议">
          <OptionSelect
            value={form.nonCompeteCompanySuggest}
            onValueChange={(value) => set("nonCompeteCompanySuggest", value)}
            allowEmpty
            emptyLabel="不填写"
            options={BOOLEAN_OPTIONS}
            className="w-full"
          />
        </FormField>
        <FormField label="是否给薪">
          <OptionSelect
            value={form.nonCompeteWithPay}
            onValueChange={(value) => set("nonCompeteWithPay", value)}
            allowEmpty
            emptyLabel="不填写"
            options={BOOLEAN_OPTIONS}
            className="w-full"
          />
        </FormField>
      </ArchiveFormSection>
    </div>
  );
}

export function AssignmentSection({ employee, orgs, canEdit, onChanged }: AssignmentSectionProps) {
  const flatOrgs = flattenOrgTree(orgs);
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dictOptions, setDictOptions] = useState<EmployeeAssignmentFormOptions>(
    EMPTY_EMPLOYEE_ASSIGNMENT_FORM_OPTIONS,
  );
  const [movementOptions, setMovementOptions] = useState<MovementCatalogOption[]>([]);
  const [employeeGroupOptions, setEmployeeGroupOptions] = useState<
    Array<{ employeeGroupCode: string; employeeGroupName: string; subgroups: Array<{ code: string; name: string }> }>
  >([]);
  const [sheet, setSheet] = useState<SheetState>({ type: "closed" });
  const [form, setForm] = useState<AssignmentForm>(() => emptyAssignmentForm(employee));
  const [saving, setSaving] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState<SearchableSelectOption[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [focusedByIndicator, setFocusedByIndicator] = useState<
    Partial<Record<AssignmentIndicator, string>>
  >({});
  const debouncedEmployeeSearch = useDebouncedValue(employeeSearch, 280);

  const syncFocusedByIndicator = useCallback(
    (
      items: EmployeeAssignment[],
      prev: Partial<Record<AssignmentIndicator, string>>,
    ): Partial<Record<AssignmentIndicator, string>> => {
      const next: Partial<Record<AssignmentIndicator, string>> = { ...prev };
      for (const zone of ASSIGNMENT_INDICATOR_ZONES) {
        const group = filterAssignmentsByIndicator(items, zone.indicator);
        const kept = prev[zone.indicator];
        next[zone.indicator] =
          kept && group.some((item) => item.id === kept)
            ? kept
            : pickPresentAssignmentId(group);
      }
      return next;
    },
    [],
  );

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listEmployeeAssignments(employee.id);
      setAssignments(res.data);
      setFocusedByIndicator((prev) => syncFocusedByIndicator(res.data, prev));
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setLoading(false);
    }
  }, [employee.id, syncFocusedByIndicator]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    void Promise.all([
      getEmployeeAssignmentFormOptions(),
      getMovementCatalogOptions(),
      getEmployeeGroupCatalogOptions(),
    ])
      .then(([dictRes, movementRes, groupRes]) => {
        setDictOptions(dictRes.data);
        setMovementOptions(movementRes.data);
        setEmployeeGroupOptions(groupRes.data);
      })
      .catch(() => {
        // 字典加载失败不阻断页面
      });
  }, []);

  useEffect(() => {
    if (sheet.type === "closed") return;
    setEmployeeLoading(true);
    void listEmployees({
      page: 1,
      pageSize: 20,
      keyword: debouncedEmployeeSearch || undefined,
    })
      .then((res) => {
        setEmployeeOptions(
          res.data.items
            .filter((item) => item.id !== employee.id)
            .map((item) => ({
              value: item.id,
              label: item.fullName,
              code: item.employeeNo,
              keywords: `${item.employeeNo} ${item.fullName}`,
            })),
        );
      })
      .catch(() => setEmployeeOptions([]))
      .finally(() => setEmployeeLoading(false));
  }, [debouncedEmployeeSearch, employee.id, sheet.type]);

  const editingItem = sheet.type === "edit" ? sheet.item : null;
  const editMode = sheet.type === "edit" ? sheet.editMode : undefined;
  const createVersioningHint =
    sheet.type === "new" &&
    filterAssignmentsByIndicator(assignments, form.assignmentIndicator).length > 0;
  const readOnlyComputed = {
    expectedRegularizationDate: editingItem?.expectedRegularizationDate ?? "",
    companyTenure: editingItem?.companyTenure ?? "",
    positionStartDate: editingItem?.positionStartDate ?? "",
    tenureOnPosition: editingItem?.tenureOnPosition ?? "",
    createdAt: editingItem?.createdAt?.slice(0, 10) ?? "",
  };

  const openCreate = () => {
    const next = emptyAssignmentForm(employee);
    next.organizationId = defaultDepartmentId(flatOrgs);
    setForm(next);
    setSheet({ type: "new" });
  };

  const visibleZones = useMemo(
    () =>
      ASSIGNMENT_INDICATOR_ZONES.filter((zone) =>
        filterAssignmentsByIndicator(assignments, zone.indicator).length > 0,
      ),
    [assignments],
  );

  const openEdit = (item: EmployeeAssignment, mode: EmployeeAssignmentEditMode = "CURRENT") => {
    const next = formFromAssignment(item);
    if (mode === "NEW_VERSION") {
      next.effectiveStartDate = todayStr();
    }
    setForm(next);
    setSheet({ type: "edit", item, editMode: mode });
  };

  const handleEditModeChange = (mode: EmployeeAssignmentEditMode) => {
    if (sheet.type !== "edit") return;
    const base = formFromAssignment(sheet.item);
    if (mode === "CURRENT") {
      base.effectiveStartDate = sheet.item.effectiveStartDate;
    } else {
      base.effectiveStartDate = todayStr();
    }
    setForm(base);
    setSheet({ type: "edit", item: sheet.item, editMode: mode });
  };

  const save = async () => {
    if (!form.organizationId || !form.positionId) {
      toast.error("请选择部门与岗位");
      return;
    }
    if (!form.effectiveStartDate) {
      toast.error("请填写生效日期");
      return;
    }

    const payload = buildAssignmentPayload(form);

    if (sheet.type === "new") {
      const sameGroup = filterAssignmentsByIndicator(assignments, form.assignmentIndicator);
      const presentId = pickPresentAssignmentId(sameGroup);
      const present = presentId ? sameGroup.find((item) => item.id === presentId) : undefined;
      if (present && form.effectiveStartDate === present.effectiveStartDate) {
        toast.error("同职务类型下该生效日期已存在，请修改生效日期");
        return;
      }
    }

    setSaving(true);
    try {
      if (sheet.type === "new") {
        const sameGroup = filterAssignmentsByIndicator(assignments, form.assignmentIndicator);
        const presentId = pickPresentAssignmentId(sameGroup);
        const present = presentId ? sameGroup.find((item) => item.id === presentId) : undefined;

        if (present) {
          const updatePayload: EmployeeAssignmentUpdateRequest = {
            editMode: "NEW_VERSION",
            ...payload,
          };
          const res = await updateEmployeeAssignment(employee.id, present.id, updatePayload);
          toast.success("已新增生效版本");
          const indicator = assignmentIndicatorOf(res.data);
          setFocusedByIndicator((prev) => ({ ...prev, [indicator]: res.data.id }));
        } else {
          const res = await createEmployeeAssignment(employee.id, payload);
          toast.success("任职记录已新增");
          const indicator = assignmentIndicatorOf(res.data);
          setFocusedByIndicator((prev) => ({ ...prev, [indicator]: res.data.id }));
        }
      } else if (sheet.type === "edit") {
        const updatePayload: EmployeeAssignmentUpdateRequest = {
          editMode: sheet.editMode,
          ...payload,
          status: form.status as EmployeeAssignmentUpdateRequest["status"],
        };
        const res = await updateEmployeeAssignment(employee.id, sheet.item.id, updatePayload);
        toast.success(sheet.editMode === "NEW_VERSION" ? "已新增生效版本" : "任职记录已更新");
        const indicator = assignmentIndicatorOf(res.data);
        setFocusedByIndicator((prev) => ({ ...prev, [indicator]: res.data.id }));
      }
      setSheet({ type: "closed" });
      await loadAssignments();
      await onChanged();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PanelCard
        title="任职记录"
        description="按职务类型与生效日期维护任职版本"
        toolbar={canEdit ? <ArchiveAddButton label="新增任职" onClick={openCreate} /> : null}
      >
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">加载任职记录…</p>
        ) : assignments.length === 0 ? (
          <PanelEmpty
            compact
            title="暂无任职记录"
            description="点击「新增任职」维护岗位与组织信息"
          />
        ) : (
          <div className="space-y-3 p-2.5">
            {visibleZones.map((zone) => (
              <AssignmentIndicatorSection
                key={zone.indicator}
                indicator={zone.indicator}
                indicatorShortLabel={zone.shortLabel}
                accent={zone.accent}
                assignments={filterAssignmentsByIndicator(assignments, zone.indicator)}
                focusedId={focusedByIndicator[zone.indicator]}
                canEdit={canEdit}
                onFocus={(assignmentId) =>
                  setFocusedByIndicator((prev) => ({
                    ...prev,
                    [zone.indicator]: assignmentId,
                  }))
                }
                onEdit={openEdit}
              />
            ))}
          </div>
        )}
      </PanelCard>

      <ArchiveFormDialogPortal
        open={sheet.type !== "closed"}
        onOpenChange={(open) => !open && !saving && setSheet({ type: "closed" })}
        title={
          sheet.type === "new"
            ? "新增任职记录"
            : sheet.type === "edit" && sheet.editMode === "NEW_VERSION"
              ? "新增任职生效版本"
              : "编辑任职记录"
        }
        description="维护任职生效期、岗位组织、雇工属性与职务异动信息"
        extraWide
        saving={saving}
        onSave={() => void save()}
      >
        <AssignmentFormFields
          form={form}
          setForm={setForm}
          flatOrgs={flatOrgs}
          dictOptions={dictOptions}
          movementOptions={movementOptions}
          employeeGroupOptions={employeeGroupOptions}
          employeeOptions={employeeOptions}
          employeeLoading={employeeLoading}
          onEmployeeSearch={setEmployeeSearch}
          readOnlyComputed={readOnlyComputed}
          isNew={sheet.type === "new"}
          versioningHint={createVersioningHint}
          editMode={editMode}
          onEditModeChange={sheet.type === "edit" ? handleEditModeChange : undefined}
        />
      </ArchiveFormDialogPortal>
    </>
  );
}
