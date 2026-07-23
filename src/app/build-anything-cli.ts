#!/usr/bin/env node

// ─── Build.Anything CLI ───────────────────────────────────────────────────────
//
// Entry point for running the Build.Anything pipeline from command line.
// Uses agent-driven mode: generates artifacts directly, then writes files.
//
// Usage:
//   npx tsx src/app/build-anything-cli.ts "Build a gym CRM"
//   npx tsx src/app/build-anything-cli.ts --prompt "Build a SaaS dashboard"
//   npx tsx src/app/build-anything-cli.ts --file prompt.txt
// ──────────────────────────────────────────────────────────────────────────────

import { Orchestrator } from '../orchestration/orchestrator.js';
import { generateFromPrompt } from '../generation/agent-generators.js';
import { generateAgentSpec, writeAgentSpec } from '../pipeline/agent-prompt.js';
import { IS_AGENT_MODE } from '../pipeline/agent-mode.js';
import { extractPrimitives } from '../generation/primitive-extractor.js';
import { deriveFromPrimitives } from '../generation/primitive-reasoner.js';
import type { BusinessPrimitives } from '../generation/primitive-extractor.js';
import type { DerivedSpec } from '../generation/primitive-reasoner.js';
import * as fs from 'fs';
import * as path from 'path';

// ─── Parse Arguments ──────────────────────────────────────────────────────────

function parseArgs(): { prompt: string; options: Record<string, string> } {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  let prompt = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;

    if (arg === '--prompt' || arg === '-p') {
      const nextArg = args[++i];
      prompt = nextArg ?? '';
    } else if (arg === '--file' || arg === '-f') {
      const filePath = args[++i];
      if (filePath && fs.existsSync(filePath)) {
        prompt = fs.readFileSync(filePath, 'utf-8').trim();
      } else {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }
    } else if (arg === '--working-directory' || arg === '-w') {
      const nextArg = args[++i];
      options.workingDirectory = nextArg ?? '.build-anything';
    } else if (!arg.startsWith('-')) {
      prompt = arg;
    }
  }

  if (!prompt) {
    console.error('Usage: npx tsx src/app/build-anything-cli.ts "Build a gym CRM"');
    console.error('       npx tsx src/app/build-anything-cli.ts --prompt "Build a SaaS dashboard"');
    console.error('       npx tsx src/app/build-anything-cli.ts --file prompt.txt');
    process.exit(1);
  }

  return { prompt, options };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { prompt, options } = parseArgs();
  const workingDir = options.workingDirectory ?? '.build-anything';

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Build.Anything v3 — Agent-Driven Mode');
  console.log(`  Prompt: ${prompt}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Step 1: Generate artifacts from prompt (agent-driven, no LLM calls)
  console.log('📝 Generating artifacts from prompt...');
  const artifacts = generateFromPrompt(prompt);

  console.log(`   ✅ Generated ${Object.keys(artifacts).length} artifact groups`);
  console.log(`   📄 Pages: ${(artifacts.frontendDesign as any)?.pages?.length ?? 0}`);
  console.log(`   🧩 Components: ${(artifacts.frontendDesign as any)?.components?.length ?? 0}`);
  console.log(`   🔌 API Endpoints: ${(artifacts.apiDesign as any)?.endpoints?.length ?? 0}`);
  console.log('');

  // Step 1.5: Write agent task spec if in agent mode
  if (IS_AGENT_MODE) {
    console.log('🤖 Agent mode detected — writing agent task spec...');

    // Extract primitives from prompt
    const primitives = extractPrimitives(prompt);
    const derivedSpec = deriveFromPrimitives(primitives);

    // Generate agent spec from artifacts
    const breResult = {
      blueprint: {
        industry: (artifacts.manifest as any)?.industry ?? 'saas',
        description: prompt,
        entities: ((artifacts.frontendDesign as any)?.pages ?? [])
          .flatMap((p: any) => p.sections?.flatMap((s: any) => s.components ?? []) ?? [])
          .map((c: any) => ({ name: c.name ?? 'Component', fields: [] })),
        workflows: [],
        designTokens: artifacts.frontendDesign?.designTokens ?? {},
      },
    };

    const appSpec = {
      appName: (artifacts.manifest as any)?.name ?? 'App',
      pages: ((artifacts.frontendDesign as any)?.pages ?? []).map((p: any) => ({
        path: p.path ?? '/',
        name: p.name ?? 'Page',
        type: p.type ?? 'landing',
        components: (p.sections ?? []).flatMap((s: any) =>
          (s.components ?? []).map((c: any) => ({
            type: c.name ?? c.type ?? 'Content',
            content: c.content ?? {},
            items: c.items ?? [],
          }))
        ),
      })),
    };

    const { spec, taskMd } = generateAgentSpec(breResult as any, appSpec as any);

    // Enhance taskMd with primitives
    const enhancedTaskMd = enhanceTaskMd(taskMd, primitives, derivedSpec, appSpec);

    // Write to project workspace
    const projectName = (artifacts.manifest as any)?.name ?? 'project';
    const slug = projectName.toLowerCase().replace(/\s+/g, '-');
    const workspaceDir = path.join(process.cwd(), workingDir, 'projects', slug);

    const taskPath = writeAgentSpec(spec, enhancedTaskMd, workspaceDir);
    console.log(`   📋 Agent task written: ${taskPath}`);
    console.log('   → Read agent-task.md and execute ⚡ Action Required');
    console.log('');
  }

  // Step 2: Run orchestrator with pre-generated artifacts
  console.log('🔨 Writing files to disk...');
  const orchestrator = new Orchestrator({
    workingDirectory: workingDir,
  });

  const result = await orchestrator.runWithArtifacts(artifacts as unknown as Record<string, unknown>, {
    workingDirectory: workingDir,
  });

  if (result.success) {
    const projectRoot = result.artifacts['code.projectRoot'] as string ?? path.join(process.cwd(), workingDir, 'projects', (artifacts.manifest as any)?.name ?? 'project');

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Build complete!');
    console.log(`   Files: ${result.artifacts['code.fileCount'] ?? 0}`);
    console.log(`   Project: ${projectRoot}`);
    console.log(`   Duration: ${result.durationMs}ms`);
    console.log('');
    console.log('   To preview your app:');
    console.log(`   cd ${projectRoot}`);
    console.log('   npm install');
    console.log('   npm run dev');
    console.log('═══════════════════════════════════════════════════════════');
  } else {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❌ Build failed.');
    for (const [stageId, stageResult] of result.stageResults) {
      if (!stageResult.success) {
        console.log(`   ${stageId}: ${stageResult.error}`);
      }
    }
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// ─── Task Markdown Enhancement ────────────────────────────────────────────────

function enhanceTaskMd(
  taskMd: string,
  primitives: BusinessPrimitives,
  derivedSpec: DerivedSpec,
  appSpec: any
): string {
  const sections: string[] = [];

  // Original task markdown
  sections.push(taskMd);

  // Primitive Reasoning Output
  sections.push('');
  sections.push('## Primitive Reasoning Output');
  sections.push('*(These signals drove every decision below — honor them in your output)*');
  sections.push('');
  sections.push('**Transaction type:** ' + primitives.transactionType);
  sections.push('**Value object:** ' + primitives.valueObject);
  sections.push('**Aesthetic signals:** ' + primitives.aestheticSignals.join(', '));
  sections.push('**Emotional intent:** ' + primitives.emotionalIntent.join(', '));
  sections.push('**Content shape:** ' + primitives.contentShape.join(', '));
  if (primitives.currency) {
    sections.push('**Currency:** ' + primitives.currency);
  }
  if (primitives.locale) {
    sections.push('**Locale:** ' + primitives.locale);
  }
  sections.push('');

  // Hero Component Decision — signal-driven, not catalog
  sections.push('## Hero Component Decision');
  const usesSoundwave = primitives.aestheticSignals.includes('soundwave')
    || primitives.aestheticSignals.includes('immersive-scroll')
    || primitives.aestheticSignals.includes('animated-visual')
    || primitives.aestheticSignals.includes('scroll-motion')
    || primitives.aestheticSignals.includes('electric-blue');

  if (usesSoundwave) {
    sections.push('Use: **SoundwaveHero**');
    sections.push('Reason: aestheticSignals includes animated/immersive element — generate an SVG');
    sections.push('path that morphs from peaks to a flat line on scroll using');
    sections.push('Framer Motion useTransform on pathD or strokeDashoffset.');
    sections.push('');
    sections.push('```tsx');
    sections.push("import { useRef } from 'react';");
    sections.push("import { motion, useScroll, useTransform } from 'framer-motion';");
    sections.push('');
    sections.push('// SVG morph: peaks → flat line');
    sections.push('const mid = height / 2;');
    sections.push('const chaos = useTransform(scrollYProgress, [0, 1], [40, 0]);');
    sections.push('const pathD = useTransform(chaos.get(), (c) => generateWavePath(width, height, c, 0));');
    sections.push('```');
  } else {
    sections.push('Use: **HeroBanner**');
    sections.push('Reason: no animated visual signals — standard hero with title, subtitle, CTA.');
  }
  sections.push('');

  // Component Prop Contracts
  sections.push('## Component Prop Contracts (match these exactly)');
  sections.push('');
  sections.push('Every component you write MUST declare these props in its interface.');
  sections.push('Do not use props without declaring them. Do not omit required props.');
  sections.push('');

  const allComponents = appSpec.pages.flatMap((p: any) => p.components ?? []);
  const seen = new Set<string>();
  for (const comp of allComponents) {
    if (seen.has(comp.type)) continue;
    seen.add(comp.type);

    sections.push('### ' + comp.type);
    sections.push('```typescript');
    sections.push('interface ' + comp.type + 'Props {');

    // Derive props from content
    if (comp.content) {
      for (const [key, val] of Object.entries(comp.content)) {
        if (typeof val === 'string') {
          sections.push('  ' + key + '?: string;');
        } else if (typeof val === 'object' && val !== null) {
          sections.push('  ' + key + '?: ' + JSON.stringify(val).substring(0, 100) + ';');
        }
      }
    }

    // Add common props
    if (!comp.content?.['items'] && comp.items) {
      sections.push('  items?: Array<{ title: string; description: string }>;');
    }
    if (comp.type.includes('Hero') || comp.type.includes('Banner')) {
      sections.push('  cta?: string;');
    }
    if (comp.type.includes('Grid') || comp.type.includes('Showcase')) {
      sections.push('  columns?: number;');
    }

    sections.push('}');
    sections.push('```');
    sections.push('');
  }

  // Sections to Generate (in order)
  sections.push('## Sections to Generate (in order)');
  sections.push('');
  sections.push('Generate ALL of these — do not skip any:');

  for (const page of appSpec.pages) {
    for (const comp of page.components ?? []) {
      const reason = deriveSectionReason(comp.type, primitives);
      sections.push('- **' + comp.type + '** — ' + reason);
    }
  }

  sections.push('');
  sections.push('If a section type has no matching component in your palette,');
  sections.push('generate a FeatureGrid with content appropriate to that section.');
  sections.push('Never drop a section silently.');

  // ⚡ Action Required
  sections.push('');
  sections.push('## ⚡ Action Required');
  sections.push('');
  sections.push('Write EVERY component file listed above to disk NOW.');
  sections.push('Each file must:');
  sections.push('1. Start with `"use client";`');
  sections.push('2. Declare the exact interface from the Prop Contracts above');
  sections.push('3. Use Framer Motion for animations');
  sections.push('4. Use lucide-react for icons');
  sections.push('5. Use Tailwind CSS — no inline styles');
  sections.push('6. Export as `export default function ComponentName()`');
  sections.push('');
  sections.push('Output paths:');
  for (const page of appSpec.pages) {
    for (const comp of page.components ?? []) {
      const fileName = comp.type.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() + '.tsx';
      sections.push('- `src/components/' + fileName + '`');
    }
  }

  return sections.join('\n');
}

function deriveSectionReason(componentType: string, primitives: BusinessPrimitives): string {
  const reasons: Record<string, string> = {
    'SoundwaveHero': 'aestheticSignals includes animated/immersive element',
    'HeroBanner': 'standard hero for landing page',
    'ProductShowcase': 'transactionType is product-purchase, contentShape includes multiple-products',
    'ProductGrid': 'transactionType is product-purchase',
    'FeatureGrid': 'standard features section',
    'SpecsTable': 'contentShape includes specs-table',
    'PricingTable': 'transactionType is subscription',
    'GallerySection': 'contentShape includes visual-content',
    'TestimonialCarousel': 'emotionalIntent includes trust/social-proof',
    'ContactForm': 'transactionType is lead-capture',
    'CTASection': 'standard conversion element',
    'GlobalFooter': 'standard footer',
    'ScheduleGrid': 'transactionType is service-booking',
    'BookingForm': 'transactionType is service-booking',
  };

  return reasons[componentType] ?? 'contentShape includes relevant signals for ' + primitives.valueObject;
}
