import type {
  EmployeeArchiveResourceByPath,
  EmployeeArchiveResourcePath,
} from "@shared/api.interface";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  createEmployeeArchiveResource,
  deleteEmployeeArchiveResource,
  updateEmployeeArchiveResource,
} from "@/api/employee-archive";
import { listLegalEntities } from "@/api/organization";
import { ArchiveFormDialogPortal } from "@/components/admin/employee-archive/ArchiveFormDialogPortal";
import { ConfirmDialogPortal } from "@/components/admin/employee-archive/ConfirmDialogPortal";
import {
  ArchiveAddButton,
  ArchiveFormSection,
  ArchiveRecordActionButton,
  ArchiveRecordCard,
  ArchiveRecordField,
  ArchiveRecordFieldGrid,
  ArchiveRecordList,
} from "@/components/admin/employee-archive/archive-record-ui";
import { FormField } from "@/components/admin/form-field";
import { OptionSelect } from "@/components/admin/option-select";
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
import { Input } from "@/components/ui/input";

type ArchiveFormPrimitive = string | number | boolean | null | undefined;
type ArchiveItem = { id: string } & Record<string, ArchiveFormPrimitive>;

export type ArchiveFieldDef = {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "boolean" | "id";
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  /** 脱敏展示字段：编辑时若值未变更且含 * 则不提交 */
  sensitive?: boolean;
  /** 关联主数据下拉 */
  reference?: "legalEntity";
  options?: Array<{ value: string; label: string }>;
};

type ArchiveMultiSectionProps<TPath extends EmployeeArchiveResourcePath> = {
  title: string;
  employeeId: string;
  resourcePath: TPath;
  items: EmployeeArchiveResourceByPath[TPath][];
  fieldDefs: ArchiveFieldDef[];
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

type SheetState = { type: "closed" } | { type: "new" } | { type: "edit"; item: ArchiveItem };

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

function initialForm(fieldDefs: ArchiveFieldDef[], item?: ArchiveItem) {
  const form: Record<string, string> = {};
  for (const field of fieldDefs) {
    const raw = item?.[field.key];
    form[field.key] = raw === null || raw === undefined ? "" : String(raw);
  }
  return form;
}

function formatDisplayValue(field: ArchiveFieldDef, raw: ArchiveFormPrimitive) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (field.type === "boolean" || field.options?.some((o) => o.value === "true")) {
    if (raw === true || raw === "true") return "是";
    if (raw === false || raw === "false") return "否";
  }
  return String(raw);
}

function toPayload(
  form: Record<string, string>,
  fieldDefs: ArchiveFieldDef[],
): Record<string, string | number | boolean | undefined> {
  const payload: Record<string, string | number | boolean | undefined> = {};
  for (const field of fieldDefs) {
    const raw = form[field.key]?.trim() ?? "";
    if (!raw) {
      payload[field.key] = undefined;
      continue;
    }
    if (field.type === "id" || field.reference === "legalEntity") {
      payload[field.key] = raw;
      continue;
    }
    if (field.type === "number") {
      const value = Number(raw);
      payload[field.key] = Number.isNaN(value) ? undefined : value;
      continue;
    }
    if (field.type === "boolean") {
      payload[field.key] = raw === "true";
      continue;
    }
    payload[field.key] = raw;
  }
  return payload;
}

function validateForm(form: Record<string, string>, fieldDefs: ArchiveFieldDef[]) {
  for (const field of fieldDefs) {
    const raw = form[field.key]?.trim() ?? "";
    if (field.required && !raw) {
      return `请填写${field.label}`;
    }
    if (!raw) continue;
    if (field.type === "id" || field.reference === "legalEntity") {
      if (!/^\d+$/.test(raw)) {
        return `${field.label}格式无效，请从下拉列表选择`;
      }
      continue;
    }
    if (field.type === "number") {
      const value = Number(raw);
      if (Number.isNaN(value)) {
        return `${field.label}须为有效数字`;
      }
      if (field.min !== undefined && value < field.min) {
        return `${field.label}不能小于 ${field.min}`;
      }
      if (field.max !== undefined && value > field.max) {
        return `${field.label}不能大于 ${field.max}`;
      }
    }
  }
  return null;
}

function isMaskedField(field: ArchiveFieldDef, item: ArchiveItem) {
  if (field.key === "idNumber" && item.idNumberMasked === true) return true;
  if (field.key === "accountNo" && item.accountNoMasked === true) return true;
  if (field.key === "socialSecurityNo" && item.socialSecurityNoMasked === true) return true;
  const raw = String(item[field.key] ?? "");
  return field.sensitive && raw.includes("*");
}

export function ArchiveMultiSection<TPath extends EmployeeArchiveResourcePath>({
  title,
  employeeId,
  resourcePath,
  items,
  fieldDefs,
  canEdit,
  onChanged,
}: ArchiveMultiSectionProps<TPath>) {
  const archiveItems = items as ArchiveItem[];
  const [sheet, setSheet] = useState<SheetState>({ type: "closed" });
  const [form, setForm] = useState<Record<string, string>>(() => initialForm(fieldDefs));
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArchiveItem | null>(null);
  const [legalEntityOptions, setLegalEntityOptions] = useState<Array<{ value: string; label: string }>>(
    [],
  );

  const needsLegalEntities = useMemo(
    () => fieldDefs.some((field) => field.reference === "legalEntity"),
    [fieldDefs],
  );

  useEffect(() => {
    if (sheet.type === "closed" || !needsLegalEntities) return;
    void listLegalEntities({ page: 1, pageSize: 200 })
      .then((res) => {
        setLegalEntityOptions(
          res.data.items.map((item) => ({
            value: item.id,
            label: `${item.name}（${item.code}）`,
          })),
        );
      })
      .catch(() => {
        setLegalEntityOptions([]);
      });
  }, [needsLegalEntities, sheet.type]);

  const subtitleFields = useMemo(() => fieldDefs.slice(0, 4), [fieldDefs]);
  const highlightKey = subtitleFields[0]?.key;

  const openCreate = () => {
    setForm(initialForm(fieldDefs));
    setSheet({ type: "new" });
  };

  const openEdit = (item: ArchiveItem) => {
    setForm(initialForm(fieldDefs, item));
    setSheet({ type: "edit", item });
  };

  const save = async () => {
    const validationError = validateForm(form, fieldDefs);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      const payload = toPayload(form, fieldDefs);
      if (sheet.type === "edit") {
        for (const field of fieldDefs) {
          if (!field.sensitive) continue;
          const original = String(sheet.item[field.key] ?? "");
          const current = form[field.key]?.trim() ?? "";
          if (original.includes("*") && current === original) {
            delete payload[field.key];
          }
        }
      }
      if (sheet.type === "new") {
        await createEmployeeArchiveResource(employeeId, resourcePath, payload);
        toast.success(`${title}已新增`);
      } else if (sheet.type === "edit") {
        await updateEmployeeArchiveResource(
          employeeId,
          resourcePath,
          sheet.item.id,
          payload,
        );
        toast.success(`${title}已更新`);
      }
      setSheet({ type: "closed" });
      await onChanged();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteEmployeeArchiveResource(employeeId, resourcePath, deleteTarget.id);
      setDeleteTarget(null);
      toast.success(`${title}已删除`);
      await onChanged();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PanelCard
        title={title}
        toolbar={canEdit ? <ArchiveAddButton label="新增" onClick={openCreate} /> : null}
      >
        {archiveItems.length === 0 ? (
          <PanelEmpty compact title={`暂无${title}`} description="可通过新增按钮维护档案信息" />
        ) : (
          <ArchiveRecordList>
            {archiveItems.map((item, index) => (
              <ArchiveRecordCard
                key={item.id}
                index={index + 1}
                actions={
                  canEdit ? (
                    <>
                      <ArchiveRecordActionButton
                        icon={Edit}
                        label="编辑"
                        onClick={() => openEdit(item)}
                      />
                      <ArchiveRecordActionButton
                        icon={Trash2}
                        label="删除"
                        destructive
                        onClick={() => setDeleteTarget(item)}
                      />
                    </>
                  ) : null
                }
              >
                <ArchiveRecordFieldGrid>
                  {subtitleFields.map((field) => {
                    const masked = isMaskedField(field, item);
                    const display = formatDisplayValue(field, item[field.key]);
                    return (
                      <ArchiveRecordField
                        key={field.key}
                        label={field.label}
                        value={display}
                        masked={masked}
                        highlight={field.key === highlightKey}
                        mono={field.type === "date" || field.key.includes("No")}
                      />
                    );
                  })}
                </ArchiveRecordFieldGrid>
              </ArchiveRecordCard>
            ))}
          </ArchiveRecordList>
        )}
      </PanelCard>

      <ArchiveFormDialogPortal
        open={sheet.type !== "closed"}
        onOpenChange={(open) => !open && !saving && setSheet({ type: "closed" })}
        title={sheet.type === "new" ? `新增${title}` : `编辑${title}`}
        saving={saving}
        onSave={() => void save()}
      >
        <ArchiveFormSection title="档案字段" description={`填写${title}相关信息`}>
          {fieldDefs.map((field) => (
            <FormField key={field.key} label={field.label} required={field.required}>
              {field.reference === "legalEntity" ? (
                <OptionSelect
                  value={form[field.key] ?? ""}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                  options={legalEntityOptions}
                  allowEmpty={!field.required}
                  emptyLabel="不填写"
                  className="w-full"
                />
              ) : field.options ? (
                <OptionSelect
                  value={form[field.key] ?? ""}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                  options={field.options}
                  allowEmpty={!field.required}
                  emptyLabel="不填写"
                  className="w-full"
                />
              ) : (
                <Input
                  type={
                    field.type === "date" ? "date" : field.type === "number" ? "number" : "text"
                  }
                  value={form[field.key] ?? ""}
                  placeholder={
                    field.placeholder ??
                    (field.sensitive && sheet.type === "edit"
                      ? "已脱敏字段，修改请填写完整内容"
                      : undefined)
                  }
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              )}
            </FormField>
          ))}
        </ArchiveFormSection>
      </ArchiveFormDialogPortal>

      <ConfirmDialogPortal
        elevated
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`删除${title}`}
        description="删除后不可恢复，是否继续？"
        destructive
        loading={saving}
        confirmLabel="确认删除"
        onConfirm={() => void remove()}
      />
    </>
  );
}
