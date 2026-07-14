import type {
  CodeRule,
  CodeRuleSeqReset,
  DictItem,
  DictType,
  DictTypeListQuery,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import {
  createDictItem,
  createDictType,
  deleteDictItem,
  deleteDictType,
  downloadDictImportErrorReport,
  downloadDictImportTemplate,
  importDict,
  listDictItemsByTypeCode,
  listDictTypes,
  updateDictItem,
  updateDictType,
} from "@/api/dict";
import {
  createCodeRule,
  deleteCodeRule,
  generateCode,
  listCodeRules,
  updateCodeRule,
} from "@/api/code-rules";
import { ExcelBatchImportDialog } from "@/components/admin/ExcelBatchImportDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { FormField, OptionToggle, STATUS_OPTIONS } from "@/components/admin/form-field";
import {
  BookText,
  ChevronLeft,
  ChevronRight,
  Hash,
  Inbox,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Upload,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ParentChildCatalogPanel } from "@/pages/admin/settings/ParentChildCatalogPanel";

type LoadState<T> =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; data: T };

type DictSheetMode =
  | { type: "closed" }
  | { type: "type-new" }
  | { type: "type-edit"; item: DictType }
  | { type: "item-new"; typeCode: string }
  | { type: "item-edit"; item: DictItem };

type CodeRuleSheetMode =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; item: CodeRule };

type SettingsTab = "dict" | "code-rules" | "employee-group-catalog";

const SETTINGS_TABS: SettingsTab[] = ["dict", "code-rules", "employee-group-catalog"];

const RESET_OPTIONS: Array<{ id: CodeRuleSeqReset; label: string }> = [
  { id: "DAY", label: "按天" },
  { id: "MONTH", label: "按月" },
  { id: "YEAR", label: "按年" },
  { id: "NEVER", label: "永不重置" },
];

const RESET_LABEL: Record<CodeRuleSeqReset, string> = {
  DAY: "按天",
  MONTH: "按月",
  YEAR: "按年",
  NEVER: "永不重置",
};

function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className={cn(
        active &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      )}
    >
      {active ? "启用" : status === "DISABLED" ? "停用" : status}
    </Badge>
  );
}

function PanelLoading({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center px-6 py-16 text-sm text-muted-foreground">
      <RefreshCw className="mr-2 size-4 animate-spin opacity-60" />
      {message}
    </div>
  );
}

function PanelError({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry: () => void;
}) {
  return (
    <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <div className="text-sm font-medium text-destructive">加载失败</div>
      <div className="mt-1 text-sm text-destructive/90">
        {error.traceId ? `${error.message}（traceId: ${error.traceId}）` : error.message}
      </div>
      <Button className="mt-4" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

function PanelEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function PaginationBar({
  page,
  pageSize,
  total,
  itemCount,
  onPrev,
  onNext,
}: {
  page: number;
  pageSize: number;
  total: number;
  itemCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3">
      <span className="text-xs text-muted-foreground">
        共 {total} 条 · 第 {page} 页
      </span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>
          <ChevronLeft />
          上一页
        </Button>
        <Button variant="outline" size="sm" disabled={itemCount < pageSize} onClick={onNext}>
          下一页
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

function DataTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[480px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function AdminSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SettingsTab = SETTINGS_TABS.includes(tabParam as SettingsTab)
    ? (tabParam as SettingsTab)
    : "dict";
  const setActiveTab = (tab: SettingsTab) => setSearchParams({ tab });

  // dict types
  const [dictKeyword, setDictKeyword] = useState("");
  const debouncedDictKeyword = useDebouncedValue(dictKeyword);
  const [dictPage, setDictPage] = useState(1);
  const dictPageSize = 20;
  const dictQuery = useMemo<DictTypeListQuery>(
    () => ({
      page: dictPage,
      pageSize: dictPageSize,
      keyword: debouncedDictKeyword.trim() || undefined,
    }),
    [debouncedDictKeyword, dictPage, dictPageSize],
  );
  const [dictTypesState, setDictTypesState] = useState<LoadState<{ items: DictType[]; total: number }>>({
    type: "loading",
  });

  // selected dict type items
  const [selectedTypeCode, setSelectedTypeCode] = useState<string>("");
  const [dictItemsState, setDictItemsState] = useState<LoadState<DictItem[]>>({ type: "ok", data: [] });

  const [dictSheet, setDictSheet] = useState<DictSheetMode>({ type: "closed" });
  const [dictImportOpen, setDictImportOpen] = useState(false);

  // code rules
  const [ruleKeyword, setRuleKeyword] = useState("");
  const debouncedRuleKeyword = useDebouncedValue(ruleKeyword);
  const [rulePage, setRulePage] = useState(1);
  const rulePageSize = 20;
  const [codeRulesState, setCodeRulesState] = useState<LoadState<{ items: CodeRule[]; total: number }>>({
    type: "loading",
  });
  const [codeRuleSheet, setCodeRuleSheet] = useState<CodeRuleSheetMode>({ type: "closed" });
  const [generatedCode, setGeneratedCode] = useState<string>("");

  const loadDictTypes = useCallback(async () => {
    try {
      setDictTypesState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listDictTypes(dictQuery);
      const items = res.data.items.filter((t) => t.code !== "MOVEMENT_REASON");
      const removedOnThisPage = res.data.items.length - items.length;
      const total = Math.max(0, res.data.total - removedOnThisPage);
      setDictTypesState({ type: "ok", data: { items, total } });
    } catch (e: unknown) {
      const err: ApiError =
        typeof (e as any)?.message === "string"
          ? { message: (e as any).message, traceId: (e as any).traceId }
          : { message: "加载失败，请重试" };
      setDictTypesState({ type: "error", error: err });
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, [dictQuery]);

  const loadDictItems = useCallback(
    async (typeCode: string) => {
      const tc = typeCode.trim();
      if (!tc) {
        setDictItemsState({ type: "ok", data: [] });
        return;
      }
      try {
        setDictItemsState({ type: "loading" });
        const res = await listDictItemsByTypeCode(tc);
        setDictItemsState({ type: "ok", data: res.data });
      } catch (e: unknown) {
        const err: ApiError =
          typeof (e as any)?.message === "string"
            ? { message: (e as any).message, traceId: (e as any).traceId }
            : { message: "加载失败，请重试" };
        setDictItemsState({ type: "error", error: err });
        toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
      }
    },
    [],
  );

  const loadCodeRules = useCallback(async () => {
    try {
      setCodeRulesState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listCodeRules({
        page: rulePage,
        pageSize: rulePageSize,
        keyword: debouncedRuleKeyword.trim() || undefined,
      });
      setCodeRulesState({ type: "ok", data: { items: res.data.items, total: res.data.total } });
    } catch (e: unknown) {
      const err: ApiError =
        typeof (e as any)?.message === "string"
          ? { message: (e as any).message, traceId: (e as any).traceId }
          : { message: "加载失败，请重试" };
      setCodeRulesState({ type: "error", error: err });
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, [debouncedRuleKeyword, rulePage, rulePageSize]);

  useEffect(() => {
    if (activeTab !== "dict") return;
    void loadDictTypes();
  }, [activeTab, loadDictTypes]);

  useEffect(() => {
    if (activeTab !== "code-rules") return;
    void loadCodeRules();
  }, [activeTab, loadCodeRules]);

  useEffect(() => {
    void loadDictItems(selectedTypeCode);
  }, [selectedTypeCode, loadDictItems]);

  useEffect(() => {
    if (activeTab !== "dict") return;
    if (dictTypesState.type !== "ok") return;
    if (dictTypesState.data.items.length === 0) return;
    const stillValid = dictTypesState.data.items.some((t) => t.code === selectedTypeCode);
    if (!stillValid) {
      setSelectedTypeCode(dictTypesState.data.items[0].code);
    }
  }, [activeTab, dictTypesState, selectedTypeCode]);

  const dictTypes = dictTypesState.type === "ok" ? dictTypesState.data.items : [];
  const dictTypeTotal = dictTypesState.type === "ok" ? dictTypesState.data.total : 0;
  const dictItems = dictItemsState.type === "ok" ? dictItemsState.data : [];

  const codeRules = codeRulesState.type === "ok" ? codeRulesState.data.items : [];
  const codeRuleTotal = codeRulesState.type === "ok" ? codeRulesState.data.total : 0;

  const selectedType = dictTypes.find((t) => t.code === selectedTypeCode);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">系统设置</h1>
        <p className="text-[13px] text-muted-foreground">
            {activeTab === "dict"
              ? "维护字典类型与字典项，供各业务模块下拉选项引用。"
              : activeTab === "employee-group-catalog"
                ? "维护通用父子值目录；员工组/子组、职务异动类型等均在此统一维护。"
                : "维护工号、组织编码等自动生成规则，修改后下一次生成立即生效。"}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SettingsTab)}
        className="w-full gap-4"
      >
        <TabsList className="self-start">
          <TabsTrigger value="dict" className="min-w-[108px] gap-1.5">
            <BookText className="size-4" />
            字典
          </TabsTrigger>
          <TabsTrigger value="code-rules" className="min-w-[108px] gap-1.5">
            <Hash className="size-4" />
            编码规则
          </TabsTrigger>
          <TabsTrigger value="employee-group-catalog" className="min-w-[132px] gap-1.5">
            <Tag className="size-4" />
            父子值配置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dict" className="mt-0 w-full outline-none">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="grid gap-0 lg:grid-cols-[minmax(280px,340px)_1fr]">
              {/* 字典类型 */}
              <div className="flex h-[min(72dvh,760px)] min-h-[520px] flex-col border-b lg:border-b-0 lg:border-r">
                <div className="shrink-0 flex items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">字典类型</div>
                    <div className="text-xs text-muted-foreground">
                      {dictTypesState.type === "ok" ? `共 ${dictTypeTotal} 项 · 选择类型后编辑字典项` : "选择类型后编辑字典项"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDictImportOpen(true)}
                    >
                      <Upload />
                      批量导入
                    </Button>
                    <Button size="sm" onClick={() => setDictSheet({ type: "type-new" })}>
                      <Plus />
                      新建
                    </Button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    <InputGroup>
                      <InputGroupAddon>
                        <Search />
                      </InputGroupAddon>
                      <InputGroupInput
                        value={dictKeyword}
                        onChange={(e) => {
                          setDictPage(1);
                          setDictKeyword(e.target.value);
                        }}
                        placeholder="搜索 code / 名称"
                      />
                    </InputGroup>

                    {dictTypesState.type === "loading" ? (
                      <PanelLoading message="正在加载字典类型…" />
                    ) : null}

                    {dictTypesState.type === "error" ? (
                      <PanelError error={dictTypesState.error} onRetry={loadDictTypes} />
                    ) : null}

                    {dictTypesState.type === "ok" && dictTypes.length === 0 ? (
                      <PanelEmpty
                        title="暂无字典类型"
                        description="创建第一个字典类型，例如员工状态、合同类型等。"
                        action={
                          <Button size="sm" onClick={() => setDictSheet({ type: "type-new" })}>
                            <Plus />
                            新建类型
                          </Button>
                        }
                      />
                    ) : null}

                    {dictTypesState.type === "ok" && dictTypes.length > 0 ? (
                      <div className="space-y-1.5">
                        {dictTypes.map((t) => {
                          const active = selectedTypeCode === t.code;
                          return (
                            <div
                              key={t.id}
                              className={cn(
                                "flex items-stretch overflow-hidden rounded-lg border transition-colors",
                                active
                                  ? "border-primary/40 bg-primary/[0.06] shadow-sm"
                                  : "border-transparent hover:border-border hover:bg-accent/50",
                              )}
                            >
                              <button
                                type="button"
                                className="min-w-0 flex-1 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                onClick={() => setSelectedTypeCode(t.code)}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-sm font-medium text-foreground">
                                    {t.name}
                                  </span>
                                  <StatusBadge status={t.status} />
                                </div>
                                <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                                  {t.code}
                                </div>
                                {t.description ? (
                                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                    {t.description}
                                  </div>
                                ) : null}
                              </button>
                              <div className="flex shrink-0 items-center border-l border-border/60 px-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`编辑 ${t.name}`}
                                  onClick={() => setDictSheet({ type: "type-edit", item: t })}
                                >
                                  <Pencil />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>

                {dictTypesState.type === "ok" && dictTypes.length > 0 ? (
                  <div className="shrink-0">
                    <PaginationBar
                      page={dictPage}
                      pageSize={dictPageSize}
                      total={dictTypeTotal}
                      itemCount={dictTypes.length}
                      onPrev={() => setDictPage((p) => Math.max(1, p - 1))}
                      onNext={() => setDictPage((p) => p + 1)}
                    />
                  </div>
                ) : null}
              </div>

              {/* 字典项 */}
              <div className="flex h-[min(72dvh,760px)] min-h-[520px] min-w-0 flex-col">
                <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {selectedType ? selectedType.name : "字典项"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {selectedTypeCode ? (
                        <>
                          类型编码 <span className="font-mono">{selectedTypeCode}</span>
                          {dictItemsState.type === "ok" ? ` · ${dictItems.length} 项` : ""}
                        </>
                      ) : (
                        "请先在左侧选择字典类型"
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!selectedTypeCode}
                      onClick={() => void loadDictItems(selectedTypeCode)}
                    >
                      <RefreshCw />
                      刷新
                    </Button>
                    <Button
                      size="sm"
                      disabled={!selectedTypeCode}
                      onClick={() =>
                        setDictSheet({ type: "item-new", typeCode: selectedTypeCode })
                      }
                    >
                      <Plus />
                      新建项
                    </Button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                  {!selectedTypeCode ? (
                    <PanelEmpty
                      title="未选择字典类型"
                      description="从左侧列表选择一个字典类型，即可查看和维护对应的字典项。"
                    />
                  ) : null}

                  {selectedTypeCode && dictItemsState.type === "loading" ? (
                    <PanelLoading message="正在加载字典项…" />
                  ) : null}

                  {selectedTypeCode && dictItemsState.type === "error" ? (
                    <PanelError
                      error={dictItemsState.error}
                      onRetry={() => void loadDictItems(selectedTypeCode)}
                    />
                  ) : null}

                  {selectedTypeCode && dictItemsState.type === "ok" && dictItems.length === 0 ? (
                    <PanelEmpty
                      title="暂无字典项"
                      description="为该类型添加选项值，例如在职、离职等。"
                      action={
                        <Button
                          size="sm"
                          onClick={() =>
                            setDictSheet({ type: "item-new", typeCode: selectedTypeCode })
                          }
                        >
                          <Plus />
                          新建字典项
                        </Button>
                      }
                    />
                  ) : null}

                  {selectedTypeCode && dictItemsState.type === "ok" && dictItems.length > 0 ? (
                    <DataTable className="min-h-0">
                      <thead className="sticky top-0 z-10 bg-muted/95 shadow-sm backdrop-blur-sm">
                        <tr className="border-b bg-muted/40">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                            显示名
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                            值
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                            排序
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                            状态
                          </th>
                          <th className="w-16 px-4 py-2.5 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dictItems.map((it) => (
                          <tr
                            key={it.id}
                            className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">{it.label}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                              {it.value}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{it.sort ?? 0}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={it.status} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`编辑 ${it.label}`}
                                onClick={() => setDictSheet({ type: "item-edit", item: it })}
                              >
                                <Pencil />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="code-rules" className="mt-0 w-full outline-none">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-foreground">编码规则</div>
                <div className="text-xs text-muted-foreground">
                  支持 {"{yyyy}"} {"{MM}"} {"{dd}"} {"{seq}"} 占位符
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <InputGroup className="w-full sm:w-64">
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    value={ruleKeyword}
                    onChange={(e) => {
                      setRulePage(1);
                      setRuleKeyword(e.target.value);
                    }}
                    placeholder="搜索 code / 名称"
                  />
                </InputGroup>
                <Button variant="outline" size="sm" onClick={loadCodeRules}>
                  <RefreshCw />
                  刷新
                </Button>
                <Button size="sm" onClick={() => setCodeRuleSheet({ type: "new" })}>
                  <Plus />
                  新建规则
                </Button>
              </div>
            </div>

            {codeRulesState.type === "loading" ? (
              <PanelLoading message="正在加载编码规则…" />
            ) : null}

            {codeRulesState.type === "error" ? (
              <PanelError error={codeRulesState.error} onRetry={loadCodeRules} />
            ) : null}

            {codeRulesState.type === "ok" && codeRules.length === 0 ? (
              <PanelEmpty
                title="暂无编码规则"
                description="创建工号、组织编码等自动生成规则，支持按天/月/年重置序号。"
                action={
                  <Button size="sm" onClick={() => setCodeRuleSheet({ type: "new" })}>
                    <Plus />
                    新建规则
                  </Button>
                }
              />
            ) : null}

            {codeRulesState.type === "ok" && codeRules.length > 0 ? (
              <>
                <DataTable>
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                        规则名称
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                        编码
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                        Pattern
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                        序号重置
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                        长度
                      </th>
                      <th className="w-36 px-4 py-2.5 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {codeRules.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.code}
                        </td>
                        <td className="max-w-[240px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.pattern}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {RESET_LABEL[r.seqReset] ?? r.seqReset}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.seqLength}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await generateCode({ ruleCode: r.code });
                                  setGeneratedCode(res.data.code);
                                  toast.success(`生成成功：${res.data.code}`);
                                } catch (e: unknown) {
                                  const err: ApiError =
                                    typeof (e as { message?: string; traceId?: string })
                                      ?.message === "string"
                                      ? {
                                          message: (e as { message: string }).message,
                                          traceId: (e as { traceId?: string }).traceId,
                                        }
                                      : { message: "生成失败，请重试" };
                                  toast.error(
                                    err.traceId
                                      ? `${err.message}（traceId: ${err.traceId}）`
                                      : err.message,
                                  );
                                }
                              }}
                            >
                              <Sparkles />
                              试生成
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`编辑 ${r.name}`}
                              onClick={() => setCodeRuleSheet({ type: "edit", item: r })}
                            >
                              <Pencil />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>

                {generatedCode ? (
                  <div className="border-t bg-primary/5 px-4 py-2.5 text-sm text-foreground">
                    最近生成：
                    <span className="ml-1.5 font-mono font-medium text-primary">
                      {generatedCode}
                    </span>
                  </div>
                ) : null}

                <PaginationBar
                  page={rulePage}
                  pageSize={rulePageSize}
                  total={codeRuleTotal}
                  itemCount={codeRules.length}
                  onPrev={() => setRulePage((p) => Math.max(1, p - 1))}
                  onNext={() => setRulePage((p) => p + 1)}
                />
              </>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="employee-group-catalog" className="mt-0 w-full outline-none">
          <ParentChildCatalogPanel />
        </TabsContent>
      </Tabs>

      <ExcelBatchImportDialog
        open={dictImportOpen}
        onOpenChange={setDictImportOpen}
        elevated
        title="批量导入字典"
        businessKeyHint="已存在的「类型编码 + 字典值」将更新显示名、排序与状态。"
        fillHints={[
          { text: "必填：类型编码、类型名称、字典值、显示名" },
          { text: "业务键：同类型编码 + 字典值 → 更新；否则新建类型/字典项" },
          { text: "状态：填写「启用 / 停用」；排序为数字" },
        ]}
        fillSubHint="类型不存在时会自动创建；请按模板「说明」工作表填写"
        templateSheetHint="含「字典数据」表与「说明」工作表"
        templateFilename="dict-import-template.xlsx"
        errorReportFilename="dict-import-errors.xlsx"
        onDownloadTemplate={async () => {
          try {
            return await downloadDictImportTemplate();
          } catch (e: unknown) {
            const msg =
              typeof (e as { message?: string })?.message === "string"
                ? (e as ApiError).message
                : "下载模板失败";
            throw new Error(msg);
          }
        }}
        onImport={async (file) => {
          try {
            const res = await importDict(file);
            return res.data;
          } catch (e: unknown) {
            const err: ApiError =
              typeof (e as { message?: string })?.message === "string"
                ? { message: (e as ApiError).message, traceId: (e as ApiError).traceId }
                : { message: "导入失败，请重试" };
            throw new Error(
              err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message,
            );
          }
        }}
        onDownloadErrorReport={async (result) => {
          try {
            return await downloadDictImportErrorReport({ errors: result.errors });
          } catch (e: unknown) {
            const msg =
              typeof (e as { message?: string })?.message === "string"
                ? (e as ApiError).message
                : "下载错误报告失败";
            throw new Error(msg);
          }
        }}
        onImported={async () => {
          await loadDictTypes();
          if (selectedTypeCode) await loadDictItems(selectedTypeCode);
        }}
      />

      <DictSheet
        mode={dictSheet}
        onClose={() => setDictSheet({ type: "closed" })}
        onSaved={async (typeCodeToRefresh?: string) => {
          await loadDictTypes();
          if (typeCodeToRefresh) {
            setSelectedTypeCode(typeCodeToRefresh);
            await loadDictItems(typeCodeToRefresh);
          } else if (selectedTypeCode) {
            await loadDictItems(selectedTypeCode);
          }
        }}
      />

      <CodeRuleSheet
        mode={codeRuleSheet}
        onClose={() => setCodeRuleSheet({ type: "closed" })}
        onSaved={async () => {
          await loadCodeRules();
        }}
      />
    </div>
  );
}

function DictSheet(props: {
  mode: DictSheetMode;
  onClose: () => void;
  onSaved: (typeCodeToRefresh?: string) => Promise<void>;
}) {
  const open = props.mode.type !== "closed";

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (props.mode.type === "type-new") {
      setForm({ code: "", name: "", description: "", status: "ACTIVE", sort: "0" });
      return;
    }
    if (props.mode.type === "type-edit") {
      setForm({
        code: props.mode.item.code,
        name: props.mode.item.name,
        description: props.mode.item.description || "",
        status: props.mode.item.status,
        sort: String(props.mode.item.sort ?? 0),
      });
      return;
    }
    if (props.mode.type === "item-new") {
      setForm({ typeCode: props.mode.typeCode, value: "", label: "", status: "ACTIVE", sort: "0", extJson: "" });
      return;
    }
    if (props.mode.type === "item-edit") {
      setForm({
        typeCode: props.mode.item.typeCode,
        value: props.mode.item.value,
        label: props.mode.item.label,
        status: props.mode.item.status,
        sort: String(props.mode.item.sort ?? 0),
        extJson: props.mode.item.extJson ? JSON.stringify(props.mode.item.extJson, null, 2) : "",
      });
    }
  }, [open, props.mode]);

  async function onSave() {
    try {
      setSaving(true);
      if (props.mode.type === "type-new") {
        if (!form.code?.trim()) throw new Error("code 不能为空");
        if (!form.name?.trim()) throw new Error("name 不能为空");
        await createDictType({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description?.trim() || undefined,
          status: (form.status?.trim() as any) || "ACTIVE",
          sort: Number.isFinite(Number(form.sort)) ? Number(form.sort) : 0,
        });
        toast.success("创建成功");
        await props.onSaved();
        props.onClose();
        return;
      }
      if (props.mode.type === "type-edit") {
        await updateDictType(props.mode.item.id, {
          name: form.name?.trim() || undefined,
          description: form.description?.trim() || undefined,
          status: (form.status?.trim() as any) || undefined,
          sort: Number.isFinite(Number(form.sort)) ? Number(form.sort) : undefined,
        });
        toast.success("保存成功");
        await props.onSaved(props.mode.item.code);
        props.onClose();
        return;
      }
      if (props.mode.type === "item-new") {
        if (!form.typeCode?.trim()) throw new Error("typeCode 不能为空");
        if (!form.value?.trim()) throw new Error("value 不能为空");
        if (!form.label?.trim()) throw new Error("label 不能为空");
        const extJson =
          form.extJson?.trim()
            ? (JSON.parse(form.extJson) as Record<string, unknown>)
            : undefined;
        await createDictItem({
          typeCode: form.typeCode.trim(),
          value: form.value.trim(),
          label: form.label.trim(),
          status: (form.status?.trim() as any) || "ACTIVE",
          sort: Number.isFinite(Number(form.sort)) ? Number(form.sort) : 0,
          extJson,
        });
        toast.success("创建成功");
        await props.onSaved(form.typeCode.trim());
        props.onClose();
        return;
      }
      if (props.mode.type === "item-edit") {
        const extJson =
          form.extJson?.trim()
            ? (JSON.parse(form.extJson) as Record<string, unknown>)
            : undefined;
        await updateDictItem(props.mode.item.id, {
          value: form.value?.trim() || undefined,
          label: form.label?.trim() || undefined,
          status: (form.status?.trim() as any) || undefined,
          sort: Number.isFinite(Number(form.sort)) ? Number(form.sort) : undefined,
          extJson,
        });
        toast.success("保存成功");
        await props.onSaved(props.mode.item.typeCode);
        props.onClose();
        return;
      }
    } catch (e: unknown) {
      const msg = typeof (e as any)?.message === "string" ? (e as any).message : "操作失败，请重试";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    try {
      setSaving(true);
      if (props.mode.type === "type-edit") {
        await deleteDictType(props.mode.item.id);
        toast.success("删除成功");
        await props.onSaved();
        props.onClose();
        return;
      }
      if (props.mode.type === "item-edit") {
        await deleteDictItem(props.mode.item.id);
        toast.success("删除成功");
        await props.onSaved(props.mode.item.typeCode);
        props.onClose();
      }
    } catch (e: unknown) {
      const msg = typeof (e as any)?.message === "string" ? (e as any).message : "删除失败，请重试";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const title =
    props.mode.type === "type-new"
      ? "新建字典类型"
      : props.mode.type === "type-edit"
        ? "编辑字典类型"
        : props.mode.type === "item-new"
          ? "新建字典项"
          : props.mode.type === "item-edit"
            ? "编辑字典项"
            : "";

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? props.onClose() : null)}>
      <SheetContent className="gap-0 p-0">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>保存后将立即生效（字典项会刷新内存缓存）。</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {props.mode.type === "type-new" || props.mode.type === "type-edit" ? (
            <>
              <FormField label="code" required>
                <Input
                  value={form.code || ""}
                  disabled={props.mode.type === "type-edit"}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="例如 EMPLOYEE_STATUS"
                />
              </FormField>
              <FormField label="name" required>
                <Input
                  value={form.name || ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例如 员工状态"
                />
              </FormField>
              <FormField label="description">
                <Textarea
                  value={form.description || ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="可选"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="status">
                  <OptionToggle
                    options={STATUS_OPTIONS}
                    value={(form.status as "ACTIVE" | "DISABLED") || "ACTIVE"}
                    onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  />
                </FormField>
                <FormField label="sort">
                  <Input
                    value={form.sort || "0"}
                    onChange={(e) => setForm((f) => ({ ...f, sort: e.target.value }))}
                    placeholder="0"
                  />
                </FormField>
              </div>
            </>
          ) : null}

          {props.mode.type === "item-new" || props.mode.type === "item-edit" ? (
            <>
              <FormField label="typeCode" required>
                <Input value={form.typeCode || ""} disabled />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="value" required>
                  <Input
                    value={form.value || ""}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    placeholder="例如 ACTIVE"
                  />
                </FormField>
                <FormField label="label" required>
                  <Input
                    value={form.label || ""}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="例如 在职"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="status">
                  <OptionToggle
                    options={STATUS_OPTIONS}
                    value={(form.status as "ACTIVE" | "DISABLED") || "ACTIVE"}
                    onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  />
                </FormField>
                <FormField label="sort">
                  <Input
                    value={form.sort || "0"}
                    onChange={(e) => setForm((f) => ({ ...f, sort: e.target.value }))}
                    placeholder="0"
                  />
                </FormField>
              </div>
              <FormField label="extJson（JSON，可选）">
                <Textarea
                  value={form.extJson || ""}
                  onChange={(e) => setForm((f) => ({ ...f, extJson: e.target.value }))}
                  placeholder='{ "color": "green" }'
                />
              </FormField>
            </>
          ) : null}
        </div>

        <SheetFooter>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {props.mode.type === "type-edit" || props.mode.type === "item-edit" ? (
              <Button variant="destructive" disabled={saving} onClick={onDelete}>
                停用
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" disabled={saving} onClick={props.onClose}>
                取消
              </Button>
              <Button disabled={saving} onClick={onSave}>
                保存
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function CodeRuleSheet(props: { mode: CodeRuleSheetMode; onClose: () => void; onSaved: () => Promise<void> }) {
  const open = props.mode.type !== "closed";
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (props.mode.type === "new") {
      setForm({
        code: "",
        name: "",
        pattern: "EMP-{yyyy}{MM}{dd}-{seq}",
        seqReset: "DAY",
        seqStart: "1",
        seqLength: "4",
      });
      return;
    }
    if (props.mode.type === "edit") {
      setForm({
        code: props.mode.item.code,
        name: props.mode.item.name,
        pattern: props.mode.item.pattern,
        seqReset: props.mode.item.seqReset,
        seqStart: String(props.mode.item.seqStart ?? 1),
        seqLength: String(props.mode.item.seqLength ?? 4),
      });
    }
  }, [open, props.mode]);

  async function onSave() {
    try {
      setSaving(true);
      const seqStart = Number(form.seqStart);
      const seqLength = Number(form.seqLength);
      const seqReset = (form.seqReset?.trim() as CodeRuleSeqReset) || "NEVER";
      if (props.mode.type === "new") {
        if (!form.code?.trim()) throw new Error("code 不能为空");
        if (!form.name?.trim()) throw new Error("name 不能为空");
        if (!form.pattern?.trim()) throw new Error("pattern 不能为空");
        await createCodeRule({
          code: form.code.trim(),
          name: form.name.trim(),
          pattern: form.pattern.trim(),
          seqReset,
          seqStart: Number.isFinite(seqStart) ? seqStart : 1,
          seqLength: Number.isFinite(seqLength) ? seqLength : 4,
        });
        toast.success("创建成功");
        await props.onSaved();
        props.onClose();
        return;
      }
      if (props.mode.type === "edit") {
        await updateCodeRule(props.mode.item.id, {
          name: form.name?.trim() || undefined,
          pattern: form.pattern?.trim() || undefined,
          seqReset,
          seqStart: Number.isFinite(seqStart) ? seqStart : undefined,
          seqLength: Number.isFinite(seqLength) ? seqLength : undefined,
        });
        toast.success("保存成功");
        await props.onSaved();
        props.onClose();
      }
    } catch (e: unknown) {
      const msg = typeof (e as any)?.message === "string" ? (e as any).message : "操作失败，请重试";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (props.mode.type !== "edit") return;
    try {
      setSaving(true);
      await deleteCodeRule(props.mode.item.id);
      toast.success("删除成功");
      await props.onSaved();
      props.onClose();
    } catch (e: unknown) {
      const msg = typeof (e as any)?.message === "string" ? (e as any).message : "删除失败，请重试";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const title = props.mode.type === "new" ? "新建编码规则" : props.mode.type === "edit" ? "编辑编码规则" : "";

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? props.onClose() : null)}>
      <SheetContent className="gap-0 p-0">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            pattern 支持占位符：{"{yyyy}"} {"{yy}"} {"{MM}"} {"{dd}"} {"{seq}"}。工号示例：{"{yy}{MM}{seq}"} → 25060031。
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <FormField label="code" required>
            <Input
              value={form.code || ""}
              disabled={props.mode.type === "edit"}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="例如 EMPLOYEE_NO"
            />
          </FormField>
          <FormField label="name" required>
            <Input
              value={form.name || ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="例如 工号"
            />
          </FormField>
          <FormField label="pattern" required>
            <Input
              value={form.pattern || ""}
              onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))}
              placeholder="例如 EMP-{yyyy}{MM}{dd}-{seq}"
            />
          </FormField>
          <FormField label="seqReset" required>
            <OptionToggle
              options={RESET_OPTIONS}
              value={(form.seqReset as CodeRuleSeqReset) || "NEVER"}
              onChange={(v) => setForm((f) => ({ ...f, seqReset: v }))}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="seqStart">
              <Input
                value={form.seqStart || "1"}
                onChange={(e) => setForm((f) => ({ ...f, seqStart: e.target.value }))}
                placeholder="1"
              />
            </FormField>
            <FormField label="seqLength">
              <Input
                value={form.seqLength || "4"}
                onChange={(e) => setForm((f) => ({ ...f, seqLength: e.target.value }))}
                placeholder="4"
              />
            </FormField>
          </div>
        </div>

        <SheetFooter>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {props.mode.type === "edit" ? (
              <Button variant="destructive" disabled={saving} onClick={onDelete}>
                停用
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" disabled={saving} onClick={props.onClose}>
                取消
              </Button>
              <Button disabled={saving} onClick={onSave}>
                保存
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

