import { useMemo, type ReactNode } from "react";
import { CircleDashed } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminFormControlShellClassName,
} from "@/components/admin/form-control-styles";
import { cn } from "@/lib/utils";

export type OptionSelectItem = {
  value: string;
  label: string;
  description?: string;
};

type OptionSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: OptionSelectItem[];
  placeholder?: string;
  /** 允许清空为 emptyValue，展示 emptyLabel */
  allowEmpty?: boolean;
  emptyLabel?: string;
  emptyValue?: string;
  disabled?: boolean;
  className?: string;
  /** 自定义下拉项渲染；未提供时使用默认文本行 */
  renderOption?: (option: OptionSelectItem) => ReactNode;
};

function DefaultOptionRow({ option }: { option: OptionSelectItem }) {
  return (
    <div className="min-w-0 py-0.5">
      <div className="truncate text-sm font-medium text-foreground">{option.label}</div>
      {option.description ? (
        <div className="truncate text-[11px] text-muted-foreground">{option.description}</div>
      ) : null}
    </div>
  );
}

function EmptyOptionRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/25 bg-muted/30 text-muted-foreground">
        <CircleDashed className="size-3.5" />
      </div>
      <div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground/80">留空表示不指定</div>
      </div>
    </div>
  );
}

/**
 * 带 label 映射的下拉选择。向 Base UI Select 传入 items，确保收起时显示名称而非 value/code。
 */
export function OptionSelect({
  value,
  onValueChange,
  options,
  placeholder = "请选择",
  allowEmpty = false,
  emptyLabel = "不指定",
  emptyValue = "__none__",
  disabled,
  className,
  renderOption,
}: OptionSelectProps) {
  const items = useMemo(() => {
    const list = options.map((opt) => ({ value: opt.value, label: opt.label }));
    if (allowEmpty) return [{ value: emptyValue, label: emptyLabel }, ...list];
    return list;
  }, [allowEmpty, emptyLabel, emptyValue, options]);

  const selectValue = allowEmpty ? value || emptyValue : value;
  const hasSelection = allowEmpty ? Boolean(value) : Boolean(value?.trim());

  const renderRow = (option: OptionSelectItem) =>
    renderOption ? renderOption(option) : <DefaultOptionRow option={option} />;

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => {
        if (!v) return;
        onValueChange(allowEmpty && v === emptyValue ? "" : v);
      }}
      items={items}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          adminFormControlShellClassName({ empty: !hasSelection && allowEmpty }),
          "h-auto justify-between gap-2",
          className,
        )}
      >
        <SelectValue placeholder={placeholder} className="text-sm font-medium" />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border/60 shadow-lg">
        {allowEmpty ? (
          <SelectItem
            value={emptyValue}
            label={emptyLabel}
            className="mb-1 rounded-lg border border-dashed border-border/50 bg-muted/10 px-2.5 py-2 data-highlighted:border-border/60"
          >
            <EmptyOptionRow label={emptyLabel} />
          </SelectItem>
        ) : null}
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            label={opt.label}
            className="rounded-lg px-2.5 py-2 data-highlighted:bg-primary/5"
          >
            {renderRow(opt)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
