import type { EmployeeAgreement, EmployeeAttachment } from "@shared/api.interface";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Edit, FileUp, Plus, Trash2, X } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  createEmployeeArchiveResource,
  deleteEmployeeArchiveResource,
  downloadEmployeeAttachment,
  EMPLOYEE_ATTACHMENT_MAX_BYTES,
  updateEmployeeArchiveResource,
  uploadEmployeeFile,
} from "@/api/employee-archive";
import { listDictItemsByTypeCode } from "@/api/dict";
import { listLegalEntities } from "@/api/organization";
import {
  ARCHIVE_VALIDITY_STATUS_OPTIONS,
  ArchiveStatusBadge,
  archiveValidityStatusLabel,
  isArchiveValidityActive,
} from "@/components/admin/employee-archive/archive-status-ui";
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
import { FormField, OptionToggle } from "@/components/admin/form-field";
import { OptionSelect } from "@/components/admin/option-select";
import { SearchableSelect, formatCodeName, type SearchableSelectOption } from "@/components/admin/searchable-select";
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AgreementSectionProps = {
  employeeId: string;
  items: EmployeeAgreement[];
  attachments: EmployeeAttachment[];
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

type SheetState =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: EmployeeAgreement };

type Option = { value: string; label: string };

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

function initialForm(item?: EmployeeAgreement) {
  return {
    effectiveStartDate: item?.effectiveStartDate ?? "",
    agreementCode: item?.agreementCode ?? "",
    operationType: item?.operationType ?? "",
    status: item?.status ?? "VALID",
    agreementCategory: item?.agreementCategory ?? "",
    legalEntityId: item?.legalEntityId ?? "",
    startDate: item?.startDate ?? "",
    endDate: item?.endDate ?? "",
    fileAttachmentId: item?.fileAttachmentId ?? "",
    remark: item?.remark ?? "",
  };
}

function validateForm(form: ReturnType<typeof initialForm>) {
  if (!form.effectiveStartDate.trim()) return "请选择生效日期";
  if (!form.agreementCode.trim()) return "请填写协议编号";
  if (!form.operationType.trim()) return "请选择操作类型";
  if (!form.status.trim()) return "请选择协议状态";
  if (!form.agreementCategory.trim()) return "请选择协议类别";
  if (!form.legalEntityId.trim()) return "请选择协议法人主体";
  if (!form.startDate.trim()) return "请选择协议开始日期";
  if (!form.endDate.trim()) return "请选择协议结束日期";
  return null;
}

export function AgreementSection({
  employeeId,
  items,
  attachments,
  canEdit,
  onChanged,
}: AgreementSectionProps) {
  const [sheet, setSheet] = useState<SheetState>({ type: "closed" });
  const [form, setForm] = useState(() => initialForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeAgreement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [legalOptions, setLegalOptions] = useState<SearchableSelectOption[]>([]);
  const [operationTypeOptions, setOperationTypeOptions] = useState<Option[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const attachmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of attachments) {
      map.set(a.id, a.originalFilename ?? a.storageKey ?? a.id);
    }
    return map;
  }, [attachments]);

  const legalNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const opt of legalOptions) {
      map[opt.value] = opt.label;
    }
    return map;
  }, [legalOptions]);

  const categoryNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const o of categoryOptions) map[o.value] = o.label;
    return map;
  }, [categoryOptions]);

  const operationTypeNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const o of operationTypeOptions) map[o.value] = o.label;
    return map;
  }, [operationTypeOptions]);

  const openNew = () => {
    setForm(initialForm());
    setSheet({ type: "new" });
  };

  const openEdit = (item: EmployeeAgreement) => {
    setForm(initialForm(item));
    setSheet({ type: "edit", item });
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await listLegalEntities({ page: 1, pageSize: 200 });
        if (cancelled) return;
        setLegalOptions(
          res.data.items.map((e) => ({
            value: e.id,
            label: e.name,
            code: e.code,
            keywords: [e.code, e.name].filter(Boolean).join(" "),
          })),
        );
      } catch {
        if (!cancelled) setLegalOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [opRes, catRes] = await Promise.all([
          listDictItemsByTypeCode("AGREEMENT_OPERATION_TYPE"),
          listDictItemsByTypeCode("AGREEMENT_CATEGORY"),
        ]);
        if (cancelled) return;
        setOperationTypeOptions(
          opRes.data
            .filter((i) => i.status === "ACTIVE")
            .sort((a, b) => a.sort - b.sort)
            .map((i) => ({ value: i.value, label: i.label })),
        );
        setCategoryOptions(
          catRes.data
            .filter((i) => i.status === "ACTIVE")
            .sort((a, b) => a.sort - b.sort)
            .map((i) => ({ value: i.value, label: i.label })),
        );
      } catch {
        if (!cancelled) {
          setOperationTypeOptions([]);
          setCategoryOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    const errText = validateForm(form);
    if (errText) {
      toast.error(errText);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        effectiveStartDate: form.effectiveStartDate.trim(),
        agreementCode: form.agreementCode.trim(),
        operationType: form.operationType.trim(),
        status: form.status.trim(),
        agreementCategory: form.agreementCategory.trim(),
        legalEntityId: form.legalEntityId.trim(),
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim(),
        fileAttachmentId: form.fileAttachmentId.trim() || undefined,
        remark: form.remark.trim() || undefined,
      } satisfies Partial<EmployeeAgreement>;

      if (sheet.type === "new") {
        await createEmployeeArchiveResource(employeeId, "agreements", payload);
      } else if (sheet.type === "edit") {
        await updateEmployeeArchiveResource(employeeId, "agreements", sheet.item.id, payload);
      }

      toast.success("协议信息已保存");
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
      await deleteEmployeeArchiveResource(employeeId, "agreements", deleteTarget.id);
      setDeleteTarget(null);
      toast.success("协议记录已删除");
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
      const stored = await uploadEmployeeFile(file, "employee-agreement-attachment");
      const created = await createEmployeeArchiveResource(employeeId, "attachments", {
        attachmentType: "OTHER",
        originalFilename: stored.originalFilename,
        storageKey: stored.storageKey,
      });
      setForm((prev) => ({ ...prev, fileAttachmentId: created.data.id }));
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

  const removeAttachment = () => {
    setForm((prev) => ({ ...prev, fileAttachmentId: "" }));
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
        title="协议信息"
        toolbar={
          <>
            {items.length > 1 ? (
              <Badge variant="secondary" className="h-7 px-2 text-xs font-medium">
                {items.length} 份
              </Badge>
            ) : null}
            {canEdit ? (
              <ArchiveAddButton
                label="新增协议"
                icon={Plus}
                onClick={openNew}
              />
            ) : null}
          </>
        }
      >
        {items.length === 0 ? (
          <PanelEmpty
            compact
            title="暂无协议记录"
            description={canEdit ? "点击右上角新增协议信息" : ""}
          />
        ) : (
          <ArchiveRecordList>
            {items.map((item, index) => {
              const statusLabel = archiveValidityStatusLabel(item.status);
              const legalEntityName =
                (item.legalEntityId ? legalNameById[String(item.legalEntityId)] : undefined) ||
                (item.legalEntityId ? String(item.legalEntityId) : "—");
              const categoryLabel =
                item.agreementCategoryLabel ||
                (item.agreementCategory ? categoryNameByCode[item.agreementCategory] : undefined) ||
                item.agreementCategory ||
                "—";
              const operationLabel =
                item.operationType ? operationTypeNameByCode[item.operationType] || item.operationType : "—";
              const periodDisplay = `${item.startDate || "—"} ~ ${item.endDate || "—"}`;
              const hasAttachment = !!item.fileAttachmentId;
              const statusBadge = (
                <ArchiveStatusBadge
                  active={isArchiveValidityActive(item.status)}
                  label={statusLabel || "—"}
                />
              );

              return (
                <ArchiveRecordCard
                  key={item.id}
                  index={items.length > 1 ? index + 1 : undefined}
                  accent={item.status === "INVALID" ? "amber" : "primary"}
                  actions={
                    <>
                      {hasAttachment ? (
                        <ArchiveRecordActionButton
                          onClick={() => void download(item.fileAttachmentId!)}
                          icon={Download}
                          label="下载附件"
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
                  <ArchiveRecordFieldGrid columns={4}>
                    <ArchiveRecordField
                      label="协议/法人"
                      value={
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[11px] leading-tight">{item.agreementCode || "—"}</div>
                          <div className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                            {legalEntityName}
                          </div>
                        </div>
                      }
                      compact
                    />
                    <ArchiveRecordField label="协议类别" value={categoryLabel} compact highlight />
                    <ArchiveRecordField
                      label="期限/生效"
                      value={
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-medium">{periodDisplay}</div>
                          <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                            生效 {item.effectiveStartDate || "—"}
                          </div>
                        </div>
                      }
                      compact
                    />
                    <ArchiveRecordField
                      label="操作/状态"
                      value={
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="truncate text-[12px] font-medium">{operationLabel}</div>
                          <div>{statusBadge}</div>
                        </div>
                      }
                      compact
                    />
                  </ArchiveRecordFieldGrid>
                  {hasAttachment ? (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
                      <button
                        type="button"
                        onClick={() => void download(item.fileAttachmentId!)}
                        className="inline-flex max-w-[200px] items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Download className="size-3 shrink-0" />
                        <span className="truncate">
                          {attachmentNameById.get(item.fileAttachmentId!) ?? item.fileAttachmentId}
                        </span>
                      </button>
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
        title={sheet.type === "edit" ? "编辑协议信息" : "新增协议信息"}
        description="按要求维护协议信息字段，附件将受控下载。"
        contentClassName="sm:max-w-3xl"
        onOpenChange={(open) => {
          if (!open) setSheet({ type: "closed" });
        }}
        saving={saving}
        onSave={() => void save()}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="生效日期" required>
            <Input
              type="date"
              value={form.effectiveStartDate}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveStartDate: e.target.value }))}
            />
          </FormField>

          <FormField label="状态" required>
            <OptionToggle
              options={ARCHIVE_VALIDITY_STATUS_OPTIONS}
              value={form.status === "INVALID" ? "INVALID" : "VALID"}
              onChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
            />
          </FormField>

          <FormField label="协议编号" required>
            <Input
              value={form.agreementCode}
              onChange={(e) => setForm((prev) => ({ ...prev, agreementCode: e.target.value }))}
              placeholder="请输入协议编号"
            />
          </FormField>

          <FormField label="操作类型" required>
            <OptionSelect
              value={form.operationType}
              options={operationTypeOptions}
              placeholder={operationTypeOptions.length ? "选择操作类型" : "加载选项…"}
              onValueChange={(v) => setForm((prev) => ({ ...prev, operationType: v }))}
              disabled={operationTypeOptions.length === 0}
            />
          </FormField>

          <FormField label="协议类别" required>
            <OptionSelect
              value={form.agreementCategory}
              options={categoryOptions}
              placeholder={categoryOptions.length ? "选择协议类别" : "加载选项…"}
              onValueChange={(v) => setForm((prev) => ({ ...prev, agreementCategory: v }))}
              disabled={categoryOptions.length === 0}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="协议法人主体" required>
              <SearchableSelect
                value={form.legalEntityId}
                options={legalOptions}
                placeholder="选择法人公司"
                onChange={(v: string) => setForm((prev) => ({ ...prev, legalEntityId: v }))}
                formatOption={formatCodeName}
                variant="entity"
                portal
              />
            </FormField>
          </div>

          <FormField label="开始日期" required>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </FormField>

          <FormField label="结束日期" required>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="附件" hint="支持上传协议扫描件，单文件不超过 20MB">
              <div
                className={cn(
                  "rounded-lg border border-dashed border-border/70 bg-muted/20 p-3",
                  !form.fileAttachmentId && "min-h-[88px]",
                )}
              >
                {form.fileAttachmentId ? (
                  <ul className="mb-2 space-y-1.5">
                    <li className="flex items-center gap-2 rounded-md border border-border/50 bg-background/80 px-2.5 py-1.5 text-sm">
                      <span className="min-w-0 flex-1 truncate text-[13px]">
                        {attachmentNameById.get(form.fileAttachmentId) ?? form.fileAttachmentId}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => void download(form.fileAttachmentId)}
                      >
                        <Download className="size-3.5" />
                      </Button>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 text-destructive hover:text-destructive"
                          onClick={removeAttachment}
                        >
                          <X className="size-3.5" />
                        </Button>
                      ) : null}
                    </li>
                  </ul>
                ) : (
                  <p className="mb-2 text-xs text-muted-foreground">尚未上传附件，可上传协议扫描件</p>
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

          <div className="md:col-span-2">
            <FormField label="备注">
              <Input
                value={form.remark}
                onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                placeholder="可填写补充说明"
              />
            </FormField>
          </div>
        </div>
      </ArchiveFormDialogPortal>

      <ConfirmDialogPortal
        open={!!deleteTarget}
        title="确认删除"
        description={deleteTarget ? `确认删除协议编号「${deleteTarget.agreementCode ?? deleteTarget.id}」的记录吗？` : ""}
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

