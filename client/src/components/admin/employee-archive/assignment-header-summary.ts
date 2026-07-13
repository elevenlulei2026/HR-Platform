import type { EmployeeAssignment } from "@shared/api.interface";

import {
  filterAssignmentsByIndicator,
  pickPresentAssignmentId,
} from "@/components/admin/employee-archive/assignment-indicator";
import { todayStr } from "@/components/admin/employee-archive/assignment-form";

export type AssignmentHeaderSummary = {
  /** 当前（或最近将来）主要任职 */
  present?: EmployeeAssignment;
  rangeLabel: string;
  temporalLabel: "当前" | "将来" | "过去" | "无";
  futureCount: number;
  versionCount: number;
  hasFuture: boolean;
};

/** 档案头栏：主要职务生效区间摘要（含将来版本提示） */
export function summarizePrimaryAssignmentHeader(
  assignments: EmployeeAssignment[],
): AssignmentHeaderSummary {
  const primary = filterAssignmentsByIndicator(assignments, "PRIMARY");
  // 无主要时退回全部，避免头栏空白
  const pool = primary.length > 0 ? primary : assignments;
  if (pool.length === 0) {
    return {
      rangeLabel: "暂无任职",
      temporalLabel: "无",
      futureCount: 0,
      versionCount: 0,
      hasFuture: false,
    };
  }

  const today = todayStr();
  const presentId = pickPresentAssignmentId(pool);
  const present = pool.find((a) => a.id === presentId);
  const futureCount = pool.filter((a) => a.effectiveStartDate > today).length;
  const hasFuture = futureCount > 0;

  if (!present) {
    return {
      rangeLabel: "暂无任职",
      temporalLabel: "无",
      futureCount,
      versionCount: pool.length,
      hasFuture,
    };
  }

  const endPart = present.effectiveEndDate ? `至 ${present.effectiveEndDate}` : "至今";
  const rangeLabel = `${present.effectiveStartDate} · ${endPart}`;
  let temporalLabel: AssignmentHeaderSummary["temporalLabel"] = "当前";
  if (present.effectiveStartDate > today) temporalLabel = "将来";
  else if (present.effectiveEndDate && present.effectiveEndDate < today) temporalLabel = "过去";

  return {
    present,
    rangeLabel,
    temporalLabel,
    futureCount,
    versionCount: pool.length,
    hasFuture,
  };
}
