import type {
  Employee,
  EmployeeCreateRequest,
  EmployeeStatus,
  EmployeeUpdateRequest,
} from "@shared/api.interface";

export type EmployeeForm = {
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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyEmployeeForm(): EmployeeForm {
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

export function employeeFormFromEmployee(employee: Employee): EmployeeForm {
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

/** 个人主档可编辑字段 → 更新请求（与 EmployeeMasterFormBody 字段一一对应） */
export function buildEmployeeUpdatePayload(
  form: EmployeeForm,
  options?: { skipMaskedMobile?: boolean; originalMobile?: string },
): EmployeeUpdateRequest {
  const payload: EmployeeUpdateRequest = {
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

/** 新建员工：在更新 payload 基础上强制附带手机号 */
export function buildEmployeeCreatePayload(form: EmployeeForm): EmployeeCreateRequest {
  return {
    ...buildEmployeeUpdatePayload(form),
    mobile: form.mobile.trim(),
  };
}
