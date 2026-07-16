/**
 * Experience Intelligence E2E Test
 *
 * Verifies the full pipeline produces an ExperienceBlueprint and that
 * the generated code contains blueprint-driven motion (hover, stagger, viewport).
 */

import { describe, it, expect } from 'vitest';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import { buildBREContext } from '../src/bos/intake-parser.js';

describe('Experience Intelligence E2E', () => {
  it('fitness gym pipeline produces experience blueprint with scenes', async () => {
    const ctx = await buildBREContext('a fitness gym membership site with class booking');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    // Experience blueprint must exist
    expect(result.experienceBlueprint).toBeDefined();
    const bp = result.experienceBlueprint!;

    // Must have sections
    expect(bp.sectionOrder.value.length).toBeGreaterThan(0);

    // Must have scroll narrative
    expect(bp.scrollNarrative).toBeDefined();
    expect(bp.scrollNarrative.value.speedProfile).toBeDefined();

    // Must have hover behaviors
    expect(bp.hoverBehavior).toBeDefined();
    expect(bp.hoverBehavior.value.elements.length).toBeGreaterThan(0);
  }, 120000);

  it('generated code contains blueprint-driven viewport props', async () => {
    const ctx = await buildBREContext('a fitness gym membership site with class booking');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const allCode = result.renderResult.files.map(f => f.content).join('\n');

    // Must contain whileInView (viewport-triggered animations)
    expect(allCode).toContain('whileInView');

    // Must contain viewport config
    expect(allCode).toContain('viewport={{');

    // Must contain initial animation states
    expect(allCode).toContain('initial={{');
  }, 120000);

  it('generated code contains motion.a for buttons when blueprint exists', async () => {
    const ctx = await buildBREContext('a fitness gym membership site with class booking');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const allCode = result.renderResult.files.map(f => f.content).join('\n');

    // Buttons should use motion.a when blueprint exists
    if (result.experienceBlueprint) {
      expect(allCode).toContain('motion.a');
    }
  }, 120000);

  it('design-lineage includes experience field', async () => {
    const ctx = await buildBREContext('a fitness gym membership site with class booking');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    const lineageFile = result.renderResult.files.find(f => f.path === 'design-lineage.json');
    expect(lineageFile).toBeDefined();

    if (lineageFile) {
      const lineage = JSON.parse(lineageFile.content);
      expect(lineage.experience).toBeDefined();
      // 'experience-intelligence' when blueprint generated, 'none' when not enough sections
      expect(['experience-intelligence', 'none']).toContain(lineage.experience);
    }
  }, 120000);

  it('restaurant pipeline completes without crashing', async () => {
    const ctx = await buildBREContext('an Italian restaurant with online menu and reservations');
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: './test-output' });

    // Pipeline must complete
    expect(result.renderResult.files.length).toBeGreaterThan(0);

    // Blueprint may or may not exist (small sites may not have 3+ sections)
    // But the pipeline must not crash
  }, 120000);
});
