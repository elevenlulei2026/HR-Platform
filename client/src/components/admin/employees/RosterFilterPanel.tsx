import type { EmployeeListFilterMode, EmployeeStatus } from "@shared/api.interface";
import type { ReactNode } from "react";

import { CalendarClock, RotateCcw, Search, SlidersHorizontal, Sparkles } from "lucide-react";

import { EMPLOYEE_STATUS_OPTIONS, GENDER_OPTIONS } from "@/api/employee";
import { FormField } from "@/components/admin/form-field";
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
  { id: "FUZZY", label: "快速筛选", hint: "姓名、工号、岗位、部门、邮箱模糊匹配" },
  { id: "ADVANCED", label: "高级精确", hint: "多条件精确组合查询" },
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

function FilterModeSwitch({
  value,
  onChange,
}: {
  value: EmployeeListFilterMode;
  onChange: (mode: EmployeeListFilterMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-border/80 bg-muted/35 p-1 shadow-inner"
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
            aria-selected={active}
            onClick={() => onChange(mode.id)}
            className={cn(
              "relative rounded-md px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

function AdvancedFieldGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
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

  return (
    <div className="space-y-4 px-4 pb-4 pt-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <FilterModeSwitch
            value={value.filterMode}
            onChange={(filterMode) => patch({ filterMode })}
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {value.filterMode === "FUZZY" ? (
              <Search className="size-3.5 shrink-0 opacity-70" />
            ) : (
              <SlidersHorizontal className="size-3.5 shrink-0 opacity-70" />
            )}
            {modeMeta.hint}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeCount > 0 ? (
            <Badge variant="secondary" className="h-7 gap-1 rounded-full px-2.5 font-normal">
              <Sparkles className="size-3 text-primary/80" />
              已选 {activeCount} 项
            </Badge>
          ) : null}
          <Badge variant="outline" className="h-7 gap-1.5 rounded-full px-2.5 font-normal text-muted-foreground">
            <CalendarClock className="size-3.5" />
            今日快照 {todayStr()}
          </Badge>
          {activeCount > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
              <RotateCcw />
              清空
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-gradient-to-b from-muted/20 to-background p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {value.filterMode === "FUZZY" ? (
          <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(140px,0.5fr)_minmax(220px,0.7fr)]">
            <FormField label="关键词">
              <InputGroup className="h-10 bg-background/90">
                <InputGroupAddon>
                  <Search className="size-4 opacity-55" />
                </InputGroupAddon>
                <InputGroupInput
                  value={value.keyword}
                  onChange={(e) => patch({ keyword: e.target.value })}
                  placeholder="姓名、工号、岗位、部门、邮箱…"
                  className="text-sm"
                />
              </InputGroup>
            </FormField>
            <FormField label="在职状态">
              <OptionSelect
                value={value.status}
                onValueChange={(status) => patch({ status: status as EmployeeStatus | "" })}
                allowEmpty
                emptyLabel="全部状态"
                options={EMPLOYEE_STATUS_OPTIONS.map((option) => ({
                  value: option.id,
                  label: option.label,
                }))}
              />
            </FormField>
            <FormField label="所属部门">
              <SearchableSelect
                value={value.organizationId}
                onChange={(organizationId) => patch({ organizationId })}
                options={departmentOptions}
                placeholder="全部部门"
                searchPlaceholder="搜索部门编码 / 名称…"
                allowEmpty
                emptyLabel="全部部门"
              />
            </FormField>
          </div>
        ) : (
          <div className="space-y-5">
            <AdvancedFieldGroup title="人员标识">
              <FormField label="姓名">
                <Input
                  value={value.fullName}
                  onChange={(e) => patch({ fullName: e.target.value })}
                  placeholder="完全匹配"
                  className="bg-background/90"
                />
              </FormField>
              <FormField label="工号">
                <Input
                  value={value.employeeNo}
                  onChange={(e) => patch({ employeeNo: e.target.value })}
                  placeholder="完全匹配"
                  className="bg-background/90 font-mono"
                />
              </FormField>
              <FormField label="性别">
                <OptionSelect
                  value={value.gender}
                  onValueChange={(gender) => patch({ gender })}
                  allowEmpty
                  emptyLabel="全部"
                  options={GENDER_OPTIONS.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                />
              </FormField>
            </AdvancedFieldGroup>

            <AdvancedFieldGroup title="联系与任职">
              <FormField label="公司邮箱">
                <Input
                  value={value.companyEmail}
                  onChange={(e) => patch({ companyEmail: e.target.value })}
                  placeholder="完全匹配"
                  className="bg-background/90"
                />
              </FormField>
              <FormField label="个人邮箱">
                <Input
                  value={value.personalEmail}
                  onChange={(e) => patch({ personalEmail: e.target.value })}
                  placeholder="完全匹配"
                  className="bg-background/90"
                />
              </FormField>
              <FormField label="岗位">
                <SearchableSelect
                  value={value.positionId}
                  onChange={(positionId) => patch({ positionId })}
                  options={positionOptions}
                  placeholder="全部岗位"
                  searchPlaceholder="搜索岗位编码 / 名称…"
                  allowEmpty
                  emptyLabel="全部岗位"
                />
              </FormField>
              <FormField label="部门">
                <SearchableSelect
                  value={value.organizationId}
                  onChange={(organizationId) => patch({ organizationId })}
                  options={departmentOptions}
                  placeholder="全部部门"
                  searchPlaceholder="搜索部门编码 / 名称…"
                  allowEmpty
                  emptyLabel="全部部门"
                />
              </FormField>
              <FormField label="在职状态">
                <OptionSelect
                  value={value.status}
                  onValueChange={(status) => patch({ status: status as EmployeeStatus | "" })}
                  allowEmpty
                  emptyLabel="全部"
                  options={EMPLOYEE_STATUS_OPTIONS.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                />
              </FormField>
            </AdvancedFieldGroup>

            <AdvancedFieldGroup title="入职日期">
              <FormField label="开始日期">
                <Input
                  type="date"
                  value={value.hireDateFrom}
                  onChange={(e) => patch({ hireDateFrom: e.target.value })}
                  className="bg-background/90"
                />
              </FormField>
              <FormField label="结束日期">
                <Input
                  type="date"
                  value={value.hireDateTo}
                  onChange={(e) => patch({ hireDateTo: e.target.value })}
                  className="bg-background/90"
                />
              </FormField>
            </AdvancedFieldGroup>
          </div>
        )}
      </div>
    </div>
  );
}
