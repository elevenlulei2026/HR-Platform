import type { ArchiveDataImportResult, EmployeeArchiveResourcePath } from "@shared/api.interface";

import type { ApiError } from "@/api/http";
import {
  downloadArchiveDataImportErrorReport,
  downloadArchiveDataImportTemplate,
  importArchiveData,
} from "@/api/archive-data";
import {
  ExcelBatchImportDialog,
  type ExcelBatchImportFillHint,
} from "@/components/admin/ExcelBatchImportDialog";

export type ArchiveDataImportFillHint = ExcelBatchImportFillHint;

export type ArchiveDataImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: EmployeeArchiveResourcePath;
  title: string;
  /** 业务键说明，嵌入副标题 */
  businessKeyHint: string;
  /** 步骤 2「填写」提示列表 */
  fillHints: ArchiveDataImportFillHint[];
  /** 步骤 2 小字：字典填名称等 */
  fillSubHint?: string;
  /** 模板「说明」表描述 */
  templateSheetHint?: string;
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

/** 档案批管导入弹窗（证件等 resource 复用） */
export function ArchiveDataImportDialog(props: ArchiveDataImportDialogProps) {
  const {
    open,
    onOpenChange,
    resource,
    title,
    businessKeyHint,
    fillHints,
    fillSubHint,
    templateSheetHint,
    onImported,
  } = props;

  return (
    <ExcelBatchImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`导入${title}`}
      businessKeyHint={businessKeyHint}
      fillHints={fillHints}
      fillSubHint={fillSubHint}
      templateSheetHint={templateSheetHint}
      templateFilename={`${resource}-import-template.xlsx`}
      errorReportFilename={`${resource}-import-errors.xlsx`}
      onDownloadTemplate={async () => {
        try {
          return await downloadArchiveDataImportTemplate(resource);
        } catch (e) {
          throw new Error(toErrorMessage(e, "下载模板失败"));
        }
      }}
      onImport={async (file) => {
        try {
          const res = await importArchiveData(resource, file);
          return res.data as ArchiveDataImportResult;
        } catch (e) {
          throw new Error(toErrorMessage(e, "导入失败，请稍后重试"));
        }
      }}
      onDownloadErrorReport={async (result) => {
        try {
          return await downloadArchiveDataImportErrorReport(resource, {
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
