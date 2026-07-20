/**
 * Agent Prompt Generator — produces a comprehensive spec file for the AI coding agent.
 *
 * In agent mode, the pipeline runs BRE v2 → ApplicationSpec structurally,
 * then writes a .task.md spec file. The agent reads this spec and generates
 * each page's TSX with REAL business-specific content (not generic filler).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ApplicationSpec } from '../bos/schemas/blueprint/execution-blueprint.schema.js';
import type { BREv2Result } from '../bos/bre-v2-pipeline.js';
import type { DesignDNA } from '../generation/design-dna.js';
import type { AppFamilyResult } from '../bos/reasoning/application-family-classifier.js';

export interface AgentSpec {
  /** Business name */
  appName: string;
  /** Industry vertical */
  industry: string;
  /** Business description from user prompt */
  description: string;
  /** Entities (products, services, etc.) */
  entities: Array<{ name: string; fields: string[] }>;
  /** Workflows (ordering, booking, etc.) */
  workflows: Array<{ name: string; steps: string[] }>;
  /** Pages with component structure */
  pages: Array<{
    path: string;
    name: string;
    type: string;
    components: Array<{
      type: string;
      content?: Record<string, unknown>;
      items?: Array<{ title: string; description: string; icon?: string }>;
    }>;
  }>;
  /** Design tokens (colors, fonts, spacing) */
  designTokens: Record<string, unknown>;
  /** Design DNA (per-industry design system) */
  designDNA?: DesignDNA;
  /** App family classification */
  appFamily?: AppFamilyResult;
  /** Knowledge enrichment vocabulary */
  vocabulary?: Record<string, string>;
  /** Domain entities from knowledge graph */
  domainEntities?: string[];
  /** Page layout from SkillIntegrator */
  pageLayout?: Record<string, unknown>;
}

/**
 * Generate a comprehensive agent task spec from pipeline outputs.
 *
 * This produces a .task.md file that contains:
 * 1. Business context (name, industry, entities, workflows)
 * 2. Design system (tokens, colors, fonts, layout)
 * 3. Page structure (components per page, their types and slots)
 * 4. Content instructions (what each component should say, real business terms)
 * 5. Technical requirements ('use client', Tailwind, Framer Motion, etc.)
 *
 * The agent reads this spec and generates TSX with REAL content.
 */
export function generateAgentSpec(
  breResult: BREv2Result,
  applicationSpec: ApplicationSpec,
  designDNA?: DesignDNA,
  appFamily?: AppFamilyResult,
  vocabulary?: Record<string, string>,
  domainEntities?: string[],
  pageLayout?: Record<string, unknown>,
): { spec: AgentSpec; taskMd: string } {
  const blueprint = breResult.blueprint;

  const spec: AgentSpec = {
    appName: applicationSpec.appName,
    industry: blueprint.industry,
    description: blueprint.description ?? '',
    entities: blueprint.entities.map(e => ({
      name: e.name,
      fields: e.fields.map(f => f.name),
    })),
    workflows: blueprint.workflows.map(w => ({
      name: w.name,
      steps: w.steps.map(s => s.action),
    })),
    pages: applicationSpec.pages.map(p => ({
      path: p.path,
      name: p.name,
      type: p.type,
      components: p.components.map(c => {
        const comp: { type: string; content?: Record<string, unknown>; items?: Array<{ title: string; description: string; icon?: string }> } = { type: c.type };
        if (c.content) comp.content = c.content as Record<string, unknown>;
        if (c.items) {
          comp.items = c.items.map(i => ({
            title: i.title ?? '',
            description: i.description ?? '',
            ...(i.icon ? { icon: i.icon } : {}),
          }));
        }
        return comp;
      }),
    })),
    designTokens: (breResult.blueprint.designTokens ?? {}) as Record<string, unknown>,
    ...(designDNA != null ? { designDNA } : {}),
    ...(appFamily != null ? { appFamily } : {}),
    ...(vocabulary != null ? { vocabulary } : {}),
    ...(domainEntities != null ? { domainEntities } : {}),
    ...(pageLayout != null ? { pageLayout } : {}),
  };

  const taskMd = buildTaskMd(spec, breResult);
  return { spec, taskMd };
}

/**
 * Write the agent spec to the workspace directory.
 * Returns the path to the .task.md file.
 */
export function writeAgentSpec(
  spec: AgentSpec,
  taskMd: string,
  workspaceDir: string,
): string {
  // Write the structured spec as JSON (machine-readable)
  const specPath = path.join(workspaceDir, 'agent-spec.json');
  fs.mkdirSync(path.dirname(specPath), { recursive: true });
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf8');

  // Write the task markdown (human/agent-readable)
  const taskPath = path.join(workspaceDir, 'agent-task.md');
  fs.writeFileSync(taskPath, taskMd, 'utf8');

  console.log(`[agent-spec] Spec written: ${specPath}`);
  console.log(`[agent-spec] Task written: ${taskPath}`);
  return taskPath;
}

// ─── Task Markdown Builder ────────────────────────────────────────────────────

function buildTaskMd(spec: AgentSpec, breResult: BREv2Result): string {
  const sections: string[] = [];

  // Header
  sections.push(`# Build Task: ${spec.appName}`);
  sections.push(`**Industry:** ${spec.industry}`);
  sections.push(`**App Type:** ${spec.appFamily?.family ?? 'unknown'}/${spec.appFamily?.appType ?? 'unknown'}`);
  sections.push('');

  // Business context
  sections.push('## Business Context');
  sections.push(`**Name:** ${spec.appName}`);
  sections.push(`**Industry:** ${spec.industry}`);
  if (spec.description) {
    sections.push(`**Description:** ${spec.description}`);
  }
  sections.push('');

  // Entities
  if (spec.entities.length > 0) {
    sections.push('## Data Model (entities)');
    for (const entity of spec.entities) {
      sections.push(`- **${entity.name}:** ${entity.fields.join(', ')}`);
    }
    sections.push('');
  }

  // Workflows
  if (spec.workflows.length > 0) {
    sections.push('## Business Workflows');
    for (const wf of spec.workflows) {
      sections.push(`- **${wf.name}:** ${wf.steps.join(' → ')}`);
    }
    sections.push('');
  }

  // Vocabulary (industry-specific terms)
  if (spec.vocabulary && Object.keys(spec.vocabulary).length > 0) {
    sections.push('## Industry Vocabulary (use these terms, NOT generic filler)');
    for (const [generic, specific] of Object.entries(spec.vocabulary)) {
      sections.push(`- "${generic}" → use "${specific}"`);
    }
    sections.push('');
  }

  // Domain entities
  if (spec.domainEntities && spec.domainEntities.length > 0) {
    sections.push('## Domain Terms (mention these in content)');
    sections.push(spec.domainEntities.join(', '));
    sections.push('');
  }

  // Design system
  sections.push('## Design System');
  const tokens = spec.designTokens as Record<string, unknown>;
  if (tokens.colors) {
    const colors = tokens.colors as Record<string, string>;
    sections.push(`**Colors:** primary=${colors.primary ?? '#6366f1'}, secondary=${colors.secondary ?? '#8b5cf6'}, accent=${colors.accent ?? '#06b6d4'}`);
  }
  if (tokens.typography) {
    const typo = tokens.typography as Record<string, string>;
    sections.push(`**Fonts:** heading=${typo.heading ?? 'Inter'}, body=${typo.body ?? 'Inter'}`);
  }
  sections.push('');

  // Page structure
  sections.push('## Pages to Generate');
  for (const page of spec.pages) {
    sections.push(`\n### Page: \`${page.path}\` (${page.name})`);
    sections.push(`**Type:** ${page.type}`);
    sections.push('**Components:**');
    for (const comp of page.components) {
      sections.push(`- \`${comp.type}\``);
      if (comp.content) {
        const contentKeys = Object.keys(comp.content);
        if (contentKeys.length > 0) {
          sections.push(`  - Content fields: ${contentKeys.join(', ')}`);
        }
      }
      if (comp.items && comp.items.length > 0) {
        sections.push(`  - Items: ${comp.items.map(i => i.title).join(', ')}`);
      }
    }
  }
  sections.push('');

  // Content generation rules
  sections.push('## Content Generation Rules');
  sections.push('');
  sections.push('1. **NEVER use generic filler text** like "Features", "Everything you need", "Product Management".');
  sections.push(`2. **Use REAL business terms** for ${spec.industry}. Mention actual products, services, features.`);
  sections.push(`3. **Hero section** must state a clear value proposition specific to ${spec.appName}.`);
  sections.push(`4. **Feature descriptions** must describe actual capabilities, not abstract categories.`);
  sections.push(`5. **Testimonials** must sound like real customers in the ${spec.industry} industry.`);
  sections.push(`6. **CTA text** must be action-oriented and specific (e.g., "Order Fresh Coffee", not "Get Started").`);
  sections.push(`7. **Pricing** must use realistic numbers for ${spec.industry} (not $9.99 / $19.99 / $29.99 defaults).`);
  sections.push('');

  // Technical requirements
  sections.push('## Technical Requirements');
  sections.push('');
  sections.push('- Every component file: `"use client";` at top');
  sections.push('- Import React, useState, useEffect as needed');
  sections.push('- Import icons from `lucide-react`');
  sections.push('- Import motion from `framer-motion`');
  sections.push('- Use Tailwind CSS classes — NO inline styles');
  sections.push('- Export as `export default function ComponentName()`');
  sections.push('- Use `Link` from `next/link` for all internal navigation');
  sections.push('- Apply design tokens from the design system (colors, fonts, spacing)');
  sections.push('');

  // ─── Self-generating instruction ───────────────────────────────────────
  // The agent (Claude Desktop / opencode / Codex) executing this pipeline IS
  // the LLM. This spec is the interface. When IS_AGENT_MODE is true the
  // pipeline wrote this file and is polling for the component files below.
  // Tell the agent, in the same session, to generate them now — no API key,
  // no HTTP call to any LLM provider.
  sections.push('## ⚡ Action Required');
  sections.push('');
  sections.push('You are Claude / opencode / Codex running inside this repository.');
  sections.push('The build pipeline has written this spec and is waiting for you to generate the component files.');
  sections.push('');
  sections.push('**Generate each component now:**');
  sections.push('');
  for (const page of spec.pages) {
    for (const comp of page.components) {
      const outputPath = `src/app${page.path}/${comp.type}.tsx`;
      sections.push(`1. Write \`${outputPath}\` — a production-ready React component for ${comp.type}`);
      if (comp.content) {
        const sample = Object.entries(comp.content).slice(0, 2)
          .map(([k, v]) => `${k}: "${String((v as any)?.value ?? v)}"`).join(', ');
        if (sample) sections.push(`   Content: ${sample}`);
      }
    }
  }
  sections.push('');
  sections.push('**Rules for generated components:**');
  sections.push(`- Business: ${spec.appName} (${spec.industry})`);
  const primaryColor = (spec.designTokens as any)?.colors?.primary ?? '#6366f1';
  sections.push(`- Primary color: ${primaryColor}`);
  sections.push('- Use Framer Motion for all animations');
  sections.push('- Use real business content — never placeholder text');
  sections.push('- Export as default function');
  sections.push('- Start every file with: `"use client";`');
  sections.push('');
  sections.push('The build pipeline is polling for these files. Write them now.');
  sections.push('');

  return sections.join('\n');
}
