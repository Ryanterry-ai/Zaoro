import type { RequirementBlueprint, Requirement } from '../requirement-extraction/types.js';
import type {
  PromptFulfillmentScore,
  RequirementFulfillment,
  PromptFulfillmentConfig,
} from './types.js';

const DEFAULT_CONFIG: PromptFulfillmentConfig = {
  passThreshold: 0.8,
  partialThreshold: 0.5,
};

export class PromptFulfillmentEngine {
  private config: PromptFulfillmentConfig;

  constructor(config?: Partial<PromptFulfillmentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  score(
    requirements: RequirementBlueprint,
    renderedContent: Record<string, unknown>,
    blueprint?: Record<string, unknown>,
  ): PromptFulfillmentScore {
    const fulfillments = requirements.allRequirements.map((req) =>
      this.scoreRequirement(req, renderedContent, blueprint),
    );

    const totalWeight = fulfillments.reduce((sum, f) => {
      const w = f.priority === 'must' ? 3 : f.priority === 'should' ? 2 : 1;
      return sum + w;
    }, 0);

    const weightedScore = fulfillments.reduce((sum, f) => {
      const w = f.priority === 'must' ? 3 : f.priority === 'should' ? 2 : 1;
      return sum + f.score * w;
    }, 0);

    const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const fulfilledCount = fulfillments.filter((f) => f.status === 'PASS').length;
    const partialCount = fulfillments.filter((f) => f.status === 'PARTIAL').length;
    const failedCount = fulfillments.filter((f) => f.status === 'FAIL').length;

    let overallStatus: PromptFulfillmentScore['overallStatus'] = 'FAIL';
    if (overallScore >= this.config.passThreshold) {
      overallStatus = 'PASS';
    } else if (overallScore >= this.config.partialThreshold) {
      overallStatus = 'PARTIAL';
    }

    return {
      overallScore,
      overallStatus,
      totalRequirements: fulfillments.length,
      fulfilledCount,
      partialCount,
      failedCount,
      requirementFulfillments: fulfillments,
      summary: this.buildSummary(overallStatus, fulfillments),
      timestamp: new Date().toISOString(),
    };
  }

  private scoreRequirement(
    req: Requirement,
    renderedContent: Record<string, unknown>,
    blueprint?: Record<string, unknown>,
  ): RequirementFulfillment {
    const content = JSON.stringify(renderedContent).toLowerCase();
    const bp = blueprint ? JSON.stringify(blueprint).toLowerCase() : '';
    const combined = content + ' ' + bp;

    const evidence: string[] = [];
    const failures: string[] = [];
    let score = 0;

    const keywords = req.description.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matchedKeywords = keywords.filter((kw) => combined.includes(kw));
    const keywordRatio = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;

    if (keywordRatio >= 0.7) {
      score = 1;
      evidence.push(`Keyword coverage: ${matchedKeywords.length}/${keywords.length}`);
    } else if (keywordRatio >= 0.4) {
      score = 0.5;
      evidence.push(`Partial keyword coverage: ${matchedKeywords.length}/${keywords.length}`);
      failures.push(`Missing keywords: ${keywords.filter((k) => !matchedKeywords.includes(k)).join(', ')}`);
    } else {
      score = 0;
      failures.push(`Low keyword coverage: ${matchedKeywords.length}/${keywords.length}`);
    }

    const categoryHints: Record<string, string[]> = {
      navigation: ['nav', 'menu', 'header', 'link'],
      responsive: ['mobile', 'responsive', 'breakpoint', 'viewport', 'media query'],
      seo: ['meta', 'title', 'description', 'og:', 'canonical', 'sitemap'],
      accessibility: ['aria', 'role', 'alt', 'tabindex', 'focus'],
      performance: ['lazy', 'preload', 'compress', 'optimize', 'cache'],
      content: ['hero', 'section', 'heading', 'paragraph', 'image'],
      ui: ['button', 'form', 'input', 'modal', 'card', 'grid'],
      security: ['csrf', 'sanitiz', 'helmet', 'cors', 'rate limit'],
    };

    const hints = categoryHints[req.category] || [];
    const matchedHints = hints.filter((h) => combined.includes(h));

    if (hints.length > 0) {
      const hintScore = matchedHints.length / hints.length;
      score = (score + hintScore) / 2;
      if (matchedHints.length > 0) {
        evidence.push(`Category hints (${req.category}): ${matchedHints.join(', ')}`);
      }
    }

    let status: RequirementFulfillment['status'] = 'FAIL';
    if (score >= 0.7) status = 'PASS';
    else if (score >= 0.4) status = 'PARTIAL';

    return {
      requirementId: req.id,
      description: req.description,
      owner: req.owner,
      category: req.category,
      priority: req.priority,
      status,
      score,
      evidence,
      failures,
    };
  }

  private buildSummary(
    status: PromptFulfillmentScore['overallStatus'],
    fulfillments: RequirementFulfillment[],
  ): string {
    const pass = fulfillments.filter((f) => f.status === 'PASS').length;
    const partial = fulfillments.filter((f) => f.status === 'PARTIAL').length;
    const fail = fulfillments.filter((f) => f.status === 'FAIL').length;
    const total = fulfillments.length;

    const lines = [
      `## Prompt Fulfillment Summary`,
      ``,
      `**Overall Status:** ${status}`,
      `**Score:** ${pass}/${total} fulfilled, ${partial} partial, ${fail} failed`,
      ``,
    ];

    const failed = fulfillments.filter((f) => f.status === 'FAIL');
    if (failed.length > 0) {
      lines.push(`### Failed Requirements`);
      for (const f of failed) {
        lines.push(`- **${f.requirementId}** (${f.priority}, owner: ${f.owner}): ${f.description}`);
        for (const fail of f.failures) {
          lines.push(`  - ${fail}`);
        }
      }
    }

    return lines.join('\n');
  }
}
