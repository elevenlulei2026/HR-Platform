import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, Building2, ChevronsUpDown, GitBranchPlus, Loader2, Search, X } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminFormControlPlaceholderClassName,
  adminFormControlShellClassName,
  adminFormControlValueClassName,
} from "@/components/admin/form-control-styles";
import {
  formatCodeName,
  type SearchableEntityIcon,
  type SearchableSelectOption,
} from "@/components/admin/searchable-select";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__none__";

type SearchableDialogPickerProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  dialogTitle: string;
  dialogDescription?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  formatOption?: (option: SearchableSelectOption) => string;
  entityIcon?: SearchableEntityIcon;
  entityEmptyTitle?: string;
  entityEmptyHint?: string;
  entitySelectedHint?: string;
  shouldFilter?: boolean;
  onSearchChange?: (query: string) => void;
  loading?: boolean;
  /** 默认在控件下方显示“点击打开/已选择”提示；表单密集布局可关闭以保持高度一致 */
  helperText?: "auto" | "none";
};

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
      </div>
    </div>
  );
}

export function SearchableDialogPicker({
  value,
  onChange,
  options,
  dialogTitle,
  dialogDescription = "输入编码或名称搜索，点击条目完成选择",
  placeholder = "点击搜索选择",
  searchPlaceholder = "输入编码或名称搜索…",
  allowEmpty = false,
  emptyLabel = "不指定",
  disabled,
  className,
  formatOption = formatCodeName,
  entityIcon = "building",
  entityEmptyTitle,
  entityEmptyHint,
  entitySelectedHint,
  shouldFilter = true,
  onSearchChange,
  loading = false,
  helperText = "auto",
}: SearchableDialogPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selected = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  );

  const displayValue = selected
    ? formatOption(selected)
    : allowEmpty && !value
      ? emptyLabel
      : "";

  const resolvedEntityEmptyTitle = entityEmptyTitle ?? placeholder;
  const resolvedEntityEmptyHint = entityEmptyHint ?? "点击打开搜索弹窗";
  const resolvedEntitySelectedHint = entitySelectedHint ?? "已选择，点击可重新搜索";

  const close = useCallback(() => {
    setOpen(false);
    setSearchQuery("");
    onSearchChange?.("");
  }, [onSearchChange]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  const handleSelect = (next: string) => {
    onChange(next === EMPTY_VALUE ? "" : next);
    close();
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearchChange?.(query);
  };

  const handleClear = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={cn(
          "group/trigger flex w-full items-center gap-2 text-left transition-all outline-none",
          adminFormControlShellClassName({ empty: !displayValue && allowEmpty }),
          "min-h-9 py-2",
          disabled && "pointer-events-none opacity-50",
          className,
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm",
            displayValue ? adminFormControlValueClassName : adminFormControlPlaceholderClassName,
          )}
        >
          {displayValue || resolvedEntityEmptyTitle}
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
          <Search className="size-3.5 text-muted-foreground/70 transition-colors group-hover/trigger:text-primary" />
          <ChevronsUpDown className="size-4 text-muted-foreground/70" />
        </span>
      </button>
      {helperText === "auto" ? (
        !displayValue ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{resolvedEntityEmptyHint}</p>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">{resolvedEntitySelectedHint}</p>
        )
      ) : null}

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent nested className="flex max-h-[min(80vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b bg-muted/20 px-5 py-4 pr-12 text-left">
            <DialogTitle className="text-base font-semibold">{dialogTitle}</DialogTitle>
            <DialogDescription className="text-xs">{dialogDescription}</DialogDescription>
          </DialogHeader>
          <Command shouldFilter={shouldFilter} className="min-h-0 flex-1 gap-0 bg-transparent p-0">
            <div className="shrink-0 border-b px-3 py-2">
              <CommandInput
                variant="soft"
                placeholder={searchPlaceholder}
                value={shouldFilter ? undefined : searchQuery}
                onValueChange={handleSearchChange}
              />
            </div>
            <CommandList className="max-h-[min(52vh,420px)] overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  加载中…
                </div>
              ) : (
                <CommandEmpty className="py-10 text-muted-foreground">未找到匹配项</CommandEmpty>
              )}
              <CommandGroup className="gap-0.5 p-0">
                {allowEmpty ? (
                  <CommandItem
                    value={`${EMPTY_VALUE} ${emptyLabel}`}
                    onSelect={() => handleSelect(EMPTY_VALUE)}
                    className="mb-1 rounded-lg border border-dashed border-border/50 bg-muted/10 px-2.5 py-2.5 data-selected:border-border/60 data-selected:bg-primary/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed bg-background text-muted-foreground">
                        <GitBranchPlus className="size-3.5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{emptyLabel}</div>
                        <div className="text-[11px] text-muted-foreground">清除当前选择</div>
                      </div>
                    </div>
                  </CommandItem>
                ) : null}
                {options.map((opt) => {
                  const text = formatOption(opt);
                  const searchValue =
                    opt.keywords ?? `${opt.value} ${opt.label} ${opt.code ?? ""} ${text}`;
                  return (
                    <CommandItem
                      key={opt.value}
                      value={searchValue}
                      onSelect={() => handleSelect(opt.value)}
                      className="rounded-lg px-2.5 py-2 data-selected:bg-primary/5"
                    >
                      <EntityOptionRow option={opt} icon={entityIcon} />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
