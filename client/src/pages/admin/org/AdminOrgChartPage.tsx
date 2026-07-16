import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type {
  Employee,
  EmployeeArchive,
  EmployeeFormOptions,
  EmployeeMovement,
  Organization,
  OrganizationEditMode,
  OrganizationFormOptions,
  OrganizationMembersOverview,
  OrganizationOverviewEmployee,
  OrganizationOverviewPosition,
  OrganizationTreeNode,
  OrganizationVersion,
} from "@shared/api.interface";
import dagre from "@dagrejs/dagre";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position as RfPosition,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  GripVertical,
  History,
  MapPin,
  Maximize2,
  Network,
  Pencil,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import type { ApiError } from "@/api/http";
import { getEmployeeArchive } from "@/api/employee-archive";
import {
  getEmployeeFormOptions,
  getEmployeeSnapshot,
  listEmployeeMovements,
} from "@/api/employee";
import {
  flattenOrgTree,
  getOrganization,
  getOrganizationFormOptions,
  getOrganizationMembersOverview,
  getOrganizationTree,
  getOrganizationVersions,
  updateOrganization,
} from "@/api/organization";
import { EmployeeArchiveDetailView } from "@/components/admin/employee-archive/EmployeeArchiveDetailView";
import { FormField, OptionToggle } from "@/components/admin/form-field";
import { PositionWorkbenchSheet } from "@/components/admin/org/PositionWorkbenchSheet";
import {
  NoPermissionCard,
  PageHeader,
  PanelCard,
  PanelEmpty,
  PanelError,
  PanelLoading,
  SearchInput,
} from "@/components/admin/page-shell";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { adminChipActive, adminChipIdle } from "@/components/admin/selection-styles";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useArchivePermission } from "@/hooks/useArchivePermission";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";

type LoadState =
  | { type: "loading" }
  | { type: "error"; error: ApiError }
  | { type: "ok"; tree: OrganizationTreeNode[] };

type ScopeMode = "DIRECT" | "SUBTREE";
type ChartMode = "browse" | "reparent";

type ReparentRequest = {
  source: OrganizationTreeNode;
  target: OrganizationTreeNode;
};

type OrgEditForm = {
  name: string;
  parentCode?: string;
  effectiveStartDate: string;
  status: "ACTIVE" | "INACTIVE";
  location: string;
  legalCompany: string;
  departmentType: string;
  departmentLevel: string;
  costCenter: string;
  financialCode: string;
  orgAttribute: string;
  orgFunction: string;
  orgTags: string;
  orgLeaderNo: string;
  supervisingLeaderNo: string;
  hrCoordinatorNo: string;
  hrbpNo: string;
  sscNo: string;
};

type OrgChartNodeData = {
  org: OrganizationTreeNode;
  selected: boolean;
  dropTarget: boolean;
  reparentMode: boolean;
  collapsedChildCount: number;
  onToggleExpand: (code: string) => void;
  onSelect: (org: OrganizationTreeNode) => void;
};

const EDIT_MODE_OPTIONS: Array<{ id: OrganizationEditMode; label: string }> = [
  { id: "NEW_VERSION", label: "新增生效版本" },
  { id: "CURRENT", label: "修改当前版本" },
];

const CHART_MODE_OPTIONS: Array<{ id: ChartMode; label: string }> = [
  { id: "browse", label: "浏览" },
  { id: "reparent", label: "调整结构" },
];

const NODE_WIDTH = 228;
const NODE_HEIGHT = 136;
const DEFAULT_EXPAND_DEPTH = 1;

/** 连线锚点：保留定位能力，视觉上完全隐藏，避免挡住展开按钮 */
const handleClassName =
  "!pointer-events-none !size-px !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function temporalHint(asOfDate: string): { label: string; variant: "default" | "secondary" | "outline" } {
  const today = todayStr();
  if (asOfDate < today) return { label: "历史快照", variant: "secondary" };
  if (asOfDate > today) return { label: "未来预览", variant: "outline" };
  return { label: "当前", variant: "default" };
}

function statusTone(status?: string) {
  return status === "ACTIVE"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : "border-muted-foreground/20 bg-muted text-muted-foreground";
}

function findOrgByCode(
  nodes: OrganizationTreeNode[],
  code: string,
): OrganizationTreeNode | null {
  for (const n of nodes) {
    if (n.code === code) return n;
    const found = findOrgByCode(n.children ?? [], code);
    if (found) return found;
  }
  return null;
}

/** targetCode 是否在 sourceCode 的子孙中（防止成环） */
function isDescendantOf(
  roots: OrganizationTreeNode[],
  sourceCode: string,
  targetCode: string,
): boolean {
  const source = findOrgByCode(roots, sourceCode);
  if (!source) return false;
  return Boolean(findOrgByCode(source.children ?? [], targetCode));
}

function parentLabel(org: OrganizationTreeNode): string {
  if (!org.parentCode?.trim()) return "（顶级）";
  if (org.parentName?.trim()) return `${org.parentName}（${org.parentCode}）`;
  return org.parentCode;
}

function filterOrgTree(nodes: OrganizationTreeNode[], keyword: string): OrganizationTreeNode[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return nodes;
  const walk = (list: OrganizationTreeNode[]): OrganizationTreeNode[] => {
    const out: OrganizationTreeNode[] = [];
    for (const n of list) {
      const children = walk(n.children ?? []);
      const hit =
        n.name.toLowerCase().includes(q) ||
        n.code.toLowerCase().includes(q) ||
        (n.orgLeaderName ?? "").toLowerCase().includes(q) ||
        (n.orgLeaderNo ?? "").toLowerCase().includes(q);
      if (hit || children.length > 0) {
        out.push({ ...n, children });
      }
    }
    return out;
  };
  return walk(nodes);
}

function collectExpandForSearch(nodes: OrganizationTreeNode[], keyword: string): Set<string> {
  const q = keyword.trim().toLowerCase();
  const codes = new Set<string>();
  if (!q) return codes;
  const walk = (list: OrganizationTreeNode[], ancestors: string[]): boolean => {
    let any = false;
    for (const n of list) {
      const hit =
        n.name.toLowerCase().includes(q) ||
        n.code.toLowerCase().includes(q) ||
        (n.orgLeaderName ?? "").toLowerCase().includes(q);
      const childHit = walk(n.children ?? [], [...ancestors, n.code]);
      if (hit || childHit) {
        for (const a of ancestors) codes.add(a);
        codes.add(n.code);
        any = true;
      }
    }
    return any;
  };
  walk(nodes, []);
  return codes;
}

function buildGraph(
  roots: OrganizationTreeNode[],
  expanded: Set<string>,
  selectedCode: string | null,
  reparentMode: boolean,
  onToggleExpand: (code: string) => void,
  onSelect: (org: OrganizationTreeNode) => void,
): { nodes: Node<OrgChartNodeData>[]; edges: Edge[] } {
  const nodes: Node<OrgChartNodeData>[] = [];
  const edges: Edge[] = [];

  const visit = (list: OrganizationTreeNode[], depth: number, parentCode?: string) => {
    for (const org of list) {
      const childCount = org.children?.length ?? 0;
      const autoExpand = depth < DEFAULT_EXPAND_DEPTH;
      const isExpanded = autoExpand || expanded.has(org.code);
      const collapsedChildCount = !isExpanded && childCount > 0 ? childCount : 0;

      nodes.push({
        id: org.code,
        type: "orgCard",
        position: { x: 0, y: 0 },
        draggable: reparentMode,
        data: {
          org,
          selected: selectedCode === org.code,
          dropTarget: false,
          reparentMode,
          collapsedChildCount,
          onToggleExpand,
          onSelect,
        },
        sourcePosition: RfPosition.Bottom,
        targetPosition: RfPosition.Top,
      });

      if (parentCode) {
        edges.push({
          id: `${parentCode}->${org.code}`,
          source: parentCode,
          target: org.code,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
        });
      }

      if (isExpanded && childCount > 0) {
        visit(org.children, depth + 1, org.code);
      }
    }
  };

  visit(roots, 0);
  return layoutWithDagre(nodes, edges);
}

function layoutWithDagre(
  nodes: Node<OrgChartNodeData>[],
  edges: Edge[],
): { nodes: Node<OrgChartNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 80, marginx: 24, marginy: 24 });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  const laidOut = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
  return { nodes: laidOut, edges };
}

function OrgChartCard({ data }: NodeProps<Node<OrgChartNodeData>>) {
  const { org, selected, dropTarget, reparentMode, collapsedChildCount, onToggleExpand, onSelect } =
    data;
  const leader =
    org.orgLeaderName?.trim() ||
    (org.orgLeaderNo?.trim() ? org.orgLeaderNo : "未指定");

  return (
    <div
      className={cn(
        "relative flex w-[228px] flex-col rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-[box-shadow,border-color,ring] duration-200",
        selected
          ? "border-primary ring-2 ring-primary/25 shadow-md"
          : "border-border/80 hover:border-primary/40 hover:shadow-md",
        dropTarget && "border-sky-500 ring-2 ring-sky-500/40 shadow-md",
        reparentMode && "cursor-grab active:cursor-grabbing",
        org.status !== "ACTIVE" && "opacity-75",
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (reparentMode) return;
        onSelect(org);
      }}
    >
      <Handle type="target" position={RfPosition.Top} className={handleClassName} />
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            {reparentMode ? <GripVertical className="size-3 shrink-0 opacity-60" /> : null}
            {org.departmentLevelLabel ?? org.departmentTypeLabel ?? "部门"}
          </div>
          <div className="truncate text-sm font-semibold text-foreground" title={org.name}>
            {org.name}
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">{org.code}</div>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-[10px]", statusTone(org.status))}>
          {org.statusLabel ?? org.status}
        </Badge>
      </div>
      <div className="space-y-1 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5 truncate">
          <UserRound className="size-3 shrink-0 opacity-70" />
          <span className="truncate">负责人 {leader}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <BriefcaseBusiness className="size-3 opacity-70" />
            岗位 {org.positionCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3 opacity-70" />
            在岗 {org.employeeCount ?? 0}
          </span>
        </div>
      </div>
      {collapsedChildCount > 0 ? (
        <button
          type="button"
          className="mt-2 flex h-7 w-full items-center justify-center gap-1 rounded-md border border-border/70 bg-muted/40 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(org.code);
          }}
        >
          <ChevronDown className="size-3.5 shrink-0" strokeWidth={2} />
          <span>展开 {collapsedChildCount} 个下级</span>
        </button>
      ) : null}
      <Handle type="source" position={RfPosition.Bottom} className={handleClassName} />
    </div>
  );
}

const nodeTypes = { orgCard: OrgChartCard };

function ChartCanvas({
  tree,
  search,
  selectedCode,
  reparentMode,
  layoutNonce,
  onSelect,
  onRequestReparent,
}: {
  tree: OrganizationTreeNode[];
  search: string;
  selectedCode: string | null;
  reparentMode: boolean;
  layoutNonce: number;
  onSelect: (org: OrganizationTreeNode | null) => void;
  onRequestReparent: (req: ReparentRequest) => void;
}) {
  const { fitView, getIntersectingNodes, getNode } = useReactFlow();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dropTargetCode, setDropTargetCode] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<OrgChartNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const filtered = useMemo(() => filterOrgTree(tree, search), [tree, search]);

  useEffect(() => {
    if (!search.trim()) return;
    const codes = collectExpandForSearch(tree, search);
    if (codes.size === 0) return;
    setExpanded((prev) => new Set([...prev, ...codes]));
  }, [search, tree]);

  const onToggleExpand = useCallback((code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  useEffect(() => {
    const graph = buildGraph(
      filtered,
      expanded,
      selectedCode,
      reparentMode,
      onToggleExpand,
      onSelect,
    );
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setDropTargetCode(null);
  }, [
    filtered,
    expanded,
    reparentMode,
    layoutNonce,
    onToggleExpand,
    onSelect,
    setNodes,
    setEdges,
    // selectedCode 不参与重建，避免点详情时重排
  ]);

  // 仅在整树刷新 / 结构保存后适应画布，展开与选中不改变缩放
  useEffect(() => {
    const t = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 280 });
    }, 50);
    return () => window.clearTimeout(t);
  }, [tree, layoutNonce, fitView]);

  // 选中高亮：只改 data.selected，不重排、不 fitView
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === selectedCode },
      })),
    );
  }, [selectedCode, setNodes]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, dropTarget: n.id === dropTargetCode },
      })),
    );
  }, [dropTargetCode, setNodes]);

  const expandAll = () => {
    const codes = new Set<string>();
    const walk = (list: OrganizationTreeNode[]) => {
      for (const n of list) {
        if ((n.children?.length ?? 0) > 0) codes.add(n.code);
        walk(n.children ?? []);
      }
    };
    walk(tree);
    setExpanded(codes);
  };

  const collapseDeep = () => setExpanded(new Set());

  const resolveDropTarget = useCallback(
    (dragged: Node) => {
      const hits = getIntersectingNodes(dragged).filter((n) => n.id !== dragged.id);
      if (hits.length === 0) return null;
      // 取面积重叠最「靠上」的节点作为投放目标
      return hits[hits.length - 1] ?? null;
    },
    [getIntersectingNodes],
  );

  const onNodeDrag: OnNodeDrag = useCallback(
    (_event, node) => {
      if (!reparentMode) return;
      const hit = resolveDropTarget(node);
      setDropTargetCode(hit?.id ?? null);
    },
    [reparentMode, resolveDropTarget],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      if (!reparentMode) return;
      const hit = resolveDropTarget(node);
      setDropTargetCode(null);

      const source = findOrgByCode(tree, node.id);
      if (!source) {
        // 强制重排回自动布局
        setNodes((prev) => [...prev]);
        return;
      }

      if (!hit) {
        toast.message("未放到目标部门上", { description: "请拖到新上级部门卡片上松手。" });
        // 触发 layoutNonce 由父级处理；此处本地重建
        const graph = buildGraph(
          filtered,
          expanded,
          selectedCode,
          reparentMode,
          onToggleExpand,
          onSelect,
        );
        setNodes(graph.nodes);
        setEdges(graph.edges);
        return;
      }

      if (hit.id === source.code) return;

      const currentParent = source.parentCode?.trim() || "";
      if (currentParent === hit.id) {
        toast.message("上级未变化");
        const graph = buildGraph(
          filtered,
          expanded,
          selectedCode,
          reparentMode,
          onToggleExpand,
          onSelect,
        );
        setNodes(graph.nodes);
        setEdges(graph.edges);
        return;
      }

      if (isDescendantOf(tree, source.code, hit.id)) {
        toast.error("不能挂到自己的下级部门下（会形成循环）");
        const graph = buildGraph(
          filtered,
          expanded,
          selectedCode,
          reparentMode,
          onToggleExpand,
          onSelect,
        );
        setNodes(graph.nodes);
        setEdges(graph.edges);
        return;
      }

      const targetNode = getNode(hit.id);
      const targetOrg =
        (targetNode?.data as OrgChartNodeData | undefined)?.org ?? findOrgByCode(tree, hit.id);
      if (!targetOrg) {
        toast.error("目标部门无效");
        return;
      }

      onRequestReparent({ source, target: targetOrg });
      // 确认前先恢复布局，避免卡片停在拖放位置
      const graph = buildGraph(
        filtered,
        expanded,
        selectedCode,
        reparentMode,
        onToggleExpand,
        onSelect,
      );
      setNodes(graph.nodes);
      setEdges(graph.edges);
    },
    [
      reparentMode,
      resolveDropTarget,
      tree,
      filtered,
      expanded,
      selectedCode,
      onToggleExpand,
      onSelect,
      onRequestReparent,
      getNode,
      setNodes,
      setEdges,
    ],
  );

  return (
    <div className="relative h-[min(72vh,720px)] min-h-[480px] w-full overflow-hidden rounded-lg border border-border/70 bg-muted/20">
      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 bg-background/90"
          onClick={() => void fitView({ padding: 0.2, duration: 280 })}
        >
          <Maximize2 className="size-3.5" />
          适应画布
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 bg-background/90" onClick={expandAll}>
          展开全部
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 bg-background/90" onClick={collapseDeep}>
          收起深层
        </Button>
      </div>
      {reparentMode ? (
        <div className="absolute right-3 top-3 z-10 max-w-[260px] rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-900 dark:text-sky-100">
          拖拽部门卡片到新上级上松手；保存时须选择生效模式。
        </div>
      ) : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.35}
        maxZoom={1.6}
        nodesDraggable={reparentMode}
        nodesConnectable={false}
        elementsSelectable
        onPaneClick={() => {
          if (!reparentMode) onSelect(null);
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={18} size={1} />
        <Controls showInteractive={false} className="!shadow-sm" />
        <MiniMap
          pannable
          zoomable
          className="!rounded-md !border !border-border/70 !bg-background/90"
          nodeColor={() => "hsl(var(--primary) / 0.35)"}
        />
      </ReactFlow>
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value?: string | null }) {
  const text = value?.trim() ? value : "—";
  return (
    <div className="min-w-0 rounded-lg border border-border/50 bg-background/80 px-3 py-2.5 shadow-[inset_0_1px_0_0_hsl(var(--border)/0.35)]">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-medium text-foreground" title={text}>
        {text}
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">{title}</p>
        <div className="h-px flex-1 bg-border/60" />
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function MetricTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 via-background to-background px-3.5 py-3">
      <div className="pointer-events-none absolute -right-3 -top-3 size-16 rounded-full bg-primary/[0.06]" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      </div>
      <div className="mt-2.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function initialsFromName(name?: string | null) {
  const t = name?.trim();
  if (!t) return "?";
  return t.slice(0, 1).toUpperCase();
}

function PersonTile({
  label,
  name,
  employeeNo,
}: {
  label: string;
  name?: string | null;
  employeeNo?: string | null;
}) {
  const display = name?.trim() || employeeNo?.trim();
  const empty = !display;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2.5",
        empty ? "border-dashed border-border/50 bg-muted/5" : "border-border/50 bg-background/80",
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          empty
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        {empty ? <UserRound className="size-3.5" /> : initialsFromName(name || employeeNo)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium text-foreground">
          {empty ? "未指定" : name?.trim() || employeeNo}
        </div>
        {name?.trim() && employeeNo?.trim() ? (
          <div className="truncate font-mono text-[10px] text-muted-foreground">{employeeNo}</div>
        ) : null}
      </div>
    </div>
  );
}

function DrillListRow({
  icon,
  title,
  subtitle,
  meta,
  badges,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  badges?: ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{title}</span>
            {badges}
          </div>
          {subtitle ? (
            <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{subtitle}</div>
          ) : null}
          {meta ? <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">{meta}</div> : null}
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </button>
    </li>
  );
}

function displayCodeName(code?: string | null, label?: string | null) {
  const c = code?.trim();
  const l = label?.trim();
  if (!c && !l) return undefined;
  if (l && c && l !== c) return `${c} — ${l}`;
  return l || c || undefined;
}

function displayParent(org: Organization) {
  if (!org.parentCode?.trim() && !org.parentName?.trim()) return "（顶级）";
  if (org.parentCode?.trim() && org.parentName?.trim()) {
    return `${org.parentCode} — ${org.parentName}`;
  }
  return org.parentName?.trim() || org.parentCode?.trim() || "（顶级）";
}

function displayOrgLeader(
  org: Organization,
  treeNode: OrganizationTreeNode | null,
): { name?: string; no?: string } {
  const no = org.orgLeaderNo?.trim() || undefined;
  const name =
    treeNode && org.id === treeNode.id ? treeNode.orgLeaderName?.trim() || undefined : undefined;
  return { name, no };
}

/** 与组织管理详情页 VersionTimeline 一致 */
function OrgVersionTimeline({
  versions,
  activeId,
  onSelect,
}: {
  versions: OrganizationVersion[];
  activeId?: string;
  onSelect: (version: OrganizationVersion) => void;
}) {
  if (versions.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
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
                "group/version flex min-w-[148px] shrink-0 flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition-shadow",
                isActive ? adminChipActive : adminChipIdle,
                isActive && "shadow-sm",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                  {v.effectiveStartDate}
                </span>
                <Badge
                  variant={
                    v.temporal === "present" ? "default" : v.temporal === "future" ? "outline" : "secondary"
                  }
                  className="h-4 px-1 text-[9px] font-normal"
                >
                  {v.temporalLabel}
                </Badge>
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {v.effectiveEndDate ? `至 ${v.effectiveEndDate}` : "至今"}
                {v.isOpen ? " · 开放" : ""}
              </div>
              <div className="truncate text-[11px] font-medium text-foreground/90">{v.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdminOrgChartPage() {
  const perm = usePermission();
  const canView = perm.has("organization:view");
  const canEdit = perm.has("organization:edit");
  const canViewPosition = perm.has("position:view");
  const canViewEmployee = perm.has("employee:roster:view");

  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 280);
  const [state, setState] = useState<LoadState>({ type: "loading" });
  const [selected, setSelected] = useState<OrganizationTreeNode | null>(null);
  const [scope, setScope] = useState<ScopeMode>("DIRECT");
  const [drillTab, setDrillTab] = useState("overview");
  const [drillFilter, setDrillFilter] = useState("");
  const debouncedDrillFilter = useDebouncedValue(drillFilter, 280);
  const [overview, setOverview] = useState<OrganizationMembersOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<ApiError | null>(null);

  const [chartMode, setChartMode] = useState<ChartMode>("browse");
  const [layoutNonce, setLayoutNonce] = useState(0);
  const [reparent, setReparent] = useState<ReparentRequest | null>(null);
  const [editMode, setEditMode] = useState<OrganizationEditMode>("NEW_VERSION");
  const [newEffectiveStart, setNewEffectiveStart] = useState(todayStr());
  const [savingReparent, setSavingReparent] = useState(false);

  const [orgDetail, setOrgDetail] = useState<Organization | null>(null);
  const [orgVersions, setOrgVersions] = useState<OrganizationVersion[]>([]);
  const [orgVersionsLoading, setOrgVersionsLoading] = useState(false);
  const [orgEditOpen, setOrgEditOpen] = useState(false);
  const [orgEditMode, setOrgEditMode] = useState<OrganizationEditMode>("CURRENT");
  const [orgForm, setOrgForm] = useState<OrgEditForm | null>(null);
  const [orgFormOptions, setOrgFormOptions] = useState<OrganizationFormOptions | null>(null);
  const [savingOrg, setSavingOrg] = useState(false);

  const [positionId, setPositionId] = useState<string | null>(null);
  const [positionSheetOpen, setPositionSheetOpen] = useState(false);

  const [employeeDetail, setEmployeeDetail] = useState<Employee | null>(null);
  const [employeeSheetOpen, setEmployeeSheetOpen] = useState(false);
  const [detailAsOfDate, setDetailAsOfDate] = useState(todayStr());
  const [archive, setArchive] = useState<EmployeeArchive | null>(null);
  const [movements, setMovements] = useState<EmployeeMovement[]>([]);
  const [archiveLoadState, setArchiveLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [archiveError, setArchiveError] = useState<ApiError | null>(null);
  const [employeeFormOptions, setEmployeeFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [revealSensitive, setRevealSensitive] = useState(false);
  const [orgsForArchive, setOrgsForArchive] = useState<OrganizationTreeNode[]>([]);

  const archivePerm = useArchivePermission();
  const canViewSensitive = archivePerm.canViewSensitive();
  const canEditEmployee = archivePerm.canEditRoster();

  const temporal = useMemo(() => temporalHint(asOfDate), [asOfDate]);
  const isViewingToday = asOfDate === todayStr();
  const flatCount = state.type === "ok" ? flattenOrgTree(state.tree).length : 0;
  const reparentMode = canEdit && chartMode === "reparent";
  const parentOrgOptions = useMemo(() => {
    if (state.type !== "ok") return [];
    return flattenOrgTree(state.tree)
      .filter((o) => o.code !== selected?.code)
      .map((o) => ({
        value: o.code,
        label: o.name,
        code: o.code,
        keywords: `${o.code} ${o.name}`,
      }));
  }, [state, selected?.code]);

  const filteredPositions = useMemo(() => {
    if (!overview) return [];
    const q = debouncedDrillFilter.trim().toLowerCase();
    if (!q) return overview.positions;
    return overview.positions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.organizationName ?? "").toLowerCase().includes(q) ||
        (p.positionLevelLabel ?? "").toLowerCase().includes(q),
    );
  }, [overview, debouncedDrillFilter]);

  const filteredEmployees = useMemo(() => {
    if (!overview) return [];
    const q = debouncedDrillFilter.trim().toLowerCase();
    if (!q) return overview.employees;
    return overview.employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeNo.toLowerCase().includes(q) ||
        (e.positionName ?? "").toLowerCase().includes(q) ||
        (e.organizationName ?? "").toLowerCase().includes(q),
    );
  }, [overview, debouncedDrillFilter]);

  const load = useCallback(async () => {
    if (!canView) return;
    try {
      setState((prev) => (prev.type === "ok" ? prev : { type: "loading" }));
      const res = await getOrganizationTree({ asOfDate });
      setState({ type: "ok", tree: res.data });
      setSelected((prev) => {
        if (!prev) return null;
        const flat = flattenOrgTree(res.data);
        return flat.find((o) => o.code === prev.code) ?? null;
      });
    } catch (e: unknown) {
      const err: ApiError =
        typeof (e as ApiError)?.message === "string"
          ? { message: (e as ApiError).message, traceId: (e as ApiError).traceId }
          : { message: "加载失败" };
      setState({ type: "error", error: err });
    }
  }, [asOfDate, canView]);

  useEffect(() => {
    if (!canView) return;
    void load();
  }, [canView, load]);

  useEffect(() => {
    if (!canEdit && chartMode === "reparent") setChartMode("browse");
  }, [canEdit, chartMode]);

  useEffect(() => {
    if (reparentMode) {
      setSelected(null);
      setOverview(null);
      setOverviewError(null);
    }
  }, [reparentMode]);

  useEffect(() => {
    setDrillFilter("");
    setDrillTab("overview");
    setScope("DIRECT");
  }, [selected?.code]);

  useEffect(() => {
    if (!selected || reparentMode) {
      if (!selected) {
        setOverview(null);
        setOverviewError(null);
        setOrgDetail(null);
        setOrgVersions([]);
      }
      return;
    }
    let cancelled = false;
    setOverviewLoading(true);
    setOverviewError(null);
    setOrgVersionsLoading(true);
    void getOrganization(selected.id)
      .then((res) => {
        if (!cancelled) setOrgDetail(res.data);
      })
      .catch(() => {
        if (!cancelled) setOrgDetail(selected);
      });
    void getOrganizationVersions(selected.code)
      .then((res) => {
        if (!cancelled) setOrgVersions(res.data);
      })
      .catch(() => {
        if (!cancelled) setOrgVersions([]);
      })
      .finally(() => {
        if (!cancelled) setOrgVersionsLoading(false);
      });
    void getOrganizationMembersOverview(selected.id, {
      asOfDate,
      includeSubtree: scope === "SUBTREE",
      limit: 100,
    })
      .then((res) => {
        if (!cancelled) setOverview(res.data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err: ApiError =
          typeof (e as ApiError)?.message === "string"
            ? { message: (e as ApiError).message, traceId: (e as ApiError).traceId }
            : { message: "加载部门明细失败" };
        setOverviewError(err);
        setOverview(null);
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, asOfDate, scope, reparentMode]);

  const formFromOrg = (org: Organization): OrgEditForm => ({
    name: org.name,
    parentCode: org.parentCode,
    effectiveStartDate: org.effectiveStartDate,
    status: org.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    location: org.location ?? "",
    legalCompany: org.legalCompany ?? "",
    departmentType: org.departmentType ?? "",
    departmentLevel: org.departmentLevel ?? "",
    costCenter: org.costCenter ?? "",
    financialCode: org.financialCode ?? "",
    orgAttribute: org.orgAttribute ?? "",
    orgFunction: org.orgFunction ?? "",
    orgTags: org.orgTags ?? "",
    orgLeaderNo: org.orgLeaderNo ?? "",
    supervisingLeaderNo: org.supervisingLeaderNo ?? "",
    hrCoordinatorNo: org.hrCoordinatorNo ?? "",
    hrbpNo: org.hrbpNo ?? "",
    sscNo: org.sscNo ?? "",
  });

  const openOrgEdit = async (mode: OrganizationEditMode = "CURRENT") => {
    if (!selected || !canEdit) return;
    try {
      const [orgRes, optsRes] = await Promise.all([
        getOrganization((orgDetail ?? selected).id),
        orgFormOptions
          ? Promise.resolve({ data: orgFormOptions })
          : getOrganizationFormOptions(),
      ]);
      setOrgFormOptions(optsRes.data);
      const next = formFromOrg(orgRes.data);
      if (mode === "NEW_VERSION") next.effectiveStartDate = todayStr();
      setOrgForm(next);
      setOrgEditMode(mode);
      setOrgDetail(orgRes.data);
      setOrgEditOpen(true);
    } catch (e: unknown) {
      toast.error((e as ApiError).message ?? "加载部门失败");
    }
  };

  const viewOrgVersion = async (version: OrganizationVersion) => {
    try {
      const res = await getOrganization(version.id);
      setOrgDetail(res.data);
    } catch (e: unknown) {
      toast.error((e as ApiError).message ?? "加载版本详情失败");
    }
  };

  const saveOrgEdit = async () => {
    if (!orgDetail || !orgForm) return;
    if (!orgForm.name.trim()) {
      toast.error("请填写部门名称");
      return;
    }
    if (orgEditMode === "NEW_VERSION" && orgForm.effectiveStartDate === orgDetail.effectiveStartDate) {
      toast.error("新版本须使用不同的生效日期");
      return;
    }
    setSavingOrg(true);
    try {
      const res = await updateOrganization(orgDetail.id, {
        editMode: orgEditMode,
        name: orgForm.name.trim(),
        parentCode: orgForm.parentCode || undefined,
        effectiveStartDate:
          orgEditMode === "NEW_VERSION" ? orgForm.effectiveStartDate : orgDetail.effectiveStartDate,
        status: orgForm.status,
        location: orgForm.location || undefined,
        legalCompany: orgForm.legalCompany || undefined,
        departmentType: orgForm.departmentType || undefined,
        departmentLevel: orgForm.departmentLevel || undefined,
        costCenter: orgForm.costCenter || undefined,
        financialCode: orgForm.financialCode || undefined,
        orgAttribute: (orgForm.orgAttribute || undefined) as Organization["orgAttribute"],
        orgFunction: (orgForm.orgFunction || undefined) as Organization["orgFunction"],
        orgTags: orgForm.orgTags || undefined,
        orgLeaderNo: orgForm.orgLeaderNo || undefined,
        supervisingLeaderNo: orgForm.supervisingLeaderNo || undefined,
        hrCoordinatorNo: orgForm.hrCoordinatorNo || undefined,
        hrbpNo: orgForm.hrbpNo || undefined,
        sscNo: orgForm.sscNo || undefined,
      });
      toast.success(orgEditMode === "NEW_VERSION" ? "已创建新版本" : "当前版本已更新");
      setOrgEditOpen(false);
      setOrgDetail(res.data);
      await load();
      setLayoutNonce((n) => n + 1);
      const ver = await getOrganizationVersions(res.data.code);
      setOrgVersions(ver.data);
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSavingOrg(false);
    }
  };

  const openReparent = useCallback((req: ReparentRequest) => {
    setReparent(req);
    setEditMode("NEW_VERSION");
    setNewEffectiveStart(todayStr());
  }, []);

  const closeReparent = () => {
    setReparent(null);
    setLayoutNonce((n) => n + 1);
  };

  const confirmReparent = async () => {
    if (!reparent) return;
    if (editMode === "NEW_VERSION") {
      if (!newEffectiveStart.trim()) {
        toast.error("请填写新生效日期");
        return;
      }
      if (newEffectiveStart === reparent.source.effectiveStartDate) {
        toast.error("新版本须使用不同的生效日期");
        return;
      }
    }
    setSavingReparent(true);
    try {
      await updateOrganization(reparent.source.id, {
        editMode,
        parentCode: reparent.target.code,
        effectiveStartDate:
          editMode === "NEW_VERSION" ? newEffectiveStart : reparent.source.effectiveStartDate,
      });
      toast.success(
        editMode === "NEW_VERSION"
          ? `已创建新版本：${reparent.source.name} → ${reparent.target.name}`
          : `已更新上级：${reparent.source.name} → ${reparent.target.name}`,
      );
      setReparent(null);
      await load();
      setLayoutNonce((n) => n + 1);
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    } finally {
      setSavingReparent(false);
    }
  };

  const openPosition = (item: OrganizationOverviewPosition) => {
    if (!canViewPosition) return;
    setPositionId(item.id);
    setPositionSheetOpen(true);
  };

  const loadEmployeeDetailTabs = useCallback(async (employeeId: string) => {
    setArchiveLoadState("loading");
    setArchiveError(null);
    setArchive(null);
    setMovements([]);
    try {
      const [movementRes, archiveRes] = await Promise.all([
        listEmployeeMovements(employeeId),
        getEmployeeArchive(employeeId),
      ]);
      setMovements(movementRes.data);
      setArchive(archiveRes.data);
      setArchiveLoadState("ready");
    } catch (e: unknown) {
      const err: ApiError =
        typeof (e as ApiError)?.message === "string"
          ? { message: (e as ApiError).message, traceId: (e as ApiError).traceId }
          : { message: "加载档案失败" };
      setArchiveError(err);
      setArchiveLoadState("error");
      toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
    }
  }, []);

  const openEmployee = async (item: OrganizationOverviewEmployee) => {
    if (!canViewEmployee) return;
    setDetailAsOfDate(asOfDate);
    setEmployeeSheetOpen(true);
    setEmployeeDetail({
      id: item.id,
      employeeNo: item.employeeNo,
      fullName: item.fullName,
      status: item.status,
      mobile: "",
      mobileMasked: true,
    } as Employee);
    void loadEmployeeDetailTabs(item.id);
    if (orgsForArchive.length === 0 && state.type === "ok") {
      setOrgsForArchive(state.tree);
    }
    if (!employeeFormOptions) {
      void getEmployeeFormOptions()
        .then((r) => setEmployeeFormOptions(r.data))
        .catch(() => setEmployeeFormOptions(null));
    }
    try {
      const res = await getEmployeeSnapshot(item.id, {
        asOfDate,
        revealSensitive: revealSensitive && canViewSensitive,
      });
      setEmployeeDetail(res.data);
    } catch {
      // 列表摘要兜底
    }
  };

  if (!canView) {
    return (
      <div className="space-y-5">
        <PageHeader title="组织图" description="图形化浏览组织层级与部门下岗位人员。" />
        <NoPermissionCard
          icon={<Shield className="size-5 text-muted-foreground" />}
          title="无查看权限"
          description="需要 organization:view 权限。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="组织图"
        description="图形化浏览组织树；浏览模式可下钻岗位与人员，调整结构模式可拖拽改上级（支持生效版本）。"
        actions={
          <Link
            to="/admin/org/structure"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Building2 className="size-4" />
            前往组织管理维护
          </Link>
        }
      />

      <PanelCard
        title="组织图谱"
        description={
          state.type === "ok"
            ? `共 ${flatCount} 个部门 · 节点数字为直属岗位/在岗人数 · 快照 ${asOfDate}`
            : undefined
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? (
              <OptionToggle options={CHART_MODE_OPTIONS} value={chartMode} onChange={setChartMode} />
            ) : null}
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="搜索部门名称、编号…"
              className="sm:w-[200px]"
            />
            <Badge variant={temporal.variant} className="gap-1">
              <CalendarClock className="size-3" />
              {temporal.label}
            </Badge>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="h-8 w-[150px]"
            />
            {!isViewingToday ? (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setAsOfDate(todayStr())}>
                回到今天
              </Button>
            ) : null}
          </div>
        }
      >
        {state.type === "loading" ? <PanelLoading message="正在加载组织图…" /> : null}
        {state.type === "error" ? (
          <PanelError error={state.error} onRetry={() => void load()} />
        ) : null}
        {state.type === "ok" && state.tree.length === 0 ? (
          <PanelEmpty title="暂无组织数据" description="请先在组织管理中维护部门。" />
        ) : null}
        {state.type === "ok" && state.tree.length > 0 ? (
          <ReactFlowProvider>
            <ChartCanvas
              tree={state.tree}
              search={debouncedSearch}
              selectedCode={selected?.code ?? null}
              reparentMode={reparentMode}
              layoutNonce={layoutNonce}
              onSelect={setSelected}
              onRequestReparent={openReparent}
            />
          </ReactFlowProvider>
        ) : null}
      </PanelCard>

      <Dialog open={Boolean(reparent)} onOpenChange={(open) => !open && !savingReparent && closeReparent()}>
        <DialogContent className="gap-5 sm:max-w-md" showCloseButton={!savingReparent}>
          <DialogHeader>
            <DialogTitle>确认调整上级部门</DialogTitle>
            <DialogDescription>
              {reparent
                ? `将「${reparent.source.name}」从 ${parentLabel(reparent.source)} 调整到「${reparent.target.name}」`
                : null}
            </DialogDescription>
          </DialogHeader>
          {reparent ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                <div>
                  <span className="text-muted-foreground">部门：</span>
                  {reparent.source.name}
                  <span className="ml-1 font-mono text-xs text-muted-foreground">({reparent.source.code})</span>
                </div>
                <div className="mt-1">
                  <span className="text-muted-foreground">新上级：</span>
                  {reparent.target.name}
                  <span className="ml-1 font-mono text-xs text-muted-foreground">({reparent.target.code})</span>
                </div>
              </div>
              <FormField
                label="生效模式"
                hint="组织调整建议用「新增生效版本」保留历史；纠错可用「修改当前版本」。"
              >
                <OptionToggle options={EDIT_MODE_OPTIONS} value={editMode} onChange={setEditMode} />
              </FormField>
              {editMode === "NEW_VERSION" ? (
                <FormField label="新生效日期" required hint="须不同于当前版本生效日">
                  <Input
                    type="date"
                    value={newEffectiveStart}
                    onChange={(e) => setNewEffectiveStart(e.target.value)}
                    className="h-9"
                  />
                </FormField>
              ) : (
                <p className="text-xs text-muted-foreground">
                  将直接修改当前版本（生效日 {reparent.source.effectiveStartDate}）的上级，不新增历史版本。
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" disabled={savingReparent} onClick={closeReparent}>
                  取消
                </Button>
                <Button disabled={savingReparent} onClick={() => void confirmReparent()}>
                  {savingReparent ? "保存中…" : "确认调整"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selected) && !reparentMode} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          {selected ? (
            <>
              {(() => {
                const display = orgDetail ?? selected;
                const leader = displayOrgLeader(display, selected);
                const locationText = displayCodeName(display.location, display.locationLabel);
                return (
                  <SheetHeader className="relative overflow-hidden border-b border-border/70 px-5 pb-4 pt-5 text-left">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-transparent" />
                    <div className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-primary/[0.05]" />
                    <div className="relative flex items-start gap-3.5">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                        <Network className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="space-y-1">
                          <SheetTitle className="truncate text-xl tracking-tight">{display.name}</SheetTitle>
                          <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
                            <span>{display.code}</span>
                            <span className="text-border">·</span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <CornerDownRight className="size-3" />
                              {displayParent(display)}
                            </span>
                          </SheetDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={statusTone(display.status)}>
                            {display.statusLabel ?? display.status}
                          </Badge>
                          {display.departmentLevelLabel ? (
                            <Badge variant="secondary">{display.departmentLevelLabel}</Badge>
                          ) : null}
                          {display.departmentTypeLabel ? (
                            <Badge variant="outline">{display.departmentTypeLabel}</Badge>
                          ) : null}
                          {locationText ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="size-3" />
                              {locationText}
                            </span>
                          ) : null}
                        </div>
                        {(leader.name || leader.no) && (
                          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1.5">
                            <div className="flex size-6 items-center justify-center rounded-full bg-background text-[10px] font-semibold text-primary">
                              {initialsFromName(leader.name || leader.no)}
                            </div>
                            <div className="min-w-0 text-[11px]">
                              <span className="text-muted-foreground">负责人 </span>
                              <span className="font-medium text-foreground">
                                {leader.name || leader.no}
                              </span>
                              {leader.name && leader.no ? (
                                <span className="ml-1 font-mono text-muted-foreground">{leader.no}</span>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </SheetHeader>
                );
              })()}

              <div className="min-h-0 flex-1 overflow-y-auto">
                <Tabs value={drillTab} onValueChange={setDrillTab} className="gap-0">
                  <div className="sticky top-0 z-10 space-y-3 border-b border-border/60 bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <TabsList className="grid h-auto w-full grid-cols-3">
                      <TabsTrigger value="overview" className="gap-1.5 px-2">
                        <Building2 className="size-3.5" />
                        概览
                      </TabsTrigger>
                      <TabsTrigger value="positions" disabled={!canViewPosition} className="gap-1.5 px-2">
                        <BriefcaseBusiness className="size-3.5" />
                        岗位
                        {overview ? (
                          <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                            {overview.positionTotal}
                          </span>
                        ) : null}
                      </TabsTrigger>
                      <TabsTrigger value="employees" disabled={!canViewEmployee} className="gap-1.5 px-2">
                        <Users className="size-3.5" />
                        人员
                        {overview ? (
                          <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                            {overview.employeeTotal}
                          </span>
                        ) : null}
                      </TabsTrigger>
                    </TabsList>

                    {drillTab !== "overview" ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">列表口径</span>
                          <OptionToggle
                            options={[
                              { id: "DIRECT", label: "仅直属" },
                              { id: "SUBTREE", label: "含下级" },
                            ]}
                            value={scope}
                            onChange={setScope}
                          />
                        </div>
                        <SearchInput
                          value={drillFilter}
                          onChange={setDrillFilter}
                          placeholder={drillTab === "positions" ? "筛选岗位…" : "筛选人员…"}
                          className="w-full sm:w-[200px]"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="px-5 py-4">
                    <TabsContent value="overview" className="mt-0 space-y-5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <MetricTile
                          icon={<BriefcaseBusiness className="size-4" />}
                          label="直属岗位"
                          value={selected.positionCount ?? 0}
                          hint="节点口径"
                        />
                        <MetricTile
                          icon={<Users className="size-4" />}
                          label="直属在岗"
                          value={selected.employeeCount ?? 0}
                          hint="节点口径"
                        />
                      </div>

                      {orgVersionsLoading ? (
                        <div className="h-20 animate-pulse rounded-xl bg-muted/30" />
                      ) : (
                        <OrgVersionTimeline
                          versions={orgVersions}
                          activeId={(orgDetail ?? selected).id}
                          onSelect={(v) => void viewOrgVersion(v)}
                        />
                      )}

                      <DetailSection title="基本信息">
                        <DetailCell
                          label="上级组织"
                          value={displayParent(orgDetail ?? selected)}
                        />
                        <DetailCell
                          label="生效日期"
                          value={(orgDetail ?? selected).effectiveStartDate}
                        />
                        <DetailCell
                          label="地点"
                          value={displayCodeName(
                            (orgDetail ?? selected).location,
                            (orgDetail ?? selected).locationLabel,
                          )}
                        />
                        <DetailCell
                          label="法人公司"
                          value={displayCodeName(
                            (orgDetail ?? selected).legalCompany,
                            (orgDetail ?? selected).legalCompanyLabel,
                          )}
                        />
                        <DetailCell
                          label="部门类型"
                          value={displayCodeName(
                            (orgDetail ?? selected).departmentType,
                            (orgDetail ?? selected).departmentTypeLabel,
                          )}
                        />
                        <DetailCell
                          label="部门层级"
                          value={displayCodeName(
                            (orgDetail ?? selected).departmentLevel,
                            (orgDetail ?? selected).departmentLevelLabel,
                          )}
                        />
                        <DetailCell label="成本中心" value={(orgDetail ?? selected).costCenter} />
                        <DetailCell
                          label="组织属性"
                          value={(orgDetail ?? selected).orgAttributeLabel}
                        />
                        <DetailCell
                          label="组织职能"
                          value={(orgDetail ?? selected).orgFunctionLabel}
                        />
                        <DetailCell label="财务编码" value={(orgDetail ?? selected).financialCode} />
                        <DetailCell label="组织标签" value={(orgDetail ?? selected).orgTags} />
                      </DetailSection>

                      <DetailSection title="负责人与 HR">
                        {(() => {
                          const leader = displayOrgLeader(orgDetail ?? selected, selected);
                          return (
                            <PersonTile
                              label="负责人"
                              name={leader.name}
                              employeeNo={leader.no ?? (orgDetail ?? selected).orgLeaderNo}
                            />
                          );
                        })()}
                        <PersonTile
                          label="分管领导"
                          employeeNo={(orgDetail ?? selected).supervisingLeaderNo}
                        />
                        <PersonTile
                          label="HR 协调人"
                          employeeNo={(orgDetail ?? selected).hrCoordinatorNo}
                        />
                        <PersonTile label="HRBP" employeeNo={(orgDetail ?? selected).hrbpNo} />
                        <PersonTile label="SSC" employeeNo={(orgDetail ?? selected).sscNo} />
                      </DetailSection>
                    </TabsContent>

                    <TabsContent value="positions" className="mt-0 space-y-3">
                      {!canViewPosition ? (
                        <PanelEmpty title="无权限" description="需要 position:view 权限。" />
                      ) : overviewLoading ? (
                        <PanelLoading message="正在加载岗位…" />
                      ) : overviewError ? (
                        <PanelError
                          error={overviewError}
                          onRetry={() => setSelected({ ...selected })}
                        />
                      ) : !overview || overview.positions.length === 0 ? (
                        <PanelEmpty
                          title="暂无岗位"
                          description={
                            scope === "SUBTREE"
                              ? "含下级部门口径下没有岗位。"
                              : "该部门暂无直属岗位。"
                          }
                        />
                      ) : filteredPositions.length === 0 ? (
                        <PanelEmpty title="无匹配岗位" description="试试调整筛选关键词。" />
                      ) : (
                        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
                          {filteredPositions.map((p) => (
                            <DrillListRow
                              key={p.id}
                              icon={<BriefcaseBusiness className="size-4" />}
                              title={p.name}
                              subtitle={p.code}
                              badges={
                                <Badge
                                  variant="outline"
                                  className={cn("h-5 text-[10px]", statusTone(p.status))}
                                >
                                  {p.statusLabel ?? p.status}
                                </Badge>
                              }
                              meta={
                                scope === "SUBTREE" && p.organizationName ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Building2 className="size-3" />
                                    {p.organizationName}
                                  </span>
                                ) : undefined
                              }
                              onClick={() => openPosition(p)}
                            />
                          ))}
                        </ul>
                      )}
                      {overview && overview.positionTotal > overview.positions.length ? (
                        <p className="text-xs text-muted-foreground">
                          仅展示前 {overview.positions.length} 条，共 {overview.positionTotal} 个。
                          <Link
                            className="ml-1 text-primary underline-offset-2 hover:underline"
                            to="/admin/org/positions"
                          >
                            在岗位体系中查看
                          </Link>
                        </p>
                      ) : null}
                    </TabsContent>

                    <TabsContent value="employees" className="mt-0 space-y-3">
                      {!canViewEmployee ? (
                        <PanelEmpty title="无权限" description="需要 employee:roster:view 权限。" />
                      ) : overviewLoading ? (
                        <PanelLoading message="正在加载人员…" />
                      ) : overviewError ? (
                        <PanelError
                          error={overviewError}
                          onRetry={() => setSelected({ ...selected })}
                        />
                      ) : !overview || overview.employees.length === 0 ? (
                        <PanelEmpty
                          title="暂无人员"
                          description={
                            scope === "SUBTREE"
                              ? "含下级部门口径下没有主任职人员。"
                              : "该部门暂无直属主任职人员。"
                          }
                        />
                      ) : filteredEmployees.length === 0 ? (
                        <PanelEmpty title="无匹配人员" description="试试调整筛选关键词。" />
                      ) : (
                        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
                          {filteredEmployees.map((emp) => (
                            <DrillListRow
                              key={emp.id}
                              icon={
                                <span className="text-xs font-semibold">
                                  {initialsFromName(emp.fullName)}
                                </span>
                              }
                              title={emp.fullName}
                              subtitle={emp.employeeNo}
                              badges={
                                <Badge
                                  variant="outline"
                                  className={cn("h-5 text-[10px]", statusTone(emp.status))}
                                >
                                  {emp.statusLabel ?? emp.status}
                                </Badge>
                              }
                              meta={
                                <>
                                  {emp.positionName ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <BriefcaseBusiness className="size-3" />
                                      {emp.positionName}
                                    </span>
                                  ) : null}
                                  {scope === "SUBTREE" && emp.organizationName ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <Building2 className="size-3" />
                                      {emp.organizationName}
                                    </span>
                                  ) : null}
                                </>
                              }
                              onClick={() => void openEmployee(emp)}
                            />
                          ))}
                        </ul>
                      )}
                      {overview && overview.employeeTotal > overview.employees.length ? (
                        <p className="text-xs text-muted-foreground">
                          仅展示前 {overview.employees.length} 条，共 {overview.employeeTotal} 人。
                          <Link
                            className="ml-1 text-primary underline-offset-2 hover:underline"
                            to="/admin/employees/roster"
                          >
                            在花名册中查看
                          </Link>
                        </p>
                      ) : null}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <SheetFooter className="border-t px-6 py-4">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    关闭
                  </Button>
                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => void openOrgEdit("CURRENT")}>
                        <Pencil />
                        编辑
                      </Button>
                      <Button variant="outline" onClick={() => void openOrgEdit("NEW_VERSION")}>
                        <History />
                        新增版本
                      </Button>
                    </div>
                  ) : null}
                </div>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <PositionWorkbenchSheet
        positionId={positionId}
        open={positionSheetOpen}
        onOpenChange={(open) => {
          setPositionSheetOpen(open);
          if (!open) setPositionId(null);
        }}
        asOfDate={asOfDate}
        onChanged={() => {
          if (selected) setSelected({ ...selected });
        }}
      />

      <Sheet
        open={employeeSheetOpen && Boolean(employeeDetail)}
        onOpenChange={(open) => {
          if (!open) {
            setEmployeeSheetOpen(false);
            setEmployeeDetail(null);
            setArchive(null);
            setMovements([]);
          }
        }}
      >
        <SheetContent
          side="right"
          className="z-[60] gap-0 p-0 data-[side=right]:max-w-[min(1512px,100vw)]"
        >
          {employeeDetail ? (
            <EmployeeArchiveDetailView
              employee={employeeDetail}
              asOfDate={detailAsOfDate}
              archive={archive}
              movements={movements}
              archiveLoadState={archiveLoadState}
              archiveError={archiveError}
              onArchiveRetry={() => void loadEmployeeDetailTabs(employeeDetail.id)}
              revealSensitive={revealSensitive}
              canViewSensitive={canViewSensitive}
              onRevealSensitiveChange={async (next) => {
                setRevealSensitive(next);
                try {
                  const res = await getEmployeeSnapshot(employeeDetail.id, {
                    asOfDate: detailAsOfDate,
                    revealSensitive: next && canViewSensitive,
                  });
                  setEmployeeDetail(res.data);
                } catch (e: unknown) {
                  const err = e as ApiError;
                  toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
                }
              }}
              canEdit={canEditEmployee}
              canEditSection={(section) => archivePerm.canEditSection(section)}
              orgs={orgsForArchive.length > 0 ? orgsForArchive : state.type === "ok" ? state.tree : []}
              archiveDictOptions={employeeFormOptions}
              onClose={() => {
                setEmployeeSheetOpen(false);
                setEmployeeDetail(null);
              }}
              onEditMaster={() => {
                toast.message("请在员工花名册中编辑个人主档", {
                  description: "组织图入口已开放完整档案查看与分区维护。",
                  action: {
                    label: "打开花名册",
                    onClick: () => {
                      window.location.href = "/admin/employees/roster";
                    },
                  },
                });
              }}
              onAsOfDateChange={async (next) => {
                setDetailAsOfDate(next);
                try {
                  const res = await getEmployeeSnapshot(employeeDetail.id, {
                    asOfDate: next,
                    revealSensitive: revealSensitive && canViewSensitive,
                  });
                  setEmployeeDetail(res.data);
                } catch (e: unknown) {
                  const err = e as ApiError;
                  toast.error(err.traceId ? `${err.message}（traceId: ${err.traceId}）` : err.message);
                }
              }}
              onArchiveChanged={() => void loadEmployeeDetailTabs(employeeDetail.id)}
              onAssignmentsChanged={async () => {
                try {
                  const res = await getEmployeeSnapshot(employeeDetail.id, {
                    asOfDate: detailAsOfDate,
                    revealSensitive: revealSensitive && canViewSensitive,
                  });
                  setEmployeeDetail(res.data);
                } catch {
                  // ignore
                }
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={orgEditOpen} onOpenChange={(open) => !open && !savingOrg && setOrgEditOpen(false)}>
        <SheetContent side="right" className="z-[60] gap-0 p-0 data-[side=right]:max-w-[min(840px,100vw)]">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{orgEditMode === "NEW_VERSION" ? "新增生效版本" : "编辑部门"}</SheetTitle>
            <SheetDescription>
              {orgEditMode === "CURRENT"
                ? `修改当前版本（${orgDetail?.effectiveStartDate ?? ""}）的数据，不改变生效日期。`
                : "指定新生效日期，将基于当前表单内容创建新版本并自动衔接时间轴。"}
            </SheetDescription>
          </SheetHeader>
          {orgForm ? (
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <FormField label="编辑方式" required>
                <OptionToggle
                  options={EDIT_MODE_OPTIONS}
                  value={orgEditMode}
                  onChange={(mode) => {
                    setOrgEditMode(mode);
                    setOrgForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            effectiveStartDate:
                              mode === "CURRENT" && orgDetail
                                ? orgDetail.effectiveStartDate
                                : todayStr(),
                          }
                        : prev,
                    );
                  }}
                />
              </FormField>
              <FormField label="部门名称" required>
                <Input
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="生效日期"
                  required
                  hint={orgEditMode === "CURRENT" ? "修改当前版本时生效日期不可变更" : undefined}
                >
                  <Input
                    type="date"
                    value={orgForm.effectiveStartDate}
                    disabled={orgEditMode === "CURRENT"}
                    onChange={(e) => setOrgForm({ ...orgForm, effectiveStartDate: e.target.value })}
                  />
                </FormField>
                <FormField label="状态">
                  <OptionToggle
                    options={[
                      { id: "ACTIVE", label: "有效" },
                      { id: "INACTIVE", label: "无效" },
                    ]}
                    value={orgForm.status}
                    onChange={(v) => setOrgForm({ ...orgForm, status: v })}
                  />
                </FormField>
              </div>
              <FormField label="上级组织">
                <SearchableSelect
                  variant="entity"
                  value={orgForm.parentCode ?? ""}
                  onChange={(v) => setOrgForm({ ...orgForm, parentCode: v || undefined })}
                  options={parentOrgOptions}
                  placeholder="无（根节点）"
                  emptyLabel="无（根节点）"
                  searchPlaceholder="搜索上级部门编号或名称…"
                  allowEmpty
                  formatOption={(opt) => `${opt.code ?? opt.value} — ${opt.label}`}
                />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="地点">
                  <SearchableSelect
                    value={orgForm.location}
                    onChange={(v) => setOrgForm({ ...orgForm, location: v })}
                    options={(orgFormOptions?.locations ?? []).map((o) => ({
                      value: o.value,
                      label: o.label,
                      code: o.value,
                    }))}
                    placeholder="选择地点"
                    allowEmpty
                  />
                </FormField>
                <FormField label="法人公司">
                  <SearchableSelect
                    value={orgForm.legalCompany}
                    onChange={(v) => setOrgForm({ ...orgForm, legalCompany: v })}
                    options={(orgFormOptions?.legalCompanies ?? []).map((o) => ({
                      value: o.value,
                      label: o.label,
                      code: o.value,
                    }))}
                    placeholder="选择法人公司"
                    allowEmpty
                  />
                </FormField>
                <FormField label="部门类型">
                  <SearchableSelect
                    value={orgForm.departmentType}
                    onChange={(v) => setOrgForm({ ...orgForm, departmentType: v })}
                    options={(orgFormOptions?.departmentTypes ?? []).map((o) => ({
                      value: o.value,
                      label: o.label,
                      code: o.value,
                    }))}
                    placeholder="选择部门类型"
                    allowEmpty
                  />
                </FormField>
                <FormField label="部门层级">
                  <SearchableSelect
                    value={orgForm.departmentLevel}
                    onChange={(v) => setOrgForm({ ...orgForm, departmentLevel: v })}
                    options={(orgFormOptions?.departmentLevels ?? []).map((o) => ({
                      value: o.value,
                      label: o.label,
                      code: o.value,
                    }))}
                    placeholder="选择部门层级"
                    allowEmpty
                  />
                </FormField>
                <FormField label="成本中心">
                  <Input
                    value={orgForm.costCenter}
                    onChange={(e) => setOrgForm({ ...orgForm, costCenter: e.target.value })}
                  />
                </FormField>
                <FormField label="财务编码">
                  <Input
                    value={orgForm.financialCode}
                    onChange={(e) => setOrgForm({ ...orgForm, financialCode: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="组织属性">
                <OptionToggle
                  options={[
                    { id: "PHYSICAL", label: "实体" },
                    { id: "VIRTUAL", label: "虚拟" },
                  ]}
                  value={(orgForm.orgAttribute || "PHYSICAL") as "PHYSICAL" | "VIRTUAL"}
                  onChange={(v) => setOrgForm({ ...orgForm, orgAttribute: v })}
                />
              </FormField>
              <FormField label="组织职能">
                <OptionToggle
                  options={[
                    { id: "RND", label: "产研" },
                    { id: "MANUFACTURING", label: "制造" },
                    { id: "MARKET", label: "市场" },
                    { id: "FUNCTION", label: "职能" },
                  ]}
                  value={
                    (orgForm.orgFunction || "FUNCTION") as
                      | "RND"
                      | "MANUFACTURING"
                      | "MARKET"
                      | "FUNCTION"
                  }
                  onChange={(v) => setOrgForm({ ...orgForm, orgFunction: v })}
                />
              </FormField>
              <FormField label="组织标签">
                <Input
                  value={orgForm.orgTags}
                  onChange={(e) => setOrgForm({ ...orgForm, orgTags: e.target.value })}
                  placeholder="多个标签可用逗号分隔"
                />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(
                  [
                    ["orgLeaderNo", "组织负责人"],
                    ["supervisingLeaderNo", "分管领导"],
                    ["hrCoordinatorNo", "HR 协调"],
                    ["hrbpNo", "HRBP"],
                    ["sscNo", "SSC"],
                  ] as const
                ).map(([key, label]) => (
                  <FormField key={key} label={label} hint="填写工号">
                    <Input
                      value={orgForm[key]}
                      onChange={(e) => setOrgForm({ ...orgForm, [key]: e.target.value })}
                      className="font-mono"
                    />
                  </FormField>
                ))}
              </div>
            </div>
          ) : null}
          <SheetFooter className="border-t px-6 py-4">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={savingOrg} onClick={() => setOrgEditOpen(false)}>
                取消
              </Button>
              <Button disabled={savingOrg || !orgForm} onClick={() => void saveOrgEdit()}>
                {savingOrg ? "保存中…" : orgEditMode === "NEW_VERSION" ? "创建新版本" : "保存"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
