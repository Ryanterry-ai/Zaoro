# Build.same — Validated Implementation Plan
**Date:** July 1, 2026  
**Based on:** Actual source code read + ChatGPT document analysis  
**Status:** Authoritative. Every claim verified against source before writing.

---

## What ChatGPT Got Right (Accept)

| Suggestion | Verdict | Reason |
|---|---|---|
| Knowledge Graph as canonical source of truth | ✅ Accept | registry.ts is isolated collections — typed relationships would make planning traversal scalable |
| Skill Packs as micro-products | ✅ Accept | Only 6 skill packs exist currently. Enterprise apps need 12+ |
| Persistent IR at each pipeline stage | ✅ Accept | No stage outputs are persisted for inspection or replay |
| Renderer should receive only ApplicationSpec | ✅ Accept | Renderer currently makes some business decisions |
| 20-app validation milestone before mass expansion | ✅ Accept | Best advice in the entire document |
| "Do not add hundreds of industries immediately" | ✅ Accept | 22 industries is the right number. Validate depth before breadth |
| Design profiles need behavioral UX rules, not just visuals | ✅ Accept | Correct architectural direction |
| Pattern library needs business semantics (rules, flows) | ✅ Accept | Current patterns list pages and components, not business rules |

---

## What ChatGPT Got Wrong (Reject or Defer)

| Suggestion | Verdict | Reason |
|---|---|---|
| References `src/bos/pipeline-v2/` as the brain | ❌ Reject | This directory does not exist. ChatGPT was hallucinating from uploaded file summaries |
| CapabilityGraph, EntityGraph, WorkflowGraph as separate existing stages | ❌ Reject | These do not exist in the codebase. ChatGPT presented aspirational designs as current state |
| "Rewrite the entire pipeline as graph-traversal" | ❌ Reject | BRE v2 pipeline works. Add graph relationships to knowledge layer — don't rewrite the pipeline |
| Business Simulation Engine (1000 simulated users before codegen) | 🔮 Defer indefinitely | Science fiction for current platform. 6+ months to build, low ROI vs gap-fills |
| Self-Evolving Knowledge (ML from build history) | 🔮 Defer | Requires data infrastructure and feedback loops. Year 2 project |
| AI Opportunity Engine (auto-suggest AI features per industry) | 🔮 Defer to Phase 2 | Worth doing eventually; can be handled by enriching skill packs now |
| Architecture Optimizer (full pre-gen optimization pass) | 🔮 Defer | Some of this belongs in skill packs as defaults, not as a pipeline stage |
| Autonomous QA (accessibility, security, SEO, UX, business logic, all at once) | 🔮 Defer | Right direction, wrong scope for now. Phase 1 is compile-pass QA only |

---

## What's Actually True Right Now (From Source)

**Intake parser:** 22 industries (was 12). Now includes enterprise-software, logistics, manufacturing, fintech, proptech. Healthcare has hospital sub-industry. ERP and admin journey detection work. ✅

**Skill packs:** Only 6 exist — `CAP_INVENTORY_LITE, CAP_AUTH, CAP_PAYMENT, CAP_NOTIFICATION, CAP_COMPLIANCE, CAP_ANALYTICS`. Hospital ERP needs appointments, HR, billing, workflow, reporting, document management, audit log, role permissions. None of these exist. ❌

**Patterns:** 23 patterns, all B2C/SMB. No `HOSPITAL_MANAGEMENT`, no `ERP_SYSTEM`, no `HRM_SYSTEM`, no `SCHOOL_LMS`, no `LOGISTICS_PLATFORM`, no `CRM_ENTERPRISE`, no `MANUFACTURING_ERP`. Enterprise prompts fall through to the closest pattern match, which is wrong. ❌

**Knowledge Registry:** Well-structured `KnowledgeRegistry` class. 16 design profiles, 23 patterns, 6 skill packs. Everything is isolated collections. No typed relationship edges between nodes. ❌

**Progress events:** Still console.log regex-parsing in child process. `ProgressEmitter` exists in `src/core/progress-emitter.ts` but is not connected to the build pipeline. ❌

**Repair loop:** `SelfHealingEngine` exists, not called in `handleBuildIntent()`. ❌

**IR Persistence:** None. BREContext, ApplicationBlueprint, ExecutionBlueprint are in-memory only. ❌

**Enterprise patterns:** `ENTERPRISE_CLEAN` design profile exists. No enterprise patterns. ❌

---

## Implementation Phases

Each phase is independently deployable. No phase depends on the next phase being done.

---

## Phase 1 — Enterprise Patterns & Skill Pack Expansion
**Duration:** 5-6 days  
**Unlocks:** "Build ERP for hospitals", "Build HRMS", "Build school LMS", "Build CRM" all produce correct apps without LLM escalation  
**Risk:** Low — additive only, no existing code changes

### 1A: Add Enterprise Patterns (3 days)

Create `src/bos/knowledge/patterns/enterprise-patterns.ts`

Add patterns:
- `HOSPITAL_MANAGEMENT` — departments, wards, patients, staff, appointments, pharmacy, billing, lab, OPD, IPD
- `ERP_SYSTEM` — modules, departments, inventory, procurement, suppliers, finance, reports, audit
- `HRM_SYSTEM` — employee master, attendance, leave, payroll, recruitment, performance, org chart
- `SCHOOL_LMS` — students, classes, courses, teachers, grades, attendance, timetable, fees, parents portal
- `CRM_ENTERPRISE` — leads, pipeline, accounts, contacts, deals, tasks, calls, email integration, reports
- `LOGISTICS_PLATFORM` — shipments, drivers, routes, tracking, warehouses, dispatch, POD, customer portal
- `MANUFACTURING_ERP` — work orders, BOM, production schedule, quality control, machine maintenance, raw materials

Each pattern must include:
```typescript
{
  id: 'pattern.hospital-management',
  name: 'Hospital Management System',
  compatibleIndustries: ['healthcare'],
  compatibleBusinessModels: ['wholesale', 'subscription'],
  departments: ['OPD', 'IPD', 'Emergency', 'Lab', 'Pharmacy', 'Billing', 'HR', 'Admin'],
  roles: ['Administrator', 'Doctor', 'Nurse', 'Receptionist', 'Lab Technician', 'Billing Officer', 'Pharmacist'],
  pages: [
    { path: '/', name: 'Dashboard', sections: ['admin-header', 'stats-cards', 'activity-feed'] },
    { path: '/patients', name: 'Patients', sections: ['admin-header', 'data-table', 'filters'] },
    { path: '/appointments', name: 'Appointments', sections: ['admin-header', 'calendar', 'data-table'] },
    { path: '/doctors', name: 'Doctors', sections: ['admin-header', 'team-grid', 'filters'] },
    { path: '/wards', name: 'Wards', sections: ['admin-header', 'data-table'] },
    { path: '/pharmacy', name: 'Pharmacy', sections: ['admin-header', 'data-table', 'filters'] },
    { path: '/lab', name: 'Lab Reports', sections: ['admin-header', 'data-table'] },
    { path: '/billing', name: 'Billing', sections: ['admin-header', 'data-table', 'charts'] },
    { path: '/staff', name: 'Staff', sections: ['admin-header', 'team-grid'] },
    { path: '/reports', name: 'Reports', sections: ['admin-header', 'charts', 'data-table'] },
  ],
  entities: ['Patient', 'Doctor', 'Nurse', 'Appointment', 'Ward', 'Prescription', 'LabReport', 'Invoice', 'Medicine', 'Department'],
  navigation: { type: 'sidebar', items: ['Dashboard','Patients','Appointments','Doctors','Pharmacy','Lab','Billing','Staff','Reports'] },
  businessRules: [
    'Patient registration requires name, DOB, contact, and insurance',
    'Appointments must have doctor, patient, date, time, department',
    'Prescriptions link to patient, doctor, and medicine inventory',
    'Billing auto-generates from services, medicines, room charges',
  ],
  kpis: ['Daily OPD count', 'Bed occupancy rate', 'Average wait time', 'Revenue per department', 'Discharge rate'],
  integrations: ['compliance.hipaa'],
  vocabulary: { 'Customer': 'Patient', 'Product': 'Medicine', 'Order': 'Prescription', 'User': 'Doctor' },
}
```

Register in `src/bos/knowledge/registry.ts`:
```typescript
import { HOSPITAL_MANAGEMENT, ERP_SYSTEM, HRM_SYSTEM, SCHOOL_LMS, CRM_ENTERPRISE, LOGISTICS_PLATFORM, MANUFACTURING_ERP } from './patterns/enterprise-patterns.js';

export const PATTERNS: Pattern[] = [
  // ... existing patterns ...
  HOSPITAL_MANAGEMENT,
  ERP_SYSTEM,
  HRM_SYSTEM,
  SCHOOL_LMS,
  CRM_ENTERPRISE,
  LOGISTICS_PLATFORM,
  MANUFACTURING_ERP,
];
```

### 1B: Add Enterprise Skill Packs (2 days)

Create `src/bos/knowledge/skill-packs/enterprise-packs.ts`

Add skill packs:
- `CAP_APPOINTMENTS` — calendar UI, availability engine, booking flow, reminders
- `CAP_HR_MANAGEMENT` — employee CRUD, org chart, attendance, leave requests, payroll summary
- `CAP_BILLING_ENTERPRISE` — invoice generation, payment tracking, credit notes, aging report
- `CAP_WORKFLOW_ENGINE` — approval chains, status transitions, notifications, audit trail
- `CAP_REPORTING` — exportable reports, date filters, chart types, scheduled reports
- `CAP_DOCUMENT_MANAGEMENT` — file upload, versioning, tags, search, permissions
- `CAP_ROLE_PERMISSIONS` — role matrix, resource-action mapping, audit log
- `CAP_AUDIT_LOG` — change history per entity, user attribution, export

Register in registry.ts. Each new skill pack wires into the rules engine: when `capabilities` includes 'scheduling', `CAP_APPOINTMENTS` is activated.

**Success criteria:** Prompt "Build ERP for hospitals" → hospital industry detected → hospital sub-industry detected → admin journey added → HOSPITAL_MANAGEMENT pattern selected → 10 pages generated with correct entities → no LLM escalation needed.

---

## Phase 2 — Knowledge Graph Relationships
**Duration:** 4-5 days  
**Unlocks:** Planning traversal is relationship-aware. Requesting a Hospital ERP automatically infers Doctor/Patient/Appointment entities, HIPAA compliance, billing workflows, and appointment skill pack without any explicit keyword matching.  
**Risk:** Medium — adds a new layer, does not replace existing pipeline

### What this is NOT

Not a graph database. Not Neo4j. Not a complete pipeline rewrite.

It is a `KnowledgeGraph` class that holds typed edges between existing knowledge objects and provides a `traverse(startNode: string, relation: string): KnowledgeNode[]` method.

### Implementation

Create `src/bos/knowledge/knowledge-graph.ts`:

```typescript
export type RelationType =
  | 'HAS_ROLE' | 'HAS_DEPARTMENT' | 'HAS_WORKFLOW' | 'HAS_ENTITY'
  | 'USES_SKILL' | 'USES_PATTERN' | 'USES_DESIGN_PROFILE'
  | 'HAS_COMPLIANCE' | 'HAS_KPI' | 'HAS_INTEGRATION'
  | 'REQUIRES_CAPABILITY' | 'SUGGESTS_CAPABILITY'
  | 'BELONGS_TO_INDUSTRY' | 'PART_OF_DEPARTMENT';

export interface KnowledgeEdge {
  from: string;      // node id
  relation: RelationType;
  to: string;        // node id
  weight: number;    // 0–1, used for "98% of hospitals need appointments" later
  evidence?: string; // source of this relationship
}

export interface KnowledgeNode {
  id: string;
  type: 'industry' | 'sub-industry' | 'role' | 'entity' | 'workflow'
      | 'capability' | 'kpi' | 'compliance' | 'integration'
      | 'department' | 'pattern' | 'design-profile' | 'skill-pack';
  label: string;
  metadata?: Record<string, unknown>;
}

export class KnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: KnowledgeEdge[] = [];

  addNode(node: KnowledgeNode): void { this.nodes.set(node.id, node); }
  addEdge(edge: KnowledgeEdge): void { this.edges.push(edge); }

  traverse(fromId: string, relation: RelationType): KnowledgeNode[] {
    return this.edges
      .filter(e => e.from === fromId && e.relation === relation)
      .sort((a, b) => b.weight - a.weight)
      .map(e => this.nodes.get(e.to))
      .filter(Boolean) as KnowledgeNode[];
  }

  traverseReverse(toId: string, relation: RelationType): KnowledgeNode[] {
    return this.edges
      .filter(e => e.to === toId && e.relation === relation)
      .map(e => this.nodes.get(e.from))
      .filter(Boolean) as KnowledgeNode[];
  }
}
```

Create `src/bos/knowledge/graph-builder.ts` — populate the graph from existing registry objects:

```typescript
export function buildKnowledgeGraph(registry: KnowledgeRegistry): KnowledgeGraph {
  const graph = new KnowledgeGraph();

  // Seed from patterns
  for (const pattern of PATTERNS) {
    graph.addNode({ id: pattern.id, type: 'pattern', label: pattern.name });
    for (const industry of pattern.compatibleIndustries) {
      graph.addEdge({ from: `industry.${industry}`, relation: 'USES_PATTERN', to: pattern.id, weight: 1.0 });
    }
    // Add entity nodes and edges from pattern
    for (const entity of (pattern.entities ?? [])) {
      const entityId = `entity.${entity.toLowerCase()}`;
      graph.addNode({ id: entityId, type: 'entity', label: entity });
      graph.addEdge({ from: pattern.id, relation: 'HAS_ENTITY', to: entityId, weight: 1.0 });
    }
    // Add role nodes and edges from pattern
    for (const role of (pattern.roles ?? [])) {
      const roleId = `role.${role.toLowerCase().replace(/\s+/g, '-')}`;
      graph.addNode({ id: roleId, type: 'role', label: role });
      graph.addEdge({ from: pattern.id, relation: 'HAS_ROLE', to: roleId, weight: 1.0 });
    }
    // Add KPI nodes and edges
    for (const kpi of (pattern.kpis ?? [])) {
      const kpiId = `kpi.${kpi.toLowerCase().replace(/\s+/g, '-')}`;
      graph.addNode({ id: kpiId, type: 'kpi', label: kpi });
      graph.addEdge({ from: pattern.id, relation: 'HAS_KPI', to: kpiId, weight: 1.0 });
    }
  }

  // Seed skill pack ↔ capability edges
  for (const skillPack of SKILL_PACKS) {
    graph.addNode({ id: skillPack.id, type: 'skill-pack', label: skillPack.name });
    graph.addEdge({ from: `capability.${skillPack.capability}`, relation: 'USES_SKILL', to: skillPack.id, weight: 1.0 });
  }

  // Seed compliance edges
  for (const compliance of COMPLIANCE_PACKS) {
    graph.addNode({ id: compliance.id, type: 'compliance', label: compliance.name });
    for (const industry of compliance.applicableIndustries) {
      graph.addEdge({ from: `industry.${industry}`, relation: 'HAS_COMPLIANCE', to: compliance.id, weight: 0.9 });
    }
  }

  return graph;
}
```

### Wire graph into BRE v2 pipeline

In `src/bos/bre-v2-pipeline.ts`, after `evaluateConfidence()` and before `BlueprintCompilerV2.compile()`:

```typescript
// New step: graph enrichment
const graph = buildKnowledgeGraph(registry);
const enrichedContext = enrichContextFromGraph(context, graph);
// Then pass enrichedContext to BlueprintCompilerV2
```

Create `src/bos/knowledge/context-enricher.ts`:

```typescript
export function enrichContextFromGraph(ctx: BREContext, graph: KnowledgeGraph): BREContext {
  const enriched = { ...ctx };

  // Find best matching pattern for this industry + journey
  const patternNodes = graph.traverse(`industry.${ctx.industry}`, 'USES_PATTERN');
  const bestPattern = patternNodes[0]; // highest weight = best match

  if (bestPattern) {
    // Pull entities from graph instead of static industry mapping
    const entityNodes = graph.traverse(bestPattern.id, 'HAS_ENTITY');
    if (entityNodes.length > 0) {
      enriched.entities = entityNodes.map(n => n.label);
    }
    // Pull roles and add as journey signals
    const roleNodes = graph.traverse(bestPattern.id, 'HAS_ROLE');
    enriched.roles = roleNodes.map(n => n.label);
    // Pull KPIs
    const kpiNodes = graph.traverse(bestPattern.id, 'HAS_KPI');
    enriched.kpis = kpiNodes.map(n => n.label);
  }

  // Pull compliance from graph
  const complianceNodes = graph.traverse(`industry.${ctx.industry}`, 'HAS_COMPLIANCE');
  const graphComplianceIds = complianceNodes.map(n => n.id);
  enriched.compliancePacks = [...new Set([...ctx.compliancePacks, ...graphComplianceIds])];

  return enriched;
}
```

**Success criteria:** After graph enrichment, "Build ERP for hospitals" produces `roles: ["Administrator","Doctor","Nurse","Receptionist","Billing Officer","Pharmacist"]`, `kpis: ["Daily OPD count","Bed occupancy rate","Average wait time"]`, `entities: ["Patient","Doctor","Appointment","Ward","Prescription","LabReport","Invoice","Medicine","Department"]` — all from graph traversal, no LLM call.

---

## Phase 3 — Progress Events & Repair Loop
**Duration:** 2-3 days  
**Unlocks:** Live build timeline shows structured events. TypeScript errors in generated code trigger repair attempts.  
**Risk:** Low — ProgressEmitter already exists

### 3A: Wire ProgressEmitter

`src/core/progress-emitter.ts` already exists. The build queue child-process script currently emits events via `console.log` regex. Replace with structured emissions:

In `src/agents/deterministic-orchestrator-v4.ts`, inject a ProgressEmitter instance and call it at each stage:

```typescript
emitter.emit({ stage: 'intake', status: 'running', message: 'Parsing prompt', data: { prompt } });
// after buildBREContext:
emitter.emit({ stage: 'intake', status: 'done', message: 'Context built', data: { industry, capabilities, journeys } });

emitter.emit({ stage: 'planning', status: 'running', message: 'Running BRE v2 pipeline' });
// after runBREV2Pipeline:
emitter.emit({ stage: 'planning', status: 'done', message: 'Blueprint compiled', data: { pageCount, entityCount, confidence } });

emitter.emit({ stage: 'generation', status: 'running', message: 'Rendering files' });
// after ReactRenderer:
emitter.emit({ stage: 'generation', status: 'done', message: 'Files generated', data: { fileCount } });
```

In `src/server.ts`, add SSE endpoint:
```typescript
// GET /api/workspace/:id/events
// Streams ProgressEvents as server-sent events
// Client subscribes: new EventSource('/api/workspace/id/events')
```

In workspace page, replace polling with SSE listener.

### 3B: Wire Repair Loop

In `src/agents/deterministic-orchestrator-v4.ts`, after file writing, add TypeScript compilation check:

```typescript
// After files written:
const tsResult = await runTypeScriptCheck(workspace.rootPath);
if (tsResult.errors.length > 0) {
  emitter.emit({ stage: 'repair', status: 'running', message: `Fixing ${tsResult.errors.length} TypeScript errors` });
  await SelfHealingEngine.repairErrors(workspace, tsResult.errors, llmConfig);
  emitter.emit({ stage: 'repair', status: 'done', message: 'Repair complete' });
}
```

**Success criteria:** Build events appear in the workspace UI as structured objects with stage, status, message, data. TypeScript errors after generation trigger a repair attempt.

---

## Phase 4 — IR Persistence & Inspector
**Duration:** 3 days  
**Unlocks:** Users can inspect BREContext, ApplicationBlueprint, ExecutionBlueprint, and ApplicationSpec from the workspace UI. Developers can debug why a specific app was generated the way it was.  
**Risk:** Low — additive only

### 4A: Persist IR artifacts

After each pipeline stage, write to workspace:

```
workspace/
  .build-artifacts/
    bre-context.json        ← after intake-parser
    graph-enrichment.json   ← after knowledge graph enrichment
    rule-decisions.json     ← after rules engine
    confidence-gate.json    ← after confidence evaluation
    application-blueprint.json ← after BlueprintCompilerV2
    execution-blueprint.json   ← after execution-planner
    application-spec.json      ← after content-resolver
    render-result.json         ← after renderer (file list only)
    build-report.json          ← final build summary
```

In orchestrator, after each stage:
```typescript
fs.writeFileSync(
  path.join(workspace.rootPath, '.build-artifacts', 'bre-context.json'),
  JSON.stringify(breContext, null, 2)
);
```

### 4B: Expose via API

In `src/server.ts`:
```
GET /api/workspace/:id/artifacts          → list artifact names
GET /api/workspace/:id/artifacts/:name    → return specific artifact JSON
```

### 4C: Inspector tab in workspace UI

In `web/src/app/workspace/[id]/page.tsx`, add "Inspector" tab alongside Preview and Files:

Inspector shows a sidebar list of all artifacts. Clicking one shows the JSON tree with:
- Key fields highlighted
- Producer (which stage created it)
- Consumer (which stage reads it)
- Validation warnings from build

**Success criteria:** After any build, user can click "Inspector" → click "bre-context" → see exactly what industry/capabilities/journeys/entities were detected → understand why the generated app looks the way it does.

---

## Phase 5 — Homepage & Workspace UX Redesign
**Duration:** 4-5 days  
**Unlocks:** Platform looks and feels like a premium AI builder. First impression communicates "I build software for any business."  
**Risk:** Low — frontend only, no pipeline changes

### 5A: Homepage redesign (`web/src/app/page.tsx`)

Replace current minimal page with:

**Hero section:**
- Large headline: "Build software for any business"
- Subheadline: "Describe your business in plain English. Get a complete, working application."
- Large prompt composer (full-width textarea, placeholder examples cycle through)
- Build button with keyboard shortcut hint

**Example gallery (below hero):**
- 8 clickable example cards grouped by category:
  - Healthcare: "Hospital management system", "Dental clinic portal"
  - Enterprise: "ERP for manufacturing", "HR management platform"
  - Service: "Gym membership app", "Law firm CRM"
  - Commerce: "Fashion marketplace", "Restaurant POS"
- Each card is clickable — fills the prompt composer

**Capability showcase (3 columns):**
- "22 Industries understood" with industry icons
- "Deterministic planning" with pipeline diagram thumbnail
- "Production-ready code" with code sample thumbnail

**Recent builds** (from build history API — if no history, show 4 sample screenshots)

**Build mode tabs:** "Build" (from description) | "Clone" (from URL) | "Template" (from template gallery)

### 5B: Workspace build timeline

Replace current event log with a proper phase-based activity timeline:

```
Phase 1: Understanding Business
  ✅ Industry: Healthcare (hospital sub-industry)
  ✅ Journeys: Visitor, Customer, Admin
  ✅ Capabilities: booking, crm, analytics, scheduling, reporting
  Duration: 0.3s

Phase 2: Planning Application
  ✅ Pattern selected: Hospital Management System
  ✅ Entities: Patient, Doctor, Appointment, Ward (+7 more)
  ✅ Blueprint compiled: 10 pages, 47 components
  ✅ Confidence: 0.87 (deterministic path)
  Duration: 0.8s

Phase 3: Generating Code
  ✅ Rendering 10 pages
  ✅ Scaffolding Prisma schema (10 models)
  ✅ Compiling 8 API routes
  ✅ Running npm install
  Duration: 12.4s

Phase 4: Quality Check
  ✅ TypeScript: 0 errors
  ✅ Build: Passed
  ✅ Preview: Ready
  Duration: 8.1s
```

Each phase is expandable to show raw events. Total build time shown at top.

**Success criteria:** Homepage clearly communicates platform capability. Build timeline shows what was understood about the business, not just file names.

---

## Phase 6 — 20-App Validation
**Duration:** 3-4 days  
**Unlocks:** Confidence that the architecture is proven across diverse domains before expanding the knowledge base  
**Risk:** Low — testing only, exposes gaps

Run every one of ChatGPT's 20 validation apps through the platform and score each on:

| Test | Prompt |
|---|---|
| 1 | Build hospital ERP |
| 2 | Build restaurant point of sale system |
| 3 | Build school learning management system |
| 4 | Build logistics and fleet management platform |
| 5 | Build multi-vendor marketplace |
| 6 | Build enterprise CRM with pipeline |
| 7 | Build HR management and payroll system |
| 8 | Build manufacturing ERP |
| 9 | Build gym membership and class booking app |
| 10 | Build real estate listing portal |
| 11 | Build law firm case management system |
| 12 | Build hotel booking and management system |
| 13 | Build nonprofit donor management platform |
| 14 | Build construction project management system |
| 15 | Build warehouse management system |
| 16 | Build banking dashboard |
| 17 | Build insurance policy management portal |
| 18 | Build event venue management system |
| 19 | Build travel agency booking platform |
| 20 | Build dental clinic management system |

For each, score:
- Industry correctly detected (0/1)
- Sub-industry detected (0/1)
- Correct pattern selected (0/1)
- Admin journey included where expected (0/1)
- Entity list is domain-correct (0–3)
- Page list is domain-correct (0–3)
- No LLM escalation needed (0/1)
- TypeScript compiles (0/1)

Target: 80+ out of 120 points before proceeding to Phase 7.

Document every failure. Each failure is a specific gap in a specific file. Fix the gap, rerun. This is the proof that the architecture is sound.

---

## Phase 7 — Business Rules in Patterns (Post-Validation)
**Duration:** 3-4 days  
**Unlocks:** Generated apps include real business logic scaffolding — not just empty CRUD forms  
**Risk:** Medium — changes what gets generated, needs careful testing

### What this means

Current pattern: `RESTAURANT_BOOKING` lists pages and navigation. Users get a shell.

Target pattern: `RESTAURANT_BOOKING` also includes business rules that inform code generation:

```typescript
businessRules: [
  { rule: 'Reservation requires: date, time, party_size, name, phone', affects: 'Reservation.create form validation' },
  { rule: 'Table capacity cannot be exceeded', affects: 'Reservation.availability check' },
  { rule: 'Cancellation window is 2 hours before reservation', affects: 'Reservation.cancel logic' },
  { rule: 'Kitchen closes 30 minutes before restaurant closing time', affects: 'Reservation.time_slots' },
],
```

These rules become:
- Form validation comments in generated TSX
- TypeScript interface field comments
- Prisma schema constraints (`@default`, `@unique`, relationship enforcements)
- API route validation logic stubs

The renderer consumes `pattern.businessRules` and generates code comments and validation stubs from them. This is the highest-leverage non-LLM change: real business context in every generated file.

---

## What We Explicitly Are NOT Building (This Year)

| Feature | Reason |
|---|---|
| Business Simulation Engine | Requires running 1000 virtual users through a simulated workflow engine. 6+ months. |
| Self-Evolving Knowledge Graph | Requires build history database, feedback collection, ML pipeline. Year 2. |
| AI Opportunity Engine | Out of scope — we generate software that uses AI, we don't decide AI strategy for businesses. |
| Neo4j or graph database | Not needed. TypeScript typed object graph in KnowledgeGraph class is sufficient. |
| Universal Software Compiler | Era 4 vision. 3+ years away. Build the foundation first. |
| Full rewrite of BRE v2 as graph traversal | Too risky. The pipeline works. Add graph enrichment on top of it. |
| Autonomous QA suite | Phase 3 adds TypeScript repair. Full QA (accessibility, security, SEO) is a separate product. |
| v0 / WebContainers integration | Correct direction, but second after planning gaps are closed. Revisit after Phase 6 validation. |

---

## Summary Execution Order

```
Week 1
  Phase 1A: Enterprise patterns (HOSPITAL_MANAGEMENT, ERP_SYSTEM, HRM_SYSTEM, SCHOOL_LMS, CRM_ENTERPRISE, LOGISTICS_PLATFORM, MANUFACTURING_ERP)
  Phase 1B: Enterprise skill packs (CAP_APPOINTMENTS, CAP_HR_MANAGEMENT, CAP_BILLING_ENTERPRISE, CAP_WORKFLOW_ENGINE, CAP_REPORTING, CAP_DOCUMENT_MANAGEMENT, CAP_ROLE_PERMISSIONS, CAP_AUDIT_LOG)

Week 2
  Phase 2: Knowledge Graph layer (KnowledgeGraph class + KnowledgeEdge types + graph builder + context enricher + wire into BRE v2)

Week 3
  Phase 3A: ProgressEmitter wiring + SSE endpoint + workspace SSE client
  Phase 3B: Repair loop activation (TypeScript check + SelfHealingEngine call)
  Phase 4A+B: IR persistence (write artifacts to .build-artifacts/) + API endpoints

Week 4
  Phase 4C: Inspector tab in workspace UI
  Phase 5A: Homepage redesign
  Phase 5B: Build timeline UI

Week 5
  Phase 6: 20-app validation run, document failures, fix gaps
  Phase 7 prep: Review pattern businessRules schema additions needed

Week 6
  Phase 7: Business rules in patterns
  Fix any Phase 6 failures that need pattern/skill pack additions
  Final review: Run 20-app validation again, target 80/120
```

---

## Decision Rule for New Suggestions

Before accepting any new suggestion (from ChatGPT, from anyone, or from ourselves):

1. **Read the actual source file it claims to affect.** If the file doesn't exist as described, it's speculation.
2. **Is it additive or a rewrite?** Additive = lower risk. Rewrite = needs proof that existing behavior breaks.
3. **Does it unblock a user today?** If not, which phase does it belong to?
4. **What is the smallest working version of this idea?** Start there.
5. **Does it conflict with anything in BRE v2 that currently works?** If yes, design a bridge layer, not a replacement.

*This plan reflects the actual state of the codebase as of July 1, 2026 and was written only after reading the source.*
