/**
 * Experience Intelligence Benchmark Suite — 10 industry prompts
 *
 * Runs real prompts through the full Build.Anything pipeline and evaluates
 * the Experience Intelligence layer as a proxy for screenshot evaluation:
 *   - ExperienceBlueprint is produced (scenes, scroll narrative, hover)
 *   - Generated code is motion-driven (viewport / whileInView / initial)
 *   - No generic/all-none-motion output survives validation
 *   - design-lineage records experience-intelligence provenance
 *
 * Verdicts are written to audit-output/experience-benchmark-*.json for review.
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import { buildBREContext } from '../src/bos/intake-parser.js';

const PROMPTS: Array<{ id: string; industry: string; prompt: string }> = [
  { id: 'ecom-001', industry: 'ecommerce', prompt: 'a supplement store selling protein powders and vitamins online with cart and checkout' },
  { id: 'saas-001', industry: 'saas', prompt: 'a SaaS project management dashboard for remote teams with kanban boards' },
  { id: 'fin-001', industry: 'fintech', prompt: 'a personal banking app for tracking expenses and budgeting with insights' },
  { id: 'health-001', industry: 'healthcare', prompt: 'a telemedicine clinic booking platform with doctor profiles and video visits' },
  { id: 'edu-001', industry: 'education', prompt: 'an online course platform with video lessons and student progress tracking' },
  { id: 'rest-001', industry: 'restaurant', prompt: 'an Italian restaurant with online menu and table reservations' },
  { id: 'fit-001', industry: 'fitness', prompt: 'a fitness gym membership site with class booking and trainer profiles' },
  { id: 'real-001', industry: 'real-estate', prompt: 'a real estate listings site with property search and agent contact' },
  { id: 'media-001', industry: 'media', prompt: 'a news portal with article categories and newsletter signup' },
  { id: 'port-001', industry: 'portfolio', prompt: 'a photographer portfolio with gallery and inquiry form' },
];

function evaluate(prompt: { id: string; industry: string; prompt: string }, result: Awaited<ReturnType<typeof runBuildPipeline>>) {
  const bp = result.experienceBlueprint;
  const allCode = result.renderResult.files.map(f => f.content).join('\n');

  const hasBlueprint = !!bp;
  const sceneCount = bp?.sectionOrder?.value?.length ?? 0;
  const hasNarrative = !!bp?.scrollNarrative?.value?.speedProfile;
  const hoverCount = bp?.hoverBehavior?.value?.elements?.length ?? 0;
  const motionDriven = allCode.includes('whileInView') && allCode.includes('viewport={{') && allCode.includes('initial={{');
  const hasMotionA = allCode.includes('motion.a');

  const lineageFile = result.renderResult.files.find(f => f.path === 'design-lineage.json');
  const lineageExperience = lineageFile ? JSON.parse(lineageFile.content).experience : 'none';

  const checks = {
    blueprintProduced: hasBlueprint,
    scenesPresent: sceneCount > 0,
    narrativePresent: hasNarrative,
    hoverBehaviorsPresent: hoverCount > 0,
    motionDrivenCode: motionDriven,
    motionAnchorPresent: hasMotionA,
    lineageProvenance: lineageExperience === 'experience-intelligence',
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const verdict = passed === total ? 'PASS' : passed >= total - 1 ? 'WARN' : 'FAIL';

  return { id: prompt.id, industry: prompt.industry, prompt: prompt.prompt, checks, passed, total, verdict, sceneCount, hoverCount };
}

describe('Experience Intelligence Benchmark (10 industries)', () => {
  const verdicts: unknown[] = [];

  for (const p of PROMPTS) {
    it(`[${p.id}] ${p.industry} — experience blueprint quality`, async () => {
      const ctx = await buildBREContext(p.prompt);
      const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

      const report = evaluate(p, result);
      verdicts.push(report);

      // Core assertions — blueprint must exist and be motion-driven
      expect(report.checks.blueprintProduced, 'blueprint produced').toBe(true);
      expect(report.checks.scenesPresent, 'scenes present').toBe(true);
      expect(report.checks.narrativePresent, 'narrative present').toBe(true);
      expect(report.checks.hoverBehaviorsPresent, 'hover behaviors present').toBe(true);
      expect(report.checks.motionDrivenCode, 'motion-driven code').toBe(true);
    }, 120000);
  }

  it('writes benchmark verdicts to audit-output', () => {
    const dir = join(process.cwd(), 'audit-output');
    mkdirSync(dir, { recursive: true });
    for (const v of verdicts) {
      const r = v as { id: string };
      writeFileSync(join(dir, `experience-benchmark-${r.id}.json`), JSON.stringify(v, null, 2));
    }
    expect(verdicts.length).toBe(PROMPTS.length);
  });
});
