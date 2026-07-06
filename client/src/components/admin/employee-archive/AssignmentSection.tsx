import type {
  AssignmentStatus,
  EmployeeAssignment,
  EmployeeAssignmentCreateRequest,
  EmployeeAssignmentUpdateRequest,
  OrganizationTreeNode,
  Position,
} from "@shared/api.interface";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Edit, Plus } from "lucide-react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  ASSIGNMENT_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  assignmentStatusLabel,
  createEmployeeAssignment,
  updateEmployeeAssignment,
} from "@/api/employee";
import { flattenOrgTree } from "@/api/organization";
import { FormField } from "@/components/admin/form-field";
import { OptionSelect } from "@/components/admin/option-select";
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
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
import { cn } from "@/lib/utils";

const BOOLEAN_OPTIONS = [
  { value: "true", label: "是" },
  { value: "false", label: "否" },
];

type AssignmentForm = {
  organizationId: string;
  positionId: string;
  jobId: string;
  jobGradeCode: string;
  jobSequence: string;
  employmentType: string;
  employmentSubType: string;
  employeeNature: string;
  contractLocation: string;
  workLocation: string;
  isPrimary: string;
  isResponsibilitySystem: string;
  approvalAuthority: string;
  isManagementCadre: string;
  isCoreTalent: string;
  specialTags: string;
  groupAttrLevel: string;
  payrollCompanyId: string;
  costLegalEntityId: string;
  salaryGroup: string;
  businessUnit: string;
  legalEntityId: string;
  groupName: string;
  businessGroup: string;
  systemName: string;
  secondarySystem: string;
  centerName: string;
  departmentName: string;
  moduleName: string;
  teamName: string;
  secondaryTeam: string;
  lineOrStore: string;
  supplier: string;
  probationPeriod: string;
  expectedRegularizationDate: string;
  regularizationOpinion: string;
  actualRegularizationDate: string;
  groupResponsibilityStartDate: string;
  groupSeniorityStartDate: string;
  tenureOnPosition: string;
  companyTenure: string;
  hrCoordinatorNo: string;
  hrbpNo: string;
  sscNo: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  status: AssignmentStatus;
};

type SheetState = { type: "closed" } | { type: "new" } | { type: "edit"; item: EmployeeAssignment };

type AssignmentSectionProps = {
  employeeId: string;
  assignments: EmployeeAssignment[];
  orgs: OrganizationTreeNode[];
  positions: Position[];
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function emptyAssignmentForm(): AssignmentForm {
  return {
    organizationId: "",
    positionId: "",
    jobId: "",
    jobGradeCode: "",
    jobSequence: "",
    employmentType: "FULL_TIME",
    employmentSubType: "",
    employeeNature: "",
    contractLocation: "",
    workLocation: "",
    isPrimary: "true",
    isResponsibilitySystem: "",
    approvalAuthority: "",
    isManagementCadre: "",
    isCoreTalent: "",
    specialTags: "",
    groupAttrLevel: "",
    payrollCompanyId: "",
    costLegalEntityId: "",
    salaryGroup: "",
    businessUnit: "",
    legalEntityId: "",
    groupName: "",
    businessGroup: "",
    systemName: "",
    secondarySystem: "",
    centerName: "",
    departmentName: "",
    moduleName: "",
    teamName: "",
    secondaryTeam: "",
    lineOrStore: "",
    supplier: "",
    probationPeriod: "",
    expectedRegularizationDate: "",
    regularizationOpinion: "",
    actualRegularizationDate: "",
    groupResponsibilityStartDate: "",
    groupSeniorityStartDate: "",
    tenureOnPosition: "",
    companyTenure: "",
    hrCoordinatorNo: "",
    hrbpNo: "",
    sscNo: "",
    effectiveStartDate: todayStr(),
    effectiveEndDate: "",
    status: "ACTIVE",
  };
}

function boolToForm(value?: boolean) {
  if (value === undefined) return "";
  return value ? "true" : "false";
}

function formFromAssignment(assignment: EmployeeAssignment): AssignmentForm {
  return {
    organizationId: assignment.organizationId,
    positionId: assignment.positionId,
    jobId: assignment.jobId ?? "",
    jobGradeCode: assignment.jobGradeCode ?? "",
    jobSequence: assignment.jobSequence ?? "",
    employmentType: assignment.employmentType ?? "FULL_TIME",
    employmentSubType: assignment.employmentSubType ?? "",
    employeeNature: assignment.employeeNature ?? "",
    contractLocation: assignment.contractLocation ?? "",
    workLocation: assignment.workLocation ?? "",
    isPrimary: boolToForm(assignment.isPrimary),
    isResponsibilitySystem: boolToForm(assignment.isResponsibilitySystem),
    approvalAuthority: assignment.approvalAuthority ?? "",
    isManagementCadre: boolToForm(assignment.isManagementCadre),
    isCoreTalent: boolToForm(assignment.isCoreTalent),
    specialTags: assignment.specialTags ?? "",
    groupAttrLevel: assignment.groupAttrLevel ?? "",
    payrollCompanyId: assignment.payrollCompanyId ?? "",
    costLegalEntityId: assignment.costLegalEntityId ?? "",
    salaryGroup: assignment.salaryGroup ?? "",
    businessUnit: assignment.businessUnit ?? "",
    legalEntityId: assignment.legalEntityId ?? "",
    groupName: assignment.groupName ?? "",
    businessGroup: assignment.businessGroup ?? "",
    systemName: assignment.systemName ?? "",
    secondarySystem: assignment.secondarySystem ?? "",
    centerName: assignment.centerName ?? "",
    departmentName: assignment.departmentName ?? "",
    moduleName: assignment.moduleName ?? "",
    teamName: assignment.teamName ?? "",
    secondaryTeam: assignment.secondaryTeam ?? "",
    lineOrStore: assignment.lineOrStore ?? "",
    supplier: assignment.supplier ?? "",
    probationPeriod: assignment.probationPeriod ?? "",
    expectedRegularizationDate: assignment.expectedRegularizationDate ?? "",
    regularizationOpinion: assignment.regularizationOpinion ?? "",
    actualRegularizationDate: assignment.actualRegularizationDate ?? "",
    groupResponsibilityStartDate: assignment.groupResponsibilityStartDate ?? "",
    groupSeniorityStartDate: assignment.groupSeniorityStartDate ?? "",
    tenureOnPosition: assignment.tenureOnPosition ?? "",
    companyTenure: assignment.companyTenure ?? "",
    hrCoordinatorNo: assignment.hrCoordinatorNo ?? "",
    hrbpNo: assignment.hrbpNo ?? "",
    sscNo: assignment.sscNo ?? "",
    effectiveStartDate: assignment.effectiveStartDate,
    effectiveEndDate: assignment.effectiveEndDate ?? "",
    status: assignment.status,
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

function strOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function numOrUndefined(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isNaN(num) ? undefined : num;
}

function boolOrUndefined(value: string) {
  if (!value) return undefined;
  return value === "true";
}

function buildAssignmentPayload(form: AssignmentForm) {
  const payload: Record<string, string | number | boolean | undefined> = {
    organizationId: numOrUndefined(form.organizationId),
    positionId: numOrUndefined(form.positionId),
    jobId: numOrUndefined(form.jobId),
    jobGradeCode: strOrUndefined(form.jobGradeCode),
    jobSequence: strOrUndefined(form.jobSequence),
    employmentType: strOrUndefined(form.employmentType),
    employmentSubType: strOrUndefined(form.employmentSubType),
    employeeNature: strOrUndefined(form.employeeNature),
    contractLocation: strOrUndefined(form.contractLocation),
    workLocation: strOrUndefined(form.workLocation),
    isPrimary: boolOrUndefined(form.isPrimary),
    isResponsibilitySystem: boolOrUndefined(form.isResponsibilitySystem),
    approvalAuthority: strOrUndefined(form.approvalAuthority),
    isManagementCadre: boolOrUndefined(form.isManagementCadre),
    isCoreTalent: boolOrUndefined(form.isCoreTalent),
    specialTags: strOrUndefined(form.specialTags),
    groupAttrLevel: strOrUndefined(form.groupAttrLevel),
    payrollCompanyId: numOrUndefined(form.payrollCompanyId),
    costLegalEntityId: numOrUndefined(form.costLegalEntityId),
    salaryGroup: strOrUndefined(form.salaryGroup),
    businessUnit: strOrUndefined(form.businessUnit),
    legalEntityId: numOrUndefined(form.legalEntityId),
    groupName: strOrUndefined(form.groupName),
    businessGroup: strOrUndefined(form.businessGroup),
    systemName: strOrUndefined(form.systemName),
    secondarySystem: strOrUndefined(form.secondarySystem),
    centerName: strOrUndefined(form.centerName),
    departmentName: strOrUndefined(form.departmentName),
    moduleName: strOrUndefined(form.moduleName),
    teamName: strOrUndefined(form.teamName),
    secondaryTeam: strOrUndefined(form.secondaryTeam),
    lineOrStore: strOrUndefined(form.lineOrStore),
    supplier: strOrUndefined(form.supplier),
    probationPeriod: strOrUndefined(form.probationPeriod),
    expectedRegularizationDate: strOrUndefined(form.expectedRegularizationDate),
    regularizationOpinion: strOrUndefined(form.regularizationOpinion),
    actualRegularizationDate: strOrUndefined(form.actualRegularizationDate),
    groupResponsibilityStartDate: strOrUndefined(form.groupResponsibilityStartDate),
    groupSeniorityStartDate: strOrUndefined(form.groupSeniorityStartDate),
    tenureOnPosition: strOrUndefined(form.tenureOnPosition),
    companyTenure: strOrUndefined(form.companyTenure),
    hrCoordinatorNo: strOrUndefined(form.hrCoordinatorNo),
    hrbpNo: strOrUndefined(form.hrbpNo),
    sscNo: strOrUndefined(form.sscNo),
    effectiveStartDate: form.effectiveStartDate,
    effectiveEndDate: strOrUndefined(form.effectiveEndDate),
    status: form.status,
  };
  return payload;
}

function SectionTitle({ children }: { children: string }) {
  return <div className="text-sm font-medium text-muted-foreground">{children}</div>;
}

function AssignmentFormFields({
  form,
  setForm,
  flatOrgs,
  positions,
  isNew,
}: {
  form: AssignmentForm;
  setForm: Dispatch<SetStateAction<AssignmentForm>>;
  flatOrgs: ReturnType<typeof flattenOrgTree>;
  positions: Position[];
  isNew: boolean;
}) {
  const set = (key: keyof AssignmentForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionTitle>岗位与组织</SectionTitle>
        <FormField label="组织" required>
          <OptionSelect
            value={form.organizationId}
            onValueChange={(value) => set("organizationId", value)}
            options={flatOrgs.map((org) => ({ value: org.id, label: `${org.code} ${org.name}` }))}
            className="w-full"
          />
        </FormField>
        <FormField label="岗位" required>
          <OptionSelect
            value={form.positionId}
            onValueChange={(value) => set("positionId", value)}
            options={positions.map((position) => ({
              value: position.id,
              label: `${position.code} ${position.name}`,
            }))}
            className="w-full"
          />
        </FormField>
        <FormField label="职务 ID">
          <Input value={form.jobId} onChange={(e) => set("jobId", e.target.value)} />
        </FormField>
        <FormField label="职级编码">
          <Input value={form.jobGradeCode} onChange={(e) => set("jobGradeCode", e.target.value)} />
        </FormField>
        <FormField label="职位序列">
          <Input value={form.jobSequence} onChange={(e) => set("jobSequence", e.target.value)} />
        </FormField>
        <FormField label="雇佣类型">
          <OptionSelect
            value={form.employmentType}
            onValueChange={(value) => set("employmentType", value)}
            options={EMPLOYMENT_TYPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            className="w-full"
          />
        </FormField>
        <FormField label="员工子类">
          <Input value={form.employmentSubType} onChange={(e) => set("employmentSubType", e.target.value)} />
        </FormField>
        <FormField label="员工性质">
          <Input value={form.employeeNature} onChange={(e) => set("employeeNature", e.target.value)} />
        </FormField>
        <FormField label="主任职">
          <OptionSelect
            value={form.isPrimary}
            onValueChange={(value) => set("isPrimary", value)}
            options={BOOLEAN_OPTIONS}
            className="w-full"
          />
        </FormField>
      </div>

      <div className="space-y-4">
        <SectionTitle>生效与状态</SectionTitle>
        <FormField label="生效开始日期" required>
          <Input
            type="date"
            value={form.effectiveStartDate}
            onChange={(e) => set("effectiveStartDate", e.target.value)}
          />
        </FormField>
        <FormField label="生效结束日期">
          <Input
            type="date"
            value={form.effectiveEndDate}
            onChange={(e) => set("effectiveEndDate", e.target.value)}
          />
        </FormField>
        {!isNew ? (
          <FormField label="状态">
            <OptionSelect
              value={form.status}
              onValueChange={(value) => set("status", value as AssignmentStatus)}
              options={ASSIGNMENT_STATUS_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
              className="w-full"
            />
          </FormField>
        ) : null}
      </div>

      <div className="space-y-4">
        <SectionTitle>工作地点</SectionTitle>
        <FormField label="合同地点">
          <Input value={form.contractLocation} onChange={(e) => set("contractLocation", e.target.value)} />
        </FormField>
        <FormField label="工作地点">
          <Input value={form.workLocation} onChange={(e) => set("workLocation", e.target.value)} />
        </FormField>
      </div>

      <div className="space-y-4">
        <SectionTitle>岗位属性</SectionTitle>
        <FormField label="是否责任制">
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
          <Input value={form.approvalAuthority} onChange={(e) => set("approvalAuthority", e.target.value)} />
        </FormField>
        <FormField label="管理干部">
          <OptionSelect
            value={form.isManagementCadre}
            onValueChange={(value) => set("isManagementCadre", value)}
            allowEmpty
            emptyLabel="不填写"
            options={BOOLEAN_OPTIONS}
            className="w-full"
          />
        </FormField>
        <FormField label="核心人才">
          <OptionSelect
            value={form.isCoreTalent}
            onValueChange={(value) => set("isCoreTalent", value)}
            allowEmpty
            emptyLabel="不填写"
            options={BOOLEAN_OPTIONS}
            className="w-full"
          />
        </FormField>
        <FormField label="特殊标签">
          <Input value={form.specialTags} onChange={(e) => set("specialTags", e.target.value)} />
        </FormField>
        <FormField label="集团属性分级">
          <Input value={form.groupAttrLevel} onChange={(e) => set("groupAttrLevel", e.target.value)} />
        </FormField>
      </div>

      <div className="space-y-4">
        <SectionTitle>组织层级（冗余展示）</SectionTitle>
        <FormField label="业务单位">
          <Input value={form.businessUnit} onChange={(e) => set("businessUnit", e.target.value)} />
        </FormField>
        <FormField label="法人实体 ID">
          <Input value={form.legalEntityId} onChange={(e) => set("legalEntityId", e.target.value)} />
        </FormField>
        <FormField label="集团">
          <Input value={form.groupName} onChange={(e) => set("groupName", e.target.value)} />
        </FormField>
        <FormField label="事业群">
          <Input value={form.businessGroup} onChange={(e) => set("businessGroup", e.target.value)} />
        </FormField>
        <FormField label="体系">
          <Input value={form.systemName} onChange={(e) => set("systemName", e.target.value)} />
        </FormField>
        <FormField label="二级体系">
          <Input value={form.secondarySystem} onChange={(e) => set("secondarySystem", e.target.value)} />
        </FormField>
        <FormField label="中心">
          <Input value={form.centerName} onChange={(e) => set("centerName", e.target.value)} />
        </FormField>
        <FormField label="部门">
          <Input value={form.departmentName} onChange={(e) => set("departmentName", e.target.value)} />
        </FormField>
        <FormField label="模块">
          <Input value={form.moduleName} onChange={(e) => set("moduleName", e.target.value)} />
        </FormField>
        <FormField label="组">
          <Input value={form.teamName} onChange={(e) => set("teamName", e.target.value)} />
        </FormField>
        <FormField label="二级组">
          <Input value={form.secondaryTeam} onChange={(e) => set("secondaryTeam", e.target.value)} />
        </FormField>
        <FormField label="线/店">
          <Input value={form.lineOrStore} onChange={(e) => set("lineOrStore", e.target.value)} />
        </FormField>
      </div>

      <div className="space-y-4">
        <SectionTitle>薪酬与法人</SectionTitle>
        <FormField label="发薪公司 ID">
          <Input value={form.payrollCompanyId} onChange={(e) => set("payrollCompanyId", e.target.value)} />
        </FormField>
        <FormField label="成本归属法人 ID">
          <Input value={form.costLegalEntityId} onChange={(e) => set("costLegalEntityId", e.target.value)} />
        </FormField>
        <FormField label="薪资组">
          <Input value={form.salaryGroup} onChange={(e) => set("salaryGroup", e.target.value)} />
        </FormField>
      </div>

      <div className="space-y-4">
        <SectionTitle>雇工与试用期</SectionTitle>
        <FormField label="供应商">
          <Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} />
        </FormField>
        <FormField label="试用期期限">
          <Input value={form.probationPeriod} onChange={(e) => set("probationPeriod", e.target.value)} />
        </FormField>
        <FormField label="预计转正日期">
          <Input
            type="date"
            value={form.expectedRegularizationDate}
            onChange={(e) => set("expectedRegularizationDate", e.target.value)}
          />
        </FormField>
        <FormField label="转正意见">
          <Input
            value={form.regularizationOpinion}
            onChange={(e) => set("regularizationOpinion", e.target.value)}
          />
        </FormField>
        <FormField label="实际转正日期">
          <Input
            type="date"
            value={form.actualRegularizationDate}
            onChange={(e) => set("actualRegularizationDate", e.target.value)}
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
        <FormField label="在岗时间">
          <Input
            value={form.tenureOnPosition}
            onChange={(e) => set("tenureOnPosition", e.target.value)}
            placeholder="如 2年3个月"
          />
        </FormField>
        <FormField label="司龄">
          <Input
            value={form.companyTenure}
            onChange={(e) => set("companyTenure", e.target.value)}
            placeholder="如 5年"
          />
        </FormField>
      </div>

      <div className="space-y-4">
        <SectionTitle>工作关系</SectionTitle>
        <FormField label="人资协调员工号">
          <Input value={form.hrCoordinatorNo} onChange={(e) => set("hrCoordinatorNo", e.target.value)} />
        </FormField>
        <FormField label="HRBP 工号">
          <Input value={form.hrbpNo} onChange={(e) => set("hrbpNo", e.target.value)} />
        </FormField>
        <FormField label="SSC 工号">
          <Input value={form.sscNo} onChange={(e) => set("sscNo", e.target.value)} />
        </FormField>
      </div>
    </div>
  );
}

export function AssignmentSection({
  employeeId,
  assignments,
  orgs,
  positions,
  canEdit,
  onChanged,
}: AssignmentSectionProps) {
  const flatOrgs = flattenOrgTree(orgs);
  const [sheet, setSheet] = useState<SheetState>({ type: "closed" });
  const [form, setForm] = useState<AssignmentForm>(() => emptyAssignmentForm());
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    const next = emptyAssignmentForm();
    if (flatOrgs[0]) next.organizationId = flatOrgs[0].id;
    if (positions[0]) next.positionId = positions[0].id;
    setForm(next);
    setSheet({ type: "new" });
  };

  const openEdit = (item: EmployeeAssignment) => {
    setForm(formFromAssignment(item));
    setSheet({ type: "edit", item });
  };

  const save = async () => {
    if (!form.organizationId || !form.positionId) {
      toast.error("请选择组织与岗位");
      return;
    }
    if (!form.effectiveStartDate) {
      toast.error("请填写生效开始日期");
      return;
    }

    setSaving(true);
    try {
      const payload = buildAssignmentPayload(form);
      if (sheet.type === "new") {
        await createEmployeeAssignment(
          employeeId,
          payload as EmployeeAssignmentCreateRequest,
        );
        toast.success("任职已新增");
      } else if (sheet.type === "edit") {
        await updateEmployeeAssignment(
          employeeId,
          sheet.item.id,
          payload as EmployeeAssignmentUpdateRequest,
        );
        toast.success("任职已更新");
      }
      setSheet({ type: "closed" });
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
        toolbar={
          canEdit ? (
            <Button size="sm" onClick={openCreate}>
              <Plus />
              新增任职
            </Button>
          ) : null
        }
      >
        {assignments.length === 0 ? (
          <PanelEmpty title="暂无任职记录" description="可通过新增任职维护岗位与组织信息" />
        ) : (
          <div className="divide-y">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {assignment.organizationName ?? "—"} · {assignment.positionName ?? "—"}
                    </span>
                    {assignment.isPrimary ? (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        主任职
                      </Badge>
                    ) : null}
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 text-[10px]",
                        assignment.status === "ACTIVE"
                          ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {assignmentStatusLabel(assignment.status)}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {assignment.effectiveStartDate}
                    {assignment.effectiveEndDate ? ` → ${assignment.effectiveEndDate}` : " → 至今"}
                    {assignment.employmentTypeLabel || assignment.employmentType
                      ? ` · ${assignment.employmentTypeLabel ?? assignment.employmentType}`
                      : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[
                      assignment.workLocation && `工作地点 ${assignment.workLocation}`,
                      assignment.departmentName && `部门 ${assignment.departmentName}`,
                      assignment.businessUnit && `业务单位 ${assignment.businessUnit}`,
                      assignment.hrbpNo && `HRBP ${assignment.hrbpNo}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                </div>
                {canEdit ? (
                  <Button variant="ghost" size="sm" onClick={() => openEdit(assignment)}>
                    <Edit />
                    编辑
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <Sheet open={sheet.type !== "closed"} onOpenChange={(o) => !o && setSheet({ type: "closed" })}>
        <SheetContent side="right" className="gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>{sheet.type === "new" ? "新增任职" : "编辑任职"}</SheetTitle>
            <SheetDescription>维护岗位、组织层级、雇工属性与工作关系</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <AssignmentFormFields
              form={form}
              setForm={setForm}
              flatOrgs={flatOrgs}
              positions={positions}
              isNew={sheet.type === "new"}
            />
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
        </SheetContent>
      </Sheet>
    </>
  );
}
