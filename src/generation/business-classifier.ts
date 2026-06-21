import { BusinessType } from './types.js';

interface ClassificationRule {
  type: BusinessType;
  keywords: string[];
  domainPatterns: string[];
  structuralPatterns: string[];
  weight: number;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    type: 'ecommerce',
    keywords: ['shop', 'store', 'buy', 'cart', 'checkout', 'product', 'price', 'order', 'shipping', 'payment', 'inventory', 'catalog', 'sale', 'discount', 'coupon'],
    domainPatterns: ['shop', 'store', 'commerce', 'buy', 'market'],
    structuralPatterns: ['product-list', 'cart', 'checkout', 'pricing', 'catalog'],
    weight: 10,
  },
  {
    type: 'saas',
    keywords: ['dashboard', 'login', 'subscription', 'plan', 'pricing', 'feature', 'integration', 'api', 'dashboard', 'analytics', 'trial', 'free', 'pro', 'enterprise', 'workspace'],
    domainPatterns: ['app', 'saas', 'platform', 'dashboard', 'cloud'],
    structuralPatterns: ['dashboard', 'login', 'signup', 'pricing-table', 'feature-grid'],
    weight: 10,
  },
  {
    type: 'local-business',
    keywords: ['contact', 'location', 'address', 'hours', 'phone', 'directions', 'about-us', 'team', 'service', 'booking', 'appointment', 'reservation'],
    domainPatterns: ['local', 'nearby', 'hub', 'center', 'clinic', 'office'],
    structuralPatterns: ['contact-form', 'map', 'hours', 'location', 'team-section'],
    weight: 8,
  },
  {
    type: 'agency',
    keywords: ['portfolio', 'client', 'case-study', 'service', 'team', 'work', 'project', 'creative', 'design', 'development', 'marketing', 'branding'],
    domainPatterns: ['agency', 'studio', 'creative', 'design', 'digital'],
    structuralPatterns: ['portfolio-grid', 'case-study', 'team', 'services-list'],
    weight: 8,
  },
  {
    type: 'portfolio',
    keywords: ['about', 'project', 'skill', 'experience', 'resume', 'cv', 'work', 'contact', 'bio', 'creative'],
    domainPatterns: ['portfolio', 'dev', 'personal', 'blog', 'me'],
    structuralPatterns: ['project-grid', 'about-section', 'skills-list', 'resume'],
    weight: 7,
  },
  {
    type: 'blog',
    keywords: ['post', 'article', 'category', 'tag', 'author', 'comment', 'subscribe', 'newsletter', 'read', 'content', 'blog'],
    domainPatterns: ['blog', 'news', 'article', 'post', 'journal'],
    structuralPatterns: ['post-list', 'post-detail', 'sidebar', 'categories', 'comments'],
    weight: 9,
  },
  {
    type: 'marketplace',
    keywords: ['seller', 'buyer', 'listing', 'auction', 'bid', 'vendor', 'marketplace', 'browse', 'category', 'filter'],
    domainPatterns: ['market', 'bay', 'deal', 'exchange', 'swap'],
    structuralPatterns: ['listing-grid', 'seller-profile', 'search-filter', 'categories'],
    weight: 9,
  },
  {
    type: 'healthcare',
    keywords: ['doctor', 'patient', 'appointment', 'medical', 'health', 'clinic', 'hospital', 'treatment', 'diagnosis', 'prescription', 'insurance'],
    domainPatterns: ['health', 'medical', 'clinic', 'care', 'wellness'],
    structuralPatterns: ['doctor-list', 'appointment-form', 'patient-portal', 'services-medical'],
    weight: 10,
  },
  {
    type: 'fitness',
    keywords: ['gym', 'workout', 'exercise', 'trainer', 'membership', 'class', 'schedule', 'fitness', 'health', 'training', 'nutrition'],
    domainPatterns: ['gym', 'fitness', 'fit', 'strength', 'wellness'],
    structuralPatterns: ['class-schedule', 'trainer-profile', 'membership-pricing', 'workout-plan'],
    weight: 10,
  },
  {
    type: 'restaurant',
    keywords: ['menu', 'order', 'food', 'delivery', 'reservation', 'table', 'chef', 'dish', 'ingredient', 'cuisine', 'dine', 'takeout'],
    domainPatterns: ['restaurant', 'cafe', 'food', 'kitchen', 'bistro', 'grill'],
    structuralPatterns: ['menu-grid', 'reservation-form', 'food-gallery', 'location-hours'],
    weight: 10,
  },
  {
    type: 'education',
    keywords: ['course', 'lesson', 'student', 'teacher', 'enroll', 'curriculum', 'certificate', 'learn', 'module', 'quiz', 'assignment', 'university', 'school'],
    domainPatterns: ['edu', 'learn', 'course', 'academy', 'school', 'university'],
    structuralPatterns: ['course-list', 'lesson-view', 'student-dashboard', 'enrollment-form'],
    weight: 10,
  },
];

export interface ClassificationResult {
  type: BusinessType;
  confidence: number;
  matchedKeywords: string[];
  matchedPatterns: string[];
  scores: Record<BusinessType, number>;
}

export class BusinessClassifier {
  classify(input: {
    title?: string;
    description?: string;
    domain?: string;
    url?: string;
    content?: string;
    routes?: string[];
    technologies?: string[];
  }): ClassificationResult {
    const text = [
      input.title || '',
      input.description || '',
      input.content || '',
    ].join(' ').toLowerCase();

    const domain = (input.domain || input.url || '').toLowerCase();
    const routes = (input.routes || []).map((r) => r.toLowerCase());
    const scores: Record<string, number> = {};

    for (const rule of CLASSIFICATION_RULES) {
      let score = 0;

      // Keyword matching
      for (const keyword of rule.keywords) {
        if (text.includes(keyword)) {
          score += rule.weight;
        }
      }

      // Domain pattern matching
      for (const pattern of rule.domainPatterns) {
        if (domain.includes(pattern)) {
          score += rule.weight * 2;
        }
      }

      // Structural pattern matching
      for (const pattern of rule.structuralPatterns) {
        for (const route of routes) {
          if (route.includes(pattern)) {
            score += rule.weight * 1.5;
          }
        }
      }

      scores[rule.type] = score;
    }

    // Find the highest scoring type
    let bestType: BusinessType = 'unknown';
    let bestScore = 0;
    for (const [type, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type as BusinessType;
      }
    }

    // Calculate confidence (0-1)
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
    const confidence = totalScore > 0 ? bestScore / totalScore : 0;

    // Collect matched keywords and patterns
    const bestRule = CLASSIFICATION_RULES.find((r) => r.type === bestType);
    const matchedKeywords = bestRule
      ? bestRule.keywords.filter((k) => text.includes(k))
      : [];
    const matchedPatterns = bestRule
      ? bestRoutePatterns(bestRule, routes)
      : [];

    return {
      type: bestType,
      confidence,
      matchedKeywords,
      matchedPatterns,
      scores: scores as Record<BusinessType, number>,
    };
  }

  classifyFromPrompt(prompt: string): ClassificationResult {
    return this.classify({ content: prompt });
  }

  getSupportedTypes(): BusinessType[] {
    return CLASSIFICATION_RULES.map((r) => r.type);
  }
}

function bestRoutePatterns(rule: ClassificationRule, routes: string[]): string[] {
  const matched: string[] = [];
  for (const pattern of rule.structuralPatterns) {
    for (const route of routes) {
      if (route.includes(pattern)) {
        matched.push(pattern);
      }
    }
  }
  return matched;
}
