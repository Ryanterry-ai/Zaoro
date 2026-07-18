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
  { dimension: 'product-nature', value: 'physical-good', words: ['store', 'shop', 'product', 'apparel', 'clothing', 'furniture', 'gadget', 'device', 'gear', 'toy', 'jewelry'] },
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

  // ── Intent dimensions (vertical-agnostic, cue-driven) ──
  // These let ANY prompt express an experience without an industry template.

  // experience-intent — the shape of the whole site
  { dimension: 'experience-intent', value: 'immersive-scroll', words: ['scroll', 'as you scroll', 'on scroll', 'scrolling', 'parallax', 'storytelling', 'journey', 'experience', 'calm', 'immersive', 'cinematic', 'atmosphere', 'focus', 'serene', 'sensory', 'mood'] },
  { dimension: 'experience-intent', value: 'utility', words: ['tool', 'dashboard', 'portal', 'admin', 'calculator', 'configurator', 'builder', 'internal'] },
  { dimension: 'experience-intent', value: 'editorial', words: ['blog', 'magazine', 'news', 'publication', 'article', 'portfolio', 'showcase'] },
  { dimension: 'experience-intent', value: 'immersive-3d', words: ['3d', 'webgl', 'three.js', 'r3f', 'virtual', 'ar', 'vr', 'metaverse', 'holographic'] },

  // interaction-intent — named interaction patterns (become reusable primitives)
  { dimension: 'interaction-intent', value: 'configurator', words: ['configurator', 'customize', 'build your own', 'personalize', 'make your own', 'design your'] },
  { dimension: 'interaction-intent', value: 'builder', words: ['builder', 'build your', 'burger builder', 'pizza builder', 'sandwich builder', 'compose your'] },
  { dimension: 'interaction-intent', value: 'booking', words: ['book', 'booking', 'reserve', 'reservation', 'appointment', 'schedule'] },
  { dimension: 'interaction-intent', value: 'quiz', words: ['quiz', 'assessment', 'finder', 'recommender', 'match you'] },
  { dimension: 'interaction-intent', value: 'calculator', words: ['calculator', 'estimate', 'quote calculator', 'roi', 'savings'] },
  { dimension: 'interaction-intent', value: 'hud', words: ['hud', 'overlay', 'dashboard overlay', 'live overlay', 'real-time panel'] },
  { dimension: 'interaction-intent', value: 'dashboard', words: ['dashboard', 'analytics', 'metrics', 'reporting', 'portal', 'admin panel'] },

  // motion-intent — how things move
  { dimension: 'motion-intent', value: 'scroll-driven', words: ['scroll', 'as you scroll', 'on scroll', 'scrolling', 'reveal on scroll'] },
  { dimension: 'motion-intent', value: 'cinematic', words: ['cinematic', 'film', 'movie', 'trailer', 'dramatic', 'epic', 'futuristic'] },
  { dimension: 'motion-intent', value: 'calm', words: ['calm', 'calming', 'serene', 'peaceful', 'quiet', 'silence', 'stillness', 'minimal'] },
  { dimension: 'motion-intent', value: 'energetic', words: ['energetic', 'punchy', 'bold', 'dynamic', 'lively', 'vibrant'] },

  // conversion-intent — the revenue action
  { dimension: 'conversion-intent', value: 'checkout', words: ['buy', 'purchase', 'shop', 'cart', 'order', 'checkout', 'add to cart'] },
  { dimension: 'conversion-intent', value: 'lead-form', words: ['contact', 'get in touch', 'inquiry', 'quote', 'demo', 'consult', 'lead'] },
  { dimension: 'conversion-intent', value: 'subscribe', words: ['subscribe', 'sign up', 'newsletter', 'membership', 'join'] },
  { dimension: 'conversion-intent', value: 'book', words: ['book', 'booking', 'reserve', 'appointment', 'schedule'] },
  { dimension: 'conversion-intent', value: 'donate', words: ['donate', 'donation', 'support', 'contribute'] },

  // emotional-intent — the feeling arc (pairs / antonyms)
  { dimension: 'emotional-intent', value: 'chaos-to-calm', words: ['noise into silence', 'chaos to calm', 'chaotic to calm', 'noise to silence', 'turmoil to peace', 'loud to quiet'] },
  { dimension: 'emotional-intent', value: 'excitement', words: ['exciting', 'thrill', 'adrenaline', 'wow', 'unforgettable', 'epic'] },
  { dimension: 'emotional-intent', value: 'trust', words: ['trust', 'reliable', 'secure', 'safe', 'dependable'] },
  { dimension: 'emotional-intent', value: 'serenity', words: ['serene', 'peaceful', 'tranquil', 'zen', 'calm', 'silence'] },
  { dimension: 'emotional-intent', value: 'luxury', words: ['luxury', 'premium', 'exclusive', 'sophisticated', 'elegant'] },

  // content-intent — posture of the copy
  { dimension: 'content-intent', value: 'storytelling', words: ['story', 'narrative', 'journey', 'tale', 'experience', 'chapter'] },
  { dimension: 'content-intent', value: 'minimal', words: ['minimal', 'clean', 'simple', 'concise', 'essential'] },
  { dimension: 'content-intent', value: 'educational', words: ['learn', 'educate', 'guide', 'how-to', 'explainer', 'tutorial'] },
  { dimension: 'content-intent', value: 'bold', words: ['bold', 'striking', 'statement', 'loud', 'fearless'] },
];

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

/** Extract the user's own domain nouns (their words) for vocabulary.
 *  Word-boundary matched (so "teams" does NOT match "tea") and limited to
 *  SPECIFIC nouns — generic category words (saas, store, blog, …) are excluded
 *  because they duplicate the shape the archetype composer already derives. */
// Words that are NEVER domain nouns — the scaffolding language every prompt
// uses ("build a ... website"), generic web/commerce mechanics, and stopwords.
// This is deliberately the ONLY closed list: it removes noise, it does not
// enumerate verticals. New verticals need no edit here.
const DOMAIN_NOUN_STOPWORDS = new Set<string>([
  // build/scaffold verbs & meta
  'build', 'create', 'make', 'design', 'website', 'site', 'page', 'homepage', 'landing',
  'app', 'application', 'platform', 'brand', 'business', 'company', 'store', 'shop',
  'online', 'web', 'digital', 'experience', 'section', 'sections', 'feature', 'features',
  'product', 'products', 'service', 'services', 'customer', 'customers', 'client', 'clients',
  'user', 'users', 'market', 'markets', 'team', 'people', 'thing', 'things', 'way', 'ways',
  // generic UX/marketing nouns
  'story', 'storytelling', 'motion', 'animation', 'animations', 'transition', 'transitions',
  'scroll', 'scrolling', 'hover', 'interaction', 'interactions', 'layout', 'grid', 'typography',
  'color', 'colors', 'colour', 'background', 'backgrounds', 'shadow', 'shadows', 'image',
  'images', 'photography', 'lighting', 'reflection', 'reflections', 'pacing', 'whitespace',
  'element', 'elements', 'content', 'copy', 'text', 'button', 'buttons', 'menu', 'header',
  'footer', 'navigation', 'hero', 'testimonial', 'testimonials', 'gallery',
  // generic commerce/ops nouns
  'purchase', 'purchases', 'purchasing', 'checkout', 'cart', 'order', 'orders', 'payment',
  'payments', 'shipping', 'delivery', 'return', 'returns', 'refund', 'support', 'account',
  'value', 'quality', 'trust', 'conversion', 'discovery', 'catalog', 'item', 'items',
  'option', 'options', 'price', 'prices', 'pricing', 'offer', 'offers', 'discount',
  'pipeline', 'pipelines', 'management', 'sales', 'workflow', 'workflows', 'dashboard',
  'analytics', 'integration', 'integrations', 'solution', 'solutions', 'tool', 'tools',
  'system', 'systems', 'process', 'processes', 'data', 'report', 'reports',
  // emotion/adjective-ish nouns that describe feel, not domain
  'elegance', 'exclusivity', 'craftsmanship', 'heritage', 'emotion', 'aspiration',
  'confidence', 'beauty', 'rarity', 'authenticity', 'sophistication', 'luxury',
  // pronoun-ish / connectives that slip through
  'every', 'each', 'their', 'your', 'our', 'that', 'this', 'these', 'those', 'with', 'from',
  'into', 'through', 'rather', 'than', 'before', 'while', 'where', 'which', 'them', 'they',
  // modal/auxiliary/common verbs — never a business's subject noun
  'should', 'would', 'could', 'shall', 'will', 'must', 'might', 'have', 'has', 'had',
  'being', 'been', 'does', 'doing', 'want', 'wants', 'need', 'needs', 'using', 'used',
  'communicate', 'reinforce', 'reveal', 'reveals', 'tell', 'convey', 'evoke', 'feel',
  'feels', 'look', 'looks', 'show', 'shows', 'give', 'gives', 'help', 'helps', 'work',
  'works', 'come', 'comes', 'take', 'takes', 'keep', 'find', 'finds', 'generate',
  'generates', 'include', 'includes', 'including', 'ensure', 'provide', 'provides',
  // adverbs / adjectives describing feel, not domain
  'gradually', 'naturally', 'traditional', 'unforgettable', 'immersive', 'seamless',
  'modern', 'clean', 'soft', 'warm', 'premium', 'subtle', 'smooth', 'natural', 'really',
  'very', 'more', 'most', 'such', 'also', 'just', 'when', 'then', 'here', 'there',
  'about', 'above', 'below', 'across', 'along', 'around', 'because', 'between',
]);

/**
 * Extract the domain nouns the user actually used — OPEN vocabulary.
 *
 * We do NOT match against a fixed list of verticals (that is exactly the
 * anti-pattern that produced sports-nutrition copy on a jewellery site). Instead
 * we mine the prompt's own salient nouns: repeated multi-occurrence tokens and
 * capitalised domain terms, minus generic scaffolding/stopwords. Whatever the
 * business is about, its real subject words surface here.
 */
export function extractDomainNouns(prompt: string): string[] {
  const raw = prompt.replace(/[^A-Za-z\s-]/g, ' ');
  const tokens = raw.split(/\s+/).filter(Boolean);

  // Count lowercase frequency of candidate nouns (len >= 4, not a stopword).
  const freq = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  tokens.forEach((tok, idx) => {
    const lower = tok.toLowerCase();
    if (lower.length < 4) return;
    if (DOMAIN_NOUN_STOPWORDS.has(lower)) return;
    if (!/^[a-z][a-z-]*[a-z]$/.test(lower)) return; // drop malformed
    freq.set(lower, (freq.get(lower) ?? 0) + 1);
    if (!firstSeen.has(lower)) firstSeen.set(lower, idx);
  });

  // A word is a domain noun if it recurs (>=2) OR appears once but is a strong,
  // rare, long token (>=6 chars) that is not generic. Recurrence is the primary
  // signal that the prompt is "about" that thing.
  const candidates = [...freq.entries()]
    .filter(([w, n]) => n >= 2 || w.length >= 6)
    .sort((a, b) => {
      // higher frequency first; tie-break by earlier appearance
      if (b[1] !== a[1]) return b[1] - a[1];
      return (firstSeen.get(a[0]) ?? 0) - (firstSeen.get(b[0]) ?? 0);
    })
    .map(([w]) => w);

  // Normalise obvious singular/plural duplicates (gemstones/gemstone).
  const seen = new Set<string>();
  const result: string[] = [];
  for (const w of candidates) {
    const singular = w.endsWith('s') && w.length > 4 ? w.slice(0, -1) : w;
    if (seen.has(singular)) continue;
    seen.add(singular);
    result.push(singular);
    if (result.length >= 12) break;
  }
  return result;
}

import type { BusinessIntents } from './types.js';

/**
 * Compose the explicit, structured intents from the extracted signals.
 * This is the Universal Signal Extraction output that every downstream layer
 * consumes. No industry key is ever read — only orthogonal primitive signals.
 */
export function extractIntents(signals: DiscoveredSignal[]): BusinessIntents {
  const dim = (d: DiscoveredSignal['dimension']) => signalValues(signals, d);
  const experience = dim('experience-intent');
  const interaction = dim('interaction-intent');
  const motion = dim('motion-intent');
  const conversion = dim('conversion-intent');
  const emotional = dim('emotional-intent');
  const content = dim('content-intent');

  return {
    experience: experience.length ? experience : ['editorial'],
    interaction,
    motion: motion.length ? motion : (emotional.includes('calm') || emotional.includes('serenity') ? ['calm'] : ['balanced']),
    conversion: conversion.length ? conversion : (dim('monetization').includes('one-time') || dim('monetization').includes('wholesale') ? ['checkout'] : ['lead-form']),
    emotional: emotional.length ? emotional : ['trust'],
    content: content.length ? content : ['storytelling'],
  };
}
