# Build.Anything — Examples

## Basic Prompts

```
/build-anything "Build a Hospital ERP"
```

```
/build-anything "Build a premium SaaS landing page"
```

```
/build-anything "Build a Kanban-style project management tool with team collaboration and time tracking"
```

## URL-based

```
/build-anything "https://example.com — clone this design for my coffee shop"
```

## Detailed prompts

```
/build-anything "Build a HIPAA-compliant practice management system for multi-specialty clinics. Features: patient registration, scheduling, EHR, e-prescribing, billing, patient portal, telehealth, lab integration."
```

```
/build-anything "Build an ecommerce platform for a boutique fashion brand. Single-vendor, custom designs, limited drops. Features: product catalog with categories, shopping cart, checkout with Stripe, order tracking, admin panel for inventory management, blog, newsletter signup. Target: fashion-forward 25-45 demographic."
```

## Expected Output

Every invocation produces:
- Full pipeline execution report
- Generated artifacts (pages, components, API routes, database schema)
- Execution metadata (duration, files, entities, APIs)
- Next-step recommendations

## Stage Output Reference

| Stage | Artifact Key | Example Content |
|-------|-------------|-----------------|
| Project Intake | `manifest` | `{ id, description, domain, techStack }` |
| Research | `research.domain` | Competitive analysis, market positioning |
| Business Analysis | `requirements` | User stories, feature list, entities |
| Architecture | `architecture.system` | System diagram, component relationships |
| Database Design | `database.schema` | Tables, columns, indexes, relationships |
| API Design | `api.endpoints` | Routes, methods, request/response schemas |
| Design Intelligence | `design.tokens` | Colors, typography, spacing, motion |
| Frontend Design | `frontend.pages` | Page layouts, component hierarchy |
| Validation | `validation.report` | Schema, semantic, cross-stage validation |
| Review Board | `review.issues` | Code review findings, suggestions |
| Self-Healing | `self-heal.result` | Fixes applied, remaining issues |
| Execution Report | `execution.report` | Full pipeline summary with metrics |
