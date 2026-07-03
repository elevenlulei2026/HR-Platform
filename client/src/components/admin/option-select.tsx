import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type OptionSelectItem = {
  value: string;
  label: string;
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
};

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
}: OptionSelectProps) {
  const items = useMemo(() => {
    const list = options.map((opt) => ({ value: opt.value, label: opt.label }));
    if (allowEmpty) return [{ value: emptyValue, label: emptyLabel }, ...list];
    return list;
  }, [allowEmpty, emptyLabel, emptyValue, options]);

  const selectValue = allowEmpty ? value || emptyValue : value;

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
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? (
          <SelectItem value={emptyValue} label={emptyLabel}>
            {emptyLabel}
          </SelectItem>
        ) : null}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} label={opt.label}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
