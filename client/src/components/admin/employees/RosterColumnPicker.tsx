import { useMemo } from "react";
import { Columns3, RotateCcw } from "lucide-react";

import {
  DEFAULT_ROSTER_COLUMN_KEYS,
  ROSTER_COLUMNS,
  type RosterColumnCategory,
  saveVisibleColumnKeys,
} from "@/components/admin/employees/roster-columns";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type RosterColumnPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
};

const CATEGORY_ORDER: RosterColumnCategory[] = ["core", "master", "assignment"];

export function RosterColumnPicker({
  open,
  onOpenChange,
  visibleKeys,
  onChange,
}: RosterColumnPickerProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof ROSTER_COLUMNS>();
    for (const col of ROSTER_COLUMNS) {
      const list = map.get(col.categoryLabel) ?? [];
      list.push(col);
      map.set(col.categoryLabel, list);
    }
    return CATEGORY_ORDER.flatMap((category) => {
      const label = ROSTER_COLUMNS.find((c) => c.category === category)?.categoryLabel ?? category;
      return [{ category, label, columns: map.get(label) ?? [] }];
    }).filter((group) => group.columns.length > 0);
  }, []);

  const toggle = (key: string) => {
    if (visibleKeys.includes(key)) {
      if (visibleKeys.length <= 1) return;
      onChange(visibleKeys.filter((k) => k !== key));
      return;
    }
    const next = [...visibleKeys, key];
    const ordered = ROSTER_COLUMNS.map((c) => c.key).filter((k) => next.includes(k));
    onChange(ordered);
  };

  const reset = () => {
    onChange([...DEFAULT_ROSTER_COLUMN_KEYS]);
  };

  const apply = () => {
    saveVisibleColumnKeys(visibleKeys);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Columns3 className="size-4" />
            自定义列
          </SheetTitle>
          <SheetDescription>
            勾选要在花名册中显示的字段。字典类字段展示名称；任职字段取当前有效主任职快照。
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {grouped.map((group) => (
            <section key={group.label} className="space-y-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.columns.map((col) => {
                  const active = visibleKeys.includes(col.key);
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => toggle(col.key)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors",
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      {col.label}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <SheetFooter className="border-t px-5 py-4 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            <RotateCcw />
            恢复默认
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="button" size="sm" onClick={apply}>
              应用
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function RosterColumnPickerTrigger({
  onClick,
  visibleCount,
}: {
  onClick: () => void;
  visibleCount: number;
}) {
  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onClick}>
      <Columns3 className="size-3.5" />
      列设置
      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
        {visibleCount}
      </span>
    </Button>
  );
}
