/**
 * Dimensions — vertical-agnostic primitive signal extraction.
 *
 * The engine never matches a prompt to a "coffee" or "restaurant" template.
 * Instead it extracts ORTHOGONAL PRIMITIVE SIGNALS across eight dimensions:
 *   product-nature, channel, fulfillment, monetization, audience, goal,
 *   quality, locale.
 *
 * A café and a juice bar both yield product-nature=beverage. A café and a
 * supplement store both yield cart-checkout. Differentiation (cafe vs roastery
 * vs subscription) emerges from *composing* these primitives — see engine.ts.
 */

import type { DiscoveredSignal, SignalDimension, KnowledgeSourceType } from './types.js';

interface Lexicon {
  dimension: SignalDimension;
  /** primitive value the surface word maps to */
  value: string;
  /** surface words / phrases that imply this primitive */
  words: string[];
}

/**
 * Concept lexicons. Surface words map to PRIMITIVES, not verticals. Adding a
 * new industry requires NO new code here — only more surface synonyms.
 */
const LEXICONS: Lexicon[] = [
  // product-nature — what is being exchanged
  { dimension: 'product-nature', value: 'beverage', words: ['coffee', 'tea', 'espresso', 'latte', 'brew', 'beverage', 'drink', 'juice', 'smoothie', 'cocktail', 'wine', 'beer'] },
  { dimension: 'product-nature', value: 'food', words: ['restaurant', 'food', 'meal', 'dish', 'bakery', 'pastry', 'pizza', 'cuisine', 'menu', 'snack', 'dessert', 'grocery'] },
  { dimension: 'product-nature', value: 'physical-good', words: ['store', 'shop', 'product', 'apparel', 'clothing', 'furniture', 'gadget', 'device', 'gear', 'toy', 'jewelry', 'headphone', 'headphones', 'earbud', 'earbuds', 'speaker', 'speakers', 'audio', 'audio-device', 'wearable', 'accessory', 'watch', 'camera', 'drone'] },
  { dimension: 'product-nature', value: 'digital-good', words: ['ebook', 'course', 'template', 'download', 'software-license', 'plugin', 'asset', 'preset'] },
  { dimension: 'product-nature', value: 'service', words: ['salon', 'spa', 'clinic', 'consulting', 'agency', 'legal', 'accounting', 'coaching', 'training', 'repair', 'fitness', 'gym', 'dentist', 'doctor', 'therapy', 'tutoring'] },
  { dimension: 'product-nature', value: 'content', words: ['blog', 'news', 'magazine', 'portfolio', 'podcast', 'video', 'publication', 'media', 'showcase', 'gallery'] },
  { dimension: 'product-nature', value: 'software', words: ['saas', 'software', 'platform', 'tool', 'app', 'crm', 'erp', 'dashboard', 'internal-tool', 'automation'] },

  // channel — where it operates
  { dimension: 'channel', value: 'physical', words: ['cafe', 'restaurant', 'store', 'shop', 'salon', 'clinic', 'gym', 'studio', 'showroom', 'location', 'walk-in', 'branch'] },
  { dimension: 'channel', value: 'online', words: ['website', 'online', 'web', 'ecommerce', 'storefront', 'marketplace', 'app', 'digital'] },
  { dimension: 'channel', value: 'mobile', words: ['mobile', 'ios', 'android', 'app'] },

  // fulfillment — how value is delivered
  { dimension: 'fulfillment', value: 'dine-in', words: ['dine-in', 'eat-in', 'table', 'sit-down', 'cafe'] },
  { dimension: 'fulfillment', value: 'takeaway', words: ['takeaway', 'takeout', 'to-go', 'pickup', 'grab'] },
  { dimension: 'fulfillment', value: 'delivery', words: ['delivery', 'deliver', 'ship', 'shipping', 'courier', 'doorstep'] },
  { dimension: 'fulfillment', value: 'appointment', words: ['book', 'booking', 'reservation', 'reserve', 'appointment', 'schedule', 'slot'] },
  { dimension: 'fulfillment', value: 'instant-access', words: ['download', 'instant', 'access', 'stream', 'login'] },

  // monetization — how money is made
  { dimension: 'monetization', value: 'one-time', words: ['buy', 'purchase', 'sell', 'order', 'checkout', 'cart', 'product', 'shop'] },
  { dimension: 'monetization', value: 'subscription', words: ['subscription', 'subscribe', 'membership', 'member', 'recurring', 'monthly', 'plan'] },
  { dimension: 'monetization', value: 'service-fee', words: ['booking', 'appointment', 'service', 'session', 'consultation', 'class'] },
  { dimension: 'monetization', value: 'wholesale', words: ['wholesale', 'bulk', 'b2b', 'supply', 'distributor', 'trade'] },
  { dimension: 'monetization', value: 'marketplace', words: ['marketplace', 'multi-vendor', 'sellers', 'listings', 'peer-to-peer', 'p2p'] },
  { dimension: 'monetization', value: 'advertising', words: ['ads', 'advertising', 'sponsored', 'monetize', 'impressions'] },
  { dimension: 'monetization', value: 'donation', words: ['donation', 'donate', 'charity', 'nonprofit', 'fundraise', 'cause'] },
  { dimension: 'monetization', value: 'freemium', words: ['freemium', 'free-tier', 'free-plan', 'upgrade'] },

  // audience — who pays / who it serves
  { dimension: 'audience', value: 'b2c', words: ['customer', 'consumer', 'guest', 'shopper', 'patient', 'student', 'member', 'user'] },
  { dimension: 'audience', value: 'b2b', words: ['business', 'b2b', 'enterprise', 'client', 'company', 'team', 'staff', 'employee', 'partner'] },
  { dimension: 'audience', value: 'internal', words: ['internal-tool', 'back-office', 'operations', 'admin-panel', 'erp'] },

  // goal — business objective
  { dimension: 'goal', value: 'sell-products', words: ['sell', 'shop', 'store', 'product', 'buy', 'order', 'catalog', 'menu'] },
  { dimension: 'goal', value: 'sell-services', words: ['book', 'booking', 'appointment', 'service', 'reserve', 'schedule', 'class', 'session'] },
  { dimension: 'goal', value: 'generate-leads', words: ['contact', 'lead', 'inquiry', 'quote', 'get-in-touch', 'demo', 'consult'] },
  { dimension: 'goal', value: 'share-content', words: ['blog', 'news', 'article', 'portfolio', 'publish', 'content', 'magazine', 'podcast', 'showcase'] },
  { dimension: 'goal', value: 'build-community', words: ['community', 'social', 'forum', 'group', 'members', 'network'] },
  { dimension: 'goal', value: 'manage-internally', words: ['internal-tool', 'operations', 'erp', 'admin', 'dashboard', 'manage', 'back-office'] },

  // quality — positioning signal
  { dimension: 'quality', value: 'specialty', words: ['specialty', 'artisan', 'craft', 'single-origin', 'small-batch', 'curated', 'bespoke', 'premium'] },
  { dimension: 'quality', value: 'luxury', words: ['luxury', 'high-end', 'exclusive', 'maison', 'couture', 'five-star'] },
  { dimension: 'quality', value: 'budget', words: ['budget', 'cheap', 'affordable', 'value', 'discount'] },

  // locale — region (drives compliance + payment)
  { dimension: 'locale', value: 'IN', words: ['india', 'indian', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'chennai', 'pune', 'ahmedabad', 'kolkata'] },
  { dimension: 'locale', value: 'US', words: ['usa', 'united states', 'america', 'us ', 'new york', 'california', 'texas', 'austin', 'sf', 'los angeles'] },
  { dimension: 'locale', value: 'EU', words: ['europe', 'uk', 'germany', 'france', 'spain', 'italy', 'netherlands', 'eu ', 'london', 'berlin', 'paris'] },
];

/** Surface words already mapped by the lexicon — excluded from domain nouns
 *  so we don't duplicate what the archetype composer derives. */
const LEXICON_SURFACE = new Set(
  LEXICONS.flatMap((l) => l.words),
);

/** Lightweight tokenisation — word + simple 2-gram phrases. */
function tokenize(prompt: string): string[] {
  const lower = ` ${prompt.toLowerCase().trim()} `;
  const words = lower.match(/[a-z0-9']+/g) ?? [];
  const grams: string[] = [];
  for (let i = 0; i < words.length; i++) {
    grams.push(words[i]!);
    if (i < words.length - 1) grams.push(`${words[i]} ${words[i + 1]}`);
  }
  return grams;
}

/**
 * Normalise a token by stripping a single trailing inflection suffix
 * (supplying→supply, cafes→cafe, teams→team). We normalise and EXACT-match
 * against lexicon words — this avoids substring false positives
 * (booking≠book-product, teams≠tea) while still catching inflections.
 */
function normalizeToken(t: string): string {
  return t.replace(/(?:ations?|ings?|ments?|ies|ers?|eds?|s)$/, '');
}

export function extractSignals(prompt: string): DiscoveredSignal[] {
  const tokens = tokenize(prompt).map(normalizeToken);
  const found: DiscoveredSignal[] = [];

  for (const lex of LEXICONS) {
    const hit = lex.words.some((w) => tokens.includes(w) || tokens.includes(w.replace(/\s+/g, '')));
    if (hit) {
      found.push({
        dimension: lex.dimension,
        value: lex.value,
        weight: 1,
        source: 'prompt' as KnowledgeSourceType,
      });
    }
  }
  return found;
}

/** Helper: distinct values for a dimension. */
export function signalValues(signals: DiscoveredSignal[], dim: SignalDimension): string[] {
  return [...new Set(signals.filter((s) => s.dimension === dim).map((s) => s.value))];
}

export function hasSignal(signals: DiscoveredSignal[], dim: SignalDimension, value: string): boolean {
  return signals.some((s) => s.dimension === dim && s.value === value);
}

/**
 * Extract the user's own domain nouns (their words) for vocabulary.
 *
 * This is GENERIC and vertical-agnostic: instead of a curated list of known
 * business types (which would require editing every time a new product
 * appears), it extracts salient singular nouns from the prompt using
 * linguistic heuristics, then EXCLUDES generic category words (saas, store,
 * blog, website, …) and product-nature surface synonyms already captured by
 * the lexicon. This means "headphone", "soundwave", "skincare", or any future
 * product noun is captured without hardcoding an industry table.
 */
const GENERIC_CATEGORY_WORDS = new Set([
  'saas', 'store', 'shop', 'blog', 'website', 'site', 'app', 'application', 'platform',
  'system', 'tool', 'software', 'business', 'company', 'brand', 'product', 'products',
  'service', 'services', 'website', 'web', 'online', 'digital', 'experience', 'experiences',
  'customer', 'customers', 'client', 'user', 'users', 'people', 'audience', 'market',
  'industry', 'type', 'kind', 'build', 'create', 'make', 'design', 'develop', 'futuristic',
]);

/**
 * Common English stopwords. Domain nouns are the user's distinctive content
 * words; we strip function/descriptor words so the vocabulary reflects the
 * actual product (headphone, coffee, silence) rather than scaffolding
 * (where, every, into). This keeps extraction generic — no curated business
 * list, just linguistic salience.
 */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'every', 'where', 'when',
  'what', 'who', 'whom', 'which', 'will', 'would', 'could', 'should', 'have', 'has', 'had',
  'are', 'was', 'were', 'been', 'being', 'they', 'them', 'their', 'there', 'here', 'than',
  'then', 'once', 'only', 'more', 'most', 'some', 'such', 'very', 'just', 'like', 'than',
  'but', 'not', 'all', 'any', 'can', 'may', 'our', 'your', 'his', 'her', 'its', 'our',
  'these', 'those', 'how', 'why', 'out', 'off', 'over', 'under', 'between', 'about', 'around',
  'through', 'before', 'after', 'during', 'without', 'within', 'across', 'along', 'onto',
  'please', 'also', 'each', 'both', 'own', 'let', 'make', 'makes', 'made', 'get', 'gets',
  'got', 'find', 'finding', 'show', 'showing', 'see', 'seen', 'look', 'looking', 'want',
  'wants', 'need', 'needs', 'give', 'gives', 'take', 'takes', 'help', 'helps', 'use', 'uses',
  'used', 'using', 'one', 'two', 'new', 'best', 'good', 'great', 'real', 'true', 'free',
  'modern', 'easy', 'fast', 'simple', 'smart', 'clean', 'fresh', 'natural', 'based', 'powered',
  'designed', 'built', 'made', 'sells', 'selling', 'sold', 'offer', 'offers', 'offering',
  'provide', 'provides', 'providing', 'deliver', 'delivers', 'delivering', 'transform',
  'transforms', 'transforming', 'turn', 'turns', 'turning', 'become', 'becomes', 'becoming',
  'complete', 'completely', 'total', 'totally', 'full', 'fully', 'keep', 'keeps', 'won',
  'wont', 't', 'isn', 'arent', 'don', 'doesn', 'didn', 'hasn', 'havent', 'hadn', 'wouldn',
  'shouldn', 'couldn', 'cant', 'cant', 'you', 'we', 'me', 'us', 'he', 'she', 'it', 'i', 'a',
  'an', 'of', 'to', 'in', 'on', 'at', 'by', 'as', 'be', 'do', 'so', 'if', 'or', 'no', 'yes',
  'up', 'down', 'my', 'me', 'am', 'll', 're', 've', 's', 'd',
]);

export function extractDomainNouns(prompt: string): string[] {
  const lower = ` ${prompt.toLowerCase().trim()} `;
  const raw = lower.match(/[a-z][a-z'-]{2,}/g) ?? [];

  // Plural → singular normalisation so "headphones" collapses to "headphone".
  const singular = (t: string) => t.replace(/(?:ies|es|s)$/, (m) => (m === 'ies' ? 'y' : ''));

  const found = new Set<string>();
  for (const t of raw) {
    const s = singular(t);
    if (s.length < 4) continue;
    if (STOPWORDS.has(s)) continue;
    if (GENERIC_CATEGORY_WORDS.has(s)) continue;
    found.add(s);
  }
  return [...found].slice(0, 8);
}
