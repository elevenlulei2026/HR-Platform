import type {
  AssignmentIndicator,
  Employee,
  EmployeeAssignment,
  EmployeeAssignmentCreateRequest,
  MovementType,
} from "@shared/api.interface";

export type AssignmentForm = {
  effectiveStartDate: string;
  hireDate: string;
  isRehire: string;
  groupResponsibilityStartDate: string;
  groupSeniorityStartDate: string;
  supplier: string;
  probationPeriod: string;
  actualRegularizationDate: string;
  movementType: string;
  reasonCode: string;
  reasonSubCode: string;
  assignmentIndicator: AssignmentIndicator;
  legalEntityCode: string;
  organizationId: string;
  positionId: string;
  jobGradeCode: string;
  jobSequence: string;
  contractLocation: string;
  workLocation: string;
  isResponsibilitySystem: string;
  approvalAuthority: string;
  employeeGroupCode: string;
  employeeSubgroupCode: string;
  employeeNature: string;
  groupAttrLevel: string;
  payrollCompanyCode: string;
  costLegalEntityCode: string;
  trueResignationReasonHrbp: string;
  trueResignationReasonSubHrbp: string;
  handoverEmployeeId: string;
  resignationDestination: string;
  nonCompeteCompanySuggest: string;
  nonCompeteWithPay: string;
  salaryGroup: string;
  status: string;
};

export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function emptyAssignmentForm(employee?: Employee | null): AssignmentForm {
  return {
    effectiveStartDate: todayStr(),
    hireDate: employee?.hireDate ?? "",
    isRehire: "",
    groupResponsibilityStartDate: "",
    groupSeniorityStartDate: employee?.groupSeniorityStartDate ?? "",
    supplier: "",
    probationPeriod: "",
    actualRegularizationDate: "",
    movementType: "",
    reasonCode: "",
    reasonSubCode: "",
    assignmentIndicator: "PRIMARY",
    legalEntityCode: "",
    organizationId: "",
    positionId: "",
    jobGradeCode: "",
    jobSequence: "",
    contractLocation: "",
    workLocation: "",
    isResponsibilitySystem: "",
    approvalAuthority: "",
    employeeGroupCode: "",
    employeeSubgroupCode: "",
    employeeNature: "",
    groupAttrLevel: "",
    payrollCompanyCode: "",
    costLegalEntityCode: "",
    trueResignationReasonHrbp: "",
    trueResignationReasonSubHrbp: "",
    handoverEmployeeId: "",
    resignationDestination: "",
    nonCompeteCompanySuggest: "",
    nonCompeteWithPay: "",
    salaryGroup: "",
    status: "ACTIVE",
  };
}

function boolToForm(value?: boolean) {
  if (value === undefined) return "";
  return value ? "true" : "false";
}

export function formFromAssignment(assignment: EmployeeAssignment): AssignmentForm {
  return {
    effectiveStartDate: assignment.effectiveStartDate,
    hireDate: assignment.hireDate ?? "",
    isRehire: boolToForm(assignment.isRehire),
    groupResponsibilityStartDate: assignment.groupResponsibilityStartDate ?? "",
    groupSeniorityStartDate: assignment.groupSeniorityStartDate ?? "",
    supplier: assignment.supplier ?? "",
    probationPeriod: assignment.probationPeriod ?? "",
    actualRegularizationDate: assignment.actualRegularizationDate ?? "",
    movementType: assignment.movementType ?? "",
    reasonCode: assignment.reasonCode ?? "",
    reasonSubCode: assignment.reasonSubCode ?? "",
    assignmentIndicator: assignment.assignmentIndicator ?? (assignment.isPrimary ? "PRIMARY" : "SECONDARY"),
    legalEntityCode: assignment.legalEntityCode ?? "",
    organizationId: assignment.organizationId,
    positionId: assignment.positionId,
    jobGradeCode: assignment.jobGradeCode ?? "",
    jobSequence: assignment.jobSequence ?? "",
    contractLocation: assignment.contractLocation ?? "",
    workLocation: assignment.workLocation ?? "",
    isResponsibilitySystem: boolToForm(assignment.isResponsibilitySystem),
    approvalAuthority: assignment.approvalAuthority ?? "",
    employeeGroupCode: assignment.employeeGroupCode ?? "",
    employeeSubgroupCode: assignment.employeeSubgroupCode ?? "",
    employeeNature: assignment.employeeNature ?? "",
    groupAttrLevel: assignment.groupAttrLevel ?? "",
    payrollCompanyCode: assignment.payrollCompanyCode ?? "",
    costLegalEntityCode: assignment.costLegalEntityCode ?? "",
    trueResignationReasonHrbp: assignment.trueResignationReasonHrbp ?? "",
    trueResignationReasonSubHrbp: assignment.trueResignationReasonSubHrbp ?? "",
    handoverEmployeeId: assignment.handoverEmployeeId ?? "",
    resignationDestination: assignment.resignationDestination ?? "",
    nonCompeteCompanySuggest: boolToForm(assignment.nonCompeteCompanySuggest),
    nonCompeteWithPay: boolToForm(assignment.nonCompeteWithPay),
    salaryGroup: assignment.salaryGroup ?? "",
    status: assignment.status,
  };
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

export function buildAssignmentPayload(form: AssignmentForm): EmployeeAssignmentCreateRequest {
  return {
    effectiveStartDate: form.effectiveStartDate,
    hireDate: strOrUndefined(form.hireDate),
    isRehire: boolOrUndefined(form.isRehire),
    groupResponsibilityStartDate: strOrUndefined(form.groupResponsibilityStartDate),
    groupSeniorityStartDate: strOrUndefined(form.groupSeniorityStartDate),
    supplier: strOrUndefined(form.supplier),
    probationPeriod: strOrUndefined(form.probationPeriod),
    actualRegularizationDate: strOrUndefined(form.actualRegularizationDate),
    movementType: strOrUndefined(form.movementType) as MovementType | undefined,
    reasonCode: strOrUndefined(form.reasonCode),
    reasonSubCode: strOrUndefined(form.reasonSubCode),
    assignmentIndicator: form.assignmentIndicator,
    legalEntityCode: strOrUndefined(form.legalEntityCode),
    organizationId: form.organizationId,
    positionId: form.positionId,
    jobGradeCode: strOrUndefined(form.jobGradeCode),
    contractLocation: strOrUndefined(form.contractLocation),
    workLocation: strOrUndefined(form.workLocation),
    isResponsibilitySystem: boolOrUndefined(form.isResponsibilitySystem),
    approvalAuthority: strOrUndefined(form.approvalAuthority),
    employeeGroupCode: strOrUndefined(form.employeeGroupCode),
    employeeSubgroupCode: strOrUndefined(form.employeeSubgroupCode),
    employeeNature: strOrUndefined(form.employeeNature),
    groupAttrLevel: strOrUndefined(form.groupAttrLevel),
    payrollCompanyCode: strOrUndefined(form.payrollCompanyCode),
    costLegalEntityCode: strOrUndefined(form.costLegalEntityCode),
    trueResignationReasonHrbp: strOrUndefined(form.trueResignationReasonHrbp),
    trueResignationReasonSubHrbp: strOrUndefined(form.trueResignationReasonSubHrbp),
    handoverEmployeeId: numOrUndefined(form.handoverEmployeeId) !== undefined
      ? String(numOrUndefined(form.handoverEmployeeId))
      : undefined,
    resignationDestination: strOrUndefined(form.resignationDestination),
    nonCompeteCompanySuggest: boolOrUndefined(form.nonCompeteCompanySuggest),
    nonCompeteWithPay: boolOrUndefined(form.nonCompeteWithPay),
    salaryGroup: strOrUndefined(form.salaryGroup),
  };
}

export function temporalHint(asOfDate: string) {
  const today = todayStr();
  if (asOfDate < today) return { label: "历史快照", variant: "secondary" as const };
  if (asOfDate > today) return { label: "未来预览", variant: "outline" as const };
  return { label: "当前生效", variant: "default" as const };
}

export function computeExpectedRegularizationPreview(
  hireDate: string,
  probationPeriod: string,
  probationOptions: Array<{ value: string; label: string }>,
): string {
  if (!hireDate || !probationPeriod) return "";
  const opt = probationOptions.find((o) => o.value === probationPeriod);
  const match = opt?.label.match(/(\d+)/);
  const months = match ? Number(match[1]) : 0;
  if (!months) return "";
  const d = new Date(`${hireDate}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
