import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Building2, ChevronsUpDown, GitBranchPlus, X } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  /** 展示用编码，默认取 value */
  code?: string;
  keywords?: string;
};

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
};

const EMPTY_VALUE = "__none__";

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

function EntityOptionRow({ option }: { option: SearchableSelectOption }) {
  const code = option.code ?? option.value;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
        <Building2 className="size-3.5" />
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
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const close = useCallback(() => setOpen(false), []);

  useClickOutside(containerRef, close, open);

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

  const handleClear = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {variant === "entity" ? (
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          onClick={toggleOpen}
          className={cn(
            "group/trigger flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all outline-none",
            "border-border/55 bg-gradient-to-br from-muted/20 via-background to-muted/5",
            "hover:border-border hover:bg-muted/10",
            "focus-visible:border-primary/25 focus-visible:ring-2 focus-visible:ring-primary/10",
            open && "border-primary/20 bg-background ring-1 ring-primary/8",
            selected && !open && "border-border/60",
            !selected && allowEmpty && "border-dashed border-border/70",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          {selected ? (
            <>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/15">
                <Building2 className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <OptionCodeBadge code={selected.code ?? selected.value} />
                  <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                    {selected.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">已选择上级部门，点击可重新搜索</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 text-muted-foreground">
                <GitBranchPlus className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="text-sm font-medium text-foreground">{emptyLabel}</span>
                <p className="text-[11px] text-muted-foreground">点击打开搜索面板，按部门编号或名称筛选</p>
              </div>
            </>
          )}
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
                aria-label="清除上级组织"
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
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          className={cn(
            "h-8 w-full justify-between gap-2 px-2.5 font-normal",
            !displayValue && "text-muted-foreground",
          )}
          onClick={toggleOpen}
        >
          <span className="min-w-0 truncate text-left text-sm">{displayValue || placeholder}</span>
          <span className="flex shrink-0 items-center gap-1">
            {allowEmpty && value ? (
              <span
                role="button"
                tabIndex={0}
                className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e);
                }}
                aria-label="清除选择"
              >
                <X className="size-3.5" />
              </span>
            ) : null}
            <ChevronsUpDown className="size-3.5 opacity-50" />
          </span>
        </Button>
      )}

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+6px)] z-50 w-full overflow-hidden rounded-xl border border-border/60 bg-popover shadow-md"
        >
          <Command shouldFilter className="gap-0 p-0">
            <CommandInput variant="soft" placeholder={searchPlaceholder} />
            <CommandList className="max-h-64 scroll-py-0.5">
              <CommandEmpty className="py-8 text-muted-foreground">未找到匹配项</CommandEmpty>
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
                          <div className="text-[11px] text-muted-foreground">作为顶层部门，不挂载上级</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{emptyLabel}</span>
                    )}
                  </CommandItem>
                ) : null}
                {options.map((opt) => {
                  const text = formatOption(opt);
                  const searchValue = opt.keywords ?? `${opt.value} ${opt.label} ${opt.code ?? ""} ${text}`;
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
                      {variant === "entity" ? <EntityOptionRow option={opt} /> : <span className="min-w-0 truncate">{text}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  );
}
