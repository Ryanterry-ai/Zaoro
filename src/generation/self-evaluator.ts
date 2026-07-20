import { DomainContext } from './domain-detector.js';

export interface EvaluationResult {
  passed: boolean;
  score: number;
  checks: CheckResult[];
  suggestions: string[];
}

export interface CheckResult {
  name: string;
  passed: boolean;
  score: number;
  message: string;
}

const GENERIC_MARKERS = [
  'premium option', 'essential choice', 'pro edition', 'team plan',
  'happy customers', 'average rating', 'products',
  'discover what', 'offers', 'quality products curated',
  'absolutely love this', 'fast reliable', 'best decision',
  'lightning fast', 'secure reliable', 'works everywhere',
  'beautiful design', 'easy to use', '24/7 support',
  'featured collection', 'add to cart', 'view collection',
  'subscribe', 'stay updated', 'newsletter',
];

const DOMAIN_GENERIC_PAIRS: Record<string, string[]> = {
  'real-estate': ['add to cart', 'subscribe', 'newsletter', 'view collection', 'featured collection'],
  'restaurant': ['add to cart', 'subscribe', 'newsletter', 'view collection', 'pricing'],
  'fitness': ['add to cart', 'newsletter', 'view collection', 'featured collection'],
  'healthcare': ['add to cart', 'newsletter', 'view collection', 'pricing'],
  'law-firm': ['add to cart', 'newsletter', 'view collection', 'pricing', 'featured collection'],
  'saas': ['add to cart', 'view collection', 'featured collection'],
  'ecommerce': ['book now', 'schedule', 'appointment', 'consultation'],
  'portfolio': ['add to cart', 'pricing', 'newsletter', 'featured collection'],
  'agency': ['add to cart', 'newsletter', 'featured collection'],
};

export function evaluateGeneratedContent(
  code: string,
  domain: DomainContext,
  prompt: string,
): EvaluationResult {
  const checks: CheckResult[] = [];

  checks.push(checkDomainRelevance(code, domain, prompt));
  checks.push(checkNotGeneric(code, domain.industry));
  checks.push(checkHasRealContent(code));
  checks.push(checkImagesAreReal(code));
  checks.push(checkCtaMatchesDomain(code, domain));

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxScore = checks.length * 20;
  const percentage = Math.round((totalScore / maxScore) * 100);

  const suggestions: string[] = [];
  for (const check of checks) {
    if (!check.passed) {
      suggestions.push(check.message);
    }
  }

  // Hard gate: domain relevance is a blocker, not just one weighted check.
  // A build that matches <30% of prompt terms is a template, not a real site,
  // and must not pass even if other checks score well.
  const relevance = checks.find(c => c.name === 'Domain Relevance');
  const relevanceRatio = relevance ? relevance.score / 20 : 1;
  const passed = percentage >= 60 && relevanceRatio >= 0.3;

  return {
    passed,
    score: percentage,
    checks,
    suggestions,
  };
}

function checkDomainRelevance(code: string, domain: DomainContext, prompt: string): CheckResult {
  const lowerCode = code.toLowerCase();
  const promptWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  let relevantWords = 0;
  for (const word of promptWords) {
    if (lowerCode.includes(word)) relevantWords++;
  }

  const ratio = promptWords.length > 0 ? relevantWords / promptWords.length : 0;
  const score = Math.min(20, Math.round(ratio * 40));

  return {
    name: 'Domain Relevance',
    passed: score >= 8,
    score,
    message: score < 8
      ? `Content lacks domain-specific keywords. Only ${Math.round(ratio * 100)}% of prompt terms found.`
      : 'Content is relevant to the domain.',
  };
}

function checkNotGeneric(code: string, industry: string): CheckResult {
  const lowerCode = code.toLowerCase();
  const blacklist = DOMAIN_GENERIC_PAIRS[industry] || [];
  const allGeneric = [...GENERIC_MARKERS, ...blacklist];

  let genericCount = 0;
  for (const marker of allGeneric) {
    if (lowerCode.includes(marker)) genericCount++;
  }

  const score = Math.max(0, 20 - (genericCount * 4));

  return {
    name: 'Not Generic',
    passed: score >= 10,
    score,
    message: score < 10
      ? `Found ${genericCount} generic phrases. Content looks like a template.`
      : 'Content avoids generic template phrases.',
  };
}

function checkHasRealContent(code: string): CheckResult {
  const hasNumbers = /\d{2,}/.test(code);
  const hasNames = /[A-Z][a-z]+ [A-Z][a-z]+/.test(code);
  const hasPrices = /\$\d+/.test(code) || /\d+\+?\s*(?:sqft|bed|bath|reviews|patients|members|cases)/i.test(code);
  const hasSpecifics = /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/.test(code) || /\b(?:AM|PM)\b/.test(code) || /\b(?:st|nd|rd|th)\b/.test(code);

  const factors = [hasNumbers, hasNames, hasPrices, hasSpecifics];
  const passed = factors.filter(Boolean).length;
  const score = Math.round((passed / factors.length) * 20);

  return {
    name: 'Real Content',
    passed: score >= 10,
    score,
    message: score < 10
      ? 'Content lacks specific data like names, prices, or numbers.'
      : 'Content contains specific, realistic data.',
  };
}

function checkImagesAreReal(code: string): CheckResult {
  const hasUnsplash = /unsplash\.com/.test(code);
  const hasDicebear = /dicebear\.com/.test(code);
  const hasGenericEmoji = /[⭐📦🚀👥💰⚖️🦷🏥🍽️🏋️🧘💪💎🎨📝]/.test(code);
  const hasGradients = /gradient-to/.test(code);

  const hasRealImages = hasUnsplash || hasDicebear;
  const score = hasRealImages ? 20 : hasGradients ? 12 : hasGenericEmoji ? 8 : 4;

  return {
    name: 'Real Images',
    passed: score >= 12,
    score,
    message: score < 12
      ? 'Images are generic emojis or placeholders. Should use real photos.'
      : 'Content uses real or high-quality generated images.',
  };
}

function checkCtaMatchesDomain(code: string, domain: DomainContext): CheckResult {
  const lowerCode = code.toLowerCase();
  const industry = domain.industry;

  const appropriateCtas: Record<string, string[]> = {
    'real-estate': ['browse', 'search', 'tour', 'view', 'schedule', 'find'],
    'restaurant': ['menu', 'reserve', 'book', 'order', 'dine'],
    'fitness': ['join', 'start', 'trial', 'class', 'workout', 'train'],
    'saas': ['start', 'trial', 'demo', 'try', 'free'],
    'healthcare': ['book', 'appointment', 'schedule', 'consult', 'call'],
    'law-firm': ['consult', 'call', 'review', 'free', 'contact'],
    'ecommerce': ['shop', 'buy', 'cart', 'browse', 'collection'],
  };

  const goodCtas = appropriateCtas[industry] || ['start', 'get', 'try', 'contact'];
  const ctaMatch = goodCtas.some(cta => lowerCode.includes(cta));

  const score = ctaMatch ? 20 : 10;

  return {
    name: 'CTA Match',
    passed: score >= 12,
    score,
    message: !ctaMatch
      ? `CTA buttons don't match ${industry} domain patterns.`
      : 'Call-to-action matches the domain.',
  };
}
