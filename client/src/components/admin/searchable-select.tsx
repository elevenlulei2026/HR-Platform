import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Briefcase, Building2, ChevronsUpDown, GitBranchPlus, Loader2, X } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  adminFormControlPlaceholderClassName,
  adminFormControlShellClassName,
  adminFormControlValueClassName,
} from "@/components/admin/form-control-styles";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  /** 展示用编码，默认取 value */
  code?: string;
  /** 次要说明（如员工的部门 · 岗位） */
  description?: string;
  keywords?: string;
};

export type SearchableEntityIcon = "building" | "briefcase";

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  /** default=紧凑下拉；entity=组织/实体选择卡片样式 */
  variant?: "default" | "entity";
  /** 选中项与下拉项的展示格式 */
  formatOption?: (option: SearchableSelectOption) => string;
  /** entity 模式：图标类型 */
  entityIcon?: SearchableEntityIcon;
  /** entity 模式：未选中主文案 */
  entityEmptyTitle?: string;
  /** entity 模式：未选中辅助说明 */
  entityEmptyHint?: string;
  /** entity 模式：已选中辅助说明 */
  entitySelectedHint?: string;
  /** 服务端搜索时关闭 cmdk 本地过滤 */
  shouldFilter?: boolean;
  /** 搜索词变化（配合 shouldFilter=false 做远程搜索） */
  onSearchChange?: (query: string) => void;
  /** 远程加载中 */
  loading?: boolean;
  /** 下拉层挂载到 body，避免被弹窗/抽屉 overflow 裁剪 */
  portal?: boolean;
  /** portal 模式下的层级（需高于 Dialog elevated 的 z-70） */
  dropdownZIndex?: number;
  /**
   * entity 触发器密度：card=大卡片（组织/岗位）；form=与 OptionSelect 一致的单行样式
   */
  entityTone?: "card" | "form";
};

const EMPTY_VALUE = "__none__";
const DROPDOWN_GAP = 6;
const DROPDOWN_MAX_HEIGHT = 288;
const DROPDOWN_MIN_HEIGHT = 160;

type DropdownPlacement = "bottom" | "top";

type DropdownPosition = {
  left: number;
  width: number;
  maxHeight: number;
  placement: DropdownPlacement;
  top: number;
};

function SearchableSelectDropdown({
  listId,
  variant,
  shouldFilter,
  searchPlaceholder,
  searchQuery,
  handleSearchChange,
  loading,
  allowEmpty,
  emptyLabel,
  options,
  formatOption,
  entityIcon,
  handleSelect,
  className,
  style,
  dropdownRef,
}: {
  listId: string;
  variant: "default" | "entity";
  shouldFilter: boolean;
  searchPlaceholder: string;
  searchQuery: string;
  handleSearchChange: (query: string) => void;
  loading: boolean;
  allowEmpty: boolean;
  emptyLabel: string;
  options: SearchableSelectOption[];
  formatOption: (option: SearchableSelectOption) => string;
  entityIcon: SearchableEntityIcon;
  handleSelect: (value: string) => void;
  className?: string;
  style?: CSSProperties;
  dropdownRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={dropdownRef}
      id={listId}
      role="listbox"
      style={style}
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-popover shadow-xl ring-1 ring-foreground/8",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        className,
      )}
    >
      <Command shouldFilter={shouldFilter} className="gap-0 p-0">
        <CommandInput
          variant="soft"
          placeholder={searchPlaceholder}
          value={shouldFilter ? undefined : searchQuery}
          onValueChange={handleSearchChange}
        />
        <CommandList
          className="overflow-y-auto scroll-py-0.5"
          style={{
            maxHeight:
              typeof style?.maxHeight === "number"
                ? Math.max(120, style.maxHeight - 52)
                : 236,
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              加载中…
            </div>
          ) : (
            <CommandEmpty className="py-8 text-muted-foreground">未找到匹配项</CommandEmpty>
          )}
          <CommandGroup className="gap-0.5 p-2">
            {allowEmpty ? (
              <CommandItem
                value={`${EMPTY_VALUE} ${emptyLabel}`}
                onSelect={() => handleSelect(EMPTY_VALUE)}
                className={cn(
                  "data-selected:bg-primary/5 data-selected:text-foreground",
                  variant === "entity"
                    ? "mb-1 rounded-lg border border-dashed border-border/50 bg-muted/10 px-2.5 py-2.5 data-selected:border-border/60"
                    : "rounded-md px-2.5 py-1.5",
                )}
              >
                {variant === "entity" ? (
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed bg-background text-muted-foreground">
                      <GitBranchPlus className="size-3.5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{emptyLabel}</div>
                      <div className="text-[11px] text-muted-foreground">清除当前选择</div>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">{emptyLabel}</span>
                )}
              </CommandItem>
            ) : null}
            {options.map((opt) => {
              const text = formatOption(opt);
              const searchValue =
                opt.keywords ??
                `${opt.value} ${opt.label} ${opt.code ?? ""} ${opt.description ?? ""} ${text}`;
              return (
                <CommandItem
                  key={opt.value}
                  value={searchValue}
                  onSelect={() => handleSelect(opt.value)}
                  className={cn(
                    "data-selected:bg-primary/5 data-selected:text-foreground",
                    variant === "entity" ? "rounded-lg px-2.5 py-2" : "rounded-md px-2.5 py-1.5",
                  )}
                >
                  {variant === "entity" ? (
                    <EntityOptionRow option={opt} icon={entityIcon} />
                  ) : (
                    <span className="min-w-0 truncate">{text}</span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}

export function formatCodeName(option: Pick<SearchableSelectOption, "value" | "label" | "code">) {
  const code = (option.code ?? option.value).trim();
  const name = option.label.trim();
  if (code && name) return `${code} — ${name}`;
  return code || name;
}

function OptionCodeBadge({ code }: { code: string }) {
  return (
    <span className="shrink-0 rounded-md border border-primary/15 bg-primary/8 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-primary">
      {code}
    </span>
  );
}

function EntityOptionRow({
  option,
  icon = "building",
}: {
  option: SearchableSelectOption;
  icon?: SearchableEntityIcon;
}) {
  const code = option.code ?? option.value;
  const Icon = icon === "briefcase" ? Briefcase : Building2;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <OptionCodeBadge code={code} />
          <span className="truncate text-sm font-medium text-foreground">{option.label}</span>
        </div>
        {option.description ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{option.description}</p>
        ) : null}
      </div>
    </div>
  );
}

function EntityIconBadge({
  icon = "building",
  selected,
}: {
  icon?: SearchableEntityIcon;
  selected?: boolean;
}) {
  const Icon = icon === "briefcase" ? Briefcase : Building2;
  if (selected) {
    return (
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/15">
        <Icon className="size-4" />
      </div>
    );
  }
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 text-muted-foreground">
      <Icon className="size-4" />
    </div>
  );
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "请选择",
  searchPlaceholder = "输入编码或名称搜索…",
  allowEmpty = false,
  emptyLabel = "不指定",
  disabled,
  className,
  variant = "default",
  formatOption = formatCodeName,
  entityIcon = "building",
  entityEmptyTitle,
  entityEmptyHint,
  entitySelectedHint,
  shouldFilter = true,
  onSearchChange,
  loading = false,
  portal = true,
  dropdownZIndex = 80,
  entityTone = "card",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setSearchQuery("");
    onSearchChange?.("");
  }, [onSearchChange]);

  const updateDropdownPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP - 8;
    const spaceAbove = rect.top - DROPDOWN_GAP - 8;
    const placement: DropdownPlacement =
      spaceBelow < 220 && spaceAbove > spaceBelow ? "top" : "bottom";
    const maxHeight = Math.max(
      DROPDOWN_MIN_HEIGHT,
      Math.min(DROPDOWN_MAX_HEIGHT, placement === "bottom" ? spaceBelow : spaceAbove),
    );

    setDropdownPosition({
      left: rect.left,
      width: rect.width,
      maxHeight,
      placement,
      top: placement === "bottom" ? rect.bottom + DROPDOWN_GAP : rect.top - DROPDOWN_GAP,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateDropdownPosition();
    const onLayout = () => updateDropdownPosition();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      close();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  const selected = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const displayValue = selected
    ? formatOption(selected)
    : allowEmpty && !value
      ? emptyLabel
      : "";

  const handleSelect = (next: string) => {
    onChange(next === EMPTY_VALUE ? "" : next);
    close();
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearchChange?.(query);
  };

  const resolvedEntityEmptyTitle = entityEmptyTitle ?? emptyLabel;
  const resolvedEntityEmptyHint =
    entityEmptyHint ?? "点击打开搜索面板，按编码或名称筛选";
  const resolvedEntitySelectedHint =
    entitySelectedHint ?? "已选择，点击可重新搜索";
  const isFormEntityTone = variant === "entity" && entityTone === "form";
  const triggerEmpty = !displayValue;

  const handleClear = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) updateDropdownPosition();
      return next;
    });
  };

  const dropdownPanel = open ? (
    <SearchableSelectDropdown
      listId={listId}
      variant={variant}
      shouldFilter={shouldFilter}
      searchPlaceholder={searchPlaceholder}
      searchQuery={searchQuery}
      handleSearchChange={handleSearchChange}
      loading={loading}
      allowEmpty={allowEmpty}
      emptyLabel={emptyLabel}
      options={options}
      formatOption={formatOption}
      entityIcon={entityIcon}
      handleSelect={handleSelect}
      dropdownRef={dropdownRef}
      style={
        portal && dropdownPosition
          ? {
              position: "fixed",
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: dropdownPosition.maxHeight,
              zIndex: dropdownZIndex,
              top: dropdownPosition.top,
              transform:
                dropdownPosition.placement === "top" ? "translateY(-100%)" : undefined,
            }
          : undefined
      }
      className={portal ? undefined : "absolute top-[calc(100%+6px)] z-[100] w-full"}
    />
  ) : null;

  return (
    <div ref={triggerRef} className={cn("relative", className)}>
      {variant === "entity" ? (
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          onClick={toggleOpen}
          className={cn(
            "group/trigger flex w-full items-center gap-2 text-left transition-all outline-none",
            adminFormControlShellClassName({ empty: triggerEmpty && allowEmpty }),
            isFormEntityTone ? "min-h-9 py-2" : "gap-3 px-3 py-2.5",
            !isFormEntityTone && "px-3",
            open && "border-primary/20 bg-background ring-1 ring-primary/8",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          {isFormEntityTone ? (
            <>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  displayValue
                    ? adminFormControlValueClassName
                    : adminFormControlPlaceholderClassName,
                )}
              >
                {displayValue || placeholder}
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                {allowEmpty && value ? (
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={handleClear}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleClear(e);
                    }}
                    aria-label="清除选择"
                  >
                    <X className="size-3.5" />
                  </span>
                ) : null}
                <ChevronsUpDown
                  className={cn(
                    "size-4 text-muted-foreground/70 transition-transform",
                    open && "rotate-180 text-primary",
                  )}
                />
              </span>
            </>
          ) : selected ? (
            <>
              <EntityIconBadge icon={entityIcon} selected />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      adminFormControlValueClassName,
                    )}
                  >
                    {selected.label}
                  </span>
                  <OptionCodeBadge code={selected.code ?? selected.value} />
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {resolvedEntitySelectedHint}
                </p>
              </div>
            </>
          ) : (
            <>
              <EntityIconBadge icon={entityIcon} />
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className={cn("text-sm", adminFormControlValueClassName)}>
                  {resolvedEntityEmptyTitle}
                </span>
                <p className="text-[11px] text-muted-foreground">{resolvedEntityEmptyHint}</p>
              </div>
            </>
          )}
          {!isFormEntityTone ? (
          <span className="flex shrink-0 items-center gap-0.5 self-start pt-0.5">
            {allowEmpty && value ? (
              <span
                role="button"
                tabIndex={0}
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e);
                }}
                aria-label="清除选择"
              >
                <X className="size-3.5" />
              </span>
            ) : null}
            <ChevronsUpDown
              className={cn(
                "size-4 text-muted-foreground/70 transition-transform",
                open && "rotate-180 text-primary",
              )}
            />
          </span>
          ) : null}
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          onClick={toggleOpen}
          className={cn(
            "flex w-full items-center justify-between gap-2 text-left",
            adminFormControlShellClassName({ empty: triggerEmpty && allowEmpty }),
            open && "border-primary/20 bg-background ring-1 ring-primary/8",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              displayValue ? adminFormControlValueClassName : adminFormControlPlaceholderClassName,
            )}
          >
            {displayValue || placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            {allowEmpty && value ? (
              <span
                role="button"
                tabIndex={0}
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e);
                }}
                aria-label="清除选择"
              >
                <X className="size-3.5" />
              </span>
            ) : null}
            <ChevronsUpDown
              className={cn(
                "size-4 text-muted-foreground/70 transition-transform",
                open && "rotate-180 text-primary",
              )}
            />
          </span>
        </button>
      )}

      {dropdownPanel
        ? portal
          ? typeof document !== "undefined"
            ? createPortal(dropdownPanel, document.body)
            : null
          : dropdownPanel
        : null}
    </div>
  );
}
