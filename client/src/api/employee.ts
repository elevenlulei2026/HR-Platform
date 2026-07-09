import type {
  Employee,
  EmployeeAssignment,
  EmployeeAssignmentCreateRequest,
  EmployeeAssignmentFormOptions,
  EmployeeAssignmentUpdateRequest,
  EmployeeCreateRequest,
  EmployeeFormOptions,
  EmployeeImportResult,
  EmployeeListQuery,
  EmployeeMasterVersion,
  EmployeeMovement,
  EmployeeUpdateRequest,
  PageResult,
  ReportingLine,
  ReportingLineCreateRequest,
  ReportingLineListQuery,
  ReportingLineUpdateRequest,
} from "@shared/api.interface";

import { deleteJson, getBlob, getJson, postJson, postMultipart, putJson } from "@/api/http";
import { normalizeNumericId } from "@/lib/numeric-id";

function pageQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  return qs.toString();
}

export async function listEmployees(query: EmployeeListQuery) {
  return getJson<PageResult<Employee>>(`/api/v1/employees?${pageQuery(query)}`);
}

export async function getEmployeeFormOptions() {
  return getJson<EmployeeFormOptions>("/api/v1/employees/form-options");
}

export async function getEmployee(id: string, query?: { revealSensitive?: boolean }) {
  const qs = pageQuery({ revealSensitive: query?.revealSensitive });
  const suffix = qs ? `?${qs}` : "";
  return getJson<Employee>(`/api/v1/employees/${id}${suffix}`);
}

export async function getEmployeeSnapshot(
  id: string,
  query?: { asOfDate?: string; revealSensitive?: boolean },
) {
  const qs = pageQuery({
    asOfDate: query?.asOfDate,
    revealSensitive: query?.revealSensitive,
  });
  const suffix = qs ? `?${qs}` : "";
  return getJson<Employee>(`/api/v1/employees/${id}${suffix}`);
}

export async function listEmployeeMasterVersions(employeeId: string) {
  return getJson<EmployeeMasterVersion[]>(`/api/v1/employees/${employeeId}/master-versions`);
}

export async function createEmployee(req: EmployeeCreateRequest) {
  return postJson<Employee, EmployeeCreateRequest>("/api/v1/employees", req);
}

export async function updateEmployee(id: string, req: EmployeeUpdateRequest) {
  return putJson<Employee, EmployeeUpdateRequest>(`/api/v1/employees/${id}`, req);
}

export async function getEmployeeAssignmentFormOptions() {
  return getJson<EmployeeAssignmentFormOptions>("/api/v1/employees/assignment-form-options");
}

export async function listEmployeeAssignments(
  employeeId: string,
  query?: { asOfDate?: string },
) {
  const qs = query?.asOfDate ? `?asOfDate=${encodeURIComponent(query.asOfDate)}` : "";
  return getJson<EmployeeAssignment[]>(`/api/v1/employees/${employeeId}/assignments${qs}`);
}

export async function createEmployeeAssignment(
  employeeId: string,
  req: EmployeeAssignmentCreateRequest,
) {
  return postJson<EmployeeAssignment, Record<string, unknown>>(
    `/api/v1/employees/${employeeId}/assignments`,
    normalizeAssignmentBody(req as Record<string, unknown>),
  );
}

export async function updateEmployeeAssignment(
  employeeId: string,
  assignmentId: string,
  req: EmployeeAssignmentUpdateRequest,
) {
  return putJson<EmployeeAssignment, Record<string, unknown>>(
    `/api/v1/employees/${employeeId}/assignments/${assignmentId}`,
    normalizeAssignmentBody(req as Record<string, unknown>),
  );
}

export async function listEmployeeMovements(employeeId: string) {
  return getJson<EmployeeMovement[]>(`/api/v1/employees/${employeeId}/movements`);
}

export async function downloadEmployeeImportTemplate() {
  return getBlob("/api/v1/employees/import-template");
}

export async function importEmployees(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return postMultipart<EmployeeImportResult>("/api/v1/employees/import", fd);
}

export async function exportEmployees(
  query?: Pick<EmployeeListQuery, "keyword" | "status" | "organizationId">,
) {
  const qs = pageQuery({
    keyword: query?.keyword,
    status: query?.status,
    organizationId: query?.organizationId,
  });
  return getBlob(`/api/v1/employees/export${qs ? `?${qs}` : ""}`);
}

export async function listReportingLines(query: ReportingLineListQuery) {
  return getJson<PageResult<ReportingLine>>(`/api/v1/reporting-lines?${pageQuery(query)}`);
}

export async function createReportingLine(req: ReportingLineCreateRequest) {
  return postJson<ReportingLine, ReportingLineCreateRequest>("/api/v1/reporting-lines", req);
}

export async function updateReportingLine(id: string, req: ReportingLineUpdateRequest) {
  return putJson<ReportingLine, ReportingLineUpdateRequest>(`/api/v1/reporting-lines/${id}`, req);
}

export async function deleteReportingLine(id: string) {
  return deleteJson<{ id: string }>(`/api/v1/reporting-lines/${id}`);
}

export const EMPTY_EMPLOYEE_FORM_OPTIONS: EmployeeFormOptions = {
  maritalStatuses: [],
  politicalAffiliations: [],
  highestEducations: [],
  fertilityStatuses: [],
  ethnicities: [],
  nationalities: [],
  householdTypes: [],
  employeeRelations: [],
  recruitmentChannels: [],
  countryRegions: [],
  idTypes: [],
};

export const EMPLOYEE_STATUS_OPTIONS = [
  { id: "CANDIDATE" as const, label: "待入职" },
  { id: "PROBATION" as const, label: "试用" },
  { id: "ACTIVE" as const, label: "在职" },
  { id: "TERMINATED" as const, label: "离职" },
];

export const GENDER_OPTIONS = [
  { id: "MALE" as const, label: "男" },
  { id: "FEMALE" as const, label: "女" },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { id: "FULL_TIME" as const, label: "正式工" },
  { id: "INTERN" as const, label: "实习生" },
  { id: "CONTRACT" as const, label: "合同工" },
];

export const EMPTY_EMPLOYEE_ASSIGNMENT_FORM_OPTIONS: EmployeeAssignmentFormOptions = {
  suppliers: [],
  probationPeriods: [],
  contractLocations: [],
  workLocations: [],
  approvalAuthorities: [],
  jobGrades: [],
  employeeNatures: [],
  groupAttrLevels: [],
  salaryGroups: [],
  legalCompanies: [],
  payrollCompanies: [],
};

export const ASSIGNMENT_INDICATOR_OPTIONS = [
  { id: "PRIMARY" as const, label: "主要职务" },
  { id: "SECONDARY" as const, label: "次要职务" },
];

const ASSIGNMENT_ID_FIELDS = [
  "organizationId",
  "positionId",
  "handoverEmployeeId",
] as const;

function normalizeAssignmentId(value: unknown): string | undefined {
  return normalizeNumericId(value);
}

function normalizeAssignmentBody<T extends Record<string, unknown>>(req: T) {
  const body: Record<string, unknown> = { ...req };
  for (const key of ASSIGNMENT_ID_FIELDS) {
    const normalized = normalizeAssignmentId(body[key]);
    if (normalized === undefined) {
      delete body[key];
      continue;
    }
    body[key] = normalized;
  }
  if (req.editMode !== undefined) {
    body.editMode = req.editMode;
  }
  return body as T;
}

export const LINE_TYPE_OPTIONS = [
  { id: "DIRECT" as const, label: "实线" },
  { id: "DOTTED" as const, label: "虚线" },
];

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "PROBATION":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "CANDIDATE":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "TERMINATED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "";
  }
}

export function employeeStatusLabel(status: string) {
  return EMPLOYEE_STATUS_OPTIONS.find((o) => o.id === status)?.label ?? status;
}

export { statusBadgeClass };
