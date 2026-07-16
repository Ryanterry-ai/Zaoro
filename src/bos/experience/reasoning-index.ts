// ─── Experience Reasoning Engine Barrel ────────────────────────────

export * from './types.js';
export { generateCandidateConcepts } from './candidates.js';
export { directExperience } from './director.js';
export { buildGrammar, type ExperienceGrammar } from './grammar.js';
export {
  reasonExperience,
  compileExperience,
  type XREInput,
  type XREPlanScore,
  type XREScoreDimension,
} from './reasoning-engine.js';
export type {
  CompiledExperience,
  CompiledSection,
  UniversalSectionRole,
} from './compiled.js';
