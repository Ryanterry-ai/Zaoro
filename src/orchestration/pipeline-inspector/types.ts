// Re-export the canonical trace types from runtime-trace (single source of truth).
// pipeline-inspector previously duplicated these; that duplication is removed here.
export type {
  RuntimeTrace,
  LayerExecutionRecord,
  TraceValidationResult,
} from '../runtime-trace/types.js';

export { validateTrace } from '../runtime-trace/types.js';
