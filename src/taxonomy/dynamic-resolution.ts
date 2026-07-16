/**
 * Dynamic Knowledge Resolution
 * ==============================
 *
 * Handles cases where no built-in knowledge pack matches:
 * 1. Confidence scoring — evaluates classification quality
 * 2. Pack synthesis — creates a minimal pack from prompt evidence
 * 3. Web evidence — enriches classification with domain signals
 * 4. Conflict resolution — handles contradictory signals
 */

import type {
  TaxonomyPath,
  BusinessClassification,
  ClassificationEvidence,
  KnowledgePack,
  KnowledgePackCopy,
  KnowledgePackDomainData,
  KnowledgePackDesign,
  KnowledgePackVisual,
  KnowledgePackMotion,
  KnowledgePackComponents,
  KnowledgePackLayout,
  KnowledgePackExperience,
} from './types.js';

// ─── Confidence Scoring ─────────────────────────────────────────────────────

export interface ConfidenceFactors {
  /** Number of evidence signals supporting the classification */
  signalCount: number;
  /** Average weight of evidence signals */
  averageSignalWeight: number;
  /** Whether a pack was found */
  hasPack: boolean;
  /** Whether the match was exact path (vs. parent/fuzzy) */
  isExactMatch: boolean;
  /** Whether the classification used the default fallback */
  isFallback: boolean;
  /** Number of distinct evidence dimensions */
  dimensionDiversity: number;
  /** Whether the prompt contains explicit industry terms */
  hasExplicitTerms: boolean;
}

/**
 * Calculate overall confidence score from multiple factors.
 *
 * Scoring weights:
 * - Signal count: 15% (more signals = more confident)
 * - Signal weight: 25% (higher weight signals = more confident)
 * - Pack found: 20% (having a pack is a strong signal)
 * - Exact match: 15% (exact path match is better than parent)
 * - Dimension diversity: 10% (signals from multiple dimensions = better)
 * - Not fallback: 15% (explicit terms > generic fallback)
 */
export function calculateConfidence(factors: ConfidenceFactors): number {
  let score = 0;

  // Signal count (0-1 normalized, capped at 5 signals)
  const signalScore = Math.min(factors.signalCount / 5, 1);
  score += signalScore * 0.15;

  // Average signal weight (already 0-1)
  score += factors.averageSignalWeight * 0.25;

  // Pack found
  score += (factors.hasPack ? 1 : 0) * 0.20;

  // Exact match
  score += (factors.isExactMatch ? 1 : 0) * 0.15;

  // Dimension diversity (0-1 normalized, capped at 4 dimensions)
  const diversityScore = Math.min(factors.dimensionDiversity / 4, 1);
  score += diversityScore * 0.10;

  // Not fallback
  score += (factors.isFallback ? 0 : 1) * 0.15;

  return Math.round(score * 100) / 100;
}

/**
 * Extract confidence factors from a classification result.
 */
export function extractConfidenceFactors(
  evidence: ClassificationEvidence[],
  hasPack: boolean,
  isExactMatch: boolean,
  isFallback: boolean,
): ConfidenceFactors {
  const dimensions = new Set(evidence.map(e => e.dimension));
  const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);

  return {
    signalCount: evidence.length,
    averageSignalWeight: evidence.length > 0 ? totalWeight / evidence.length : 0,
    hasPack,
    isExactMatch,
    isFallback,
    dimensionDiversity: dimensions.size,
    hasExplicitTerms: evidence.some(e => e.source === 'pack-alias' || e.source === 'detection-keyword'),
  };
}

// ─── Prompt Evidence Extraction ─────────────────────────────────────────────

export interface PromptEvidence {
  /** Detected product/service nature */
  productNature: string | null;
  /** Detected business model signals */
  businessModelSignals: string[];
  /** Detected quality signals (luxury, premium, budget, etc.) */
  qualitySignals: string[];
  /** Detected audience signals */
  audienceSignals: string[];
  /** Detected geographic signals */
  geoSignals: string[];
  /** Detected technology signals */
  techSignals: string[];
  /** Domain-specific nouns from the prompt */
  domainNouns: string[];
}

/**
 * Extract structured evidence from a prompt.
 * This is the "reading comprehension" layer that pulls meaning from text.
 */
export function extractPromptEvidence(prompt: string): PromptEvidence {
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/);

  return {
    productNature: detectProductNature(lower),
    businessModelSignals: detectBusinessModelSignals(lower),
    qualitySignals: detectQualitySignals(lower, words),
    audienceSignals: detectAudienceSignals(lower),
    geoSignals: detectGeoSignals(lower),
    techSignals: detectTechSignals(lower),
    domainNouns: extractDomainNouns(words),
  };
}

function detectProductNature(lower: string): string | null {
  const NATURE_PATTERNS: Array<{ pattern: RegExp; nature: string }> = [
    { pattern: /shoe|footwear|sneaker|boot|sandal|running shoe/, nature: 'footwear' },
    { pattern: /restaurant|cafe|coffee|bakery|dining|food service/, nature: 'food-service' },
    { pattern: /clinic|hospital|doctor|dental|medical|healthcare/, nature: 'healthcare' },
    { pattern: /law|legal|attorney|lawyer|litigation/, nature: 'legal' },
    { pattern: /real estate|property|realt|listing|apartment/, nature: 'real-estate' },
    { pattern: /gym|fitness|workout|crossfit|yoga|training/, nature: 'fitness' },
    { pattern: /school|course|learn|tutor|coaching|education/, nature: 'education' },
    { pattern: /salon|beauty|spa|skincare|makeup/, nature: 'beauty' },
    { pattern: /software|saas|dashboard|platform|app/, nature: 'software' },
    { pattern: /shop|store|ecommerce|product|cart|retail/, nature: 'retail' },
    { pattern: /blog|news|magazine|podcast|media/, nature: 'media' },
    { pattern: /portfolio|personal|showcase/, nature: 'portfolio' },
    { pattern: /fintech|banking|payment|crypto|insurance/, nature: 'fintech' },
  ];

  for (const { pattern, nature } of NATURE_PATTERNS) {
    if (pattern.test(lower)) return nature;
  }
  return null;
}

function detectBusinessModelSignals(lower: string): string[] {
  const signals: string[] = [];
  if (/subscription|monthly|annual plan/.test(lower)) signals.push('subscription');
  if (/marketplace|multi-vendor|platform/.test(lower)) signals.push('marketplace');
  if (/booking|appointment|reservation/.test(lower)) signals.push('booking');
  if (/donation|charity|nonprofit/.test(lower)) signals.push('donation');
  if (/freemium|free tier|free plan/.test(lower)) signals.push('freemium');
  if (/wholesale|bulk|distributor/.test(lower)) signals.push('wholesale');
  if (/one-time|single purchase|buy once/.test(lower)) signals.push('one-time');
  return signals;
}

function detectQualitySignals(lower: string, words: string[]): string[] {
  const signals: string[] = [];
  if (/luxury|premium|high-end|exclusive|bespoke|elite/.test(lower)) signals.push('luxury');
  if (/budget|affordable|cheap|value|economy/.test(lower)) signals.push('budget');
  if (/professional|enterprise|corporate/.test(lower)) signals.push('professional');
  if (/modern|minimal|clean|sleek/.test(lower)) signals.push('modern');
  if (/classic|traditional|timeless/.test(lower)) signals.push('classic');
  if (/bold|vibrant|energetic|dynamic/.test(lower)) signals.push('bold');
  if (/calm|serene|peaceful| zen/.test(lower)) signals.push('calm');
  return signals;
}

function detectAudienceSignals(lower: string): string[] {
  const signals: string[] = [];
  if (/b2b|business to business|enterprise/.test(lower)) signals.push('b2b');
  if (/b2c|consumer|direct to consumer/.test(lower)) signals.push('b2c');
  if (/internal|intranet|employee/.test(lower)) signals.push('internal');
  if (/government|public sector|municipal/.test(lower)) signals.push('government');
  if (/个人|企业|政府/.test(lower)) signals.push('cjk-market');
  return signals;
}

function detectGeoSignals(lower: string): string[] {
  const signals: string[] = [];
  if (/india|indian|delhi|mumbai|bangalore|bengaluru/.test(lower)) signals.push('india');
  if (/usa|united states|american|new york|san francisco|los angeles/.test(lower)) signals.push('usa');
  if (/uk|united kingdom|london|british/.test(lower)) signals.push('uk');
  if (/europe|european|german|french/.test(lower)) signals.push('europe');
  if (/asia|asian|japanese|chinese|korean/.test(lower)) signals.push('asia');
  return signals;
}

function detectTechSignals(lower: string): string[] {
  const signals: string[] = [];
  if (/react|next\.?js|vue|angular|svelte/.test(lower)) signals.push('react');
  if (/node|express|fastapi|django|rails/.test(lower)) signals.push('backend');
  if (/postgres|mysql|mongo|sqlite/.test(lower)) signals.push('database');
  if (/aws|azure|gcp|vercel|netlify/.test(lower)) signals.push('cloud');
  if (/stripe|paypal|razorpay/.test(lower)) signals.push('payments');
  if (/firebase|supabase/.test(lower)) signals.push('baas');
  return signals;
}

function extractDomainNouns(words: string[]): string[] {
  // Extract capitalized words or unique nouns that aren't common stop words
  const STOP_WORDS = new Set([
    'build', 'create', 'make', 'design', 'develop', 'the', 'a', 'an',
    'for', 'with', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'from',
    'by', 'about', 'like', 'through', 'over', 'before', 'after', 'above',
    'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
    'about', 'against', 'between', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
    'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
    'that', 'this', 'these', 'those', 'what', 'which', 'who', 'whom',
    'want', 'need', 'looking', 'site', 'website', 'page', 'app',
  ]);

  return words
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
    .slice(0, 10); // Cap at 10 domain nouns
}

// ─── Pack Synthesis ─────────────────────────────────────────────────────────

/**
 * Create a minimal synthetic knowledge pack when no built-in pack matches.
 *
 * This allows the pipeline to work for ANY industry, even ones we haven't
 * pre-built packs for. The synthetic pack uses prompt evidence to generate
 * reasonable defaults.
 */
export function synthesizePack(
  taxonomyPath: TaxonomyPath,
  evidence: PromptEvidence,
  originalPrompt: string,
): KnowledgePack {
  const productName = evidence.productNature || 'service';
  const quality = evidence.qualitySignals.includes('luxury') ? 'Premium' :
                  evidence.qualitySignals.includes('budget') ? 'Value' : 'Professional';

  const heroHeading = `${quality} ${productName.charAt(0).toUpperCase() + productName.slice(1)} — Tailored for Your Needs`;
  const heroSubheading = `Discover our ${productName} solutions, designed with quality and care.`;

  const copy: KnowledgePackCopy = {
    heroHeading,
    heroSubheading,
    heroPrimaryButton: 'Get Started',
    heroSecondaryButton: 'Learn More',
    heroTrustBadges: ['Quality Guaranteed', 'Fast Delivery', 'Expert Support'],
    heroImageKeywords: [productName, quality.toLowerCase(), evidence.productNature || 'business'],
    featuresHeading: 'Why Choose Us',
    featuresSubheading: 'Quality solutions for your needs',
    features: [
      { icon: 'Star', title: 'Quality', description: 'Premium quality products and services' },
      { icon: 'Shield', title: 'Trust', description: 'Trusted by thousands of customers' },
      { icon: 'Zap', title: 'Speed', description: 'Fast delivery and response times' },
      { icon: 'Heart', title: 'Care', description: 'Dedicated customer support' },
      { icon: 'Target', title: 'Focus', description: 'Tailored to your specific needs' },
      { icon: 'RefreshCw', title: 'Flexibility', description: 'Flexible options and plans' },
    ],
    testimonialsHeading: 'What Our Customers Say',
    testimonialsSubheading: 'Real reviews from satisfied customers',
    testimonials: [
      { text: 'Excellent service and quality. Highly recommended!', author: 'Happy Customer', role: 'Client', company: '' },
      { text: 'Professional team with great attention to detail.', author: 'Satisfied User', role: 'Customer', company: '' },
      { text: 'Outstanding experience from start to finish.', author: 'Valued Client', role: 'Partner', company: '' },
    ],
    ctaHeading: `Ready to Experience ${quality} ${productName.charAt(0).toUpperCase() + productName.slice(1)}?`,
    ctaPrimaryButton: 'Contact Us',
    ctaTrustLine: 'Satisfaction guaranteed · Fast response',
    stats: [
      { value: '500+', label: 'Happy Customers' },
      { value: '4.9/5', label: 'Rating' },
      { value: '24/7', label: 'Support' },
      { value: '100%', label: 'Satisfaction' },
    ],
    forbiddenPhrases: ['buy now', 'limited time offer', 'act fast'],
  };

  const domainData: KnowledgePackDomainData = {
    products: [
      { name: `${quality} ${productName.charAt(0).toUpperCase() + productName.slice(1)} Basic`, price: '$49.99', description: `Essential ${productName} solution`, category: 'Basic', image: '' },
      { name: `${quality} ${productName.charAt(0).toUpperCase() + productName.slice(1)} Pro`, price: '$99.99', description: `Professional ${productName} solution`, category: 'Pro', image: '' },
      { name: `${quality} ${productName.charAt(0).toUpperCase() + productName.slice(1)} Elite`, price: '$199.99', description: `Premium ${productName} solution`, category: 'Elite', image: '' },
    ],
    testimonials: copy.testimonials.map(t => ({ ...t, rating: 5 })),
    features: copy.features,
    services: [
      { name: 'Consultation', description: 'Free initial consultation', price: 'Free', duration: '30 min' },
      { name: 'Premium Support', description: 'Priority support channel', price: '$29/mo', duration: 'Monthly' },
    ],
    team: [
      { name: 'Team Lead', role: 'Founder', bio: 'Passionate about delivering quality' },
    ],
  };

  const design: KnowledgePackDesign = {
    personality: evidence.qualitySignals.includes('luxury') ? 'sophisticated' :
                 evidence.qualitySignals.includes('bold') ? 'bold' : 'professional',
    colorHint: evidence.qualitySignals.includes('luxury') ? '#1a1a2e' :
               evidence.qualitySignals.includes('bold') ? '#FF4500' : '#2563eb',
    radiusScale: 'standard',
    density: 'balanced',
    mood: ['professional', 'trustworthy', 'modern'],
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
  };

  const visual: KnowledgePackVisual = {
    palette: {
      primary: design.colorHint,
      secondary: '#1a1a2e',
      accent: design.colorHint,
      background: '#ffffff',
      surface: '#f8fafc',
      surfaceHover: '#f1f5f9',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    typography: {
      heading: design.typography.headingFont,
      body: design.typography.bodyFont,
      accent: design.typography.headingFont,
    },
    shadows: ['0 1px 3px rgba(0,0,0,0.1)'],
    borders: ['1px solid #e2e8f0'],
  };

  const motion: KnowledgePackMotion = {
    defaultDuration: '0.3s',
    defaultEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    hoverDuration: '0.15s',
    scrollReveal: 'fade-up',
    staggerDelay: '0.1s',
  };

  const components: KnowledgePackComponents = {
    recommended: ['HeroBanner', 'FeatureGrid', 'TestimonialCarousel', 'CTASection', 'Footer'],
    avoid: [],
    heroLayout: 'centered',
    featureLayout: '3-column-grid',
    testimonialLayout: 'carousel',
  };

  const layout: KnowledgePackLayout = {
    heroVariant: 'centered',
    featureVariant: '3-column-grid',
    testimonialVariant: 'carousel',
    ctaVariant: 'centered',
    navType: 'top-horizontal',
    footerType: 'multi-column',
  };

  const experience: KnowledgePackExperience = {
    defaultStyle: evidence.qualitySignals.includes('bold') ? 'energetic' : 'professional',
    emotionalQualities: ['trust', 'confidence', 'quality'],
    narrativeStructures: ['problem-solution', 'feature-showcase'],
    hoverDefaults: ['scale-lift'],
    interactionDensity: 'moderate',
    motionIntensity: 'moderate',
    conversionFocus: 'balanced',
    performanceSensitivity: 'medium',
  };

  return {
    id: taxonomyPath,
    name: `${productName.charAt(0).toUpperCase() + productName.slice(1)} (Synthesized)`,
    version: '0.1.0',
    taxonomyPath,
    aliases: evidence.domainNouns.slice(0, 5),
    detectionKeywords: evidence.domainNouns.slice(0, 10),
    copy,
    domainData,
    vocabulary: {
      'product': productName,
      'customer': 'client',
      'order': 'booking',
    },
    sectionNames: {
      'hero': 'Hero',
      'features': 'Features',
      'testimonials': 'Testimonials',
      'cta': 'Get Started',
    },
    design,
    visual,
    motion,
    components,
    layout,
    experience,
    workflows: [
      {
        name: 'Default Workflow',
        steps: ['Discover', 'Evaluate', 'Purchase', 'Receive'],
        revenueImpact: 'Primary conversion flow',
      },
    ],
    entities: [
      {
        name: productName.charAt(0).toUpperCase() + productName.slice(1),
        archetype: 'Product',
        fields: ['id', 'name', 'description', 'price', 'category'],
        relationships: [],
      },
    ],
    compliance: [],
    integrations: [
      { name: 'Email', category: 'communication', purpose: 'Customer communication' },
      { name: 'Analytics', category: 'analytics', purpose: 'Traffic tracking' },
    ],
    kpis: ['Conversion Rate', 'Customer Satisfaction', 'Revenue'],
    revenueModel: evidence.businessModelSignals.length > 0 ? evidence.businessModelSignals : ['direct-sales'],
    paymentMethods: ['credit-card', 'debit-card'],
    pages: [
      { path: '/', purpose: 'Homepage', workflows: ['Default Workflow'] },
      { path: '/about', purpose: 'About', workflows: [] },
      { path: '/contact', purpose: 'Contact', workflows: [] },
    ],
    features: [
      { icon: 'Star', title: 'Quality', description: 'Premium quality', priority: 'essential' },
      { icon: 'Shield', title: 'Trust', description: 'Trusted service', priority: 'essential' },
    ],
    hero: {
      heading: heroHeading,
      subheading: heroSubheading,
      primaryButton: 'Get Started',
      secondaryButton: 'Learn More',
      trustBadges: ['Quality Guaranteed', 'Fast Delivery'],
      imageKeywords: [productName],
    },
    cta: {
      heading: copy.ctaHeading,
      primaryButton: 'Contact Us',
      trustLine: 'Satisfaction guaranteed',
    },
    footer: {
      tagline: `Quality ${productName} solutions for your needs.`,
      links: [
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    referenceUrls: [],
    referenceSelectors: {},
  };
}

// ─── Conflict Resolution ────────────────────────────────────────────────────

export interface ConflictResolution {
  /** The winning classification */
  winningPath: TaxonomyPath;
  /** Confidence in the resolution */
  confidence: number;
  /** Explanation of why this path won */
  reasoning: string;
}

/**
 * Resolve conflicts when multiple signals suggest different industries.
 *
 * Strategy:
 * 1. If a pack alias was found, that wins (user explicitly said the word)
 * 2. If multiple keywords match, pick the one with highest weight
 * 3. If signals conflict, prefer the one with more supporting evidence
 * 4. If still tied, prefer the more specific (deeper) taxonomy path
 */
export function resolveConflicts(
  candidates: Array<{ path: TaxonomyPath; confidence: number; evidence: ClassificationEvidence[] }>,
): ConflictResolution {
  if (candidates.length === 0) {
    return {
      winningPath: 'services',
      confidence: 0.1,
      reasoning: 'No candidates — falling back to generic services',
    };
  }

  if (candidates.length === 1) {
    return {
      winningPath: candidates[0].path,
      confidence: candidates[0].confidence,
      reasoning: 'Single candidate — no conflict',
    };
  }

  // Sort by confidence (descending), then by specificity (deeper path = more specific)
  const sorted = candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.path.split('/').length - a.path.split('/').length;
  });

  const winner = sorted[0];
  const runner = sorted[1];

  // If confidence gap is large enough, winner takes all
  if (winner.confidence - runner.confidence > 0.2) {
    return {
      winningPath: winner.path,
      confidence: winner.confidence,
      reasoning: `Clear winner: ${winner.path} (${winner.confidence}) vs ${runner.path} (${runner.confidence})`,
    };
  }

  // Close call — reduce confidence and note the conflict
  return {
    winningPath: winner.path,
    confidence: winner.confidence * 0.85,
    reasoning: `Close conflict: ${winner.path} won over ${runner.path} by ${(winner.confidence - runner.confidence).toFixed(2)}`,
  };
}
