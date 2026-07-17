import type {
  WorkflowAssigneeRule,
  WorkflowAssigneeRuleType,
  WorkflowDefinitionJson,
  WorkflowNodeDefinition,
} from "@shared/api.interface";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleDot,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";

import { ASSIGNEE_RULE_OPTIONS, assigneeRuleLabel } from "@/api/workflow";
import { FormField, OptionToggle } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FlowNodeData = {
  kind: "start" | "approve" | "end";
  node?: WorkflowNodeDefinition;
  index?: number;
  selected?: boolean;
  onSelect?: (key: string) => void;
};

/** 与实际卡片高度对齐，避免 fitView 按默认尺寸留白 */
const NODE_W = 280;
const START_END_H = 64;
const APPROVE_H = 78;
const GAP_Y = 24;
const CANVAS_PAD_Y = 20;
const CANVAS_PAD_X = 24;

function stepY(indexFromStart: number): number {
  // start(0) → approve(1..) → end(n+1)
  if (indexFromStart === 0) return 0;
  return START_END_H + GAP_Y + (indexFromStart - 1) * (APPROVE_H + GAP_Y);
}

function canvasHeightFor(nodeCount: number): number {
  const endIndex = nodeCount + 1;
  const contentH = stepY(endIndex) + START_END_H;
  return contentH + CANVAS_PAD_Y * 2;
}

function defaultRule(type: WorkflowAssigneeRuleType): WorkflowAssigneeRule {
  switch (type) {
    case "ROLE":
      return { type: "ROLE", roleCode: "hr" };
    case "REPORTING_LINE":
      return { type: "REPORTING_LINE", level: 1 };
    case "DIRECT_MANAGER":
      return { type: "DIRECT_MANAGER" };
    case "ORG_LEADER":
      return { type: "ORG_LEADER" };
    case "ORG_HRBP":
      return { type: "ORG_HRBP" };
    case "ORG_SSC":
      return { type: "ORG_SSC" };
    case "ORG_HR_COORDINATOR":
      return { type: "ORG_HR_COORDINATOR" };
    case "INITIATOR_SELECT":
      return { type: "INITIATOR_SELECT" };
  }
}

function ruleSummary(rule: WorkflowAssigneeRule): string {
  if (rule.type === "ROLE") return `角色 · ${rule.roleCode}`;
  if (rule.type === "REPORTING_LINE") return `汇报线 · 第 ${rule.level} 级`;
  return assigneeRuleLabel(rule.type);
}

function StartFlowNode(_props: NodeProps<Node<FlowNodeData>>) {
  return (
    <div className="flex h-[64px] w-[280px] flex-col justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
        <CircleDot className="size-4" />
        开始
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">流程发起后进入首个审批节点</p>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500" />
    </div>
  );
}

function EndFlowNode() {
  return (
    <div className="flex h-[64px] w-[280px] flex-col justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-sky-500" />
      <div className="flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-300">
        <CheckCircle2 className="size-4" />
        结束
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">全部节点通过后流程完成</p>
    </div>
  );
}

function ApproveFlowNode({ data }: NodeProps<Node<FlowNodeData>>) {
  const node = data.node;
  if (!node) return null;
  const selected = Boolean(data.selected);
  return (
    <button
      type="button"
      className={cn(
        "flex h-[78px] w-[280px] flex-col justify-center rounded-xl border bg-card px-4 text-left shadow-sm transition",
        "hover:border-primary/50 hover:shadow-md",
        selected ? "border-primary ring-2 ring-primary/20" : "border-border",
      )}
      onClick={() => data.onSelect?.(node.key)}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">{node.name}</span>
            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              #{(data.index ?? 0) + 1}
            </span>
          </div>
          <div className="truncate text-xs text-muted-foreground">{ruleSummary(node.assigneeRule)}</div>
          <div className="font-mono text-[10px] text-muted-foreground/80">{node.key}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </button>
  );
}

const nodeTypes = {
  start: StartFlowNode,
  approve: ApproveFlowNode,
  end: EndFlowNode,
};

function buildGraph(
  nodes: WorkflowNodeDefinition[],
  selectedKey: string | null,
  onSelect: (key: string) => void,
): { flowNodes: Node<FlowNodeData>[]; flowEdges: Edge[] } {
  const x = CANVAS_PAD_X;
  const flowNodes: Node<FlowNodeData>[] = [
    {
      id: "__start",
      type: "start",
      position: { x, y: CANVAS_PAD_Y + stepY(0) },
      data: { kind: "start" },
      draggable: false,
      selectable: false,
      width: NODE_W,
      height: START_END_H,
    },
  ];
  const flowEdges: Edge[] = [];

  nodes.forEach((node, index) => {
    flowNodes.push({
      id: node.key,
      type: "approve",
      position: { x, y: CANVAS_PAD_Y + stepY(index + 1) },
      data: {
        kind: "approve",
        node,
        index,
        selected: selectedKey === node.key,
        onSelect,
      },
      draggable: false,
      width: NODE_W,
      height: APPROVE_H,
    });
    const prevId = index === 0 ? "__start" : nodes[index - 1].key;
    flowEdges.push({
      id: `${prevId}->${node.key}`,
      source: prevId,
      target: node.key,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      style: { stroke: "hsl(var(--primary))", strokeWidth: 1.5 },
    });
  });

  flowNodes.push({
    id: "__end",
    type: "end",
    position: { x, y: CANVAS_PAD_Y + stepY(nodes.length + 1) },
    data: { kind: "end" },
    draggable: false,
    selectable: false,
    width: NODE_W,
    height: START_END_H,
  });
  const lastId = nodes.length === 0 ? "__start" : nodes[nodes.length - 1].key;
  flowEdges.push({
    id: `${lastId}->__end`,
    source: lastId,
    target: "__end",
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1.25, strokeDasharray: "4 4" },
  });

  return { flowNodes, flowEdges };
}

function uniqueKey(existing: string[], base: string): string {
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

type Props = {
  value: WorkflowDefinitionJson;
  onChange: (next: WorkflowDefinitionJson) => void;
  readOnly?: boolean;
  roleOptions: Array<{ id: string; label: string }>;
};

function WorkflowFlowEditorInner({ value, onChange, readOnly, roleOptions }: Props) {
  const nodes = value.nodes;
  const { setViewport } = useReactFlow();
  const [selectedKey, setSelectedKey] = useState<string | null>(nodes[0]?.key ?? null);

  const selected = useMemo(
    () => nodes.find((n) => n.key === selectedKey) ?? null,
    [nodes, selectedKey],
  );

  const onSelect = useCallback((key: string) => {
    setSelectedKey(key);
  }, []);

  const graph = useMemo(
    () => buildGraph(nodes, selectedKey, onSelect),
    [nodes, selectedKey, onSelect],
  );

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(graph.flowNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(graph.flowEdges);

  const canvasHeight = canvasHeightFor(nodes.length);

  useEffect(() => {
    setFlowNodes(graph.flowNodes);
    setFlowEdges(graph.flowEdges);
    // 固定 1:1 视口，避免 fitView 居中产生大块空白
    void setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 0 });
  }, [graph, setFlowNodes, setFlowEdges, setViewport]);

  useEffect(() => {
    if (selectedKey && !nodes.some((n) => n.key === selectedKey)) {
      setSelectedKey(nodes[0]?.key ?? null);
    }
  }, [nodes, selectedKey]);

  const updateNode = (key: string, patch: Partial<WorkflowNodeDefinition>) => {
    onChange({
      nodes: nodes.map((n) => (n.key === key ? { ...n, ...patch } : n)),
    });
  };

  const updateRule = (key: string, rule: WorkflowAssigneeRule) => {
    updateNode(key, { assigneeRule: rule });
  };

  const moveNode = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= nodes.length) return;
    const copy = [...nodes];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    onChange({ nodes: copy });
  };

  const removeNode = (key: string) => {
    const next = nodes.filter((n) => n.key !== key);
    onChange({ nodes: next });
    if (selectedKey === key) setSelectedKey(next[0]?.key ?? null);
  };

  const addNode = (type: WorkflowAssigneeRuleType) => {
    const meta = ASSIGNEE_RULE_OPTIONS.find((o) => o.type === type);
    const key = uniqueKey(
      nodes.map((n) => n.key),
      type.toLowerCase(),
    );
    const node: WorkflowNodeDefinition = {
      key,
      name: meta?.label ?? "审批节点",
      assigneeRule: defaultRule(type),
    };
    onChange({ nodes: [...nodes, node] });
    setSelectedKey(key);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="overflow-hidden rounded-xl border bg-[radial-gradient(ellipse_at_top,_hsl(var(--muted)/0.55),_transparent_60%)]">
        <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/20 px-3 py-2">
          <span className="mr-1 text-xs text-muted-foreground">添加节点</span>
          {ASSIGNEE_RULE_OPTIONS.map((opt) => (
            <Button
              key={opt.type}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={readOnly}
              onClick={() => addNode(opt.type)}
            >
              <Plus className="size-3.5" />
              {opt.label}
            </Button>
          ))}
        </div>
        <div className="w-full overflow-x-auto" style={{ height: canvasHeight }}>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={!readOnly}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={1}
            maxZoom={1}
            className="!bg-transparent"
          >
            <Background gap={18} size={1} />
            <Controls showInteractive={false} showZoom={false} showFitView={false} />
          </ReactFlow>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4">
        <div>
          <div className="text-sm font-medium">节点配置</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            点击画布节点进行编辑；可用上下箭头调整审批顺序。
          </p>
        </div>

        {!selected ? (
          <div className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
            {nodes.length === 0 ? "请从上方添加审批节点" : "请选择一个审批节点"}
          </div>
        ) : (
          <>
            <FormField label="节点名称" required>
              <Input
                value={selected.name}
                disabled={readOnly}
                onChange={(e) => updateNode(selected.key, { name: e.target.value })}
              />
            </FormField>
            <FormField label="节点标识" required hint="流程内唯一，建议英文下划线">
              <Input
                value={selected.key}
                disabled={readOnly}
                className="font-mono text-xs"
                onChange={(e) => {
                  const nextKey = e.target.value.trim();
                  if (!nextKey) return;
                  if (nodes.some((n) => n.key === nextKey && n.key !== selected.key)) return;
                  onChange({
                    nodes: nodes.map((n) =>
                      n.key === selected.key ? { ...n, key: nextKey } : n,
                    ),
                  });
                  setSelectedKey(nextKey);
                }}
              />
            </FormField>
            <FormField label="审批人类型" required>
              <OptionToggle
                options={ASSIGNEE_RULE_OPTIONS.map((o) => ({ id: o.type, label: o.label }))}
                value={selected.assigneeRule.type}
                onChange={(type) => {
                  if (readOnly) return;
                  updateRule(selected.key, defaultRule(type));
                }}
              />
            </FormField>

            {selected.assigneeRule.type === "ROLE" ? (
              <FormField label="系统角色" required>
                {roleOptions.length > 0 ? (
                  <OptionToggle
                    options={roleOptions}
                    value={selected.assigneeRule.roleCode}
                    onChange={(roleCode) => {
                      if (readOnly) return;
                      updateRule(selected.key, { type: "ROLE", roleCode });
                    }}
                  />
                ) : (
                  <Input
                    value={selected.assigneeRule.roleCode}
                    disabled={readOnly}
                    placeholder="如 hr"
                    onChange={(e) =>
                      updateRule(selected.key, { type: "ROLE", roleCode: e.target.value })
                    }
                  />
                )}
              </FormField>
            ) : null}

            {selected.assigneeRule.type === "REPORTING_LINE" ? (
              <FormField label="汇报线级别" required hint="1 = 直属上级，2 = 上级的上级…">
                <Input
                  type="number"
                  min={1}
                  value={selected.assigneeRule.level}
                  disabled={readOnly}
                  onChange={(e) => {
                    const level = Number(e.target.value);
                    updateRule(selected.key, {
                      type: "REPORTING_LINE",
                      level: Number.isFinite(level) && level >= 1 ? Math.floor(level) : 1,
                    });
                  }}
                />
              </FormField>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {ASSIGNEE_RULE_OPTIONS.find((o) => o.type === selected.assigneeRule.type)?.hint}
            </p>

            {!readOnly ? (
              <div className="flex flex-wrap gap-1.5 border-t pt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={nodes.findIndex((n) => n.key === selected.key) <= 0}
                  onClick={() => moveNode(nodes.findIndex((n) => n.key === selected.key), -1)}
                >
                  <ArrowUp className="size-3.5" />
                  上移
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={nodes.findIndex((n) => n.key === selected.key) >= nodes.length - 1}
                  onClick={() => moveNode(nodes.findIndex((n) => n.key === selected.key), 1)}
                >
                  <ArrowDown className="size-3.5" />
                  下移
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeNode(selected.key)}
                >
                  <Trash2 className="size-3.5" />
                  删除
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function WorkflowFlowEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <WorkflowFlowEditorInner {...props} />
    </ReactFlowProvider>
  );
}
