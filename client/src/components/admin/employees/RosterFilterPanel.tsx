import type { EmployeeListFilterMode, EmployeeStatus } from "@shared/api.interface";
import type { ReactNode } from "react";

import {
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
  X,
} from "lucide-react";

import { EMPLOYEE_STATUS_OPTIONS, GENDER_OPTIONS, employeeStatusLabel } from "@/api/employee";
import {
  adminFilterInputClassName,
  adminFilterInputGroupClassName,
  adminFilterSearchableTriggerClassName,
  adminFilterSelectTriggerClassName,
} from "@/components/admin/form-control-styles";
import { OptionSelect } from "@/components/admin/option-select";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/admin/searchable-select";
import { adminChipActive, adminChipIdle } from "@/components/admin/selection-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** 花名册场景快捷筛 */
export type RosterScenarioId =
  | ""
  | "PROBATION"
  | "HIRED_THIS_MONTH"
  | "CANDIDATE"
  | "TERMINATED";

export type RosterFilterState = {
  filterMode: EmployeeListFilterMode;
  keyword: string;
  fullName: string;
  employeeNo: string;
  companyEmail: string;
  personalEmail: string;
  positionId: string;
  organizationId: string;
  status: EmployeeStatus | "";
  gender: string;
  hireDateFrom: string;
  hireDateTo: string;
  /** 列表/导出快照日 YYYY-MM-DD */
  asOfDate: string;
  /** 场景快捷筛；与 status / 入职区间联动 */
  scenario: RosterScenarioId;
};

export const EMPTY_ROSTER_FILTER: RosterFilterState = {
  filterMode: "FUZZY",
  keyword: "",
  fullName: "",
  employeeNo: "",
  companyEmail: "",
  personalEmail: "",
  positionId: "",
  organizationId: "",
  status: "",
  gender: "",
  hireDateFrom: "",
  hireDateTo: "",
  asOfDate: todayStr(),
  scenario: "",
};

const FILTER_MODES: Array<{ id: EmployeeListFilterMode; label: string; hint: string }> = [
  { id: "FUZZY", label: "快速", hint: "姓名、工号、岗位、部门、邮箱模糊匹配" },
  { id: "ADVANCED", label: "精确", hint: "多条件组合；文本类为包含匹配" },
];

const SCENARIOS: Array<{
  id: RosterScenarioId;
  label: string;
  icon: typeof UserRound;
  hint: string;
}> = [
  { id: "", label: "全部", icon: UserRound, hint: "不限制场景" },
  { id: "PROBATION", label: "试用中", icon: UserCheck, hint: "状态 = 试用" },
  { id: "HIRED_THIS_MONTH", label: "本月入职", icon: UserPlus, hint: "入职日落在本月" },
  { id: "CANDIDATE", label: "待入职", icon: Sparkles, hint: "状态 = 待入职" },
  { id: "TERMINATED", label: "已离职", icon: UserX, hint: "状态 = 离职" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartStr(asOf: string) {
  const base = asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : todayStr();
  return `${base.slice(0, 7)}-01`;
}

function monthEndStr(asOf: string) {
  const base = asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : todayStr();
  const y = Number(base.slice(0, 4));
  const m = Number(base.slice(5, 7));
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${base.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

export function applyRosterScenario(
  value: RosterFilterState,
  scenario: RosterScenarioId,
): RosterFilterState {
  const asOf = value.asOfDate || todayStr();
  const base: RosterFilterState = {
    ...value,
    scenario,
    status: "",
    hireDateFrom: "",
    hireDateTo: "",
  };
  switch (scenario) {
    case "PROBATION":
      return { ...base, status: "PROBATION", filterMode: value.filterMode };
    case "CANDIDATE":
      return { ...base, status: "CANDIDATE", filterMode: value.filterMode };
    case "TERMINATED":
      return { ...base, status: "TERMINATED", filterMode: value.filterMode };
    case "HIRED_THIS_MONTH":
      return {
        ...base,
        filterMode: "ADVANCED",
        hireDateFrom: monthStartStr(asOf),
        hireDateTo: monthEndStr(asOf),
      };
    default:
      return { ...base, scenario: "" };
  }
}

export function countActiveRosterFilters(value: RosterFilterState): number {
  const today = todayStr();
  const asOfExtra = value.asOfDate && value.asOfDate !== today ? 1 : 0;
  if (value.filterMode === "FUZZY") {
    return (
      [value.keyword, value.status, value.organizationId].filter(Boolean).length + asOfExtra
    );
  }
  return (
    [
      value.fullName,
      value.employeeNo,
      value.companyEmail,
      value.personalEmail,
      value.positionId,
      value.organizationId,
      value.status,
      value.gender,
      value.hireDateFrom,
      value.hireDateTo,
    ].filter(Boolean).length + asOfExtra
  );
}

type FilterChip = {
  key: string;
  label: string;
  onClear: () => void;
};

function buildFilterChips(
  value: RosterFilterState,
  onChange: (next: RosterFilterState) => void,
  departmentOptions: SearchableSelectOption[],
  positionOptions: SearchableSelectOption[],
): FilterChip[] {
  const chips: FilterChip[] = [];
  const patch = (partial: Partial<RosterFilterState>) => onChange({ ...value, ...partial });

  if (value.scenario) {
    const meta = SCENARIOS.find((s) => s.id === value.scenario);
    chips.push({
      key: "scenario",
      label: `场景：${meta?.label ?? value.scenario}`,
      onClear: () => onChange(applyRosterScenario(value, "")),
    });
  }

  if (value.asOfDate && value.asOfDate !== todayStr()) {
    chips.push({
      key: "asOfDate",
      label: `生效日：${value.asOfDate}`,
      onClear: () => patch({ asOfDate: todayStr() }),
    });
  }

  if (value.filterMode === "FUZZY") {
    if (value.keyword.trim()) {
      chips.push({
        key: "keyword",
        label: `关键词：${value.keyword.trim()}`,
        onClear: () => patch({ keyword: "" }),
      });
    }
  } else {
    if (value.fullName.trim()) {
      chips.push({
        key: "fullName",
        label: `姓名：${value.fullName.trim()}`,
        onClear: () => patch({ fullName: "" }),
      });
    }
    if (value.employeeNo.trim()) {
      chips.push({
        key: "employeeNo",
        label: `工号：${value.employeeNo.trim()}`,
        onClear: () => patch({ employeeNo: "" }),
      });
    }
    if (value.companyEmail.trim()) {
      chips.push({
        key: "companyEmail",
        label: `公司邮箱：${value.companyEmail.trim()}`,
        onClear: () => patch({ companyEmail: "" }),
      });
    }
    if (value.personalEmail.trim()) {
      chips.push({
        key: "personalEmail",
        label: `个人邮箱：${value.personalEmail.trim()}`,
        onClear: () => patch({ personalEmail: "" }),
      });
    }
    if (value.gender) {
      const g = GENDER_OPTIONS.find((o) => o.id === value.gender);
      chips.push({
        key: "gender",
        label: `性别：${g?.label ?? value.gender}`,
        onClear: () => patch({ gender: "" }),
      });
    }
    if (value.positionId) {
      const pos = positionOptions.find((o) => o.value === value.positionId);
      chips.push({
        key: "positionId",
        label: `岗位：${pos?.label ?? value.positionId}`,
        onClear: () => patch({ positionId: "" }),
      });
    }
    if ((value.hireDateFrom || value.hireDateTo) && value.scenario !== "HIRED_THIS_MONTH") {
      chips.push({
        key: "hireDate",
        label: `入职：${value.hireDateFrom || "…"} ~ ${value.hireDateTo || "…"}`,
        onClear: () => patch({ hireDateFrom: "", hireDateTo: "", scenario: "" }),
      });
    }
  }

  if (value.status && !value.scenario) {
    chips.push({
      key: "status",
      label: `状态：${employeeStatusLabel(value.status)}`,
      onClear: () => patch({ status: "", scenario: "" }),
    });
  }

  if (value.organizationId) {
    const org = departmentOptions.find((o) => o.value === value.organizationId);
    chips.push({
      key: "organizationId",
      label: `部门：${org?.label ?? value.organizationId}`,
      onClear: () => patch({ organizationId: "" }),
    });
  }

  return chips;
}

type RosterFilterPanelProps = {
  value: RosterFilterState;
  onChange: (next: RosterFilterState) => void;
  departmentOptions: SearchableSelectOption[];
  positionOptions: SearchableSelectOption[];
};

export function rosterFilterToQuery(filter: RosterFilterState) {
  const base = {
    filterMode: filter.filterMode,
    asOfDate: filter.asOfDate || todayStr(),
  };
  if (filter.filterMode === "ADVANCED") {
    return {
      ...base,
      fullName: filter.fullName || undefined,
      employeeNo: filter.employeeNo || undefined,
      companyEmail: filter.companyEmail || undefined,
      personalEmail: filter.personalEmail || undefined,
      positionId: filter.positionId || undefined,
      organizationId: filter.organizationId || undefined,
      status: filter.status || undefined,
      gender: filter.gender || undefined,
      hireDateFrom: filter.hireDateFrom || undefined,
      hireDateTo: filter.hireDateTo || undefined,
    };
  }
  return {
    ...base,
    keyword: filter.keyword || undefined,
    status: filter.status || undefined,
    organizationId: filter.organizationId || undefined,
    ...(filter.hireDateFrom || filter.hireDateTo
      ? {
          filterMode: "ADVANCED" as const,
          hireDateFrom: filter.hireDateFrom || undefined,
          hireDateTo: filter.hireDateTo || undefined,
        }
      : {}),
  };
}

function CompactField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="truncate text-[11px] font-medium leading-none text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterModeSwitch({
  value,
  onChange,
}: {
  value: EmployeeListFilterMode;
  onChange: (mode: EmployeeListFilterMode) => void;
}) {
  return (
    <div
      className="inline-flex h-8 shrink-0 rounded-md border border-border/70 bg-muted/40 p-0.5"
      role="tablist"
      aria-label="筛选模式"
    >
      {FILTER_MODES.map((mode) => {
        const active = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            title={mode.hint}
            aria-selected={active}
            onClick={() => onChange(mode.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-[5px] px-2.5 text-xs font-medium transition-all duration-150",
              active
                ? "bg-background text-primary shadow-sm ring-1 ring-primary/20"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {mode.id === "FUZZY" ? (
              <Search className="size-3 opacity-70" />
            ) : (
              <SlidersHorizontal className="size-3 opacity-70" />
            )}
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

export function RosterFilterPanel({
  value,
  onChange,
  departmentOptions,
  positionOptions,
}: RosterFilterPanelProps) {
  const patch = (partial: Partial<RosterFilterState>) => {
    const next = { ...value, ...partial };
    if (
      partial.scenario === undefined &&
      (partial.status !== undefined ||
        partial.hireDateFrom !== undefined ||
        partial.hireDateTo !== undefined)
    ) {
      next.scenario = "";
    }
    onChange(next);
  };

  const activeCount = countActiveRosterFilters(value);
  const modeMeta = FILTER_MODES.find((m) => m.id === value.filterMode) ?? FILTER_MODES[0];
  const chips = buildFilterChips(value, onChange, departmentOptions, positionOptions);

  const clearFilters = () => {
    onChange({
      ...EMPTY_ROSTER_FILTER,
      filterMode: value.filterMode,
      asOfDate: todayStr(),
    });
  };

  return (
    <div className="space-y-2.5 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          场景
        </span>
        {SCENARIOS.map((s) => {
          const active = value.scenario === s.id;
          const Icon = s.icon;
          return (
            <button
              key={s.id || "all"}
              type="button"
              title={s.hint}
              onClick={() => onChange(applyRosterScenario(value, s.id))}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium",
                active ? adminChipActive : adminChipIdle,
              )}
            >
              <Icon className="size-3 opacity-70" />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <FilterModeSwitch
          value={value.filterMode}
          onChange={(filterMode) => patch({ filterMode })}
        />
        <p className="min-w-0 flex-1 truncate text-[11px] leading-none text-muted-foreground/85">
          {modeMeta.hint}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {activeCount > 0 ? (
            <Badge
              variant="secondary"
              className="h-6 gap-1 rounded-md px-1.5 text-[11px] font-normal"
            >
              <Sparkles className="size-3 text-primary/80" />
              {activeCount}
            </Badge>
          ) : null}
          {activeCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={clearFilters}
            >
              <RotateCcw className="size-3" />
              清空
            </Button>
          ) : null}
        </div>
      </div>

      {value.filterMode === "FUZZY" ? (
        <div className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(120px,0.4fr)_minmax(160px,0.65fr)_minmax(140px,0.4fr)]">
          <CompactField label="关键词">
            <InputGroup className={adminFilterInputGroupClassName({ empty: !value.keyword.trim() })}>
              <InputGroupAddon className="pl-2.5">
                <Search className="size-3.5 opacity-50" />
              </InputGroupAddon>
              <InputGroupInput
                value={value.keyword}
                onChange={(e) => patch({ keyword: e.target.value })}
                placeholder="姓名、工号、岗位、部门、邮箱…"
                className={cn(
                  "h-8 !text-sm",
                  value.keyword.trim()
                    ? "font-medium text-foreground"
                    : "font-normal text-muted-foreground",
                )}
              />
            </InputGroup>
          </CompactField>
          <CompactField label="在职状态">
            <OptionSelect
              value={value.status}
              onValueChange={(status) =>
                patch({ status: status as EmployeeStatus | "", scenario: "" })
              }
              allowEmpty
              emptyLabel="全部状态"
              options={EMPLOYEE_STATUS_OPTIONS.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
              className={adminFilterSelectTriggerClassName}
            />
          </CompactField>
          <CompactField label="所属部门">
            <SearchableSelect
              value={value.organizationId}
              onChange={(organizationId) => patch({ organizationId })}
              options={departmentOptions}
              placeholder="全部部门"
              searchPlaceholder="搜索部门编码 / 名称…"
              allowEmpty
              emptyLabel="全部部门"
              className={adminFilterSearchableTriggerClassName}
            />
          </CompactField>
          <CompactField label="生效日">
            <Input
              type="date"
              value={value.asOfDate || todayStr()}
              onChange={(e) => {
                const asOfDate = e.target.value || todayStr();
                if (value.scenario === "HIRED_THIS_MONTH") {
                  onChange(applyRosterScenario({ ...value, asOfDate }, "HIRED_THIS_MONTH"));
                } else {
                  patch({ asOfDate });
                }
              }}
              className={adminFilterInputClassName({
                empty: !value.asOfDate || value.asOfDate === todayStr(),
              })}
              title="按该日取主档与主任职生效快照；默认今天"
            />
          </CompactField>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <CompactField label="姓名">
            <Input
              value={value.fullName}
              onChange={(e) => patch({ fullName: e.target.value })}
              placeholder="包含匹配"
              className={adminFilterInputClassName({ empty: !value.fullName.trim() })}
            />
          </CompactField>
          <CompactField label="工号">
            <Input
              value={value.employeeNo}
              onChange={(e) => patch({ employeeNo: e.target.value })}
              placeholder="包含匹配"
              className={adminFilterInputClassName({ empty: !value.employeeNo.trim() })}
            />
          </CompactField>
          <CompactField label="性别">
            <OptionSelect
              value={value.gender}
              onValueChange={(gender) => patch({ gender })}
              allowEmpty
              emptyLabel="全部"
              options={GENDER_OPTIONS.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
              className={adminFilterSelectTriggerClassName}
            />
          </CompactField>
          <CompactField label="公司邮箱">
            <Input
              value={value.companyEmail}
              onChange={(e) => patch({ companyEmail: e.target.value })}
              placeholder="包含匹配"
              className={adminFilterInputClassName({ empty: !value.companyEmail.trim() })}
            />
          </CompactField>
          <CompactField label="个人邮箱">
            <Input
              value={value.personalEmail}
              onChange={(e) => patch({ personalEmail: e.target.value })}
              placeholder="包含匹配"
              className={adminFilterInputClassName({ empty: !value.personalEmail.trim() })}
            />
          </CompactField>
          <CompactField label="岗位">
            <SearchableSelect
              value={value.positionId}
              onChange={(positionId) => patch({ positionId })}
              options={positionOptions}
              placeholder="全部岗位"
              searchPlaceholder="搜索岗位编码 / 名称…"
              allowEmpty
              emptyLabel="全部岗位"
              className={adminFilterSearchableTriggerClassName}
            />
          </CompactField>
          <CompactField label="部门">
            <SearchableSelect
              value={value.organizationId}
              onChange={(organizationId) => patch({ organizationId })}
              options={departmentOptions}
              placeholder="全部部门"
              searchPlaceholder="搜索部门编码 / 名称…"
              allowEmpty
              emptyLabel="全部部门"
              className={adminFilterSearchableTriggerClassName}
            />
          </CompactField>
          <CompactField label="在职状态">
            <OptionSelect
              value={value.status}
              onValueChange={(status) =>
                patch({ status: status as EmployeeStatus | "", scenario: "" })
              }
              allowEmpty
              emptyLabel="全部"
              options={EMPLOYEE_STATUS_OPTIONS.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
              className={adminFilterSelectTriggerClassName}
            />
          </CompactField>
          <CompactField label="入职起">
            <Input
              type="date"
              value={value.hireDateFrom}
              onChange={(e) => patch({ hireDateFrom: e.target.value, scenario: "" })}
              className={adminFilterInputClassName({ empty: !value.hireDateFrom })}
            />
          </CompactField>
          <CompactField label="入职止">
            <Input
              type="date"
              value={value.hireDateTo}
              onChange={(e) => patch({ hireDateTo: e.target.value, scenario: "" })}
              className={adminFilterInputClassName({ empty: !value.hireDateTo })}
            />
          </CompactField>
          <CompactField label="生效日">
            <Input
              type="date"
              value={value.asOfDate || todayStr()}
              onChange={(e) => {
                const asOfDate = e.target.value || todayStr();
                if (value.scenario === "HIRED_THIS_MONTH") {
                  onChange(applyRosterScenario({ ...value, asOfDate }, "HIRED_THIS_MONTH"));
                } else {
                  patch({ asOfDate });
                }
              }}
              className={adminFilterInputClassName({
                empty: !value.asOfDate || value.asOfDate === todayStr(),
              })}
              title="按该日取主档与主任职生效快照；默认今天"
            />
          </CompactField>
        </div>
      )}

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2">
          <span className="text-[11px] text-muted-foreground">已选</span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onClear}
              className="group inline-flex h-6 max-w-[240px] items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-1.5 text-[11px] text-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5"
              title="点击清除"
            >
              <span className="truncate">{chip.label}</span>
              <X className="size-3 shrink-0 opacity-50 group-hover:opacity-90" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
