/**
 * Knowledge Acquisition Engine
 *
 * The SINGLE AUTHORITY for:
 * - Web research
 * - Competitor analysis
 * - Market research
 * - Evidence collection
 * - Source verification
 *
 * Consumes BusinessKnowledge from upstream.
 * Produces EvidenceCollection for downstream.
 *
 * CONSTRAINTS:
 * - Must NOT decide business logic
 * - Must NOT decide experience flow
 * - Must NOT decide content strategy
 * - Must NOT decide visual system
 */

import type { BusinessKnowledge } from '../business-intelligence/types.js';
import type { Provenance } from '../experience-intelligence/types.js';
import type {
  EvidenceCollection,
  CompetitorEvidence,
  MarketEvidence,
  IndustryEvidence,
  UserEvidence,
  TechnicalEvidence,
  IKnowledgeAcquisitionLayer,
  ValidationResult,
} from './types.js';
import { WebResearchProvider } from './web-research-provider.js';

// ─── Knowledge Source Provider Interface ─────────────────────────────────────

export interface KnowledgeSourceProvider {
  readonly id: string;
  readonly name: string;
  readonly type: 'web-research' | 'competitor-analysis' | 'market-research' | 'user-research' | 'technical-research';

  /**
   * Collect evidence from this source.
   * Returns partial evidence that will be merged into the full EvidenceCollection.
   */
  collect(businessKnowledge: BusinessKnowledge): Promise<KnowledgeSourceResult>;
}

export interface KnowledgeSourceResult {
  providerId: string;
  confidence: number;
  competitors?: CompetitorEvidence[];
  market?: Partial<MarketEvidence>;
  industry?: Partial<IndustryEvidence>;
  users?: Partial<UserEvidence>;
  technical?: Partial<TechnicalEvidence>;
  assets?: import('./types.js').DiscoveredAsset[];
}

// ─── Default Providers ────────────────────────────────────────────────────────

/**
 * Prompt-derived evidence provider.
 * Extracts evidence signals directly from the user's prompt via BusinessKnowledge.
 * Always runs — no external API calls.
 */
export class PromptEvidenceProvider implements KnowledgeSourceProvider {
  readonly id = 'prompt-evidence';
  readonly name = 'Prompt Evidence';
  readonly type = 'web-research' as const;

  async collect(bk: BusinessKnowledge): Promise<KnowledgeSourceResult> {
    const discovery = bk.discovery;
    const signals = discovery.signals;

    // Extract competitors from reference URLs and signal analysis
    const competitors: CompetitorEvidence[] = (bk.sources || [])
      .filter(s => s.type === 'website' || s.type === 'research-agent' || s.type === 'openclaw-scraper')
      .map(s => ({
        name: s.ref ? new URL(s.ref).hostname.replace('www.', '') : s.label,
        url: s.ref || '',
        strengths: [],
        weaknesses: [],
        features: [],
        source: `prompt-signal:${s.label}`,
        confidence: s.confidence,
      }));

    // Market evidence from discovery signals
    const market: Partial<MarketEvidence> = {
      targetAudience: bk.customerPersonas?.map(p => p.label) || [],
      trends: signals.filter(s => s.weight > 0.5).map(s => `${s.dimension}: ${s.value}`),
      opportunities: [],
      source: 'prompt-analysis',
      confidence: 0.6,
    };

    // Industry evidence from discovery
    const industry: Partial<IndustryEvidence> = {
      name: discovery.industry || discovery.businessType,
      standards: [],
      regulations: bk.compliance?.map(c => c.pack) || [],
      bestPractices: [],
      trends: [],
      source: 'prompt-analysis',
      confidence: 0.5,
    };

    // User evidence from personas
    const users: Partial<UserEvidence> = {
      personas: bk.customerPersonas?.map(p => ({
        name: p.label,
        description: `${p.role} - ${p.lifecycle}`,
        demographics: {},
        needs: p.needs || [],
        frustrations: p.friction || [],
      })) || [],
      painPoints: bk.customerJourney?.stages?.map(s => s.action) || [],
      goals: bk.workflows?.map(w => w.description) || [],
      behaviors: bk.customerJourney?.stages?.map(s => `Stage: ${s.stage}`) || [],
      source: 'prompt-analysis',
      confidence: 0.6,
    };

    // Technical evidence from integrations
    const technical: Partial<TechnicalEvidence> = {
      techStack: [],
      benchmarks: {},
      integrations: bk.integrations?.map(i => i.requirement) || [],
      security: bk.compliance?.filter(c => c.pack === 'soc2' || c.pack === 'pci-dss').map(c => c.pack) || [],
      source: 'prompt-analysis',
      confidence: 0.5,
    };

    return {
      providerId: this.id,
      confidence: 0.6,
      competitors,
      market,
      industry,
      users,
      technical,
    };
  }
}

/**
 * Domain-data evidence provider.
 * Enriches evidence with pre-built domain knowledge.
 */
export class DomainDataEvidenceProvider implements KnowledgeSourceProvider {
  readonly id = 'domain-data-evidence';
  readonly name = 'Domain Data Evidence';
  readonly type = 'market-research' as const;

  private readonly domainInsights: Record<string, Partial<MarketEvidence> & { bestPractices?: string[] }> = {
    restaurant: {
      trends: ['online ordering', 'contactless dining', 'farm-to-table', 'ghost kitchens'],
      opportunities: ['loyalty programs', 'catering services', 'meal kits'],
      bestPractices: ['high-quality food photography', 'menu accessibility', 'reservation integration'],
      source: 'domain-knowledge',
      confidence: 0.7,
    },
    ecommerce: {
      trends: ['social commerce', 'AR try-on', 'subscription models', 'same-day delivery'],
      opportunities: ['personalization', 'cross-sell', 'reviews UGC'],
      bestPractices: ['product photography', 'clear pricing', 'trust badges', 'fast checkout'],
      source: 'domain-knowledge',
      confidence: 0.7,
    },
    saas: {
      trends: ['AI integration', 'usage-based pricing', 'vertical SaaS', 'PLG'],
      opportunities: ['freemium tier', 'API marketplace', 'integrations ecosystem'],
      bestPractices: ['clear onboarding', 'feature comparison', 'ROI calculator'],
      source: 'domain-knowledge',
      confidence: 0.7,
    },
    fitness: {
      trends: ['hybrid classes', 'wearable integration', 'AI coaching', 'community features'],
      opportunities: ['personal training', 'nutrition plans', 'corporate wellness'],
      bestPractices: ['trainer profiles', 'class schedules', 'progress tracking'],
      source: 'domain-knowledge',
      confidence: 0.7,
    },
    healthcare: {
      trends: ['telemedicine', 'patient portals', 'AI diagnostics', 'remote monitoring'],
      opportunities: ['online booking', 'health records', 'insurance integration'],
      bestPractices: ['HIPAA compliance', 'doctor credentials', 'patient reviews'],
      source: 'domain-knowledge',
      confidence: 0.7,
    },
    'real-estate': {
      trends: ['virtual tours', '3D walkthroughs', 'AI property matching', 'iBuyer models'],
      opportunities: ['mortgage calculator', 'neighborhood guides', 'market analysis'],
      bestPractices: ['high-quality photos', 'virtual staging', 'agent profiles'],
      source: 'domain-knowledge',
      confidence: 0.7,
    },
    'perfume': {
      trends: ['niche fragrances', 'scent profiling', 'sustainable ingredients', 'direct-to-consumer'],
      opportunities: ['bespoke blending', 'discovery sets', 'refill programs'],
      bestPractices: ['scent descriptions', 'ingredient storytelling', 'luxury packaging'],
      source: 'domain-knowledge',
      confidence: 0.7,
    },
    fragrance: {
      trends: ['niche fragrances', 'scent profiling', 'sustainable ingredients', 'direct-to-consumer'],
      opportunities: ['bespoke blending', 'discovery sets', 'refill programs'],
      bestPractices: ['scent descriptions', 'ingredient storytelling', 'luxury packaging'],
      source: 'domain-knowledge',
      confidence: 0.7,
    },
    luxury: {
      trends: ['experiential luxury', 'digital exclusives', 'heritage storytelling', 'sustainability'],
      opportunities: ['VIP programs', 'limited editions', 'brand experiences'],
      bestPractices: ['visual storytelling', 'premium photography', 'minimal UI'],
      source: 'domain-knowledge',
      confidence: 0.7,
    },
    education: {
      trends: ['micro-learning', 'AI tutoring', 'gamification', 'mobile-first'],
      opportunities: ['certifications', 'corporate training', 'marketplace'],
      bestPractices: ['course previews', 'instructor profiles', 'progress tracking'],
      source: 'domain-knowledge',
      confidence: 0.7,
    },
    fintech: {
      trends: ['open banking', 'embedded finance', 'AI advisors', 'crypto integration'],
      opportunities: ['financial planning', 'expense management', 'investment tools'],
      bestPractices: ['security badges', 'regulatory compliance', 'transparent pricing'],
      source: 'domain-knowledge',
      confidence: 0.7,
    },
  };

  async collect(bk: BusinessKnowledge): Promise<KnowledgeSourceResult> {
    const industry = bk.discovery.industry || bk.discovery.businessType;
    const insights = this.domainInsights[industry] || this.domainInsights['other'];

    if (!insights) {
      return { providerId: this.id, confidence: 0.3 };
    }

    return {
      providerId: this.id,
      confidence: insights.confidence || 0.5,
      market: insights,
      industry: {
        name: industry,
        standards: [],
        regulations: [],
        bestPractices: (insights as any).bestPractices || [],
        trends: insights.trends || [],
        source: 'domain-knowledge',
        confidence: insights.confidence || 0.5,
      },
    };
  }
}

// ─── Knowledge Acquisition Engine ─────────────────────────────────────────────

export class KnowledgeAcquisitionEngine implements IKnowledgeAcquisitionLayer {
  readonly id = 'knowledge-acquisition' as const;
  readonly name = 'Knowledge Acquisition Engine';
  readonly version = '1.0.0';

  private providers: KnowledgeSourceProvider[] = [
    new PromptEvidenceProvider(),
    new DomainDataEvidenceProvider(),
    new WebResearchProvider(),
  ];

  constructor(additionalProviders?: KnowledgeSourceProvider[]) {
    if (additionalProviders) {
      this.providers.push(...additionalProviders);
    }
  }

  /**
   * Process BusinessKnowledge and produce EvidenceCollection.
   *
   * Runs all registered providers, merges their results, and produces
   * a single EvidenceCollection with full provenance.
   */
  async process(businessKnowledge: BusinessKnowledge): Promise<EvidenceCollection> {
    const results = await Promise.all(
      this.providers.map(provider => this.safeCollect(provider, businessKnowledge))
    );

    // Merge results into a single EvidenceCollection
    const merged = this.mergeResults(results, businessKnowledge);

    return merged;
  }

  /**
   * Validate EvidenceCollection.
   */
  validate(collection: EvidenceCollection): ValidationResult {
    const issues: ValidationResult['issues'] = [];

    if (!collection.id) {
      issues.push({ severity: 'error', message: 'EvidenceCollection missing id', field: 'id' });
    }

    if (!collection.businessKnowledgeId) {
      issues.push({ severity: 'error', message: 'EvidenceCollection missing businessKnowledgeId', field: 'businessKnowledgeId' });
    }

    // Check minimum evidence quality
    const competitors = collection.competitors?.value || [];
    if (competitors.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'No competitor evidence collected',
        field: 'competitors',
        fix: 'Add web-research providers or check prompt for reference URLs',
      });
    }

    const market = collection.market?.value;
    if (!market?.trends?.length) {
      issues.push({
        severity: 'warning',
        message: 'No market trends identified',
        field: 'market.trends',
        fix: 'Add domain-data or market-research providers',
      });
    }

    const users = collection.users?.value;
    if (!users?.personas?.length) {
      issues.push({
        severity: 'warning',
        message: 'No user personas identified',
        field: 'users.personas',
        fix: 'Ensure BusinessKnowledge.customerPersonas is populated',
      });
    }

    // Check overall confidence
    const overallConfidence = this.calculateOverallConfidence(collection);
    if (overallConfidence < 0.3) {
      issues.push({
        severity: 'warning',
        message: `Low overall confidence: ${(overallConfidence * 100).toFixed(0)}%`,
        field: 'confidence',
        fix: 'Add more evidence providers or improve prompt specificity',
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async safeCollect(
    provider: KnowledgeSourceProvider,
    bk: BusinessKnowledge
  ): Promise<KnowledgeSourceResult> {
    try {
      return await provider.collect(bk);
    } catch (error) {
      console.warn(`[KnowledgeAcquisition] Provider ${provider.id} failed:`, error);
      return {
        providerId: provider.id,
        confidence: 0,
      };
    }
  }

  private mergeResults(
    results: KnowledgeSourceResult[],
    bk: BusinessKnowledge
  ): EvidenceCollection {
    const now = new Date();

    // Merge competitors (deduplicate by URL)
    const competitorMap = new Map<string, CompetitorEvidence>();
    for (const result of results) {
      if (result.competitors) {
        for (const comp of result.competitors) {
          const key = comp.url || comp.name;
          if (!competitorMap.has(key)) {
            competitorMap.set(key, comp);
          }
        }
      }
    }

    // Merge discovered real assets (deduplicate by URL)
    const assetMap = new Map<string, import('./types.js').DiscoveredAsset>();
    for (const result of results) {
      if (result.assets) {
        for (const asset of result.assets) {
          if (!assetMap.has(asset.url)) assetMap.set(asset.url, asset);
        }
      }
    }

    // Merge market evidence (last writer wins for scalar fields, concat for arrays)
    const market: MarketEvidence = {
      targetAudience: [],
      trends: [],
      opportunities: [],
      source: 'merged',
      confidence: 0.5,
    };
    for (const result of results) {
      if (result.market) {
        if (result.market.targetAudience) market.targetAudience.push(...result.market.targetAudience);
        if (result.market.trends) market.trends.push(...result.market.trends);
        if (result.market.opportunities) market.opportunities.push(...result.market.opportunities);
        if (result.market.marketSize) market.marketSize = result.market.marketSize;
        if (result.market.marketGrowth) market.marketGrowth = result.market.marketGrowth;
        market.source = result.providerId;
        market.confidence = Math.max(market.confidence, result.market.confidence || 0);
      }
    }
    // Deduplicate arrays
    market.targetAudience = [...new Set(market.targetAudience)];
    market.trends = [...new Set(market.trends)];
    market.opportunities = [...new Set(market.opportunities)];

    // Merge industry evidence
    const industry: IndustryEvidence = {
      name: bk.discovery.industry || bk.discovery.businessType,
      standards: [],
      regulations: [],
      bestPractices: [],
      trends: [],
      source: 'merged',
      confidence: 0.5,
    };
    for (const result of results) {
      if (result.industry) {
        if (result.industry.standards) industry.standards.push(...result.industry.standards);
        if (result.industry.regulations) industry.regulations.push(...result.industry.regulations);
        if (result.industry.bestPractices) industry.bestPractices.push(...result.industry.bestPractices);
        if (result.industry.trends) industry.trends.push(...result.industry.trends);
        industry.source = result.providerId;
        industry.confidence = Math.max(industry.confidence, result.industry.confidence || 0);
      }
    }
    industry.standards = [...new Set(industry.standards)];
    industry.regulations = [...new Set(industry.regulations)];
    industry.bestPractices = [...new Set(industry.bestPractices)];
    industry.trends = [...new Set(industry.trends)];

    // Merge user evidence
    const users: UserEvidence = {
      personas: [],
      painPoints: [],
      goals: [],
      behaviors: [],
      source: 'merged',
      confidence: 0.5,
    };
    for (const result of results) {
      if (result.users) {
        if (result.users.personas) users.personas.push(...result.users.personas);
        if (result.users.painPoints) users.painPoints.push(...result.users.painPoints);
        if (result.users.goals) users.goals.push(...result.users.goals);
        if (result.users.behaviors) users.behaviors.push(...result.users.behaviors);
        users.source = result.providerId;
        users.confidence = Math.max(users.confidence, result.users.confidence || 0);
      }
    }
    users.painPoints = [...new Set(users.painPoints)];
    users.goals = [...new Set(users.goals)];
    users.behaviors = [...new Set(users.behaviors)];

    // Merge technical evidence
    const technical: TechnicalEvidence = {
      techStack: [],
      benchmarks: {},
      integrations: [],
      security: [],
      source: 'merged',
      confidence: 0.5,
    };
    for (const result of results) {
      if (result.technical) {
        if (result.technical.techStack) technical.techStack.push(...result.technical.techStack);
        if (result.technical.integrations) technical.integrations.push(...result.technical.integrations);
        if (result.technical.security) technical.security.push(...result.technical.security);
        if (result.technical.benchmarks) {
          Object.assign(technical.benchmarks, result.technical.benchmarks);
        }
        technical.source = result.providerId;
        technical.confidence = Math.max(technical.confidence, result.technical.confidence || 0);
      }
    }
    technical.techStack = [...new Set(technical.techStack)];
    technical.integrations = [...new Set(technical.integrations)];
    technical.security = [...new Set(technical.security)];

    const prov = (conf: number) => ({
      layer: 'knowledge-acquisition' as const,
      confidence: conf,
      evidence: [],
      timestamp: now,
      reasoning: 'Knowledge Acquisition Engine',
      source: 'knowledge-acquisition',
    });

    return {
      id: `evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      version: '1.0.0',
      businessKnowledgeId: `bk-${Buffer.from(bk.discovery?.businessType || 'unknown').toString('base64').slice(0, 12)}`,
      competitors: {
        value: [...competitorMap.values()],
        provenance: prov(this.calculateOverallConfidence({ competitors: { value: [...competitorMap.values()] } } as any)),
      },
      market: {
        value: market,
        provenance: prov(market.confidence),
      },
      industry: {
        value: industry,
        provenance: prov(industry.confidence),
      },
      users: {
        value: users,
        provenance: prov(users.confidence),
      },
      technical: {
        value: technical,
        provenance: prov(technical.confidence),
      },
      assets: {
        value: [...assetMap.values()],
        provenance: prov([...assetMap.values()].length ? 0.7 : 0),
      },
    };
  }

  private calculateOverallConfidence(collection: EvidenceCollection): number {
    const confidences: number[] = [];

    if (collection.competitors) {
      const comps = collection.competitors.value;
      if (comps.length > 0) {
        confidences.push(comps.reduce((sum, c) => sum + c.confidence, 0) / comps.length);
      }
    }
    if (collection.market) confidences.push(collection.market.value.confidence);
    if (collection.industry) confidences.push(collection.industry.value.confidence);
    if (collection.users) confidences.push(collection.users.value.confidence);
    if (collection.technical) confidences.push(collection.technical.value.confidence);

    if (confidences.length === 0) return 0;
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }
}
