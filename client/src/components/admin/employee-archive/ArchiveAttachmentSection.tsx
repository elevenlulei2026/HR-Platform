import type { EmployeeAttachment } from "@shared/api.interface";
import { useRef, useState } from "react";
import { Download, FileUp, Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  createEmployeeArchiveResource,
  deleteEmployeeArchiveResource,
  downloadEmployeeAttachment,
  uploadEmployeeFile,
} from "@/api/employee-archive";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { OptionSelect } from "@/components/admin/option-select";
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ATTACHMENT_TYPE_OPTIONS = [
  { value: "PHOTO", label: "照片" },
  { value: "ID_CARD", label: "身份证" },
  { value: "DIPLOMA", label: "学历证" },
  { value: "RESUME", label: "简历" },
  { value: "BANK_CARD", label: "银行卡" },
  { value: "MEDICAL", label: "体检单" },
  { value: "OFFER", label: "应聘登记表" },
  { value: "RESIGNATION", label: "离职证明" },
  { value: "CERTIFICATE", label: "资格证书" },
  { value: "OTHER", label: "其他" },
];

type ArchiveAttachmentSectionProps = {
  employeeId: string;
  items: EmployeeAttachment[];
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

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

function typeLabel(value?: string) {
  return ATTACHMENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "—";
}

export function ArchiveAttachmentSection({
  employeeId,
  items,
  canEdit,
  onChanged,
}: ArchiveAttachmentSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [attachmentType, setAttachmentType] = useState("OTHER");
  const [deleteTarget, setDeleteTarget] = useState<EmployeeAttachment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const stored = await uploadEmployeeFile(file);
      await createEmployeeArchiveResource(employeeId, "attachments", {
        attachmentType,
        originalFilename: stored.originalFilename,
        storageKey: stored.storageKey,
      });
      toast.success("附件已上传");
      await onChanged();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmployeeArchiveResource(employeeId, "attachments", deleteTarget.id);
      setDeleteTarget(null);
      toast.success("附件已删除");
      await onChanged();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setDeleting(false);
    }
  };

  const download = async (item: EmployeeAttachment) => {
    try {
      const blob = await downloadEmployeeAttachment(employeeId, item.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.originalFilename ?? "attachment";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  };

  return (
    <>
      <PanelCard
        title="附件信息"
        toolbar={
          canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <OptionSelect
                value={attachmentType}
                onValueChange={setAttachmentType}
                options={ATTACHMENT_TYPE_OPTIONS}
                className="h-8 w-[140px]"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                <Plus className="mr-1 size-3.5" />
                {uploading ? "上传中…" : "上传附件"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </div>
          ) : null
        }
      >
        {items.length === 0 ? (
          <PanelEmpty
            compact
            icon={<Paperclip className="size-4 text-muted-foreground" />}
            title="暂无附件"
            description={canEdit ? "选择类型后点击上传，文件将受控存储" : "暂无附件记录"}
          />
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={item.id}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                  <FileUp className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {item.originalFilename ?? "未命名文件"}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {typeLabel(item.attachmentType)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {item.uploadedAt?.slice(0, 19).replace("T", " ") ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => void download(item)}
                    title="下载"
                  >
                    <Download className="size-4" />
                  </Button>
                  {canEdit ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn("size-8 text-destructive hover:text-destructive")}
                      onClick={() => setDeleteTarget(item)}
                      title="删除"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="删除附件"
        description="删除后不可恢复，确认继续？"
        confirmLabel="删除"
        destructive
        loading={deleting}
        onConfirm={() => void remove()}
      />
    </>
  );
}
