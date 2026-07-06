// ─── Context Manager ──────────────────────────────────────────────────────────
//
// Manages typed artifact passing between stages. Each stage declares
// its inputs and outputs; the context manager enforces these contracts:
//   - Stages can only READ artifacts they declared as inputs
//   - Stages can only WRITE artifacts they declared as outputs
//   - Reading an undeclared input throws an error
//   - Writing an undeclared output throws an error
//
// This prevents accidental coupling and makes data flow explicit.
// ──────────────────────────────────────────────────────────────────────────────

import type {
  StageContext,
  StageLogger,
  ProjectManifest,
  ArtifactType,
  LLMCallParams,
  LLMCallResult,
  BOSContext,
  RuntimeContext,
} from './types.js';
import type { ArtifactStore } from './artifact-store.js';
import type { ExecutionTracker } from './execution-tracker.js';

/**
 * Creates a scoped StageContext for a specific stage.
 * The context enforces input/output contracts and provides BOS knowledge.
 */
export function createStageContext(
  stageId: string,
  executionId: string,
  declaredInputs: string[],
  declaredOutputs: string[],
  manifest: ProjectManifest,
  artifactStore: ArtifactStore,
  tracker: ExecutionTracker,
  callLLM: (params: LLMCallParams) => Promise<LLMCallResult>,
  emit: (event: string, data?: unknown) => void,
  bosContext?: BOSContext,
  runtime?: RuntimeContext,
): StageContext {
  const allowedReads = new Set(declaredInputs);
  const allowedWrites = new Set(declaredOutputs);

  const log: StageLogger = {
    info: (msg, data) => console.log(`[${stageId}] ${msg}`, data ?? ''),
    warn: (msg, data) => console.warn(`[${stageId}] ${msg}`, data ?? ''),
    error: (msg, data) => console.error(`[${stageId}] ${msg}`, data ?? ''),
    debug: (msg, data) => {
      if (process.env.DEBUG === 'true') {
        console.log(`[${stageId}] [debug] ${msg}`, data ?? '');
      }
    },
  };

  const bos: BOSContext = bosContext ?? {
    pack: undefined,
    industry: undefined,
    detectionConfidence: 0,
  };

  return {
    executionId,
    stageId,

    getArtifact: <T = unknown>(key: string): T | undefined => {
      if (!allowedReads.has(key)) {
        throw new Error(
          `[${stageId}] Stage "${stageId}" attempted to read undeclared artifact "${key}". ` +
          `Declared inputs: ${declaredInputs.join(', ') || '(none)'}`
        );
      }
      return artifactStore.read<T>(key);
    },

    setArtifact: (key: string, value: unknown, type?: ArtifactType): void => {
      if (!allowedWrites.has(key)) {
        throw new Error(
          `[${stageId}] Stage "${stageId}" attempted to write undeclared artifact "${key}". ` +
          `Declared outputs: ${declaredOutputs.join(', ') || '(none)'}`
        );
      }
      const artifactType = type ?? ('json' as ArtifactType);
      artifactStore.store(key, value, artifactType, stageId);
      emit('artifact.stored', { key, stageId });
    },

    manifest,

    callLLM: async (params: LLMCallParams): Promise<LLMCallResult> => {
      emit('llm.call_started', { stageId, taskType: params.taskType });
      try {
        const result = await callLLM(params);
        emit('llm.call_completed', {
          stageId,
          taskType: params.taskType,
          tokens: result.usage.total,
          durationMs: result.durationMs,
        });
        return result;
      } catch (err) {
        emit('llm.call_failed', { stageId, taskType: params.taskType, error: (err as Error).message });
        throw err;
      }
    },

    emit,

    getCheckpoint: <T = unknown>(key: string): T | undefined => {
      return tracker.getCheckpoint<T>(stageId, key);
    },

    setCheckpoint: (key: string, value: unknown): void => {
      tracker.setCheckpoint(stageId, key, value);
    },

    log,

    bos,

    runtime,
  };
}
