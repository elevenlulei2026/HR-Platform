import type { HeadcountCheckResult, HeadcountPlan, OrganizationTreeNode } from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  checkHeadcount,
  createHeadcountPlan,
  deleteHeadcountPlan,
  listHeadcountPlans,
  updateHeadcountPlan,
} from "@/api/headcount";
import { flattenOrgTree, getOrganizationTree } from "@/api/organization";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormField } from "@/components/admin/form-field";
import { OptionSelect } from "@/components/admin/option-select";
import {
  NoPermissionCard,
  PageHeader,
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  PaginationBar,
  SearchInput,
} from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import { ClipboardCheck, Inbox, Plus, RefreshCw, Shield, Trash2 } from "lucide-react";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: HeadcountPlan[]; total: number };

type SheetMode =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: HeadcountPlan };

function usagePercent(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function UsageBadge({ rate }: { rate: number }) {
  const pct = rate * 100;
  return (
    <Badge
      variant="secondary"
      className={cn(
        pct >= 100 && "border-destructive/30 bg-destructive/10 text-destructive",
        pct >= 80 && pct < 100 && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      使用率 {usagePercent(rate)}
    </Badge>
  );
}

export function AdminOrgHeadcountPage() {
  const perm = usePermission();
  const canView = perm.has("headcount:view");
  const canEdit = perm.has("headcount:edit");

  const currentYear = new Date().getFullYear();
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [fiscalYear, setFiscalYear] = useState(String(currentYear));
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });
  const [orgs, setOrgs] = useState<OrganizationTreeNode[]>([]);
  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formOrgId, setFormOrgId] = useState("");
  const [formYear, setFormYear] = useState(String(currentYear));
  const [formPlanned, setFormPlanned] = useState("0");
  const [formOccupied, setFormOccupied] = useState("0");
  const [formReserved, setFormReserved] = useState("0");

  const [checkOrgId, setCheckOrgId] = useState("");
  const [checkYear, setCheckYear] = useState(String(currentYear));
  const [checkDelta, setCheckDelta] = useState("1");
  const [checkResult, setCheckResult] = useState<HeadcountCheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  const flatOrgs = useMemo(() => flattenOrgTree(orgs), [orgs]);

  const loadRefs = useCallback(async () => {
    const tree = await getOrganizationTree();
    setOrgs(tree.data);
    const first = flattenOrgTree(tree.data)[0];
    if (first) {
      setFormOrgId(first.id);
      setCheckOrgId(first.id);
    }
  }, []);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listHeadcountPlans({
        page,
        pageSize,
        keyword: debouncedKeyword.trim() || undefined,
        fiscalYear: fiscalYear ? Number(fiscalYear) : undefined,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      setState({ type: "error", error: e as ApiError });
    }
  }, [canView, page, pageSize, debouncedKeyword, fiscalYear]);

  useEffect(() => {
    if (!canView) return;
    void loadRefs();
  }, [canView, loadRefs]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setFormOrgId(flatOrgs[0]?.id ?? "");
    setFormYear(fiscalYear || String(currentYear));
    setFormPlanned("10");
    setFormOccupied("0");
    setFormReserved("0");
    setSheet({ type: "new" });
  };

  const openEdit = (item: HeadcountPlan) => {
    setFormOrgId(item.organizationId);
    setFormYear(String(item.fiscalYear));
    setFormPlanned(String(item.plannedCount));
    setFormOccupied(String(item.occupiedCount));
    setFormReserved(String(item.reservedCount));
    setSheet({ type: "edit", item });
  };

  const handleSave = async () => {
    if (!formOrgId) {
      toast.error("请选择部门");
      return;
    }
    setSaving(true);
    try {
      if (sheet.type === "new") {
        await createHeadcountPlan({
          organizationId: formOrgId,
          fiscalYear: Number(formYear),
          plannedCount: Number(formPlanned) || 0,
        });
      } else if (sheet.type === "edit") {
        await updateHeadcountPlan(sheet.item.id, {
          plannedCount: Number(formPlanned) || 0,
          occupiedCount: Number(formOccupied) || 0,
          reservedCount: Number(formReserved) || 0,
        });
      }
      toast.success("编制计划已保存");
      setSheet({ type: "closed" });
      await load();
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSaving(false);
    }
  };

  const runCheck = async () => {
    if (!checkOrgId) {
      toast.error("请选择部门");
      return;
    }
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await checkHeadcount({
        organizationId: checkOrgId,
        fiscalYear: Number(checkYear),
        delta: Number(checkDelta) || 1,
      });
      setCheckResult(res.data);
    } catch (e: unknown) {
      toast.error((e as ApiError).message);
    } finally {
      setChecking(false);
    }
  };

  if (!canView) {
    return (
      <div className="space-y-5">
        <PageHeader title="编制管理" description="部门编制计划与使用情况。" />
        <NoPermissionCard
          icon={<Shield className="size-5 text-muted-foreground" />}
          title="无查看权限"
          description="需要 headcount:view 权限。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="编制管理"
        description="维护部门年度编制；入职/调岗前可调用编制校验 API。"
        actions={
          canEdit ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="size-4" />
              新建编制
            </Button>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PanelCard
          title="编制列表"
          toolbar={
            <>
              <SearchInput
                value={keyword}
                onChange={(v) => {
                  setKeyword(v);
                  setPage(1);
                }}
                placeholder="按部门名称/编码"
              />
              <Input
                type="number"
                className="h-8 w-[100px]"
                value={fiscalYear}
                onChange={(e) => {
                  setFiscalYear(e.target.value);
                  setPage(1);
                }}
                placeholder="年度"
              />
              <Button variant="outline" size="sm" onClick={() => void load()}>
                <RefreshCw className="size-4" />
              </Button>
            </>
          }
        >
          {state.type === "loading" ? <PanelLoading message="加载编制计划…" /> : null}
          {state.type === "error" ? <PanelError error={state.error} onRetry={() => void load()} /> : null}
          {state.type === "ok" && state.items.length === 0 ? (
            <PanelEmpty
              title="暂无编制计划"
              description="可为部门创建年度编制。"
              icon={<Inbox className="size-5 text-muted-foreground" />}
              action={
                canEdit ? (
                  <Button size="sm" onClick={openNew}>
                    新建编制
                  </Button>
                ) : undefined
              }
            />
          ) : null}
          {state.type === "ok" && state.items.length > 0 ? (
            <>
              <div className="divide-y">
                {state.items.map((it) => (
                  <div key={it.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {it.organizationName || it.organizationCode || it.organizationId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {it.fiscalYear} 年度 · 计划 {it.plannedCount} · 已用 {it.occupiedCount} · 在途{" "}
                        {it.reservedCount} · 可用 {it.availableCount}
                      </div>
                    </div>
                    <UsageBadge rate={it.usageRate} />
                    {canEdit ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
                          编辑
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(it.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <PaginationBar
                page={page}
                pageSize={pageSize}
                total={state.total}
                itemCount={state.items.length}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => p + 1)}
              />
            </>
          ) : null}
        </PanelCard>

        <PanelCard title="编制校验" description="模拟入职/调岗前校验">
          <div className="space-y-3 p-4">
            <FormField label="部门">
              <OptionSelect
                value={checkOrgId}
                onValueChange={setCheckOrgId}
                placeholder="选择部门"
                options={flatOrgs.map((o) => ({
                  value: o.id,
                  label: `${o.name}（${o.code}）`,
                }))}
              />
            </FormField>
            <FormField label="年度">
              <Input type="number" value={checkYear} onChange={(e) => setCheckYear(e.target.value)} />
            </FormField>
            <FormField label="拟占用数" hint="默认 1，表示本次入职/调岗占用编制数">
              <Input type="number" min={1} value={checkDelta} onChange={(e) => setCheckDelta(e.target.value)} />
            </FormField>
            <Button className="w-full" disabled={checking} onClick={() => void runCheck()}>
              <ClipboardCheck className="size-4" />
              {checking ? "校验中…" : "执行校验"}
            </Button>
            {checkResult ? (
              <div
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  checkResult.allowed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-destructive/30 bg-destructive/5",
                )}
              >
                <div className="font-medium">{checkResult.allowed ? "校验通过" : "超编，不可提交"}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  计划 {checkResult.plannedCount} · 已用 {checkResult.occupiedCount} · 在途{" "}
                  {checkResult.reservedCount} · 可用 {checkResult.availableCount}
                </div>
                {checkResult.reason ? (
                  <div className="mt-2 text-xs text-destructive">{checkResult.reason}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </PanelCard>
      </div>

      <Sheet open={sheet.type !== "closed"} onOpenChange={(o) => !o && setSheet({ type: "closed" })}>
        <SheetContent className="gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{sheet.type === "new" ? "新建编制" : "编辑编制"}</SheetTitle>
            <SheetDescription>部门 + 年度唯一。</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-6 py-4">
            <FormField label="部门" required>
              <OptionSelect
                value={formOrgId}
                onValueChange={setFormOrgId}
                placeholder="选择部门"
                disabled={sheet.type === "edit"}
                options={flatOrgs.map((o) => ({
                  value: o.id,
                  label: `${o.name}（${o.code}）`,
                }))}
              />
            </FormField>
            <FormField label="年度" required>
              <Input
                type="number"
                value={formYear}
                onChange={(e) => setFormYear(e.target.value)}
                disabled={sheet.type === "edit"}
              />
            </FormField>
            <FormField label="计划编制" required>
              <Input type="number" min={0} value={formPlanned} onChange={(e) => setFormPlanned(e.target.value)} />
            </FormField>
            {sheet.type === "edit" ? (
              <>
                <FormField label="已占用">
                  <Input type="number" min={0} value={formOccupied} onChange={(e) => setFormOccupied(e.target.value)} />
                </FormField>
                <FormField label="在途">
                  <Input type="number" min={0} value={formReserved} onChange={(e) => setFormReserved(e.target.value)} />
                </FormField>
              </>
            ) : null}
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setSheet({ type: "closed" })}>
                取消
              </Button>
              <Button disabled={saving} onClick={() => void handleSave()}>
                保存
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="删除编制计划"
        description="删除后不可恢复，确定继续？"
        confirmLabel="删除"
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await deleteHeadcountPlan(deleteId);
            toast.success("已删除");
            setDeleteId(null);
            await load();
          } catch (e: unknown) {
            toast.error((e as ApiError).message);
          }
        }}
        onOpenChange={(o) => !o && setDeleteId(null)}
      />
    </div>
  );
}
