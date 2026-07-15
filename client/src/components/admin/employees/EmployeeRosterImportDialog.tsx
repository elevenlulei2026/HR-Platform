import type { EmployeeImportResult } from "@shared/api.interface";

import type { ApiError } from "@/api/http";
import {
  downloadEmployeeImportErrorReport,
  downloadEmployeeImportTemplate,
  importEmployees,
} from "@/api/employee";
import { ExcelBatchImportDialog } from "@/components/admin/ExcelBatchImportDialog";

export type EmployeeRosterImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => Promise<void> | void;
};

function toErrorMessage(e: unknown, fallback: string): string {
  if (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return (e as ApiError).message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

/** 花名册员工主档 Excel 导入 */
export function EmployeeRosterImportDialog({
  open,
  onOpenChange,
  onImported,
}: EmployeeRosterImportDialogProps) {
  return (
    <ExcelBatchImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="导入员工花名册"
      businessKeyHint="工号为业务键；已存在工号将按模板规则更新主档字段"
      fillHints={[
        { text: "工号*、姓名*、入职日期* 为必填" },
        { text: "性别、状态等请填写字典名称或编码（与模板说明一致）" },
        { text: "可同时填写组织/岗位以创建主任职" },
      ]}
      fillSubHint="字典类字段建议填写名称；导入失败行可下载错误报告修正后重试"
      templateSheetHint="employee-roster"
      templateFilename="employee-roster-import-template.xlsx"
      errorReportFilename="employee-roster-import-errors.xlsx"
      onDownloadTemplate={async () => {
        try {
          return await downloadEmployeeImportTemplate();
        } catch (e) {
          throw new Error(toErrorMessage(e, "下载模板失败"));
        }
      }}
      onImport={async (file) => {
        try {
          const res = await importEmployees(file);
          return res.data as EmployeeImportResult;
        } catch (e) {
          throw new Error(toErrorMessage(e, "导入失败，请稍后重试"));
        }
      }}
      onDownloadErrorReport={async (result) => {
        try {
          return await downloadEmployeeImportErrorReport({
            errors: result.errors,
          });
        } catch (e) {
          throw new Error(toErrorMessage(e, "下载错误报告失败"));
        }
      }}
      onImported={onImported}
    />
  );
}
