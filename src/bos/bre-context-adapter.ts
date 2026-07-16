// ─── BREContext Adapter (canonical → legacy renderer contract) ───────────────
// Converts the canonical, vertical-agnostic BusinessKnowledge into the legacy
// BREContext shape that the renderer (runBREV2Pipeline / runBuildPipeline)
// still consumes. This lets the live V4 build route the renderer through the
// canonical BusinessKnowledge instead of the keyword-driven buildBREContext
// parser — removing the parallel business-derivation path.
//
// No `if industry == X` branching here: every field is mapped from primitive
// signals already resolved by the Business Intelligence Engine.

import type { BREContext } from './reasoning/rules-engine.js';
import type { BusinessKnowledge } from '../orchestration/business-intelligence/types.js';
import type { BusinessResearch, ScrapedContent } from './types.js';

/** Map a revenue model to the legacy business-model label set. */
function revenueModelToBusinessModels(model: string): string[] {
  switch (model) {
    case 'subscription': return ['subscription'];
    case 'marketplace-take-rate': return ['marketplace'];
    case 'advertising': return ['advertising'];
    case 'donation': return ['donation'];
    case 'wholesale': return ['wholesale'];
    case 'service-fee': return ['service-booking'];
    case 'freemium': return ['subscription', 'direct-sales'];
    default: return ['direct-sales'];
  }
}

/** Map resolved workflows to capability ids the renderer understands. */
function workflowsToCapabilities(workflows: Array<{ id: string; kind: string }>): string[] {
  const caps = new Set<string>();
  for (const wf of workflows) {
    if (wf.id === 'browse' || wf.kind === 'browse') caps.add('gallery');
    if (wf.id === 'search' || wf.kind === 'search-filter') caps.add('search');
    if (wf.id === 'checkout' || wf.kind === 'cart-checkout') caps.add('commerce');
    if (wf.id === 'booking' || wf.kind === 'booking') caps.add('booking');
    if (wf.id === 'subscription' || wf.kind === 'subscription') caps.add('subscriptions');
    if (wf.id === 'marketplace' || wf.kind === 'marketplace') caps.add('marketplace');
    if (wf.id === 'content' || wf.kind === 'content-publishing') caps.add('content');
    if (wf.id === 'lead' || wf.kind === 'contact-lead') caps.add('contact-form');
    if (wf.id === 'auth' || wf.kind === 'auth-account') caps.add('auth');
  }
  if (caps.size === 0) caps.add('contact-form');
  return [...caps];
}

/** Map journey stages to the renderer's journey labels. */
function journeysFromStages(stages: Array<{ stage: string }>): string[] {
  const set = new Set<string>(['visitor']);
  for (const s of stages) {
    if (s.stage === 'conversion' || s.stage === 'onboarding' || s.stage === 'retention') set.add('customer');
    if (s.stage === 'awareness') set.add('visitor');
  }
  return [...set];
}

/** Map compliance requirements to pack ids. */
function complianceToPacks(compliance: Array<{ pack: string }>): string[] {
  const packs: string[] = [];
  for (const c of compliance) {
    const r = c.pack.toLowerCase();
    if (r.includes('gdpr')) packs.push('compliance.gdpr');
    if (r.includes('hipaa')) packs.push('compliance.hipaa');
    if (r.includes('pci')) packs.push('compliance.pci-dss');
    if (r.includes('soc2') || r.includes('soc 2')) packs.push('compliance.soc2');
    if (r.includes('fssai')) packs.push('compliance.fssai');
  }
  return [...new Set(packs)];
}

/** Build a minimal BusinessResearch so downstream consumers have a foundation. */
function buildBusinessResearch(bk: BusinessKnowledge): BusinessResearch {
  const discovery = bk.discovery ?? ({} as any);
  const personas = (bk.customerPersonas ?? []).map(p => p.label);
  return {
    businessType: discovery.businessType ?? discovery.intent ?? 'business',
    industry: discovery.industry ?? 'general',
    subIndustry: discovery.subIndustry ?? discovery.industry ?? 'general',
    domain: discovery.domain ?? discovery.industry ?? 'general',
    userPersonas: personas.length > 0 ? personas : ['general consumers'],
    customerFlow: ['discover', 'evaluate', 'purchase', 'receive'],
    revenueFlow: revenueModelToBusinessModels(bk.revenue?.model ?? 'one-time'),
    paymentMethods: bk.revenue?.payment?.methods ?? ['credit-card'],
    businessWorkflow: (bk.workflows ?? []).map(w => w.id),
    kpis: (bk.kpis ?? []).map(k => (k as any).name ?? (k as any).metric ?? 'revenue'),
    vocabulary: (bk.vocabulary as any) ?? {},
    referenceUrls: [],
    realProducts: [],
    realTestimonials: [],
  } as BusinessResearch;
}

/**
 * Map BusinessKnowledge workflows to the canonical capability id set used by
 * the experience reasoning engine. Pure mapping — no industry branching.
 */
export function capabilitiesFromBusinessKnowledge(bk: BusinessKnowledge): string[] {
  return workflowsToCapabilities(bk.workflows ?? []);
}

/**
 * Adapt a canonical BusinessKnowledge into a BREContext for the renderer.
 * The canonical BI engine has already done all business reasoning; this is a
 * pure field mapping, not a re-derivation.
 */
export function breContextFromBusinessKnowledge(
  bk: BusinessKnowledge,
  opts?: { scrapedContent?: ScrapedContent },
): BREContext {
  const discovery = bk.discovery ?? ({} as any);
  const appName = discovery.businessType || discovery.domain || 'Application';

  const ctx: BREContext = {
    industry: discovery.industry ?? 'general',
    subIndustry: discovery.subIndustry,
    businessModels: revenueModelToBusinessModels(bk.revenue?.model ?? 'one-time'),
    capabilities: workflowsToCapabilities(bk.workflows ?? []),
    journeys: journeysFromStages(bk.customerJourney?.stages ?? []),
    entities: (bk.entities ?? []).map(e => (typeof e === 'string' ? e : (e as any).name ?? String(e))),
    compliancePacks: complianceToPacks(bk.compliance ?? []),
    appName,
    description: discovery.intent || discovery.businessType || appName,
    businessResearch: buildBusinessResearch(bk),
    businessKnowledge: bk,
  };

  if (opts?.scrapedContent) ctx.scrapedContent = opts.scrapedContent;

  // Audience: present if any persona is a business/client/internal role.
  const hasB2B = (bk.customerPersonas ?? []).some(p =>
    /business|client|enterprise|b2b/i.test(p.label) ||
    (bk.userRoles ?? []).some(r => r.tier === 'staff' || r.tier === 'admin'));
  if (hasB2B) ctx.audience = 'b2b';

  return ctx;
}
