import crypto from 'node:crypto';
import type { Industry } from '../types.js';
import { IntentType } from '../types.js';
import type { InputAdapter, AdapterResult } from './types.js';

const PRD_SECTION_PATTERNS = [
  { regex: /#+\s*(overview|introduction|background|executive\s*summary)/i, key: 'overview' },
  { regex: /#+\s*(goals|objectives|business\s*goals|success\s*metrics|kpis?)/i, key: 'goals' },
  { regex: /#+\s*(user\s*stories|stories|use\s*cases)/i, key: 'userStories' },
  { regex: /#+\s*(functional\s*requirements|requirements|features)/i, key: 'functionalRequirements' },
  { regex: /#+\s*(non-functional|nonfunctional|technical\s*requirements|performance)/i, key: 'nonFunctionalRequirements' },
  { regex: /#+\s*(user\s*flow|user\s*journey|workflow|flow)/i, key: 'userFlow' },
  { regex: /#+\s*(wireframes|mockups|design|ui\s*\/\s*ux)/i, key: 'design' },
  { regex: /#+\s*(database|data\s*model|schema|entities)/i, key: 'database' },
  { regex: /#+\s*(api|endpoints|integration|third.party)/i, key: 'api' },
  { regex: /#+\s*(timeline|milestones|roadmap|phases)/i, key: 'timeline' },
];

const INDUSTRY_KEYWORDS: Array<[RegExp, Industry]> = [
  [/saas|subscription|software\s*as\s*a\s*service|multi.tenant|project\s*management|task\s*management|collaboration/i, 'saas'],
  [/ecommerce|e-commerce|shop|store|product\s*catalog|cart|checkout/i, 'ecommerce'],
  [/healthcare|medical|clinic|hospital|patient|doctor|health/i, 'healthcare'],
  [/education|lms|learning|courses|training|students/i, 'education'],
  [/restaurant|food|dining|menu|reservation/i, 'restaurant'],
  [/fitness|gym|workout|health\s*club|personal\s*trainer/i, 'fitness'],
  [/real.estate|property|rental|housing|listing/i, 'real-estate'],
  [/fintech|finance|banking|payment|investment|budget/i, 'fintech'],
  [/media|news|blog|content|publishing|article/i, 'media'],
  [/marketplace|multi.vendor|seller|buyer/i, 'marketplace'],
  [/nonprofit|charity|ngo|donation|volunteer/i, 'nonprofit'],
  [/portfolio|agency|creative|design\s*agency/i, 'portfolio'],
];

export class PRDAdapter implements InputAdapter {
  readonly type = IntentType.PRD;

  canHandle(input: string): boolean {
    const trimmed = input.trim();
    if (trimmed.length < 100) return false;

    const sectionMatches = PRD_SECTION_PATTERNS.filter(p => p.regex.test(trimmed)).length;
    if (sectionMatches >= 2) return true;

    const hasPrdKeywords = /\b(prd|requirements\s*document|product\s*requirements|specification)\b/i.test(trimmed);
    return hasPrdKeywords && trimmed.length > 200;
  }

  async process(input: string, _options?: Record<string, unknown>): Promise<AdapterResult> {
    const trimmed = input.trim();

    const sections: Record<string, string> = {};
    for (const pattern of PRD_SECTION_PATTERNS) {
      const match = trimmed.match(pattern.regex);
      if (match?.index !== undefined) {
        const startIdx = match.index;
        const afterHeader = trimmed.slice(startIdx + match[0].length);
        const nextSections = PRD_SECTION_PATTERNS
          .filter(p => p.key !== pattern.key)
          .map(p => ({ key: p.key, idx: afterHeader.search(p.regex) }))
          .filter(p => p.idx !== -1)
          .sort((a, b) => a.idx - b.idx);

        const nearest = nextSections[0];
        const endIdx = nearest ? nearest.idx : afterHeader.length;
        sections[pattern.key] = afterHeader.slice(0, endIdx).trim();
      }
    }

    let detectedIndustry: Industry | undefined;
    for (const [regex, industry] of INDUSTRY_KEYWORDS) {
      if (regex.test(trimmed)) {
        detectedIndustry = industry;
        break;
      }
    }

    const entities = this.extractEntities(trimmed);
    const pages = this.extractPages(trimmed, detectedIndustry);
    const integrations = this.extractIntegrations(trimmed);
    const projectName = this.extractProjectName(trimmed);

    const id = `prd-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const manifest = {
      id,
      description: `Project from PRD: ${projectName}`,
      userInput: input,
      name: projectName,
      ...(detectedIndustry ? { domain: detectedIndustry } : {}),
      createdAt: new Date().toISOString(),
      version: 1,
    };

    return {
      manifest,
      adapterType: IntentType.PRD,
      confidence: 0.85,
      detectedIndustry,
      detectedName: projectName,
      entities,
      pages,
      integrations,
      metadata: {
        parsedSections: Object.keys(sections),
        sectionCount: Object.keys(sections).length,
        hasUserStories: !!sections.userStories,
        hasDatabase: !!sections.database,
        hasApi: !!sections.api,
      },
    };
  }

  private extractProjectName(text: string): string {
    const nameMatch = text.match(/#+\s*(?:project\s*name|app\s*name|product\s*name)\s*:?\s*(.+)/i);
    const name = nameMatch?.[1];
    if (name) return name.trim();

    const titleMatch = text.match(/^#\s+(.+)/m);
    const title = titleMatch?.[1];
    if (title) return title.replace(/PRD|Requirements|Specification/gi, '').trim();

    return 'PRD Project';
  }

  private extractEntities(text: string): string[] {
    const entities = new Set<string>();
    const entityPatterns = [
      /(?:entities|models|tables):?\s*[:\-]\s*([A-Z]\w+)/gi,
      /(?:entity|model|table)\s+(?:called|named)?\s*`?([A-Z]\w+)`?/gi,
      /`?([A-Z]\w+)`?\s+(?:entity|model|table)/gi,
    ];

    for (const pattern of entityPatterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        const captured = m[1];
        if (captured) entities.add(captured);
      }
    }

    if (entities.size === 0) {
      entities.add('User');
    }

    return [...entities];
  }

  private extractPages(text: string, industry?: Industry): string[] {
    const pages = new Set<string>();

    const pagePatterns = [
      /(?:page|screen|view)\s+(?:called|named)?\s*`?([A-Za-z]\w+)`?/gi,
      /`?\/([a-z][a-z0-9_-]*)`?/gi,
    ];

    for (const pattern of pagePatterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        const captured = m[1];
        if (captured) {
          const page = captured.startsWith('/') ? captured : `/${captured.toLowerCase()}`;
          pages.add(page);
        }
      }
    }

    if (pages.size < 3) {
      const defaults: Record<string, string[]> = {
        ecommerce: ['/', '/shop', '/cart', '/checkout', '/account'],
        saas: ['/', '/dashboard', '/settings', '/login', '/signup'],
        healthcare: ['/', '/appointments', '/doctors', '/profile'],
        education: ['/', '/courses', '/dashboard', '/profile'],
        restaurant: ['/', '/menu', '/reservations', '/order'],
        fitness: ['/', '/workouts', '/plans', '/progress'],
        'real-estate': ['/', '/listings', '/property/:id', '/contact'],
        fintech: ['/', '/dashboard', '/transactions', '/accounts'],
        media: ['/', '/articles', '/article/:slug', '/categories'],
        portfolio: ['/', '/work', '/about', '/contact'],
        marketplace: ['/', '/browse', '/sell', '/messages'],
        nonprofit: ['/', '/donate', '/events', '/about'],
      };
      if (industry) {
        const defaultsForIndustry = defaults[industry];
        if (defaultsForIndustry) {
          for (const p of defaultsForIndustry) pages.add(p);
        }
      }
    }

    return [...pages];
  }

  private extractIntegrations(text: string): string[] {
    const integrations = new Set<string>();

    const patterns = [
      /(?:integrate|integration|connect|via)\s+(?:with|to|via)?\s*(Stripe|PayPal|Razorpay|Braintree|Square)/gi,
      /(?:integrate|integration|connect|via)\s+(?:with|to|via)?\s*(Auth0|Clerk|Firebase Auth|OAuth)/gi,
      /(?:integrate|integration|connect|via)\s+(?:with|to|via)?\s*(SendGrid|Mailchimp|Postmark|SES)/gi,
      /(?:integrate|integration|connect|via)\s+(?:with|to|via)?\s*(Twilio|Pusher|Socket\.IO)/gi,
      /(?:integrate|integration|connect|via)\s+(?:with|to|via)?\s*(AWS|GCP|Azure|Cloudflare)/gi,
      /(?:integrate|integration|connect|via)\s+(?:with|to|via)?\s*(OpenAI|GPT|Claude|LLM)/gi,
      /(?:integrate|integration|connect|via)\s+(?:with|to|via)?\s*(Slack|Discord|Teams|Notion)/gi,
      /(?:integrate|integration|connect|via)\s+(?:with|to|via)?\s*(Shopify|WooCommerce|Magento)/gi,
    ];

    for (const pattern of patterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        const captured = m[1];
        if (captured) integrations.add(captured.toLowerCase());
      }
    }

    return [...integrations];
  }
}
