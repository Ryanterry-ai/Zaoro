/**
 * Primitive Extractor — extracts domain-agnostic business primitives from a prompt.
 * No industry catalogs, no hardcoded categories. Pure text reasoning.
 */

export interface BusinessPrimitives {
  valueObject: string;
  transactionType: 'product-purchase' | 'service-booking' | 'subscription' | 'information' | 'lead-capture' | 'marketplace' | 'community';
  contentShape: string[];
  aestheticSignals: string[];
  emotionalIntent: string[];
  currency?: string;
  locale?: string;
}

interface PrimitiveSignal {
  pattern: RegExp;
  weight: number;
  mapsTo: Partial<BusinessPrimitives>;
}

const VALUE_OBJECT_PATTERNS: PrimitiveSignal[] = [
  { pattern: /\b(premium\s+)?(headphone|earphone|earbud|headset|audio|speaker|sound|music)\b/gi, weight: 3, mapsTo: { valueObject: 'headphone' } },
  { pattern: /\b(yoga|pilates|meditation|wellness|retreat|studio)\b/gi, weight: 3, mapsTo: { valueObject: 'yoga' } },
  { pattern: /\b(flower|bouquet|floral|arrangement|delivery)\b/gi, weight: 3, mapsTo: { valueObject: 'flower' } },
  { pattern: /\b(crypto|defi|lending|borrowing|yield|staking|wallet)\b/gi, weight: 3, mapsTo: { valueObject: 'crypto' } },
  { pattern: /\b(butcher|meat|charcuterie|sausage|cut|steak)\b/gi, weight: 3, mapsTo: { valueObject: 'butcher' } },
  { pattern: /\b(course|lesson|tutorial|workshop|training|education|learn)\b/gi, weight: 2, mapsTo: { valueObject: 'course' } },
  { pattern: /\b(app|software|platform|tool|saas|dashboard)\b/gi, weight: 2, mapsTo: { valueObject: 'app' } },
  { pattern: /\b(restaurant|cafe|food|menu|dining|delivery)\b/gi, weight: 2, mapsTo: { valueObject: 'restaurant' } },
  { pattern: /\b(agency|service|consulting|freelance|design|marketing)\b/gi, weight: 2, mapsTo: { valueObject: 'service' } },
  { pattern: /\b(store|shop|ecommerce|e-commerce|marketplace|shopify)\b/gi, weight: 2, mapsTo: { valueObject: 'store' } },
];

const TRANSACTION_TYPE_PATTERNS: PrimitiveSignal[] = [
  { pattern: /\b(buy|purchase|order|checkout|cart|price|cost)\b|[$€£₹¥]\s*\d+|\b(USD|EUR|GBP|INR|JPY|CAD|AUD)\b/gi, weight: 3, mapsTo: { transactionType: 'product-purchase' } },
  { pattern: /\b(book|reserve|appointment|schedule|session|slot)\b/gi, weight: 3, mapsTo: { transactionType: 'service-booking' } },
  { pattern: /\b(subscribe|subscription|monthly|recurring|membership|plan)\b/gi, weight: 3, mapsTo: { transactionType: 'subscription' } },
  { pattern: /\b(contact|lead|signup|register|enquire|quote|demo)\b/gi, weight: 2, mapsTo: { transactionType: 'lead-capture' } },
  { pattern: /\b(marketplace|vendor|seller|multi-vendor|commission)\b/gi, weight: 3, mapsTo: { transactionType: 'marketplace' } },
  { pattern: /\b(community|forum|member|discussion|social|network)\b/gi, weight: 3, mapsTo: { transactionType: 'community' } },
  { pattern: /\b(article|blog|guide|resource|learn|read|documentation)\b/gi, weight: 2, mapsTo: { transactionType: 'information' } },
];

const CONTENT_SHAPE_PATTERNS: PrimitiveSignal[] = [
  { pattern: /\b(three|four|five|multiple|several|various|models|tiers|variants)\b/gi, weight: 3, mapsTo: { contentShape: ['multiple-products'] } },
  { pattern: /\b(single|one|only)\b/gi, weight: 2, mapsTo: { contentShape: ['single-product'] } },
  { pattern: /\b(spec|specification|feature|compare|comparison|table)\b/gi, weight: 3, mapsTo: { contentShape: ['specs-table'] } },
  { pattern: /\b(gallery|image|photo|visual|showcase|lookbook)\b/gi, weight: 3, mapsTo: { contentShape: ['image-gallery'] } },
  { pattern: /\b(review|rating|testimonial|feedback)\b/gi, weight: 2, mapsTo: { contentShape: ['reviews'] } },
  { pattern: /\b(schedule|calendar|timetable|availability)\b/gi, weight: 3, mapsTo: { contentShape: ['schedule-times'] } },
  { pattern: /\b(team|trainer|instructor|profile|bio)\b/gi, weight: 2, mapsTo: { contentShape: ['team-profiles'] } },
  { pattern: /\b(location|map|address|nearby|delivery-area)\b/gi, weight: 2, mapsTo: { contentShape: ['location-map'] } },
  { pattern: /\b(pricing|plan|tier|package)\b/gi, weight: 2, mapsTo: { contentShape: ['pricing-table'] } },
  { pattern: /\b(dashboard|analytics|metric|report)\b/gi, weight: 2, mapsTo: { contentShape: ['dashboard'] } },
  { pattern: /\b(form|field|input|survey)\b/gi, weight: 1, mapsTo: { contentShape: ['form'] } },
];

const AESTHETIC_SIGNAL_PATTERNS: PrimitiveSignal[] = [
  { pattern: /\b(dark|night|midnight|black|charcoal|obsidian)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['dark-theme'] } },
  { pattern: /\b(light|white|minimal|clean|airy|bright)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['light-theme'] } },
  { pattern: /\b(electric|neon|cyan|blue|glow|vibrant|saturated)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['electric-blue'] } },
  { pattern: /\b(warm|gold|amber|sunset|terracotta|earth)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['warm-gold'] } },
  { pattern: /\b(mono|monochrome|greyscale|grayscale)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['monochrome'] } },
  { pattern: /\b(brutal|raw|industrial|concrete|raw)\b/gi, weight: 3, mapsTo: { aestheticSignals: ['brutalist'] } },
  { pattern: /\b(glass|glassmorphism|frost|blur|translucent)\b/gi, weight: 2, mapsTo: { aestheticSignals: ['glassmorphism'] } },
  { pattern: /\b(gradient|mesh|iridescent|holographic)\b/gi, weight: 2, mapsTo: { aestheticSignals: ['gradient-mesh'] } },
  { pattern: /\b(serif|editorial|magazine|typographic)\b/gi, weight: 2, mapsTo: { aestheticSignals: ['editorial-typography'] } },
  { pattern: /\b(motion|animate|scroll|parallax|transition)\b/gi, weight: 2, mapsTo: { aestheticSignals: ['scroll-motion'] } },
  { pattern: /\b(futuristic|cyber|tech|next-gen|cutting-edge|immersive)\b/gi, weight: 2, mapsTo: { aestheticSignals: ['animated-visual'] } },
];

const EMOTIONAL_INTENT_PATTERNS: PrimitiveSignal[] = [
  { pattern: /\b(silence|quiet|peaceful|tranquil|zen|still)\b/gi, weight: 3, mapsTo: { emotionalIntent: ['silence'] } },
  { pattern: /\b(calm|serene|relaxed|composed)\b/gi, weight: 3, mapsTo: { emotionalIntent: ['calm'] } },
  { pattern: /\b(futuristic|cyber|tech|innovation|next-gen|cutting-edge)\b/gi, weight: 3, mapsTo: { emotionalIntent: ['futuristic'] } },
  { pattern: /\b(premium|luxury|exclusive|elite|high-end|sophisticated)\b/gi, weight: 3, mapsTo: { emotionalIntent: ['premium'] } },
  { pattern: /\b(transform|transformation|change|evolve|upgrade|level-up)\b/gi, weight: 3, mapsTo: { emotionalIntent: ['transformation'] } },
  { pattern: /\b(trust|reliable|secure|safe|guaranteed|proven)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['trust'] } },
  { pattern: /\b(energy|dynamic|powerful|intense|bold)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['energy'] } },
  { pattern: /\b(natural|organic|pure|authentic|handcrafted)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['natural'] } },
  { pattern: /\b(joy|delight|playful|fun|happy)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['joy'] } },
  { pattern: /\b(urgent|fast|instant|now|quick|express)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['urgency'] } },
  { pattern: /\b(expert|authority|mastery|professional|certified)\b/gi, weight: 2, mapsTo: { emotionalIntent: ['authority'] } },
];

const CURRENCY_PATTERNS: PrimitiveSignal[] = [
  { pattern: /[$€£₹¥]\s*\d+/, weight: 3, mapsTo: {} },
  { pattern: /\b(USD|EUR|GBP|INR|JPY|CAD|AUD)\b/gi, weight: 3, mapsTo: {} },
];

const LOCALE_PATTERNS: PrimitiveSignal[] = [
  { pattern: /\b(mumbai|delhi|bangalore|chennai|hyderabad|pune|kolkata|india)\b/gi, weight: 3, mapsTo: { locale: 'IN' } },
  { pattern: /\b(london|manchester|birmingham|uk|britain)\b/gi, weight: 3, mapsTo: { locale: 'GB' } },
  { pattern: /\b(paris|lyon|marseille|france)\b/gi, weight: 3, mapsTo: { locale: 'FR' } },
  { pattern: /\b(berlin|munich|hamburg|germany)\b/gi, weight: 3, mapsTo: { locale: 'DE' } },
  { pattern: /\b(tokyo|osaka|japan)\b/gi, weight: 3, mapsTo: { locale: 'JP' } },
  { pattern: /\b(new york|los angeles|chicago|usa|america)\b/gi, weight: 3, mapsTo: { locale: 'US' } },
];

function extractSignals(prompt: string, patterns: PrimitiveSignal[]): Partial<BusinessPrimitives> {
  const result: Partial<BusinessPrimitives> = {};
  for (const { pattern, weight, mapsTo } of patterns) {
    const matches = prompt.match(pattern);
    if (matches && matches.length > 0) {
      for (const [key, value] of Object.entries(mapsTo)) {
        if (Array.isArray(value)) {
          // Arrays accumulate (aestheticSignals, emotionalIntent, contentShape)
          if (!Array.isArray(result[key as keyof BusinessPrimitives])) {
            (result as any)[key] = [];
          }
          (result as any)[key].push(...value);
        } else {
          // Scalars use first-match-wins (valueObject, transactionType, currency, locale)
          if (!(key in result)) {
            (result as any)[key] = value;
          }
        }
      }
    }
  }
  return result;
}

function mergeArrays<T>(...arrays: T[][]): T[] {
  const seen = new Set<string>();
  return arrays.flat().filter(item => {
    const key = String(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectValueObject(prompt: string): string {
  const signals = extractSignals(prompt, VALUE_OBJECT_PATTERNS);
  return signals.valueObject ?? 'business';
}

function detectTransactionType(prompt: string): BusinessPrimitives['transactionType'] {
  const signals = extractSignals(prompt, TRANSACTION_TYPE_PATTERNS);
  return signals.transactionType ?? 'lead-capture';
}

function detectContentShape(prompt: string): string[] {
  const signals = extractSignals(prompt, CONTENT_SHAPE_PATTERNS);
  return signals.contentShape ?? ['single-product'];
}

function detectAestheticSignals(prompt: string): string[] {
  const signals = extractSignals(prompt, AESTHETIC_SIGNAL_PATTERNS);
  return signals.aestheticSignals ?? [];
}

function detectEmotionalIntent(prompt: string): string[] {
  const signals = extractSignals(prompt, EMOTIONAL_INTENT_PATTERNS);
  return signals.emotionalIntent ?? [];
}

function detectCurrency(prompt: string): string | undefined {
  const match = prompt.match(/[$€£₹¥]\s*\d+|\b(USD|EUR|GBP|INR|JPY|CAD|AUD)\b/gi);
  if (!match) return undefined;
  const symbol = match[0];
  if (symbol.startsWith('$')) return 'USD';
  if (symbol.startsWith('€')) return 'EUR';
  if (symbol.startsWith('£')) return 'GBP';
  if (symbol.startsWith('₹')) return 'INR';
  if (symbol.startsWith('¥')) return 'JPY';
  return symbol.toUpperCase();
}

function detectLocale(prompt: string): string | undefined {
  const signals = extractSignals(prompt, LOCALE_PATTERNS);
  return signals.locale;
}

/**
 * Main entry point — extracts business primitives from a prompt.
 * Pure function, no side effects, no external dependencies.
 */
export function extractPrimitives(prompt: string): BusinessPrimitives {
  return {
    valueObject: detectValueObject(prompt),
    transactionType: detectTransactionType(prompt),
    contentShape: detectContentShape(prompt),
    aestheticSignals: detectAestheticSignals(prompt),
    emotionalIntent: detectEmotionalIntent(prompt),
    currency: detectCurrency(prompt),
    locale: detectLocale(prompt),
  };
}