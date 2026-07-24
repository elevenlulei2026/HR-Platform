import type { ContractExpiringRecord, ContractChangeTargetKind } from "@shared/api.interface";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlarmClock, Inbox, RefreshCw, ScanSearch } from "lucide-react";

import type { ApiError } from "@/api/http";
import {
  CONTRACT_CHANGE_TARGET_OPTIONS,
  contractChangeTargetKindLabel,
  listExpiringContractRecords,
  scanContractExpiryReminders,
} from "@/api/contract-change";
import type { ContractChangeBootstrap } from "@/components/admin/contract-change/ContractChangePanel";
import { OptionSelect } from "@/components/admin/option-select";
import {
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  PaginationBar,
  SearchInput,
} from "@/components/admin/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; items: ContractExpiringRecord[]; total: number };

type Props = {
  canEdit: boolean;
  onStartRenewal: (bootstrap: ContractChangeBootstrap) => void;
};

export function ContractExpiringPanel({ canEdit, onStartRenewal }: Props) {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [targetKind, setTargetKind] = useState<ContractChangeTargetKind | "">("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [state, setState] = useState<LoadState>({ type: "loading" });
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await listExpiringContractRecords({
        page,
        pageSize,
        days: 30,
        keyword: debouncedKeyword.trim() || undefined,
        targetKind: targetKind || undefined,
      });
      setState({ type: "ok", items: res.data.items, total: res.data.total });
    } catch (e: unknown) {
      setState({ type: "error", error: e as ApiError });
    }
  }, [page, pageSize, debouncedKeyword, targetKind]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await scanContractExpiryReminders();
      toast.success(
        `已扫描 ${res.data.scanned} 条，新生成 ${res.data.created} 份续签草稿`,
      );
      await load();
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setScanning(false);
    }
  };

  const items = state.type === "ok" ? state.items : [];
  const total = state.type === "ok" ? state.total : 0;

  return (
    <PanelCard
      title="即将到期"
      toolbar={
        <>
          <SearchInput
            value={keyword}
            onChange={(v) => {
              setKeyword(v);
              setPage(1);
            }}
            placeholder="工号 / 姓名 / 编号"
          />
          <OptionSelect
            value={targetKind || "ALL"}
            onValueChange={(v) => {
              setTargetKind(v === "ALL" ? "" : (v as ContractChangeTargetKind));
              setPage(1);
            }}
            placeholder="类型"
            className="w-[140px]"
            options={[
              { value: "ALL", label: "全部类型" },
              ...CONTRACT_CHANGE_TARGET_OPTIONS.map((o) => ({
                value: o.id,
                label: o.label,
              })),
            ]}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" />
          </Button>
          {canEdit ? (
            <Button type="button" size="sm" disabled={scanning} onClick={() => void handleScan()}>
              <ScanSearch className="size-4" />
              {scanning ? "扫描中…" : "生成提醒"}
            </Button>
          ) : null}
        </>
      }
    >
      {state.type === "loading" ? <PanelLoading message="加载即将到期档案…" /> : null}
      {state.type === "error" ? (
        <PanelError error={state.error} onRetry={() => void load()} />
      ) : null}
      {state.type === "ok" && items.length === 0 ? (
        <PanelEmpty
          icon={<Inbox className="size-5 text-muted-foreground" />}
          title="近 30 天无到期档案"
          description="可点击「生成续签提醒」扫描并创建草稿续签单。"
        />
      ) : null}
      {state.type === "ok" && items.length > 0 ? (
        <>
          <div className="divide-y">
            {items.map((item) => (
              <div
                key={`${item.targetKind}-${item.recordId}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{item.employeeName || "—"}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "font-normal",
                        item.daysRemaining <= 7
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                      )}
                    >
                      <AlarmClock className="mr-1 size-3" />
                      剩余 {item.daysRemaining} 天
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      {contractChangeTargetKindLabel(item.targetKind)}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {item.code || `#${item.recordId}`}
                    {item.employeeNo ? ` · ${item.employeeNo}` : ""} · 到期 {item.endDate}
                    {item.openRequestNo ? ` · 已有单据 ${item.openRequestNo}` : ""}
                  </div>
                </div>
                {canEdit ? (
                  item.openRequestId ? (
                    <Badge variant="secondary" className="shrink-0 font-normal">
                      进行中
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onStartRenewal({
                          employeeId: item.employeeId,
                          employeeLabel: `${item.employeeName || ""}（${item.employeeNo || ""}）`,
                          targetKind: item.targetKind,
                          sourceRecordId: item.recordId,
                          sourceEndDate: item.endDate,
                          code: item.code,
                        })
                      }
                    >
                      发起续签
                    </Button>
                  )
                ) : null}
              </div>
            ))}
          </div>
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            itemCount={items.length}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      ) : null}
    </PanelCard>
  );
}
