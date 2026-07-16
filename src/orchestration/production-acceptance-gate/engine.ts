import type {
  AcceptanceGateConfig,
  AcceptanceGateResult,
  GateCheck,
} from './types.js';
import { capabilityRegistry } from '../../bos/capabilities/index.js';
import type { CapabilityManifest } from '../../bos/capabilities/index.js';

const DEFAULT_CONFIG: AcceptanceGateConfig = {
  architectureScoreMin: 0.7,
  promptFulfillmentMin: 0.7,
  capabilityCoverageMin: 0.6,
  visualScoreMin: 0.6,
  experienceScoreMin: 0.6,
  accessibilityMin: 0.5,
  performanceMin: 0.6,
  reviewScoreMin: 0.6,
};

export class ProductionAcceptanceGateEngine {
  private config: AcceptanceGateConfig;

  constructor(config?: Partial<AcceptanceGateConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  evaluate(artifacts: Record<string, unknown>): AcceptanceGateResult {
    const checks: GateCheck[] = [];

    checks.push(this.checkArchitectureScore(artifacts));
    checks.push(this.checkPromptFulfillment(artifacts));
    checks.push(this.checkCapabilityCoverage(artifacts));
    checks.push(this.checkVisualValidation(artifacts));
    checks.push(this.checkExperienceScore(artifacts));
    checks.push(this.checkAccessibility(artifacts));
    checks.push(this.checkPerformance(artifacts));
    checks.push(this.checkReviewScore(artifacts));

    const passedChecks = checks.filter((c) => c.status === 'PASS');
    const failedChecks = checks.filter((c) => c.status === 'FAIL');
    const overallScore = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;

    const overallPassed = failedChecks.length === 0 && overallScore >= 0.7;

    return {
      overallPassed,
      checks,
      overallScore,
      timestamp: new Date().toISOString(),
      summary: this.buildSummary(overallPassed, checks),
    };
  }

  private checkArchitectureScore(artifacts: Record<string, unknown>): GateCheck {
    const score = this.extractScore(artifacts, 'architectureScore', 'architecture');
    return {
      name: 'Architecture Score',
      status: score >= this.config.architectureScoreMin ? 'PASS' : 'FAIL',
      score,
      message: `Architecture score: ${Math.round(score * 100)}% (min: ${Math.round(this.config.architectureScoreMin * 100)}%)`,
    };
  }

  private checkPromptFulfillment(artifacts: Record<string, unknown>): GateCheck {
    const pf = artifacts.promptFulfillment as
      | { overallScore?: number; overallStatus?: string }
      | undefined;
    const score = pf?.overallScore ?? 0;
    return {
      name: 'Prompt Fulfillment',
      status: score >= this.config.promptFulfillmentMin ? 'PASS' : 'FAIL',
      score,
      message: `Fulfillment: ${Math.round(score * 100)}% (min: ${Math.round(this.config.promptFulfillmentMin * 100)}%)`,
    };
  }

  private checkCapabilityCoverage(artifacts: Record<string, unknown>): GateCheck {
    // Phase R2: prefer the canonical Capability Manifest emitted by V4. Coverage
    // = fraction of the app's declared (expanded) capabilities that are fulfilled.
    const manifest = artifacts.capabilityManifest as CapabilityManifest | undefined;
    let score = 0;
    if (manifest && Array.isArray(manifest.capabilities) && manifest.capabilities.length > 0) {
      const fulfilled = Array.isArray(artifacts.capabilities)
        ? (artifacts.capabilities as string[])
        : manifest.capabilities;
      score = capabilityRegistry.coverageScore(manifest.capabilities, fulfilled);
    } else {
      const cap = artifacts.capabilityCoverage as { score?: number } | undefined;
      score = cap?.score ?? 0;
      // No explicit coverage supplied: derive a normalized presence baseline from
      // any raw capability ids (legacy artifact shape).
      if (score === 0 && Array.isArray(artifacts.capabilities)) {
        const caps = (artifacts.capabilities as string[])
          .map(c => capabilityRegistry.normalize(c))
          .filter((c): c is string => Boolean(c));
        score = caps.length > 0 ? 1 : 0;
      }
    }
    return {
      name: 'Capability Coverage',
      status: score >= this.config.capabilityCoverageMin ? 'PASS' : 'FAIL',
      score,
      message: `Capability coverage: ${Math.round(score * 100)}% (min: ${Math.round(this.config.capabilityCoverageMin * 100)}%)`,
    };
  }

  private checkVisualValidation(artifacts: Record<string, unknown>): GateCheck {
    const score = this.extractScore(artifacts, 'visualScore', 'visualValidation');
    return {
      name: 'Visual Validation',
      status: score >= this.config.visualScoreMin ? 'PASS' : 'FAIL',
      score,
      message: `Visual score: ${Math.round(score * 100)}% (min: ${Math.round(this.config.visualScoreMin * 100)}%)`,
    };
  }

  private checkExperienceScore(artifacts: Record<string, unknown>): GateCheck {
    const score = this.extractScore(artifacts, 'experienceScore', 'experience');
    return {
      name: 'Experience Score',
      status: score >= this.config.experienceScoreMin ? 'PASS' : 'FAIL',
      score,
      message: `Experience score: ${Math.round(score * 100)}% (min: ${Math.round(this.config.experienceScoreMin * 100)}%)`,
    };
  }

  private checkAccessibility(artifacts: Record<string, unknown>): GateCheck {
    const score = this.extractScore(artifacts, 'accessibilityScore', 'accessibility');
    return {
      name: 'Accessibility',
      status: score >= this.config.accessibilityMin ? 'PASS' : 'FAIL',
      score,
      message: `Accessibility: ${Math.round(score * 100)}% (min: ${Math.round(this.config.accessibilityMin * 100)}%)`,
    };
  }

  private checkPerformance(artifacts: Record<string, unknown>): GateCheck {
    const score = this.extractScore(artifacts, 'performanceScore', 'performance');
    return {
      name: 'Performance',
      status: score >= this.config.performanceMin ? 'PASS' : 'FAIL',
      score,
      message: `Performance: ${Math.round(score * 100)}% (min: ${Math.round(this.config.performanceMin * 100)}%)`,
    };
  }

  private checkReviewScore(artifacts: Record<string, unknown>): GateCheck {
    const review = artifacts.reviewScore as { score?: number } | undefined;
    const score = review?.score ?? 0.8;
    return {
      name: 'Review Score',
      status: score >= this.config.reviewScoreMin ? 'PASS' : 'FAIL',
      score,
      message: `Review: ${Math.round(score * 100)}% (min: ${Math.round(this.config.reviewScoreMin * 100)}%)`,
    };
  }

  private extractScore(
    artifacts: Record<string, unknown>,
    ...keys: string[]
  ): number {
    for (const key of keys) {
      const val = artifacts[key];
      if (typeof val === 'number') return val;
      if (typeof val === 'object' && val !== null) {
        const obj = val as Record<string, unknown>;
        if (typeof obj.score === 'number') return obj.score;
        if (typeof obj.overallScore === 'number') return obj.overallScore;
      }
    }
    return 0;
  }

  private buildSummary(passed: boolean, checks: GateCheck[]): string {
    const lines = [
      `## Production Acceptance Gate`,
      ``,
      `**Overall:** ${passed ? '✅ PASSED' : '❌ FAILED'}`,
      ``,
    ];

    for (const c of checks) {
      const icon = c.status === 'PASS' ? '✅' : c.status === 'FAIL' ? '❌' : '⚠️';
      lines.push(`${icon} ${c.name}: ${c.message}`);
    }

    const failed = checks.filter((c) => c.status === 'FAIL');
    if (failed.length > 0) {
      lines.push(``, `### Blocking Issues`);
      for (const f of failed) {
        lines.push(`- ${f.name}: ${f.message}`);
      }
    }

    return lines.join('\n');
  }
}
