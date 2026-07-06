// ─── Intent Router ────────────────────────────────────────────────────────────
//
// Detects the user's intent from raw input and normalizes it into a
// ProjectManifest. The router is the single entry point for all input types:
//   - Natural language prompt → Prompt intent
//   - Website URL → Website intent (scrape/clone)
//   - PRD document → PRD intent (parse requirements)
//   - Figma link → Figma intent (extract design)
//   - Codebase path → Codebase intent (analyze existing code)
//   - Database connection → Database intent (reverse-engineer schema)
//
// The router is provider-agnostic — it uses pattern matching and heuristics,
// not LLM calls, to detect intent. LLM calls happen in the intake stage.
// ──────────────────────────────────────────────────────────────────────────────

import * as crypto from 'crypto';
import type {
  IntentResult,
  IntentType,
  ProjectManifest,
  LLMAdapterInterface,
  LLMTaskType,
  Industry,
} from './types.js';
import { createAdapterRegistry } from './input-adapters/index.js';
import type { AdapterRegistry } from './input-adapters/index.js';

// ─── Detection Patterns ───────────────────────────────────────────────────────

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;
const FIGMA_PATTERN = /figma\.com\/(file|design|proto)/i;
const GITHUB_PATTERN = /github\.com\/[^\s]+/i;
const FILE_PATH_PATTERN = /^[a-zA-Z]:\\|^\//;
const DB_CONNECTION_PATTERN = /^(postgres|mysql|mongodb|redis|sqlite):\/\//i;

const WEBSITE_KEYWORDS = [
  'clone', 'copy', 'rebuild', 'replicate', 'like', 'similar to',
  'website', 'site', 'web app', 'landing page', 'homepage',
];

const PRD_KEYWORDS = [
  'prd', 'requirements document', 'product requirements', 'specification',
  'user stories', 'acceptance criteria', 'functional requirements',
  'business requirements', 'use case',
];

const FIGMA_KEYWORDS = [
  'figma', 'design file', 'mockup', 'wireframe', 'prototype',
  'design link', 'figma link',
];

const CODEBASE_KEYWORDS = [
  'existing code', 'codebase', 'repository', 'repo', 'modernize',
  'refactor', 'upgrade', 'migrate', 'extend', 'add feature to',
  'existing project', 'current code',
];

const DB_KEYWORDS = [
  'database', 'db', 'schema', 'tables', 'entities', 'data model',
  'database first', 'reverse engineer', 'existing database',
];

// ─── Intent Detection ─────────────────────────────────────────────────────────

function detectIntentType(input: string): { intent: IntentType; confidence: number } {
  const trimmed = input.trim();

  // 1. URL → Website intent
  if (URL_PATTERN.test(trimmed)) {
    if (FIGMA_PATTERN.test(trimmed)) {
      return { intent: 'figma' as IntentType, confidence: 0.95 };
    }
    return { intent: 'website' as IntentType, confidence: 0.9 };
  }

  // 2. Database connection string → Database intent
  if (DB_CONNECTION_PATTERN.test(trimmed)) {
    return { intent: 'database' as IntentType, confidence: 0.95 };
  }

  // 3. File path → Codebase or PRD intent
  if (FILE_PATH_PATTERN.test(trimmed)) {
    const lower = trimmed.toLowerCase();
    if (lower.endsWith('.prd') || lower.endsWith('.md') || lower.includes('requirement')) {
      return { intent: 'prd' as IntentType, confidence: 0.7 };
    }
    return { intent: 'codebase' as IntentType, confidence: 0.7 };
  }

  // 4. GitHub URL → Codebase intent
  if (GITHUB_PATTERN.test(trimmed)) {
    return { intent: 'codebase' as IntentType, confidence: 0.85 };
  }

  // 5. Keyword-based detection for natural language
  const lower = trimmed.toLowerCase();

  const figmaScore = FIGMA_KEYWORDS.filter(k => lower.includes(k)).length;
  if (figmaScore >= 1) {
    return { intent: 'figma' as IntentType, confidence: Math.min(0.6 + figmaScore * 0.15, 0.9) };
  }

  const prdScore = PRD_KEYWORDS.filter(k => lower.includes(k)).length;
  if (prdScore >= 2) {
    return { intent: 'prd' as IntentType, confidence: Math.min(0.5 + prdScore * 0.15, 0.85) };
  }

  const dbScore = DB_KEYWORDS.filter(k => lower.includes(k)).length;
  if (dbScore >= 2) {
    return { intent: 'database' as IntentType, confidence: Math.min(0.5 + dbScore * 0.15, 0.8) };
  }

  const codebaseScore = CODEBASE_KEYWORDS.filter(k => lower.includes(k)).length;
  if (codebaseScore >= 2) {
    return { intent: 'codebase' as IntentType, confidence: Math.min(0.5 + codebaseScore * 0.15, 0.8) };
  }

  const websiteScore = WEBSITE_KEYWORDS.filter(k => lower.includes(k)).length;
  if (websiteScore >= 2) {
    return { intent: 'website' as IntentType, confidence: Math.min(0.4 + websiteScore * 0.15, 0.75) };
  }

  // 6. Default: Prompt intent (natural language project description)
  return { intent: 'prompt' as IntentType, confidence: 0.6 };
}

// ─── Manifest Builder ─────────────────────────────────────────────────────────

function buildManifest(
  input: string,
  intent: IntentType,
  confidence: number,
): ProjectManifest {
  const id = `proj-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  return {
    id,
    description: input,
    userInput: input,
    createdAt: new Date().toISOString(),
    version: 1,
  };
}

// ─── LLM-Enhanced Detection ───────────────────────────────────────────────────

async function detectWithLLM(
  input: string,
  llm: LLMAdapterInterface,
): Promise<{ intent: IntentType; confidence: number; extractedMetadata?: Record<string, unknown> }> {
  const prompt = `Analyze the following user input and determine what they want to build.

## User Input
${input.slice(0, 2000)}

## Determine the intent type:
- prompt: Natural language description of a project to build from scratch
- website: URL of an existing website to clone or analyze
- prd: Product requirements document or specification
- figma: Figma design file or link
- codebase: Existing code to modernize or extend
- database: Database schema to build around

## Also extract:
1. Project name (if mentioned)
2. Industry/domain (if detectable)
3. Tech stack preferences (if mentioned)
4. Any constraints or requirements

Output JSON:
{
  "intent": "one of: prompt, website, prd, figma, codebase, database",
  "confidence": 0.0-1.0,
  "projectName": "string or null",
  "industry": "string or null",
  "techStack": { "frontend": "string or null", "backend": "string or null", "database": "string or null" },
  "constraints": ["list of constraints"],
  "summary": "one-sentence summary of what the user wants"
}`;

  const result = await llm.call({
    taskType: 'analysis' as LLMTaskType,
    systemPrompt: 'Analyze user input and determine the intent. Output only valid JSON.',
    prompt,
    temperature: 0.1,
  });

  try {
    const parsed = JSON.parse(result.content) as Record<string, unknown>;
    return {
      intent: (parsed.intent as IntentType) || ('prompt' as IntentType),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      extractedMetadata: {
        projectName: parsed.projectName,
        industry: parsed.industry,
        techStack: parsed.techStack,
        constraints: parsed.constraints,
        summary: parsed.summary,
      },
    };
  } catch {
    return { intent: 'prompt' as IntentType, confidence: 0.3 };
  }
}

// ─── Adapter Registry (lazy) ─────────────────────────────────────────────────

let _registry: AdapterRegistry | undefined;

function getRegistry(): AdapterRegistry {
  if (!_registry) {
    _registry = createAdapterRegistry();
  }
  return _registry;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Route user input to the appropriate intake path.
 * Uses input adapters first, then heuristics, then optionally LLM for ambiguous cases.
 */
export async function routeIntent(
  input: string,
  llm?: LLMAdapterInterface,
): Promise<IntentResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Empty input — cannot route intent');
  }

  // Phase 0: Input Adapter detection
  const registry = getRegistry();
  const adapter = registry.findAdapter(trimmed);
  if (adapter) {
    try {
      const adapterResult = await adapter.process(trimmed);
      const manifest: ProjectManifest = {
        ...adapterResult.manifest,
        userInput: trimmed,
        ...(adapterResult.detectedIndustry ? { domain: adapterResult.detectedIndustry } : {}),
      };

      return {
        intent: adapterResult.adapterType,
        confidence: adapterResult.confidence,
        manifest,
        rawInput: trimmed,
        extractedMetadata: {
          adapterType: adapterResult.adapterType,
          detectedName: adapterResult.detectedName,
          industry: adapterResult.detectedIndustry,
          entities: adapterResult.entities,
          pages: adapterResult.pages,
          integrations: adapterResult.integrations,
          ...adapterResult.metadata,
        },
      };
    } catch {
      // Adapter failed — fall through to heuristic detection
    }
  }

  // Phase 1: Heuristic detection
  const heuristic = detectIntentType(trimmed);

  // Phase 2: LLM-enhanced detection for ambiguous cases (confidence < 0.7)
  let finalIntent = heuristic.intent;
  let finalConfidence = heuristic.confidence;
  let extractedMetadata: Record<string, unknown> | undefined;

  if (llm && heuristic.confidence < 0.7) {
    const llmResult = await detectWithLLM(trimmed, llm);
    if (llmResult.confidence > heuristic.confidence) {
      finalIntent = llmResult.intent;
      finalConfidence = llmResult.confidence;
      extractedMetadata = llmResult.extractedMetadata;
    }
  }

  const manifest = buildManifest(trimmed, finalIntent, finalConfidence);

  // Apply LLM-extracted metadata to manifest
  if (extractedMetadata) {
    if (typeof extractedMetadata.projectName === 'string') {
      manifest.name = extractedMetadata.projectName;
    }
    if (typeof extractedMetadata.industry === 'string') {
      manifest.domain = extractedMetadata.industry as Industry;
    }
    if (extractedMetadata.techStack && typeof extractedMetadata.techStack === 'object') {
      manifest.techStack = extractedMetadata.techStack as import('./types.js').TechStackPreferences;
    }
    if (Array.isArray(extractedMetadata.constraints)) {
      manifest.constraints = extractedMetadata.constraints as string[];
    }
  }

  return {
    intent: finalIntent,
    confidence: finalConfidence,
    manifest,
    rawInput: trimmed,
    extractedMetadata,
  };
}

/**
 * Get a human-readable description of the detected intent.
 */
export function describeIntent(intent: IntentType): string {
  const descriptions: Record<IntentType, string> = {
    prompt: 'Build a new project from a natural language description',
    website: 'Clone or analyze an existing website',
    prd: 'Build from a product requirements document',
    figma: 'Build from Figma design files',
    codebase: 'Modernize or extend an existing codebase',
    database: 'Build around an existing database schema',
  };
  return descriptions[intent] ?? 'Unknown intent';
}
