// ─── Locale / Region Primitive Packs ───────────────────────────────
// Locale affects copy tone, date/currency formatting, and which regional
// compliance regimes apply. Seeds: India, US, EU, Global.

import { PrimitivePack, primitivePackId } from './types.js';

interface LocaleSeed {
  id: string;
  name: string;
  country: string;
  currency: string;
  dateFormat: string;
  vocabulary?: Record<string, string>;
  compliance?: string[];
  keywords: string[];
}

const LOCALE_SEEDS: LocaleSeed[] = [
  {
    id: 'india',
    name: 'India',
    country: 'IN',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    vocabulary: { color: 'colour', favorites: 'wishlist' },
    compliance: ['compliance.fssai'],
    keywords: ['india', 'in', 'indian', 'bharat'],
  },
  {
    id: 'us',
    name: 'United States',
    country: 'US',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    keywords: ['us', 'usa', 'united states', 'american'],
  },
  {
    id: 'eu',
    name: 'European Union',
    country: 'EU',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    compliance: ['compliance.gdpr'],
    keywords: ['eu', 'europe', 'european', 'uk'],
  },
  {
    id: 'global',
    name: 'Global',
    country: 'GLOBAL',
    currency: 'USD',
    dateFormat: 'YYYY-MM-DD',
    keywords: ['global', 'worldwide', 'international'],
  },
];

export const LOCALE_PRIMITIVE_PACKS: PrimitivePack[] = LOCALE_SEEDS.map(seed => ({
  id: primitivePackId('locale', seed.id),
  dimension: 'locale',
  name: seed.name,
  description: `Locale primitive pack for ${seed.name} (${seed.currency}, ${seed.dateFormat})`,
  keywords: seed.keywords,
  vocabulary: seed.vocabulary,
  compliance: seed.compliance,
  providesCapabilities: ['locale:' + seed.id, 'currency:' + seed.currency],
  appliesTo: (ctx) =>
    !!ctx.locale && (ctx.locale === seed.id || seed.keywords.includes(ctx.locale)) ||
    !!ctx.country && ctx.country.toUpperCase() === seed.country,
}));

export function getLocalePrimitivePack(locale?: string, country?: string): PrimitivePack {
  return (
    LOCALE_PRIMITIVE_PACKS.find(p => p.appliesTo?.({ locale, country })) ??
    LOCALE_PRIMITIVE_PACKS.find(p => p.id === primitivePackId('locale', 'global'))!
  );
}
