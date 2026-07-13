import type { EmployeeAttachment, EmployeeEducation, EmployeeFormOptions } from "@shared/api.interface";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileUp, GraduationCap, X } from "lucide-react";

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
  ArchiveDeleteRecordButton,
  ArchiveEditRecordButton,
  ArchiveRecordActionButton,
  ArchiveRecordCard,
  ArchiveRecordField,
  ArchiveRecordFieldGrid,
  ArchiveRecordList,
} from "@/components/admin/employee-archive/archive-record-ui";
import { ArchiveStatusBadge } from "@/components/admin/employee-archive/archive-status-ui";
import { FormField, OptionToggle } from "@/components/admin/form-field";
import { OptionSelect } from "@/components/admin/option-select";
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EducationSectionProps = {
  employeeId: string;
  items: EmployeeEducation[];
  attachments: EmployeeAttachment[];
  dictOptions?: EmployeeFormOptions | null;
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

type SheetState =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: EmployeeEducation };

const IS_HIGHEST_OPTIONS = [
  { id: "true" as const, label: "是" },
  { id: "false" as const, label: "否" },
];

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

function initialForm(item?: EmployeeEducation) {
  return {
    educationLevel: item?.educationLevel ?? "",
    degree: item?.degree ?? "",
    isHighest: item?.isHighest === true ? "true" : "false",
    countryRegion: item?.countryRegion ?? "",
    schoolName: item?.schoolName ?? "",
    major: item?.major ?? "",
    startDate: item?.startDate ?? "",
    endDate: item?.endDate ?? "",
    diplomaNo: item?.diplomaNo ?? "",
    degreeNo: item?.degreeNo ?? "",
    attachmentIds: item?.attachmentIds ?? [],
  };
}

function validateForm(form: ReturnType<typeof initialForm>) {
  if (!form.schoolName.trim()) return "请填写学校名称";
  return null;
}

function formatPeriod(start?: string, end?: string) {
  if (!start && !end) return "—";
  return `${start || "—"} ~ ${end || "—"}`;
}

export function EducationSection({
  employeeId,
  items,
  attachments,
  dictOptions,
  canEdit,
  onChanged,
}: EducationSectionProps) {
  const [sheet, setSheet] = useState<SheetState>({ type: "closed" });
  const [form, setForm] = useState(() => initialForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeEducation | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const attachmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of attachments) {
      map.set(item.id, item.originalFilename ?? item.id);
    }
    return map;
  }, [attachments]);

  const educationOptions = dictOptions?.educations ?? [];
  const degreeOptions = dictOptions?.degrees ?? [];
  const countryOptions = dictOptions?.countryRegions ?? [];

  const labelByValue = (options: { value: string; label: string }[], value?: string, fallback?: string) => {
    if (!value) return fallback ?? "—";
    return options.find((opt) => opt.value === value)?.label ?? fallback ?? value;
  };

  const openNew = () => {
    setForm(initialForm());
    setSheet({ type: "new" });
  };

  const openEdit = (item: EmployeeEducation) => {
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
        educationLevel: form.educationLevel || undefined,
        degree: form.degree || undefined,
        isHighest: form.isHighest === "true",
        countryRegion: form.countryRegion || undefined,
        schoolName: form.schoolName.trim(),
        major: form.major || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        diplomaNo: form.diplomaNo || undefined,
        degreeNo: form.degreeNo || undefined,
        attachmentIds: form.attachmentIds,
      };
      if (sheet.type === "new") {
        await createEmployeeArchiveResource(employeeId, "educations", payload);
        toast.success("教育经历已新增");
      } else if (sheet.type === "edit") {
        await updateEmployeeArchiveResource(employeeId, "educations", sheet.item.id, payload);
        toast.success("教育经历已更新");
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
      await deleteEmployeeArchiveResource(employeeId, "educations", deleteTarget.id);
      setDeleteTarget(null);
      toast.success("教育经历已删除");
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
      const stored = await uploadEmployeeFile(file, "employee-education-attachment");
      const created = await createEmployeeArchiveResource(employeeId, "attachments", {
        attachmentType: "DIPLOMA",
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
        title="教育经历"
        toolbar={
          <>
            {items.length > 0 ? (
              <Badge variant="secondary" className="h-7 px-2 text-xs font-medium">
                {items.length} 条
              </Badge>
            ) : null}
            {canEdit ? <ArchiveAddButton label="新增教育经历" onClick={openNew} /> : null}
          </>
        }
      >
        {items.length === 0 ? (
          <PanelEmpty
            compact
            title="暂无教育经历"
            description={canEdit ? "点击右上角新增教育经历" : ""}
          />
        ) : (
          <ArchiveRecordList>
            {items.map((item) => {
              const educationLabel =
                item.educationLevelLabel ??
                labelByValue(educationOptions, item.educationLevel);
              const degreeLabel =
                item.degreeLabel ?? labelByValue(degreeOptions, item.degree);
              const countryLabel =
                item.countryRegionLabel ?? labelByValue(countryOptions, item.countryRegion);
              const attachmentCount = item.attachmentIds?.length ?? 0;

              return (
                <ArchiveRecordCard
                  key={item.id}
                  accent={item.isHighest ? "emerald" : "primary"}
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
                          <ArchiveEditRecordButton onClick={() => openEdit(item)} />
                          <ArchiveDeleteRecordButton onClick={() => setDeleteTarget(item)} />
                        </>
                      ) : null}
                    </>
                  }
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                      <GraduationCap className="size-4 text-primary/80" />
                      <span className="truncate">{item.schoolName || "—"}</span>
                    </div>
                    {item.isHighest ? (
                      <ArchiveStatusBadge active label="最高学历" />
                    ) : null}
                    {educationLabel !== "—" ? (
                      <Badge variant="outline" className="h-5 rounded-md px-2 text-[11px] font-medium">
                        {educationLabel}
                      </Badge>
                    ) : null}
                    {degreeLabel !== "—" ? (
                      <Badge variant="secondary" className="h-5 rounded-md px-2 text-[11px] font-medium">
                        {degreeLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <ArchiveRecordFieldGrid columns={4}>
                    <ArchiveRecordField label="专业" value={item.major || "—"} compact />
                    <ArchiveRecordField label="国家/地区" value={countryLabel} compact />
                    <ArchiveRecordField label="就读时间" value={formatPeriod(item.startDate, item.endDate)} compact />
                    <ArchiveRecordField
                      label="证书编号"
                      value={
                        <div className="min-w-0 text-[11px] leading-tight">
                          <div className="truncate">毕业证 {item.diplomaNo || "—"}</div>
                          <div className="mt-0.5 truncate text-muted-foreground">
                            学位证 {item.degreeNo || "—"}
                          </div>
                        </div>
                      }
                      compact
                    />
                  </ArchiveRecordFieldGrid>
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
        title={sheet.type === "edit" ? "编辑教育经历" : "新增教育经历"}
        description="维护学历学位、就读信息与相关证书附件。"
        contentClassName="sm:max-w-3xl"
        onOpenChange={(open) => {
          if (!open) setSheet({ type: "closed" });
        }}
        saving={saving}
        onSave={() => void save()}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="学历">
            <OptionSelect
              value={form.educationLevel}
              options={educationOptions}
              placeholder={dictOptions ? "选择学历" : "加载选项…"}
              allowEmpty
              emptyLabel="不填写"
              disabled={!dictOptions}
              onValueChange={(value) => setForm((prev) => ({ ...prev, educationLevel: value }))}
            />
          </FormField>

          <FormField label="学位">
            <OptionSelect
              value={form.degree}
              options={degreeOptions}
              placeholder={dictOptions ? "选择学位" : "加载选项…"}
              allowEmpty
              emptyLabel="不填写"
              disabled={!dictOptions}
              onValueChange={(value) => setForm((prev) => ({ ...prev, degree: value }))}
            />
          </FormField>

          <FormField label="最高学历">
            <OptionToggle
              options={IS_HIGHEST_OPTIONS}
              value={form.isHighest === "true" ? "true" : "false"}
              onChange={(value) => setForm((prev) => ({ ...prev, isHighest: value }))}
            />
          </FormField>

          <FormField label="国家/地区">
            <OptionSelect
              value={form.countryRegion}
              options={countryOptions}
              placeholder={dictOptions ? "选择国家/地区" : "加载选项…"}
              allowEmpty
              emptyLabel="不填写"
              disabled={!dictOptions}
              onValueChange={(value) => setForm((prev) => ({ ...prev, countryRegion: value }))}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="学校" required>
              <Input
                value={form.schoolName}
                onChange={(e) => setForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                placeholder="请输入学校全称"
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField label="专业">
              <Input
                value={form.major}
                onChange={(e) => setForm((prev) => ({ ...prev, major: e.target.value }))}
                placeholder="请输入专业描述"
              />
            </FormField>
          </div>

          <FormField label="开始日期">
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </FormField>

          <FormField label="结束日期">
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </FormField>

          <FormField label="毕业证编号">
            <Input
              value={form.diplomaNo}
              onChange={(e) => setForm((prev) => ({ ...prev, diplomaNo: e.target.value }))}
              placeholder="毕业证编号"
            />
          </FormField>

          <FormField label="学位证编号">
            <Input
              value={form.degreeNo}
              onChange={(e) => setForm((prev) => ({ ...prev, degreeNo: e.target.value }))}
              placeholder="学位证编号"
            />
          </FormField>

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
                  <p className="mb-2 text-xs text-muted-foreground">尚未上传附件，可上传毕业证、学位证等扫描件</p>
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
        description={deleteTarget ? `确认删除「${deleteTarget.schoolName ?? "该条"}」教育经历吗？` : ""}
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
