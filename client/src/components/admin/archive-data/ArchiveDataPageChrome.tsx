import type { ReactNode } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Layers3,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ArchiveDataResourceDef } from "@/config/archive-data-resources";
import {
  ARCHIVE_SECTION_LABELS,
  ARCHIVE_SECTION_ORDER,
} from "@/config/archive-permissions";
import { cn } from "@/lib/utils";

type ArchiveDataPageChromeProps = {
  currentPath?: string | null;
  currentTitle: string;
  description?: string;
  resources: ArchiveDataResourceDef[];
  actions?: ReactNode;
  onBackToHub: () => void;
  onSelectResource: (path: string) => void;
};

/**
 * 批管资源页紧凑顶栏：管理数据 › 当前对象下拉（按分区分组，显示名称）。
 */
export function ArchiveDataPageChrome({
  currentPath,
  currentTitle,
  description,
  resources,
  actions,
  onBackToHub,
  onSelectResource,
}: ArchiveDataPageChromeProps) {
  const groups = ARCHIVE_SECTION_ORDER.map((section) => ({
    section,
    label: ARCHIVE_SECTION_LABELS[section],
    items: resources.filter((r) => r.section === section),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={onBackToHub}
            className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Layers3 className="size-3.5 opacity-70" />
            管理数据
          </button>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex h-7 max-w-[min(100%,280px)] items-center gap-1 rounded-md border border-border/70 bg-background px-2",
                "text-[15px] font-semibold tracking-tight text-foreground shadow-sm",
                "outline-none transition-colors hover:border-primary/30 hover:bg-primary/[0.03]",
                "focus-visible:ring-3 focus-visible:ring-ring/40",
              )}
            >
              <span className="truncate">{currentTitle}</span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[280px] max-h-[min(420px,var(--available-height))] p-1.5"
            >
              <div className="px-1.5 pb-1.5 pt-0.5 text-[11px] text-muted-foreground">
                切换数据对象
              </div>
              {groups.map((group, gi) => (
                <DropdownMenuGroup key={group.section}>
                  {gi > 0 ? <DropdownMenuSeparator className="my-1" /> : null}
                  <DropdownMenuLabel className="px-2 text-[11px]">
                    {group.label}
                  </DropdownMenuLabel>
                  {group.items.map((item) => {
                    const active = item.path === currentPath;
                    return (
                      <DropdownMenuItem
                        key={item.path}
                        className={cn(
                          "cursor-pointer gap-2 rounded-md px-2 py-1.5",
                          active && "bg-primary/8 text-foreground",
                        )}
                        onClick={() => {
                          if (item.path !== currentPath) onSelectResource(item.path);
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {item.title}
                        </span>
                        {!item.supported ? (
                          <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
                            建设中
                          </Badge>
                        ) : null}
                        {active ? (
                          <Check className="size-3.5 shrink-0 text-primary" />
                        ) : (
                          <span className="size-3.5 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {description ? (
          <p className="max-w-2xl text-[13px] leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
