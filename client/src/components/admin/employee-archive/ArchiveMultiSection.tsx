import type {
  EmployeeArchiveResourceByPath,
  EmployeeArchiveResourcePath,
  EmployeeFormOptions,
} from "@shared/api.interface";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Edit, Trash2, UserRound } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  createEmployeeArchiveResource,
  deleteEmployeeArchiveResource,
  updateEmployeeArchiveResource,
} from "@/api/employee-archive";
import { listEmployees } from "@/api/employee";
import { listLegalEntities } from "@/api/organization";
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
import { fetchInternalRelativeSnapshot } from "@/components/admin/employee-archive/internal-relative-snapshot";
import { FormField } from "@/components/admin/form-field";
import {
  adminFormControlPlaceholderClassName,
  adminFormControlShellClassName,
  adminFormControlValueClassName,
} from "@/components/admin/form-control-styles";
import { OptionSelect } from "@/components/admin/option-select";
import {
  SearchableSelect,
  type SearchableSelectOption,
  formatCodeName,
} from "@/components/admin/searchable-select";
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

type ArchiveFormPrimitive = string | number | boolean | null | undefined;
type ArchiveItem = { id: string } & Record<string, ArchiveFormPrimitive>;

export type ArchiveDictKey = keyof Pick<
  EmployeeFormOptions,
  "countryRegions" | "idTypes" | "employeeRelations"
>;

export type ArchiveDictOptions = Pick<EmployeeFormOptions, ArchiveDictKey>;

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
  reference?: "legalEntity" | "employee";
  /** 数据字典选项键 */
  dictKey?: ArchiveDictKey;
  /** 只读展示（如内部亲属自动带出字段） */
  readOnly?: boolean;
  /** 只读字段展示用 label 键名 */
  displayKey?: string;
  options?: Array<{ value: string; label: string }>;
};

type ArchiveMultiSectionProps<TPath extends EmployeeArchiveResourcePath> = {
  title: string;
  employeeId: string;
  resourcePath: TPath;
  items: EmployeeArchiveResourceByPath[TPath][];
  fieldDefs: ArchiveFieldDef[];
  canEdit: boolean;
  dictOptions?: ArchiveDictOptions | null;
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
    if (field.displayKey) {
      const displayRaw = item?.[field.displayKey];
      form[field.displayKey] =
        displayRaw === null || displayRaw === undefined ? "" : String(displayRaw);
    }
  }
  if (item?.relativeEmployeeNo) {
    form.__relativeEmployeeLabel = `${item.relativeEmployeeNo} — ${item.relativeEmployeeName ?? ""}`;
  }
  return form;
}

function resolveDictLabel(
  field: ArchiveFieldDef,
  item: ArchiveItem,
  dictOptions?: ArchiveDictOptions | null,
) {
  const labelKey = `${field.key}Label`;
  const explicit = item[labelKey];
  if (explicit !== null && explicit !== undefined && String(explicit) !== "") {
    return String(explicit);
  }
  if (field.displayKey) {
    const display = item[field.displayKey];
    if (display !== null && display !== undefined && String(display) !== "") {
      return String(display);
    }
  }
  if (field.dictKey && dictOptions) {
    const value = item[field.key];
    const match = dictOptions[field.dictKey]?.find((opt) => opt.value === value);
    if (match) return match.label;
  }
  return null;
}

function formatDisplayValue(
  field: ArchiveFieldDef,
  item: ArchiveItem,
  dictOptions?: ArchiveDictOptions | null,
) {
  if (field.reference === "employee") {
    const no = item.relativeEmployeeNo;
    const name = item.relativeEmployeeName;
    if (no || name) return [no, name].filter(Boolean).join(" — ");
  }

  const dictLabel = resolveDictLabel(field, item, dictOptions);
  if (dictLabel) return dictLabel;

  const raw = item[field.key];
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
    if (field.displayKey) continue;
    const raw = form[field.key]?.trim() ?? "";
    if (!raw) {
      payload[field.key] = undefined;
      continue;
    }
    if (field.type === "id" || field.reference === "legalEntity" || field.reference === "employee") {
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
    if (field.readOnly) continue;
    const raw = form[field.key]?.trim() ?? "";
    if (field.required && !raw) {
      return `请填写${field.label}`;
    }
    if (!raw) continue;
    if (field.type === "id" || field.reference === "legalEntity" || field.reference === "employee") {
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

function ReadOnlyFieldValue({ value, placeholder }: { value: string; placeholder?: string }) {
  return (
    <div
      className={cn(
        adminFormControlShellClassName({ readOnly: true, empty: !value }),
        "flex items-center text-sm leading-normal",
        value ? adminFormControlValueClassName : adminFormControlPlaceholderClassName,
      )}
    >
      {value || placeholder || "选择关联员工后自动带出"}
    </div>
  );
}

export function ArchiveMultiSection<TPath extends EmployeeArchiveResourcePath>({
  title,
  employeeId,
  resourcePath,
  items,
  fieldDefs,
  canEdit,
  dictOptions,
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
  const [employeeOptions, setEmployeeOptions] = useState<SearchableSelectOption[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [relativeLoading, setRelativeLoading] = useState(false);
  const debouncedEmployeeSearch = useDebouncedValue(employeeSearch, 280);

  const needsLegalEntities = useMemo(
    () => fieldDefs.some((field) => field.reference === "legalEntity"),
    [fieldDefs],
  );
  const needsEmployeeSearch = useMemo(
    () => fieldDefs.some((field) => field.reference === "employee"),
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

  useEffect(() => {
    if (sheet.type === "closed" || !needsEmployeeSearch) return;
    setEmployeeLoading(true);
    void listEmployees({
      page: 1,
      pageSize: 20,
      keyword: debouncedEmployeeSearch || undefined,
    })
      .then((res) => {
        setEmployeeOptions(
          res.data.items
            .filter((item) => item.id !== employeeId)
            .map((item) => ({
              value: item.id,
              label: item.fullName,
              code: item.employeeNo,
              keywords: `${item.employeeNo} ${item.fullName}`,
            })),
        );
      })
      .catch(() => setEmployeeOptions([]))
      .finally(() => setEmployeeLoading(false));
  }, [debouncedEmployeeSearch, employeeId, needsEmployeeSearch, sheet.type]);

  const displayFields = fieldDefs;
  const highlightKey = fieldDefs[0]?.key;

  const openCreate = () => {
    setForm(initialForm(fieldDefs));
    setEmployeeSearch("");
    setSheet({ type: "new" });
  };

  const openEdit = (item: ArchiveItem) => {
    setForm(initialForm(fieldDefs, item));
    setEmployeeSearch("");
    setSheet({ type: "edit", item });
  };

  const handleEmployeeSelect = useCallback(
    async (relativeEmployeeId: string) => {
      if (!relativeEmployeeId) {
        setForm((prev) => ({
          ...prev,
          relativeEmployeeId: "",
          __relativeEmployeeLabel: "",
          departmentName: "",
          positionName: "",
          jobGradeName: "",
          hireDate: "",
          employmentStatus: "",
          employmentStatusLabel: "",
          lastWorkDay: "",
        }));
        return;
      }

      const selected = employeeOptions.find((opt) => opt.value === relativeEmployeeId);
      setForm((prev) => ({
        ...prev,
        relativeEmployeeId,
        __relativeEmployeeLabel: selected ? `${selected.code} — ${selected.label}` : prev.__relativeEmployeeLabel,
      }));

      setRelativeLoading(true);
      try {
        const snapshot = await fetchInternalRelativeSnapshot(relativeEmployeeId);
        setForm((prev) => ({
          ...prev,
          relativeEmployeeId,
          departmentName: snapshot.departmentName,
          positionName: snapshot.positionName,
          jobGradeName: snapshot.jobGradeName,
          hireDate: snapshot.hireDate,
          employmentStatus: snapshot.employmentStatus,
          employmentStatusLabel: snapshot.employmentStatusLabel,
          lastWorkDay: snapshot.lastWorkDay,
        }));
      } catch (e: unknown) {
        const err = toApiError(e);
        toast.error(err.traceId ? `关联员工信息加载失败：${err.message}` : `关联员工信息加载失败：${err.message}`);
      } finally {
        setRelativeLoading(false);
      }
    },
    [employeeOptions],
  );

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

  const renderFieldControl = (field: ArchiveFieldDef) => {
    if (field.readOnly) {
      const displayValue = field.displayKey
        ? form[field.displayKey] ?? ""
        : form[field.key] ?? "";
      return (
        <ReadOnlyFieldValue
          value={displayValue}
          placeholder={relativeLoading ? "正在带出关联信息…" : undefined}
        />
      );
    }

    if (field.reference === "employee") {
      const selectedOption =
        employeeOptions.find((opt) => opt.value === form.relativeEmployeeId) ??
        (form.relativeEmployeeId && form.__relativeEmployeeLabel
          ? {
              value: form.relativeEmployeeId,
              label: form.__relativeEmployeeLabel.split(" — ").slice(1).join(" — "),
              code: form.__relativeEmployeeLabel.split(" — ")[0],
            }
          : undefined);

      const options =
        selectedOption &&
        !employeeOptions.some((opt) => opt.value === selectedOption.value)
          ? [selectedOption, ...employeeOptions]
          : employeeOptions;

      return (
        <SearchableSelect
          value={form[field.key] ?? ""}
          onChange={(value) => void handleEmployeeSelect(value)}
          options={options}
          placeholder="请选择内部员工"
          searchPlaceholder="输入工号或姓名…"
          allowEmpty={!field.required}
          emptyLabel="不选择"
          shouldFilter={false}
          onSearchChange={setEmployeeSearch}
          loading={employeeLoading || relativeLoading}
          variant="entity"
          entityTone="form"
          entityIcon="briefcase"
          formatOption={formatCodeName}
          portal
          dropdownZIndex={80}
          className="w-full"
        />
      );
    }

    if (field.reference === "legalEntity") {
      return (
        <OptionSelect
          value={form[field.key] ?? ""}
          onValueChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
          options={legalEntityOptions}
          allowEmpty={!field.required}
          emptyLabel="不填写"
          className="w-full"
        />
      );
    }

    if (field.dictKey && dictOptions) {
      return (
        <OptionSelect
          value={form[field.key] ?? ""}
          onValueChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
          options={dictOptions[field.dictKey] ?? []}
          allowEmpty={!field.required}
          emptyLabel="不填写"
          placeholder={dictOptions ? "请选择" : "加载选项…"}
          disabled={!dictOptions}
          className="w-full"
        />
      );
    }

    if (field.options) {
      return (
        <OptionSelect
          value={form[field.key] ?? ""}
          onValueChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
          options={field.options}
          allowEmpty={!field.required}
          emptyLabel="不填写"
          className="w-full"
        />
      );
    }

    return (
      <Input
        type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
        value={form[field.key] ?? ""}
        className={cn(
          adminFormControlShellClassName({ empty: !form[field.key]?.trim() }),
          "h-auto shadow-none file:font-medium",
          !form[field.key]?.trim() && adminFormControlPlaceholderClassName,
          form[field.key]?.trim() && adminFormControlValueClassName,
        )}
        placeholder={
          field.placeholder ??
          (field.sensitive && sheet.type === "edit"
            ? "已脱敏字段，修改请填写完整内容"
            : undefined)
        }
        onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
      />
    );
  };

  const renderFormFields = () => {
    if (!needsEmployeeSearch) {
      const isCostCenterAllocations = resourcePath === "cost-center-allocations";
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {fieldDefs.map((field) => {
            const fullRow = isCostCenterAllocations && field.key === "legalEntityId";
            return (
              <div key={field.key} className={fullRow ? "md:col-span-2" : undefined}>
                <FormField label={field.label} required={field.required && !field.readOnly}>
                  {renderFieldControl(field)}
                </FormField>
              </div>
            );
          })}
        </div>
      );
    }

    const employeeField = fieldDefs.find((field) => field.reference === "employee");
    const relationField = fieldDefs.find((field) => field.key === "relation");
    const snapshotFields = fieldDefs.filter((field) => field.readOnly);
    const tailFields = fieldDefs.filter(
      (field) => field !== employeeField && field !== relationField && !field.readOnly,
    );

    return (
      <div className="space-y-4">
        {employeeField ? (
          <FormField label={employeeField.label} required={employeeField.required}>
            <div className="space-y-2">
              {renderFieldControl(employeeField)}
              {form.relativeEmployeeId ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-primary">
                  <UserRound className="size-3.5 shrink-0" />
                  <span>
                    {relativeLoading
                      ? "正在同步任职信息…"
                      : "下方任职快照将随关联员工自动更新"}
                  </span>
                </div>
              ) : null}
            </div>
          </FormField>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {relationField ? (
            <FormField label={relationField.label} required={relationField.required}>
              {renderFieldControl(relationField)}
            </FormField>
          ) : null}
        </div>

        {form.relativeEmployeeId && snapshotFields.length > 0 ? (
          <section className="overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-muted/25 via-background to-muted/10">
            <div className="border-b border-border/35 px-4 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">任职快照（自动带出）</p>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              {snapshotFields.map((field) => (
                <FormField key={field.key} label={field.label}>
                  {renderFieldControl(field)}
                </FormField>
              ))}
            </div>
          </section>
        ) : null}

        {tailFields.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {tailFields.map((field) => (
              <FormField key={field.key} label={field.label} required={field.required}>
                {renderFieldControl(field)}
              </FormField>
            ))}
          </div>
        ) : null}
      </div>
    );
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
                {resourcePath === "cost-center-allocations" ? (
                  <div className="overflow-x-auto">
                    <ArchiveRecordFieldGrid columns={5} className="min-w-[860px] gap-0.5">
                      {displayFields.map((field) => {
                        const masked = isMaskedField(field, item);
                        const display = formatDisplayValue(field, item, dictOptions);
                        return (
                          <ArchiveRecordField
                            key={field.key}
                            label={field.label}
                            value={display}
                            masked={masked}
                            highlight={field.key === highlightKey}
                            compact
                            mono={
                              field.type === "date" ||
                              field.key.includes("No") ||
                              field.reference === "employee"
                            }
                          />
                        );
                      })}
                    </ArchiveRecordFieldGrid>
                  </div>
                ) : (
                  <ArchiveRecordFieldGrid>
                    {displayFields.map((field) => {
                      const masked = isMaskedField(field, item);
                      const display = formatDisplayValue(field, item, dictOptions);
                      return (
                        <ArchiveRecordField
                          key={field.key}
                          label={field.label}
                          value={display}
                          masked={masked}
                          highlight={field.key === highlightKey}
                          mono={
                            field.type === "date" ||
                            field.key.includes("No") ||
                            field.reference === "employee"
                          }
                        />
                      );
                    })}
                  </ArchiveRecordFieldGrid>
                )}
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
        {renderFormFields()}
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
