import { ArrowRight } from "lucide-react";

import type { AdminNavColumn } from "@/config/admin-nav";
import { cn } from "@/lib/utils";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";

type AdminMegaMenuPanelProps = {
  columns: AdminNavColumn[];
  pathname: string;
  onNavigate: (to: string) => void;
};

function isCurrentPath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AdminMegaMenuPanel({
  columns,
  pathname,
  onNavigate,
}: AdminMegaMenuPanelProps) {
  return (
    <div
      className={cn(
        "grid max-w-[calc(100vw-2rem)] gap-0 p-2",
        columns.length <= 2
          ? "w-[560px] grid-cols-2"
          : "w-[720px] grid-cols-3",
      )}
    >
      {columns.map((column, columnIndex) => (
        <section
          key={column.title}
          aria-label={column.title}
          className={cn(
            "min-w-0 px-2 py-1",
            columnIndex > 0 && "border-l border-border/70",
          )}
        >
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
              {column.title}
            </h3>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {column.links.length} 项
            </span>
          </div>

          <div className="space-y-1">
            {column.links.map((link) => {
              const active = isCurrentPath(pathname, link.to);
              const Icon = link.icon;

              return (
                <NavigationMenuLink
                  key={link.to}
                  href={link.to}
                  aria-current={active ? "page" : undefined}
                  data-active={active ? "" : undefined}
                  className={cn(
                    "group/link min-h-14 items-start gap-3 rounded-xl px-3 py-2.5",
                    "hover:bg-primary/[0.06] focus:bg-primary/[0.06]",
                    active && "bg-primary/[0.08] hover:bg-primary/[0.1]",
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(link.to);
                  }}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors",
                      "group-hover/link:bg-primary/10 group-hover/link:text-primary",
                      active && "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium leading-5 text-foreground">
                      <span className="truncate">{link.title}</span>
                      <ArrowRight
                        className={cn(
                          "size-3.5 shrink-0 text-primary opacity-0 transition-all group-hover/link:translate-x-0.5 group-hover/link:opacity-100",
                          active && "opacity-100",
                        )}
                        aria-hidden="true"
                      />
                    </span>
                    {link.description ? (
                      <span className="mt-0.5 block line-clamp-2 text-xs leading-4 text-muted-foreground">
                        {link.description}
                      </span>
                    ) : null}
                  </span>
                </NavigationMenuLink>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
