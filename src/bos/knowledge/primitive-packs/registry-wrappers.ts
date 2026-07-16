// ─── Registry-backed Primitive Packs ──────────────────────────────
// Wraps the existing KnowledgeRegistry collections (Business Models,
// Journeys, Compliance Packs) as primitive packs so they compose with the
// Industry / Locale / Technology / Content primitives. No data is duplicated
// — these are thin adapters over the canonical registry objects.

import {
  BUSINESS_MODELS,
  JOURNEYS,
  COMPLIANCE_PACKS,
} from '../registry.js';
import { PrimitivePack, primitivePackId } from './types.js';

export const BUSINESS_MODEL_PRIMITIVE_PACKS: PrimitivePack[] = BUSINESS_MODELS.map(bm => ({
  id: primitivePackId('business-model', bm.id.replace(/^bm\./, '')),
  dimension: 'business-model',
  name: bm.name,
  description: bm.description,
  keywords: bm.keywords,
  providesCapabilities: ['bm:' + bm.id, ...bm.keywords],
  source: bm,
  appliesTo: (ctx) => {
    const models = [ctx.businessModel, ...(ctx.businessModels ?? [])].filter(Boolean) as string[];
    const idKey = bm.id.replace(/^bm\./, '');
    return models.some(m => m === idKey || m === bm.id || bm.keywords.includes(m));
  },
}));

export const EXPERIENCE_PRIMITIVE_PACKS: PrimitivePack[] = JOURNEYS.map(j => ({
  id: primitivePackId('experience', j.id.replace(/^journey\./, '')),
  dimension: 'experience',
  name: j.name,
  description: `Experience primitive pack (${j.roles.join(', ')})`,
  keywords: [j.id.replace(/^journey\./, ''), ...j.roles],
  roles: j.roles,
  providesCapabilities: ['journey:' + j.id, ...j.permissions],
  source: j,
  appliesTo: (ctx) => {
    const journeys = ctx.journeys ?? [];
    const idKey = j.id.replace(/^journey\./, '');
    return journeys.includes(idKey) || journeys.includes(j.id) || j.roles.some(r => (ctx.capabilities ?? []).includes(r));
  },
}));

export const COMPLIANCE_PRIMITIVE_PACKS: PrimitivePack[] = COMPLIANCE_PACKS.map(cp => ({
  id: primitivePackId('compliance', cp.id.replace(/^compliance\./, '')),
  dimension: 'compliance',
  name: cp.name,
  description: cp.description,
  keywords: [cp.id.replace(/^compliance\./, ''), cp.jurisdiction.toLowerCase()],
  compliance: [cp.id],
  providesCapabilities: ['compliance:' + cp.id],
  source: cp,
  appliesTo: (ctx) => {
    const industry = ctx.industry ?? '';
    const models = [ctx.businessModel, ...(ctx.businessModels ?? [])];
    const industryMatch = cp.applicableIndustries.some(i => industry === i || industry.includes(i));
    const modelMatch = cp.applicableBusinessModels.some(m => models.includes(m));
    const localeMatch = cp.jurisdiction && ctx.country
      ? cp.jurisdiction.toUpperCase() === ctx.country.toUpperCase()
      : false;
    return industryMatch || modelMatch || localeMatch;
  },
}));
