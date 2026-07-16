# Intelligence Layer Dependency Graph

## Pipeline Order (Strict)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INTELLIGENCE PIPELINE                              │
│                                                                             │
│  ┌──────────────────┐                                                       │
│  │  User Prompt     │                                                       │
│  └────────┬─────────┘                                                       │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Business         │  Owns: BusinessKnowledge                              │
│  │ Intelligence     │  Consumes: User Prompt                                │
│  └────────┬─────────┘  Produces: BusinessKnowledge                          │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Knowledge        │  Owns: EvidenceCollection                             │
│  │ Acquisition      │  Consumes: BusinessKnowledge                          │
│  └────────┬─────────┘  Produces: EvidenceCollection                         │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Experience       │  Owns: ExperienceBlueprint                            │
│  │ Intelligence     │  Consumes: BusinessKnowledge                          │
│  └────────┬─────────┘  Produces: ExperienceBlueprint                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Design           │  Owns: DesignDecision                                 │
│  │ Intelligence     │  Consumes: BusinessKnowledge + ExperienceBlueprint    │
│  └────────┬─────────┘  Produces: DesignDecision                             │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Content          │  Owns: ContentBlueprint                               │
│  │ Intelligence     │  Consumes: BusinessKnowledge + ExperienceBlueprint    │
│  └────────┬─────────┘  Produces: ContentBlueprint                           │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Technology       │  Owns: SolutionArchitecture                           │
│  │ Planner          │  Consumes: BusinessKnowledge + ExperienceBlueprint    │
│  └────────┬─────────┘            + ContentBlueprint                         │
│           │                    Produces: SolutionArchitecture                │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Application      │  Owns: ApplicationBlueprint                           │
│  │ Blueprint        │  Consumes: All upstream artifacts                     │
│  └────────┬─────────┘  Produces: ApplicationBlueprint                       │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Execution        │  Owns: ExecutionBlueprint                             │
│  │ Blueprint        │  Consumes: ApplicationBlueprint                       │
│  └────────┬─────────┘  Produces: ExecutionBlueprint                         │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Renderer         │  Owns: Code Generation ONLY                           │
│  │                  │  Consumes: ExecutionBlueprint                         │
│  └────────┬─────────┘  Produces: RendererOutput (code files)                │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Quality Gates    │  Validates all artifacts                              │
│  └────────┬─────────┘                                                       │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Preview          │  Renders preview                                       │
│  └────────┬─────────┘                                                       │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │ Deployment       │  Deploys to target                                    │
│  └──────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Layer Details

| Layer | Consumes | Produces | Owner | Dependencies |
|-------|----------|----------|-------|--------------|
| **Business Intelligence** | User Prompt | BusinessKnowledge | BusinessKnowledge | None |
| **Knowledge Acquisition** | BusinessKnowledge | EvidenceCollection | EvidenceCollection | Business Intelligence |
| **Experience Intelligence** | BusinessKnowledge | ExperienceBlueprint | ExperienceBlueprint | Business Intelligence |
| **Design Intelligence** | BusinessKnowledge, ExperienceBlueprint | DesignDecision | DesignDecision | Business Intelligence, Experience Intelligence |
| **Content Intelligence** | BusinessKnowledge, ExperienceBlueprint | ContentBlueprint | ContentBlueprint | Business Intelligence, Experience Intelligence |
| **Technology Planner** | BusinessKnowledge, ExperienceBlueprint, ContentBlueprint | SolutionArchitecture | SolutionArchitecture | Business Intelligence, Experience Intelligence, Content Intelligence |
| **Application Blueprint** | All upstream | ApplicationBlueprint | ApplicationBlueprint | All layers |
| **Execution Blueprint** | ApplicationBlueprint | ExecutionBlueprint | ExecutionBlueprint | Application Blueprint |
| **Renderer** | ExecutionBlueprint | Code Files | RendererOutput | Execution Blueprint |

## Circular Dependency Check

✅ **No circular dependencies detected.**

All dependencies flow in one direction: upstream → downstream.

## Ownership Verification

| Artifact | Owner | Can Override? | Can Infer? |
|----------|-------|---------------|------------|
| BusinessKnowledge | Business Intelligence | No | No |
| EvidenceCollection | Knowledge Acquisition | No | No |
| ExperienceBlueprint | Experience Intelligence | No | No |
| DesignDecision | Design Intelligence | No | No |
| ContentBlueprint | Content Intelligence | No | No |
| SolutionArchitecture | Technology Planner | No | No |
| ApplicationBlueprint | Application Blueprint | No | No |
| ExecutionBlueprint | Execution Blueprint | No | No |
| Code Files | Renderer | No | No |

## Provenance Requirements

Every field in every artifact must have:
- `layer`: Which layer created it
- `confidence`: Confidence level (0-1)
- `evidence`: Supporting evidence
- `timestamp`: When it was created
- `reasoning`: Why it was created
