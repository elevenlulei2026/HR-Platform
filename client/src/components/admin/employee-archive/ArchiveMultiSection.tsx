import type {
  EmployeeArchiveResourceByPath,
  EmployeeArchiveResourcePath,
} from "@shared/api.interface";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Edit, Plus, Shield, Trash2 } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  createEmployeeArchiveResource,
  deleteEmployeeArchiveResource,
  updateEmployeeArchiveResource,
} from "@/api/employee-archive";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormField } from "@/components/admin/form-field";
import { OptionSelect } from "@/components/admin/option-select";
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ArchiveFormPrimitive = string | number | boolean | null | undefined;
type ArchiveItem = { id: string } & Record<string, ArchiveFormPrimitive>;

export type ArchiveFieldDef = {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "boolean";
  placeholder?: string;
  required?: boolean;
  /** 脱敏展示字段：编辑时若值未变更且含 * 则不提交 */
  sensitive?: boolean;
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
  if (raw === null || raw === undefined || raw === "") return "—";
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

  const subtitleFields = useMemo(() => fieldDefs.slice(0, 4), [fieldDefs]);

  const openCreate = () => {
    setForm(initialForm(fieldDefs));
    setSheet({ type: "new" });
  };

  const openEdit = (item: ArchiveItem) => {
    setForm(initialForm(fieldDefs, item));
    setSheet({ type: "edit", item });
  };

  const save = async () => {
    for (const field of fieldDefs) {
      if (field.required && !form[field.key]?.trim()) {
        toast.error(`请填写${field.label}`);
        return;
      }
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
        toolbar={
          canEdit ? (
            <Button size="sm" onClick={openCreate}>
              <Plus />
              新增
            </Button>
          ) : null
        }
      >
        {archiveItems.length === 0 ? (
          <PanelEmpty title={`暂无${title}`} description="可通过新增按钮维护档案信息" />
        ) : (
          <div className="divide-y">
            {archiveItems.map((item) => (
              <div
                key={item.id}
                className="group flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/25"
              >
                <div className="grid flex-1 gap-1 sm:grid-cols-2">
                  {subtitleFields.map((field) => (
                    <div key={field.key} className="text-sm">
                      <span className="text-muted-foreground">{field.label}：</span>
                      <span className="font-medium">{formatDisplayValue(field, item[field.key])}</span>
                      {isMaskedField(field, item) ? (
                        <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px] font-normal">
                          <Shield className="mr-0.5 size-2.5" />
                          脱敏
                        </Badge>
                      ) : null}
                    </div>
                  ))}
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(item)}
                    >
                      <Edit />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 />
                      删除
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <Sheet open={sheet.type !== "closed"} onOpenChange={(o) => !o && setSheet({ type: "closed" })}>
        <SheetContent side="right" className="gap-0 p-0">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>{sheet.type === "new" ? `新增${title}` : `编辑${title}`}</SheetTitle>
            <SheetDescription>保存后立即写入员工档案</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {fieldDefs.map((field) => (
              <FormField key={field.key} label={field.label} required={field.required}>
                {field.options ? (
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
                      field.type === "date"
                        ? "date"
                        : field.type === "number"
                          ? "number"
                          : "text"
                    }
                    value={form[field.key] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )}
              </FormField>
            ))}
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setSheet({ type: "closed" })}>
                取消
              </Button>
              <Button disabled={saving} onClick={() => void save()}>
                保存
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
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
