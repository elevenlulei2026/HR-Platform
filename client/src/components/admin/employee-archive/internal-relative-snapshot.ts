import { getEmployee, listEmployeeAssignments, listEmployeeMovements } from "@/api/employee";

export type InternalRelativeSnapshot = {
  departmentName: string;
  positionName: string;
  jobGradeName: string;
  hireDate: string;
  employmentStatus: string;
  employmentStatusLabel: string;
  lastWorkDay: string;
};

export async function fetchInternalRelativeSnapshot(
  relativeEmployeeId: string,
): Promise<InternalRelativeSnapshot> {
  const [employeeRes, assignmentsRes, movementsRes] = await Promise.all([
    getEmployee(relativeEmployeeId),
    listEmployeeAssignments(relativeEmployeeId),
    listEmployeeMovements(relativeEmployeeId),
  ]);

  const employee = employeeRes.data;
  const primary =
    assignmentsRes.data.find((item) => item.isPrimary) ?? assignmentsRes.data[0];

  const termination = movementsRes.data
    .filter((item) => item.movementType === "TER")
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];

  return {
    departmentName: primary?.organizationName ?? "",
    positionName: primary?.positionName ?? "",
    jobGradeName: primary?.jobGradeCode ?? "",
    hireDate: employee.hireDate ?? "",
    employmentStatus: employee.status ?? "",
    employmentStatusLabel: employee.statusLabel ?? employee.status ?? "",
    lastWorkDay:
      employee.status === "TERMINATED" && termination ? termination.effectiveDate : "",
  };
}
