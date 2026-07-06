import type { ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Employee, EmployeeStatus } from "@shared/api.interface";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Contact,
  MapPinned,
  Megaphone,
  PencilLine,
  Sparkles,
  UserPlus,
  UserRound,
} from "lucide-react";

import {
  EMPLOYEE_STATUS_OPTIONS,
  GENDER_OPTIONS,
} from "@/api/employee";
import { BOOLEAN_OPTIONS } from "@/components/admin/employee-archive/archive-field-defs";
import type { EmployeeForm } from "@/components/admin/employee-archive/employee-master-form";
import { FormField, OptionToggle } from "@/components/admin/form-field";
import { OptionSelect } from "@/components/admin/option-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type EmployeeMasterSheetFormProps = {
  mode: "create" | "edit";
  form: EmployeeForm;
  setForm: Dispatch<SetStateAction<EmployeeForm>>;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  employee?: Employee;
};

type SectionAccent = "primary" | "sky" | "violet" | "amber" | "emerald";

const ACCENT_STYLES: Record<
  SectionAccent,
  { border: string; iconBg: string; iconText: string; wash: string }
> = {
  primary: {
    border: "border-l-primary/80",
    iconBg: "bg-primary/12 ring-primary/20",
    iconText: "text-primary",
    wash: "from-primary/[0.04]",
  },
  sky: {
    border: "border-l-sky-500/70",
    iconBg: "bg-sky-500/12 ring-sky-500/20",
    iconText: "text-sky-600 dark:text-sky-400",
    wash: "from-sky-500/[0.04]",
  },
  violet: {
    border: "border-l-violet-500/70",
    iconBg: "bg-violet-500/12 ring-violet-500/20",
    iconText: "text-violet-600 dark:text-violet-400",
    wash: "from-violet-500/[0.04]",
  },
  amber: {
    border: "border-l-amber-500/70",
    iconBg: "bg-amber-500/12 ring-amber-500/20",
    iconText: "text-amber-600 dark:text-amber-400",
    wash: "from-amber-500/[0.04]",
  },
  emerald: {
    border: "border-l-emerald-500/70",
    iconBg: "bg-emerald-500/12 ring-emerald-500/20",
    iconText: "text-emerald-600 dark:text-emerald-400",
    wash: "from-emerald-500/[0.04]",
  },
};

function FormSection({
  icon: Icon,
  title,
  description,
  accent = "primary",
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: SectionAccent;
  children: ReactNode;
}) {
  const tone = ACCENT_STYLES[accent];
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/55 bg-card shadow-sm",
        "border-l-[3px]",
        tone.border,
        "bg-gradient-to-br to-background",
        tone.wash,
      )}
    >
      <div className="flex items-start gap-3 border-b border-border/35 px-4 py-3.5">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1",
            tone.iconBg,
            tone.iconText,
          )}
        >
          <Icon className="size-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-3">{children}</div>
    </section>
  );
}

function CreateHero() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-muted/25 px-5 py-4">
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/8 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-sm ring-1 ring-primary/20">
          <UserPlus className="size-7" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="size-3" />
            主档录入
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            先建立员工核心档案；证件、家属、任职等可在创建后于档案详情中维护。
          </p>
        </div>
      </div>
      <div className="relative mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
          <span className="mr-1 text-destructive">*</span>
          必填：姓名、性别、手机号、入职日期
        </span>
        <span className="inline-flex items-center rounded-full border border-dashed border-border/55 bg-background/50 px-2.5 py-1 text-[11px] text-muted-foreground">
          其余字段可稍后补充
        </span>
      </div>
    </div>
  );
}

function EditHero({ employee }: { employee: Employee }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-muted/25 px-5 py-4">
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/8 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-sm ring-1 ring-primary/20">
          <PencilLine className="size-7" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            编辑主档
          </span>
          <p className="text-sm font-medium text-foreground">{employee.fullName}</p>
          <p className="font-mono text-xs text-muted-foreground">{employee.employeeNo}</p>
        </div>
      </div>
      <p className="relative mt-3 text-xs leading-relaxed text-muted-foreground">
        修改个人主档字段；证件、家属等多行信息请在下方档案分区中维护。
      </p>
    </div>
  );
}

export function EmployeeMasterSheetForm({
  mode,
  form,
  setForm,
  saving,
  onCancel,
  onSave,
  employee,
}: EmployeeMasterSheetFormProps) {
  const isCreate = mode === "create";
  const patch = <K extends keyof EmployeeForm>(key: K, value: EmployeeForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <SheetHeader className="border-b bg-muted/15 px-6 py-4 text-left">
        <div className="flex items-center gap-3 pr-8">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            {isCreate ? <UserPlus className="size-5" /> : <PencilLine className="size-5" />}
          </div>
          <div>
            <SheetTitle className="text-lg">{isCreate ? "新建员工" : "编辑个人主档"}</SheetTitle>
            <SheetDescription>
              {isCreate
                ? "录入员工主档信息，保存后进入档案详情"
                : "修改员工核心个人信息，保存后即时生效"}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto bg-muted/10 px-6 py-5">
        {isCreate ? <CreateHero /> : employee ? <EditHero employee={employee} /> : null}

        <FormSection
          icon={UserRound}
          title="基础信息"
          description="身份标识与在职状态"
          accent="primary"
        >
          <FormField label="姓名" required>
            <Input value={form.fullName} onChange={(e) => patch("fullName", e.target.value)} />
          </FormField>
          <FormField label="性别" required>
            <OptionToggle
              value={form.gender}
              onChange={(value) => patch("gender", value)}
              options={GENDER_OPTIONS}
            />
          </FormField>
          <FormField label="手机号" required={isCreate}>
            <Input
              value={form.mobile}
              placeholder={form.mobileMasked ? "已脱敏，修改请填写完整号码" : undefined}
              onChange={(e) => patch("mobile", e.target.value)}
            />
          </FormField>
          {!isCreate && employee ? (
            <FormField label="工号">
              <Input value={employee.employeeNo} disabled className="font-mono opacity-70" />
            </FormField>
          ) : null}
          <FormField label="状态">
            <OptionToggle
              value={form.status}
              onChange={(value) => patch("status", value as EmployeeStatus)}
              options={EMPLOYEE_STATUS_OPTIONS}
            />
          </FormField>
          <FormField label="入职日期" required>
            <Input
              type="date"
              value={form.hireDate}
              onChange={(e) => patch("hireDate", e.target.value)}
            />
          </FormField>
          <FormField label="参加工作日期">
            <Input
              type="date"
              value={form.workStartDate}
              onChange={(e) => patch("workStartDate", e.target.value)}
            />
          </FormField>
          <FormField label="集团司龄起算日">
            <Input
              type="date"
              value={form.groupSeniorityStartDate}
              onChange={(e) => patch("groupSeniorityStartDate", e.target.value)}
            />
          </FormField>
        </FormSection>

        <FormSection
          icon={Contact}
          title="联系与账号"
          description="工作联系方式与系统账号"
          accent="sky"
        >
          <FormField label="公司邮箱">
            <Input
              value={form.companyEmail}
              onChange={(e) => patch("companyEmail", e.target.value)}
            />
          </FormField>
          <FormField label="个人邮箱">
            <Input
              value={form.personalEmail}
              onChange={(e) => patch("personalEmail", e.target.value)}
            />
          </FormField>
          <FormField label="AD账号">
            <Input value={form.adAccount} onChange={(e) => patch("adAccount", e.target.value)} />
          </FormField>
          <FormField label="微信">
            <Input value={form.wechat} onChange={(e) => patch("wechat", e.target.value)} />
          </FormField>
          <FormField label="办公电话">
            <Input
              value={form.officePhone}
              onChange={(e) => patch("officePhone", e.target.value)}
            />
          </FormField>
          <FormField label="办公分机">
            <Input
              value={form.officeExtension}
              onChange={(e) => patch("officeExtension", e.target.value)}
            />
          </FormField>
          <FormField label="家庭电话">
            <Input value={form.homePhone} onChange={(e) => patch("homePhone", e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection
          icon={BookOpen}
          title="个人背景"
          description="学历、民族与社会属性"
          accent="violet"
        >
          <FormField label="婚姻状态">
            <Input
              value={form.maritalStatus}
              onChange={(e) => patch("maritalStatus", e.target.value)}
            />
          </FormField>
          <FormField label="政治面貌">
            <Input
              value={form.politicalAffiliation}
              onChange={(e) => patch("politicalAffiliation", e.target.value)}
            />
          </FormField>
          <FormField label="最高学历">
            <Input
              value={form.highestEducation}
              onChange={(e) => patch("highestEducation", e.target.value)}
            />
          </FormField>
          <FormField label="最高学历毕业日期">
            <Input
              type="date"
              value={form.highestEducationGradDate}
              onChange={(e) => patch("highestEducationGradDate", e.target.value)}
            />
          </FormField>
          <FormField label="生育状况">
            <Input
              value={form.fertilityStatus}
              onChange={(e) => patch("fertilityStatus", e.target.value)}
            />
          </FormField>
          <FormField label="民族">
            <Input value={form.ethnicity} onChange={(e) => patch("ethnicity", e.target.value)} />
          </FormField>
          <FormField label="国籍">
            <Input
              value={form.nationality}
              onChange={(e) => patch("nationality", e.target.value)}
            />
          </FormField>
          <FormField label="户口性质">
            <Input
              value={form.householdType}
              onChange={(e) => patch("householdType", e.target.value)}
            />
          </FormField>
          <FormField label="兴趣爱好">
            <Input value={form.hobbies} onChange={(e) => patch("hobbies", e.target.value)} />
          </FormField>
          <FormField label="党组织关系是否转入">
            <OptionSelect
              value={form.partyOrgTransferred}
              onValueChange={(value) => patch("partyOrgTransferred", value)}
              allowEmpty
              emptyLabel="不填写"
              options={BOOLEAN_OPTIONS}
              className="w-full"
            />
          </FormField>
        </FormSection>

        <FormSection
          icon={MapPinned}
          title="地址与紧急联系人"
          description="户籍、现居地与紧急联络方式"
          accent="amber"
        >
          <FormField label="户籍地址">
            <Input
              value={form.householdLocation}
              onChange={(e) => patch("householdLocation", e.target.value)}
            />
          </FormField>
          <FormField label="身份证地址">
            <Input
              value={form.idCardAddress}
              onChange={(e) => patch("idCardAddress", e.target.value)}
            />
          </FormField>
          <FormField label="现居住地址">
            <Input
              value={form.residenceAddress}
              onChange={(e) => patch("residenceAddress", e.target.value)}
            />
          </FormField>
          <FormField label="紧急联系人">
            <Input
              value={form.emergencyContactName}
              onChange={(e) => patch("emergencyContactName", e.target.value)}
            />
          </FormField>
          <FormField label="紧急联系人电话">
            <Input
              value={form.emergencyContactPhone}
              onChange={(e) => patch("emergencyContactPhone", e.target.value)}
            />
          </FormField>
          <FormField label="紧急联系人关系">
            <Input
              value={form.emergencyContactRelation}
              onChange={(e) => patch("emergencyContactRelation", e.target.value)}
            />
          </FormField>
        </FormSection>

        <FormSection
          icon={Megaphone}
          title="招聘来源"
          description="入职渠道与推荐信息"
          accent="emerald"
        >
          <FormField label="招聘渠道">
            <Input
              value={form.recruitmentChannel}
              onChange={(e) => patch("recruitmentChannel", e.target.value)}
            />
          </FormField>
          <FormField label="渠道明细">
            <Input
              value={form.recruitmentChannelDetail}
              onChange={(e) => patch("recruitmentChannelDetail", e.target.value)}
            />
          </FormField>
        </FormSection>
      </div>

      <SheetFooter className="border-t bg-muted/15 px-6 py-4">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {isCreate
              ? "保存后将自动生成工号，任职可在档案「工作信息」中维护"
              : "保存后返回档案详情，证件与家属信息请在对应分区维护"}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onCancel}>
              {isCreate ? "取消" : "返回详情"}
            </Button>
            <Button disabled={saving} onClick={onSave}>
              {saving ? (isCreate ? "创建中…" : "保存中…") : isCreate ? "创建员工" : "保存主档"}
            </Button>
          </div>
        </div>
      </SheetFooter>
    </>
  );
}
