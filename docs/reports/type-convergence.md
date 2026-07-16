# Type Convergence Report

## Summary

Found **17 type names with duplicates**, totaling **34 duplicate definitions** across the codebase. The duplicates exist between the newer **Orchestration Pipeline** and the older **BRE Pipeline**.

## Critical Duplicates

### 1. ExperienceBlueprint (2 definitions)
- **Canonical**: `src/orchestration/experience-intelligence/types.ts`
- **Duplicate**: `src/orchestration/design-intelligence/types-experience.ts`
- **Action**: Remove duplicate, update consumers

### 2. ApplicationBlueprint (3 definitions)
- **Canonical**: `src/orchestration/application-blueprint/types.ts`
- **Duplicate 1**: `src/bos/schemas/blueprint/application-blueprint.schema.ts`
- **Duplicate 2**: `src/business-intelligence/solution-architect.ts`
- **Action**: Remove duplicates, update consumers

### 3. ExecutionBlueprint (2 definitions)
- **Canonical**: `src/orchestration/execution-blueprint/types.ts`
- **Duplicate**: `src/bos/schemas/blueprint/execution-blueprint.schema.ts`
- **Action**: Remove duplicate, update consumers

### 4. SolutionArchitecture vs SolutionArchitectureDecision
- **Canonical**: `src/orchestration/technology-planner/types.ts` (SolutionArchitecture)
- **Legacy**: `src/bos/types-solution-architecture.ts` (SolutionArchitectureDecision)
- **Action**: Create adapter, deprecate legacy

### 5. Platform, DatabaseConfig (2 definitions each)
- **Canonical**: `src/orchestration/technology-planner/types.ts`
- **Duplicate**: `src/bos/types-solution-architecture.ts`
- **Action**: Remove duplicates

### 6. BusinessWorkflow (2 definitions)
- **Canonical**: `src/orchestration/business-intelligence/types.ts`
- **Duplicate**: `src/bos/types.ts`
- **Action**: Remove duplicate

### 7. Experience-related types (10 duplicates)
- HoverBehavior, PerformanceBudget, MicroInteraction, ConversionMoment, ParallaxLayer, ScrollNarrative, StoryBeat, VisualRhythm, RevealStrategy
- **Canonical**: `src/orchestration/experience-intelligence/types.ts`
- **Duplicate**: `src/orchestration/design-intelligence/types-experience.ts`
- **Action**: Remove all duplicates

### 8. ValidationResult (5 definitions)
- Same structure in 5 layer files
- **Action**: Create shared type, import everywhere

## Remediation Plan

### Phase 1: Remove ExperienceBlueprint duplicates
1. Delete `src/orchestration/design-intelligence/types-experience.ts`
2. Update all imports to use canonical location

### Phase 2: Remove ApplicationBlueprint duplicates
1. Delete `src/bos/schemas/blueprint/application-blueprint.schema.ts`
2. Delete `src/business-intelligence/solution-architect.ts`
3. Update all imports

### Phase 3: Remove ExecutionBlueprint duplicates
1. Delete `src/bos/schemas/blueprint/execution-blueprint.schema.ts`
2. Update all imports

### Phase 4: Create adapters for legacy types
1. Create adapter for SolutionArchitectureDecision → SolutionArchitecture
2. Create adapter for legacy BusinessWorkflow → canonical BusinessWorkflow

### Phase 5: Unify ValidationResult
1. Create shared `src/orchestration/shared/types.ts`
2. Move ValidationResult there
3. Update all layer files to import from shared

## Files to Modify

| File | Action |
|------|--------|
| `src/orchestration/design-intelligence/types-experience.ts` | DELETE |
| `src/bos/schemas/blueprint/application-blueprint.schema.ts` | DELETE |
| `src/bos/schemas/blueprint/execution-blueprint.schema.ts` | DELETE |
| `src/business-intelligence/solution-architect.ts` | DELETE |
| `src/bos/types-solution-architecture.ts` | DEPRECATE + add adapter |
| `src/bos/types.ts` | Remove duplicate BusinessWorkflow |
| `src/orchestration/shared/types.ts` | CREATE (shared ValidationResult) |
| All layer types files | Update to import shared ValidationResult |
