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
    <div className="shrink-0 border-b border-border/70 bg-background">
      {/* 一级：分段控件 — 靠胶囊面区分选中，不画底线 */}
      <div className="px-4 pt-2.5 pb-2">
        <div
          className="grid gap-0.5 rounded-xl bg-muted/60 p-1"
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
                  "flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
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
      <div className="flex items-center gap-2 border-t border-border/40 px-4 py-1.5">
        <span className="hidden shrink-0 text-[11px] font-medium tracking-wide text-muted-foreground sm:inline">
          {activeCategory?.label}
        </span>
        <span className="hidden h-3 w-px shrink-0 bg-border/50 sm:block" />
        <div
          ref={secondaryScrollRef}
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="档案模块"
        >
          {secondarySections.map((sec) => {
            const count = sectionCounts[sec.id];
            const isActive = activeSectionId === sec.id;
            return (
              <button
                key={sec.id}
                ref={isActive ? activeSectionRef : undefined}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSectionClick(sec.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  isActive ? adminPillActive : adminPillIdle,
                )}
              >
                <span>{sec.label}</span>
                {count !== undefined && count > 0 ? (
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
    </div>
  );
}
