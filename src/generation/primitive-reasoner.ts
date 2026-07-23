/**
 * Primitive Reasoner — derives a full website spec from business primitives.
 * No industry catalogs, no LLM calls. Pure deterministic derivation.
 */

import { BusinessPrimitives } from './primitive-extractor';

export interface EntityDef {
  slug: string;
  name: string;
  fields: Record<string, string>;
}

export interface ThemeTokens {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  border: string;
  card: string;
  surface: string;
}

export interface SectionDef {
  id: string;
  component: string;
  props: Record<string, unknown>;
}

export interface CopyDef {
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
}

export interface DerivedSpec {
  brandName: string;
  slug: string;
  entities: EntityDef[];
  theme: ThemeTokens;
  sections: SectionDef[];
  componentMap: Record<string, string>;
  copy: CopyDef;
}

// Blocklist of real words and common prefixes that synthesized names should avoid
const NAME_BLOCKLIST = new Set([
  'apple', 'google', 'microsoft', 'amazon', 'meta', 'twitter', 'spotify', 'uber',
  'sound', 'head', 'phone', 'music', 'audio', 'wave', 'tone', 'beat',
  'yoga', 'zen', 'calm', 'peace', 'mind', 'body', 'soul',
  'flower', 'rose', 'lily', 'garden', 'petal', 'bloom',
  'crypto', 'coin', 'token', 'chain', 'block', 'defi',
  'butcher', 'meat', 'steak', 'cut', 'chop',
]);

const SYLLABLE_SUFFIXES = ['-ix', '-ex', '-on', '-ax', '-era', '-io', '-ia', '-ux', '-ox', '-ly'];

/**
 * Synthesizes a brand name from value object and emotional intent.
 * Pure deterministic, no LLM call. Algorithm:
 * 1. Extract root syllable from valueObject
 * 2. Extract mood syllable from emotionalIntent
 * 3. Combine using BLEND pattern: root[:2] + intent[:2] + suffix
 * 4. Score by pronounceability, length, no real words
 * 5. Return highest scoring candidate
 */
export function synthesizeBrandName(valueObject: string, emotionalIntent: string[]): string {
  const rootSyllables = extractRootSyllables(valueObject);
  const intentSyllables = extractIntentSyllables(emotionalIntent);
  const candidates: string[] = [];

  // Generate candidates using BLEND pattern
  for (const root of rootSyllables) {
    for (const intent of intentSyllables) {
      for (const suffix of SYLLABLE_SUFFIXES.slice(0, 3)) {
        const candidate = (root.slice(0, 2) + intent.slice(0, 2) + suffix.slice(1)).toUpperCase();
        if (!NAME_BLOCKLIST.has(candidate.toLowerCase()) && candidate.length >= 5 && candidate.length <= 8) {
          candidates.push(candidate);
        }
      }
    }
  }

  // Generate INVERT candidates
  for (const intent of intentSyllables) {
    for (const root of rootSyllables) {
      const candidate = (intent.slice(0, 3) + root.slice(0, 3)).toUpperCase();
      if (!NAME_BLOCKLIST.has(candidate.toLowerCase()) && candidate.length >= 5 && candidate.length <= 8) {
        candidates.push(candidate);
      }
    }
  }

  // Score and pick best
  const scored = candidates.map(c => ({
    name: c,
    score: scoreName(c),
  })).sort((a, b) => b.score - a.score);

  return scored[0]?.name ?? 'GENERIC';
}

function extractRootSyllables(valueObject: string): string[] {
  const syllables: string[] = [];
  const words = valueObject.toLowerCase().split(/[\s-]+/);

  for (const word of words) {
    if (word.length > 3) {
      syllables.push(word.slice(0, 4));
      syllables.push(word.slice(2, 6));
    }
    if (word.length > 5) {
      syllables.push(word.slice(3, 7));
    }
  }

  // Deduplicate
  return [...new Set(syllables)];
}

function extractIntentSyllables(emotionalIntent: string[]): string[] {
  const syllables: string[] = [];
  for (const intent of emotionalIntent) {
    const word = intent.toLowerCase();
    if (word.length > 3) {
      syllables.push(word.slice(0, 3));
      syllables.push(word.slice(2, 5));
    }
  }
  return [...new Set(syllables)];
}

function scoreName(name: string): number {
  let score = 0;
  // Prefer 5-6 chars
  if (name.length >= 5 && name.length <= 6) score += 3;
  else if (name.length >= 7 && name.length <= 8) score += 1;
  else score -= 1;
  // Penalize common prefixes
  if (/^(GO|AP|AM|TW|SP)/.test(name)) score -= 5;
  // Prefer vowel-consonant alternation
  const vowels = /[AEIOU]/g;
  const vowelCount = (name.match(vowels) || []).length;
  if (vowelCount >= 2 && vowelCount <= name.length / 2) score += 2;
  // Penalize all caps consecutive
  if (/(.)\1\1/.test(name)) score -= 3;
  return score;
}

function deriveEntities(primitives: BusinessPrimitives): EntityDef[] {
  const { valueObject, transactionType, contentShape } = primitives;
  const entities: EntityDef[] = [];

  // Core entities based on transaction type
  switch (transactionType) {
    case 'product-purchase':
      entities.push({ slug: 'product', name: 'Product', fields: { name: 'string', price: 'number', sku: 'string', image: 'string', description: 'text' } });
      entities.push({ slug: 'order', name: 'Order', fields: { total: 'number', status: 'string', customerEmail: 'string' } });
      break;
    case 'service-booking':
      entities.push({ slug: 'appointment', name: 'Appointment', fields: { date: 'datetime', duration: 'number', customerName: 'string', service: 'string' } });
      entities.push({ slug: 'service', name: 'Service', fields: { name: 'string', duration: 'number', price: 'number', description: 'text' } });
      break;
    case 'subscription':
      entities.push({ slug: 'subscription', name: 'Subscription', fields: { plan: 'string', status: 'string', startDate: 'datetime', customerEmail: 'string' } });
      break;
    case 'lead-capture':
      entities.push({ slug: 'lead', name: 'Lead', fields: { name: 'string', email: 'string', company: 'string', message: 'text' } });
      break;
    case 'marketplace':
      entities.push({ slug: 'listing', name: 'Listing', fields: { title: 'string', price: 'number', seller: 'string', description: 'text' } });
      entities.push({ slug: 'seller', name: 'Seller', fields: { name: 'string', email: 'string', rating: 'number' } });
      break;
    case 'community':
      entities.push({ slug: 'member', name: 'Member', fields: { name: 'string', email: 'string', joinedAt: 'datetime' } });
      entities.push({ slug: 'discussion', name: 'Discussion', fields: { title: 'string', body: 'text', authorId: 'string' } });
      break;
    case 'information':
      entities.push({ slug: 'article', name: 'Article', fields: { title: 'string', content: 'text', author: 'string', publishedAt: 'datetime' } });
      break;
  }

  return entities;
}

function deriveTheme(aestheticSignals: string[], emotionalIntent: string[]): ThemeTokens {
  // Start with neutral defaults
  const theme: ThemeTokens = {
    background: '#FAFAFA',
    foreground: '#18181B',
    primary: '#18181B',
    secondary: '#71717A',
    accent: '#18181B',
    muted: '#F4F4F5',
    border: '#E4E4E7',
    card: '#FFFFFF',
    surface: '#F4F4F5',
  };

  // Apply aesthetic signals
  for (const signal of aestheticSignals) {
    switch (signal) {
      case 'dark-theme':
        theme.background = '#0A0A0A';
        theme.foreground = '#F5F5F5';
        theme.primary = '#FAFAFA';
        theme.secondary = '#A1A1AA';
        theme.accent = '#3B82F6';
        theme.muted = '#27272A';
        theme.border = '#3F3F46';
        theme.card = '#18181B';
        theme.surface = '#27272A';
        break;
      case 'electric-blue':
        if (theme.primary === '#18181B') { // Only if dark-theme hasn't set it
          theme.primary = '#3B82F6';
        }
        if (theme.accent === '#18181B') { // Only if dark-theme hasn't set it
          theme.accent = '#06B6D4';
        }
        break;
      case 'warm-gold':
        theme.primary = '#D97706';
        theme.accent = '#F59E0B';
        theme.background = '#FFFBEB';
        break;
      case 'monochrome':
        theme.primary = '#18181B';
        theme.secondary = '#71717A';
        theme.accent = '#18181B';
        break;
      case 'brutalist':
        theme.background = '#000000';
        theme.foreground = '#FFFFFF';
        theme.primary = '#FF0000';
        theme.accent = '#FF0000';
        theme.border = '#FFFFFF';
        break;
      case 'glassmorphism':
        theme.background = '#0F172A';
        theme.foreground = '#F8FAFC';
        theme.primary = '#38BDF8';
        theme.card = 'rgba(255, 255, 255, 0.1)';
        theme.surface = 'rgba(255, 255, 255, 0.05)';
        break;
    }
  }

  // Emotional intent only sets defaults when aesthetic signals haven't
  if (emotionalIntent.includes('futuristic') && !aestheticSignals.includes('dark-theme') && !aestheticSignals.includes('electric-blue')) {
    theme.accent = '#06B6D4';
  }
  if (emotionalIntent.includes('premium') && !aestheticSignals.includes('dark-theme') && !aestheticSignals.includes('electric-blue')) {
    theme.primary = '#18181B';
    theme.accent = '#D4AF37';
  }

  return theme;
}

function deriveSections(primitives: BusinessPrimitives): SectionDef[] {
  const { transactionType, contentShape, aestheticSignals, valueObject } = primitives;
  const sections: SectionDef[] = [];

  // Hero section always comes first
  // Use SoundwaveHero only for consumer-electronics (headphones/audio), not just dark theme
  const useSoundwaveHero = valueObject === 'headphone' || valueObject === 'audio';
  sections.push({
    id: 'hero',
    component: useSoundwaveHero ? 'SoundwaveHero' : 'Hero',
    props: {},
  });

  // Content sections based on shape
  if (contentShape.includes('multiple-products') || contentShape.includes('specs-table')) {
    sections.push({ id: 'product-showcase', component: 'ProductShowcase', props: {} });
  }

  if (contentShape.includes('image-gallery')) {
    sections.push({ id: 'gallery', component: 'Gallery', props: {} });
  }

  if (contentShape.includes('pricing-table')) {
    sections.push({ id: 'pricing', component: 'PricingTable', props: {} });
  }

  if (contentShape.includes('reviews')) {
    sections.push({ id: 'testimonials', component: 'Testimonials', props: {} });
  }

  if (contentShape.includes('team-profiles')) {
    sections.push({ id: 'team', component: 'Team', props: {} });
  }

  if (contentShape.includes('schedule-times')) {
    sections.push({ id: 'schedule', component: 'Schedule', props: {} });
  }

  if (contentShape.includes('location-map')) {
    sections.push({ id: 'location', component: 'LocationMap', props: {} });
  }

  if (contentShape.includes('dashboard')) {
    sections.push({ id: 'dashboard', component: 'Dashboard', props: {} });
  }

  // Transaction-specific sections
  switch (transactionType) {
    case 'product-purchase':
      if (!sections.find(s => s.id === 'deals')) {
        sections.push({ id: 'deals', component: 'Deals', props: {} });
      }
      break;
    case 'service-booking':
      if (!sections.find(s => s.id === 'schedule')) {
        sections.push({ id: 'schedule', component: 'Schedule', props: {} });
      }
      break;
    case 'subscription':
      if (!sections.find(s => s.id === 'pricing')) {
        sections.push({ id: 'pricing', component: 'PricingTable', props: {} });
      }
      break;
    case 'lead-capture':
      if (!sections.find(s => s.id === 'contact')) {
        sections.push({ id: 'contact', component: 'ContactForm', props: {} });
      }
      break;
  }

  // CTA always comes last
  sections.push({ id: 'cta', component: 'CTA', props: {} });

  return sections;
}

function deriveCopy(primitives: BusinessPrimitives): CopyDef {
  const { valueObject, transactionType, emotionalIntent } = primitives;

  const valueLabel = valueObject.charAt(0).toUpperCase() + valueObject.slice(1);

  // Build hero title from value object + emotional intent (priority order)
  let heroTitle = `${valueLabel} That Redefines`;
  // Premium takes highest priority
  if (emotionalIntent.includes('premium')) heroTitle = `Premium ${valueLabel} for the Discerning`;
  // Then futuristic
  else if (emotionalIntent.includes('futuristic')) heroTitle = `The Future of ${valueLabel}`;
  // Then silence
  else if (emotionalIntent.includes('silence')) heroTitle = `Silence Redefined`;
  // Then transformation
  else if (emotionalIntent.includes('transformation')) heroTitle = `Transform Your ${valueLabel} Experience`;
  // Then trust
  else if (emotionalIntent.includes('trust')) heroTitle = `${valueLabel} You Can Trust`;
  // Then energy
  else if (emotionalIntent.includes('energy')) heroTitle = `Unleash the Power of ${valueLabel}`;
  // Then natural
  else if (emotionalIntent.includes('natural')) heroTitle = `Naturally Crafted ${valueLabel}`;
  // Then joy
  else if (emotionalIntent.includes('joy')) heroTitle = `Discover the Joy of ${valueLabel}`;
  // Then urgency
  else if (emotionalIntent.includes('urgency')) heroTitle = `${valueLabel} — Get It Now`;
  // Then authority
  else if (emotionalIntent.includes('authority')) heroTitle = `Expert ${valueLabel} Solutions`;

  // Default hero title if no emotional intent
  if (emotionalIntent.length === 0) {
    heroTitle = `${valueLabel} That Works For You`;
  }

  // Build hero subtitle
  let heroSubtitle = `Discover excellence in every detail.`;
  if (emotionalIntent.includes('premium')) heroSubtitle = `Crafted for those who accept nothing but the best.`;
  if (emotionalIntent.includes('futuristic')) heroSubtitle = `Innovation meets performance.`;
  if (emotionalIntent.includes('silence')) heroSubtitle = `Experience tranquility.`;

  // Build CTA
  let ctaText = `Get Started`;
  if (transactionType === 'product-purchase') ctaText = `Shop Now`;
  if (transactionType === 'service-booking') ctaText = `Book Now`;
  if (transactionType === 'subscription') ctaText = `Subscribe`;
  if (transactionType === 'lead-capture') ctaText = `Contact Us`;
  if (transactionType === 'marketplace') ctaText = `Browse Listings`;
  if (transactionType === 'community') ctaText = `Join Community`;
  if (transactionType === 'information') ctaText = `Read More`;

  return { heroTitle, heroSubtitle, ctaText };
}

function deriveSlug(valueObject: string): string {
  return valueObject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function deriveComponentMap(sections: SectionDef[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const section of sections) {
    map[section.id] = section.component;
  }
  return map;
}

/**
 * Main entry point — derives a full website spec from business primitives.
 * Pure function, no side effects, no external dependencies.
 */
export function deriveFromPrimitives(primitives: BusinessPrimitives): DerivedSpec {
  const brandName = synthesizeBrandName(primitives.valueObject, primitives.emotionalIntent);
  const slug = deriveSlug(primitives.valueObject);
  const entities = deriveEntities(primitives);
  const theme = deriveTheme(primitives.aestheticSignals, primitives.emotionalIntent);
  const sections = deriveSections(primitives);
  const componentMap = deriveComponentMap(sections);
  const copy = deriveCopy(primitives);

  return {
    brandName,
    slug,
    entities,
    theme,
    sections,
    componentMap,
    copy,
  };
}