// ─── Graph Governor ────────────────────────────────────────────────
// Enforces the central Phase 1 invariant:
//
//   The Business Graph is IMMUTABLE at runtime. Only the Promotion Pipeline
//   may update it, and only through `applyPromotion`.
//
// Responsibilities:
//  - Expose a read-only proxy of the canonical KnowledgeGraph. Any mutation
//    attempt through that proxy throws a clear error pointing at the
//    Promotion Pipeline.
//  - Provide `applyPromotion`, the single controlled mutation path. Each
//    promotion is recorded to a durable append-only log so the graph is
//    reproducible from canonical seeds + promotions, and so it can be rolled
//    back.
//  - Replay promotions at initialization so the graph is rebuilt
//    deterministically from seeds + learned knowledge.

import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeGraph } from './engine.js';
import type { Edge, EdgeType, NodeType } from './types.js';
import { CandidateKnowledge } from '../candidate/types.js';

const MUTATORS = new Set([
  'addNode',
  'addEdge',
  'updateNode',
  'deleteNode',
  'deleteEdge',
  'composeIndustry',
]);

export interface PromotionAuditEntry {
  version: number;
  candidateId: string;
  kind: string;
  key: string;
  timestamp: number;
  nodesAdded: number;
  edgesAdded: number;
  /** Embedded payload so the graph is reproducible from seeds + this log alone. */
  node: { type: string; properties: Record<string, unknown> };
  edges: Array<{ type: string; target: string; weight?: number }>;
}

interface PromotionLogEntry {
  version: number;
  candidateId: string;
  kind: string;
  key: string;
  timestamp: number;
  nodesAdded: number;
  edgesAdded: number;
  node: { type: string; properties: Record<string, unknown> };
  edges: Array<{ type: string; target: string; weight?: number }>;
}

export interface ApplyPromotionResult {
  applied: boolean;
  version: number;
  nodesAdded: number;
  edgesAdded: number;
  reason?: string;
}

function defaultStoreDir(): string {
  return process.env.CANDIDATE_STORE_DIR
    ? path.resolve(process.env.CANDIDATE_STORE_DIR)
    : path.resolve(process.cwd(), 'knowledge-candidates');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Wrap a KnowledgeGraph so that mutation methods throw. Reads pass through.
 * This is the public handle handed to runtime code.
 */
function makeReadonlyProxy(graph: KnowledgeGraph): KnowledgeGraph {
  return new Proxy(graph, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function' && MUTATORS.has(prop as string)) {
        return () => {
          throw new Error(
            `KnowledgeGraph is immutable at runtime. Mutation via "${String(
              prop
            )}" is forbidden. Route changes through the Promotion Pipeline (GraphGovernor.applyPromotion).`
          );
        };
      }
      return value;
    },
  });
}

export class GraphGovernor {
  private graph: KnowledgeGraph;
  private readonlyView: KnowledgeGraph;
  private version = 0;
  private audit: PromotionAuditEntry[] = [];
  private logPath: string;

  constructor(graph: KnowledgeGraph, storeDir: string = defaultStoreDir()) {
    this.graph = graph;
    this.readonlyView = makeReadonlyProxy(graph);
    this.logPath = path.join(storeDir, 'promotions.log');
    this.replayPromotions();
  }

  /** The read-only handle for all runtime consumers. */
  getReadonlyGraph(): KnowledgeGraph {
    return this.readonlyView;
  }

  getVersion(): number {
    return this.version;
  }

  getAuditLog(): PromotionAuditEntry[] {
    return [...this.audit];
  }

  /**
   * The ONLY runtime mutation path for the Business Graph.
   * Idempotent: re-applying a previously promoted candidate is a no-op
   * (the node/edge already exists) and does not bump the version.
   */
  applyPromotion(c: CandidateKnowledge): ApplyPromotionResult {
    const nodeType = c.payload.node.type as NodeType;
    const nodeId =
      (c.payload.node.properties.id as string) ??
      `candidate-${c.kind}-${slugify(c.key)}`;

    let nodesAdded = 0;
    let edgesAdded = 0;

    if (!this.graph.getNode(nodeId)) {
      this.graph.addNode({
        id: nodeId,
        type: nodeType,
        properties: {
          ...c.payload.node.properties,
          id: nodeId,
          promotedFrom: c.id,
          promotedAt: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as never);
      nodesAdded += 1;
    }

    for (const edge of c.payload.edges ?? []) {
      // Skip edges whose target does not yet exist in the graph. The target
      // may be promoted later, or the candidate's relationship may be
      // situational — a missing target must never abort the whole promotion.
      if (!this.graph.getNode(edge.target)) continue;
      const edgeId = `${nodeId}->${edge.target}:${edge.type}`;
      if (!this.graph.getEdge(edgeId)) {
        const e: Edge = {
          id: edgeId,
          source: nodeId,
          target: edge.target,
          type: edge.type as EdgeType,
          weight: edge.weight ?? 1.0,
          properties: { promotedFrom: c.id },
          createdAt: Date.now(),
        };
        this.graph.addEdge(e);
        edgesAdded += 1;
      }
    }

    if (nodesAdded === 0 && edgesAdded === 0) {
      return { applied: false, version: this.version, nodesAdded: 0, edgesAdded: 0, reason: 'already present' };
    }

    this.version += 1;
    const entry: PromotionAuditEntry = {
      version: this.version,
      candidateId: c.id,
      kind: c.kind,
      key: c.key,
      timestamp: Date.now(),
      nodesAdded,
      edgesAdded,
      node: c.payload.node,
      edges: c.payload.edges ?? [],
    };
    this.audit.push(entry);
    this.appendLog(entry);

    return { applied: true, version: this.version, nodesAdded, edgesAdded };
  }

  /** Materialize a previously logged promotion (used during replay at init). */
  private materialize(entry: PromotionLogEntry): void {
    const nodeType = entry.node.type as NodeType;
    const nodeId =
      (entry.node.properties.id as string) ??
      `candidate-${entry.kind}-${slugify(entry.key)}`;

    if (!this.graph.getNode(nodeId)) {
      this.graph.addNode({
        id: nodeId,
        type: nodeType,
        properties: {
          ...entry.node.properties,
          id: nodeId,
          promotedFrom: entry.candidateId,
          promotedAt: entry.timestamp,
        },
        createdAt: entry.timestamp,
        updatedAt: entry.timestamp,
      } as never);
    }

    for (const edge of entry.edges ?? []) {
      if (!this.graph.getNode(edge.target)) continue;
      const edgeId = `${nodeId}->${edge.target}:${edge.type}`;
      if (!this.graph.getEdge(edgeId)) {
        const e: Edge = {
          id: edgeId,
          source: nodeId,
          target: edge.target,
          type: edge.type as EdgeType,
          weight: edge.weight ?? 1.0,
          properties: { promotedFrom: entry.candidateId },
          createdAt: entry.timestamp,
        };
        this.graph.addEdge(e);
      }
    }
  }

  /** Roll back the most recent promotion (used by operators / rollback scripts). */
  rollbackLast(): PromotionAuditEntry | undefined {
    const last = this.audit[this.audit.length - 1];
    if (!last) return undefined;
    this.audit.pop();
    this.version = Math.max(0, this.version - 1);
    this.truncateLog();
    return last;
  }

  private appendLog(entry: PromotionAuditEntry): void {
    try {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
      fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n', 'utf-8');
    } catch {
      // In-memory only; audit still tracked in process memory.
    }
  }

  private truncateLog(): void {
    try {
      const lines = this.audit.map(e => JSON.stringify(e)).join('\n') + (this.audit.length ? '\n' : '');
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
      fs.writeFileSync(this.logPath, lines, 'utf-8');
    } catch {
      // ignore
    }
  }

  /** Rebuild graph state from the durable promotion log (idempotent). */
  private replayPromotions(): void {
    let entries: PromotionLogEntry[] = [];
    try {
      if (fs.existsSync(this.logPath)) {
        const raw = fs.readFileSync(this.logPath, 'utf-8');
        entries = raw
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean)
          .map(l => JSON.parse(l) as PromotionLogEntry);
      }
    } catch {
      entries = [];
    }
    for (const e of entries) {
      this.materialize(e);
      this.audit.push(e);
      this.version = Math.max(this.version, e.version);
    }
  }
}
