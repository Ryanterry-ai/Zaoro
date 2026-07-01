"use client";

import { useMemo } from "react";

interface ArchNode {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "failed" | "skipped";
  detail?: string;
  count?: number;
}

interface ArchEdge {
  from: string;
  to: string;
}

interface ArchGraphProps {
  nodes: ArchNode[];
  edges: ArchEdge[];
  width?: number;
  height?: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "oklch(0.55 0 0)",
  active: "oklch(0.62 0.22 260)",
  done: "oklch(0.65 0.25 150)",
  failed: "oklch(0.6 0.26 25)",
  skipped: "oklch(0.5 0.05 260)",
};

const STATUS_GLOW: Record<string, string> = {
  active: "drop-shadow(0 0 8px oklch(0.62 0.22 260 / 0.5))",
  done: "drop-shadow(0 0 4px oklch(0.65 0.25 150 / 0.3))",
};

const LAYOUT = {
  layerGap: 160,
  nodeGap: 28,
  nodeWidth: 120,
  nodeHeight: 48,
  topPadding: 40,
  leftPadding: 40,
};

function layoutGraph(
  nodes: ArchNode[],
  edges: ArchEdge[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  const layers: string[][] = [];
  const visited = new Set<string>();
  const inDegree = new Map<string, number>();
  const nodeSet = new Set(nodes.map((n) => n.id));

  for (const n of nodeSet) inDegree.set(n, 0);
  for (const e of edges) {
    if (nodeSet.has(e.to)) {
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    }
  }

  let queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const layer: string[] = [];
    const next: string[] = [];
    for (const id of queue) {
      if (visited.has(id)) continue;
      visited.add(id);
      layer.push(id);
    }
    if (layer.length === 0) break;
    layers.push(layer);

    for (const id of queue) {
      for (const e of edges) {
        if (e.from === id && !visited.has(e.to)) {
          next.push(e.to);
        }
      }
    }
    queue = next;
  }

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const x = LAYOUT.leftPadding + li * LAYOUT.layerGap;
    const totalH = layer.length * (LAYOUT.nodeHeight + LAYOUT.nodeGap) - LAYOUT.nodeGap;
    const startY = LAYOUT.topPadding + (300 - totalH) / 2;
    for (let ni = 0; ni < layer.length; ni++) {
      positions.set(layer[ni], {
        x,
        y: startY + ni * (LAYOUT.nodeHeight + LAYOUT.nodeGap),
      });
    }
  }

  return positions;
}

export function ArchitectureGraph({ nodes, edges, width = 900, height = 380 }: ArchGraphProps) {
  const positions = useMemo(() => layoutGraph(nodes, edges), [nodes, edges]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-xs">
        No architecture data yet — build to generate
      </div>
    );
  }

  const svgW = Math.max(width, nodes.length * 140 + 80);
  const svgH = Math.max(height, 300);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="oklch(0.55 0 0 / 0.4)" />
        </marker>
      </defs>

      {edges.map((e, i) => {
        const from = positions.get(e.from);
        const to = positions.get(e.to);
        if (!from || !to) return null;
        const x1 = from.x + LAYOUT.nodeWidth;
        const y1 = from.y + LAYOUT.nodeHeight / 2;
        const x2 = to.x;
        const y2 = to.y + LAYOUT.nodeHeight / 2;
        return (
          <line
            key={`edge-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="oklch(0.5 0 0 / 0.25)"
            strokeWidth="1.5"
            markerEnd="url(#arrowhead)"
          />
        );
      })}

      {nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        const color = STATUS_COLORS[node.status] || STATUS_COLORS.pending;
        const glow = STATUS_GLOW[node.status] || "";
        return (
          <g key={node.id} style={{ filter: glow }}>
            <rect
              x={pos.x}
              y={pos.y}
              width={LAYOUT.nodeWidth}
              height={LAYOUT.nodeHeight}
              rx="8"
              ry="8"
              fill="oklch(0.2 0 0)"
              stroke={color}
              strokeWidth="1.5"
              opacity={node.status === "skipped" ? 0.4 : 1}
              className="transition-all duration-500"
            />
            <text
              x={pos.x + LAYOUT.nodeWidth / 2}
              y={pos.y + LAYOUT.nodeHeight / 2 + 4}
              textAnchor="middle"
              fill="oklch(0.85 0 0)"
              fontSize="11"
              fontFamily="ui-monospace, monospace"
              opacity={node.status === "skipped" ? 0.4 : 1}
            >
              {node.label}
            </text>
            {node.count !== undefined && node.count > 0 && (
              <text
                x={pos.x + LAYOUT.nodeWidth - 8}
                y={pos.y + 14}
                textAnchor="end"
                fill={color}
                fontSize="10"
                fontFamily="ui-monospace, monospace"
                fontWeight="bold"
              >
                {node.count}
              </text>
            )}
            {node.status === "active" && (
              <circle cx={pos.x + LAYOUT.nodeWidth - 10} cy={pos.y + LAYOUT.nodeHeight - 10} r="4" fill="none" stroke="oklch(0.62 0.22 260)" strokeWidth="1.5">
                <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function buildArchGraph(
  breContext?: { industry?: string; appName?: string } | null,
  blueprint?: {
    pages?: number;
    entities?: number;
    apis?: number;
    database?: { engine?: string; tables?: number } | null;
    hasDesignTokens?: boolean;
    vocabulary?: Record<string, string>;
  } | null,
  execBlueprint?: { pages?: Array<{ path: string }> } | null,
  appSpec?: { pages?: number; totalComponents?: number } | null,
  status?: "pending" | "connected" | "failed",
): { nodes: ArchNode[]; edges: ArchEdge[] } {
  const s = status === "connected" ? "done" : status === "failed" ? "failed" : "pending";
  const nodes: ArchNode[] = [];
  const edges: ArchEdge[] = [];

  nodes.push({ id: "intent", label: "Intent", status: s === "done" ? "done" : "active", detail: breContext?.appName });
  nodes.push({ id: "blueprint", label: "Blueprint", status: s, detail: breContext?.industry });
  edges.push({ from: "intent", to: "blueprint" });

  if (blueprint) {
    nodes.push({ id: "pages", label: "Pages", status: s, count: blueprint.pages ?? 0 });
    nodes.push({ id: "entities", label: "Entities", status: s, count: blueprint.entities ?? 0 });
    nodes.push({ id: "apis", label: "APIs", status: s, count: blueprint.apis ?? 0 });
    edges.push({ from: "blueprint", to: "pages" });
    edges.push({ from: "blueprint", to: "entities" });
    edges.push({ from: "blueprint", to: "apis" });

    if (blueprint.database?.engine) {
      nodes.push({ id: "database", label: `DB:${blueprint.database.engine}`, status: s, count: blueprint.database.tables ?? 0 });
      edges.push({ from: "blueprint", to: "database" });
    }
  }

  if (execBlueprint?.pages) {
    nodes.push({ id: "execution", label: "Execution", status: s, count: execBlueprint.pages.length });
    edges.push({ from: "blueprint", to: "execution" });
  }

  if (appSpec) {
    nodes.push({ id: "components", label: "Components", status: s, count: appSpec.totalComponents ?? 0 });
    edges.push({ from: "execution", to: "components" });
  }

  nodes.push({ id: "code", label: "Code", status: s });
  if (appSpec) edges.push({ from: "components", to: "code" });

  return { nodes, edges };
}
