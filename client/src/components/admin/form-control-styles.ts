import { cn } from "@/lib/utils";

/** 与 OptionSelect 触发器对齐的表单控件外壳 */
export function adminFormControlShellClassName(options?: {
  empty?: boolean;
  readOnly?: boolean;
}) {
  return cn(
    "min-h-9 w-full rounded-xl border px-3 py-2 text-sm",
    "bg-gradient-to-br from-muted/20 via-background to-muted/5",
    "transition-colors outline-none",
    options?.readOnly
      ? "border-border/45 bg-muted/15"
      : cn(
          "border-border/55",
          "hover:border-border hover:bg-muted/10",
          "focus-visible:border-primary/25 focus-visible:ring-2 focus-visible:ring-primary/10",
          options?.empty && "border-dashed border-border/70",
        ),
  );
}

export const adminFormControlValueClassName = "font-medium text-foreground";
export const adminFormControlPlaceholderClassName = "font-normal text-muted-foreground";
