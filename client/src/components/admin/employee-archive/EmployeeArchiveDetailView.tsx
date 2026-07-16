import type {
  ArchivePermissionSection,
  Employee,
  EmployeeArchive,
  EmployeeAssignment,
  EmployeeFormOptions,
  EmployeeMasterVersion,
  EmployeeMovement,
  OrganizationTreeNode,
} from "@shared/api.interface";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmployeeMovementTimeline } from "@/components/admin/employee-archive/EmployeeMovementTimeline";
import { MovementSummaryStrip } from "@/components/admin/employee-archive/MovementSummaryStrip";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Eye,
  EyeOff,
  History,
  Layers,
  List,
  MapPin,
  Megaphone,
  PencilLine,
  Phone,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

import type { ApiError } from "@/api/http";

import {
  BACKGROUND_WORK_EXP_FIELDS,
  PERSONAL_FAMILY_FIELDS,
  PERSONAL_ID_DOCUMENT_FIELDS,
  PERSONAL_INTERNAL_RELATIVE_FIELDS,
  SERVICE_BANK_FIELDS,
  SERVICE_BENEFIT_FIELDS,
  SERVICE_SOCIAL_FIELDS,
  SERVICE_WORK_INJURY_FIELDS,
  TALENT_AGENT_FIELDS,
  TALENT_PERFORMANCE_FIELDS,
  TALENT_PROJECT_FIELDS,
  TALENT_REVIEW_FIELDS,
  TALENT_TRAINING_FIELDS,
  TALENT_VALUES_FIELDS,
  WORK_COST_CENTER_FIELDS,
} from "@/components/admin/employee-archive/archive-field-defs";
import {
  ALL_ARCHIVE_SECTION_IDS,
  ARCHIVE_NAV,
  findCategoryBySection,
  getCategorySectionIds,
  type ArchiveViewMode,
} from "@/components/admin/employee-archive/archive-section-nav";
import {
  ArchiveRecordCard,
  ArchiveRecordField,
  ArchiveRecordFieldGrid,
  ArchiveRecordList,
} from "@/components/admin/employee-archive/archive-record-ui";
import { ArchiveAttachmentSection } from "@/components/admin/employee-archive/ArchiveAttachmentSection";
import { AgreementSection } from "@/components/admin/employee-archive/AgreementSection";
import { AttendanceCardSection } from "@/components/admin/employee-archive/AttendanceCardSection";
import { AdminInfoSection } from "@/components/admin/employee-archive/AdminInfoSection";
import { AccommodationSection } from "@/components/admin/employee-archive/AccommodationSection";
import { ContractSection } from "@/components/admin/employee-archive/ContractSection";
import { EducationSection } from "@/components/admin/employee-archive/EducationSection";
import { QualificationSection } from "@/components/admin/employee-archive/QualificationSection";
import { PenaltySection } from "@/components/admin/employee-archive/PenaltySection";
import { RewardSection } from "@/components/admin/employee-archive/RewardSection";
import { TitleCertificateSection } from "@/components/admin/employee-archive/TitleCertificateSection";
import { ArchiveDetailNav } from "@/components/admin/employee-archive/ArchiveDetailNav";
import { ArchiveMultiSection } from "@/components/admin/employee-archive/ArchiveMultiSection";
import { ArchiveSectionAnchor } from "@/components/admin/employee-archive/ArchiveSectionAnchor";
import { AssignmentSection } from "@/components/admin/employee-archive/AssignmentSection";
import { summarizePrimaryAssignmentHeader } from "@/components/admin/employee-archive/assignment-header-summary";
import { PanelCard, PanelError } from "@/components/admin/page-shell";
import { SheetEntityHeader } from "@/components/admin/sheet-entity-header";
import { adminChipActive, adminChipIdle } from "@/components/admin/selection-styles";
import { listEmployeeAssignments, listEmployeeMasterVersions } from "@/api/employee";
import { employeeStatusLabel, statusBadgeClass } from "@/api/employee";
import { getEmployeeFormOptions } from "@/api/employee";
import { EmployeeAvatar } from "@/components/admin/employee-archive/EmployeeAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { Can } from "@/components/admin/can";
import { cn } from "@/lib/utils";

const EMPTY_ARCHIVE: EmployeeArchive = {
  familyMembers: [],
  internalRelatives: [],
  idDocuments: [],
  costCenterAllocations: [],
  contracts: [],
  agreements: [],
  attendanceCards: [],
  bankAccounts: [],
  socialInsurances: [],
  specialBenefits: [],
  workInjuries: [],
  adminInfos: [],
  accommodations: [],
  attachments: [],
  educations: [],
  workExperiences: [],
  qualifications: [],
  titleCertificates: [],
  rewards: [],
  penalties: [],
  trainingRecords: [],
  performanceRecords: [],
  valuesAssessments: [],
  talentReviews: [],
  projects: [],
  agentAssignments: [],
};

function toApiError(e: unknown): ApiError {
  if (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return e as ApiError;
  }
  return { message: "请求失败，请稍后重试" };
}

function VisibleArchiveSection({
  id,
  show,
  children,
}: {
  id: string;
  show: boolean;
  children: ReactNode;
}) {
  if (!show) return null;
  return <ArchiveSectionAnchor id={id}>{children}</ArchiveSectionAnchor>;
}

function ArchiveSectionSkeleton({ title }: { title: string }) {
  return (
    <PanelCard title={title}>
      <div className="space-y-3 p-4">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted/50" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))] gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-muted/40" />
              <div className="h-4 w-full animate-pulse rounded bg-muted/55" />
            </div>
          ))}
        </div>
      </div>
    </PanelCard>
  );
}

function MasterSubSection({
  icon: Icon,
  title,
  accent = "primary",
  children,
}: {
  icon: LucideIcon;
  title: string;
  accent?: "primary" | "sky" | "amber" | "emerald";
  children: ReactNode;
}) {
  const iconTone =
    accent === "sky"
      ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
      : accent === "amber"
        ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
        : accent === "emerald"
          ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          : "bg-primary/10 text-primary";

  return (
    <ArchiveRecordCard>
      <div className="mb-2.5 flex items-center gap-2 border-b border-border/40 pb-2">
        <div
          className={cn(
            "flex size-6 items-center justify-center rounded-md",
            iconTone,
          )}
        >
          <Icon className="size-3.5" strokeWidth={2.25} />
        </div>
        <p className="text-xs font-semibold tracking-tight text-foreground">{title}</p>
      </div>
      <ArchiveRecordFieldGrid layout="fluid">{children}</ArchiveRecordFieldGrid>
    </ArchiveRecordCard>
  );
}

type ArchiveLoadState = "loading" | "error" | "ready";

type EmployeeArchiveDetailViewProps = {
  employee: Employee;
  asOfDate: string;
  /** 主档版本变更后触发刷新（用于“新增生效版本”即时可见） */
  masterVersionsRefreshSeq?: number;
  archive: EmployeeArchive | null;
  movements: EmployeeMovement[];
  archiveLoadState: ArchiveLoadState;
  archiveError?: ApiError | null;
  onArchiveRetry?: () => void;
  revealSensitive?: boolean;
  canViewSensitive?: boolean;
  onRevealSensitiveChange?: (next: boolean) => void;
  canEdit: boolean;
  canEditSection?: (section: ArchivePermissionSection) => boolean;
  orgs: OrganizationTreeNode[];
  archiveDictOptions?: EmployeeFormOptions | null;
  onClose: () => void;
  onEditMaster: () => void;
  onAsOfDateChange: (next: string) => Promise<void> | void;
  onArchiveChanged: () => void;
  onAssignmentsChanged: () => Promise<void>;
};


function VersionTimeline({
  versions,
  activeId,
  onSelect,
  loading,
  error,
  onRetry,
}: {
  versions: EmployeeMasterVersion[];
  activeId?: string;
  onSelect: (version: EmployeeMasterVersion) => void;
  loading?: boolean;
  error?: ApiError | null;
  onRetry?: () => void;
}) {
  if (loading) {
    return <div className="mb-3 h-16 animate-pulse rounded-lg bg-muted/30" />;
  }
  if (error) {
    return (
      <div className="mb-3">
        <PanelError error={error} onRetry={() => onRetry?.()} />
      </div>
    );
  }
  if (versions.length === 0) return null;
  return (
    <div className="mb-3 rounded-lg border border-border/60 bg-muted/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <History className="size-3.5" />
          生效版本
          <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-normal">
            {versions.length} 个
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">点击切换查看快照</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {versions.map((v) => {
          const isActive = v.id === activeId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v)}
              className={cn(
                "flex min-w-[148px] shrink-0 flex-col gap-1 rounded-md border px-2.5 py-2 text-left",
                isActive ? adminChipActive : adminChipIdle,
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                  {v.effectiveStartDate}
                </span>
                <Badge
                  variant={v.temporal === "present" ? "default" : v.temporal === "future" ? "outline" : "secondary"}
                  className="h-5 px-1.5 text-[11px] font-normal"
                >
                  {v.temporalLabel}
                </Badge>
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {v.effectiveEndDate ? `至 ${v.effectiveEndDate}` : "至今"}
                {v.isOpen ? " · 开放" : ""}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmployeeArchiveDetailView({
  employee,
  asOfDate,
  masterVersionsRefreshSeq,
  archive,
  movements,
  archiveLoadState,
  archiveError,
  onArchiveRetry,
  revealSensitive = false,
  canViewSensitive = false,
  onRevealSensitiveChange,
  canEdit,
  canEditSection,
  orgs,
  archiveDictOptions,
  onClose,
  onEditMaster,
  onAsOfDateChange,
  onArchiveChanged,
  onAssignmentsChanged,
}: EmployeeArchiveDetailViewProps) {
  const sectionEdit = (section: ArchivePermissionSection) =>
    canEditSection?.(section) ?? canEdit;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ArchiveViewMode>("filter");
  const [filterCategoryId, setFilterCategoryId] = useState("personal");

  const archiveData = archive ?? EMPTY_ARCHIVE;
  const archiveReady = archiveLoadState === "ready" && archive !== null;
  const archiveLoading = archiveLoadState === "loading";
  const archiveFailed = archiveLoadState === "error";

  const visibleSectionIds = useMemo(() => {
    if (viewMode === "scroll") return ALL_ARCHIVE_SECTION_IDS;
    return getCategorySectionIds(filterCategoryId);
  }, [viewMode, filterCategoryId]);

  const scrollSpyIds = viewMode === "filter" ? visibleSectionIds : ALL_ARCHIVE_SECTION_IDS;

  const { activeSectionId, scrollTo } = useScrollSpy(scrollSpyIds, scrollRef, {
    probeOffset: 24,
    scrollPadding: 8,
  });

  const scrollCategoryId = findCategoryBySection(activeSectionId);
  const navCategoryId = viewMode === "filter" ? filterCategoryId : scrollCategoryId;

  const [versions, setVersions] = useState<EmployeeMasterVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<ApiError | null>(null);
  const [versionsRefreshSeq, setVersionsRefreshSeq] = useState(0);
  const [dictOptions, setDictOptions] = useState<EmployeeFormOptions | null>(archiveDictOptions ?? null);
  const [headerAssignments, setHeaderAssignments] = useState<EmployeeAssignment[]>([]);
  const [assignmentRefreshSeq, setAssignmentRefreshSeq] = useState(0);

  const assignmentHeader = useMemo(
    () => summarizePrimaryAssignmentHeader(headerAssignments),
    [headerAssignments],
  );

  const isSectionVisible = useCallback(
    (sectionId: string) => visibleSectionIds.includes(sectionId),
    [visibleSectionIds],
  );

  const jumpToMovements = useCallback(() => {
    if (viewMode === "filter") {
      setFilterCategoryId("movements");
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    scrollTo("movements");
  }, [scrollTo, viewMode]);

  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      if (viewMode === "filter") {
        setFilterCategoryId(categoryId);
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const first = getCategorySectionIds(categoryId)[0];
      if (first) scrollTo(first);
    },
    [scrollTo, viewMode],
  );

  const handleViewModeChange = useCallback(
    (mode: ArchiveViewMode) => {
      setViewMode(mode);
      if (mode === "filter") {
        setFilterCategoryId(scrollCategoryId);
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [scrollCategoryId],
  );

  const reloadVersions = useCallback(() => {
    setVersionsRefreshSeq((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listEmployeeAssignments(employee.id)
      .then((res) => {
        if (!cancelled) setHeaderAssignments(res.data);
      })
      .catch(() => {
        if (!cancelled) setHeaderAssignments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [employee.id, assignmentRefreshSeq]);

  const handleAssignmentsChanged = async () => {
    setAssignmentRefreshSeq((n) => n + 1);
    await onAssignmentsChanged();
  };

  useEffect(() => {
    if (archiveDictOptions) {
      setDictOptions((prev) => prev ?? archiveDictOptions);
    }
  }, [archiveDictOptions]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getEmployeeFormOptions();
        if (!cancelled) setDictOptions(res.data);
      } catch (e: unknown) {
        if (cancelled) return;
        setDictOptions((prev) => {
          if (prev) return prev;
          const msg =
            typeof e === "object" && e !== null && "message" in e && typeof (e as { message: unknown }).message === "string"
              ? (e as { message: string }).message
              : "字典选项加载失败";
          const traceId =
            typeof e === "object" && e !== null && "traceId" in e && typeof (e as { traceId: unknown }).traceId === "string"
              ? (e as { traceId: string }).traceId
              : undefined;
          toast.error(traceId ? `${msg}（traceId: ${traceId}）` : msg);
          return prev;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee.id]);

  const activeVersionId = useMemo(() => {
    const date = asOfDate;
    const hit = versions.find((v) => {
      if (v.effectiveStartDate > date) return false;
      if (!v.effectiveEndDate) return true;
      return v.effectiveEndDate >= date;
    });
    return hit?.id;
  }, [asOfDate, versions]);

  useEffect(() => {
    let cancelled = false;
    setVersionsLoading(true);
    setVersionsError(null);
    void (async () => {
      try {
        const res = await listEmployeeMasterVersions(employee.id);
        if (!cancelled) {
          setVersions(res.data);
          setVersionsError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setVersions([]);
          setVersionsError(toApiError(e));
        }
      } finally {
        if (!cancelled) setVersionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee.id, masterVersionsRefreshSeq, versionsRefreshSeq]);

  const sectionDictOptions = useMemo(
    () =>
      dictOptions
        ? {
            countryRegions: dictOptions.countryRegions,
            idTypes: dictOptions.idTypes,
            employeeRelations: dictOptions.employeeRelations,
            bankAccountTypes: dictOptions.bankAccountTypes,
            bankIds: dictOptions.bankIds,
            branchIds: dictOptions.branchIds,
            currencies: dictOptions.currencies,
            payrollCompanies: dictOptions.payrollCompanies,
            insuranceRegions: dictOptions.insuranceRegions,
            educations: dictOptions.educations,
            degrees: dictOptions.degrees,
            trainingAssessmentMethods: dictOptions.trainingAssessmentMethods,
            trainingAssessmentResults: dictOptions.trainingAssessmentResults,
            trainingForms: dictOptions.trainingForms,
            trainingTypes: dictOptions.trainingTypes,
            performanceAssessmentTypes: dictOptions.performanceAssessmentTypes,
            performanceValuesLevels: dictOptions.performanceValuesLevels,
            performanceLevels: dictOptions.performanceLevels,
            projectFinalOutcomes: dictOptions.projectFinalOutcomes,
          }
        : null,
    [dictOptions],
  );

  const sectionCounts = useMemo(() => {
    const data = archive ?? EMPTY_ARCHIVE;
    return {
      "id-documents": data.idDocuments.length,
      "family-members": data.familyMembers.length,
      "internal-relatives": data.internalRelatives.length,
      "cost-center-allocations": data.costCenterAllocations.length,
      contracts: data.contracts.length,
      agreements: data.agreements.length,
      "attendance-cards": data.attendanceCards.length,
      "bank-accounts": data.bankAccounts.length,
      "social-insurances": data.socialInsurances.length,
      "special-benefits": data.specialBenefits.length,
      "work-injuries": data.workInjuries.length,
      "admin-infos": data.adminInfos.length,
      accommodations: data.accommodations.length,
      attachments: data.attachments.length,
      educations: data.educations.length,
      "work-experiences": data.workExperiences.length,
      qualifications: data.qualifications.length,
      "title-certificates": data.titleCertificates.length,
      rewards: data.rewards.length,
      penalties: data.penalties.length,
      "training-records": data.trainingRecords.length,
      "performance-records": data.performanceRecords.length,
      "values-assessments": data.valuesAssessments.length,
      "talent-reviews": data.talentReviews.length,
      projects: data.projects.length,
      "agent-assignments": data.agentAssignments.length,
      movements: movements.length,
    };
  }, [archive, movements.length]);

  const skeletonSections = useMemo(() => {
    return ARCHIVE_NAV.find((c) => c.id === navCategoryId)?.sections ?? [];
  }, [navCategoryId]);

  const jumpToCategory = handleCategoryClick;

  const hasMaskedFields =
    employee.mobileMasked ||
    archiveData.bankAccounts.some((b) => b.accountNoMasked) ||
    archiveData.socialInsurances.some((s) => s.socialSecurityNoMasked);

  return (
    <>
      <SheetEntityHeader
        className="pr-12"
        icon={
          <EmployeeAvatar
            employeeId={employee.id}
            fullName={employee.fullName}
            attachments={archiveData.attachments}
            className="size-12 ring-2 ring-primary/15"
            fallbackClassName="bg-primary/10 text-base font-semibold text-primary"
          />
        }
        title={employee.fullName}
        description={
          <>
            <span>{employee.employeeNo}</span>
            {employee.primaryOrganizationName ? (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span>{employee.primaryOrganizationName}</span>
              </>
            ) : null}
            {employee.primaryPositionName ? (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span>{employee.primaryPositionName}</span>
              </>
            ) : null}
          </>
        }
        actions={
          <>
            <Button
              type="button"
              variant={viewMode === "scroll" ? "secondary" : "outline"}
              size="sm"
              className="h-7"
              title={
                viewMode === "filter"
                  ? "展开全部档案模块，连续滚动浏览"
                  : "按分类筛选，仅浏览当前分区"
              }
              onClick={() =>
                handleViewModeChange(viewMode === "filter" ? "scroll" : "filter")
              }
            >
              {viewMode === "filter" ? (
                <>
                  <Layers className="size-3.5" />
                  查看全部档案
                </>
              ) : (
                <>
                  <List className="size-3.5" />
                  分类浏览
                </>
              )}
            </Button>
            {canViewSensitive ? (
              <Can permission="employee:sensitive:view">
                <Button
                  type="button"
                  variant={revealSensitive ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 shrink-0"
                  title={
                    revealSensitive
                      ? "当前为明文查看，操作将记入审计"
                      : hasMaskedFields
                        ? "部分字段已脱敏，开启后可查看明文（将记入审计）"
                        : "查看敏感字段明文（将记入审计）"
                  }
                  onClick={() => {
                    const next = !revealSensitive;
                    onRevealSensitiveChange?.(next);
                    if (next) toast.message("已开启敏感字段明文查看（将写入审计）");
                  }}
                >
                  {revealSensitive ? <EyeOff /> : <Eye />}
                  {revealSensitive ? "隐藏敏感" : "查看敏感"}
                </Button>
              </Can>
            ) : null}
          </>
        }
        badges={
          <>
            <Badge variant="secondary" className={cn(statusBadgeClass(employee.status))}>
              {employee.statusLabel ?? employeeStatusLabel(employee.status)}
            </Badge>
            {employee.hireDate ? (
              <span className="text-xs text-muted-foreground">入职 {employee.hireDate}</span>
            ) : null}
            {assignmentHeader.versionCount > 0 ? (
              <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="text-muted-foreground/50">·</span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="size-3 opacity-70" />
                  任职 {assignmentHeader.rangeLabel}
                </span>
                <Badge
                  variant={
                    assignmentHeader.temporalLabel === "当前"
                      ? "default"
                      : assignmentHeader.temporalLabel === "将来"
                        ? "outline"
                        : "secondary"
                  }
                  className="h-5 px-1.5 text-[11px] font-normal"
                >
                  {assignmentHeader.temporalLabel}
                </Badge>
                {assignmentHeader.hasFuture ? (
                  <Badge
                    variant="outline"
                    className="h-5 border-amber-500/40 bg-amber-500/10 px-1.5 text-[11px] font-normal text-amber-800 dark:text-amber-300"
                  >
                    将来 {assignmentHeader.futureCount} 版
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground/80">无将来版本</span>
                )}
                {assignmentHeader.versionCount > 1 ? (
                  <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
                    共 {assignmentHeader.versionCount} 版
                  </span>
                ) : null}
              </span>
            ) : null}
          </>
        }
        summary={
          <MovementSummaryStrip
            movements={movements}
            assignments={headerAssignments}
            onViewAll={jumpToMovements}
          />
        }
      />

      <ArchiveDetailNav
        activeCategoryId={navCategoryId}
        activeSectionId={activeSectionId}
        sectionCounts={sectionCounts}
        onCategoryClick={jumpToCategory}
        onSectionClick={scrollTo}
      />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 px-5 py-3">
          {isSectionVisible("personal-master") ? (
            <ArchiveSectionAnchor id="personal-master">
              <PanelCard
                title="个人主档"
                toolbar={
                  canEdit ? (
                    <Button size="sm" variant="outline" onClick={onEditMaster}>
                      <PencilLine className="size-3.5" />
                      编辑主档
                    </Button>
                  ) : null
                }
              >
                <div className="space-y-2">
                  <div className="px-2.5 pt-2.5">
                    <VersionTimeline
                      versions={versions}
                      activeId={activeVersionId}
                      loading={versionsLoading}
                      error={versionsError}
                      onRetry={reloadVersions}
                      onSelect={(v) => void onAsOfDateChange(v.effectiveStartDate)}
                    />
                  </div>
                  <ArchiveRecordList>
                    <MasterSubSection icon={User} title="基础信息" accent="primary">
                      <ArchiveRecordField label="姓名" value={employee.fullName} compact />
                      <ArchiveRecordField label="工号" value={employee.employeeNo} mono compact />
                      <ArchiveRecordField label="AD 账号" value={employee.adAccount} mono compact />
                      <ArchiveRecordField
                        label="性别"
                        value={employee.genderLabel ?? employee.gender}
                        compact
                      />
                      <ArchiveRecordField
                        label="婚育状况"
                        value={employee.maritalStatusLabel ?? employee.maritalStatus}
                        compact
                      />
                      <ArchiveRecordField
                        label="政治面貌"
                        value={employee.politicalAffiliationLabel ?? employee.politicalAffiliation}
                        compact
                      />
                      <ArchiveRecordField
                        label="最高学历"
                        value={employee.highestEducationLabel ?? employee.highestEducation}
                        compact
                      />
                      <ArchiveRecordField
                        label="学历毕业时间"
                        value={employee.highestEducationGradDate}
                        mono
                        compact
                      />
                      <ArchiveRecordField
                        label="生育状况"
                        value={employee.fertilityStatusLabel ?? employee.fertilityStatus}
                        compact
                      />
                      <ArchiveRecordField
                        label="民族"
                        value={employee.ethnicityLabel ?? employee.ethnicity}
                        compact
                      />
                      <ArchiveRecordField
                        label="国籍"
                        value={employee.nationalityLabel ?? employee.nationality}
                        compact
                      />
                      <ArchiveRecordField
                        label="户口性质"
                        value={employee.householdTypeLabel ?? employee.householdType}
                        compact
                      />
                      <ArchiveRecordField
                        label="户口所在地"
                        value={employee.householdLocation}
                        wide
                        compact
                      />
                      <ArchiveRecordField label="兴趣爱好" value={employee.hobbies} wide compact />
                      <ArchiveRecordField
                        label="党组织关系转入"
                        value={
                          employee.partyOrgTransferred === undefined
                            ? undefined
                            : employee.partyOrgTransferred
                              ? "是"
                              : "否"
                        }
                        compact
                      />
                      <ArchiveRecordField
                        label="参加工作日期"
                        value={employee.workStartDate}
                        mono
                        compact
                      />
                      <ArchiveRecordField
                        label="入职日期"
                        value={employee.hireDate}
                        mono
                        highlight
                        compact
                      />
                      <ArchiveRecordField
                        label="集团司龄起算日"
                        value={employee.groupSeniorityStartDate}
                        mono
                        compact
                      />
                    </MasterSubSection>
                    <MasterSubSection icon={Phone} title="联系方式" accent="sky">
                      <ArchiveRecordField
                        label="手机号"
                        value={employee.mobile}
                        masked={employee.mobileMasked}
                        highlight
                        compact
                      />
                      <ArchiveRecordField label="公司邮箱" value={employee.companyEmail} compact />
                      <ArchiveRecordField label="个人邮箱" value={employee.personalEmail} compact />
                      <ArchiveRecordField label="微信" value={employee.wechat} compact />
                      <ArchiveRecordField label="座机" value={employee.officePhone} mono compact />
                      <ArchiveRecordField
                        label="分机"
                        value={employee.officeExtension}
                        mono
                        compact
                      />
                      <ArchiveRecordField
                        label="家庭电话"
                        value={employee.homePhone}
                        mono
                        compact
                      />
                    </MasterSubSection>
                    <MasterSubSection icon={MapPin} title="地址与紧急联系人" accent="amber">
                      <ArchiveRecordField
                        label="身份证地址"
                        value={employee.idCardAddress}
                        wide
                        compact
                      />
                      <ArchiveRecordField
                        label="居住地地址"
                        value={employee.residenceAddress}
                        wide
                        compact
                      />
                      <ArchiveRecordField
                        label="紧急联系人"
                        value={employee.emergencyContactName}
                        highlight
                        compact
                      />
                      <ArchiveRecordField
                        label="紧急联系人电话"
                        value={employee.emergencyContactPhone}
                        mono
                        highlight
                        compact
                      />
                      <ArchiveRecordField
                        label="与员工关系"
                        value={
                          employee.emergencyContactRelationLabel ?? employee.emergencyContactRelation
                        }
                        compact
                      />
                    </MasterSubSection>
                    <MasterSubSection icon={Megaphone} title="招聘来源" accent="emerald">
                      <ArchiveRecordField
                        label="招聘渠道"
                        value={employee.recruitmentChannelLabel ?? employee.recruitmentChannel}
                        compact
                      />
                      <ArchiveRecordField
                        label="渠道明细"
                        value={employee.recruitmentChannelDetail}
                        wide
                        compact
                      />
                    </MasterSubSection>
                  </ArchiveRecordList>
                </div>
                </PanelCard>
              </ArchiveSectionAnchor>
          ) : null}

          {archiveLoading
            ? skeletonSections
                .filter((sec) => sec.id !== "personal-master")
                .map((sec) => <ArchiveSectionSkeleton key={sec.id} title={sec.label} />)
            : null}

          {archiveFailed && archiveError ? (
            <PanelError error={archiveError} onRetry={() => onArchiveRetry?.()} />
          ) : null}

          {archiveReady ? (
                <>
                  <VisibleArchiveSection id="id-documents" show={isSectionVisible("id-documents")}>
                    <ArchiveMultiSection
                      title="证件信息"
                      employeeId={employee.id}
                      resourcePath="id-documents"
                      items={archiveData.idDocuments}
                      fieldDefs={PERSONAL_ID_DOCUMENT_FIELDS}
                      dictOptions={sectionDictOptions}
                      canEdit={sectionEdit("personal")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="family-members" show={isSectionVisible("family-members")}>
                    <ArchiveMultiSection
                      title="家庭成员"
                      employeeId={employee.id}
                      resourcePath="family-members"
                      items={archiveData.familyMembers}
                      fieldDefs={PERSONAL_FAMILY_FIELDS}
                      dictOptions={sectionDictOptions}
                      canEdit={sectionEdit("personal")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="internal-relatives" show={isSectionVisible("internal-relatives")}>
                    <ArchiveMultiSection
                      title="内部亲属"
                      employeeId={employee.id}
                      resourcePath="internal-relatives"
                      items={archiveData.internalRelatives}
                      fieldDefs={PERSONAL_INTERNAL_RELATIVE_FIELDS}
                      dictOptions={sectionDictOptions}
                      canEdit={sectionEdit("personal")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>

                  <VisibleArchiveSection id="assignments" show={isSectionVisible("assignments")}>
                    <AssignmentSection
                      employee={employee}
                      orgs={orgs}
                      canEdit={sectionEdit("work")}
                      onChanged={handleAssignmentsChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="cost-center-allocations" show={isSectionVisible("cost-center-allocations")}>
                    <ArchiveMultiSection
                      title="成本中心分摊"
                      employeeId={employee.id}
                      resourcePath="cost-center-allocations"
                      items={archiveData.costCenterAllocations}
                      fieldDefs={WORK_COST_CENTER_FIELDS}
                      canEdit={sectionEdit("work")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="contracts" show={isSectionVisible("contracts")}>
                    <ContractSection
                      employeeId={employee.id}
                      items={archiveData.contracts}
                      attachments={archiveData.attachments}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="agreements" show={isSectionVisible("agreements")}>
                    <AgreementSection
                      employeeId={employee.id}
                      items={archiveData.agreements}
                      attachments={archiveData.attachments}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>

                  <VisibleArchiveSection id="attendance-cards" show={isSectionVisible("attendance-cards")}>
                    <AttendanceCardSection
                      employeeId={employee.id}
                      items={archiveData.attendanceCards}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="bank-accounts" show={isSectionVisible("bank-accounts")}>
                    <ArchiveMultiSection
                      title="银行卡"
                      employeeId={employee.id}
                      resourcePath="bank-accounts"
                      items={archiveData.bankAccounts}
                      fieldDefs={SERVICE_BANK_FIELDS}
                      canEdit={sectionEdit("service")}
                      dictOptions={sectionDictOptions}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="social-insurances" show={isSectionVisible("social-insurances")}>
                    <ArchiveMultiSection
                      title="社保公积金"
                      employeeId={employee.id}
                      resourcePath="social-insurances"
                      items={archiveData.socialInsurances}
                      fieldDefs={SERVICE_SOCIAL_FIELDS}
                      canEdit={sectionEdit("service")}
                      dictOptions={sectionDictOptions}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="special-benefits" show={isSectionVisible("special-benefits")}>
                    <ArchiveMultiSection
                      title="特殊福利"
                      employeeId={employee.id}
                      resourcePath="special-benefits"
                      items={archiveData.specialBenefits}
                      fieldDefs={SERVICE_BENEFIT_FIELDS}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="work-injuries" show={isSectionVisible("work-injuries")}>
                    <ArchiveMultiSection
                      title="工伤信息"
                      employeeId={employee.id}
                      resourcePath="work-injuries"
                      items={archiveData.workInjuries}
                      fieldDefs={SERVICE_WORK_INJURY_FIELDS}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="admin-infos" show={isSectionVisible("admin-infos")}>
                    <AdminInfoSection
                      employeeId={employee.id}
                      items={archiveData.adminInfos}
                      canEdit={sectionEdit("service")}
                      workEnvironments={dictOptions?.workEnvironments ?? []}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="accommodations" show={isSectionVisible("accommodations")}>
                    <AccommodationSection
                      employeeId={employee.id}
                      items={archiveData.accommodations}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="attachments" show={isSectionVisible("attachments")}>
                    <ArchiveAttachmentSection
                      employeeId={employee.id}
                      items={archiveData.attachments}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>

                  <VisibleArchiveSection id="educations" show={isSectionVisible("educations")}>
                    <EducationSection
                      employeeId={employee.id}
                      items={archiveData.educations}
                      attachments={archiveData.attachments}
                      dictOptions={sectionDictOptions}
                      canEdit={sectionEdit("background")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="work-experiences" show={isSectionVisible("work-experiences")}>
                    <ArchiveMultiSection
                      title="工作经历"
                      employeeId={employee.id}
                      resourcePath="work-experiences"
                      items={archiveData.workExperiences}
                      fieldDefs={BACKGROUND_WORK_EXP_FIELDS}
                      canEdit={sectionEdit("background")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="qualifications" show={isSectionVisible("qualifications")}>
                    <QualificationSection
                      employeeId={employee.id}
                      items={archiveData.qualifications}
                      attachments={archiveData.attachments}
                      canEdit={sectionEdit("background")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="title-certificates" show={isSectionVisible("title-certificates")}>
                    <TitleCertificateSection
                      employeeId={employee.id}
                      items={archiveData.titleCertificates}
                      attachments={archiveData.attachments}
                      canEdit={sectionEdit("background")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="rewards" show={isSectionVisible("rewards")}>
                    <RewardSection
                      employeeId={employee.id}
                      items={archiveData.rewards}
                      canEdit={sectionEdit("background")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="penalties" show={isSectionVisible("penalties")}>
                    <PenaltySection
                      employeeId={employee.id}
                      items={archiveData.penalties}
                      canEdit={sectionEdit("background")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>

                  <VisibleArchiveSection id="training-records" show={isSectionVisible("training-records")}>
                    <ArchiveMultiSection
                      title="培训记录"
                      employeeId={employee.id}
                      resourcePath="training-records"
                      items={archiveData.trainingRecords}
                      fieldDefs={TALENT_TRAINING_FIELDS}
                      canEdit={sectionEdit("development")}
                      dictOptions={sectionDictOptions}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="performance-records" show={isSectionVisible("performance-records")}>
                    <ArchiveMultiSection
                      title="绩效记录"
                      employeeId={employee.id}
                      resourcePath="performance-records"
                      items={archiveData.performanceRecords}
                      fieldDefs={TALENT_PERFORMANCE_FIELDS}
                      canEdit={sectionEdit("development")}
                      dictOptions={sectionDictOptions}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="values-assessments" show={isSectionVisible("values-assessments")}>
                    <ArchiveMultiSection
                      title="价值观评估"
                      employeeId={employee.id}
                      resourcePath="values-assessments"
                      items={archiveData.valuesAssessments}
                      fieldDefs={TALENT_VALUES_FIELDS}
                      canEdit={sectionEdit("development")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="talent-reviews" show={isSectionVisible("talent-reviews")}>
                    <ArchiveMultiSection
                      title="人才盘点"
                      employeeId={employee.id}
                      resourcePath="talent-reviews"
                      items={archiveData.talentReviews}
                      fieldDefs={TALENT_REVIEW_FIELDS}
                      canEdit={sectionEdit("development")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="projects" show={isSectionVisible("projects")}>
                    <ArchiveMultiSection
                      title="项目信息"
                      employeeId={employee.id}
                      resourcePath="projects"
                      items={archiveData.projects}
                      fieldDefs={TALENT_PROJECT_FIELDS}
                      canEdit={sectionEdit("development")}
                      dictOptions={sectionDictOptions}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                  <VisibleArchiveSection id="agent-assignments" show={isSectionVisible("agent-assignments")}>
                    <ArchiveMultiSection
                      title="智能体归属"
                      employeeId={employee.id}
                      resourcePath="agent-assignments"
                      items={archiveData.agentAssignments}
                      fieldDefs={TALENT_AGENT_FIELDS}
                      canEdit={sectionEdit("development")}
                      onChanged={onArchiveChanged}
                    />
                  </VisibleArchiveSection>
                </>
          ) : null}

          {isSectionVisible("movements") ? (
              <ArchiveSectionAnchor id="movements">
                <PanelCard title="异动记录" description="任职记录异动轨迹 · 按生效日排列">
                  <EmployeeMovementTimeline
                    movements={movements}
                    assignments={headerAssignments}
                  />
                </PanelCard>
              </ArchiveSectionAnchor>
          ) : null}
        </div>
      </div>

      <SheetFooter className="shrink-0 border-t px-5 py-3">
        <div className="flex w-full justify-end">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
