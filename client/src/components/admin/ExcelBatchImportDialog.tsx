import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ExcelBatchImportFillHint = {
  text: string;
};

export type ExcelBatchImportResult = {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ rowNumber: number; field?: string | null; message: string }>;
};

export type ExcelBatchImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** 嵌入副标题的业务说明 */
  businessKeyHint: string;
  fillHints: ExcelBatchImportFillHint[];
  fillSubHint?: string;
  templateSheetHint?: string;
  templateFilename: string;
  errorReportFilename: string;
  onDownloadTemplate: () => Promise<Blob>;
  onImport: (file: File) => Promise<ExcelBatchImportResult>;
  onDownloadErrorReport?: (result: ExcelBatchImportResult) => Promise<Blob>;
  onImported?: () => Promise<void> | void;
  /** 叠在 Sheet 之上时提升层级 */
  elevated?: boolean;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ImportStep({
  index,
  title,
  hint,
  active,
  done,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  active?: boolean;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border px-4 py-3 transition-colors",
        active
          ? "border-primary/35 bg-primary/[0.04] shadow-[inset_3px_0_0_0_hsl(var(--primary))]"
          : done
            ? "border-border/80 bg-muted/20"
            : "border-dashed border-border/70 bg-background",
      )}
    >
      <div className="mb-2 flex items-start gap-3">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            done
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
          )}
        >
          {done ? <CheckCircle2 className="size-4" /> : index}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="text-sm font-medium text-foreground">{title}</div>
          {hint ? <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      <div className="pl-10">{children}</div>
    </div>
  );
}

/** 通用 Excel 四步导入弹窗：模板 → 填写 → 上传 → 结果（主区不滚动） */
export function ExcelBatchImportDialog(props: ExcelBatchImportDialogProps) {
  const {
    open,
    onOpenChange,
    title,
    businessKeyHint,
    fillHints,
    fillSubHint = "字典类字段请填名称（与页面展示一致），也可填编码",
    templateSheetHint = "含数据表与「说明」工作表",
    templateFilename,
    errorReportFilename,
    onDownloadTemplate,
    onImport,
    onDownloadErrorReport,
    onImported,
    elevated = false,
  } = props;

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ExcelBatchImportResult | null>(null);
  const [templateDownloaded, setTemplateDownloaded] = useState(false);

  function reset() {
    setImportResult(null);
    setImportFile(null);
    setTemplateDownloaded(false);
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleDownloadTemplate() {
    try {
      const blob = await onDownloadTemplate();
      downloadBlob(blob, templateFilename);
      setTemplateDownloaded(true);
      toast.success("模板已下载");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "下载模板失败");
    }
  }

  async function handleStartImport() {
    if (!importFile) {
      toast.error("请先选择要导入的 Excel 文件");
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await onImport(importFile);
      setImportResult(res);
      const fail = res.failureCount ?? 0;
      const ok = res.successCount ?? 0;
      if (fail > 0) toast.warning(`导入完成：成功 ${ok}，失败 ${fail}`);
      else toast.success(`导入成功：${ok} 条`);
      await onImported?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "导入失败，请稍后重试");
    } finally {
      setImporting(false);
    }
  }

  async function handleDownloadErrorReport() {
    if (!importResult?.errors?.length || !onDownloadErrorReport) return;
    try {
      const blob = await onDownloadErrorReport(importResult);
      downloadBlob(blob, errorReportFilename);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "下载错误报告失败");
    }
  }

  const activeStep = importResult ? 3 : importFile ? 2 : templateDownloaded ? 1 : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={!importing}
        elevated={elevated}
      >
        <div className="relative shrink-0 overflow-hidden border-b bg-gradient-to-br from-primary/[0.08] via-background to-background px-6 pb-4 pt-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-primary/10 blur-2xl"
          />
          <DialogHeader className="relative space-y-1.5 pr-8 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              按步骤完成：下载模板 → 填写数据 → 上传文件 → 确认结果。{businessKeyHint}
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            {(
              [
                { label: "模板", done: templateDownloaded },
                { label: "填写", done: templateDownloaded && !!importFile },
                { label: "上传", done: !!importFile },
                { label: "结果", done: !!importResult },
              ] as const
            ).map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    step.done
                      ? "bg-primary/15 text-primary"
                      : i === activeStep
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
                {i < arr.length - 1 ? <span className="h-px w-3 bg-border" aria-hidden /> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 px-6 py-4">
          <ImportStep
            index={1}
            title="下载 Excel 模板"
            hint={templateSheetHint}
            active={!templateDownloaded && !importFile && !importResult}
            done={templateDownloaded}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={templateDownloaded ? "outline" : "default"}
                size="sm"
                onClick={() => void handleDownloadTemplate()}
              >
                <Download className="size-4" />
                {templateDownloaded ? "重新下载模板" : "下载模板"}
              </Button>
              <span className="text-[11px] text-muted-foreground">.xlsx · 第一行为表头</span>
            </div>
          </ImportStep>

          <ImportStep
            index={2}
            title="按列填写数据"
            hint={fillSubHint}
            active={templateDownloaded && !importFile && !importResult}
            done={!!importFile || !!importResult}
          >
            <ul className="space-y-1 text-[12px] leading-relaxed text-muted-foreground">
              {fillHints.map((h) => (
                <li key={h.text} className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/70" />
                  <span>{h.text}</span>
                </li>
              ))}
            </ul>
          </ImportStep>

          <ImportStep
            index={3}
            title="选择并上传文件"
            hint="仅支持 .xlsx / .xls"
            active={!!importFile && !importResult && !importing}
            done={!!importResult}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="sr-only"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] ?? null);
                setImportResult(null);
              }}
            />
            <button
              type="button"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                const name = file.name.toLowerCase();
                if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
                  toast.error("请选择 Excel 文件（.xlsx / .xls）");
                  return;
                }
                setImportFile(file);
                setImportResult(null);
              }}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-4 text-center transition-colors",
                "hover:border-primary/50 hover:bg-primary/[0.03]",
                importFile ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-muted/15",
                importing && "pointer-events-none opacity-60",
              )}
            >
              <div className="flex size-9 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
                <FileSpreadsheet className="size-4 text-primary" />
              </div>
              {importFile ? (
                <>
                  <div className="max-w-full truncate text-sm font-medium text-foreground">
                    {importFile.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {(importFile.size / 1024).toFixed(1)} KB · 点击可更换文件
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium text-foreground">拖拽文件到此处，或点击选择</div>
                  <div className="text-[11px] text-muted-foreground">选择后请点击下方「开始导入」</div>
                </>
              )}
            </button>
          </ImportStep>

          {importResult ? (
            <ImportStep index={4} title="导入结果" active done={importResult.failureCount === 0}>
              <div
                className={cn(
                  "rounded-lg border p-3",
                  importResult.failureCount > 0
                    ? "border-amber-500/30 bg-amber-500/[0.06]"
                    : "border-emerald-500/30 bg-emerald-500/[0.06]",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  {importResult.failureCount > 0 ? (
                    <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>合计 {importResult.totalRows} 行</span>
                  <Badge variant="secondary" className="font-normal">
                    成功 {importResult.successCount}
                  </Badge>
                  {importResult.failureCount > 0 ? (
                    <Badge variant="destructive" className="font-normal">
                      失败 {importResult.failureCount}
                    </Badge>
                  ) : null}
                </div>
                {importResult.errors.length > 0 ? (
                  <div className="mt-2.5 space-y-2">
                    <ul className="max-h-28 space-y-1 overflow-y-auto rounded-md border bg-background/80 p-2.5 text-[12px] leading-relaxed text-muted-foreground">
                      {importResult.errors.slice(0, 20).map((err, idx) => (
                        <li key={`${err.rowNumber}-${idx}`} className="flex gap-2">
                          <span className="shrink-0 font-mono text-[11px] text-foreground/80">
                            L{err.rowNumber}
                          </span>
                          <span>
                            {err.field ? `${err.field}：` : ""}
                            {err.message}
                          </span>
                        </li>
                      ))}
                      {importResult.errors.length > 20 ? (
                        <li>…另有 {importResult.errors.length - 20} 条错误</li>
                      ) : null}
                    </ul>
                    {onDownloadErrorReport ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleDownloadErrorReport()}
                      >
                        <Download className="size-4" />
                        下载错误报告
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-[12px] text-muted-foreground">全部行已成功写入，列表已刷新。</p>
                )}
              </div>
            </ImportStep>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2.5 rounded-b-xl border-t bg-muted/25 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={importing}
            onClick={() => {
              onOpenChange(false);
              reset();
            }}
          >
            {importResult ? "完成" : "取消"}
          </Button>
          {!importResult || (importResult.failureCount > 0 && importFile) ? (
            <Button
              type="button"
              disabled={!importFile || importing}
              onClick={() => void handleStartImport()}
            >
              {importing ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  导入中…
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  {importResult ? "重新导入" : "开始导入"}
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
