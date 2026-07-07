import type {
  Employee,
  EmployeeArchive,
  EmployeeAssignment,
  EmployeeMovement,
  OrganizationTreeNode,
} from "@shared/api.interface";
import { useMemo, useRef } from "react";
import { EmployeeMovementTimeline } from "@/components/admin/employee-archive/EmployeeMovementTimeline";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Baby,
  Building2,
  Calendar,
  CalendarDays,
  Flag,
  GraduationCap,
  Hash,
  HeartHandshake,
  Home,
  IdCard,
  Mail,
  MapPin,
  MessageCircle,
  PencilLine,
  Phone,
  PhoneCall,
  Shield,
  Smartphone,
  Sparkles,
  User,
  UserRound,
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
  SERVICE_ATTENDANCE_FIELDS,
  SERVICE_BANK_FIELDS,
  SERVICE_BENEFIT_FIELDS,
  SERVICE_COMMUTE_FIELDS,
  SERVICE_SOCIAL_FIELDS,
  TALENT_AGENT_FIELDS,
  TALENT_PERFORMANCE_FIELDS,
  TALENT_PROJECT_FIELDS,
  TALENT_REVIEW_FIELDS,
  TALENT_TRAINING_FIELDS,
  TALENT_VALUES_FIELDS,
  WORK_AGREEMENT_FIELDS,
  WORK_CONTRACT_FIELDS,
  WORK_COST_CENTER_FIELDS,
} from "@/components/admin/employee-archive/archive-field-defs";
import {
  ALL_ARCHIVE_SECTION_IDS,
  ARCHIVE_NAV,
  findCategoryBySection,
} from "@/components/admin/employee-archive/archive-section-nav";
import { ArchiveAttachmentSection } from "@/components/admin/employee-archive/ArchiveAttachmentSection";
import { ArchiveDetailNav } from "@/components/admin/employee-archive/ArchiveDetailNav";
import { ArchiveMultiSection } from "@/components/admin/employee-archive/ArchiveMultiSection";
import { ArchiveSectionAnchor } from "@/components/admin/employee-archive/ArchiveSectionAnchor";
import { AssignmentSection } from "@/components/admin/employee-archive/AssignmentSection";
import { PanelCard, PanelEmpty, PanelLoading } from "@/components/admin/page-shell";
import { employeeStatusLabel, statusBadgeClass } from "@/api/employee";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetFooter, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { cn } from "@/lib/utils";

const FIELD_ICONS: Record<string, LucideIcon> = {
  姓名: User,
  工号: Hash,
  "AD 账号": AtSign,
  性别: Users,
  婚姻状况: HeartHandshake,
  政治面貌: Flag,
  最高学历: GraduationCap,
  最高学历毕业时间: Calendar,
  生育状况: Baby,
  民族: Users,
  国籍: Flag,
  户口类别: IdCard,
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
  archive: EmployeeArchive | null;
  assignments: EmployeeAssignment[];
  movements: EmployeeMovement[];
  detailLoading: boolean;
  canEdit: boolean;
  orgs: OrganizationTreeNode[];
  onClose: () => void;
  onEditMaster: () => void;
  onArchiveChanged: () => void;
  onAssignmentsChanged: () => Promise<void>;
};

export function EmployeeArchiveDetailView({
  employee,
  archive,
  assignments,
  movements,
  detailLoading,
  canEdit,
  orgs,
  onClose,
  onEditMaster,
  onArchiveChanged,
  onAssignmentsChanged,
}: EmployeeArchiveDetailViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { activeSectionId, scrollTo } = useScrollSpy(ALL_ARCHIVE_SECTION_IDS, scrollRef, {
    probeOffset: 24,
    scrollPadding: 8,
  });
  const activeCategoryId = findCategoryBySection(activeSectionId);

  const sectionCounts = useMemo(() => {
    if (!archive) return {} as Record<string, number>;
    return {
      "id-documents": archive.idDocuments.length,
      "family-members": archive.familyMembers.length,
      "internal-relatives": archive.internalRelatives.length,
      assignments: assignments.length,
      "cost-center-allocations": archive.costCenterAllocations.length,
      contracts: archive.contracts.length,
      agreements: archive.agreements.length,
      "attendance-cards": archive.attendanceCards.length,
      "bank-accounts": archive.bankAccounts.length,
      "social-insurances": archive.socialInsurances.length,
      "special-benefits": archive.specialBenefits.length,
      "commute-accommodations": archive.commuteAccommodations.length,
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
  }, [archive, assignments.length, movements.length]);

  const jumpToCategory = (categoryId: string) => {
    const cat = ARCHIVE_NAV.find((c) => c.id === categoryId);
    const first = cat?.sections[0]?.id;
    if (first) scrollTo(first);
  };

  return (
    <>
      <SheetHeader className="shrink-0 border-b px-5 py-3 text-left">
        <div className="flex items-start gap-3 pr-8">
          <Avatar className="size-12 ring-2 ring-primary/15">
            <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
              {employee.fullName.slice(0, 1) || <UserRound className="size-5" />}
            </AvatarFallback>
          </Avatar>
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
                    canEdit ? (
                      <Button size="sm" variant="outline" onClick={onEditMaster}>
                        <PencilLine className="size-3.5" />
                        编辑主档
                      </Button>
                    ) : null
                  }
                >
                  <div className="space-y-3 p-3">
                    <MasterSubSection icon={User} title="基础信息">
                        <InfoRow label="姓名" value={employee.fullName} />
                        <InfoRow label="工号" value={employee.employeeNo} mono />
                        <InfoRow label="AD 账号" value={employee.adAccount} mono />
                        <InfoRow label="性别" value={employee.genderLabel ?? employee.gender} />
                        <InfoRow label="婚姻状况" value={employee.maritalStatus} />
                        <InfoRow label="政治面貌" value={employee.politicalAffiliation} />
                        <InfoRow label="最高学历" value={employee.highestEducation} />
                        <InfoRow
                          label="最高学历毕业时间"
                          value={employee.highestEducationGradDate}
                        />
                        <InfoRow label="生育状况" value={employee.fertilityStatus} />
                        <InfoRow label="民族" value={employee.ethnicity} />
                        <InfoRow label="国籍" value={employee.nationality} />
                        <InfoRow label="户口类别" value={employee.householdType} />
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
                        <InfoRow label="与员工关系" value={employee.emergencyContactRelation} />
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>

                  <ArchiveSectionAnchor id="assignments">
                    <AssignmentSection
                      employeeId={employee.id}
                      assignments={assignments}
                      orgs={orgs}
                      canEdit={canEdit}
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
                      canEdit={canEdit}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="contracts">
                    <ArchiveMultiSection
                      title="合同信息"
                      employeeId={employee.id}
                      resourcePath="contracts"
                      items={archive.contracts}
                      fieldDefs={WORK_CONTRACT_FIELDS}
                      canEdit={canEdit}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="agreements">
                    <ArchiveMultiSection
                      title="协议信息"
                      employeeId={employee.id}
                      resourcePath="agreements"
                      items={archive.agreements}
                      fieldDefs={WORK_AGREEMENT_FIELDS}
                      canEdit={canEdit}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>

                  <ArchiveSectionAnchor id="attendance-cards">
                    <ArchiveMultiSection
                      title="考勤卡"
                      employeeId={employee.id}
                      resourcePath="attendance-cards"
                      items={archive.attendanceCards}
                      fieldDefs={SERVICE_ATTENDANCE_FIELDS}
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="commute-accommodations">
                    <ArchiveMultiSection
                      title="通勤与住宿"
                      employeeId={employee.id}
                      resourcePath="commute-accommodations"
                      items={archive.commuteAccommodations}
                      fieldDefs={SERVICE_COMMUTE_FIELDS}
                      canEdit={canEdit}
                      onChanged={onArchiveChanged}
                    />
                  </ArchiveSectionAnchor>
                  <ArchiveSectionAnchor id="attachments">
                    <ArchiveAttachmentSection
                      employeeId={employee.id}
                      items={archive.attachments}
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
                      canEdit={canEdit}
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
