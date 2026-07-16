import type {
  OrganizationTreeNode,
  OrgStatus,
  Position,
  PositionEditMode,
  PositionFormOptions,
  PositionKind,
  PositionSequence,
  PositionVersion,
  YesNo,
} from "@shared/api.interface";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BriefcaseBusiness, History, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  flattenOrgTree,
  getOrganizationTree,
  getPosition,
  getPositionFormOptions,
  getPositionVersions,
  updatePosition,
} from "@/api/organization";
import { FormField, OptionToggle } from "@/components/admin/form-field";
import { OptionSelect } from "@/components/admin/option-select";
import { formatCodeName, SearchableSelect } from "@/components/admin/searchable-select";
import { adminChipActive, adminChipIdle } from "@/components/admin/selection-styles";
import {
  SheetEntityHeader,
  SheetEntityIcon,
  SheetEntitySummary,
} from "@/components/admin/sheet-entity-header";
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
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";

type PositionForm = {
  name: string;
  effectiveStartDate: string;
  organizationId: string;
  status: OrgStatus;
  occupationalDisease: YesNo;
  positionCategory: string;
  positionKind: PositionKind | "";
  positionSequence: PositionSequence | "";
  positionLevel: string;
  keyPosition: YesNo;
  identityCategory: string;
};

const STATUS_OPTIONS = [
  { id: "ACTIVE" as const, label: "有效" },
  { id: "INACTIVE" as const, label: "无效" },
];
const YES_NO_OPTIONS = [
  { id: "YES" as const, label: "是" },
  { id: "NO" as const, label: "否" },
];
const POSITION_KIND_OPTIONS = [
  { id: "OFFICE" as const, label: "Office" },
  { id: "NON_OFFICE" as const, label: "非 Office" },
];
const POSITION_SEQUENCE_OPTIONS = [
  { id: "P" as const, label: "P" },
  { id: "M" as const, label: "M" },
  { id: "T" as const, label: "T" },
];
const EDIT_MODE_OPTIONS = [
  { id: "CURRENT" as const, label: "修改当前版本" },
  { id: "NEW_VERSION" as const, label: "新增生效版本" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function displayValue(value?: string | null) {
  return value?.trim() ? value : "—";
}

function displayCodeName(code?: string | null, name?: string | null) {
  if (code?.trim() && name?.trim()) return `${code} — ${name}`;
  return displayValue(name ?? code);
}

function yesNoLabel(v?: YesNo | null) {
  if (v === "YES") return "是";
  if (v === "NO") return "否";
  return "—";
}

function positionKindLabel(kind?: PositionKind | null) {
  if (kind === "OFFICE") return "Office";
  if (kind === "NON_OFFICE") return "非 Office";
  return "—";
}

function formFromPosition(item: Position): PositionForm {
  return {
    name: item.name,
    effectiveStartDate: item.effectiveStartDate,
    organizationId: item.organizationId,
    status: item.status,
    occupationalDisease: item.occupationalDisease,
    positionCategory: item.positionCategory ?? "",
    positionKind: item.positionKind ?? "",
    positionSequence: item.positionSequence ?? "",
    positionLevel: item.positionLevel ?? "",
    keyPosition: item.keyPosition,
    identityCategory: item.identityCategory ?? "",
  };
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="text-xs font-semibold tracking-wide text-foreground">{title}</p>
      <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function DetailCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/50 bg-muted/15 px-3.5 py-3">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground">{displayValue(value)}</dd>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function StatusBadge({ status }: { status: OrgStatus }) {
  return (
    <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
      {status === "ACTIVE" ? "有效" : "无效"}
    </Badge>
  );
}

function VersionTimeline({
  versions,
  activeId,
  onSelect,
}: {
  versions: PositionVersion[];
  activeId?: string;
  onSelect: (version: PositionVersion) => void;
}) {
  if (versions.length === 0) return null;
  return (
    <div className="mb-4 rounded-lg border border-border/60 bg-muted/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <History className="size-3.5" />
          生效版本
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
            {versions.length} 个
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">点击切换查看快照</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {versions.map((v) => {
          const isActive = v.id === activeId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v)}
              className={cn(
                "flex min-w-[148px] shrink-0 flex-col gap-1 rounded-md border px-2.5 py-2 text-left",
                isActive ? adminChipActive : adminChipIdle,
              )}
            >
              <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                {v.effectiveStartDate}
              </span>
              <span className="text-[10px] text-muted-foreground">{v.temporalLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 与岗位体系页一致的岗位详情 / 编辑 Sheet，供组织图等入口复用。
 */
export function PositionWorkbenchSheet({
  positionId,
  open,
  onOpenChange,
  asOfDate,
  onChanged,
}: {
  positionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asOfDate?: string;
  onChanged?: () => void;
}) {
  const perm = usePermission();
  const canEdit = perm.has("position:edit");

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [position, setPosition] = useState<Position | null>(null);
  const [versions, setVersions] = useState<PositionVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [formOptions, setFormOptions] = useState<PositionFormOptions | null>(null);
  const [orgs, setOrgs] = useState<OrganizationTreeNode[]>([]);
  const [form, setForm] = useState<PositionForm | null>(null);
  const [editMode, setEditMode] = useState<PositionEditMode>("CURRENT");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const orgSelectOptions = useMemo(
    () =>
      flattenOrgTree(orgs).map((o) => ({
        value: o.id,
        label: o.name,
        code: o.code,
        keywords: `${o.code} ${o.name}`,
      })),
    [orgs],
  );

  const loadPosition = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await getPosition(id);
      setPosition(res.data);
      setMode("view");
      setForm(formFromPosition(res.data));
    } catch (e: unknown) {
      toast.error((e as ApiError).message ?? "加载岗位详情失败");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [onOpenChange]);

  const loadVersions = useCallback(async (code: string) => {
    setVersionsLoading(true);
    try {
      const res = await getPositionVersions(code);
      setVersions(res.data);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !positionId) return;
    void loadPosition(positionId);
    void getPositionFormOptions().then((r) => setFormOptions(r.data)).catch(() => setFormOptions(null));
    void getOrganizationTree({ asOfDate: asOfDate || todayStr() })
      .then((r) => setOrgs(r.data))
      .catch(() => setOrgs([]));
  }, [open, positionId, asOfDate, loadPosition]);

  useEffect(() => {
    if (!open || !position?.code) return;
    void loadVersions(position.code);
  }, [open, position?.code, loadVersions]);

  const patchForm = <K extends keyof PositionForm>(key: K, value: PositionForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const openEdit = (nextMode: PositionEditMode = "CURRENT") => {
    if (!position) return;
    const next = formFromPosition(position);
    if (nextMode === "NEW_VERSION") next.effectiveStartDate = todayStr();
    setForm(next);
    setEditMode(nextMode);
    setMode("edit");
  };

  const viewVersion = async (version: PositionVersion) => {
    try {
      const res = await getPosition(version.id);
      setPosition(res.data);
      setForm(formFromPosition(res.data));
      setMode("view");
    } catch (e: unknown) {
      toast.error((e as ApiError).message ?? "加载版本详情失败");
    }
  };

  const handleSave = async () => {
    if (!position || !form) return;
    if (!form.name.trim()) {
      toast.error("请填写岗位名称");
      return;
    }
    if (!form.organizationId) {
      toast.error("请选择直属部门");
      return;
    }
    if (editMode === "NEW_VERSION" && form.effectiveStartDate === position.effectiveStartDate) {
      toast.error("新版本须使用不同的生效日期");
      return;
    }
    setSaving(true);
    try {
      const res = await updatePosition(position.id, {
        editMode,
        name: form.name.trim(),
        effectiveStartDate:
          editMode === "NEW_VERSION" ? form.effectiveStartDate : position.effectiveStartDate,
        organizationId: form.organizationId,
        status: form.status,
        occupationalDisease: form.occupationalDisease,
        positionCategory: form.positionCategory || undefined,
        positionKind: form.positionKind || undefined,
        positionSequence: form.positionSequence || undefined,
        positionLevel: form.positionLevel || undefined,
        keyPosition: form.keyPosition,
        identityCategory: form.identityCategory || undefined,
      });
      toast.success(editMode === "NEW_VERSION" ? "已创建新版本" : "当前版本已更新");
      setPosition(res.data);
      setForm(formFromPosition(res.data));
      setMode("view");
      void loadVersions(res.data.code);
      onChanged?.();
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (saving) return;
    onOpenChange(false);
    setMode("view");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="right"
        className={cn(
          "z-[60] gap-0 p-0",
          mode === "view"
            ? "data-[side=right]:max-w-[min(640px,100vw)]"
            : "data-[side=right]:max-w-[min(840px,100vw)]",
        )}
      >
        {loading || !position ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            加载中…
          </div>
        ) : mode === "view" ? (
          <>
            <SheetEntityHeader
              icon={
                <SheetEntityIcon>
                  <BriefcaseBusiness className="size-5" />
                </SheetEntityIcon>
              }
              title={position.name}
              description={position.code}
              actions={
                canEdit ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openEdit("CURRENT")}>
                      编辑
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit("NEW_VERSION")}>
                      <History className="size-3.5" />
                      新增版本
                    </Button>
                  </>
                ) : null
              }
              badges={
                <>
                  <StatusBadge status={position.status} />
                  {position.keyPosition === "YES" ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-700 dark:text-amber-300"
                    >
                      <Sparkles className="size-3" />
                      关键岗位
                    </Badge>
                  ) : null}
                  {position.positionSequence ? (
                    <Badge variant="secondary">序列 {position.positionSequence}</Badge>
                  ) : null}
                </>
              }
              summary={
                <SheetEntitySummary>
                  <div className="min-w-0 text-[11px]">
                    <span className="text-muted-foreground">直属部门 </span>
                    <span className="font-medium text-foreground">
                      {displayCodeName(position.organizationCode, position.organizationName)}
                    </span>
                  </div>
                </SheetEntitySummary>
              }
            />
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {versionsLoading ? (
                <div className="mb-5 h-16 animate-pulse rounded-lg bg-muted/30" />
              ) : (
                <VersionTimeline
                  versions={versions}
                  activeId={position.id}
                  onSelect={(v) => void viewVersion(v)}
                />
              )}
              <div className="space-y-6">
                <DetailSection title="基本信息">
                  <DetailCell label="生效日期" value={position.effectiveStartDate} />
                  <DetailCell label="失效日期" value={position.effectiveEndDate ?? "至今"} />
                  <DetailCell
                    label="直属部门"
                    value={displayCodeName(position.organizationCode, position.organizationName)}
                  />
                  <DetailCell label="岗位序列" value={position.positionSequence} />
                  <DetailCell label="岗位类别" value={positionKindLabel(position.positionKind)} />
                </DetailSection>
                <DetailSection title="分类属性">
                  <DetailCell
                    label="岗位分类"
                    value={displayCodeName(position.positionCategory, position.positionCategoryLabel)}
                  />
                  <DetailCell
                    label="岗位职级"
                    value={displayCodeName(position.positionLevel, position.positionLevelLabel)}
                  />
                  <DetailCell
                    label="身份类别"
                    value={displayCodeName(position.identityCategory, position.identityCategoryLabel)}
                  />
                </DetailSection>
                <DetailSection title="标识">
                  <DetailCell label="职业病岗位" value={yesNoLabel(position.occupationalDisease)} />
                  <DetailCell label="关键岗位" value={yesNoLabel(position.keyPosition)} />
                </DetailSection>
              </div>
            </div>
            <SheetFooter className="border-t px-6 py-4">
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={close}>
                  关闭
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : form ? (
          <>
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle>{editMode === "NEW_VERSION" ? "新增生效版本" : "编辑岗位"}</SheetTitle>
              <SheetDescription>
                {editMode === "CURRENT"
                  ? `修改当前版本（${position.effectiveStartDate}）的数据，不改变生效日期。`
                  : "指定新生效日期，将基于当前表单内容创建新版本并自动衔接时间轴。"}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <FormSection title="版本">
                <FormField label="编辑方式" required>
                  <OptionToggle
                    options={EDIT_MODE_OPTIONS}
                    value={editMode}
                    onChange={(m) => {
                      setEditMode(m);
                      if (m === "CURRENT") patchForm("effectiveStartDate", position.effectiveStartDate);
                      else patchForm("effectiveStartDate", todayStr());
                    }}
                  />
                </FormField>
              </FormSection>
              <FormSection title="基本信息">
                <div className="space-y-4">
                  <FormField label="岗位编码">
                    <Input value={position.code} disabled className="font-mono" />
                  </FormField>
                  <FormField label="岗位名称" required>
                    <Input value={form.name} onChange={(e) => patchForm("name", e.target.value)} />
                  </FormField>
                  <FormGrid>
                    <FormField
                      label="生效日期"
                      required
                      hint={editMode === "CURRENT" ? "修改当前版本时生效日期不可变更" : undefined}
                    >
                      <Input
                        type="date"
                        value={form.effectiveStartDate}
                        disabled={editMode === "CURRENT"}
                        onChange={(e) => patchForm("effectiveStartDate", e.target.value)}
                      />
                    </FormField>
                    <FormField label="状态">
                      <OptionToggle
                        options={STATUS_OPTIONS}
                        value={form.status}
                        onChange={(v) => patchForm("status", v)}
                      />
                    </FormField>
                  </FormGrid>
                </div>
              </FormSection>
              <FormSection title="组织归属">
                <FormField label="直属部门" required>
                  <SearchableSelect
                    value={form.organizationId}
                    onChange={(v) => patchForm("organizationId", v)}
                    options={orgSelectOptions}
                    placeholder="选择直属部门"
                    searchPlaceholder="搜索部门名称或编码"
                    variant="entity"
                    formatOption={(o) => formatCodeName(o)}
                  />
                </FormField>
              </FormSection>
              <FormSection title="分类属性">
                <FormGrid>
                  <FormField label="岗位分类">
                    <OptionSelect
                      value={form.positionCategory}
                      onValueChange={(v) => patchForm("positionCategory", v)}
                      placeholder="选择岗位分类"
                      allowEmpty
                      options={(formOptions?.positionCategories ?? []).map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                    />
                  </FormField>
                  <FormField label="岗位类别">
                    <OptionSelect
                      value={form.positionKind}
                      onValueChange={(v) => patchForm("positionKind", v as PositionKind | "")}
                      placeholder="选择岗位类别"
                      allowEmpty
                      options={POSITION_KIND_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                    />
                  </FormField>
                  <FormField label="岗位序列">
                    <OptionSelect
                      value={form.positionSequence}
                      onValueChange={(v) => patchForm("positionSequence", v as PositionSequence | "")}
                      placeholder="选择 P / M / T"
                      allowEmpty
                      options={POSITION_SEQUENCE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                    />
                  </FormField>
                  <FormField label="岗位职级">
                    <OptionSelect
                      value={form.positionLevel}
                      onValueChange={(v) => patchForm("positionLevel", v)}
                      placeholder="选择职级"
                      allowEmpty
                      options={(formOptions?.positionLevels ?? []).map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                    />
                  </FormField>
                  <FormField label="身份类别">
                    <OptionSelect
                      value={form.identityCategory}
                      onValueChange={(v) => patchForm("identityCategory", v)}
                      placeholder="选择身份类别"
                      allowEmpty
                      options={(formOptions?.identityCategories ?? []).map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                    />
                  </FormField>
                </FormGrid>
              </FormSection>
              <FormSection title="标识">
                <FormGrid>
                  <FormField label="职业病岗位">
                    <OptionToggle
                      options={YES_NO_OPTIONS}
                      value={form.occupationalDisease}
                      onChange={(v) => patchForm("occupationalDisease", v)}
                    />
                  </FormField>
                  <FormField label="关键岗位">
                    <OptionToggle
                      options={YES_NO_OPTIONS}
                      value={form.keyPosition}
                      onChange={(v) => patchForm("keyPosition", v)}
                    />
                  </FormField>
                </FormGrid>
              </FormSection>
            </div>
            <SheetFooter className="border-t px-6 py-4">
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" disabled={saving} onClick={() => setMode("view")}>
                  取消
                </Button>
                <Button disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "保存中…" : editMode === "NEW_VERSION" ? "创建新版本" : "保存"}
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
