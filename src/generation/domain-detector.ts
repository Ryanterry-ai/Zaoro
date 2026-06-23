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

interface IndustryRule {
  industry: string;
  keywords: string[];
  subIndustries: Record<string, string[]>;
  defaultSections: string[];
  colorHint: string;
}

const INDUSTRY_RULES: IndustryRule[] = [
  {
    industry: 'real-estate',
    keywords: ['real estate', 'property', 'properties', 'realtor', 'housing', 'home', 'apartment', 'condo', 'mortgage', 'virtual tour', 'listing', 'broker'],
    subIndustries: {
      luxury: ['luxury', 'premium', 'high-end', 'exclusive', 'estate', 'villa', 'penthouse'],
      commercial: ['commercial', 'office', 'retail', 'warehouse', 'industrial'],
      residential: ['residential', 'family', 'suburban', 'neighborhood'],
    },
    defaultSections: ['hero', 'featured-properties', 'stats-bar', 'services', 'testimonials', 'contact-form', 'cta'],
    colorHint: 'emerald',
  },
  {
    industry: 'dental',
    keywords: ['dental', 'dentist', 'teeth', 'smile', 'implant', 'whitening', 'orthodont', 'invisalign', 'braces', 'oral surgery', 'periodontal', 'dental clinic'],
    subIndustries: {},
    defaultSections: ['hero', 'services', 'team/doctors', 'before-after', 'testimonials', 'contact-info', 'faq'],
    colorHint: 'cyan',
  },
  {
    industry: 'coffee-shop',
    keywords: ['coffee shop', 'coffee bar', 'cafe', 'espresso', 'latte', 'roasted', 'roastery', 'barista', 'brew', 'cold brew', 'artisan coffee', 'specialty coffee'],
    subIndustries: {},
    defaultSections: ['hero', 'menu-highlights', 'about', 'gallery', 'testimonials', 'contact-info'],
    colorHint: 'amber',
  },
  {
    industry: 'pet-services',
    keywords: ['pet services', 'veterinary clinic', 'pet grooming', 'pet boarding', 'dog grooming', 'cat grooming', 'animal hospital', 'puppy', 'kitten', 'pet care', 'pet hotel', 'vet clinic'],
    subIndustries: {},
    defaultSections: ['hero', 'services', 'team/doctors', 'pricing', 'testimonials', 'contact-info'],
    colorHint: 'emerald',
  },
  {
    industry: 'restaurant',
    keywords: ['restaurant', 'cafe', 'bakery', 'bar', 'pub', 'bistro', 'dining', 'food', 'menu', 'chef', 'kitchen', 'pizza', 'sushi', 'burger'],
    subIndustries: {
      fine_dining: ['fine dining', 'gourmet', 'michelin', 'upscale', 'elegant'],
      casual: ['casual', 'family', 'comfort food', 'diner'],
      cafe: ['cafe', 'espresso', 'latte', 'pastry', 'bakery'],
    },
    defaultSections: ['hero', 'menu-highlights', 'about', 'gallery', 'reservations', 'testimonials', 'contact-info'],
    colorHint: 'amber',
  },
  {
    industry: 'fitness',
    keywords: ['gym', 'fitness', 'workout', 'training', 'personal trainer', 'exercise', 'yoga', 'pilates', 'crossfit', 'wellness', 'health club', 'athletic'],
    subIndustries: {
      gym: ['gym', 'weight', 'strength', 'bodybuilding', 'crossfit'],
      yoga: ['yoga', 'pilates', 'meditation', 'mindfulness', 'wellness'],
      studio: ['studio', 'spin', 'cycling', 'barre', 'dance'],
    },
    defaultSections: ['hero', 'class-schedule', 'trainers', 'membership-plans', 'gallery', 'testimonials', 'contact-info'],
    colorHint: 'rose',
  },
  {
    industry: 'saas',
    keywords: ['saas', 'software', 'app', 'platform', 'dashboard', 'tool', 'api', 'integration', 'analytics', 'automation', 'cloud', 'subscription'],
    subIndustries: {
      crm: ['crm', 'customer relationship', 'lead', 'pipeline', 'sales'],
      analytics: ['analytics', 'data', 'insights', 'reporting', 'metrics'],
      project_management: ['project management', 'task', 'kanban', 'sprint', 'agile'],
      marketing: ['marketing', 'email', 'campaign', 'seo', 'social media'],
    },
    defaultSections: ['hero', 'features', 'pricing-table', 'integrations', 'testimonials', 'cta', 'faq'],
    colorHint: 'violet',
  },
  {
    industry: 'healthcare',
    keywords: ['healthcare', 'medical', 'doctor', 'hospital', 'patient', 'health', 'therapy', 'psychology'],
    subIndustries: {
      therapy: ['therapy', 'counseling', 'psychology', 'mental health'],
      clinic: ['clinic', 'medical', 'primary care', 'family practice'],
    },
    defaultSections: ['hero', 'services', 'team/doctors', 'appointment-booking', 'testimonials', 'contact-info', 'faq'],
    colorHint: 'cyan',
  },
  {
    industry: 'law-firm',
    keywords: ['law firm', 'lawyer', 'attorney', 'legal', 'litigation', 'court', 'justice', 'advocate', 'counsel', 'paralegal', 'practice areas'],
    subIndustries: {
      corporate: ['corporate', 'business', 'mergers', 'acquisitions', 'compliance'],
      family: ['family law', 'divorce', 'custody', 'marriage'],
      injury: ['personal injury', 'accident', 'malpractice', 'workers comp'],
      criminal: ['criminal', 'defense', 'dui', 'felony'],
    },
    defaultSections: ['hero', 'practice-areas', 'team', 'case-studies', 'testimonials', 'contact-form', 'faq'],
    colorHint: 'slate',
  },
  {
    industry: 'education',
    keywords: ['education', 'school', 'university', 'college', 'course', 'learn', 'training', 'academy', 'tutor', 'student', 'lecture', 'curriculum'],
    subIndustries: {
      online: ['online', 'e-learning', 'digital', 'virtual', 'remote'],
      k12: ['k-12', 'high school', 'elementary', 'middle school'],
      higher_ed: ['university', 'college', 'degree', 'graduate'],
    },
    defaultSections: ['hero', 'courses', 'features', 'pricing-table', 'testimonials', 'cta', 'faq'],
    colorHint: 'blue',
  },
  {
    industry: 'ecommerce',
    keywords: ['shop', 'store', 'ecommerce', 'e-commerce', 'buy', 'sell', 'product', 'cart', 'checkout', 'order', 'marketplace', 'retail'],
    subIndustries: {
      fashion: ['fashion', 'clothing', 'apparel', 'wear', 'style'],
      electronics: ['electronics', 'gadget', 'tech', 'device', 'gadget'],
      beauty: ['beauty', 'cosmetics', 'skincare', 'makeup'],
      food: ['food', 'grocery', 'organic', 'snack', 'beverage'],
    },
    defaultSections: ['hero', 'categories', 'featured-products', 'product-grid', 'testimonials', 'newsletter-cta', 'cta'],
    colorHint: 'orange',
  },
  {
    industry: 'portfolio',
    keywords: ['portfolio', 'personal', 'freelance', 'resume', 'cv', 'showcase', 'creative', 'designer', 'developer portfolio'],
    subIndustries: {
      design: ['designer', 'graphic', 'ui', 'ux', 'visual'],
      development: ['developer', 'engineer', 'full-stack', 'frontend', 'backend'],
      photography: ['photographer', 'photo', 'camera', 'shot'],
    },
    defaultSections: ['hero', 'about', 'featured-projects', 'skills', 'testimonials', 'contact-form'],
    colorHint: 'pink',
  },
  {
    industry: 'agency',
    keywords: ['agency', 'studio', 'creative agency', 'digital agency', 'marketing agency', 'branding', 'consulting', 'firm'],
    subIndustries: {
      marketing: ['marketing', 'advertising', 'social media', 'seo', 'ppc'],
      creative: ['creative', 'design', 'branding', 'identity'],
      technology: ['technology', 'digital', 'transformation', 'innovation'],
    },
    defaultSections: ['hero', 'services', 'case-studies', 'clients', 'team', 'testimonials', 'cta'],
    colorHint: 'indigo',
  },
  {
    industry: 'nonprofit',
    keywords: ['nonprofit', 'non-profit', 'charity', 'foundation', 'donation', 'cause', 'community', 'volunteer', 'impact'],
    subIndustries: {},
    defaultSections: ['hero', 'mission', 'impact-stats', 'programs', 'donate-cta', 'testimonials', 'contact-info'],
    colorHint: 'green',
  },
  {
    industry: 'event',
    keywords: ['event', 'conference', 'wedding', 'party', 'festival', 'concert', 'workshop', 'seminar', 'gala', 'ceremony'],
    subIndustries: {
      wedding: ['wedding', 'bride', 'groom', 'ceremony', 'reception'],
      corporate: ['conference', 'summit', 'corporate event', 'seminar'],
      music: ['concert', 'festival', 'music', 'live show'],
    },
    defaultSections: ['hero', 'event-details', 'schedule', 'speakers', 'gallery', 'tickets', 'contact-info'],
    colorHint: 'fuchsia',
  },
  {
    industry: 'beauty-salon',
    keywords: ['beauty salon', 'hair salon', 'nail salon', 'manicure', 'pedicure', 'balayage', 'haircut', 'hair styling', 'facial', 'skincare salon', 'grooming salon', 'waxing'],
    subIndustries: {},
    defaultSections: ['hero', 'services', 'gallery', 'pricing', 'team', 'testimonials', 'contact-info'],
    colorHint: 'pink',
  },
  {
    industry: 'auto-dealership',
    keywords: ['auto dealership', 'car dealership', 'vehicle', 'automotive', 'pre-owned', 'certified', 'trade-in', 'test drive', 'showroom', 'inventory', 'financing'],
    subIndustries: {},
    defaultSections: ['hero', 'featured-vehicles', 'services', 'financing', 'testimonials', 'contact-info'],
    colorHint: 'slate',
  },
];

const MOOD_KEYWORDS: Record<string, string[]> = {
  premium: ['luxury', 'premium', 'high-end', 'exclusive', 'elegant', 'sophisticated', 'refined', 'elite'],
  modern: ['modern', 'contemporary', 'cutting-edge', 'innovative', 'futuristic', 'sleek'],
  minimal: ['minimal', 'minimalist', 'clean', 'simple', 'bare', 'essential'],
  bold: ['bold', 'striking', 'dramatic', 'powerful', 'intense', 'vibrant'],
  playful: ['fun', 'playful', 'colorful', 'creative', 'whimsical', 'quirky'],
  corporate: ['corporate', 'professional', 'business', 'enterprise', 'formal'],
  warm: ['warm', 'cozy', 'friendly', 'welcoming', 'comfortable', 'homey'],
  dark: ['dark', 'moody', 'noir', 'gothic', 'mysterious', 'shadowy'],
};

export function detectDomain(prompt: string): DomainContext {
  const lower = prompt.toLowerCase();

  let bestMatch: IndustryRule | null = null;
  let bestScore = 0;

  for (const rule of INDUSTRY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) score += kw.split(' ').length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule;
    }
  }

  if (!bestMatch) {
    return {
      industry: 'general',
      subIndustry: '',
      mood: 'modern',
      features: [],
      contentKeywords: extractKeywords(lower),
      suggestedSections: ['hero', 'features', 'stats-bar', 'testimonials', 'cta'],
      colorHint: 'blue',
      imageKeywords: ['business', 'technology', 'office'],
    };
  }

  let subIndustry = '';
  let maxSubScore = 0;
  for (const [sub, subKws] of Object.entries(bestMatch.subIndustries)) {
    let subScore = 0;
    for (const kw of subKws) {
      if (lower.includes(kw)) subScore++;
    }
    if (subScore > maxSubScore) {
      maxSubScore = subScore;
      subIndustry = sub;
    }
  }

  let mood: DomainContext['mood'] = 'modern';
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

  const features = extractFeatures(lower);
  const contentKeywords = extractKeywords(lower);

  const IMAGE_KEYWORDS: Record<string, string[]> = {
    'real-estate': ['luxury home', 'modern house', 'apartment interior', 'real estate'],
    'restaurant': ['fine dining', 'restaurant interior', 'gourmet food', 'chef cooking'],
    'fitness': ['gym interior', 'personal training', 'yoga class', 'fitness workout'],
    'saas': ['dashboard', 'software interface', 'analytics', 'team collaboration'],
    'healthcare': ['doctor office', 'medical clinic', 'healthcare professional', 'patient care'],
    'law-firm': ['law office', 'courtroom', 'legal books', 'attorney consultation'],
    'education': ['online learning', 'classroom', 'university', 'library'],
    'ecommerce': ['product photography', 'online store', 'shopping', 'ecommerce'],
    'portfolio': ['workspace', 'design tools', 'creative process', 'portfolio'],
    'agency': ['team meeting', 'creative brainstorm', 'office collaboration', 'strategy'],
    'nonprofit': ['community', 'volunteers', 'charity event', 'helping hands'],
    'event': ['event venue', 'conference stage', 'wedding decor', 'festival crowd'],
  };

  return {
    industry: bestMatch.industry,
    subIndustry,
    mood,
    features,
    contentKeywords,
    suggestedSections: bestMatch.defaultSections,
    colorHint: bestMatch.colorHint,
    imageKeywords: IMAGE_KEYWORDS[bestMatch.industry] || ['business', 'technology', 'office'],
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
