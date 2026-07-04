import { detectIndustryWithScore } from '../bos/intake-parser.js';

export interface DomainContext {
  industry: string;
  subIndustry: string;
  mood: 'premium' | 'modern' | 'minimal' | 'bold' | 'playful' | 'corporate' | 'warm' | 'dark';
  features: string[];
  contentKeywords: string[];
  suggestedSections: string[];
  colorHint: string;
  imageKeywords: string[];
}

// ─── Industry → Domain mapping (unified with intake-parser) ──────────────────

const INDUSTRY_DOMAIN_MAP: Record<string, { sections: string[]; color: string; mood: DomainContext['mood']; features: string[]; images: string[] }> = {
  restaurant: { sections: ['hero', 'menu-highlights', 'about', 'gallery', 'reservations', 'testimonials', 'contact-info'], color: 'amber', mood: 'warm', features: ['online-ordering', 'booking', 'gallery', 'testimonials', 'contact-form'], images: ['fine dining', 'restaurant interior', 'gourmet food', 'chef cooking'] },
  healthcare: { sections: ['hero', 'services', 'team/doctors', 'appointment-booking', 'testimonials', 'contact-info', 'faq'], color: 'cyan', mood: 'modern', features: ['booking', 'team', 'testimonials', 'contact-form', 'faq'], images: ['doctor office', 'medical clinic', 'healthcare professional', 'patient care'] },
  saas: { sections: ['hero', 'features', 'pricing-table', 'integrations', 'testimonials', 'cta', 'faq'], color: 'violet', mood: 'modern', features: ['dashboard', 'pricing', 'integrations', 'testimonials', 'faq'], images: ['dashboard', 'software interface', 'analytics', 'team collaboration'] },
  ecommerce: { sections: ['hero', 'categories', 'featured-products', 'product-grid', 'testimonials', 'newsletter-cta', 'cta'], color: 'orange', mood: 'modern', features: ['ecommerce', 'product-gallery', 'cart', 'checkout', 'testimonials'], images: ['product photography', 'online store', 'shopping', 'ecommerce'] },
  fitness: { sections: ['hero', 'class-schedule', 'trainers', 'membership-plans', 'gallery', 'testimonials', 'contact-info'], color: 'rose', mood: 'bold', features: ['booking', 'membership', 'gallery', 'team', 'testimonials'], images: ['gym interior', 'personal training', 'yoga class', 'fitness workout'] },
  education: { sections: ['hero', 'courses', 'features', 'pricing-table', 'testimonials', 'cta', 'faq'], color: 'blue', mood: 'corporate', features: ['courses', 'pricing', 'testimonials', 'faq'], images: ['online learning', 'classroom', 'university', 'library'] },
  realestate: { sections: ['hero', 'featured-properties', 'stats-bar', 'services', 'testimonials', 'contact-form', 'cta'], color: 'emerald', mood: 'corporate', features: ['property-gallery', 'maps', 'contact-form', 'testimonials'], images: ['luxury home', 'modern house', 'apartment interior', 'real estate'] },
  legal: { sections: ['hero', 'practice-areas', 'team', 'case-studies', 'testimonials', 'contact-form', 'faq'], color: 'slate', mood: 'corporate', features: ['team', 'case-studies', 'testimonials', 'contact-form', 'faq'], images: ['law office', 'courtroom', 'legal books', 'attorney consultation'] },
  agency: { sections: ['hero', 'services', 'case-studies', 'clients', 'team', 'testimonials', 'cta'], color: 'indigo', mood: 'modern', features: ['services', 'case-studies', 'team', 'testimonials'], images: ['team meeting', 'creative brainstorm', 'office collaboration', 'strategy'] },
  nonprofit: { sections: ['hero', 'mission', 'impact-stats', 'programs', 'donate-cta', 'testimonials', 'contact-info'], color: 'green', mood: 'warm', features: ['donation', 'mission', 'testimonials', 'contact-form'], images: ['community', 'volunteers', 'charity event', 'helping hands'] },
  media: { sections: ['hero', 'featured-articles', 'categories', 'newsletter-cta', 'testimonials', 'cta'], color: 'slate', mood: 'modern', features: ['blog', 'newsletter', 'testimonials'], images: ['journalism', 'newsroom', 'content creation', 'media production'] },
  travel: { sections: ['hero', 'popular-destinations', 'deals', 'testimonials', 'cta'], color: 'sky', mood: 'warm', features: ['booking', 'gallery', 'testimonials', 'maps'], images: ['travel destination', 'vacation', 'adventure', 'tourism'] },
  luxury: { sections: ['hero', 'gallery', 'about', 'features', 'testimonials', 'cta'], color: 'amber', mood: 'premium', features: ['gallery', 'testimonials', 'cta'], images: ['luxury watch', 'premium product', 'elegant design', 'high-end brand'] },
  beauty: { sections: ['hero', 'services', 'gallery', 'pricing', 'team', 'testimonials', 'contact-info'], color: 'pink', mood: 'warm', features: ['booking', 'gallery', 'pricing', 'team', 'testimonials'], images: ['beauty salon', 'spa treatment', 'cosmetics', 'skincare'] },
  event: { sections: ['hero', 'event-details', 'schedule', 'speakers', 'gallery', 'tickets', 'contact-info'], color: 'fuchsia', mood: 'bold', features: ['booking', 'gallery', 'testimonials'], images: ['event venue', 'conference stage', 'wedding decor', 'festival crowd'] },
  portfolio: { sections: ['hero', 'about', 'featured-projects', 'skills', 'testimonials', 'contact-form'], color: 'pink', mood: 'warm', features: ['gallery', 'contact-form', 'testimonials'], images: ['workspace', 'design tools', 'creative process', 'portfolio'] },
  automotive: { sections: ['hero', 'featured-vehicles', 'services', 'financing', 'testimonials', 'contact-info'], color: 'slate', mood: 'corporate', features: ['inventory', 'financing', 'booking', 'testimonials'], images: ['car dealership', 'vehicle showroom', 'auto service', 'car financing'] },
  'enterprise-software': { sections: ['hero', 'features', 'pricing-table', 'integrations', 'testimonials', 'cta', 'faq'], color: 'blue', mood: 'corporate', features: ['dashboard', 'pricing', 'integrations', 'testimonials', 'faq'], images: ['enterprise dashboard', 'business analytics', 'team collaboration', 'software platform'] },
  logistics: { sections: ['hero', 'features', 'tracking', 'pricing', 'testimonials', 'cta'], color: 'orange', mood: 'modern', features: ['tracking', 'pricing', 'testimonials'], images: ['shipping logistics', 'warehouse', 'delivery truck', 'package tracking'] },
  manufacturing: { sections: ['hero', 'features', 'production', 'quality', 'testimonials', 'cta'], color: 'slate', mood: 'corporate', features: ['production', 'quality', 'inventory', 'testimonials'], images: ['factory floor', 'production line', 'quality control', 'manufacturing'] },
  fintech: { sections: ['hero', 'features', 'pricing-table', 'security', 'testimonials', 'cta', 'faq'], color: 'emerald', mood: 'modern', features: ['payments', 'security', 'analytics', 'testimonials', 'faq'], images: ['fintech dashboard', 'payment processing', 'financial analytics', 'secure banking'] },
  proptech: { sections: ['hero', 'features', 'properties', 'pricing', 'testimonials', 'cta'], color: 'blue', mood: 'modern', features: ['property-management', 'tenant-portal', 'maintenance', 'testimonials'], images: ['property management', 'smart building', 'tenant portal', 'real estate tech'] },
};

const MOOD_KEYWORDS: Record<string, string[]> = {
  premium: ['luxury', 'premium', 'high-end', 'exclusive', 'elegant', 'sophisticated', 'refined', 'elite'],
  modern: ['modern', 'contemporary', 'cutting-edge', 'innovative', 'futuristic', 'sleek'],
  minimal: ['minimal', 'minimalist', 'clean', 'simple', 'bare', 'essential'],
  bold: ['bold', 'striking', 'dramatic', 'powerful', 'intense', 'vibrant'],
  playful: ['fun', 'playful', 'colorful', 'creative', 'whimsical', 'quirky'],
  corporate: ['corporate', 'professional', 'business', 'enterprise', 'formal'],
  warm: ['warm', 'cozy', 'friendly', 'welcoming', 'comfortable', 'homey'],
  dark: ['dark', 'moody', 'noir', 'gothic', 'mysterious', 'shadowy'],
  creative: ['creative', 'artistic', 'design', 'portfolio', 'showcase'],
  clean: ['clean', 'clinical', 'hygienic', 'fresh', 'pure'],
};

/**
 * Detect domain from prompt — unified with intake-parser industry detection.
 * Uses intake-parser for industry detection, then maps to DomainContext shape.
 */
export function detectDomain(prompt: string): DomainContext {
  const lower = prompt.toLowerCase();

  // Use intake-parser for industry detection (single source of truth)
  const { mapping, subIndustry } = detectIndustryWithScore(prompt);
  const industry = mapping?.industry ?? 'general';

  // Get domain mapping for this industry
  const domain = INDUSTRY_DOMAIN_MAP[industry] ?? INDUSTRY_DOMAIN_MAP['saas']!;

  // Detect mood from prompt
  let mood: DomainContext['mood'] = domain.mood;
  let moodScore = 0;
  for (const [m, mKws] of Object.entries(MOOD_KEYWORDS)) {
    let s = 0;
    for (const kw of mKws) {
      if (lower.includes(kw)) s++;
    }
    if (s > moodScore) {
      moodScore = s;
      mood = m as DomainContext['mood'];
    }
  }

  // Extract features from prompt
  const features = extractFeatures(lower);

  // Extract content keywords
  const contentKeywords = extractKeywords(lower);

  return {
    industry,
    subIndustry: subIndustry ?? '',
    mood,
    features: features.length > 0 ? features : domain.features,
    contentKeywords,
    suggestedSections: domain.sections,
    colorHint: domain.color,
    imageKeywords: domain.images,
  };
}

function extractFeatures(prompt: string): string[] {
  const featureMap: Record<string, string[]> = {
    'virtual-tours': ['virtual tour', '360', 'tour', 'walkthrough'],
    'online-ordering': ['online ordering', 'order online', 'delivery', 'takeout', 'takeaway'],
    'booking': ['booking', 'appointment', 'schedule', 'reserve', 'reservation', 'calendar'],
    'membership': ['membership', 'member', 'subscription', 'plan', 'tier'],
    'ecommerce': ['shop', 'store', 'cart', 'checkout', 'buy', 'sell', 'product'],
    'blog': ['blog', 'article', 'post', 'news', 'content', 'write'],
    'gallery': ['gallery', 'portfolio', 'showcase', 'photos', 'images', 'collection'],
    'testimonials': ['testimonial', 'review', 'feedback', 'rating', 'star'],
    'contact-form': ['contact', 'form', 'inquiry', 'reach out', 'get in touch'],
    'newsletter': ['newsletter', 'subscribe', 'email', 'updates'],
    'faq': ['faq', 'questions', 'answers', 'help', 'support'],
    'pricing': ['pricing', 'price', 'cost', 'plan', 'tier', 'subscription'],
    'dashboard': ['dashboard', 'analytics', 'metrics', 'reporting', 'insights'],
    'team': ['team', 'staff', 'people', 'about us', 'our people'],
    'video': ['video', 'watch', 'youtube', 'vimeo', 'tutorial'],
    'social': ['social', 'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'],
    'multilingual': ['multilingual', 'multi-language', 'translation', 'i18n', 'spanish', 'french'],
  };

  const found: string[] = [];
  for (const [feature, keywords] of Object.entries(featureMap)) {
    for (const kw of keywords) {
      if (prompt.includes(kw)) {
        found.push(feature);
        break;
      }
    }
  }
  return found;
}

function extractKeywords(prompt: string): string[] {
  const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
    'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this', 'it', 'its',
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they',
    'them', 'their', 'what', 'which', 'who', 'whom', 'these', 'those', 'am', 'about', 'up',
    'also', 'like', 'want', 'need', 'make', 'build', 'create', 'platform', 'website', 'web',
    'app', 'application', 'system', 'tool', 'solution']);

  const words = prompt.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(e => e[0]);
}
