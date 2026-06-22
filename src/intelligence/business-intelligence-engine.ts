export interface DetectedCapability {
  capability: string;
  confidence: number;
  evidence: string[];
  priority: number;
}

export interface IntelligenceResult {
  capabilities: DetectedCapability[];
  hybridModels: string[];
  promptSummary: string;
}

interface CapabilitySignal {
  keywords: string[];
  phrases: string[];
  weight: number;
}

const CAPABILITY_SIGNALS: Record<string, CapabilitySignal> = {
  commerce: {
    keywords: ['shop', 'store', 'sell', 'product', 'cart', 'buy', 'purchase', 'e-commerce', 'merchandise', 'retail', 'price', 'inventory', 'catalog', 'checkout', 'shipping', 'payment', 'order', 'discount', 'coupon', 'sale', 'wholesale', 'b2b', 'ecommerce', 'commerce'],
    phrases: ['sell products', 'online store', 'product catalog', 'shopping cart', 'buy now', 'add to cart', 'checkout flow', 'wholesale marketplace', 'b2b marketplace', 'with ecommerce', 'sells', 'that sells'],
    weight: 10,
  },
  booking: {
    keywords: ['book', 'appointment', 'schedule', 'reserve', 'calendar', 'availability', 'session', 'slot', 'time slot', 'booking', 'reservation', 'consultation'],
    phrases: ['book appointment', 'schedule session', 'make reservation', 'book a time', 'available slots', 'calendar view'],
    weight: 10,
  },
  crm: {
    keywords: ['crm', 'contact', 'lead', 'pipeline', 'deal', 'opportunity', 'prospect', 'follow-up', 'relationship', 'outreach', 'sales', 'conversion', 'funnel', 'nurture'],
    phrases: ['manage contacts', 'sales pipeline', 'track leads', 'customer relationship', 'deal tracking', 'contact management', 'real estate crm', 'build a crm'],
    weight: 10,
  },
  subscriptions: {
    keywords: ['subscription', 'subscribe', 'monthly', 'annual', 'plan', 'tier', 'recurring', 'billing', 'membership', 'renewal', 'cancel', 'upgrade', 'downgrade'],
    phrases: ['monthly plan', 'annual subscription', 'subscription tiers', 'recurring billing', 'membership levels'],
    weight: 9,
  },
  inventory: {
    keywords: ['inventory', 'stock', 'warehouse', 'sku', 'unit', 'quantity', 'supply', 'restock', 'low stock', 'out of stock', 'variant', 'size', 'color'],
    phrases: ['track inventory', 'stock management', 'warehouse system', 'inventory levels', 'restock alert'],
    weight: 8,
  },
  orders: {
    keywords: ['order', 'fulfillment', 'shipping', 'delivery', 'tracking', 'dispatch', 'return', 'refund', 'invoice', 'receipt'],
    phrases: ['order management', 'track orders', 'shipping status', 'order history', 'fulfillment pipeline'],
    weight: 8,
  },
  'customer-management': {
    keywords: ['customer', 'client', 'user', 'account', 'profile', 'member', 'guest', 'person', 'people', 'team', 'staff', 'employee'],
    phrases: ['customer database', 'client management', 'user accounts', 'customer profiles', 'team management'],
    weight: 7,
  },
  analytics: {
    keywords: ['analytics', 'dashboard', 'metrics', 'report', 'chart', 'graph', 'kpi', 'insight', 'trend', 'performance', 'conversion rate', 'revenue'],
    phrases: ['analytics dashboard', 'performance metrics', 'business reports', 'data visualization', 'key metrics'],
    weight: 8,
  },
  content: {
    keywords: ['blog', 'article', 'post', 'content', 'publish', 'editor', 'cms', 'page', 'landing', 'seo', 'category', 'tag'],
    phrases: ['content management', 'blog posts', 'publish articles', 'landing page', 'content editor'],
    weight: 7,
  },
  payments: {
    keywords: ['payment', 'stripe', 'checkout', 'invoice', 'billing', 'charge', 'refund', 'transaction', 'receipt', 'pay'],
    phrases: ['payment processing', 'accept payments', 'invoice generation', 'billing system', 'stripe integration'],
    weight: 9,
  },
  scheduling: {
    keywords: ['schedule', 'calendar', 'event', 'timeline', 'availability', 'slot', 'recur', 'recurring', 'repeating'],
    phrases: ['schedule events', 'calendar management', 'availability tracking', 'recurring schedule', 'time management'],
    weight: 8,
  },
  'property-management': {
    keywords: ['property', 'real estate', 'listing', 'agent', 'broker', 'tenant', 'lease', 'rent', 'mortgage', 'zoning', 'square feet', 'bedroom', 'bathroom'],
    phrases: ['property listings', 'real estate agent', 'property management', 'tenant management', 'lease tracking', 'real estate crm', 'real estate'],
    weight: 10,
  },
  marketplace: {
    keywords: ['marketplace', 'seller', 'buyer', 'vendor', 'listing', 'auction', 'bid', 'multi-vendor', 'platform', 'commission'],
    phrases: ['multi-vendor marketplace', 'seller dashboard', 'buyer marketplace', 'vendor management', 'listing platform'],
    weight: 10,
  },
  education: {
    keywords: ['course', 'lesson', 'student', 'teacher', 'enroll', 'curriculum', 'certificate', 'learn', 'module', 'quiz', 'assignment', 'training', 'class', 'academy'],
    phrases: ['online courses', 'student portal', 'lesson management', 'course catalog', 'learning platform'],
    weight: 9,
  },
  'case-management': {
    keywords: ['case', 'matter', 'docket', 'filing', 'court', 'legal', 'attorney', 'lawyer', 'paralegal', 'client matter', 'statute', 'deadline', 'discovery', 'deposition'],
    phrases: ['case management', 'legal matters', 'docket tracking', 'filing system', 'client matters'],
    weight: 10,
  },
  'franchise-management': {
    keywords: ['franchise', 'franchisee', 'location', 'territory', 'brand', 'standard', 'compliance', 'multi-location', 'unit', 'outlet'],
    phrases: ['franchise management', 'multi-location', 'territory management', 'brand compliance', 'franchise network'],
    weight: 10,
  },
  'membership-platform': {
    keywords: ['membership', 'member', 'community', 'forum', 'group', 'club', 'network', 'directory', 'directory listing', 'exclusive'],
    phrases: ['membership platform', 'community forum', 'member directory', 'exclusive access', 'membership tiers'],
    weight: 9,
  },
  'food-beverage': {
    keywords: ['menu', 'food', 'delivery', 'restaurant', 'cafe', 'cuisine', 'chef', 'dish', 'ingredient', 'dine', 'takeout', 'order', 'kitchen', 'recipe'],
    phrases: ['food delivery', 'restaurant menu', 'online ordering', 'cuisine catalog', 'kitchen management'],
    weight: 10,
  },
  'fitness-wellness': {
    keywords: ['gym', 'workout', 'exercise', 'trainer', 'membership', 'class', 'schedule', 'fitness', 'health', 'training', 'nutrition', 'wellness', 'yoga', 'mma', 'combat', 'martial'],
    phrases: ['gym membership', 'class schedule', 'trainer profiles', 'workout plans', 'fitness tracking'],
    weight: 10,
  },
  'healthcare-clinic': {
    keywords: ['doctor', 'patient', 'appointment', 'medical', 'health', 'clinic', 'hospital', 'treatment', 'diagnosis', 'prescription', 'insurance', 'therapy', 'physical therapy', 'dental'],
    phrases: ['patient management', 'medical appointments', 'clinic operations', 'health records', 'treatment plans'],
    weight: 10,
  },
  catalog: {
    keywords: ['catalog', 'browse', 'filter', 'search', 'category', 'collection', 'gallery', 'showcase', 'display'],
    phrases: ['product catalog', 'browse items', 'filter results', 'search products', 'collection view'],
    weight: 6,
  },
  'team-collaboration': {
    keywords: ['team', 'collaborate', 'workspace', 'shared', 'role', 'permission', 'invite', 'member', 'admin', 'settings'],
    phrases: ['team workspace', 'collaboration tools', 'role management', 'shared projects', 'team settings'],
    weight: 7,
  },
  'project-management': {
    keywords: ['project', 'task', 'kanban', 'board', 'sprint', 'backlog', 'epic', 'story', 'milestone', 'deadline', 'todo', 'assignee', 'status', 'progress', 'gantt', 'timeline', 'roadmap', 'iteration', 'release'],
    phrases: ['kanban board', 'project management', 'task management', 'sprint planning', 'backlog management', 'project tracker', 'task board', 'project dashboard', 'team tasks', 'project timeline'],
    weight: 10,
  },
  'reporting': {
    keywords: ['report', 'export', 'pdf', 'csv', 'download', 'generate report', 'summary', 'breakdown', 'aggregate'],
    phrases: ['generate reports', 'export data', 'report builder', 'data export', 'summary reports'],
    weight: 6,
  },
  notifications: {
    keywords: ['notification', 'alert', 'email', 'sms', 'push', 'reminder', 'notify', 'announce'],
    phrases: ['send notifications', 'email alerts', 'push notifications', 'reminder system', 'notification center'],
    weight: 5,
  },
  'user-generated-content': {
    keywords: ['review', 'rating', 'comment', 'feedback', 'testimonial', 'user content', 'submission', 'upload'],
    phrases: ['user reviews', 'customer feedback', 'rating system', 'comment section', 'content submission'],
    weight: 6,
  },
};

const HYBRID_PATTERNS: Array<{ pattern: RegExp; models: string[] }> = [
  { pattern: /\b(and|also|plus|with|sells?|offers?|provides?)\b.*\b(and|also|plus|with|sells?|offers?|provides?)\b/i, models: ['multi-vertical'] },
  { pattern: /\b(gym|fitness|martial|combat|yoga)\b.*\b(tea|organic|herbal|wellness|supplement)\b/i, models: ['fitness-commerce'] },
  { pattern: /\b(real estate|property)\b.*\b(crm|pipeline|lead)\b/i, models: ['property-crm'] },
  { pattern: /\b(law|legal|attorney)\b.*\b(crm|case|client)\b/i, models: ['legal-crm'] },
  { pattern: /\b(clinic|dental|medical)\b.*\b(ecommerce|shop|store)\b/i, models: ['clinic-commerce'] },
  { pattern: /\b(franchise|multi.?location)\b.*\b(crm|management)\b/i, models: ['franchise-crm'] },
];

export class BusinessIntelligenceEngine {
  analyze(prompt: string): IntelligenceResult {
    const lower = prompt.toLowerCase();
    const capabilities: DetectedCapability[] = [];

    for (const [capability, signal] of Object.entries(CAPABILITY_SIGNALS)) {
      const matchedKeywords: string[] = [];
      const matchedPhrases: string[] = [];
      let score = 0;

      for (const keyword of signal.keywords) {
        if (lower.includes(keyword)) {
          matchedKeywords.push(keyword);
          score += signal.weight;
        }
      }

      for (const phrase of signal.phrases) {
        if (lower.includes(phrase)) {
          matchedPhrases.push(phrase);
          score += signal.weight * 2;
        }
      }

      if (score > 0) {
        const maxPossibleScore = signal.keywords.length * signal.weight + signal.phrases.length * signal.weight * 2;
        const confidence = Math.min(score / (maxPossibleScore * 0.3), 1.0);

        capabilities.push({
          capability,
          confidence: Math.round(confidence * 100) / 100,
          evidence: [...matchedKeywords, ...matchedPhrases],
          priority: signal.weight,
        });
      }
    }

    capabilities.sort((a, b) => b.confidence - a.confidence || b.priority - a.priority);

    const hybridModels: string[] = [];
    for (const hp of HYBRID_PATTERNS) {
      if (hp.pattern.test(lower)) {
        hybridModels.push(...hp.models);
      }
    }

    const promptSummary = this.summarizePrompt(prompt, capabilities);

    return {
      capabilities,
      hybridModels: [...new Set(hybridModels)],
      promptSummary,
    };
  }

  getTopCapabilities(result: IntelligenceResult, minConfidence: number = 0.3): string[] {
    return result.capabilities
      .filter(c => c.confidence >= minConfidence)
      .map(c => c.capability);
  }

  hasCapability(result: IntelligenceResult, capability: string, minConfidence: number = 0.15): boolean {
    return result.capabilities.some(c => c.capability === capability && c.confidence >= minConfidence);
  }

  getCapabilityConfidence(result: IntelligenceResult, capability: string): number {
    const found = result.capabilities.find(c => c.capability === capability);
    return found ? found.confidence : 0;
  }

  private summarizePrompt(prompt: string, capabilities: DetectedCapability[]): string {
    const topCaps = capabilities.slice(0, 5).map(c => c.capability);
    return `Business requires: ${topCaps.join(', ') || 'general purpose'}`;
  }
}
