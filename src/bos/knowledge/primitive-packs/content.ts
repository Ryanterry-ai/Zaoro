// ─── Content Primitive Packs ───────────────────────────────────────
// Governs copy tone and content density. Seeds: Standard, Premium Brand,
// SEO-Heavy, Clinical.

import { PrimitivePack, primitivePackId } from './types.js';

interface ContentSeed {
  id: string;
  name: string;
  tone: string;
  forbiddenPhrases?: string[];
  keywords: string[];
}

const CONTENT_SEEDS: ContentSeed[] = [
  {
    id: 'standard',
    name: 'Standard Content',
    tone: 'clear and conversational',
    keywords: ['standard', 'general'],
  },
  {
    id: 'premium-brand',
    name: 'Premium Brand',
    tone: 'aspirational, refined, confident',
    forbiddenPhrases: ['cheap', 'discount', 'free'],
    keywords: ['premium', 'luxury', 'high-end', 'exclusive'],
  },
  {
    id: 'seo-heavy',
    name: 'SEO-Heavy',
    tone: 'keyword-rich, informative',
    keywords: ['seo', 'search', 'ranking'],
  },
  {
    id: 'clinical',
    name: 'Clinical / Regulated',
    tone: 'precise, reassuring, compliant',
    forbiddenPhrases: ['cure', 'guaranteed', 'miracle'],
    keywords: ['clinical', 'medical', 'healthcare', 'regulated'],
  },
];

export const CONTENT_PRIMITIVE_PACKS: PrimitivePack[] = CONTENT_SEEDS.map(seed => ({
  id: primitivePackId('content', seed.id),
  dimension: 'content',
  name: seed.name,
  description: `Content primitive pack: ${seed.tone}`,
  keywords: seed.keywords,
  copy: { forbiddenPhrases: seed.forbiddenPhrases },
  providesCapabilities: ['content:' + seed.id],
  appliesTo: (ctx) => {
    const industry = ctx.industry ?? '';
    if (seed.id === 'clinical') return industry.includes('health') || industry.includes('medical') || industry.includes('hospital') || industry.includes('clinical');
    if (seed.id === 'premium-brand') return industry.includes('luxury') || industry.includes('premium') || (ctx.capabilities ?? []).includes('premium');
    if (seed.id === 'seo-heavy') return (ctx.capabilities ?? []).includes('seo');
    // 'standard' is the fallback — never short-circuit; getContentPrimitivePack uses it as fallback.
    return false;
  },
}));

export function getContentPrimitivePack(ctx: { industry?: string; capabilities?: string[] }): PrimitivePack {
  return (
    CONTENT_PRIMITIVE_PACKS.find(p => p.appliesTo?.(ctx)) ??
    CONTENT_PRIMITIVE_PACKS.find(p => p.id === primitivePackId('content', 'standard'))!
  );
}
