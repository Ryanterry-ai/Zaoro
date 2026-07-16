// ─── Experience Director (Phase R2+) ────────────────────────────────
// "Plan, compare, then generate" — scores experience concepts before
// anything is rendered.  Sits between Business Knowledge resolution and
// component selection in the V4 pipeline.

export type {
  ExperienceConcept,
  ExperienceBlueprintPlan,
  ConceptScore,
  ExperienceDesign,
  ExperienceStyle,
} from './types.js';

export { generateCandidateConcepts } from './candidates.js';
export { directExperience, type ExperienceDirectorOptions } from './director.js';
