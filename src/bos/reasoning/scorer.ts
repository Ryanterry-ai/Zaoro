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
  businessModels: string[];
  capabilities: string[];
  decisions: RuleDecision[];
  designProfiles: DesignProfile[];
  patterns: Pattern[];
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

      const modelMatch = pattern.compatibleBusinessModels.some(m =>
        ctx.businessModels.some(bm => bm.toLowerCase() === m.toLowerCase()),
      );
      breakdown.modelFit = modelMatch ? 25 : 10;
      total += breakdown.modelFit;

      breakdown.pageCoverage = Math.min(pattern.pages.length * 5, 25);
      total += breakdown.pageCoverage;

      breakdown.componentCount = Math.min(pattern.components.length * 3, 20);
      total += breakdown.componentCount;

      return {
        id: pattern.id,
        name: pattern.name,
        score: total,
        breakdown,
        reason: `Score ${total}/100: industry ${breakdown.industryFit}, model ${breakdown.modelFit}, pages ${breakdown.pageCoverage}, components ${breakdown.componentCount}`,
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
