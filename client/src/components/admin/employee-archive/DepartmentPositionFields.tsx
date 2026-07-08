import type { OrganizationTreeNode } from "@shared/api.interface";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import { listPositions } from "@/api/organization";
import { FormField } from "@/components/admin/form-field";
import { SearchableDialogPicker } from "@/components/admin/searchable-dialog-picker";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/admin/searchable-select";
import { adminFormControlShellClassName } from "@/components/admin/form-control-styles";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type DepartmentPositionFieldsProps = {
  organizationId: string;
  positionId: string;
  jobSequence?: string;
  /** 用于“部门”下拉的可选列表（已过滤为可分配部门） */
  departments: OrganizationTreeNode[];
  /** 用于计算“组织路径”的完整组织列表（包含根节点） */
  organizationsForPath: OrganizationTreeNode[];
  onOrganizationChange: (organizationId: string, positionId: string) => void;
  onPositionChange: (positionId: string) => void;
  organizationRequired?: boolean;
  positionRequired?: boolean;
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

function toDepartmentOptions(departments: OrganizationTreeNode[]): SearchableSelectOption[] {
  return departments.map((org) => ({
    value: org.id,
    label: org.name,
    code: org.code,
    keywords: [org.code, org.name, org.departmentTypeLabel, org.departmentLevelLabel]
      .filter(Boolean)
      .join(" "),
  }));
}

function toPositionOptions(
  positions: Array<{ id: string; code: string; name: string }>,
): SearchableSelectOption[] {
  return positions.map((position) => ({
    value: position.id,
    label: position.name,
    code: position.code,
    keywords: `${position.code} ${position.name}`,
  }));
}

function buildOrgPathName(
  orgId: string,
  nodes: OrganizationTreeNode[],
): string {
  if (!orgId) return "";
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byCode = new Map(nodes.map((n) => [n.code, n]));
  const start = byId.get(orgId);
  if (!start) return "";

  const names: string[] = [];
  const visitedCodes = new Set<string>();
  let cur: OrganizationTreeNode | undefined = start;
  while (cur) {
    if (cur.code && visitedCodes.has(cur.code)) break;
    if (cur.code) visitedCodes.add(cur.code);
    names.push(cur.name);
    const parentCode = cur.parentCode;
    if (!parentCode) break;
    cur = byCode.get(parentCode);
  }
  return names.reverse().join("/");
}

function buildOrgPathSegments(orgId: string, nodes: OrganizationTreeNode[]): string[] {
  if (!orgId) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byCode = new Map(nodes.map((n) => [n.code, n]));
  const start = byId.get(orgId);
  if (!start) return [];

  const names: string[] = [];
  const visitedCodes = new Set<string>();
  let cur: OrganizationTreeNode | undefined = start;
  while (cur) {
    if (cur.code && visitedCodes.has(cur.code)) break;
    if (cur.code) visitedCodes.add(cur.code);
    names.push(cur.name);
    const parentCode = cur.parentCode;
    if (!parentCode) break;
    cur = byCode.get(parentCode);
  }
  return names.reverse();
}

export function DepartmentPositionFields({
  organizationId,
  positionId,
  jobSequence = "",
  departments,
  organizationsForPath,
  onOrganizationChange,
  onPositionChange,
  organizationRequired = false,
  positionRequired = false,
}: DepartmentPositionFieldsProps) {
  const [orgPositions, setOrgPositions] = useState<
    Array<{ id: string; code: string; name: string }>
  >([]);
  const [pinnedPosition, setPinnedPosition] = useState<{
    id: string;
    code: string;
    name: string;
  } | null>(null);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionKeyword, setPositionKeyword] = useState("");
  const debouncedPositionKeyword = useDebouncedValue(positionKeyword, 280);
  const positionIdRef = useRef(positionId);
  const orgChangedRef = useRef(false);
  positionIdRef.current = positionId;

  const departmentOptions = useMemo(() => toDepartmentOptions(departments), [departments]);
  const orgPathName = useMemo(
    () => buildOrgPathName(organizationId, organizationsForPath),
    [organizationId, organizationsForPath],
  );
  const orgPathSegments = useMemo(
    () => buildOrgPathSegments(organizationId, organizationsForPath),
    [organizationId, organizationsForPath],
  );
  const positionOptions = useMemo(() => {
    const list = [...orgPositions];
    if (pinnedPosition && !list.some((item) => item.id === pinnedPosition.id)) {
      list.unshift(pinnedPosition);
    }
    return toPositionOptions(list);
  }, [orgPositions, pinnedPosition]);

  useEffect(() => {
    if (!organizationId) {
      setOrgPositions([]);
      setPositionKeyword("");
      return;
    }

    let cancelled = false;
    setPositionsLoading(true);
    void listPositions({
      organizationId,
      keyword: debouncedPositionKeyword.trim() || undefined,
      page: 1,
      pageSize: 200,
    })
      .then((res) => {
        if (cancelled) return;
        const items = res.data.items;
        setOrgPositions(items);
        const currentPositionId = positionIdRef.current;
        const matched = currentPositionId
          ? items.find((item) => item.id === currentPositionId)
          : undefined;
        if (matched) {
          setPinnedPosition(matched);
        }
        if (items.length === 0) {
          if (currentPositionId) onPositionChange("");
          return;
        }
        const stillValid =
          currentPositionId && items.some((item) => item.id === currentPositionId);
        if (!stillValid && items.length > 0 && (orgChangedRef.current || !currentPositionId)) {
          onPositionChange(items[0].id);
        }
        orgChangedRef.current = false;
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setOrgPositions([]);
        const err = toApiError(e);
        toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
      })
      .finally(() => {
        if (!cancelled) setPositionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, debouncedPositionKeyword, onPositionChange]);

  const handleDepartmentChange = (value: string) => {
    orgChangedRef.current = true;
    setPositionKeyword("");
    onOrganizationChange(value, "");
  };

  const departmentDisabled = departmentOptions.length === 0;
  const positionDisabled = !organizationId;

  return (
    <>
      <div className="col-span-full grid gap-4 md:grid-cols-4">
        <div className="md:col-span-1">
          <FormField label="部门" required={organizationRequired}>
          <SearchableDialogPicker
            value={organizationId}
            onChange={handleDepartmentChange}
            options={departmentOptions}
            dialogTitle="选择部门"
            dialogDescription="支持按部门编码、名称、类型或层级搜索"
            placeholder={departmentDisabled ? "暂无部门数据" : "点击搜索选择部门"}
            entityEmptyTitle={departmentDisabled ? "暂无部门数据" : "点击搜索选择部门"}
            entityEmptyHint="在弹窗中搜索并选择任职部门"
            entitySelectedHint="已选择部门，点击可重新搜索"
            searchPlaceholder="搜索部门编码 / 名称…"
            entityIcon="building"
            disabled={departmentDisabled}
            helperText="none"
            className="w-full"
          />
          </FormField>
        </div>
        <div className="md:col-span-3">
          <FormField label="组织路径">
            <div className={adminFormControlShellClassName({ readOnly: true })}>
              {orgPathSegments.length ? (
                <div className="flex flex-wrap items-center gap-1">
                  {orgPathSegments.map((seg, idx) => (
                    <div key={`${seg}-${idx}`} className="flex items-center gap-1">
                      {idx > 0 ? <span className="text-muted-foreground/60">/</span> : null}
                      <Badge
                        variant={idx === orgPathSegments.length - 1 ? "default" : "secondary"}
                        className="h-5"
                      >
                        {seg}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">{orgPathName || "—"}</span>
              )}
            </div>
          </FormField>
        </div>
      </div>

      <div className="col-span-full grid gap-4 md:grid-cols-2">
        <FormField label="岗位" required={positionRequired}>
          <SearchableSelect
            value={positionId}
            onChange={(value) => {
              const picked = orgPositions.find((item) => item.id === value);
              if (picked) setPinnedPosition(picked);
              onPositionChange(value);
            }}
            options={positionOptions}
            variant="entity"
            entityIcon="briefcase"
            entityTone="form"
            placeholder={
              !organizationId
                ? "请先选择部门"
                : positionsLoading
                  ? "加载岗位中…"
                  : positionOptions.length === 0
                    ? "该部门暂无岗位"
                    : "请选择岗位"
            }
            entityEmptyTitle={
              !organizationId
                ? "请先选择部门"
                : positionsLoading
                  ? "加载岗位中…"
                  : positionOptions.length === 0
                    ? "该部门暂无岗位"
                    : "请选择岗位"
            }
            entityEmptyHint={
              organizationId
                ? "输入岗位编码或名称，支持远程搜索"
                : "选择部门后可搜索岗位"
            }
            entitySelectedHint="已选择岗位，点击可重新搜索"
            searchPlaceholder="搜索岗位编码 / 名称…"
            disabled={positionDisabled}
            loading={positionsLoading}
            shouldFilter={false}
            onSearchChange={setPositionKeyword}
            className="w-full"
          />
        </FormField>
        <FormField label="岗位序列">
          <Input value={jobSequence || "—"} disabled className="h-9" />
        </FormField>
      </div>
    </>
  );
}
