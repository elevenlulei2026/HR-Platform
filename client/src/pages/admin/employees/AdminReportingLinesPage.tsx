import type { Employee, ReportingLine } from "@shared/api.interface";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  LINE_TYPE_OPTIONS,
  createReportingLine,
  deleteReportingLine,
  listEmployees,
  listReportingLines,
  updateReportingLine,
} from "@/api/employee";
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
import { Inbox, Plus, RefreshCw, Shield, Trash2 } from "lucide-react";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: ReportingLine[]; total: number };

type SheetMode =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: ReportingLine };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminReportingLinesPage() {
  const perm = usePermission();
  const canView = perm.has("reporting-line:view");
  const canEdit = perm.has("reporting-line:edit");

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [lineType, setLineType] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sheet, setSheet] = useState<SheetMode>({ type: "closed" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formManagerId, setFormManagerId] = useState("");
  const [formLineType, setFormLineType] = useState("DIRECT");
  const [formStart, setFormStart] = useState(todayStr());
  const [formEnd, setFormEnd] = useState("");

  const loadEmployees = useCallback(async () => {
    const res = await listEmployees({ page: 1, pageSize: 500 });
    setEmployees(res.data.items);
    const first = res.data.items[0];
    const second = res.data.items[1];
    if (first) setFormEmployeeId(first.id);
    if (second) setFormManagerId(second.id);
    else if (first) setFormManagerId(first.id);
  }, []);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listReportingLines({
        page,
        pageSize,
        keyword: debouncedKeyword || undefined,
        asOfDate: asOfDate || undefined,
        lineType: (lineType || undefined) as "DIRECT" | "DOTTED" | undefined,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e) {
      setState({ type: "error", error: e as ApiError });
    }
  }, [canView, page, pageSize, debouncedKeyword, asOfDate, lineType]);

  useEffect(() => {
    if (canView) void loadEmployees();
  }, [canView, loadEmployees]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, asOfDate, lineType]);

  const openNew = () => {
    setFormStart(todayStr());
    setFormEnd("");
    setFormLineType("DIRECT");
    setSheet({ type: "new" });
  };

  const openEdit = (item: ReportingLine) => {
    setFormEmployeeId(item.employeeId);
    setFormManagerId(item.managerEmployeeId);
    setFormLineType(item.lineType);
    setFormStart(item.effectiveStartDate);
    setFormEnd(item.effectiveEndDate ?? "");
    setSheet({ type: "edit", item });
  };

  const save = async () => {
    if (!formEmployeeId || !formManagerId) {
      toast.error("请选择下属与上级");
      return;
    }
    setSaving(true);
    try {
      if (sheet.type === "new") {
        await createReportingLine({
          employeeId: formEmployeeId,
          managerEmployeeId: formManagerId,
          lineType: formLineType as "DIRECT" | "DOTTED",
          effectiveStartDate: formStart,
          effectiveEndDate: formEnd || undefined,
        });
        toast.success("汇报关系已创建");
      } else if (sheet.type === "edit") {
        await updateReportingLine(sheet.item.id, {
          managerEmployeeId: formManagerId,
          lineType: formLineType as "DIRECT" | "DOTTED",
          effectiveStartDate: formStart,
          effectiveEndDate: formEnd || undefined,
        });
        toast.success("已保存");
      }
      setSheet({ type: "closed" });
      void load();
    } catch (e) {
      toast.error((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReportingLine(deleteId);
      toast.success("已删除");
      setDeleteId(null);
      void load();
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  if (!canView) {
    return (
      <NoPermissionCard
        icon={<Shield className="size-8 text-muted-foreground" />}
        title="汇报关系"
        description="需要 reporting-line:view 权限"
      />
    );
  }


  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: `${e.fullName}（${e.employeeNo}）`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="汇报关系"
        description="维护员工汇报线，支持 asOfDate 历史快照查询"
        actions={
          canEdit ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1.5 size-4" />
              新建
            </Button>
          ) : undefined
        }
      />

      <PanelCard
        title="筛选"
        toolbar={
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-4" />
            刷新
          </Button>
        }
      >
        <div className="flex flex-wrap items-end gap-3 p-4">
          <SearchInput
            placeholder="员工姓名 / 工号"
            value={keyword}
            onChange={setKeyword}
          />
          <FormField label="快照日期 (asOfDate)">
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-[160px]"
            />
          </FormField>
          <FormField label="关系类型">
            <OptionSelect
              value={lineType}
              onValueChange={setLineType}
              allowEmpty
              emptyLabel="全部"
              options={LINE_TYPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
              className="w-[120px]"
            />
          </FormField>
        </div>
      </PanelCard>

      <PanelCard title="汇报关系列表" description={`当前快照：${asOfDate}`}>
        {state.type === "loading" && <PanelLoading message="加载汇报关系…" />}
        {state.type === "error" && (
          <PanelError error={state.error} onRetry={() => void load()} />
        )}
        {state.type === "ok" && state.items.length === 0 && (
          <PanelEmpty
            icon={<Inbox className="size-5 text-muted-foreground" />}
            title="暂无汇报关系"
            description="调整筛选或新建记录"
          />
        )}
        {state.type === "ok" && state.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium">下属</th>
                    <th className="px-4 py-3 text-left font-medium">上级</th>
                    <th className="px-4 py-3 text-left font-medium">类型</th>
                    <th className="px-4 py-3 text-left font-medium">生效期</th>
                    {canEdit && <th className="px-4 py-3 text-right font-medium">操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-medium">{l.employeeName}</div>
                        <div className="font-mono text-xs text-muted-foreground">{l.employeeNo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{l.managerEmployeeName}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {l.managerEmployeeNo}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{l.lineTypeLabel ?? l.lineType}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {l.effectiveStartDate}
                        {l.effectiveEndDate ? ` → ${l.effectiveEndDate}` : " → 至今"}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>
                              编辑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeleteId(l.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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
        )}
      </PanelCard>

      <Sheet open={sheet.type !== "closed"} onOpenChange={(o) => !o && setSheet({ type: "closed" })}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>{sheet.type === "new" ? "新建汇报关系" : "编辑汇报关系"}</SheetTitle>
            <SheetDescription>实线 / 虚线汇报，须指定生效日期</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <FormField label="下属员工" required>
              <OptionSelect
                value={formEmployeeId}
                onValueChange={setFormEmployeeId}
                options={employeeOptions}
                disabled={sheet.type === "edit"}
              />
            </FormField>
            <FormField label="上级员工" required>
              <OptionSelect
                value={formManagerId}
                onValueChange={setFormManagerId}
                options={employeeOptions}
              />
            </FormField>
            <FormField label="关系类型">
              <OptionSelect
                value={formLineType}
                onValueChange={setFormLineType}
                options={LINE_TYPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
              />
            </FormField>
            <FormField label="生效开始" required>
              <Input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
            </FormField>
            <FormField label="生效结束" hint="留空表示当前有效">
              <Input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
            </FormField>
          </div>
          <SheetFooter className="flex-row border-t px-6 py-4">
            <Button variant="outline" onClick={() => setSheet({ type: "closed" })}>
              取消
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              保存
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="删除汇报关系"
        description="删除后不可恢复，确认继续？"
        confirmLabel="删除"
        destructive
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
