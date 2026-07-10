import type {
  ArchivePermissionSection,
  Employee,
  EmployeeArchive,
  EmployeeFormOptions,
  EmployeeMasterVersion,
  EmployeeMovement,
  OrganizationTreeNode,
} from "@shared/api.interface";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmployeeMovementTimeline } from "@/components/admin/employee-archive/EmployeeMovementTimeline";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Baby,
  Building2,
  Calendar,
  CalendarClock,
  CalendarDays,
  Flag,
  GraduationCap,
  Hash,
  HeartHandshake,
  Home,
  IdCard,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  PencilLine,
  Phone,
  PhoneCall,
  History,
  Shield,
  Smartphone,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  BACKGROUND_EDUCATION_FIELDS,
  BACKGROUND_PENALTY_FIELDS,
  BACKGROUND_QUALIFICATION_FIELDS,
  BACKGROUND_REWARD_FIELDS,
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
} from "@/components/admin/employee-archive/archive-section-nav";
import { ArchiveAttachmentSection } from "@/components/admin/employee-archive/ArchiveAttachmentSection";
import { AgreementSection } from "@/components/admin/employee-archive/AgreementSection";
import { AttendanceCardSection } from "@/components/admin/employee-archive/AttendanceCardSection";
import { AdminInfoSection } from "@/components/admin/employee-archive/AdminInfoSection";
import { AccommodationSection } from "@/components/admin/employee-archive/AccommodationSection";
import { ContractSection } from "@/components/admin/employee-archive/ContractSection";
import { ArchiveDetailNav } from "@/components/admin/employee-archive/ArchiveDetailNav";
import { ArchiveMultiSection } from "@/components/admin/employee-archive/ArchiveMultiSection";
import { ArchiveSectionAnchor } from "@/components/admin/employee-archive/ArchiveSectionAnchor";
import { AssignmentSection } from "@/components/admin/employee-archive/AssignmentSection";
import { PanelCard, PanelLoading } from "@/components/admin/page-shell";
import { listEmployeeMasterVersions } from "@/api/employee";
import { employeeStatusLabel, statusBadgeClass } from "@/api/employee";
import { getEmployeeFormOptions } from "@/api/employee";
import { EmployeeAvatar } from "@/components/admin/employee-archive/EmployeeAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetFooter, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { cn } from "@/lib/utils";

const FIELD_ICONS: Record<string, LucideIcon> = {
  姓名: User,
  工号: Hash,
  "AD 账号": AtSign,
  性别: Users,
  婚育状况: HeartHandshake,
  政治面貌: Flag,
  最高学历: GraduationCap,
  最高学历毕业时间: Calendar,
  生育状况: Baby,
  民族: Users,
  国籍: Flag,
  户口性质: IdCard,
  户口所在地: MapPin,
  兴趣爱好: Sparkles,
  党组织关系转入: Building2,
  参加工作日期: CalendarDays,
  入职日期: Calendar,
  手机号: Smartphone,
  公司邮箱: Mail,
  个人邮箱: Mail,
  微信: MessageCircle,
  座机: Phone,
  分机: PhoneCall,
  家庭电话: Phone,
  身份证地址: MapPin,
  居住地地址: Home,
  紧急联系人: User,
  紧急联系人电话: Smartphone,
  与员工关系: Users,
  集团司龄起算日: CalendarDays,
  招聘渠道: Megaphone,
  渠道明细: Megaphone,
};

function InfoRow({
  label,
  value,
  masked,
  mono,
  icon,
}: {
  label: string;
  value?: string | null;
  masked?: boolean;
  mono?: boolean;
  icon?: LucideIcon;
}) {
  const Icon = icon ?? FIELD_ICONS[label];
  return (
    <div className="group rounded-md border border-border/25 bg-muted/15 px-2.5 py-1.5 transition-colors hover:border-border/45 hover:bg-muted/28">
      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        {Icon ? <Icon className="size-2.5 shrink-0 opacity-55" /> : null}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("mt-0.5 text-[13px] leading-tight font-medium", mono && "font-mono text-xs")}>
        {value || "—"}
        {masked ? (
          <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px] font-normal">
            <Shield className="mr-0.5 size-2.5" />
            脱敏
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function MasterSubSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 border-b border-border/40 pb-1.5">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="size-3.5" />
        </div>
        <p className="text-xs font-semibold tracking-tight text-foreground">{title}</p>
      </div>
      <div className="grid grid-cols-4 gap-1">{children}</div>
    </div>
  );
}

type EmployeeArchiveDetailViewProps = {
  employee: Employee;
  asOfDate: string;
  /** 主档版本变更后触发刷新（用于“新增生效版本”即时可见） */
  masterVersionsRefreshSeq?: number;
  archive: EmployeeArchive | null;
  movements: EmployeeMovement[];
  detailLoading: boolean;
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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function temporalHint(asOfDate: string) {
  const today = todayStr();
  if (asOfDate < today) return { label: "历史快照", variant: "secondary" as const };
  if (asOfDate > today) return { label: "未来预览", variant: "outline" as const };
  return { label: "当前生效", variant: "default" as const };
}

function VersionTimeline({
  versions,
  activeId,
  onSelect,
}: {
  versions: EmployeeMasterVersion[];
  activeId?: string;
  onSelect: (version: EmployeeMasterVersion) => void;
}) {
  if (versions.length === 0) return null;
  return (
    <div className="mb-3 rounded-lg border border-border/60 bg-muted/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <History className="size-3.5" />
          生效版本
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
            {versions.length} 个
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">点击切换查看快照</span>
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
                "flex min-w-[148px] shrink-0 flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition-all",
                "hover:border-primary/40 hover:bg-background",
                isActive ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/50 bg-background/50",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                  {v.effectiveStartDate}
                </span>
                <Badge
                  variant={v.temporal === "present" ? "default" : v.temporal === "future" ? "outline" : "secondary"}
                  className="h-4 px-1 text-[9px] font-normal"
                >
                  {v.temporalLabel}
                </Badge>
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
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
  detailLoading,
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
  const { activeSectionId, scrollTo } = useScrollSpy(ALL_ARCHIVE_SECTION_IDS, scrollRef, {
    probeOffset: 24,
    scrollPadding: 8,
  });
  const activeCategoryId = findCategoryBySection(activeSectionId);
  const temporal = useMemo(() => temporalHint(asOfDate), [asOfDate]);

  const [versions, setVersions] = useState<EmployeeMasterVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [dictOptions, setDictOptions] = useState<EmployeeFormOptions | null>(archiveDictOptions ?? null);

  useEffect(() => {
    setDictOptions(archiveDictOptions ?? null);
  }, [archiveDictOptions]);

  useEffect(() => {
    if (dictOptions) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await getEmployeeFormOptions();
        if (!cancelled) setDictOptions(res.data);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          typeof e === "object" && e !== null && "message" in e && typeof (e as { message: unknown }).message === "string"
            ? (e as { message: string }).message
            : "字典选项加载失败";
        const traceId =
          typeof e === "object" && e !== null && "traceId" in e && typeof (e as { traceId: unknown }).traceId === "string"
            ? (e as { traceId: string }).traceId
            : undefined;
        toast.error(traceId ? `${msg}（traceId: ${traceId}）` : msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dictOptions]);

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
    void (async () => {
      try {
        const res = await listEmployeeMasterVersions(employee.id);
        if (!cancelled) setVersions(res.data);
      } catch {
        if (!cancelled) setVersions([]);
      } finally {
        if (!cancelled) setVersionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employee.id, masterVersionsRefreshSeq]);

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
          }
        : null,
    [dictOptions],
  );

  const sectionCounts = useMemo(() => {
    if (!archive) return {} as Record<string, number>;
    return {
      "id-documents": archive.idDocuments.length,
      "family-members": archive.familyMembers.length,
      "internal-relatives": archive.internalRelatives.length,
      "cost-center-allocations": archive.costCenterAllocations.length,
      contracts: archive.contracts.length,
      agreements: archive.agreements.length,
      "attendance-cards": archive.attendanceCards.length,
      "bank-accounts": archive.bankAccounts.length,
      "social-insurances": archive.socialInsurances.length,
      "special-benefits": archive.specialBenefits.length,
      "work-injuries": archive.workInjuries.length,
      "admin-infos": archive.adminInfos.length,
      accommodations: archive.accommodations.length,
      attachments: archive.attachments.length,
      educations: archive.educations.length,
      "work-experiences": archive.workExperiences.length,
      qualifications: archive.qualifications.length,
      rewards: archive.rewards.length,
      penalties: archive.penalties.length,
      "training-records": archive.trainingRecords.length,
      "performance-records": archive.performanceRecords.length,
      "values-assessments": archive.valuesAssessments.length,
      "talent-reviews": archive.talentReviews.length,
      projects: archive.projects.length,
      "agent-assignments": archive.agentAssignments.length,
      movements: movements.length,
    };
  }, [archive, movements.length]);

  const jumpToCategory = (categoryId: string) => {
    const cat = ARCHIVE_NAV.find((c) => c.id === categoryId);
    const first = cat?.sections[0]?.id;
    if (first) scrollTo(first);
  };

  return (
    <>
      <SheetHeader className="shrink-0 border-b px-5 py-3 text-left">
        <div className="flex flex-wrap items-start gap-3 pr-8">
          <EmployeeAvatar
            employeeId={employee.id}
            fullName={employee.fullName}
            attachments={archive?.attachments}
            className="size-12 ring-2 ring-primary/15"
            fallbackClassName="bg-primary/10 text-base font-semibold text-primary"
          />
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg tracking-tight">{employee.fullName}</SheetTitle>
            <SheetDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs">
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
            </SheetDescription>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn(statusBadgeClass(employee.status))}>
                {employee.statusLabel ?? employeeStatusLabel(employee.status)}
              </Badge>
              {employee.hireDate ? (
                <span className="text-xs text-muted-foreground">入职 {employee.hireDate}</span>
              ) : null}
              {employee.effectiveStartDate ? (
                <span className="text-xs text-muted-foreground">
                  · 主档生效 {employee.effectiveStartDate}
                  {employee.effectiveEndDate ? ` 至 ${employee.effectiveEndDate}` : " · 至今"}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </SheetHeader>

      <ArchiveDetailNav
        activeCategoryId={activeCategoryId}
        activeSectionId={activeSectionId}
        sectionCounts={sectionCounts}
        onCategoryClick={jumpToCategory}
        onSectionClick={scrollTo}
      />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 px-5 py-3">
          {detailLoading ? (
            <PanelLoading message="加载员工档案…" />
          ) : (
            <>
              <ArchiveSectionAnchor id="personal-master">
                <PanelCard
                  title="个人主档"
                  toolbar={
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={temporal.variant} className="gap-1">
                        <CalendarClock className="size-3" />
                        {temporal.label}
                      </Badge>
                      <Input
                        type="date"
                        value={asOfDate}
                        onChange={(e) => void onAsOfDateChange(e.target.value)}
                        className="h-8 w-[150px]"
                      />
                      {asOfDate !== todayStr() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => void onAsOfDateChange(todayStr())}
                        >
                          回到今天
                        </Button>
                      ) : null}
                      {canEdit ? (
                        <Button size="sm" variant="outline" onClick={onEditMaster}>
                          <PencilLine className="size-3.5" />
                          编辑主档
                        </Button>
                      ) : null}
                    </div>
                  }
                >
                  <div className="space-y-3 p-3">
                    {versionsLoading ? (
                      <div className="h-16 animate-pulse rounded-lg bg-muted/30" />
                    ) : (
                      <VersionTimeline
                        versions={versions}
                        activeId={activeVersionId}
                        onSelect={(v) => void onAsOfDateChange(v.effectiveStartDate)}
                      />
                    )}
                    <MasterSubSection icon={User} title="基础信息">
                        <InfoRow label="姓名" value={employee.fullName} />
                        <InfoRow label="工号" value={employee.employeeNo} mono />
                        <InfoRow label="AD 账号" value={employee.adAccount} mono />
                        <InfoRow label="性别" value={employee.genderLabel ?? employee.gender} />
                        <InfoRow
                          label="婚育状况"
                          value={employee.maritalStatusLabel ?? employee.maritalStatus}
                        />
                        <InfoRow
                          label="政治面貌"
                          value={employee.politicalAffiliationLabel ?? employee.politicalAffiliation}
                        />
                        <InfoRow
                          label="最高学历"
                          value={employee.highestEducationLabel ?? employee.highestEducation}
                        />
                        <InfoRow
                          label="最高学历毕业时间"
                          value={employee.highestEducationGradDate}
                        />
                        <InfoRow
                          label="生育状况"
                          value={employee.fertilityStatusLabel ?? employee.fertilityStatus}
                        />
                        <InfoRow label="民族" value={employee.ethnicityLabel ?? employee.ethnicity} />
                        <InfoRow label="国籍" value={employee.nationalityLabel ?? employee.nationality} />
                        <InfoRow
                          label="户口性质"
                          value={employee.householdTypeLabel ?? employee.householdType}
                        />
                        <InfoRow label="户口所在地" value={employee.householdLocation} />
                        <InfoRow label="兴趣爱好" value={employee.hobbies} />
                        <InfoRow
                          label="党组织关系转入"
                          value={
                            employee.partyOrgTransferred === undefined
                              ? undefined
                              : employee.partyOrgTransferred
                                ? "是"
                                : "否"
                          }
                        />
                        <InfoRow label="参加工作日期" value={employee.workStartDate} />
                        <InfoRow label="入职日期" value={employee.hireDate} />
                        <InfoRow
                          label="集团司龄起算日"
                          value={employee.groupSeniorityStartDate}
                        />
                    </MasterSubSection>
                    <MasterSubSection icon={Phone} title="联系方式">
                        <InfoRow
                          label="手机号"
                          value={employee.mobile}
                          masked={employee.mobileMasked}
                        />
                        <InfoRow label="公司邮箱" value={employee.companyEmail} />
                        <InfoRow label="个人邮箱" value={employee.personalEmail} />
                        <InfoRow label="微信" value={employee.wechat} />
                        <InfoRow label="座机" value={employee.officePhone} />
                        <InfoRow label="分机" value={employee.officeExtension} />
                        <InfoRow label="家庭电话" value={employee.homePhone} />
                    </MasterSubSection>
                    <MasterSubSection icon={MapPin} title="地址与紧急联系人">
                        <InfoRow label="身份证地址" value={employee.idCardAddress} />
                        <InfoRow label="居住地地址" value={employee.residenceAddress} />
                        <InfoRow label="紧急联系人" value={employee.emergencyContactName} />
                        <InfoRow label="紧急联系人电话" value={employee.emergencyContactPhone} />
                        <InfoRow
                          label="与员工关系"
                          value={
                            employee.emergencyContactRelationLabel ?? employee.emergencyContactRelation
                          }
                        />
                    </MasterSubSection>
                    <MasterSubSection icon={Megaphone} title="招聘来源">
                        <InfoRow
                          label="招聘渠道"
                          value={employee.recruitmentChannelLabel ?? employee.recruitmentChannel}
                        />
                        <InfoRow label="渠道明细" value={employee.recruitmentChannelDetail} />
                    </MasterSubSection>
                  </div>
                </PanelCard>
              </ArchiveSectionAnchor>

              {archive ? (
                <>
                  <ArchiveSectionAnchor id="id-documents">
                    <ArchiveMultiSection
                      title="证件信息"
                      employeeId={employee.id}
                      resourcePath="id-documents"
                      items={archive.idDocuments}
                      fieldDefs={PERSONAL_ID_DOCUMENT_FIELDS}
                      dictOptions={sectionDictOptions}
                      canEdit={sectionEdit("personal")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="family-members">
                    <ArchiveMultiSection
                      title="家庭成员"
                      employeeId={employee.id}
                      resourcePath="family-members"
                      items={archive.familyMembers}
                      fieldDefs={PERSONAL_FAMILY_FIELDS}
                      dictOptions={sectionDictOptions}
                      canEdit={sectionEdit("personal")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="internal-relatives">
                    <ArchiveMultiSection
                      title="内部亲属"
                      employeeId={employee.id}
                      resourcePath="internal-relatives"
                      items={archive.internalRelatives}
                      fieldDefs={PERSONAL_INTERNAL_RELATIVE_FIELDS}
                      dictOptions={sectionDictOptions}
                      canEdit={sectionEdit("personal")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>

                  <ArchiveSectionAnchor id="assignments">
                    <AssignmentSection
                      employee={employee}
                      orgs={orgs}
                      canEdit={sectionEdit("work")}
                      onChanged={onAssignmentsChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="cost-center-allocations">
                    <ArchiveMultiSection
                      title="成本中心分摊"
                      employeeId={employee.id}
                      resourcePath="cost-center-allocations"
                      items={archive.costCenterAllocations}
                      fieldDefs={WORK_COST_CENTER_FIELDS}
                      canEdit={sectionEdit("work")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="contracts">
                    <ContractSection
                      employeeId={employee.id}
                      items={archive.contracts}
                      attachments={archive.attachments}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="agreements">
                    <AgreementSection
                      employeeId={employee.id}
                      items={archive.agreements}
                      attachments={archive.attachments}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>

                  <ArchiveSectionAnchor id="attendance-cards">
                    <AttendanceCardSection
                      employeeId={employee.id}
                      items={archive.attendanceCards}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="bank-accounts">
                    <ArchiveMultiSection
                      title="银行卡"
                      employeeId={employee.id}
                      resourcePath="bank-accounts"
                      items={archive.bankAccounts}
                      fieldDefs={SERVICE_BANK_FIELDS}
                      canEdit={sectionEdit("service")}
                      dictOptions={sectionDictOptions}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="social-insurances">
                    <ArchiveMultiSection
                      title="社保公积金"
                      employeeId={employee.id}
                      resourcePath="social-insurances"
                      items={archive.socialInsurances}
                      fieldDefs={SERVICE_SOCIAL_FIELDS}
                      canEdit={sectionEdit("service")}
                      dictOptions={sectionDictOptions}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="special-benefits">
                    <ArchiveMultiSection
                      title="特殊福利"
                      employeeId={employee.id}
                      resourcePath="special-benefits"
                      items={archive.specialBenefits}
                      fieldDefs={SERVICE_BENEFIT_FIELDS}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="work-injuries">
                    <ArchiveMultiSection
                      title="工伤信息"
                      employeeId={employee.id}
                      resourcePath="work-injuries"
                      items={archive.workInjuries}
                      fieldDefs={SERVICE_WORK_INJURY_FIELDS}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="admin-infos">
                    <AdminInfoSection
                      employeeId={employee.id}
                      items={archive.adminInfos}
                      canEdit={sectionEdit("service")}
                      workEnvironments={dictOptions?.workEnvironments ?? []}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="accommodations">
                    <AccommodationSection
                      employeeId={employee.id}
                      items={archive.accommodations}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="attachments">
                    <ArchiveAttachmentSection
                      employeeId={employee.id}
                      items={archive.attachments}
                      canEdit={sectionEdit("service")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>

                  <ArchiveSectionAnchor id="educations">
                    <ArchiveMultiSection
                      title="教育经历"
                      employeeId={employee.id}
                      resourcePath="educations"
                      items={archive.educations}
                      fieldDefs={BACKGROUND_EDUCATION_FIELDS}
                      canEdit={sectionEdit("background")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="work-experiences">
                    <ArchiveMultiSection
                      title="工作经历"
                      employeeId={employee.id}
                      resourcePath="work-experiences"
                      items={archive.workExperiences}
                      fieldDefs={BACKGROUND_WORK_EXP_FIELDS}
                      canEdit={sectionEdit("background")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="qualifications">
                    <ArchiveMultiSection
                      title="资格证书"
                      employeeId={employee.id}
                      resourcePath="qualifications"
                      items={archive.qualifications}
                      fieldDefs={BACKGROUND_QUALIFICATION_FIELDS}
                      canEdit={sectionEdit("background")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="rewards">
                    <ArchiveMultiSection
                      title="奖励记录"
                      employeeId={employee.id}
                      resourcePath="rewards"
                      items={archive.rewards}
                      fieldDefs={BACKGROUND_REWARD_FIELDS}
                      canEdit={sectionEdit("background")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="penalties">
                    <ArchiveMultiSection
                      title="惩处记录"
                      employeeId={employee.id}
                      resourcePath="penalties"
                      items={archive.penalties}
                      fieldDefs={BACKGROUND_PENALTY_FIELDS}
                      canEdit={sectionEdit("background")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>

                  <div className="rounded-lg border border-dashed border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                    人才发展模块为档案记录，不代表启用独立绩效 / 培训 / 盘点业务系统。
                  </div>
                  <ArchiveSectionAnchor id="training-records">
                    <ArchiveMultiSection
                      title="培训记录"
                      employeeId={employee.id}
                      resourcePath="training-records"
                      items={archive.trainingRecords}
                      fieldDefs={TALENT_TRAINING_FIELDS}
                      canEdit={sectionEdit("development")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="performance-records">
                    <ArchiveMultiSection
                      title="绩效记录"
                      employeeId={employee.id}
                      resourcePath="performance-records"
                      items={archive.performanceRecords}
                      fieldDefs={TALENT_PERFORMANCE_FIELDS}
                      canEdit={sectionEdit("development")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="values-assessments">
                    <ArchiveMultiSection
                      title="价值观评估"
                      employeeId={employee.id}
                      resourcePath="values-assessments"
                      items={archive.valuesAssessments}
                      fieldDefs={TALENT_VALUES_FIELDS}
                      canEdit={sectionEdit("development")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="talent-reviews">
                    <ArchiveMultiSection
                      title="人才盘点"
                      employeeId={employee.id}
                      resourcePath="talent-reviews"
                      items={archive.talentReviews}
                      fieldDefs={TALENT_REVIEW_FIELDS}
                      canEdit={sectionEdit("development")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="projects">
                    <ArchiveMultiSection
                      title="项目信息"
                      employeeId={employee.id}
                      resourcePath="projects"
                      items={archive.projects}
                      fieldDefs={TALENT_PROJECT_FIELDS}
                      canEdit={sectionEdit("development")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="agent-assignments">
                    <ArchiveMultiSection
                      title="智能体归属"
                      employeeId={employee.id}
                      resourcePath="agent-assignments"
                      items={archive.agentAssignments}
                      fieldDefs={TALENT_AGENT_FIELDS}
                      canEdit={sectionEdit("development")}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                </>
              ) : null}

              <ArchiveSectionAnchor id="movements">
                <PanelCard title="异动记录" description="入转调离职务数据异动轨迹">
                  <EmployeeMovementTimeline movements={movements} />
                </PanelCard>
              </ArchiveSectionAnchor>
            </>
          )}
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
