import type { OrganizationTreeNode } from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

import { flattenOrgTree, getOrganizationTree } from "@/api/organization";
import type { ApiError } from "@/api/http";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { PanelEmpty, PanelError, PanelLoading } from "@/components/admin/page-shell";
import { toApiError, type LoadState } from "@/components/admin/rbac/rbac-shared";

type OrgScopePickerProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

function filterOrgTree(
  nodes: OrganizationTreeNode[],
  keyword: string,
): OrganizationTreeNode[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return nodes;
  const out: OrganizationTreeNode[] = [];
  for (const n of nodes) {
    const children = n.children?.length ? filterOrgTree(n.children, keyword) : [];
    const selfMatch =
      n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q);
    if (selfMatch || children.length > 0) {
      out.push({ ...n, children });
    }
  }
  return out;
}

function collectExpandCodes(nodes: OrganizationTreeNode[], keyword: string): Set<string> {
  const q = keyword.trim().toLowerCase();
  const codes = new Set<string>();
  if (!q) return codes;
  for (const n of nodes) {
    const childCodes = n.children?.length ? collectExpandCodes(n.children, keyword) : new Set<string>();
    const selfMatch =
      n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q);
    if (selfMatch || childCodes.size > 0) {
      codes.add(n.code);
      childCodes.forEach((c) => codes.add(c));
    }
  }
  return codes;
}

function OrgTreeNodeRow({
  node,
  depth,
  expanded,
  selected,
  disabled,
  onToggleExpand,
  onToggleSelect,
}: {
  node: OrganizationTreeNode;
  depth: number;
  expanded: Set<string>;
  selected: Set<string>;
  disabled?: boolean;
  onToggleExpand: (code: string) => void;
  onToggleSelect: (id: string) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expanded.has(node.code);
  const checked = selected.has(node.id);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-1 py-1 transition-colors hover:bg-accent/50",
          checked && "bg-primary/5",
        )}
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            onClick={() => onToggleExpand(node.code)}
          >
            {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        <button
          type="button"
          disabled={disabled}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onToggleSelect(node.id)}
        >
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded border",
              checked
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background",
            )}
          >
            {checked ? <span className="text-[10px] font-bold">✓</span> : null}
          </span>
          <span className="truncate text-sm text-foreground">{node.name}</span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{node.code}</span>
        </button>
      </div>
      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <OrgTreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selected={selected}
              disabled={disabled}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
            />
          ))
        : null}
    </div>
  );
}

export function OrgScopePicker({ value, onChange, disabled }: OrgScopePickerProps) {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword);
  const [state, setState] = useState<LoadState<OrganizationTreeNode[]>>({ type: "loading" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const selected = useMemo(() => new Set(value), [value]);

  const load = useCallback(async () => {
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await getOrganizationTree();
      const tree = res.data;
      setState({ type: "ok", data: tree });
      setExpanded((prev) => {
        if (prev.size > 0) return prev;
        return new Set(tree.slice(0, 2).map((n) => n.code));
      });
    } catch (e: unknown) {
      setState({ type: "error", error: toApiError(e) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredTree = useMemo(() => {
    if (state.type !== "ok") return [];
    return filterOrgTree(state.data, debouncedKeyword);
  }, [state, debouncedKeyword]);

  useEffect(() => {
    if (state.type !== "ok" || !debouncedKeyword.trim()) return;
    const codes = collectExpandCodes(state.data, debouncedKeyword);
    if (codes.size === 0) return;
    setExpanded((prev) => new Set([...prev, ...codes]));
  }, [debouncedKeyword, state]);

  const flat = useMemo(
    () => (state.type === "ok" ? flattenOrgTree(state.data) : []),
    [state],
  );

  const toggleExpand = useCallback((code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const toggleSelect = useCallback(
    (id: string) => {
      if (disabled) return;
      const next = new Set(value);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(Array.from(next));
    },
    [disabled, onChange, value],
  );

  const selectAllVisible = useCallback(() => {
    const ids = flat.filter((o) => o.code !== "ORG-ROOT").map((o) => o.id);
    onChange(Array.from(new Set([...value, ...ids])));
  }, [flat, onChange, value]);

  const clearAll = useCallback(() => onChange([]), [onChange]);

  if (state.type === "loading") {
    return <PanelLoading message="正在加载组织树…" />;
  }
  if (state.type === "error") {
    return <PanelError error={state.error as ApiError} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-[200px] flex-1">
          <InputGroupAddon>
            <Search className="size-4 opacity-60" />
          </InputGroupAddon>
          <InputGroupInput
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索组织名称或编码"
            disabled={disabled}
          />
        </InputGroup>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={selectAllVisible}>
          全选
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={clearAll}>
          清空
        </Button>
      </div>

      <div className="rounded-lg border bg-background">
        <div className="border-b bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          已选 {value.length} 个组织 · 勾选后该角色可访问对应组织及下级数据
        </div>
        <div className="max-h-[280px] overflow-auto p-2">
          {filteredTree.length === 0 ? (
            <PanelEmpty compact title="无匹配组织" description="请调整搜索关键词" />
          ) : (
            filteredTree.map((node) => (
              <OrgTreeNodeRow
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                selected={selected}
                disabled={disabled}
                onToggleExpand={toggleExpand}
                onToggleSelect={toggleSelect}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
