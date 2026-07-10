import type {
  EmployeeAgentAssignment,
  EmployeeAgreement,
  EmployeeArchive,
  EmployeeArchiveCreateRequest,
  EmployeeArchiveResourceByPath,
  EmployeeArchiveResourcePath,
  EmployeeArchiveUpdateRequest,
  EmployeeAttachment,
  EmployeeAttendanceCard,
  EmployeeBankAccount,
  EmployeeAdminInfo,
  EmployeeAccommodation,
  EmployeeContract,
  EmployeeCostCenterAllocation,
  EmployeeEducation,
  EmployeeFamilyMember,
  EmployeeIdDocument,
  EmployeeImportErrorReportRequest,
  EmployeeInternalRelative,
  EmployeePenalty,
  EmployeePerformanceRecord,
  EmployeeProject,
  EmployeeQualification,
  EmployeeReward,
  EmployeeSocialInsurance,
  EmployeeSpecialBenefit,
  EmployeeTalentReview,
  EmployeeTrainingRecord,
  EmployeeValuesAssessment,
  EmployeeWorkExperience,
  EmployeeWorkInjury,
} from "@shared/api.interface";

import { deleteJson, getAuthToken, getJson, postJson, postMultipart, putJson } from "@/api/http";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") ||
  "http://localhost:8087";

export type FileUploadResult = {
  storageKey: string;
  originalFilename: string;
  size: number;
  contentType: string;
};

/** 与后端 spring.servlet.multipart.max-file-size 保持一致 */
export const EMPLOYEE_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

export async function uploadEmployeeFile(file: File, category = "employee-attachment") {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  const res = await postMultipart<FileUploadResult>("/api/v1/files/upload", form);
  if (!res.data?.storageKey) {
    throw { message: "上传响应异常，请稍后重试" };
  }
  return res.data;
}

export async function downloadEmployeeAttachment(employeeId: string, attachmentId: string) {
  const token = getAuthToken();
  const res = await fetch(
    `${API_BASE}/api/v1/employees/${employeeId}/attachments/${attachmentId}/download`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) {
    throw new Error(`下载失败（HTTP ${res.status}）`);
  }
  return res.blob();
}

function archivePath(employeeId: string, resourcePath: EmployeeArchiveResourcePath) {
  return `/api/v1/employees/${employeeId}/${resourcePath}`;
}

export async function getEmployeeArchive(employeeId: string) {
  return getJson<EmployeeArchive>(`/api/v1/employees/${employeeId}/archive`);
}

export async function listEmployeeArchiveResource<TPath extends EmployeeArchiveResourcePath>(
  employeeId: string,
  resourcePath: TPath,
) {
  return getJson<EmployeeArchiveResourceByPath[TPath][]>(
    archivePath(employeeId, resourcePath),
  );
}

export async function createEmployeeArchiveResource<TPath extends EmployeeArchiveResourcePath>(
  employeeId: string,
  resourcePath: TPath,
  req:
    | EmployeeArchiveCreateRequest<EmployeeArchiveResourceByPath[TPath]>
    | Record<string, unknown>,
) {
  const body = req as EmployeeArchiveCreateRequest<EmployeeArchiveResourceByPath[TPath]> &
    Record<string, unknown>;
  return postJson<
    EmployeeArchiveResourceByPath[TPath],
    EmployeeArchiveCreateRequest<EmployeeArchiveResourceByPath[TPath]> &
      Record<string, unknown>
  >(archivePath(employeeId, resourcePath), body);
}

export async function updateEmployeeArchiveResource<TPath extends EmployeeArchiveResourcePath>(
  employeeId: string,
  resourcePath: TPath,
  id: string,
  req:
    | EmployeeArchiveUpdateRequest<EmployeeArchiveResourceByPath[TPath]>
    | Record<string, unknown>,
) {
  const body = req as EmployeeArchiveUpdateRequest<EmployeeArchiveResourceByPath[TPath]> &
    Record<string, unknown>;
  return putJson<
    EmployeeArchiveResourceByPath[TPath],
    EmployeeArchiveUpdateRequest<EmployeeArchiveResourceByPath[TPath]> &
      Record<string, unknown>
  >(`${archivePath(employeeId, resourcePath)}/${id}`, body);
}

export async function deleteEmployeeArchiveResource(
  employeeId: string,
  resourcePath: EmployeeArchiveResourcePath,
  id: string,
) {
  return deleteJson<{ id: string; employeeId: string }>(
    `${archivePath(employeeId, resourcePath)}/${id}`,
  );
}

function buildArchiveCrud<TPath extends EmployeeArchiveResourcePath>(resourcePath: TPath) {
  return {
    list: (employeeId: string) => listEmployeeArchiveResource(employeeId, resourcePath),
    create: (
      employeeId: string,
      req: EmployeeArchiveCreateRequest<EmployeeArchiveResourceByPath[TPath]>,
    ) => createEmployeeArchiveResource(employeeId, resourcePath, req),
    update: (
      employeeId: string,
      id: string,
      req: EmployeeArchiveUpdateRequest<EmployeeArchiveResourceByPath[TPath]>,
    ) => updateEmployeeArchiveResource(employeeId, resourcePath, id, req),
    remove: (employeeId: string, id: string) =>
      deleteEmployeeArchiveResource(employeeId, resourcePath, id),
  };
}

export const archiveCrud = {
  familyMembers: buildArchiveCrud("family-members"),
  internalRelatives: buildArchiveCrud("internal-relatives"),
  idDocuments: buildArchiveCrud("id-documents"),
  costCenterAllocations: buildArchiveCrud("cost-center-allocations"),
  contracts: buildArchiveCrud("contracts"),
  agreements: buildArchiveCrud("agreements"),
  attendanceCards: buildArchiveCrud("attendance-cards"),
  bankAccounts: buildArchiveCrud("bank-accounts"),
  socialInsurances: buildArchiveCrud("social-insurances"),
  specialBenefits: buildArchiveCrud("special-benefits"),
  workInjuries: buildArchiveCrud("work-injuries"),
  adminInfos: buildArchiveCrud("admin-infos"),
  accommodations: buildArchiveCrud("accommodations"),
  attachments: buildArchiveCrud("attachments"),
  educations: buildArchiveCrud("educations"),
  workExperiences: buildArchiveCrud("work-experiences"),
  qualifications: buildArchiveCrud("qualifications"),
  rewards: buildArchiveCrud("rewards"),
  penalties: buildArchiveCrud("penalties"),
  trainingRecords: buildArchiveCrud("training-records"),
  performanceRecords: buildArchiveCrud("performance-records"),
  valuesAssessments: buildArchiveCrud("values-assessments"),
  talentReviews: buildArchiveCrud("talent-reviews"),
  projects: buildArchiveCrud("projects"),
  agentAssignments: buildArchiveCrud("agent-assignments"),
} satisfies {
  familyMembers: ReturnType<typeof buildArchiveCrud<"family-members">>;
  internalRelatives: ReturnType<typeof buildArchiveCrud<"internal-relatives">>;
  idDocuments: ReturnType<typeof buildArchiveCrud<"id-documents">>;
  costCenterAllocations: ReturnType<typeof buildArchiveCrud<"cost-center-allocations">>;
  contracts: ReturnType<typeof buildArchiveCrud<"contracts">>;
  agreements: ReturnType<typeof buildArchiveCrud<"agreements">>;
  attendanceCards: ReturnType<typeof buildArchiveCrud<"attendance-cards">>;
  bankAccounts: ReturnType<typeof buildArchiveCrud<"bank-accounts">>;
  socialInsurances: ReturnType<typeof buildArchiveCrud<"social-insurances">>;
  specialBenefits: ReturnType<typeof buildArchiveCrud<"special-benefits">>;
  workInjuries: ReturnType<typeof buildArchiveCrud<"work-injuries">>;
  adminInfos: ReturnType<typeof buildArchiveCrud<"admin-infos">>;
  accommodations: ReturnType<typeof buildArchiveCrud<"accommodations">>;
  attachments: ReturnType<typeof buildArchiveCrud<"attachments">>;
  educations: ReturnType<typeof buildArchiveCrud<"educations">>;
  workExperiences: ReturnType<typeof buildArchiveCrud<"work-experiences">>;
  qualifications: ReturnType<typeof buildArchiveCrud<"qualifications">>;
  rewards: ReturnType<typeof buildArchiveCrud<"rewards">>;
  penalties: ReturnType<typeof buildArchiveCrud<"penalties">>;
  trainingRecords: ReturnType<typeof buildArchiveCrud<"training-records">>;
  performanceRecords: ReturnType<typeof buildArchiveCrud<"performance-records">>;
  valuesAssessments: ReturnType<typeof buildArchiveCrud<"values-assessments">>;
  talentReviews: ReturnType<typeof buildArchiveCrud<"talent-reviews">>;
  projects: ReturnType<typeof buildArchiveCrud<"projects">>;
  agentAssignments: ReturnType<typeof buildArchiveCrud<"agent-assignments">>;
};

export async function downloadImportErrorReport(
  req: EmployeeImportErrorReportRequest,
): Promise<Blob> {
  const token = getAuthToken();
  const url = `${API_BASE}/api/v1/employees/import-error-report`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`请求失败（HTTP ${res.status}）`);
  }
  return res.blob();
}

export type EmployeeArchiveResourceTypes = {
  familyMembers: EmployeeFamilyMember;
  internalRelatives: EmployeeInternalRelative;
  idDocuments: EmployeeIdDocument;
  costCenterAllocations: EmployeeCostCenterAllocation;
  contracts: EmployeeContract;
  agreements: EmployeeAgreement;
  attendanceCards: EmployeeAttendanceCard;
  bankAccounts: EmployeeBankAccount;
  socialInsurances: EmployeeSocialInsurance;
  specialBenefits: EmployeeSpecialBenefit;
  workInjuries: EmployeeWorkInjury;
  adminInfos: EmployeeAdminInfo;
  accommodations: EmployeeAccommodation;
  attachments: EmployeeAttachment;
  educations: EmployeeEducation;
  workExperiences: EmployeeWorkExperience;
  qualifications: EmployeeQualification;
  rewards: EmployeeReward;
  penalties: EmployeePenalty;
  trainingRecords: EmployeeTrainingRecord;
  performanceRecords: EmployeePerformanceRecord;
  valuesAssessments: EmployeeValuesAssessment;
  talentReviews: EmployeeTalentReview;
  projects: EmployeeProject;
  agentAssignments: EmployeeAgentAssignment;
};
