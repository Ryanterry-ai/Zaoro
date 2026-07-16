/**
 * Blueprint Explorer - Canonical artifact viewer
 *
 * Provides a structured view of all artifacts in the pipeline chain.
 * Each artifact is rendered with its inputs, outputs, and metadata.
 */

import type { RuntimeTrace } from '../runtime-trace/types.js';

// ============================================================================
// BLUEPRINT EXPLORER
// ============================================================================

/**
 * Artifact descriptor - metadata about an artifact
 */
export interface ArtifactDescriptor {
  /** Artifact name */
  name: string;

  /** Human-readable description */
  description: string;

  /** Layer that produced this artifact */
  producer: string;

  /** Layers that consume this artifact */
  consumers: string[];

  /** Key fields to display */
  keyFields: string[];

  /** Whether this artifact is required */
  required: boolean;
}

/**
 * All artifacts in the pipeline
 */
export const ARTIFACT_REGISTRY: ArtifactDescriptor[] = [
  {
    name: 'businessKnowledge',
    description: 'Canonical business understanding extracted from prompt',
    producer: 'business-intelligence',
    consumers: ['knowledge-acquisition', 'experience-intelligence', 'design-intelligence', 'content-intelligence', 'technology-planner', 'application-blueprint'],
    keyFields: ['id', 'industry', 'businessModel', 'targetAudience', 'confidence'],
    required: true,
  },
  {
    name: 'evidenceCollection',
    description: 'Research evidence supporting business understanding',
    producer: 'knowledge-acquisition',
    consumers: ['experience-intelligence', 'design-intelligence'],
    keyFields: ['id', 'sources', 'confidence'],
    required: false,
  },
  {
    name: 'experienceBlueprint',
    description: 'User experience flow and page structure',
    producer: 'experience-intelligence',
    consumers: ['design-intelligence', 'content-intelligence', 'technology-planner', 'application-blueprint'],
    keyFields: ['id', 'userJourneys', 'pageFlows', 'confidence'],
    required: true,
  },
  {
    name: 'contentBlueprint',
    description: 'Content strategy and copy direction',
    producer: 'content-intelligence',
    consumers: ['technology-planner', 'application-blueprint'],
    keyFields: ['id', 'contentSections', 'tone', 'confidence'],
    required: true,
  },
  {
    name: 'designDecision',
    description: 'Visual design system and aesthetic decisions',
    producer: 'design-intelligence',
    consumers: ['application-blueprint', 'renderer'],
    keyFields: ['id', 'colorPalette', 'typography', 'confidence'],
    required: true,
  },
  {
    name: 'solutionArchitecture',
    description: 'Technology stack and infrastructure decisions',
    producer: 'technology-planner',
    consumers: ['application-blueprint'],
    keyFields: ['id', 'architectureStyle', 'components', 'confidence'],
    required: true,
  },
  {
    name: 'applicationBlueprint',
    description: 'Complete application structure and component hierarchy',
    producer: 'application-blueprint',
    consumers: ['execution-blueprint'],
    keyFields: ['id', 'routes', 'components', 'stateManagement'],
    required: true,
  },
  {
    name: 'executionBlueprint',
    description: 'Execution plan mapping components to slots',
    producer: 'execution-blueprint',
    consumers: ['renderer'],
    keyFields: ['id', 'pages', 'slots'],
    required: true,
  },
  {
    name: 'rendererOutput',
    description: 'Generated code files and assets',
    producer: 'renderer',
    consumers: [],
    keyFields: ['id', 'files', 'metadata'],
    required: true,
  },
];

/**
 * Generate artifact chain visualization
 */
export function generateArtifactChain(trace: RuntimeTrace): string {
  const lines: string[] = [];

  lines.push('  ARTIFACT CHAIN');
  lines.push('  ═'.repeat(30));
  lines.push('');

  for (let i = 0; i < ARTIFACT_REGISTRY.length; i++) {
    const artifact = ARTIFACT_REGISTRY[i];
    const value = trace[artifact.name as keyof RuntimeTrace];
    const exists = value !== null && value !== undefined;

    const icon = exists ? '✅' : (artifact.required ? '❌' : '⏳');
    const name = artifact.name.padEnd(25);
    const producer = `[${artifact.producer}]`.padEnd(30);

    lines.push(`  ${icon} ${name} ${producer}`);

    // Show key fields if artifact exists
    if (exists && typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      for (const field of artifact.keyFields.slice(0, 3)) {
        const fieldValue = obj[field];
        const displayValue = typeof fieldValue === 'string'
          ? fieldValue.substring(0, 40)
          : typeof fieldValue === 'number'
            ? String(fieldValue)
            : typeof fieldValue === 'boolean'
              ? String(fieldValue)
              : Array.isArray(fieldValue)
                ? `[${fieldValue.length} items]`
                : typeof fieldValue === 'object'
                  ? '{...}'
                  : 'N/A';
        lines.push(`      ${field}: ${displayValue}`);
      }
    }

    // Arrow between artifacts
    if (i < ARTIFACT_REGISTRY.length - 1) {
      lines.push('      ↓');
    }
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Generate detailed artifact report
 */
export function generateArtifactReport(
  artifactName: string,
  trace: RuntimeTrace
): string {
  const descriptor = ARTIFACT_REGISTRY.find(a => a.name === artifactName);

  if (!descriptor) {
    return `  Unknown artifact: ${artifactName}`;
  }

  const value = trace[artifactName as keyof RuntimeTrace];
  const exists = value !== null && value !== undefined;

  const lines: string[] = [];

  lines.push(`  ARTIFACT: ${descriptor.name.toUpperCase()}`);
  lines.push('  ═'.repeat(30));
  lines.push(`  Description: ${descriptor.description}`);
  lines.push(`  Producer:    ${descriptor.producer}`);
  lines.push(`  Consumers:   ${descriptor.consumers.join(', ')}`);
  lines.push(`  Required:    ${descriptor.required}`);
  lines.push(`  Status:      ${exists ? '✅ Present' : '❌ Missing'}`);
  lines.push('');

  if (exists && typeof value === 'object' && value !== null) {
    lines.push('  CONTENT');
    lines.push('  ─'.repeat(30));

    const obj = value as Record<string, unknown>;
    for (const field of Object.keys(obj).slice(0, 10)) {
      const fieldValue = obj[field];
      const displayValue = typeof fieldValue === 'string'
        ? fieldValue.substring(0, 80)
        : typeof fieldValue === 'number'
          ? String(fieldValue)
          : typeof fieldValue === 'boolean'
            ? String(fieldValue)
            : Array.isArray(fieldValue)
              ? `[${fieldValue.length} items]`
              : typeof fieldValue === 'object'
                ? JSON.stringify(fieldValue).substring(0, 80)
                : 'N/A';
      lines.push(`  ${field}: ${displayValue}`);
    }
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Generate JSON artifact report
 */
export function generateArtifactJSONReport(trace: RuntimeTrace): object {
  const artifacts: Record<string, unknown> = {};

  for (const descriptor of ARTIFACT_REGISTRY) {
    const value = trace[descriptor.name as keyof RuntimeTrace];
    artifacts[descriptor.name] = {
      descriptor,
      present: value !== null && value !== undefined,
      value: value ?? null,
    };
  }

  return {
    buildId: trace.id,
    timestamp: trace.startTime,
    artifacts,
  };
}
