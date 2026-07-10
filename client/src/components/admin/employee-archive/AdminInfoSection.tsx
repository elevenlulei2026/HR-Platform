import type {
  EmployeeAdminInfo,
  EmployeeAdminInfoEditMode,
  EmployeeAdminInfoUpdateRequest,
  EmployeeFormOptions,
} from "@shared/api.interface";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Edit, Plus, Trash2 } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  createEmployeeArchiveResource,
  deleteEmployeeArchiveResource,
  updateEmployeeArchiveResource,
} from "@/api/employee-archive";
import { ArchiveFormDialogPortal } from "@/components/admin/employee-archive/ArchiveFormDialogPortal";
import { ArchiveVersionTimeline } from "@/components/admin/employee-archive/ArchiveVersionTimeline";
import {
  pickPresentVersionId,
  pickVersionAtAsOfDate,
  temporalHint,
  todayStr,
} from "@/components/admin/employee-archive/archive-effective-version-utils";
import { ConfirmDialogPortal } from "@/components/admin/employee-archive/ConfirmDialogPortal";
import {
  ArchiveAddButton,
  ArchiveRecordActionButton,
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
import { OptionSelect } from "@/components/admin/option-select";
import { PanelCard, PanelEmpty } from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EDIT_MODE_OPTIONS = [
  { id: "CURRENT" as const, label: "修改当前版本" },
  { id: "NEW_VERSION" as const, label: "新增生效版本" },
];

type AdminInfoSectionProps = {
  employeeId: string;
  items: EmployeeAdminInfo[];
  canEdit: boolean;
  workEnvironments: EmployeeFormOptions["workEnvironments"];
  onChanged: () => Promise<void> | void;
};

type SheetState =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: EmployeeAdminInfo; editMode: EmployeeAdminInfoEditMode };

type AdminInfoForm = {
  effectiveStartDate: string;
  status: string;
  workEnvironment: string;
  takeShuttle: string;
  parkingPermit: string;
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

function emptyForm(): AdminInfoForm {
  return {
    effectiveStartDate: todayStr(),
    status: "ACTIVE",
    workEnvironment: "",
    takeShuttle: "NO",
    parkingPermit: "NO",
  };
}

function formFromItem(item: EmployeeAdminInfo): AdminInfoForm {
  return {
    effectiveStartDate: item.effectiveStartDate ?? todayStr(),
    status: item.status ?? "ACTIVE",
    workEnvironment: item.workEnvironment ?? "",
    takeShuttle: item.takeShuttle ?? "NO",
    parkingPermit: item.parkingPermit ?? "NO",
  };
}

function validateForm(form: AdminInfoForm) {
  if (!form.effectiveStartDate.trim()) return "请选择生效日期";
  if (!form.status.trim()) return "请选择状态";
  if (!form.workEnvironment.trim()) return "请选择工作环境";
  if (!form.takeShuttle.trim()) return "请选择是否乘坐班车";
  if (!form.parkingPermit.trim()) return "请选择是否有停车证";
  return null;
}

function buildPayload(form: AdminInfoForm) {
  return {
    effectiveStartDate: form.effectiveStartDate.trim(),
    status: form.status.trim(),
    workEnvironment: form.workEnvironment.trim(),
    takeShuttle: form.takeShuttle.trim() as "YES" | "NO",
    parkingPermit: form.parkingPermit.trim() as "YES" | "NO",
  };
}

export function AdminInfoSection({
  employeeId,
  items,
  canEdit,
  workEnvironments,
  onChanged,
}: AdminInfoSectionProps) {
  const [asOfDate, setAsOfDate] = useState(() => todayStr());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>({ type: "closed" });
  const [form, setForm] = useState<AdminInfoForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeAdminInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const temporal = useMemo(() => temporalHint(asOfDate), [asOfDate]);
  const isViewingToday = asOfDate === todayStr();
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.effectiveStartDate.localeCompare(a.effectiveStartDate)),
    [items],
  );
  const active = useMemo(() => {
    if (sorted.length === 0) return null;
    if (focusedId && sorted.some((item) => item.id === focusedId)) {
      return sorted.find((item) => item.id === focusedId) ?? sorted[0];
    }
    const atDate = pickVersionAtAsOfDate(sorted, asOfDate);
    if (atDate) return atDate as EmployeeAdminInfo;
    const presentId = pickPresentVersionId(sorted);
    return (presentId ? sorted.find((item) => item.id === presentId) : null) ?? sorted[0];
  }, [asOfDate, focusedId, sorted]);

  const workEnvLabel = (code?: string) =>
    workEnvironments.find((o) => o.value === code)?.label ?? code ?? "—";

  const openCreate = () => {
    setForm(emptyForm());
    setSheet({ type: "new" });
  };

  const openEdit = (item: EmployeeAdminInfo, mode: EmployeeAdminInfoEditMode = "CURRENT") => {
    const next = formFromItem(item);
    if (mode === "NEW_VERSION") {
      next.effectiveStartDate = todayStr();
    }
    setForm(next);
    setSheet({ type: "edit", item, editMode: mode });
  };

  const handleEditModeChange = (mode: EmployeeAdminInfoEditMode) => {
    if (sheet.type !== "edit") return;
    const base = formFromItem(sheet.item);
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
    const errText = validateForm(form);
    if (errText) {
      toast.error(errText);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(form);

      if (isNew) {
        const res = await createEmployeeArchiveResource(employeeId, "admin-infos", payload);
        toast.success("行政信息已新增");
        setFocusedId(res.data.id);
      } else if (sheet.type === "edit") {
        const updatePayload: EmployeeAdminInfoUpdateRequest = {
          editMode: sheet.editMode,
          ...payload,
        };
        const res = await updateEmployeeArchiveResource(
          employeeId,
          "admin-infos",
          sheet.item.id,
          updatePayload,
        );
        toast.success(sheet.editMode === "NEW_VERSION" ? "已新增生效版本" : "行政信息已更新");
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
      await deleteEmployeeArchiveResource(employeeId, "admin-infos", deleteTarget.id);
      toast.success("行政信息记录已删除");
      setDeleteTarget(null);
      await onChanged();
    } catch (e: unknown) {
      const err = toApiError(e);
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <CalendarClock className="size-3.5 text-muted-foreground" />
        <Input
          type="date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          className="h-8 w-[9.5rem] text-xs"
        />
        <Badge variant={temporal.variant} className="h-6 text-[10px] font-medium">
          {temporal.label}
        </Badge>
        {!isViewingToday ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setAsOfDate(todayStr())}>
            回到今天
          </Button>
        ) : null}
      </div>
      {canEdit ? (
        items.length === 0 ? (
          <ArchiveAddButton label="新增行政信息" onClick={openCreate} />
        ) : active ? (
          <ArchiveAddButton label="新增生效版本" onClick={() => openEdit(active, "NEW_VERSION")} />
        ) : null
      ) : null}
    </div>
  );

  return (
    <>
      <PanelCard
        title="行政信息"
        description={`按生效日期维护工作环境与班车停车 · 快照日期 ${asOfDate}`}
        toolbar={toolbar}
      >
        {items.length === 0 ? (
          <PanelEmpty compact title="暂无行政信息" description="点击「新增行政信息」维护工作环境与班车停车" />
        ) : !active ? (
          <PanelEmpty compact title="暂无可用快照" description="请调整快照日期或新增生效版本" />
        ) : (
          <div className="space-y-2 p-2">
            <div className="rounded-lg border border-border/55 bg-muted/10 px-2.5 py-2">
              <ArchiveVersionTimeline
                embedded
                items={sorted}
                activeId={active.id}
                subtitle={(item) =>
                  item.workEnvironmentLabel ?? workEnvLabel(item.workEnvironment)
                }
                onSelect={(item) => setFocusedId(item.id)}
              />
            </div>

            <ArchiveRecordCard
              accent={active.status === "INACTIVE" ? "amber" : "primary"}
              actions={
                canEdit ? (
                  <>
                    <ArchiveRecordActionButton icon={Edit} label="编辑" onClick={() => openEdit(active, "CURRENT")} />
                    <ArchiveRecordActionButton icon={Plus} label="新增生效版本" onClick={() => openEdit(active, "NEW_VERSION")} />
                    <ArchiveRecordActionButton icon={Trash2} label="删除" destructive onClick={() => setDeleteTarget(active)} />
                  </>
                ) : null
              }
            >
              <ArchiveRecordFieldGrid columns={4}>
                <ArchiveRecordField
                  label="状态"
                  value={
                    <ArchiveStatusBadge
                      active={isAttendanceCardActive(active.status)}
                      label={attendanceCardStatusLabel(active.status)}
                    />
                  }
                  compact
                />
                <ArchiveRecordField
                  label="工作环境"
                  value={
                    <span className="truncate text-[12px] font-medium">
                      {active.workEnvironmentLabel ?? workEnvLabel(active.workEnvironment)}
                    </span>
                  }
                  compact
                />
                <ArchiveRecordField
                  label="乘坐班车"
                  value={
                    <ArchiveStatusBadge
                      active={active.takeShuttle === "YES"}
                      label={yesNoToggleLabel(active.takeShuttle)}
                    />
                  }
                  compact
                />
                <ArchiveRecordField
                  label="停车证"
                  value={
                    <ArchiveStatusBadge
                      active={active.parkingPermit === "YES"}
                      label={yesNoToggleLabel(active.parkingPermit)}
                    />
                  }
                  compact
                />
                <ArchiveRecordField
                  label="生效期"
                  value={
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium">{active.effectiveStartDate}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {active.effectiveEndDate ? `至 ${active.effectiveEndDate}` : "至今有效"}
                      </div>
                    </div>
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
            ? "新增行政信息"
            : sheet.type === "edit" && sheet.editMode === "NEW_VERSION"
              ? "新增生效版本"
              : "编辑行政信息"
        }
        description="维护生效日期、工作环境与班车停车信息"
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

          <FormField label="工作环境" required>
            <OptionSelect
              value={form.workEnvironment}
              onValueChange={(value) => setForm((prev) => ({ ...prev, workEnvironment: value }))}
              options={workEnvironments}
              placeholder="请选择工作环境"
              className="w-full"
            />
          </FormField>

          <FormField label="乘坐班车" required>
            <OptionToggle
              options={YES_NO_TOGGLE_OPTIONS}
              value={form.takeShuttle === "NO" ? "NO" : "YES"}
              onChange={(value) => setForm((prev) => ({ ...prev, takeShuttle: value }))}
            />
          </FormField>

          <FormField label="停车证" required>
            <OptionToggle
              options={YES_NO_TOGGLE_OPTIONS}
              value={form.parkingPermit === "NO" ? "NO" : "YES"}
              onChange={(value) => setForm((prev) => ({ ...prev, parkingPermit: value }))}
            />
          </FormField>
        </div>
      </ArchiveFormDialogPortal>

      <ConfirmDialogPortal
        open={deleteTarget !== null}
        title="删除行政信息记录"
        description="确定删除该条行政信息版本记录？删除后将影响该快照日期下的展示。"
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
