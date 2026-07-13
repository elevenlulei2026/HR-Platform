import type {
  EmployeeAttendanceCard,
  EmployeeAttendanceCardEditMode,
  EmployeeAttendanceCardUpdateRequest,
} from "@shared/api.interface";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  createEmployeeArchiveResource,
  deleteEmployeeArchiveResource,
  updateEmployeeArchiveResource,
} from "@/api/employee-archive";
import { ArchiveFormDialogPortal } from "@/components/admin/employee-archive/ArchiveFormDialogPortal";
import { AttendanceCardVersionTimeline } from "@/components/admin/employee-archive/AttendanceCardVersionTimeline";
import {
  ATTENDANCE_CARD_ACCENT_STYLES,
  pickCardAtAsOfDate,
  pickPresentCardId,
  todayStr,
} from "@/components/admin/employee-archive/attendance-card-utils";
import { ConfirmDialogPortal } from "@/components/admin/employee-archive/ConfirmDialogPortal";
import {
  ArchiveAddButton,
  ArchiveDeleteRecordButton,
  ArchiveEditCurrentVersionButton,
  ArchiveNewEffectiveVersionButton,
  ArchiveRecordCard,
  ArchiveRecordField,
  ArchiveRecordFieldGrid,
} from "@/components/admin/employee-archive/archive-record-ui";
import {
  ATTENDANCE_CARD_STATUS_OPTIONS,
  ArchiveStatusBadge,
  YES_NO_TOGGLE_OPTIONS,
  attendanceCardStatusLabel,
  isAttendanceCardActive,
  yesNoToggleLabel,
} from "@/components/admin/employee-archive/archive-status-ui";
import { FormField, OptionToggle } from "@/components/admin/form-field";
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
import { Input } from "@/components/ui/input";

const EDIT_MODE_OPTIONS = [
  { id: "CURRENT" as const, label: "修改当前版本" },
  { id: "NEW_VERSION" as const, label: "新增生效版本" },
];

type AttendanceCardSectionProps = {
  employeeId: string;
  items: EmployeeAttendanceCard[];
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

type SheetState =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: EmployeeAttendanceCard; editMode: EmployeeAttendanceCardEditMode };

type AttendanceCardForm = {
  cardNo: string;
  effectiveStartDate: string;
  status: string;
  participateInAttendance: string;
  remark: string;
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

function emptyForm(): AttendanceCardForm {
  return {
    cardNo: "",
    effectiveStartDate: todayStr(),
    status: "ACTIVE",
    participateInAttendance: "YES",
    remark: "",
  };
}

function formFromCard(item: EmployeeAttendanceCard): AttendanceCardForm {
  return {
    cardNo: item.cardNo ?? "",
    effectiveStartDate: item.effectiveStartDate ?? todayStr(),
    status: item.status ?? "ACTIVE",
    participateInAttendance: item.participateInAttendance ?? "YES",
    remark: item.remark ?? "",
  };
}

function validateForm(form: AttendanceCardForm, isNew: boolean, editMode?: EmployeeAttendanceCardEditMode) {
  if (isNew && !form.cardNo.trim()) return "请填写考勤卡号";
  if (!form.effectiveStartDate.trim()) return "请选择生效日期";
  if (!form.status.trim()) return "请选择状态";
  if (!form.participateInAttendance.trim()) return "请选择是否参与考勤";
  if (!isNew && editMode === "CURRENT" && !form.cardNo.trim()) return "请填写考勤卡号";
  return null;
}

function buildPayload(form: AttendanceCardForm) {
  return {
    cardNo: form.cardNo.trim(),
    effectiveStartDate: form.effectiveStartDate.trim(),
    status: form.status.trim(),
    participateInAttendance: form.participateInAttendance.trim() as "YES" | "NO",
    remark: form.remark.trim() || undefined,
  };
}

export function AttendanceCardSection({
  employeeId,
  items,
  canEdit,
  onChanged,
}: AttendanceCardSectionProps) {
  const asOfDate = todayStr();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>({ type: "closed" });
  const [form, setForm] = useState<AttendanceCardForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeAttendanceCard | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.effectiveStartDate.localeCompare(a.effectiveStartDate)),
    [items],
  );
  const active = useMemo(() => {
    if (sorted.length === 0) return null;
    if (focusedId && sorted.some((item) => item.id === focusedId)) {
      return sorted.find((item) => item.id === focusedId) ?? sorted[0];
    }
    const atDate = pickCardAtAsOfDate(sorted, asOfDate);
    if (atDate) return atDate;
    const presentId = pickPresentCardId(sorted);
    return (presentId ? sorted.find((item) => item.id === presentId) : null) ?? sorted[0];
  }, [asOfDate, focusedId, sorted]);
  void ATTENDANCE_CARD_ACCENT_STYLES;

  const openCreate = () => {
    setForm(emptyForm());
    setSheet({ type: "new" });
  };

  const openEdit = (item: EmployeeAttendanceCard, mode: EmployeeAttendanceCardEditMode = "CURRENT") => {
    const next = formFromCard(item);
    if (mode === "NEW_VERSION") {
      next.effectiveStartDate = todayStr();
    }
    setForm(next);
    setSheet({ type: "edit", item, editMode: mode });
  };

  const handleEditModeChange = (mode: EmployeeAttendanceCardEditMode) => {
    if (sheet.type !== "edit") return;
    let base = formFromCard(sheet.item);
    if (mode === "CURRENT") {
      base.effectiveStartDate = sheet.item.effectiveStartDate;
    } else {
      base.effectiveStartDate = todayStr();
    }
    setForm(base);
    setSheet({ type: "edit", item: sheet.item, editMode: mode });
  };

  const save = async () => {
    const isNew = sheet.type === "new";
    const editMode = sheet.type === "edit" ? sheet.editMode : undefined;
    const errText = validateForm(form, isNew, editMode);
    if (errText) {
      toast.error(errText);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(form);

      if (isNew) {
        const res = await createEmployeeArchiveResource(employeeId, "attendance-cards", payload);
        toast.success("考勤卡已新增");
        setFocusedId(res.data.id);
      } else if (sheet.type === "edit") {
        const updatePayload: EmployeeAttendanceCardUpdateRequest = {
          editMode: sheet.editMode,
          ...payload,
        };
        const res = await updateEmployeeArchiveResource(
          employeeId,
          "attendance-cards",
          sheet.item.id,
          updatePayload,
        );
        toast.success(sheet.editMode === "NEW_VERSION" ? "已新增生效版本" : "考勤卡已更新");
        setFocusedId(res.data.id);
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmployeeArchiveResource(employeeId, "attendance-cards", deleteTarget.id);
      toast.success("考勤卡记录已删除");
      setDeleteTarget(null);
      await onChanged();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toolbar =
    canEdit && items.length === 0 ? (
      <ArchiveAddButton label="新增考勤卡" onClick={openCreate} />
    ) : null;

  return (
    <>
      <PanelCard
        title="考勤卡"
        description={`每人一张考勤卡，按生效日期换新卡 · 快照日期 ${asOfDate}`}
        toolbar={toolbar}
      >
        {items.length === 0 ? (
          <PanelEmpty compact title="暂无考勤卡" description="点击「新增考勤卡」维护卡号与参与考勤信息" />
        ) : !active ? (
          <PanelEmpty compact title="暂无可用快照" description="请通过版本时间轴切换，或新增生效版本" />
        ) : (
          <div className="space-y-2 p-2">
            <div className="rounded-lg border border-border/55 bg-muted/10 px-2.5 py-2">
              <AttendanceCardVersionTimeline
                embedded
                cards={sorted}
                activeId={active.id}
                onSelect={(card) => setFocusedId(card.id)}
              />
            </div>

            <ArchiveRecordCard
              accent={active.status === "INACTIVE" ? "amber" : "primary"}
              actions={
                canEdit ? (
                  <>
                    <ArchiveEditCurrentVersionButton onClick={() => openEdit(active, "CURRENT")} />
                    <ArchiveNewEffectiveVersionButton onClick={() => openEdit(active, "NEW_VERSION")} />
                    <ArchiveDeleteRecordButton onClick={() => setDeleteTarget(active)} />
                  </>
                ) : null
              }
            >
              <ArchiveRecordFieldGrid columns={3}>
                <ArchiveRecordField
                  label="考勤卡号"
                  value={
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[12px] font-semibold tabular-nums">
                        {active.cardNo || "—"}
                      </div>
                      <div className="mt-1">
                        <ArchiveStatusBadge
                          active={isAttendanceCardActive(active.status)}
                          label={attendanceCardStatusLabel(active.status)}
                        />
                      </div>
                    </div>
                  }
                  compact
                />
                <ArchiveRecordField
                  label="是否参与考勤"
                  value={
                    <ArchiveStatusBadge
                      active={active.participateInAttendance === "YES"}
                      label={yesNoToggleLabel(active.participateInAttendance)}
                    />
                  }
                  compact
                />
                <ArchiveRecordField
                  label="备注"
                  value={
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {active.remark || "—"}
                    </span>
                  }
                  compact
                />
              </ArchiveRecordFieldGrid>
            </ArchiveRecordCard>
          </div>
        )}
      </PanelCard>

      <ArchiveFormDialogPortal
        open={sheet.type !== "closed"}
        title={
          sheet.type === "new"
            ? "新增考勤卡"
            : sheet.type === "edit" && sheet.editMode === "NEW_VERSION"
              ? "新增生效版本"
              : "编辑考勤卡"
        }
        description="维护考勤卡号、生效日期与参与考勤状态"
        onOpenChange={(open) => {
          if (!open) setSheet({ type: "closed" });
        }}
        saving={saving}
        onSave={() => void save()}
      >
        {sheet.type === "edit" ? (
          <div className="mb-3">
            <FormField label="编辑模式">
              <OptionToggle
                options={EDIT_MODE_OPTIONS}
                value={sheet.editMode}
                onChange={(value) => handleEditModeChange(value)}
              />
            </FormField>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="考勤卡号" required>
            <Input
              value={form.cardNo}
              onChange={(e) => setForm((prev) => ({ ...prev, cardNo: e.target.value }))}
              placeholder="请输入考勤卡号"
            />
          </FormField>

          <FormField label="生效日期" required>
            <Input
              type="date"
              value={form.effectiveStartDate}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveStartDate: e.target.value }))}
              disabled={sheet.type === "edit" && sheet.editMode === "CURRENT"}
            />
          </FormField>

          <FormField label="状态" required>
            <OptionToggle
              options={ATTENDANCE_CARD_STATUS_OPTIONS}
              value={form.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"}
              onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
            />
          </FormField>

          <FormField label="是否参与考勤" required>
            <OptionToggle
              options={YES_NO_TOGGLE_OPTIONS}
              value={form.participateInAttendance === "NO" ? "NO" : "YES"}
              onChange={(value) => setForm((prev) => ({ ...prev, participateInAttendance: value }))}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="备注">
              <Input
                value={form.remark}
                onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                placeholder="选填"
              />
            </FormField>
          </div>
        </div>
      </ArchiveFormDialogPortal>

      <ConfirmDialogPortal
        open={deleteTarget !== null}
        title="删除考勤卡记录"
        description="确定删除该条考勤卡版本记录？删除后将影响该快照日期下的展示。"
        confirmLabel="删除"
        destructive
        loading={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
