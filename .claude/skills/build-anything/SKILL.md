---
name: build-anything
description: Orchestrate a multi-stage pipeline to analyze, design, and plan any software project. Produces a complete blueprint with architecture, database schema, API design, frontend design, testing strategy, deployment plan, and documentation.
---

# /build-anything

Orchestrate a modular, resumable pipeline that analyzes requirements and produces a complete project blueprint. This skill does NOT generate code — it produces structured design artifacts that a code-generation step can consume later.

## Architecture

```
User Input
    │
    ▼
Intent Router          ← detects: prompt, website, PRD, figma, codebase, database
    │
    ▼
BOS Loader             ← detects industry, loads knowledge pack
    │
    ▼
Shared Orchestrator
    │
    ├── project-intake
    ├── research
    ├── business-analysis
    ├── architecture
    ├── database-design
    ├── api-design
    ├── frontend-design
    ├── integration
    ├── quality-assurance
    ├── deployment
    └── documentation
    │
    ▼
Quality Gates          ← validates artifacts between stages
    │
    ▼
Output                 ← JSON artifacts + Markdown documentation
```

## When to use this skill

- User describes a software project and wants a full design/blueprint
- User wants architecture, database, API, and frontend design for a project
- User provides a URL, PRD, Figma link, codebase path, or database connection
- User wants a structured plan before building

## Usage

### From Claude Desktop

```
/build-anything "Build a SaaS project management tool with team collaboration, Kanban boards, and time tracking"
```

### Programmatic

```typescript
import { Orchestrator, LLMAdapter } from './src/orchestration/index.js';

const orchestrator = new Orchestrator({
  maxConcurrency: 3,
  workingDirectory: '.build-anything',
  contextBudgetTokens: 100_000,
  dualOutput: true,
});

orchestrator.setLLMAdapter(new LLMAdapter());

orchestrator.on('stage:complete', (event) => {
  console.log(`Done: ${event.stageId}`);
});

// From a prompt
const result = await orchestrator.run('Build a SaaS tool...');

// From a URL
const result = await orchestrator.run('https://example.com');

// From a manifest
const result = await orchestrator.runFromManifest(manifest);
```

## Key Features

### Intent Routing
Automatically detects input type (prompt, website, PRD, Figma, codebase, database) and routes to the appropriate intake path. All paths converge on the same orchestrator.

### BOS (Business Operating System)
Detects the project's industry and loads reusable knowledge packs with:
- Industry-specific entities and relationships
- Compliance requirements and checklists
- Common integrations
- Typical user journeys
- Domain-specific prompts for each stage

Built-in industries: ecommerce, saas, restaurant, fitness, healthcare, education, fintech, real-estate, media, portfolio, marketplace, nonprofit.

### Context Budget Management
Tracks token usage across the pipeline to stay within Claude Desktop's context limits. Automatically summarizes large artifacts between stages.

### Quality Gates
Validates artifact quality between stages:
- Manifest validation after intake
- Research completeness after research
- Requirements validation after business analysis
- Architecture validation after design
- API design validation
- Frontend design validation

### Human Approval
Optional approval checkpoints between stages. Configure with:
```typescript
const orchestrator = new Orchestrator({
  requireApproval: true,
  approvalHandler: {
    requestApproval: async (approval) => {
      // Show to user, get decision
      return { ...approval, status: 'approved' };
    }
  }
});
```

### Dual Output
Every stage produces both:
- **JSON artifacts**: Machine-readable structured data
- **Markdown documentation**: Human-readable documentation

### Checkpoint / Resume
Pipeline state is persisted after each stage. If interrupted, re-running resumes from the last completed stage.

## Artifacts produced

| Artifact Key | Description |
|---|---|
| `manifest` | Structured project manifest |
| `research.domain` | Domain research |
| `research.competitive` | Competitive analysis |
| `requirements` | User stories, features, risks |
| `features` | Prioritized feature list |
| `architecture.system` | System architecture |
| `architecture.tech-stack` | Technology stack |
| `database.schema` | Database design |
| `api.endpoints` | API endpoints |
| `api.auth` | Authentication design |
| `frontend.pages` | Page layouts |
| `frontend.components` | Component hierarchy |
| `frontend.design-tokens` | Design system |
| `integrations` | Third-party integrations |
| `qa.plan` | Testing strategy |
| `qa.quality-gates` | Quality gates |
| `deployment.config` | Deployment plan |
| `docs.readme` | README documentation |
| `docs.api` | API documentation |

## LLM Providers

Set environment variables for any supported provider:
```bash
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

## Extending the Pipeline

### Custom Stages
```typescript
orchestrator.registerStage(myCustomStage);
```

### Custom BOS Packs
```typescript
orchestrator.getBOSLoader().registerPack(myIndustryPack);
```

### Custom Quality Gates
```typescript
const orchestrator = new Orchestrator({
  qualityGates: [...DEFAULT_QUALITY_GATES, myCustomGate],
});
```

## Constraints

- This skill produces **design artifacts only** — no code generation
- All content is stored in structured data (JSON), never hardcoded
- No LLM call spans more than one stage
- Every stage validates its own output before passing downstream
- Context budget is tracked to stay within Claude Desktop limits
