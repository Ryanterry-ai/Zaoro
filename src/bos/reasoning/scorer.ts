import type { RuleDecision } from './rules-engine.js';
import type { DesignProfile } from '../schemas/knowledge/design-profile.schema.js';
import type { Pattern } from '../schemas/knowledge/pattern.schema.js';

export interface ScoredOption {
  id: string;
  name: string;
  score: number;
  breakdown: Record<string, number>;
  reason: string;
}

export interface ScoringContext {
  industry: string;
  subIndustry?: string;
  description?: string;
  businessModels: string[];
  capabilities: string[];
  decisions: RuleDecision[];
  designProfiles: DesignProfile[];
  patterns: Pattern[];
}

function getDescriptionKeywords(desc?: string): string[] {
  if (!desc) return [];
  return desc.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

export class Scorer {
  scoreDesignProfiles(ctx: ScoringContext): ScoredOption[] {
    return ctx.designProfiles.map(profile => {
      const breakdown: Record<string, number> = {};
      let total = 0;

      const industryMatch = profile.brandPersonality.some(p =>
        ctx.industry.toLowerCase().includes(p),
      );
      breakdown.industryFit = industryMatch ? 30 : 10;
      total += breakdown.industryFit;

      const complexityScore = Math.min(
        Object.keys(profile.componentsStyling.button).length * 5 +
        Object.keys(profile.componentsStyling.card).length * 5,
        30,
      );
      breakdown.componentCoverage = complexityScore;
      total += breakdown.componentCoverage;

      breakdown.motionQuality = profile.microInteractions.length > 0 ? 20 : 10;
      total += breakdown.motionQuality;

      breakdown.a11yScore = profile.accessibility.contrastRatio >= 4.5 ? 20 : 10;
      total += breakdown.a11yScore;

      return {
        id: profile.id,
        name: profile.name,
        score: total,
        breakdown,
        reason: `Score ${total}/100: industry fit ${breakdown.industryFit}, components ${breakdown.componentCoverage}, motion ${breakdown.motionQuality}, a11y ${breakdown.a11yScore}`,
      };
    }).sort((a, b) => b.score - a.score);
  }

  scorePatterns(ctx: ScoringContext): ScoredOption[] {
    return ctx.patterns.map(pattern => {
      const breakdown: Record<string, number> = {};
      let total = 0;

      const industryMatch = pattern.compatibleIndustries.some(i =>
        ctx.industry.toLowerCase().includes(i),
      );
      breakdown.industryFit = industryMatch ? 30 : 5;
      total += breakdown.industryFit;

      // Sub-industry match: more specific than top-level industry
      if (ctx.subIndustry) {
        const si = ctx.subIndustry.toLowerCase();
        const subMatch = pattern.compatibleIndustries.some(i =>
          si === i || si.includes(i) || i.includes(si),
        );
        if (subMatch) {
          breakdown.subIndustryFit = 15;
          total += breakdown.subIndustryFit;
        }
      }

      // Description keyword boost: matches user's prompt words against pattern's
      // compatibleIndustries. Fixes the sub-industry routing gap where "hospital ERP"
      // is classified as enterprise-software but should also match hospital patterns.
      if (ctx.description) {
        const desc = ctx.description.toLowerCase();
        const kwMatch = pattern.compatibleIndustries.some(i =>
          desc.includes(i),
        );
        if (kwMatch) {
          breakdown.descriptionKeywordBoost = 10;
          total += breakdown.descriptionKeywordBoost;
        }
      }

      const modelMatch = pattern.compatibleBusinessModels.some(m =>
        ctx.businessModels.some(bm => bm.toLowerCase() === m.toLowerCase()),
      );
      breakdown.modelFit = modelMatch ? 25 : 10;
      total += breakdown.modelFit;

      breakdown.pageCoverage = Math.min(pattern.pages.length * 5, 25);
      total += breakdown.pageCoverage;

      breakdown.componentCount = Math.min(pattern.components.length * 3, 20);
      total += breakdown.componentCount;

      // HARD GATE: if context requires a specific business model (e.g., wholesale)
      // and the pattern doesn't support it, apply severe penalty.
      // This prevents B2C patterns from winning B2B wholesale businesses
      // just because they share a secondary model like 'direct-sales'.
      const hasWholesale = ctx.businessModels.some(bm => bm.toLowerCase() === 'wholesale');
      const patternSupportsWholesale = pattern.compatibleBusinessModels.some(m =>
        m.toLowerCase() === 'wholesale',
      );
      if (hasWholesale && !patternSupportsWholesale) {
        breakdown.modelGatePenalty = -Math.floor(total * 0.7);
        total += breakdown.modelGatePenalty;
      }

      return {
        id: pattern.id,
        name: pattern.name,
        score: total,
        breakdown,
        reason: `Score ${total}/100: industry ${breakdown.industryFit}${breakdown.subIndustryFit ? `, sub-industry ${breakdown.subIndustryFit}` : ''}${breakdown.descriptionKeywordBoost ? `, desc-kw ${breakdown.descriptionKeywordBoost}` : ''}, model ${breakdown.modelFit}, pages ${breakdown.pageCoverage}, components ${breakdown.componentCount}${breakdown.modelGatePenalty ? `, gate penalty ${breakdown.modelGatePenalty}` : ''}`,
      };
    }).sort((a, b) => b.score - a.score);
  }

  rankOptions(options: ScoredOption[]): ScoredOption[] {
    return options.sort((a, b) => b.score - a.score);
  }

  selectBest(options: ScoredOption[]): ScoredOption | undefined {
    return options[0];
  }
}
