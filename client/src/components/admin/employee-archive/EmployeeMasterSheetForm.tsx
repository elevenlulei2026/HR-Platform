import type { ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Employee, EmployeeFormOptions, EmployeeStatus } from "@shared/api.interface";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Contact,
  MapPinned,
  Megaphone,
  PencilLine,
  UserPlus,
  UserRound,
} from "lucide-react";

import {
  EMPLOYEE_STATUS_OPTIONS,
  EMPTY_EMPLOYEE_FORM_OPTIONS,
  GENDER_OPTIONS,
} from "@/api/employee";
import { BOOLEAN_OPTIONS } from "@/components/admin/employee-archive/archive-field-defs";
import { DictFieldSelect } from "@/components/admin/employee-archive/employee-master-dict-fields";
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
  dictOptions?: EmployeeFormOptions | null;
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

export function EmployeeMasterFormBody({
  mode,
  form,
  setForm,
  employee,
  dictOptions = EMPTY_EMPLOYEE_FORM_OPTIONS,
}: Pick<EmployeeMasterSheetFormProps, "mode" | "form" | "setForm" | "employee" | "dictOptions">) {
  const isCreate = mode === "create";
  const dictLoading = dictOptions === null;
  const opts = dictOptions ?? EMPTY_EMPLOYEE_FORM_OPTIONS;
  const patch = <K extends keyof EmployeeForm>(key: K, value: EmployeeForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-5">
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
          <DictFieldSelect
            label="婚育状况"
            value={form.maritalStatus}
            onChange={(value) => patch("maritalStatus", value)}
            options={opts.maritalStatuses}
            loading={dictLoading}
          />
          <DictFieldSelect
            label="政治面貌"
            value={form.politicalAffiliation}
            onChange={(value) => patch("politicalAffiliation", value)}
            options={opts.politicalAffiliations}
            loading={dictLoading}
          />
          <DictFieldSelect
            label="最高学历"
            value={form.highestEducation}
            onChange={(value) => patch("highestEducation", value)}
            options={opts.educations}
            loading={dictLoading}
          />
          <FormField label="学历毕业日期">
            <Input
              type="date"
              value={form.highestEducationGradDate}
              onChange={(e) => patch("highestEducationGradDate", e.target.value)}
            />
          </FormField>
          <DictFieldSelect
            label="生育状况"
            value={form.fertilityStatus}
            onChange={(value) => patch("fertilityStatus", value)}
            options={opts.fertilityStatuses}
            loading={dictLoading}
          />
          <DictFieldSelect
            label="民族"
            value={form.ethnicity}
            onChange={(value) => patch("ethnicity", value)}
            options={opts.ethnicities}
            loading={dictLoading}
          />
          <DictFieldSelect
            label="国籍"
            value={form.nationality}
            onChange={(value) => patch("nationality", value)}
            options={opts.nationalities}
            loading={dictLoading}
          />
          <DictFieldSelect
            label="户口性质"
            value={form.householdType}
            onChange={(value) => patch("householdType", value)}
            options={opts.householdTypes}
            loading={dictLoading}
          />
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
          <DictFieldSelect
            label="与员工关系"
            value={form.emergencyContactRelation}
            onChange={(value) => patch("emergencyContactRelation", value)}
            options={opts.employeeRelations}
            loading={dictLoading}
          />
        </FormSection>

        <FormSection
          icon={Megaphone}
          title="招聘来源"
          description="入职渠道与推荐信息"
          accent="emerald"
        >
          <DictFieldSelect
            label="招聘渠道"
            value={form.recruitmentChannel}
            onChange={(value) => patch("recruitmentChannel", value)}
            options={opts.recruitmentChannels}
            loading={dictLoading}
          />
          <FormField label="渠道明细">
            <Input
              value={form.recruitmentChannelDetail}
              onChange={(e) => patch("recruitmentChannelDetail", e.target.value)}
            />
          </FormField>
        </FormSection>
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
  dictOptions,
}: EmployeeMasterSheetFormProps) {
  const isCreate = mode === "create";

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
        <EmployeeMasterFormBody
          mode={mode}
          form={form}
          setForm={setForm}
          employee={employee}
          dictOptions={dictOptions}
        />
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
