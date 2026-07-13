import type { EmployeePenalty } from "@shared/api.interface";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Edit, Plus, Trash2 } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  createEmployeeArchiveResource,
  deleteEmployeeArchiveResource,
  updateEmployeeArchiveResource,
} from "@/api/employee-archive";
import { listDictItemsByTypeCode } from "@/api/dict";
import { getParentChildOptions } from "@/api/parent-child-catalog";
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
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const PENALTY_TYPE_CATALOG = "PENALTY_TYPE";
const PENALTY_PAYMENT_METHOD_DICT = "PENALTY_PAYMENT_METHOD";

const INVOLVES_COMPENSATION_OPTIONS = [
  { id: "true" as const, label: "是" },
  { id: "false" as const, label: "否" },
];

type PenaltySectionProps = {
  employeeId: string;
  items: EmployeePenalty[];
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

type SheetState =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: EmployeePenalty };

type Option = { value: string; label: string };

type CatalogNode = {
  parentCode: string;
  parentName: string;
  children: Option[];
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

function initialForm(item?: EmployeePenalty) {
  return {
    effectiveDate: item?.effectiveDate ?? "",
    archiveDate: item?.archiveDate ?? "",
    type: item?.type ?? "",
    level: item?.level ?? "",
    witness: item?.witness ?? "",
    amount: item?.amount != null ? String(item.amount) : "",
    paymentMethod: item?.paymentMethod ?? "",
    involvesCompensation: item?.involvesCompensation === true ? "true" : "false",
    issuingOrg: item?.issuingOrg ?? "",
    description: item?.description ?? "",
  };
}

function validateForm(form: ReturnType<typeof initialForm>, levelRequired: boolean) {
  if (!form.type.trim()) return "请选择惩处类型";
  if (levelRequired && !form.level.trim()) return "请选择惩处类别";
  return null;
}

export function PenaltySection({ employeeId, items, canEdit, onChanged }: PenaltySectionProps) {
  const [sheet, setSheet] = useState<SheetState>({ type: "closed" });
  const [form, setForm] = useState(() => initialForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeePenalty | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [catalog, setCatalog] = useState<CatalogNode[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<Option[]>([]);

  const typeOptions = useMemo(
    () => catalog.map((n) => ({ value: n.parentCode, label: n.parentName })),
    [catalog],
  );

  const typeNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const n of catalog) map[n.parentCode] = n.parentName;
    return map;
  }, [catalog]);

  const levelNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const n of catalog) {
      for (const c of n.children) map[c.value] = c.label;
    }
    return map;
  }, [catalog]);

  const paymentNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const o of paymentOptions) map[o.value] = o.label;
    return map;
  }, [paymentOptions]);

  const levelOptions = useMemo(() => {
    const node = catalog.find((n) => n.parentCode === form.type);
    return node?.children ?? [];
  }, [catalog, form.type]);

  const showLevel = levelOptions.length > 0;

  const openNew = () => {
    setForm(initialForm());
    setSheet({ type: "new" });
  };

  const openEdit = (item: EmployeePenalty) => {
    setForm(initialForm(item));
    setSheet({ type: "edit", item });
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [typeRes, payRes] = await Promise.all([
          getParentChildOptions(PENALTY_TYPE_CATALOG),
          listDictItemsByTypeCode(PENALTY_PAYMENT_METHOD_DICT),
        ]);
        if (cancelled) return;
        setCatalog(
          typeRes.data.map((n) => ({
            parentCode: n.parentCode,
            parentName: n.parentName,
            children: n.children.map((c) => ({ value: c.code, label: c.name })),
          })),
        );
        setPaymentOptions(
          payRes.data
            .filter((i) => i.status === "ACTIVE")
            .sort((a, b) => a.sort - b.sort)
            .map((i) => ({ value: i.value, label: i.label })),
        );
      } catch {
        if (!cancelled) {
          setCatalog([]);
          setPaymentOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    const errText = validateForm(form, showLevel);
    if (errText) {
      toast.error(errText);
      return;
    }
    setSaving(true);
    try {
      const amountRaw = form.amount.trim();
      const amount = amountRaw === "" ? undefined : Number(amountRaw);
      if (amountRaw !== "" && Number.isNaN(amount)) {
        toast.error("金额格式不正确");
        setSaving(false);
        return;
      }

      const payload = {
        effectiveDate: form.effectiveDate.trim() || undefined,
        archiveDate: form.archiveDate.trim() || undefined,
        type: form.type.trim(),
        level: showLevel ? form.level.trim() || undefined : undefined,
        witness: form.witness.trim() || undefined,
        amount,
        paymentMethod: form.paymentMethod.trim() || undefined,
        involvesCompensation: form.involvesCompensation === "true",
        issuingOrg: form.issuingOrg.trim() || undefined,
        description: form.description.trim() || undefined,
      } satisfies Partial<EmployeePenalty>;

      if (sheet.type === "new") {
        await createEmployeeArchiveResource(employeeId, "penalties", payload);
      } else if (sheet.type === "edit") {
        await updateEmployeeArchiveResource(employeeId, "penalties", sheet.item.id, {
          ...payload,
          // 切换为经济处罚时显式清空惩处类别
          level: showLevel ? payload.level : "",
        });
      }

      toast.success("惩处记录已保存");
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
      await deleteEmployeeArchiveResource(employeeId, "penalties", deleteTarget.id);
      setDeleteTarget(null);
      toast.success("惩处记录已删除");
      await onChanged();
    } catch (e: unknown) {
      const apiErr = toApiError(e);
      toast.error(apiErr.traceId ? `${apiErr.message}（traceId: ${apiErr.traceId}）` : apiErr.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PanelCard
        title="惩处记录"
        toolbar={
          <>
            {items.length > 1 ? (
              <Badge variant="secondary" className="h-7 px-2 text-xs font-medium">
                {items.length} 条
              </Badge>
            ) : null}
            {canEdit ? <ArchiveAddButton label="新增惩处" icon={Plus} onClick={openNew} /> : null}
          </>
        }
      >
        {items.length === 0 ? (
          <PanelEmpty
            compact
            title="暂无惩处记录"
            description={canEdit ? "点击右上角新增惩处记录" : ""}
          />
        ) : (
          <ArchiveRecordList>
            {items.map((item, index) => {
              const typeLabel = (item.type ? typeNameByCode[item.type] : undefined) || item.type || "—";
              const levelLabel = item.level
                ? levelNameByCode[item.level] || item.level
                : undefined;
              const paymentLabel =
                (item.paymentMethod ? paymentNameByCode[item.paymentMethod] : undefined) ||
                item.paymentMethod ||
                "—";

              return (
                <ArchiveRecordCard
                  key={item.id}
                  index={index + 1}
                  actions={
                    canEdit ? (
                      <>
                        <ArchiveRecordActionButton onClick={() => openEdit(item)} icon={Edit} label="编辑" />
                        <ArchiveRecordActionButton
                          onClick={() => setDeleteTarget(item)}
                          icon={Trash2}
                          label="删除"
                          destructive
                        />
                      </>
                    ) : null
                  }
                >
                  <ArchiveRecordFieldGrid>
                    <ArchiveRecordField label="生效日期" value={item.effectiveDate || "—"} compact mono />
                    <ArchiveRecordField label="归档日期" value={item.archiveDate || "—"} compact mono />
                    <ArchiveRecordField label="惩处类型" value={typeLabel} compact />
                    {levelLabel ? <ArchiveRecordField label="惩处类别" value={levelLabel} compact /> : null}
                    <ArchiveRecordField label="见证人" value={item.witness || "—"} compact />
                    <ArchiveRecordField
                      label="金额"
                      value={item.amount != null ? String(item.amount) : "—"}
                      compact
                    />
                    <ArchiveRecordField label="扣款方式" value={paymentLabel} compact />
                    <ArchiveRecordField
                      label="涉及赔偿"
                      value={
                        item.involvesCompensation == null
                          ? "—"
                          : item.involvesCompensation
                            ? "是"
                            : "否"
                      }
                      compact
                    />
                    <ArchiveRecordField label="发文单位" value={item.issuingOrg || "—"} compact />
                    <ArchiveRecordField label="处罚描述" value={item.description || "—"} compact />
                  </ArchiveRecordFieldGrid>
                </ArchiveRecordCard>
              );
            })}
          </ArchiveRecordList>
        )}
      </PanelCard>

      <ArchiveFormDialogPortal
        open={sheet.type !== "closed"}
        title={sheet.type === "edit" ? "编辑惩处记录" : "新增惩处记录"}
        description="维护惩处类型、类别与扣款方式等信息。"
        contentClassName="sm:max-w-3xl"
        onOpenChange={(open) => {
          if (!open) setSheet({ type: "closed" });
        }}
        saving={saving}
        onSave={() => void save()}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="生效日期">
            <Input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveDate: e.target.value }))}
            />
          </FormField>

          <FormField label="归档日期">
            <Input
              type="date"
              value={form.archiveDate}
              onChange={(e) => setForm((prev) => ({ ...prev, archiveDate: e.target.value }))}
            />
          </FormField>

          <FormField label="惩处类型" required>
            <OptionSelect
              value={form.type}
              options={typeOptions}
              placeholder={typeOptions.length ? "选择惩处类型" : "加载选项…"}
              onValueChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  type: v,
                  level: "",
                }))
              }
              disabled={typeOptions.length === 0}
            />
          </FormField>

          {showLevel ? (
            <FormField label="惩处类别" required>
              <OptionSelect
                value={form.level}
                options={levelOptions}
                placeholder="选择惩处类别"
                onValueChange={(v) => setForm((prev) => ({ ...prev, level: v }))}
              />
            </FormField>
          ) : (
            // 经济处罚无类别：占位保持后续字段排版不变
            <div aria-hidden className="hidden md:block" />
          )}

          <FormField label="见证人">
            <Input
              value={form.witness}
              onChange={(e) => setForm((prev) => ({ ...prev, witness: e.target.value }))}
              placeholder="请输入见证人"
            />
          </FormField>

          <FormField label="金额">
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="请输入金额"
            />
          </FormField>

          <FormField label="扣款方式">
            <OptionSelect
              value={form.paymentMethod}
              options={paymentOptions}
              placeholder={paymentOptions.length ? "选择扣款方式" : "加载选项…"}
              onValueChange={(v) => setForm((prev) => ({ ...prev, paymentMethod: v }))}
              disabled={paymentOptions.length === 0}
            />
          </FormField>

          <FormField label="涉及赔偿">
            <OptionToggle
              options={INVOLVES_COMPENSATION_OPTIONS}
              value={form.involvesCompensation === "true" ? "true" : "false"}
              onChange={(value) => setForm((prev) => ({ ...prev, involvesCompensation: value }))}
            />
          </FormField>

          <FormField label="发文单位">
            <Input
              value={form.issuingOrg}
              onChange={(e) => setForm((prev) => ({ ...prev, issuingOrg: e.target.value }))}
              placeholder="请输入发文单位"
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="处罚描述">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="可填写补充说明"
                rows={3}
              />
            </FormField>
          </div>
        </div>
      </ArchiveFormDialogPortal>

      <ConfirmDialogPortal
        open={!!deleteTarget}
        title="确认删除"
        description={
          deleteTarget
            ? `确认删除该惩处记录（${(deleteTarget.type ? typeNameByCode[deleteTarget.type] : undefined) || deleteTarget.type || deleteTarget.id}）吗？`
            : ""
        }
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
