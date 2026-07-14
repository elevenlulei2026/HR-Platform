import type { EmployeeAttachment, EmployeeContract } from "@shared/api.interface";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileUp, X } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  createEmployeeArchiveResource,
  deleteEmployeeArchiveResource,
  downloadEmployeeAttachment,
  EMPLOYEE_ATTACHMENT_MAX_BYTES,
  updateEmployeeArchiveResource,
  uploadEmployeeFile,
} from "@/api/employee-archive";
import { listLegalEntities } from "@/api/organization";
import { listChildrenByParent, listParentsByType } from "@/api/parent-child-catalog";
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
  ArchiveDeleteRecordButton,
  ArchiveEditRecordButton,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ContractSectionProps = {
  employeeId: string;
  items: EmployeeContract[];
  attachments: EmployeeAttachment[];
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

type SheetState =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: EmployeeContract };

type ParentOption = { value: string; label: string };

const OPERATION_TYPE_OPTIONS: ParentOption[] = [
  { value: "10", label: "新签" },
  { value: "20", label: "续签" },
  { value: "30", label: "变更" },
  { value: "40", label: "解除" },
];

// 无固定期限劳动合同（二级值 code：120/150）
const INDEFINITE_CONTRACT_DESC_CODES = new Set<string>(["120", "150"]);
function isIndefiniteContractDesc(contractCategoryDesc?: string) {
  return INDEFINITE_CONTRACT_DESC_CODES.has(contractCategoryDesc?.trim() ?? "");
}

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

function initialForm(item?: EmployeeContract) {
  return {
    effectiveStartDate: item?.effectiveStartDate ?? "",
    contractCode: item?.contractCode ?? "",
    legalEntityId: item?.legalEntityId ?? "",
    operationType: item?.operationType ?? "",
    status: item?.status ?? "VALID",
    contractCategory: item?.contractCategory ?? "",
    contractCategoryDesc: item?.contractCategoryDesc ?? "",
    startDate: item?.startDate ?? "",
    endDate: item?.endDate ?? "",
    fileAttachmentId: item?.fileAttachmentId ?? "",
    remark: item?.remark ?? "",
  };
}

function validateForm(form: ReturnType<typeof initialForm>, isIndefinite: boolean) {
  if (!form.effectiveStartDate.trim()) return "请选择生效日期";
  if (!form.contractCode.trim()) return "请填写合同编码";
  if (!form.legalEntityId.trim()) return "请选择合同法人主体";
  if (!form.operationType.trim()) return "请选择操作类型";
  if (!form.status.trim()) return "请选择状态";
  if (!form.contractCategory.trim()) return "请选择合同类别";
  if (!form.contractCategoryDesc.trim()) return "请选择合同类别描述";
  if (!form.startDate.trim()) return "请选择开始日期";
  if (!isIndefinite && !form.endDate.trim()) return "请选择结束日期";
  return null;
}

export function ContractSection({
  employeeId,
  items,
  attachments,
  canEdit,
  onChanged,
}: ContractSectionProps) {
  const [sheet, setSheet] = useState<SheetState>({ type: "closed" });
  const [form, setForm] = useState(() => initialForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeContract | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [legalOptions, setLegalOptions] = useState<SearchableSelectOption[]>([]);
  const [categoryParents, setCategoryParents] = useState<ParentOption[]>([]);
  const [categoryChildren, setCategoryChildren] = useState<ParentOption[]>([]);
  const [categoryNameByCode, setCategoryNameByCode] = useState<Record<string, string>>({});
  const [categoryDescNameByCode, setCategoryDescNameByCode] = useState<Record<string, string>>({});

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

  const isIndefinite = isIndefiniteContractDesc(form.contractCategoryDesc);

  const openNew = () => {
    setForm(initialForm());
    setSheet({ type: "new" });
  };

  const openEdit = (item: EmployeeContract) => {
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
        const res = await listParentsByType("CONTRACT_CATEGORY");
        if (cancelled) return;
        setCategoryParents(res.data.map((p) => ({ value: p.code, label: p.name })));

        // 列表页需要“名称而非编码”：一次性缓存父子目录映射
        const parentMap: Record<string, string> = {};
        for (const p of res.data) parentMap[p.code] = p.name;
        setCategoryNameByCode(parentMap);

        const childResults = await Promise.all(
          res.data.map(async (p) => {
            try {
              const cr = await listChildrenByParent("CONTRACT_CATEGORY", p.code);
              return cr.data;
            } catch {
              return [];
            }
          }),
        );
        if (cancelled) return;
        const childMap: Record<string, string> = {};
        for (const children of childResults) {
          for (const c of children) childMap[c.code] = c.name;
        }
        setCategoryDescNameByCode(childMap);
      } catch {
        if (!cancelled) setCategoryParents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const parent = form.contractCategory.trim();
    if (!parent) {
      setCategoryChildren([]);
      return;
    }
    void (async () => {
      try {
        const res = await listChildrenByParent("CONTRACT_CATEGORY", parent);
        if (cancelled) return;
        setCategoryChildren(res.data.map((c) => ({ value: c.code, label: c.name })));
      } catch {
        if (!cancelled) setCategoryChildren([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.contractCategory]);

  const save = async () => {
    const errText = validateForm(form, isIndefinite);
    if (errText) {
      toast.error(errText);
      return;
    }
    setSaving(true);
    try {
      const endDatePayload = form.endDate.trim() || undefined;
      const payload = {
        effectiveStartDate: form.effectiveStartDate.trim(),
        contractCode: form.contractCode.trim(),
        legalEntityId: form.legalEntityId.trim(),
        operationType: form.operationType.trim(),
        status: form.status.trim(),
        contractCategory: form.contractCategory.trim(),
        contractCategoryDesc: form.contractCategoryDesc.trim(),
        startDate: form.startDate.trim(),
        endDate: endDatePayload,
        fileAttachmentId: form.fileAttachmentId.trim() || undefined,
        remark: form.remark.trim() || undefined,
      } satisfies Partial<EmployeeContract>;

      if (sheet.type === "new") {
        await createEmployeeArchiveResource(employeeId, "contracts", payload);
      } else if (sheet.type === "edit") {
        await updateEmployeeArchiveResource(employeeId, "contracts", sheet.item.id, payload);
      }

      toast.success("合同信息已保存");
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
      await deleteEmployeeArchiveResource(employeeId, "contracts", deleteTarget.id);
      setDeleteTarget(null);
      toast.success("合同记录已删除");
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
      const stored = await uploadEmployeeFile(file, "employee-contract-attachment");
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
        title="合同信息"
        toolbar={
          <>
            {items.length > 1 ? (
              <Badge variant="secondary" className="h-7 px-2 text-xs font-medium">
                {items.length} 份
              </Badge>
            ) : null}
            {canEdit ? (
              <ArchiveAddButton label="新增合同" onClick={openNew} />
            ) : null}
          </>
        }
      >
        {items.length === 0 ? (
          <PanelEmpty
            compact
            title="暂无合同记录"
            description={canEdit ? "点击右上角新增合同信息" : ""}
          />
        ) : (
          <ArchiveRecordList>
            {items.map((item) => {
              const statusLabel =
                item.statusLabel || archiveValidityStatusLabel(item.status);
              const operationLabel =
                item.operationTypeLabel ||
                (item.operationType
                  ? OPERATION_TYPE_OPTIONS.find((o) => o.value === item.operationType)?.label ??
                    item.operationType
                  : "—");
              const indefinite = isIndefiniteContractDesc(item.contractCategoryDesc);
              const legalEntityName =
                (item.legalEntityId ? legalNameById[String(item.legalEntityId)] : undefined) ||
                (item.legalEntityId ? String(item.legalEntityId) : "—");
              const categoryName =
                item.contractCategoryLabel ||
                (item.contractCategory ? categoryNameByCode[item.contractCategory] : undefined) ||
                item.contractCategory ||
                "—";
              const categoryDescName =
                item.contractCategoryDescLabel ||
                (item.contractCategoryDesc ? categoryDescNameByCode[item.contractCategoryDesc] : undefined) ||
                item.contractCategoryDesc ||
                "—";
              const categoryDisplay = categoryName && categoryDescName ? `${categoryName} · ${categoryDescName}` : categoryName || categoryDescName;
              const periodDisplay = `${item.startDate || "—"} ~ ${indefinite ? "无固定期限" : item.endDate || "—"}`;
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
                  index={item.signingTimes ?? undefined}
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
                          <ArchiveEditRecordButton onClick={() => openEdit(item)} />
                          <ArchiveDeleteRecordButton onClick={() => setDeleteTarget(item)} />
                        </>
                      ) : null}
                    </>
                  }
                >
                  <ArchiveRecordFieldGrid columns={4}>
                    <ArchiveRecordField
                      label="合同/法人"
                      value={
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[11px] leading-tight">{item.contractCode || "—"}</div>
                          <div className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                            {legalEntityName}
                          </div>
                        </div>
                      }
                      compact
                    />
                    <ArchiveRecordField label="合同类别" value={categoryDisplay} compact highlight={indefinite} />
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
        title={sheet.type === "edit" ? "编辑合同信息" : "新增合同信息"}
        description="按要求维护合同信息字段，合同签订次数将自动计算。"
        // 约为默认弹窗宽度的 150%
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

          <FormField label="合同编码" required>
            <Input
              value={form.contractCode}
              onChange={(e) => setForm((prev) => ({ ...prev, contractCode: e.target.value }))}
              placeholder="请输入合同编码"
            />
          </FormField>

          <FormField label="操作类型" required>
            <OptionSelect
              value={form.operationType}
              options={OPERATION_TYPE_OPTIONS}
              placeholder="选择操作类型"
              onValueChange={(v) => setForm((prev) => ({ ...prev, operationType: v }))}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="合同法人主体" required>
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

          <FormField label="合同类别" required>
            <OptionSelect
              value={form.contractCategory}
              options={categoryParents}
              placeholder="选择一级合同类别"
              onValueChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  contractCategory: v,
                  contractCategoryDesc: "",
                }))
              }
            />
          </FormField>

          <FormField label="合同类别描述" required>
            <OptionSelect
              value={form.contractCategoryDesc}
              options={categoryChildren}
              placeholder={form.contractCategory ? "选择二级描述" : "请先选择合同类别"}
              onValueChange={(v) => setForm((prev) => ({ ...prev, contractCategoryDesc: v }))}
              disabled={!form.contractCategory}
            />
          </FormField>

          <FormField label="开始日期" required>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </FormField>

          <FormField label="结束日期" required={!isIndefinite} hint={isIndefinite ? "无固定期限合同可不填" : undefined}>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="附件" hint="支持上传合同扫描件，单文件不超过 20MB">
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
                  <p className="mb-2 text-xs text-muted-foreground">尚未上传附件，可上传合同扫描件</p>
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
        description={deleteTarget ? `确认删除合同编码「${deleteTarget.contractCode ?? deleteTarget.id}」的记录吗？` : ""}
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

