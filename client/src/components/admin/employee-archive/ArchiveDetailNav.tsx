import { useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  GitBranch,
  GraduationCap,
  HeartHandshake,
  TrendingUp,
  UserCircle,
} from "lucide-react";

import { ARCHIVE_NAV } from "@/components/admin/employee-archive/archive-section-nav";
import {
  adminPillActive,
  adminPillIdle,
  adminSegmentActive,
  adminSegmentIdle,
} from "@/components/admin/selection-styles";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  personal: UserCircle,
  work: Briefcase,
  service: HeartHandshake,
  background: GraduationCap,
  talent: TrendingUp,
  movements: GitBranch,
};

type ArchiveDetailNavProps = {
  activeCategoryId: string;
  activeSectionId: string;
  sectionCounts: Record<string, number>;
  onCategoryClick: (categoryId: string) => void;
  onSectionClick: (sectionId: string) => void;
};

export function ArchiveDetailNav({
  activeCategoryId,
  activeSectionId,
  sectionCounts,
  onCategoryClick,
  onSectionClick,
}: ArchiveDetailNavProps) {
  const secondaryScrollRef = useRef<HTMLDivElement>(null);
  const activeSectionRef = useRef<HTMLButtonElement>(null);

  const activeCategory = ARCHIVE_NAV.find((c) => c.id === activeCategoryId) ?? ARCHIVE_NAV[0];
  const secondarySections = activeCategory?.sections ?? [];

  const categoryFilledCount = secondarySections.reduce((sum, sec) => {
    const count = sectionCounts[sec.id];
    return sum + (count !== undefined && count > 0 ? 1 : 0);
  }, 0);

  useEffect(() => {
    const container = secondaryScrollRef.current;
    const activeBtn = activeSectionRef.current;
    if (!container || !activeBtn) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const scrollLeft =
      activeBtn.offsetLeft - container.offsetLeft - containerRect.width / 2 + btnRect.width / 2;

    container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
  }, [activeSectionId, activeCategoryId]);

  return (
    <nav
      className="shrink-0 border-b border-border/60 bg-background shadow-[0_1px_0_hsl(var(--foreground)/0.03)]"
      aria-label="员工档案导航"
    >
      {/* 一级：分段控件 — 靠胶囊面区分选中，不画底线 */}
      <div className="px-4 pt-2.5 pb-2">
        <div
          className="grid gap-0.5 rounded-xl border border-border/40 bg-muted/50 p-1 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)]"
          style={{ gridTemplateColumns: `repeat(${ARCHIVE_NAV.length}, minmax(0, 1fr))` }}
          role="tablist"
          aria-label="档案分类"
        >
          {ARCHIVE_NAV.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id];
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onCategoryClick(cat.id)}
                className={cn(
                  "flex min-w-0 cursor-pointer flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1",
                  isActive ? adminSegmentActive : adminSegmentIdle,
                )}
              >
                {Icon ? (
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0 transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground/80",
                    )}
                    strokeWidth={isActive ? 2.25 : 2}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "w-full truncate text-center text-xs leading-tight transition-colors duration-200",
                    isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
                  )}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 二级：模块锚点 — 柔和胶囊，无底线 */}
      <div className="flex items-center gap-2 border-t border-border/35 bg-muted/[0.18] px-4 py-1.5">
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span className="text-[11px] font-semibold tracking-wide text-foreground/80">
            {activeCategory?.label}
          </span>
          {categoryFilledCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold tabular-nums text-primary">
              {categoryFilledCount}/{secondarySections.length}
            </span>
          ) : (
            <span className="text-[10px] tabular-nums text-muted-foreground/70">
              {secondarySections.length} 项
            </span>
          )}
        </div>
        <span className="hidden h-3.5 w-px shrink-0 bg-border/55 sm:block" aria-hidden />
        <div
          ref={secondaryScrollRef}
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="档案模块"
        >
          {secondarySections.map((sec) => {
            const count = sectionCounts[sec.id];
            const isActive = activeSectionId === sec.id;
            const hasData = count !== undefined && count > 0;
            return (
              <button
                key={sec.id}
                ref={isActive ? activeSectionRef : undefined}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? "true" : undefined}
                onClick={() => onSectionClick(sec.id)}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1",
                  isActive ? adminPillActive : adminPillIdle,
                )}
              >
                <span>{sec.label}</span>
                {hasData ? (
                  <span
                    className={cn(
                      "min-w-[1.1rem] rounded-full px-1 py-px text-center text-[11px] tabular-nums leading-none transition-colors duration-200",
                      isActive
                        ? "bg-primary/15 font-semibold text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
