import { describe, it, expect } from 'vitest';
import { verifyBuild, runVerificationLoop } from '../src/orchestration/verification/loop.js';
import type { BusinessKnowledge } from '../src/orchestration/business-intelligence/types.js';

function makeBk(overrides: Partial<BusinessKnowledge> = {}): BusinessKnowledge {
  return {
    domainNouns: ['coffee'],
    vocabulary: { domainNouns: ['coffee'], synonyms: [], brandTerms: [] },
    signals: [],
    intent: 'build',
    entities: [],
    workflows: [],
    experienceGoals: { emotionalArc: [], density: 'medium', motion: 'scroll-driven', conversionFocus: 'lead-form' },
    intents: {
      experience: [],
      interaction: [],
      motion: ['scroll-driven'],
      conversion: ['lead-form'],
      emotional: ['trust'],
      content: [],
    },
    ...overrides,
  } as unknown as BusinessKnowledge;
}

describe('Verification loop — signal-driven', () => {
  it('flags gaps in a thin, placeholder output', () => {
    const bk = makeBk({ vocabulary: { domainNouns: ['coffee'], synonyms: [], brandTerms: [] } });
    const report = verifyBuild({
      files: [{ path: 'app/page.tsx', content: 'lorem ipsum placeholder text' }],
      businessKnowledge: bk,
    });
    // business-content gap (lorem ipsum) => error => not passed
    expect(report.passed).toBe(false);
    expect(report.gaps.length).toBeGreaterThan(0);
  });

  it('passes when output reflects business entities, motion, conversion, a11y, ssr', () => {
    const bk = makeBk({
      vocabulary: { domainNouns: ['coffee'], synonyms: [], brandTerms: [] },
      intents: {
        experience: [],
        interaction: [],
        motion: ['scroll-driven'],
        conversion: ['lead-form'],
        emotional: ['trust'],
        content: [],
      },
    });
    const content = `
      <main>
        <section>
          <img src="/coffee-hero.webp" alt="Freshly roasted coffee beans" />
          <h1>Trust our reliable coffee subscription</h1>
          <p>We source secure, premium coffee for your office.</p>
        </section>
        <section>
          <form><label>Get in touch</label><button>Contact us</button></form>
        </section>
        <footer>scroll to learn more</footer>
      </main>
      export function useScroll() { useEffect(() => {}, []); }
    `;
    const report = verifyBuild({
      files: [{ path: 'app/page.tsx', content }],
      businessKnowledge: bk,
    });
    expect(report.passed).toBe(true);
    expect(report.gaps.filter((g) => g.severity === 'error')).toHaveLength(0);
  });

  it('detects missing interaction primitive as an error gap', () => {
    const bk = makeBk({
      intents: {
        experience: [],
        interaction: ['configurator'],
        motion: [],
        conversion: [],
        emotional: [],
        content: [],
      },
    });
    const report = verifyBuild({
      files: [{ path: 'app/page.tsx', content: '<main><h1>Coffee</h1></main>' }],
      businessKnowledge: bk,
    });
    expect(report.passed).toBe(false);
    expect(report.gaps.some((g) => g.category === 'interaction' && g.severity === 'error')).toBe(true);
  });

  it('runVerificationLoop is bounded and returns a report', async () => {
    const bk = makeBk();
    const result = await runVerificationLoop(
      { files: [{ path: 'app/page.tsx', content: 'lorem ipsum' }], businessKnowledge: bk },
      async (gap, current) => current,
      3,
    );
    expect(result.iterations).toBeLessThanOrEqual(3);
    expect(result.report).toBeDefined();
    expect(typeof result.report.passed).toBe('boolean');
  });
});
