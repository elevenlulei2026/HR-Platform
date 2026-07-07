import type { EmployeeAttachment } from "@shared/api.interface";
import { useMemo, useRef, useState } from "react";
import {
  Download,
  FileImage,
  FileText,
  FileUp,
  GraduationCap,
  IdCard,
  Landmark,
  Paperclip,
  Stethoscope,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  createEmployeeArchiveResource,
  deleteEmployeeArchiveResource,
  downloadEmployeeAttachment,
  EMPLOYEE_ATTACHMENT_MAX_BYTES,
  uploadEmployeeFile,
} from "@/api/employee-archive";
import { ConfirmDialogPortal } from "@/components/admin/employee-archive/ConfirmDialogPortal";
import { PanelCard } from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AttachmentTypeDef = {
  value: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  ring: string;
  wash: string;
};

const ATTACHMENT_TYPE_CATALOG: AttachmentTypeDef[] = [
  {
    value: "PHOTO",
    label: "照片",
    icon: UserRound,
    accent: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/20 hover:ring-violet-500/40",
    wash: "from-violet-500/[0.06]",
  },
  {
    value: "ID_CARD",
    label: "身份证",
    icon: IdCard,
    accent: "text-sky-600 dark:text-sky-400",
    ring: "ring-sky-500/20 hover:ring-sky-500/40",
    wash: "from-sky-500/[0.06]",
  },
  {
    value: "DIPLOMA",
    label: "学历证",
    icon: GraduationCap,
    accent: "text-indigo-600 dark:text-indigo-400",
    ring: "ring-indigo-500/20 hover:ring-indigo-500/40",
    wash: "from-indigo-500/[0.06]",
  },
  {
    value: "RESUME",
    label: "简历",
    icon: FileText,
    accent: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/20 hover:ring-blue-500/40",
    wash: "from-blue-500/[0.06]",
  },
  {
    value: "BANK_CARD",
    label: "银行卡",
    icon: Landmark,
    accent: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/20 hover:ring-emerald-500/40",
    wash: "from-emerald-500/[0.06]",
  },
  {
    value: "MEDICAL",
    label: "体检单",
    icon: Stethoscope,
    accent: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/20 hover:ring-rose-500/40",
    wash: "from-rose-500/[0.06]",
  },
  {
    value: "OFFER",
    label: "应聘登记表",
    icon: FileText,
    accent: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20 hover:ring-amber-500/40",
    wash: "from-amber-500/[0.06]",
  },
  {
    value: "RESIGNATION",
    label: "离职证明",
    icon: FileUp,
    accent: "text-orange-600 dark:text-orange-400",
    ring: "ring-orange-500/20 hover:ring-orange-500/40",
    wash: "from-orange-500/[0.06]",
  },
  {
    value: "CERTIFICATE",
    label: "资格证书",
    icon: FileImage,
    accent: "text-teal-600 dark:text-teal-400",
    ring: "ring-teal-500/20 hover:ring-teal-500/40",
    wash: "from-teal-500/[0.06]",
  },
  {
    value: "OTHER",
    label: "其他",
    icon: Paperclip,
    accent: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-500/20 hover:ring-slate-500/40",
    wash: "from-slate-500/[0.06]",
  },
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

export function ArchiveAttachmentSection({
  employeeId,
  items,
  canEdit,
  onChanged,
}: ArchiveAttachmentSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeAttachment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, EmployeeAttachment[]>();
    for (const type of ATTACHMENT_TYPE_CATALOG) {
      map.set(type.value, []);
    }
    for (const item of items) {
      const key = item.attachmentType ?? "OTHER";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const uploadedCount = items.length;
  const missingCount = ATTACHMENT_TYPE_CATALOG.filter(
    (type) => (grouped.get(type.value)?.length ?? 0) === 0,
  ).length;

  const triggerUpload = (type: string) => {
    if (!canEdit || uploadingType) return;
    setUploadingType(type);
    inputRef.current?.click();
  };

  const upload = async (file: File, attachmentType: string) => {
    if (file.size > EMPLOYEE_ATTACHMENT_MAX_BYTES) {
      toast.error("文件过大，单文件不能超过 20MB");
      return;
    }
    setUploadingType(attachmentType);
    try {
      const stored = await uploadEmployeeFile(file);
      await createEmployeeArchiveResource(employeeId, "attachments", {
        attachmentType,
        originalFilename: stored.originalFilename,
        storageKey: stored.storageKey,
      });
      toast.success(`${ATTACHMENT_TYPE_CATALOG.find((t) => t.value === attachmentType)?.label ?? "附件"}已上传`);
      await onChanged();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setUploadingType(null);
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
        description={
          canEdit
            ? `点击类型卡片直接上传 · 已上传 ${uploadedCount} 项 · 待补充 ${missingCount} 项 · 单文件 ≤ 20MB`
            : `共 ${uploadedCount} 项附件`
        }
      >
        <div className="grid grid-cols-5 gap-2 p-2.5">
          {ATTACHMENT_TYPE_CATALOG.map((typeDef) => {
            const files = grouped.get(typeDef.value) ?? [];
            const hasFiles = files.length > 0;
            const isUploading = uploadingType === typeDef.value;
            const Icon = typeDef.icon;

            return (
              <div
                key={typeDef.value}
                className={cn(
                  "group relative overflow-hidden rounded-lg border bg-gradient-to-br to-background shadow-sm transition-all duration-200",
                  hasFiles
                    ? "border-border/60"
                    : "border-dashed border-border/70 bg-muted/10",
                  typeDef.wash,
                  canEdit && !isUploading && "cursor-pointer hover:border-border hover:shadow",
                  isUploading && "pointer-events-none opacity-70",
                )}
                role={canEdit ? "button" : undefined}
                tabIndex={canEdit ? 0 : undefined}
                onClick={() => {
                  if (!hasFiles && canEdit) triggerUpload(typeDef.value);
                }}
                onKeyDown={(e) => {
                  if (!canEdit) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    triggerUpload(typeDef.value);
                  }
                }}
              >
                {/* 类型标题 */}
                <div className="flex items-center gap-1.5 border-b border-border/40 px-2 py-1.5">
                  <div
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md ring-1",
                      typeDef.accent,
                      typeDef.ring,
                      "bg-background/80",
                    )}
                  >
                    <Icon className="size-3" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold leading-tight">{typeDef.label}</div>
                  </div>
                  {hasFiles ? (
                    <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px] tabular-nums">
                      {files.length}
                    </Badge>
                  ) : (
                    <span className="shrink-0 text-[10px] text-muted-foreground/70">—</span>
                  )}
                </div>

                {/* 文件列表 / 空态 */}
                <div className="space-y-1 px-2 py-1.5">
                  {hasFiles ? (
                    files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-1 rounded-md bg-background/60 px-1.5 py-1 ring-1 ring-border/35"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileUp className="size-2.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] font-medium leading-tight">
                            {file.originalFilename ?? "未命名"}
                          </div>
                          <div className="truncate font-mono text-[9px] text-muted-foreground">
                            {file.uploadedAt?.slice(0, 10) ?? "—"}
                          </div>
                        </div>
                        <div className="flex shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-6"
                            title="下载"
                            onClick={() => void download(file)}
                          >
                            <Download className="size-3" />
                          </Button>
                          {canEdit ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="删除"
                              onClick={() => setDeleteTarget(file)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 py-2 text-center">
                      {isUploading ? (
                        <Upload className="size-3.5 animate-pulse text-muted-foreground" />
                      ) : (
                        <Upload className="size-3.5 text-muted-foreground/50" />
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {isUploading ? "上传中…" : canEdit ? "点击上传" : "暂无"}
                      </p>
                    </div>
                  )}

                  {hasFiles && canEdit ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border/50 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerUpload(typeDef.value);
                      }}
                    >
                      <Upload className="size-2.5" />
                      继续上传
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && uploadingType) void upload(file, uploadingType);
          }}
        />
      </PanelCard>

      <ConfirmDialogPortal
        elevated
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
