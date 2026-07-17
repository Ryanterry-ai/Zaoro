import { describe, it, expect } from 'vitest';
import { understandBusiness } from '../src/orchestration/business-intelligence/engine.js';
import { generateExperienceBlueprint, deriveMotionIntent } from '../src/orchestration/experience-intelligence/experience-engine.js';

describe('headphone prompt end-to-end', () => {
  const prompt = 'Build me a futuristic headphone website where every scroll transforms noise into silence- from chaotic soundwaves to complete calm experiance people won t forget';

  it('BI yields Product entity (no industry hardcoded)', () => {
    const bk = understandBusiness(prompt);
    const entityNames = bk.entities.map((e: any) => (typeof e === 'string' ? e : e.name));
    expect(entityNames).toContain('Product');
  });

  it('motion intent detects scroll + noise→silence arc', () => {
    const intent = deriveMotionIntent(prompt);
    expect(intent.scrollDriven).toBe(true);
    expect(intent.transformArc).toEqual({ from: 'noise', to: 'silence' });
    expect(intent.theme).toBe('silence');
  });

  it('experience blueprint enables scrollAccumulation with transformArc', () => {
    const bk = understandBusiness(prompt);
    const bp = generateExperienceBlueprint({
      sections: [{ type: 'HeroBanner' }, { type: 'FeatureGrid' }, { type: 'CTASection' }],
      pageType: 'landing',
      description: prompt,
    });
    expect(bp.scrollAccumulation?.value?.enabled).toBe(true);
    expect(bp.scrollAccumulation?.value?.transformArc).toEqual({ from: 'noise', to: 'silence' });
  });
});
