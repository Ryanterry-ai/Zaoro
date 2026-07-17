import type { RuleDecision } from './rules-engine.js';
import type { AppFamilyResult } from './application-family-classifier.js';
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
        (ctx.industry ?? '').toLowerCase().includes(p) ||
        (ctx.subIndustry && ctx.subIndustry.toLowerCase().includes(p)) ||
        p.includes((ctx.industry ?? '').toLowerCase()),
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

      const industryLower = (ctx.industry ?? '').toLowerCase().replace(/-/g, '');
      const industryMatch = industryLower.length > 0 && pattern.compatibleIndustries.some(i =>
        industryLower.includes(i.replace(/-/g, '')),
      );
      breakdown.industryFit = industryMatch ? 30 : 5;
      total += breakdown.industryFit;

      // Sub-industry match: more specific than top-level industry
      if (ctx.subIndustry) {
        const si = ctx.subIndustry.toLowerCase().replace(/-/g, '');
        const subMatch = pattern.compatibleIndustries.some(i => {
          const norm = i.replace(/-/g, '');
          return si === norm || si.includes(norm) || norm.includes(si);
        });
        if (subMatch) {
          breakdown.subIndustryFit = 15;
          total += breakdown.subIndustryFit;
        }
      }

      // Description keyword boost: matches user's prompt words against pattern's
      // compatibleIndustries. Uses word-boundary regex to avoid false positives
      // where a short substring like 'ev' matches within a longer word like 'event'.
      // Fixes the sub-industry routing gap where "hospital ERP" is classified as
      // enterprise-software but should also match hospital patterns.
      if (ctx.description) {
        const desc = ctx.description.toLowerCase();
        const kwMatch = pattern.compatibleIndustries.some(i =>
          i.length >= 3 && new RegExp('\\b' + i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(desc),
        );
        if (kwMatch) {
          breakdown.descriptionKeywordBoost = 10;
          total += breakdown.descriptionKeywordBoost;
        }
      }

      const modelMatch = (pattern.compatibleBusinessModels ?? []).some(m =>
        (ctx.businessModels ?? []).some(bm => bm.toLowerCase() === m.toLowerCase()),
      );
      breakdown.modelFit = modelMatch ? 25 : 10;
      total += breakdown.modelFit;

      // Size terms are now relevance-gated to prevent page-count bias.
      // When pattern has no domain relevance (industryFit < 20, modelFit < 20),
      // size contributes only minimal signal (capped at 5). When relevant,
      // size contributes moderately (capped at 10). This prevents the largest
      // pattern from always winning when industry is unknown.
      const hasRelevance = breakdown.industryFit >= 20 || breakdown.modelFit >= 20;

      breakdown.pageCoverage = hasRelevance
        ? Math.min(pattern.pages.length * 2, 10)
        : Math.min(pattern.pages.length * 1, 5);
      total += breakdown.pageCoverage;

      breakdown.componentCount = hasRelevance
        ? Math.min(pattern.components.length * 1, 8)
        : Math.min(pattern.components.length * 0.5, 3);
      total += breakdown.componentCount;

      // HARD GATE: if context requires a specific business model (e.g., wholesale)
      // and the pattern doesn't support it, apply severe penalty.
      // This prevents B2C patterns from winning B2B wholesale businesses
      // just because they share a secondary model like 'direct-sales'.
      const hasWholesale = (ctx.businessModels ?? []).some(bm => bm.toLowerCase() === 'wholesale');
      const patternSupportsWholesale = (pattern.compatibleBusinessModels ?? []).some(m =>
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

export function shouldUseNoPattern(
  topScore: ScoredOption | undefined,
  appFamily: AppFamilyResult,
  _industryFit?: number,
): boolean {
  if (appFamily.family === 'industry-specific') return false;
  if (!topScore) return true;

  const industryFit = topScore.breakdown['industryFit'] ?? 0;
  if (industryFit >= 20) return false;

  // For data-organiser: no matching pattern exists, use NoPattern
  if (appFamily.family === 'data-organiser') return true;

  // For productivity-tool and developer-tool: a matching pattern may exist
  // (e.g., "Task & Project Management" for task tracker). Only use NoPattern
  // if the top pattern's name clearly doesn't match the detected family.
  if (
    (appFamily.family === 'productivity-tool' || appFamily.family === 'developer-tool') &&
    appFamily.confidence >= 0.7
  ) {
    // Check if top pattern's name contains family-relevant keywords
    const topPatternName = topScore.name.toLowerCase();
    const familyKeywords = appFamily.family === 'productivity-tool'
      ? ['task', 'project', 'productivity', 'todo', 'kanban', 'habit', 'note', 'tracker']
      : ['bug', 'issue', 'developer', 'code', 'repository', 'devops'];
    const hasKeywordMatch = familyKeywords.some(kw => topPatternName.includes(kw));
    if (hasKeywordMatch) return false;
    // No keyword match — use NoPattern for this family
    return true;
  }

  if (appFamily.confidence >= 0.7 && industryFit < 20) return true;

  return false;
}
