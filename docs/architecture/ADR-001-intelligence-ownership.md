# ADR-001: Intelligence Layer Ownership

## Status

**Accepted** — 2026-07-10

## Context

The /build-anything platform is evolving into a deterministic intelligence pipeline with strict ownership boundaries. As the system grows, duplicated intelligence across layers creates conflicting decisions, hidden inference, and maintenance burden.

This ADR permanently defines ownership rules for all intelligence layers. Every future contributor (Claude, Opencode, Codex, Gemini, etc.) must follow these rules before changing the architecture.

## Decision

Establish strict ownership boundaries where each layer has exactly one responsibility and owns exactly one canonical artifact. No downstream layer may infer, recreate, or override knowledge owned by upstream layers.

## Layer Responsibilities

### 1. Business Intelligence

**Owns:** `BusinessKnowledge`

**Responsibilities:**
- Industry classification
- Business type determination
- Sub-industry identification
- Customer personas
- Business workflows
- Domain entities
- Revenue models
- Customer journey mapping
- Compliance requirements
- KPIs and metrics
- Business vocabulary

**Canonical Artifact:** `BusinessKnowledge.json`

**Allowed Inputs:**
- User prompt
- Uploaded documents
- Web research (via Knowledge Acquisition)

**Forbidden:**
- Must NOT decide experience flow
- Must NOT decide visual design
- Must NOT decide content strategy
- Must NOT decide technology stack

---

### 2. Knowledge Acquisition

**Owns:** `EvidenceCollection`

**Responsibilities:**
- Web research and scraping
- Competitor analysis
- Market research
- Evidence collection
- Source verification
- Confidence scoring
- Provenance tracking

**Canonical Artifact:** `EvidenceCollection.json`

**Allowed Inputs:**
- BusinessKnowledge
- User-provided URLs
- User-provided documents
- API specifications
- Figma files
- Screenshots

**Forbidden:**
- Must NOT decide business logic
- Must NOT decide experience flow
- Must NOT decide visual design
- Must NOT decide content strategy

---

### 3. Experience Intelligence

**Owns:** `ExperienceBlueprint`

**Responsibilities:**
- Storytelling flow
- Section ordering
- Cinematic sequences
- Scroll narrative
- Motion language
- Hover philosophy
- Interaction philosophy
- Reveal timing
- Transition choreography
- Engagement pacing
- Emotional curve
- Visual rhythm
- Conversion moments
- Engagement moments
- Pause moments
- Micro-interactions
- Parallax strategy
- Sticky sections
- Performance budget

**Canonical Artifact:** `ExperienceBlueprint.json`

**Allowed Inputs:**
- BusinessKnowledge

**Forbidden:**
- Must NOT decide business logic
- Must NOT decide visual design (colors, typography)
- Must NOT decide content strategy
- Must NOT decide backend architecture

---

### 4. Design Intelligence

**Owns:** `DesignDecision`

**Responsibilities:**
- Design tokens
- Color palettes
- Typography systems
- Spacing scales
- Grid systems
- Icon systems
- Illustration style
- Photography direction
- Component styling
- Visual hierarchy

**Canonical Artifact:** `DesignDecision.json`

**Allowed Inputs:**
- BusinessKnowledge
- ExperienceBlueprint

**Forbidden:**
- Must NOT decide business logic
- Must NOT decide experience flow
- Must NOT decide content strategy
- Must NOT decide technology stack

---

### 5. Content Intelligence

**Owns:** `ContentBlueprint`

**Responsibilities:**
- Messaging hierarchy
- CTA strategy
- Feature ordering
- Copywriting direction
- Value propositions
- Social proof strategy
- FAQ strategy
- Media requirements
- Voice and tone

**Canonical Artifact:** `ContentBlueprint.json`

**Allowed Inputs:**
- BusinessKnowledge
- ExperienceBlueprint

**Forbidden:**
- Must NOT decide business logic
- Must NOT decide experience flow
- Must NOT decide visual design
- Must NOT decide technology stack

---

### 6. Technology Planner

**Owns:** `SolutionArchitecture`

**Responsibilities:**
- Framework selection
- Frontend technology
- Backend technology
- Database technology
- Authentication strategy
- Deployment strategy
- Third-party integrations
- Infrastructure configuration

**Canonical Artifact:** `SolutionArchitecture.json`

**Allowed Inputs:**
- BusinessKnowledge
- ExperienceBlueprint
- ContentBlueprint

**Forbidden:**
- Must NOT decide UI/visual system
- Must NOT decide experience flow
- Must NOT decide business logic

---

### 7. Application Blueprint

**Owns:** `ApplicationBlueprint`

**Responsibilities:**
- Page structure
- Navigation hierarchy
- Dashboard layouts
- Component hierarchy
- Entity relationships
- Workflow definitions
- API contracts
- State management
- Data flow

**Canonical Artifact:** `ApplicationBlueprint.json`

**Allowed Inputs:**
- All upstream artifacts

**Forbidden:**
- Must NOT decide business logic (consumes from BusinessKnowledge)
- Must NOT decide experience flow (consumes from ExperienceBlueprint)
- Must NOT decide visual design (consumes from DesignDecision)
- Must NOT decide content strategy (consumes from ContentBlueprint)
- Must NOT decide technology stack (consumes from SolutionArchitecture)

---

### 8. Execution Blueprint

**Owns:** `ExecutionBlueprint`

**Responsibilities:**
- Execution graph
- Dependency ordering
- Generation order
- File graph
- Build plan
- Renderer instructions
- Quality gate configuration

**Canonical Artifact:** `ExecutionBlueprint.json`

**Allowed Inputs:**
- ApplicationBlueprint

**Forbidden:**
- Must NOT decide business logic
- Must NOT decide experience flow
- Must NOT decide visual design
- Must NOT decide content strategy
- Must NOT decide technology stack

---

### 9. Renderer

**Owns:** Code Generation ONLY

**Responsibilities:**
- TSX/JSX generation
- CSS generation
- HTML generation
- Flutter widget generation
- FastAPI code generation
- Filesystem output

**Canonical Artifact:** `RendererOutput` (generated files)

**Allowed Inputs:**
- ExecutionBlueprint

**Forbidden:**
- Must NOT decide business logic
- Must NOT decide experience flow
- Must NOT decide visual design
- Must NOT decide content strategy
- Must NOT decide technology stack
- Must NOT infer navigation, pages, interactions
- Must NOT infer workflows, entities, revenue models

**The renderer is a dumb execution engine. It does not think. It does not decide. It does not infer. It simply renders the blueprints into code.**

---

## Allowed Dependencies

```
Business Intelligence → (no dependencies)
Knowledge Acquisition → Business Intelligence
Experience Intelligence → Business Intelligence
Design Intelligence → Business Intelligence, Experience Intelligence
Content Intelligence → Business Intelligence, Experience Intelligence
Technology Planner → Business Intelligence, Experience Intelligence, Content Intelligence
Application Blueprint → All upstream layers
Execution Blueprint → Application Blueprint
Renderer → Execution Blueprint
```

## Forbidden Dependencies

- No circular dependencies
- No downstream layer may depend on another downstream layer at the same level
- No layer may depend on a layer that comes after it in the pipeline

## Pipeline Order

```
1. Business Intelligence
2. Knowledge Acquisition
3. Experience Intelligence
4. Design Intelligence
5. Content Intelligence
6. Technology Planner
7. Application Blueprint
8. Execution Blueprint
9. Renderer
```

## Migration Status

| Layer | Status | Violations Fixed | Files Changed | Report |
|-------|--------|------------------|---------------|--------|
| Business Intelligence | ✅ Complete | 10/18 | 4 | `docs/reports/business-intelligence-ownership.md` |
| Knowledge Acquisition | ✅ Complete | 0/0 | 0 | N/A |
| Experience Intelligence | ✅ Complete | 0/15 | 0 | `docs/reports/experience-intelligence-ownership.md` |
| Design Intelligence | ✅ Complete | 0/13 | 0 | `docs/reports/design-intelligence-ownership.md` |
| Content Intelligence | ✅ Complete | 0/4 | 0 | `docs/reports/content-intelligence-ownership.md` |
| Technology Planner | ✅ Complete | 0/9 | 0 | `docs/reports/technology-planner-ownership.md` |
| Application Blueprint | ✅ Complete | 0/0 | 0 | N/A |
| Execution Blueprint | ✅ Complete | 0/0 | 0 | N/A |
| Renderer | ✅ Complete | 0/0 | 0 | N/A |

## Enforcement Rules

1. **No new violations**: Any new code that creates a duplicate intelligence path must be rejected.

2. **Provenance required**: Every field in every artifact must have provenance (layer, confidence, evidence, timestamp, reasoning).

3. **Debug artifacts**: Every build must export debug artifacts to `.build-anything/traces/`.

4. **TypeScript verification**: Every change must pass `npx tsc --noEmit`.

5. **Test verification**: Every change must pass existing tests.

6. **Dependency graph**: The dependency graph must remain acyclic after every change.

## Consequences

### Positive
- Single source of truth for every decision
- No conflicting intelligence
- Clear responsibility boundaries
- Easier debugging (check the owning layer)
- Easier testing (test each layer independently)
- Easier maintenance (change one layer, verify impact)

### Negative
- Initial migration cost
- May require refactoring existing code
- Must update all consumers of deprecated paths

## Related ADRs

- ADR-002: Provenance Tracking (planned)
- ADR-003: Quality Gates (planned)
- ADR-004: Observability (planned)

## References

- `docs/dependency-graph.md`
- `docs/ownership-verification.md`
- `docs/phase-2-complete.md`
