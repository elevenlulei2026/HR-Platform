import type { EmployeeAttachment, EmployeeTitleCertificate } from "@shared/api.interface";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Download, Edit, FileUp, Plus, Trash2, X } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  createEmployeeArchiveResource,
  deleteEmployeeArchiveResource,
  downloadEmployeeAttachment,
  EMPLOYEE_ATTACHMENT_MAX_BYTES,
  updateEmployeeArchiveResource,
  uploadEmployeeFile,
} from "@/api/employee-archive";
import { ArchiveFormDialogPortal } from "@/components/admin/employee-archive/ArchiveFormDialogPortal";
import { ConfirmDialogPortal } from "@/components/admin/employee-archive/ConfirmDialogPortal";
import {
  ArchiveAddButton,
  ArchiveRecordActionButton,
  ArchiveRecordCard,
  ArchiveRecordField,
  ArchiveRecordFieldGrid,
  ArchiveRecordList,
} from "@/components/admin/employee-archive/archive-record-ui";
import { FormField } from "@/components/admin/form-field";
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type TitleCertificateSectionProps = {
  employeeId: string;
  items: EmployeeTitleCertificate[];
  attachments: EmployeeAttachment[];
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

type SheetState =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: EmployeeTitleCertificate };

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

function initialForm(item?: EmployeeTitleCertificate) {
  return {
    titleName: item?.titleName ?? "",
    titleLevel: item?.titleLevel ?? "",
    approvalDate: item?.approvalDate ?? "",
    expiryDate: item?.expiryDate ?? "",
    certificateNo: item?.certificateNo ?? "",
    issuingOrg: item?.issuingOrg ?? "",
    remark: item?.remark ?? "",
    attachmentIds: item?.attachmentIds ?? [],
  };
}

function validateForm(form: ReturnType<typeof initialForm>) {
  if (!form.titleName.trim()) return "请填写职称名称";
  return null;
}

export function TitleCertificateSection({
  employeeId,
  items,
  attachments,
  canEdit,
  onChanged,
}: TitleCertificateSectionProps) {
  const [sheet, setSheet] = useState<SheetState>({ type: "closed" });
  const [form, setForm] = useState(() => initialForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeTitleCertificate | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const attachmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of attachments) {
      map.set(item.id, item.originalFilename ?? item.id);
    }
    return map;
  }, [attachments]);

  const openNew = () => {
    setForm(initialForm());
    setSheet({ type: "new" });
  };

  const openEdit = (item: EmployeeTitleCertificate) => {
    setForm(initialForm(item));
    setSheet({ type: "edit", item });
  };

  const save = async () => {
    const validationError = validateForm(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titleName: form.titleName.trim(),
        titleLevel: form.titleLevel || undefined,
        approvalDate: form.approvalDate || undefined,
        expiryDate: form.expiryDate || undefined,
        certificateNo: form.certificateNo || undefined,
        issuingOrg: form.issuingOrg || undefined,
        remark: form.remark || undefined,
        attachmentIds: form.attachmentIds,
      };
      if (sheet.type === "new") {
        await createEmployeeArchiveResource(employeeId, "title-certificates", payload);
        toast.success("职称证书已新增");
      } else if (sheet.type === "edit") {
        await updateEmployeeArchiveResource(employeeId, "title-certificates", sheet.item.id, payload);
        toast.success("职称证书已更新");
      }
      setSheet({ type: "closed" });
      await onChanged();
    } catch (e: unknown) {
      const apiErr = toApiError(e);
      toast.error(apiErr.traceId ? `${apiErr.message}（traceId: ${apiErr.traceId}）` : apiErr.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmployeeArchiveResource(employeeId, "title-certificates", deleteTarget.id);
      setDeleteTarget(null);
      toast.success("职称证书已删除");
      await onChanged();
    } catch (e: unknown) {
      const apiErr = toApiError(e);
      toast.error(apiErr.traceId ? `${apiErr.message}（traceId: ${apiErr.traceId}）` : apiErr.message);
    } finally {
      setDeleting(false);
    }
  };

  const pickUpload = () => {
    if (!canEdit || uploading) return;
    uploadInputRef.current?.click();
  };

  const upload = async (file: File) => {
    if (file.size > EMPLOYEE_ATTACHMENT_MAX_BYTES) {
      toast.error("文件过大，单文件不能超过 20MB");
      return;
    }
    setUploading(true);
    try {
      const stored = await uploadEmployeeFile(file, "employee-title-certificate-attachment");
      const created = await createEmployeeArchiveResource(employeeId, "attachments", {
        attachmentType: "TITLE_CERTIFICATE",
        originalFilename: stored.originalFilename,
        storageKey: stored.storageKey,
      });
      setForm((prev) => ({
        ...prev,
        attachmentIds: [...prev.attachmentIds, created.data.id],
      }));
      toast.success("附件已上传");
      await onChanged();
    } catch (e: unknown) {
      const apiErr = toApiError(e);
      toast.error(apiErr.traceId ? `${apiErr.message}（traceId: ${apiErr.traceId}）` : apiErr.message);
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setForm((prev) => ({
      ...prev,
      attachmentIds: prev.attachmentIds.filter((id) => id !== attachmentId),
    }));
  };

  const download = async (attachmentId: string) => {
    try {
      const blob = await downloadEmployeeAttachment(employeeId, attachmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachmentNameById.get(attachmentId) || "attachment";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const apiErr = toApiError(e);
      toast.error(apiErr.traceId ? `${apiErr.message}（traceId: ${apiErr.traceId}）` : apiErr.message);
    }
  };

  return (
    <>
      <PanelCard
        title="职称证书"
        toolbar={
          <>
            {items.length > 0 ? (
              <Badge variant="secondary" className="h-7 px-2 text-xs font-medium">
                {items.length} 条
              </Badge>
            ) : null}
            {canEdit ? <ArchiveAddButton label="新增职称证书" icon={Plus} onClick={openNew} /> : null}
          </>
        }
      >
        {items.length === 0 ? (
          <PanelEmpty
            compact
            title="暂无职称证书"
            description={canEdit ? "点击右上角新增职称证书" : ""}
          />
        ) : (
          <ArchiveRecordList>
            {items.map((item) => {
              const attachmentCount = item.attachmentIds?.length ?? 0;
              return (
                <ArchiveRecordCard
                  key={item.id}
                  actions={
                    <>
                      {attachmentCount > 0 ? (
                        <ArchiveRecordActionButton
                          onClick={() => {
                            const first = item.attachmentIds?.[0];
                            if (first) void download(first);
                          }}
                          icon={Download}
                          label={attachmentCount > 1 ? `下载附件(${attachmentCount})` : "下载附件"}
                        />
                      ) : null}
                      {canEdit ? (
                        <>
                          <ArchiveRecordActionButton onClick={() => openEdit(item)} icon={Edit} label="编辑" />
                          <ArchiveRecordActionButton
                            onClick={() => setDeleteTarget(item)}
                            icon={Trash2}
                            label="删除"
                            destructive
                          />
                        </>
                      ) : null}
                    </>
                  }
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                      <BadgeCheck className="size-4 text-primary/80" />
                      <span className="truncate">{item.titleName || "—"}</span>
                    </div>
                    {item.titleLevel ? (
                      <Badge variant="outline" className="h-5 rounded-md px-2 text-[11px] font-medium">
                        {item.titleLevel}
                      </Badge>
                    ) : null}
                  </div>
                  <ArchiveRecordFieldGrid columns={4}>
                    <ArchiveRecordField label="证书号码" value={item.certificateNo || "—"} compact />
                    <ArchiveRecordField label="批准日期" value={item.approvalDate || "—"} compact />
                    <ArchiveRecordField label="到期日" value={item.expiryDate || "—"} compact />
                    <ArchiveRecordField label="签发单位" value={item.issuingOrg || "—"} compact />
                  </ArchiveRecordFieldGrid>
                  {item.remark ? (
                    <p className="mt-2 truncate text-[11px] text-muted-foreground">{item.remark}</p>
                  ) : null}
                  {attachmentCount > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                      {item.attachmentIds?.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => void download(id)}
                          className="inline-flex max-w-[200px] items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Download className="size-3 shrink-0" />
                          <span className="truncate">{attachmentNameById.get(id) ?? id}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </ArchiveRecordCard>
              );
            })}
          </ArchiveRecordList>
        )}
      </PanelCard>

      <ArchiveFormDialogPortal
        open={sheet.type !== "closed"}
        title={sheet.type === "edit" ? "编辑职称证书" : "新增职称证书"}
        description="维护职称证书信息与相关附件。"
        contentClassName="sm:max-w-3xl"
        onOpenChange={(open) => {
          if (!open) setSheet({ type: "closed" });
        }}
        saving={saving}
        onSave={() => void save()}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="职称名称" required>
            <Input
              value={form.titleName}
              onChange={(e) => setForm((prev) => ({ ...prev, titleName: e.target.value }))}
              placeholder="请输入职称名称"
            />
          </FormField>

          <FormField label="职称级别">
            <Input
              value={form.titleLevel}
              onChange={(e) => setForm((prev) => ({ ...prev, titleLevel: e.target.value }))}
              placeholder="请输入职称级别"
            />
          </FormField>

          <FormField label="批准日期">
            <Input
              type="date"
              value={form.approvalDate}
              onChange={(e) => setForm((prev) => ({ ...prev, approvalDate: e.target.value }))}
            />
          </FormField>

          <FormField label="到期日">
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
            />
          </FormField>

          <FormField label="证书号码">
            <Input
              value={form.certificateNo}
              onChange={(e) => setForm((prev) => ({ ...prev, certificateNo: e.target.value }))}
              placeholder="请输入证书号码"
            />
          </FormField>

          <FormField label="签发单位">
            <Input
              value={form.issuingOrg}
              onChange={(e) => setForm((prev) => ({ ...prev, issuingOrg: e.target.value }))}
              placeholder="请输入签发单位"
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="备注">
              <Textarea
                value={form.remark}
                onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                placeholder="备注说明"
                rows={3}
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField label="附件" hint="支持上传多个证书扫描件，单文件不超过 20MB">
              <div
                className={cn(
                  "rounded-lg border border-dashed border-border/70 bg-muted/20 p-3",
                  form.attachmentIds.length === 0 && "min-h-[88px]",
                )}
              >
                {form.attachmentIds.length > 0 ? (
                  <ul className="mb-2 space-y-1.5">
                    {form.attachmentIds.map((id) => (
                      <li
                        key={id}
                        className="flex items-center gap-2 rounded-md border border-border/50 bg-background/80 px-2.5 py-1.5 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate text-[13px]">
                          {attachmentNameById.get(id) ?? id}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          onClick={() => void download(id)}
                        >
                          <Download className="size-3.5" />
                        </Button>
                        {canEdit ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => removeAttachment(id)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-2 text-xs text-muted-foreground">尚未上传附件</p>
                )}
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={pickUpload}
                    disabled={uploading}
                    className="gap-1.5"
                  >
                    <FileUp className="size-3.5" />
                    {uploading ? "上传中…" : "上传附件"}
                  </Button>
                ) : null}
              </div>
              <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </FormField>
          </div>
        </div>
      </ArchiveFormDialogPortal>

      <ConfirmDialogPortal
        open={!!deleteTarget}
        title="确认删除"
        description={deleteTarget ? `确认删除「${deleteTarget.titleName ?? "该条"}」职称证书吗？` : ""}
        confirmLabel="删除"
        destructive
        loading={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void remove()}
      />
    </>
  );
}
