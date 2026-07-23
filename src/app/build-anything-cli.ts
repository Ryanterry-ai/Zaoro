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
import { resolveComponents, getIndustryVocabulary } from '../generation/component-registry.js';
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

  // Industry Vocabulary — what to say and what NOT to say
  const vocab = getIndustryVocabulary(primitives.valueObject);
  sections.push('## Industry Vocabulary');
  sections.push('');
  sections.push('**USE these terms** (industry-specific, real, concrete):');
  for (const term of vocab.use) {
    sections.push('- ' + term);
  }
  sections.push('');
  sections.push('**NEVER use these terms** (generic filler):');
  for (const term of vocab.avoid) {
    sections.push('- ' + term);
  }
  sections.push('');
  sections.push('**Example CTAs** (use these patterns, customize for the business):');
  for (const cta of vocab.ctas) {
    sections.push('- ' + cta);
  }
  sections.push('');
  sections.push('**Example features** (real capabilities, not abstract categories):');
  for (const feature of vocab.features) {
    sections.push('- ' + feature);
  }
  sections.push('');
  sections.push('**Customer roles** (who buys from this business):');
  for (const role of vocab.roles) {
    sections.push('- ' + role);
  }
  sections.push('');

  // Components to Generate — from ComponentRegistry
  sections.push('## Components to Generate');
  sections.push('');
  sections.push('The following components are required for this website. Generate each one.');
  sections.push('');

  const components = resolveComponents(primitives);
  for (const comp of components) {
    sections.push('### ' + comp.name);
    sections.push('**Category:** ' + comp.category);
    sections.push('**Reason:** ' + comp.reason);
    if (comp.contentHints.length > 0) {
      sections.push('**Content hints:**');
      for (const hint of comp.contentHints) {
        sections.push('- ' + hint);
      }
    }
    sections.push('');
  }

  // Component Prop Contracts
  sections.push('## Component Prop Contracts (match these exactly)');
  sections.push('');
  sections.push('Every component you write MUST declare these props in its interface.');
  sections.push('Do not use props without declaring them. Do not omit required props.');
  sections.push('');

  for (const comp of components) {
    sections.push('### ' + comp.name);
    sections.push('```typescript');
    sections.push('interface ' + comp.name + 'Props {');

    // Generate props from the component definition
    for (const [key, val] of Object.entries(comp.props)) {
      if (typeof val === 'string') {
        sections.push('  ' + key + '?: string;');
      }
    }

    // Add common props based on category
    if (comp.category === 'hero') {
      sections.push('  title?: string;');
      sections.push('  subtitle?: string;');
      sections.push('  cta?: string;');
    }
    if (comp.category === 'showcase') {
      sections.push('  items?: Array<{ name: string; price: string; description: string; image?: string; specs?: Array<{ label: string; value: string }> }>;');
      sections.push('  columns?: number;');
    }
    if (comp.category === 'conversion') {
      sections.push('  variant?: string;');
    }
    if (comp.name.includes('Booking') || comp.name.includes('Appointment')) {
      sections.push('  services?: Array<{ name: string; duration: string; price: string }>;');
      sections.push('  staff?: Array<{ name: string; role: string; image?: string }>;');
    }
    if (comp.name.includes('Service') && comp.name.includes('Menu')) {
      sections.push('  services?: Array<{ name: string; description: string; price: string; duration?: string }>;');
    }
    if (comp.name.includes('Pricing')) {
      sections.push('  tiers?: Array<{ name: string; price: string; features: string[]; highlighted?: boolean }>;');
    }
    if (comp.name.includes('Testimonial') || comp.name.includes('Review')) {
      sections.push('  testimonials?: Array<{ quote: string; author: string; role?: string; rating?: number; image?: string }>;');
    }
    if (comp.name.includes('Team')) {
      sections.push('  members?: Array<{ name: string; role: string; bio?: string; image?: string }>;');
    }
    if (comp.name.includes('Gallery') || comp.name.includes('Portfolio')) {
      sections.push('  images?: Array<{ src: string; alt: string; caption?: string }>;');
      sections.push('  columns?: number;');
    }
    if (comp.name.includes('Menu') && !comp.name.includes('Service')) {
      sections.push('  categories?: Array<{ name: string; items: Array<{ name: string; description: string; price: string; image?: string }> }>;');
    }
    if (comp.name.includes('Property') || comp.name.includes('Listing')) {
      sections.push('  properties?: Array<{ title: string; price: string; address: string; beds?: number; baths?: number; sqft?: number; image?: string }>;');
    }
    if (comp.name.includes('Location') || comp.name.includes('Map')) {
      sections.push('  address?: string;');
      sections.push('  phone?: string;');
      sections.push('  hours?: string;');
    }
    if (comp.name.includes('FAQ')) {
      sections.push('  faqs?: Array<{ question: string; answer: string }>;');
    }
    if (comp.name.includes('Process') || comp.name.includes('Step')) {
      sections.push('  steps?: Array<{ title: string; description: string; icon?: string }>;');
    }
    if (comp.name.includes('Stats') || comp.name.includes('Number')) {
      sections.push('  stats?: Array<{ value: string; label: string }>;');
    }
    if (comp.name.includes('Feature')) {
      sections.push('  features?: Array<{ title: string; description: string; icon?: string }>;');
      sections.push('  columns?: number;');
    }
    if (comp.name.includes('Contact') || comp.name.includes('Form')) {
      sections.push('  fields?: Array<{ name: string; type: string; label: string; required?: boolean }>;');
    }
    if (comp.name.includes('Newsletter') || comp.name.includes('Signup')) {
      sections.push('  headline?: string;');
      sections.push('  subtext?: string;');
    }
    if (comp.name.includes('Before') || comp.name.includes('After')) {
      sections.push('  comparisons?: Array<{ before: string; after: string; label: string }>;');
    }
    if (comp.name.includes('Client') || comp.name.includes('Logo')) {
      sections.push('  clients?: Array<{ name: string; logo?: string; url?: string }>;');
    }
    if (comp.name.includes('Video')) {
      sections.push('  videoUrl?: string;');
      sections.push('  caption?: string;');
    }
    if (comp.name.includes('Membership') || comp.name.includes('Tier')) {
      sections.push('  tiers?: Array<{ name: string; price: string; period: string; features: string[]; highlighted?: boolean }>;');
    }
    if (comp.name.includes('Blog') || comp.name.includes('Article')) {
      sections.push('  posts?: Array<{ title: string; excerpt: string; date: string; image?: string; url?: string }>;');
    }
    if (comp.name.includes('Vendor')) {
      sections.push('  vendors?: Array<{ name: string; specialty: string; rating?: number; image?: string }>;');
    }
    if (comp.name.includes('Dashboard')) {
      sections.push('  metrics?: Array<{ label: string; value: string; change?: string }>;');
    }

    sections.push('}');
    sections.push('```');
    sections.push('');
  }

  // ⚡ Action Required
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
  sections.push('7. Use REAL business content from the Industry Vocabulary — NO generic filler');
  sections.push('');
  sections.push('Output paths:');
  for (const comp of components) {
    const fileName = comp.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() + '.tsx';
    sections.push('- `src/components/' + fileName + '`');
  }

  return sections.join('\n');
}
