import { cn } from "@/lib/utils";

/** 与 OptionSelect 触发器对齐的表单控件外壳 */
export function adminFormControlShellClassName(options?: {
  empty?: boolean;
  readOnly?: boolean;
  /** compact：筛选条等紧凑场景，h-8 + rounded-lg */
  size?: "default" | "compact";
}) {
  const compact = options?.size === "compact";
  return cn(
    "w-full border text-sm transition-colors outline-none",
    compact ? "h-8 min-h-8 rounded-lg px-2.5 py-0" : "min-h-9 rounded-xl px-3 py-2",
    "bg-background",
    options?.readOnly
      ? "border-border bg-muted/15"
      : cn(
          "border-border",
          "hover:border-primary/30 hover:bg-primary/[0.02]",
          "focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15",
          options?.empty && "border-dashed border-border",
        ),
  );
}

export const adminFormControlValueClassName = "font-medium text-foreground";
export const adminFormControlPlaceholderClassName = "font-normal text-muted-foreground";

/** 筛选条 Input：与 OptionSelect / SearchableSelect 同外壳、同字重 */
export function adminFilterInputClassName(options?: { empty?: boolean; mono?: boolean }) {
  const empty = options?.empty ?? false;
  return cn(
    adminFormControlShellClassName({ size: "compact", empty }),
    "shadow-none !text-sm",
    empty ? adminFormControlPlaceholderClassName : adminFormControlValueClassName,
    options?.mono && "font-mono text-[13px] tracking-tight",
  );
}

/** 筛选条 InputGroup 外壳（内部 input 透明） */
export function adminFilterInputGroupClassName(options?: { empty?: boolean }) {
  return cn(
    adminFormControlShellClassName({ size: "compact", empty: options?.empty }),
    // 覆盖 InputGroup 默认 border-input / focus ring，对齐 admin 外壳
    "border-border has-[[data-slot=input-group-control]:focus-visible]:border-primary/40",
    "has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-primary/15",
  );
}

/** 筛选条下拉触发器覆盖（叠在已有 adminFormControlShell 上） */
export const adminFilterSelectTriggerClassName =
  "!h-8 min-h-8 rounded-lg px-2.5 py-0 text-sm font-medium";

export const adminFilterSearchableTriggerClassName =
  "[&>button]:!h-8 [&>button]:min-h-8 [&>button]:rounded-lg [&>button]:px-2.5 [&>button]:py-0 [&>button]:text-sm";
