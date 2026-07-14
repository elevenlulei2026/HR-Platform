import type { EmployeeListFilterMode, EmployeeStatus } from "@shared/api.interface";
import type { ReactNode } from "react";

import { CalendarClock, RotateCcw, Search, SlidersHorizontal, Sparkles } from "lucide-react";

import { EMPLOYEE_STATUS_OPTIONS, GENDER_OPTIONS } from "@/api/employee";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
};

const FILTER_MODES: Array<{ id: EmployeeListFilterMode; label: string; hint: string }> = [
  { id: "FUZZY", label: "快速", hint: "姓名、工号、岗位、部门、邮箱模糊匹配" },
  { id: "ADVANCED", label: "精确", hint: "多条件精确组合查询" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function countActiveRosterFilters(value: RosterFilterState): number {
  if (value.filterMode === "FUZZY") {
    return [value.keyword, value.status, value.organizationId].filter(Boolean).length;
  }
  return [
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
  ].filter(Boolean).length;
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
    asOfDate: todayStr(),
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
  };
}

/** 紧凑字段：标签压到 11px，间距收敛，便于单行/双行工具条 */
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
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
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
  const patch = (partial: Partial<RosterFilterState>) => onChange({ ...value, ...partial });
  const activeCount = countActiveRosterFilters(value);
  const modeMeta = FILTER_MODES.find((m) => m.id === value.filterMode) ?? FILTER_MODES[0];

  const clearFilters = () => {
    onChange({ ...EMPTY_ROSTER_FILTER, filterMode: value.filterMode });
  };

  const metaActions = (
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
      <Badge
        variant="outline"
        className="h-6 gap-1 rounded-md px-1.5 text-[11px] font-normal text-muted-foreground"
        title="列表与导出均按今日 asOfDate 取生效快照"
      >
        <CalendarClock className="size-3" />
        {todayStr()}
      </Badge>
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
  );

  return (
    <div className="space-y-2 px-3 py-2.5">
      {/* 工具条：模式 + 说明 + 元信息同一行 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <FilterModeSwitch
          value={value.filterMode}
          onChange={(filterMode) => patch({ filterMode })}
        />
        <p className="min-w-0 flex-1 truncate text-[11px] leading-none text-muted-foreground/85">
          {modeMeta.hint}
        </p>
        {metaActions}
      </div>

      {value.filterMode === "FUZZY" ? (
        <div className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(120px,0.45fr)_minmax(180px,0.7fr)]">
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
              onValueChange={(status) => patch({ status: status as EmployeeStatus | "" })}
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
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <CompactField label="姓名">
            <Input
              value={value.fullName}
              onChange={(e) => patch({ fullName: e.target.value })}
              placeholder="完全匹配"
              className={adminFilterInputClassName({ empty: !value.fullName.trim() })}
            />
          </CompactField>
          <CompactField label="工号">
            <Input
              value={value.employeeNo}
              onChange={(e) => patch({ employeeNo: e.target.value })}
              placeholder="完全匹配"
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
              placeholder="完全匹配"
              className={adminFilterInputClassName({ empty: !value.companyEmail.trim() })}
            />
          </CompactField>
          <CompactField label="个人邮箱">
            <Input
              value={value.personalEmail}
              onChange={(e) => patch({ personalEmail: e.target.value })}
              placeholder="完全匹配"
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
              onValueChange={(status) => patch({ status: status as EmployeeStatus | "" })}
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
              onChange={(e) => patch({ hireDateFrom: e.target.value })}
              className={adminFilterInputClassName({ empty: !value.hireDateFrom })}
            />
          </CompactField>
          <CompactField label="入职止">
            <Input
              type="date"
              value={value.hireDateTo}
              onChange={(e) => patch({ hireDateTo: e.target.value })}
              className={adminFilterInputClassName({ empty: !value.hireDateTo })}
            />
          </CompactField>
        </div>
      )}
    </div>
  );
}
