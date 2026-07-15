import type { ArchivePermissionSection } from "@shared/api.interface";
import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Building2,
  CreditCard,
  FileStack,
  FileText,
  GraduationCap,
  IdCard,
  Inbox,
  Landmark,
  Layers3,
  Search,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { OptionToggle } from "@/components/admin/form-field";
import {
  NoPermissionCard,
  PanelCard,
  PanelEmpty,
} from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  ARCHIVE_DATA_RESOURCES,
  type ArchiveDataResourceDef,
} from "@/config/archive-data-resources";
import {
  ARCHIVE_DATA_HUB_VIEW_PERMISSIONS,
  ARCHIVE_SECTION_LABELS,
  ARCHIVE_SECTION_ORDER,
  archiveSectionPermission,
} from "@/config/archive-permissions";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "ready" | "building";

const SECTION_META: Record<
  ArchivePermissionSection,
  { icon: LucideIcon; hint: string; accent: string }
> = {
  personal: {
    icon: IdCard,
    hint: "证件与亲属等个人基础档案",
    accent: "from-sky-500/15 via-transparent to-transparent",
  },
  work: {
    icon: BriefcaseBusiness,
    hint: "成本中心等任职相关分摊",
    accent: "from-indigo-500/15 via-transparent to-transparent",
  },
  service: {
    icon: Landmark,
    hint: "合同、协议、薪服与行政配套",
    accent: "from-emerald-500/15 via-transparent to-transparent",
  },
  background: {
    icon: GraduationCap,
    hint: "学历、经历与奖惩背景",
    accent: "from-amber-500/15 via-transparent to-transparent",
  },
  development: {
    icon: Sparkles,
    hint: "培训、绩效与人才发展记录",
    accent: "from-violet-500/15 via-transparent to-transparent",
  },
};

const RESOURCE_ICONS: Partial<Record<string, LucideIcon>> = {
  "id-documents": IdCard,
  "family-members": Users,
  "internal-relatives": Users,
  "cost-center-allocations": Layers3,
  contracts: FileText,
  agreements: FileStack,
  "attendance-cards": CreditCard,
  "bank-accounts": Landmark,
  "social-insurances": Shield,
  "special-benefits": Award,
  "work-injuries": Shield,
  "admin-infos": Building2,
  accommodations: Building2,
  educations: GraduationCap,
  "work-experiences": BriefcaseBusiness,
  "training-records": Sparkles,
  "performance-records": Award,
  "talent-reviews": Sparkles,
};

function resourceIcon(path: string, section: ArchivePermissionSection): LucideIcon {
  return RESOURCE_ICONS[path] ?? SECTION_META[section].icon;
}

function shortcutLabel() {
  if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform)) {
    return "⌘K";
  }
  return "Ctrl+K";
}

export function AdminArchiveDataHubPage() {
  const navigate = useNavigate();
  const perm = usePermission();
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeSection, setActiveSection] = useState<ArchivePermissionSection | "all">("all");
  const debouncedKeyword = useDebouncedValue(keyword, 280);

  const canEnterHub = perm.hasAny(...ARCHIVE_DATA_HUB_VIEW_PERMISSIONS);

  const allVisible = useMemo(() => {
    return ARCHIVE_DATA_RESOURCES.filter((r) =>
      perm.has(archiveSectionPermission(r.section, "view")),
    );
  }, [perm]);

  const stats = useMemo(() => {
    const ready = allVisible.filter((r) => r.supported).length;
    return { total: allVisible.length, ready, building: allVisible.length - ready };
  }, [allVisible]);

  const filteredSections = useMemo(() => {
    const q = debouncedKeyword.trim().toLowerCase();
    return ARCHIVE_SECTION_ORDER.map((section) => {
      if (!perm.has(archiveSectionPermission(section, "view"))) return null;
      if (activeSection !== "all" && activeSection !== section) return null;

      let links = ARCHIVE_DATA_RESOURCES.filter((r) => r.section === section);
      if (statusFilter === "ready") links = links.filter((r) => r.supported);
      if (statusFilter === "building") links = links.filter((r) => !r.supported);
      if (q) {
        links = links.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.path.includes(q),
        );
      }
      if (links.length === 0) return null;
      return { section, label: ARCHIVE_SECTION_LABELS[section], links };
    }).filter((s): s is NonNullable<typeof s> => s != null);
  }, [activeSection, debouncedKeyword, perm, statusFilter]);

  const sectionTabs = useMemo(() => {
    return ARCHIVE_SECTION_ORDER.filter((section) =>
      perm.has(archiveSectionPermission(section, "view")),
    ).map((section) => ({
      section,
      label: ARCHIVE_SECTION_LABELS[section],
      count: allVisible.filter((r) => r.section === section).length,
      ready: allVisible.filter((r) => r.section === section && r.supported).length,
    }));
  }, [allVisible, perm]);

  if (!canEnterHub) {
    return (
      <NoPermissionCard
        icon={<Shield className="size-8 text-muted-foreground" />}
        title="管理数据"
        description="需要任一档案分区的查看权限（employee:archive:*:view）"
      />
    );
  }

  if (allVisible.length === 0) {
    return (
      <div className="space-y-4">
        <HubHero
          stats={stats}
          keyword={keyword}
          onKeywordChange={setKeyword}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
        <PanelCard>
          <PanelEmpty
            icon={<Inbox className="size-8 text-muted-foreground" />}
            title="暂无可用数据对象"
            description="当前账号没有可见的批管资源"
          />
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <HubHero
        stats={stats}
        keyword={keyword}
        onKeywordChange={setKeyword}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="hub-enter sticky top-[3.6rem] z-20 -mx-1 px-1" style={{ animationDelay: "60ms" }}>
        <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-border/70 bg-background/90 p-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <SectionChip
            active={activeSection === "all"}
            label="全部"
            count={stats.total}
            onClick={() => setActiveSection("all")}
          />
          {sectionTabs.map((tab) => {
            const Icon = SECTION_META[tab.section].icon;
            return (
              <SectionChip
                key={tab.section}
                active={activeSection === tab.section}
                label={tab.label}
                count={tab.count}
                ready={tab.ready}
                icon={Icon}
                onClick={() => setActiveSection(tab.section)}
              />
            );
          })}
        </div>
      </div>

      {filteredSections.length === 0 ? (
        <PanelCard>
          <PanelEmpty
            icon={<Search className="size-8 text-muted-foreground" />}
            title="没有匹配的数据对象"
            description="试试调整关键词或状态筛选"
          />
        </PanelCard>
      ) : (
        <div className="space-y-5">
          {filteredSections.map((sec, secIdx) => {
            const meta = SECTION_META[sec.section];
            const Icon = meta.icon;
            const readyCount = sec.links.filter((l) => l.supported).length;
            return (
              <section
                key={sec.section}
                id={`hub-section-${sec.section}`}
                className="hub-enter relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.03)]"
                style={{ animationDelay: `${90 + secIdx * 50}ms` }}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b",
                    meta.accent,
                  )}
                />
                <div className="relative flex flex-wrap items-end justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/80 shadow-sm">
                      <Icon className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15px] font-semibold tracking-tight">{sec.label}</h2>
                        <Badge variant="secondary" className="font-normal">
                          {sec.links.length} 项
                        </Badge>
                        {readyCount > 0 ? (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300">
                            {readyCount} 已开放
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{meta.hint}</p>
                    </div>
                  </div>
                </div>

                <div className="relative grid gap-2.5 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
                  {sec.links.map((link, idx) => (
                    <ResourceTile
                      key={link.path}
                      resource={link}
                      style={{ animationDelay: `${120 + secIdx * 40 + idx * 28}ms` }}
                      onOpen={() => navigate(`/admin/employees/data/${link.path}`)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HubHero({
  stats,
  keyword,
  onKeywordChange,
  statusFilter,
  onStatusFilterChange,
}: {
  stats: { total: number; ready: number; building: number };
  keyword: string;
  onKeywordChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
}) {
  return (
    <div className="hub-enter relative overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="pointer-events-none absolute inset-0 hub-dot-grid opacity-70" />
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 size-48 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-400/5" />

      <div className="relative space-y-4 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              <Layers3 className="size-3" />
              档案批管目录
            </div>
            <h1 className="text-[26px] font-bold tracking-tight text-foreground">管理数据</h1>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              按档案分区批量维护子表数据。先选对象进入列表，再用导入/导出加速处理；
              熟悉名称时可用{" "}
              <kbd className="rounded border border-border/80 bg-muted/80 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {shortcutLabel()}
              </kbd>{" "}
              直达。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label="数据对象" value={stats.total} />
            <StatPill label="已开放" value={stats.ready} tone="ready" />
            <StatPill label="建设中" value={stats.building} tone="muted" />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="w-full sm:max-w-[320px]">
            <InputGroupAddon>
              <Search className="size-4 opacity-60" />
            </InputGroupAddon>
            <InputGroupInput
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="搜索数据对象，如证件、合同…"
            />
          </InputGroup>
          <OptionToggle
            options={[
              { id: "all", label: "全部" },
              { id: "ready", label: "已开放" },
              { id: "building", label: "建设中" },
            ]}
            value={statusFilter}
            onChange={onStatusFilterChange}
          />
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "ready" | "muted";
}) {
  return (
    <div
      className={cn(
        "min-w-[84px] rounded-xl border px-3 py-2",
        tone === "ready" && "border-emerald-500/25 bg-emerald-500/8",
        tone === "muted" && "border-border/70 bg-muted/40",
        tone === "default" && "border-border/70 bg-background/70",
      )}
    >
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums tracking-tight">{value}</div>
    </div>
  );
}

function SectionChip({
  active,
  label,
  count,
  ready,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  ready?: number;
  icon?: LucideIcon;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "ghost"}
      className={cn(
        "h-8 shrink-0 gap-1.5 rounded-lg px-2.5",
        !active && "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {Icon ? <Icon className="size-3.5 opacity-80" /> : null}
      <span>{label}</span>
      <span
        className={cn(
          "rounded-md px-1 text-[10px] tabular-nums",
          active ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground",
        )}
      >
        {ready != null && ready > 0 ? `${ready}/${count}` : count}
      </span>
    </Button>
  );
}

function ResourceTile({
  resource,
  onOpen,
  style,
}: {
  resource: ArchiveDataResourceDef;
  onOpen: () => void;
  style?: CSSProperties;
}) {
  const Icon = resourceIcon(resource.path, resource.section);

  return (
    <button
      type="button"
      style={style}
      className={cn(
        "hub-enter hub-tile group relative flex w-full flex-col rounded-xl border border-border/70 bg-background/80 p-3.5 text-left outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        resource.supported
          ? "hover:border-primary/35 hover:bg-primary/[0.03]"
          : "hover:border-border hover:bg-muted/40",
      )}
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border",
            resource.supported
              ? "border-primary/20 bg-primary/8 text-primary"
              : "border-border/70 bg-muted/50 text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-sm font-medium text-foreground">{resource.title}</div>
            {resource.supported ? (
              <Badge
                variant="outline"
                className="shrink-0 border-emerald-500/30 bg-emerald-500/8 text-[10px] text-emerald-700 dark:text-emerald-300"
              >
                可用
              </Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
                建设中
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {resource.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
        <span className="truncate font-mono opacity-70">{resource.path}</span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 font-medium transition-colors",
            resource.supported
              ? "text-primary group-hover:gap-1"
              : "group-hover:text-foreground",
          )}
        >
          {resource.supported ? "进入" : "查看"}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}
