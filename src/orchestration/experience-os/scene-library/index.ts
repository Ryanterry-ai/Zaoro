// ─── Scene Library ──────────────────────────────────────────────────────────
//
// Reusable, composable scene definitions.
// Each scene is a parameterized template that can be customized per industry.
// Scenes compose together to form experience flows.
//
// Instead of generating scenes from scratch every time,
// the library provides pre-built, tested, parameterizable scenes.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  SceneDefinition,
  SceneCategory,
  NarrativeRole,
  SceneParameter,
  SceneDefaults,
  SceneComposability,
} from '../types.js';

// ─── Scene Registry ─────────────────────────────────────────────────────────

const SCENE_DEFINITIONS: SceneDefinition[] = [
  // ─── Hero Scenes ────────────────────────────────────────────────────────
  {
    id: 'hero-centered',
    name: 'Centered Hero',
    category: 'hero',
    narrativeRole: 'hook',
    parameters: [
      { name: 'title', type: 'string', defaultValue: '', description: 'Main headline', required: true },
      { name: 'subtitle', type: 'string', defaultValue: '', description: 'Supporting text', required: true },
      { name: 'badge', type: 'string', defaultValue: '', description: 'Badge/pill text', required: false },
      { name: 'ctaText', type: 'string', defaultValue: 'Get Started', description: 'Primary CTA text', required: false },
      { name: 'backgroundImage', type: 'image', defaultValue: '', description: 'Hero background image', required: false },
      { name: 'videoUrl', type: 'string', defaultValue: '', description: 'Background video URL', required: false },
    ],
    defaults: {
      layout: 'centered',
      spacing: 'py-24 px-6',
      background: 'bg-background',
      animation: 'cinematic',
      contentDensity: 'minimal',
      visualComplexity: 'moderate',
    },
    composability: {
      canFollow: [],
      canPrecede: ['hero-split', 'hero-fullscreen', 'hero-video'],
      canCombineWith: ['scroll-accumulation', 'parallax-layers'],
      maxOccurrences: 1,
    },
    industryFit: { saas: 0.9, ecommerce: 0.8, healthcare: 0.7, 'real-estate': 0.8, fitness: 0.7, restaurant: 0.6, education: 0.8, portfolio: 0.9 },
    performanceTier: 'standard',
  },
  {
    id: 'hero-split',
    name: 'Split Hero (Text + Visual)',
    category: 'hero',
    narrativeRole: 'hook',
    parameters: [
      { name: 'title', type: 'string', defaultValue: '', description: 'Main headline', required: true },
      { name: 'subtitle', type: 'string', defaultValue: '', description: 'Supporting text', required: true },
      { name: 'visualType', type: 'string', defaultValue: 'image', description: 'image, video, or 3d', required: false },
      { name: 'visualPosition', type: 'string', defaultValue: 'right', description: 'left or right', required: false },
      { name: 'ctaText', type: 'string', defaultValue: 'Get Started', description: 'Primary CTA text', required: false },
    ],
    defaults: {
      layout: 'grid-2',
      spacing: 'py-20 px-6',
      background: 'bg-background',
      animation: 'fade-up',
      contentDensity: 'moderate',
      visualComplexity: 'moderate',
    },
    composability: {
      canFollow: ['hero-centered'],
      canPrecede: ['feature-grid', 'social-proof-bar', 'stats-row'],
      canCombineWith: ['scroll-accumulation'],
      maxOccurrences: 1,
    },
    industryFit: { saas: 0.95, ecommerce: 0.85, 'real-estate': 0.9, healthcare: 0.8, education: 0.85, fitness: 0.75 },
    performanceTier: 'standard',
  },
  {
    id: 'hero-fullscreen',
    name: 'Fullscreen Cinematic Hero',
    category: 'hero',
    narrativeRole: 'hook',
    parameters: [
      { name: 'title', type: 'string', defaultValue: '', description: 'Main headline', required: true },
      { name: 'subtitle', type: 'string', defaultValue: '', description: 'Supporting text', required: true },
      { name: 'backgroundImage', type: 'image', defaultValue: '', description: 'Full-screen background', required: true },
      { name: 'overlayOpacity', type: 'number', defaultValue: 0.6, description: 'Overlay darkness (0-1)', required: false },
      { name: 'ctaText', type: 'string', defaultValue: 'Explore', description: 'CTA text', required: false },
    ],
    defaults: {
      layout: 'fullscreen',
      spacing: 'min-h-screen',
      background: 'bg-black',
      animation: 'cinematic',
      contentDensity: 'minimal',
      visualComplexity: 'complex',
    },
    composability: {
      canFollow: [],
      canPrecede: ['content-narrative', 'feature-grid', 'stats-row'],
      canCombineWith: ['parallax-layers', 'scroll-accumulation', 'camera-push'],
      maxOccurrences: 1,
    },
    industryFit: { 'real-estate': 0.95, luxury: 0.95, portfolio: 0.9, fitness: 0.85, restaurant: 0.8, media: 0.85 },
    performanceTier: 'heavy',
  },
  {
    id: 'hero-video',
    name: 'Video Background Hero',
    category: 'hero',
    narrativeRole: 'hook',
    parameters: [
      { name: 'title', type: 'string', defaultValue: '', description: 'Main headline', required: true },
      { name: 'subtitle', type: 'string', defaultValue: '', description: 'Supporting text', required: true },
      { name: 'videoUrl', type: 'string', defaultValue: '', description: 'Background video URL', required: true },
      { name: 'posterImage', type: 'image', defaultValue: '', description: 'Video poster/fallback', required: false },
    ],
    defaults: {
      layout: 'fullscreen',
      spacing: 'min-h-screen',
      background: 'bg-black',
      animation: 'cinematic',
      contentDensity: 'minimal',
      visualComplexity: 'complex',
    },
    composability: {
      canFollow: [],
      canPrecede: ['feature-grid', 'content-narrative', 'stats-row'],
      canCombineWith: ['scroll-accumulation'],
      maxOccurrences: 1,
    },
    industryFit: { fitness: 0.9, 'real-estate': 0.85, restaurant: 0.85, luxury: 0.9, media: 0.8 },
    performanceTier: 'heavy',
  },

  // ─── Content Scenes ─────────────────────────────────────────────────────
  {
    id: 'feature-grid',
    name: 'Feature Grid',
    category: 'content',
    narrativeRole: 'benefits',
    parameters: [
      { name: 'title', type: 'string', defaultValue: 'Features', description: 'Section title', required: true },
      { name: 'subtitle', type: 'string', defaultValue: '', description: 'Section subtitle', required: false },
      { name: 'items', type: 'array', defaultValue: [], description: 'Feature items', required: true },
      { name: 'columns', type: 'number', defaultValue: 3, description: 'Grid columns', required: false },
      { name: 'variant', type: 'string', defaultValue: 'cards', description: 'cards, bento, or alternating', required: false },
    ],
    defaults: {
      layout: 'grid-3',
      spacing: 'py-20 px-6',
      background: 'bg-background',
      animation: 'stagger',
      contentDensity: 'moderate',
      visualComplexity: 'moderate',
    },
    composability: {
      canFollow: ['hero-centered', 'hero-split', 'hero-fullscreen', 'content-narrative', 'social-proof-bar'],
      canPrecede: ['social-proof-bar', 'testimonial-carousel', 'cta-banner', 'pricing-table', 'faq-accordion'],
      canCombineWith: ['scroll-accumulation'],
      maxOccurrences: 3,
    },
    industryFit: { saas: 0.95, ecommerce: 0.85, healthcare: 0.8, education: 0.9, fintech: 0.85 },
    performanceTier: 'standard',
  },
  {
    id: 'content-narrative',
    name: 'Content Narrative (Text + Image)',
    category: 'content',
    narrativeRole: 'solution',
    parameters: [
      { name: 'title', type: 'string', defaultValue: '', description: 'Heading', required: true },
      { name: 'body', type: 'string', defaultValue: '', description: 'Body text', required: true },
      { name: 'imagePosition', type: 'string', defaultValue: 'right', description: 'left or right', required: false },
      { name: 'image', type: 'image', defaultValue: '', description: 'Content image', required: false },
    ],
    defaults: {
      layout: 'grid-2',
      spacing: 'py-20 px-6',
      background: 'bg-background',
      animation: 'fade-up',
      contentDensity: 'rich',
      visualComplexity: 'moderate',
    },
    composability: {
      canFollow: ['hero-centered', 'hero-split', 'feature-grid'],
      canPrecede: ['feature-grid', 'social-proof-bar', 'cta-banner', 'stats-row'],
      canCombineWith: [],
      maxOccurrences: 4,
    },
    industryFit: { healthcare: 0.9, education: 0.9, 'real-estate': 0.85, saas: 0.8, nonprofit: 0.85 },
    performanceTier: 'light',
  },
  {
    id: 'stats-row',
    name: 'Statistics / Numbers',
    category: 'data',
    narrativeRole: 'proof',
    parameters: [
      { name: 'items', type: 'array', defaultValue: [], description: 'Stat items with value and label', required: true },
      { name: 'variant', type: 'string', defaultValue: 'countup', description: 'countup or static', required: false },
    ],
    defaults: {
      layout: 'grid-4',
      spacing: 'py-16 px-6',
      background: 'bg-muted/30',
      animation: 'countup',
      contentDensity: 'minimal',
      visualComplexity: 'simple',
    },
    composability: {
      canFollow: ['hero-centered', 'hero-split', 'feature-grid', 'content-narrative'],
      canPrecede: ['feature-grid', 'testimonial-carousel', 'cta-banner', 'pricing-table'],
      canCombineWith: [],
      maxOccurrences: 2,
    },
    industryFit: { saas: 0.9, ecommerce: 0.85, healthcare: 0.8, fitness: 0.85, fintech: 0.9, education: 0.8 },
    performanceTier: 'light',
  },
  {
    id: 'process-steps',
    name: 'Process / How It Works',
    category: 'content',
    narrativeRole: 'process',
    parameters: [
      { name: 'title', type: 'string', defaultValue: 'How It Works', description: 'Section title', required: true },
      { name: 'steps', type: 'array', defaultValue: [], description: 'Process steps', required: true },
      { name: 'variant', type: 'string', defaultValue: 'numbered', description: 'numbered, timeline, or cards', required: false },
    ],
    defaults: {
      layout: 'grid-3',
      spacing: 'py-20 px-6',
      background: 'bg-background',
      animation: 'stagger',
      contentDensity: 'moderate',
      visualComplexity: 'moderate',
    },
    composability: {
      canFollow: ['hero-centered', 'hero-split', 'feature-grid', 'content-narrative'],
      canPrecede: ['testimonial-carousel', 'cta-banner', 'pricing-table', 'faq-accordion'],
      canCombineWith: ['sticky-scroll'],
      maxOccurrences: 2,
    },
    industryFit: { saas: 0.95, fintech: 0.9, healthcare: 0.85, ecommerce: 0.8, education: 0.85 },
    performanceTier: 'standard',
  },

  // ─── Social Proof Scenes ────────────────────────────────────────────────
  {
    id: 'testimonial-carousel',
    name: 'Testimonial Carousel',
    category: 'social-proof',
    narrativeRole: 'social-proof',
    parameters: [
      { name: 'title', type: 'string', defaultValue: 'What People Say', description: 'Section title', required: false },
      { name: 'items', type: 'array', defaultValue: [], description: 'Testimonial items', required: true },
      { name: 'variant', type: 'string', defaultValue: 'carousel', description: 'carousel, grid, or spotlight', required: false },
    ],
    defaults: {
      layout: 'carousel',
      spacing: 'py-20 px-6',
      background: 'bg-background',
      animation: 'fade-up',
      contentDensity: 'moderate',
      visualComplexity: 'moderate',
    },
    composability: {
      canFollow: ['feature-grid', 'content-narrative', 'process-steps', 'stats-row'],
      canPrecede: ['cta-banner', 'pricing-table', 'faq-accordion', 'feature-grid'],
      canCombineWith: [],
      maxOccurrences: 2,
    },
    industryFit: { saas: 0.9, ecommerce: 0.85, healthcare: 0.8, fitness: 0.85, education: 0.8, restaurant: 0.75 },
    performanceTier: 'standard',
  },
  {
    id: 'social-proof-bar',
    name: 'Social Proof Bar (Logos / Numbers)',
    category: 'social-proof',
    narrativeRole: 'trust',
    parameters: [
      { name: 'logos', type: 'array', defaultValue: [], description: 'Partner/customer logos', required: false },
      { name: 'stat', type: 'string', defaultValue: '', description: 'Social proof stat text', required: false },
      { name: 'variant', type: 'string', defaultValue: 'logos', description: 'logos, numbers, or badges', required: false },
    ],
    defaults: {
      layout: 'flex-row',
      spacing: 'py-12 px-6',
      background: 'bg-muted/20',
      animation: 'fade-up',
      contentDensity: 'minimal',
      visualComplexity: 'simple',
    },
    composability: {
      canFollow: ['hero-centered', 'hero-split', 'feature-grid'],
      canPrecede: ['feature-grid', 'content-narrative', 'testimonial-carousel', 'cta-banner'],
      canCombineWith: [],
      maxOccurrences: 2,
    },
    industryFit: { saas: 0.95, fintech: 0.9, ecommerce: 0.85, healthcare: 0.7, education: 0.75 },
    performanceTier: 'light',
  },
  {
    id: 'case-study-card',
    name: 'Case Study Card',
    category: 'social-proof',
    narrativeRole: 'proof',
    parameters: [
      { name: 'title', type: 'string', defaultValue: '', description: 'Case study title', required: true },
      { name: 'summary', type: 'string', defaultValue: '', description: 'Brief summary', required: true },
      { name: 'image', type: 'image', defaultValue: '', description: 'Case study image', required: false },
      { name: 'metrics', type: 'array', defaultValue: [], description: 'Key metrics', required: false },
    ],
    defaults: {
      layout: 'card',
      spacing: 'py-16 px-6',
      background: 'bg-background',
      animation: 'fade-up',
      contentDensity: 'moderate',
      visualComplexity: 'moderate',
    },
    composability: {
      canFollow: ['feature-grid', 'testimonial-carousel', 'social-proof-bar'],
      canPrecede: ['cta-banner', 'pricing-table'],
      canCombineWith: [],
      maxOccurrences: 3,
    },
    industryFit: { saas: 0.9, fintech: 0.85, healthcare: 0.8, education: 0.75, 'real-estate': 0.7 },
    performanceTier: 'standard',
  },

  // ─── Conversion Scenes ──────────────────────────────────────────────────
  {
    id: 'cta-banner',
    name: 'Call-to-Action Banner',
    category: 'conversion',
    narrativeRole: 'cta',
    parameters: [
      { name: 'title', type: 'string', defaultValue: 'Ready to Get Started?', description: 'CTA heading', required: true },
      { name: 'subtitle', type: 'string', defaultValue: '', description: 'Supporting text', required: false },
      { name: 'ctaText', type: 'string', defaultValue: 'Get Started', description: 'Button text', required: true },
      { name: 'ctaUrl', type: 'string', defaultValue: '#', description: 'Button URL', required: false },
      { name: 'variant', type: 'string', defaultValue: 'card', description: 'card, full-width, or inline', required: false },
    ],
    defaults: {
      layout: 'centered',
      spacing: 'py-20 px-6',
      background: 'bg-primary/5',
      animation: 'fade-up',
      contentDensity: 'minimal',
      visualComplexity: 'simple',
    },
    composability: {
      canFollow: ['feature-grid', 'testimonial-carousel', 'pricing-table', 'faq-accordion', 'case-study-card'],
      canPrecede: ['footer'],
      canCombineWith: ['urgency-timer', 'trust-badges'],
      maxOccurrences: 3,
    },
    industryFit: { saas: 0.95, ecommerce: 0.9, fintech: 0.85, healthcare: 0.8, education: 0.85, fitness: 0.9 },
    performanceTier: 'light',
  },
  {
    id: 'pricing-table',
    name: 'Pricing Table',
    category: 'conversion',
    narrativeRole: 'offer',
    parameters: [
      { name: 'title', type: 'string', defaultValue: 'Pricing', description: 'Section title', required: true },
      { name: 'tiers', type: 'array', defaultValue: [], description: 'Pricing tiers', required: true },
      { name: 'variant', type: 'string', defaultValue: 'cards', description: 'cards, comparison, or toggle', required: false },
    ],
    defaults: {
      layout: 'grid-3',
      spacing: 'py-20 px-6',
      background: 'bg-background',
      animation: 'stagger',
      contentDensity: 'rich',
      visualComplexity: 'complex',
    },
    composability: {
      canFollow: ['feature-grid', 'testimonial-carousel', 'case-study-card', 'faq-accordion'],
      canPrecede: ['cta-banner', 'faq-accordion'],
      canCombineWith: ['annual-toggle'],
      maxOccurrences: 1,
    },
    industryFit: { saas: 0.95, fintech: 0.9, education: 0.85, ecommerce: 0.7, healthcare: 0.6 },
    performanceTier: 'standard',
  },
  {
    id: 'faq-accordion',
    name: 'FAQ Accordion',
    category: 'content',
    narrativeRole: 'reflection',
    parameters: [
      { name: 'title', type: 'string', defaultValue: 'Frequently Asked Questions', description: 'Section title', required: true },
      { name: 'items', type: 'array', defaultValue: [], description: 'FAQ items with question and answer', required: true },
      { name: 'variant', type: 'string', defaultValue: 'accordion', description: 'accordion, grid, or tabs', required: false },
    ],
    defaults: {
      layout: 'stacked',
      spacing: 'py-20 px-6',
      background: 'bg-background',
      animation: 'fade-up',
      contentDensity: 'rich',
      visualComplexity: 'simple',
    },
    composability: {
      canFollow: ['feature-grid', 'pricing-table', 'testimonial-carousel', 'content-narrative'],
      canPrecede: ['cta-banner', 'footer'],
      canCombineWith: [],
      maxOccurrences: 2,
    },
    industryFit: { saas: 0.9, ecommerce: 0.85, healthcare: 0.85, education: 0.9, fintech: 0.85, 'real-estate': 0.8 },
    performanceTier: 'light',
  },

  // ─── Media Scenes ───────────────────────────────────────────────────────
  {
    id: 'gallery-grid',
    name: 'Image/Video Gallery',
    category: 'media',
    narrativeRole: 'benefits',
    parameters: [
      { name: 'title', type: 'string', defaultValue: '', description: 'Gallery title', required: false },
      { name: 'items', type: 'array', defaultValue: [], description: 'Gallery items', required: true },
      { name: 'columns', type: 'number', defaultValue: 3, description: 'Grid columns', required: false },
      { name: 'variant', type: 'string', defaultValue: 'masonry', description: 'masonry, grid, or carousel', required: false },
    ],
    defaults: {
      layout: 'grid-3',
      spacing: 'py-20 px-6',
      background: 'bg-background',
      animation: 'stagger',
      contentDensity: 'minimal',
      visualComplexity: 'complex',
    },
    composability: {
      canFollow: ['hero-centered', 'hero-split', 'hero-fullscreen', 'content-narrative'],
      canPrecede: ['cta-banner', 'testimonial-carousel', 'content-narrative'],
      canCombineWith: ['lightbox', 'scroll-accumulation'],
      maxOccurrences: 2,
    },
    industryFit: { portfolio: 0.95, 'real-estate': 0.9, restaurant: 0.9, fitness: 0.85, ecommerce: 0.8, luxury: 0.9 },
    performanceTier: 'heavy',
  },
  {
    id: 'comparison-table',
    name: 'Comparison Table',
    category: 'content',
    narrativeRole: 'comparison',
    parameters: [
      { name: 'title', type: 'string', defaultValue: 'Compare Plans', description: 'Section title', required: true },
      { name: 'columns', type: 'array', defaultValue: [], description: 'Comparison columns', required: true },
      { name: 'rows', type: 'array', defaultValue: [], description: 'Comparison rows', required: true },
    ],
    defaults: {
      layout: 'table',
      spacing: 'py-20 px-6',
      background: 'bg-background',
      animation: 'fade-up',
      contentDensity: 'rich',
      visualComplexity: 'complex',
    },
    composability: {
      canFollow: ['feature-grid', 'pricing-table'],
      canPrecede: ['cta-banner', 'faq-accordion'],
      canCombineWith: [],
      maxOccurrences: 1,
    },
    industryFit: { saas: 0.9, fintech: 0.85, ecommerce: 0.8, education: 0.8 },
    performanceTier: 'standard',
  },

  // ─── Interactive Scenes ─────────────────────────────────────────────────
  {
    id: 'contact-form',
    name: 'Contact Form',
    category: 'interactive',
    narrativeRole: 'cta',
    parameters: [
      { name: 'title', type: 'string', defaultValue: 'Contact Us', description: 'Form title', required: true },
      { name: 'fields', type: 'array', defaultValue: [], description: 'Form fields', required: true },
      { name: 'variant', type: 'string', defaultValue: 'card', description: 'card, split, or inline', required: false },
    ],
    defaults: {
      layout: 'centered',
      spacing: 'py-20 px-6',
      background: 'bg-background',
      animation: 'fade-up',
      contentDensity: 'moderate',
      visualComplexity: 'simple',
    },
    composability: {
      canFollow: ['feature-grid', 'testimonial-carousel', 'faq-accordion', 'content-narrative'],
      canPrecede: ['footer'],
      canCombineWith: ['map-embed'],
      maxOccurrences: 1,
    },
    industryFit: { saas: 0.85, healthcare: 0.9, 'real-estate': 0.9, education: 0.85, fitness: 0.8, restaurant: 0.75 },
    performanceTier: 'light',
  },
  {
    id: 'team-grid',
    name: 'Team Grid',
    category: 'content',
    narrativeRole: 'trust',
    parameters: [
      { name: 'title', type: 'string', defaultValue: 'Our Team', description: 'Section title', required: true },
      { name: 'members', type: 'array', defaultValue: [], description: 'Team members', required: true },
      { name: 'variant', type: 'string', defaultValue: 'cards', description: 'cards, list, or minimal', required: false },
    ],
    defaults: {
      layout: 'grid-3',
      spacing: 'py-20 px-6',
      background: 'bg-background',
      animation: 'stagger',
      contentDensity: 'moderate',
      visualComplexity: 'moderate',
    },
    composability: {
      canFollow: ['content-narrative', 'feature-grid'],
      canPrecede: ['cta-banner', 'contact-form', 'faq-accordion'],
      canCombineWith: [],
      maxOccurrences: 1,
    },
    industryFit: { healthcare: 0.9, education: 0.85, 'real-estate': 0.8, saas: 0.7, nonprofit: 0.85 },
    performanceTier: 'standard',
  },
  {
    id: 'newsletter-signup',
    name: 'Newsletter Signup',
    category: 'conversion',
    narrativeRole: 'cta',
    parameters: [
      { name: 'title', type: 'string', defaultValue: 'Stay Updated', description: 'Section heading', required: true },
      { name: 'subtitle', type: 'string', defaultValue: 'Get the latest news and updates', description: 'Supporting text', required: false },
      { name: 'placeholder', type: 'string', defaultValue: 'Enter your email', description: 'Email input placeholder', required: false },
      { name: 'ctaText', type: 'string', defaultValue: 'Subscribe', description: 'Submit button text', required: false },
    ],
    defaults: {
      layout: 'centered-narrow',
      spacing: 'py-16 px-6',
      background: 'bg-muted/50',
      animation: 'fade-up',
      contentDensity: 'minimal',
      visualComplexity: 'simple',
    },
    composability: {
      canFollow: ['feature-grid', 'content-narrative', 'stats-row'],
      canPrecede: ['footer'],
      canCombineWith: [],
      maxOccurrences: 1,
    },
    industryFit: { saas: 0.9, ecommerce: 0.85, education: 0.9, 'media': 0.95, nonprofit: 0.95, portfolio: 0.7 },
    performanceTier: 'light',
  },
  {
    id: 'footer',
    name: 'Footer',
    category: 'layout',
    narrativeRole: 'reflection',
    parameters: [
      { name: 'links', type: 'array', defaultValue: [], description: 'Footer link groups', required: false },
      { name: 'copyright', type: 'string', defaultValue: '', description: 'Copyright text', required: false },
      { name: 'socialLinks', type: 'array', defaultValue: [], description: 'Social media links', required: false },
    ],
    defaults: {
      layout: 'grid-4',
      spacing: 'py-16 px-6',
      background: 'bg-muted/30',
      animation: 'none',
      contentDensity: 'minimal',
      visualComplexity: 'simple',
    },
    composability: {
      canFollow: ['cta-banner', 'faq-accordion', 'contact-form', 'team-grid'],
      canPrecede: [],
      canCombineWith: [],
      maxOccurrences: 1,
    },
    industryFit: { saas: 0.95, ecommerce: 0.95, healthcare: 0.9, education: 0.9, 'real-estate': 0.9, fitness: 0.9, restaurant: 0.9 },
    performanceTier: 'light',
  },
];

// ─── Scene Library API ──────────────────────────────────────────────────────

/**
 * Get all scene definitions.
 */
export function getAllScenes(): SceneDefinition[] {
  return SCENE_DEFINITIONS;
}

/**
 * Get a scene definition by ID.
 */
export function getScene(sceneId: string): SceneDefinition | undefined {
  return SCENE_DEFINITIONS.find(s => s.id === sceneId);
}

/**
 * Get scenes by category.
 */
export function getScenesByCategory(category: SceneCategory): SceneDefinition[] {
  return SCENE_DEFINITIONS.filter(s => s.category === category);
}

/**
 * Get scenes by narrative role.
 */
export function getScenesByRole(role: NarrativeRole): SceneDefinition[] {
  return SCENE_DEFINITIONS.filter(s => s.narrativeRole === role);
}

/**
 * Get scenes suitable for an industry.
 * Returns scenes sorted by industry fit score (highest first).
 */
export function getScenesForIndustry(industry: string, minFit: number = 0.5): SceneDefinition[] {
  return SCENE_DEFINITIONS
    .filter(s => {
      const fit = s.industryFit[industry] ?? 0;
      return fit >= minFit;
    })
    .sort((a, b) => (b.industryFit[industry] ?? 0) - (a.industryFit[industry] ?? 0));
}

/**
 * Get hero scenes for an industry.
 */
export function getHeroScenesForIndustry(industry: string): SceneDefinition[] {
  return getScenesForIndustry(industry).filter(s => s.category === 'hero');
}

/**
 * Check if two scenes can be placed adjacent to each other.
 */
export function canScenesCompose(sceneA: SceneDefinition, sceneB: SceneDefinition): boolean {
  return (
    sceneA.composability.canPrecede.includes(sceneB.id) ||
    sceneB.composability.canFollow.includes(sceneA.id)
  );
}

/**
 * Get compatible next scenes for a given scene.
 */
export function getCompatibleNextScenes(sceneId: string): SceneDefinition[] {
  const scene = getScene(sceneId);
  if (!scene) return [];
  return scene.composability.canPrecede
    .map(id => getScene(id))
    .filter((s): s is SceneDefinition => s !== undefined);
}

/**
 * Get compatible previous scenes for a given scene.
 */
export function getCompatiblePrevScenes(sceneId: string): SceneDefinition[] {
  const scene = getScene(sceneId);
  if (!scene) return [];
  return scene.composability.canFollow
    .map(id => getScene(id))
    .filter((s): s is SceneDefinition => s !== undefined);
}

/**
 * Build a complete scene sequence for a page given constraints.
 * Uses greedy composition: picks the best-fitting scene at each step.
 */
export function buildSceneSequence(opts: {
  industry: string;
  requiredRoles: NarrativeRole[];
  maxScenes?: number;
  excludeScenes?: string[];
}): SceneDefinition[] {
  const { industry, requiredRoles, maxScenes = 12, excludeScenes = [] } = opts;
  const sequence: SceneDefinition[] = [];
  const used = new Set<string>();

  // Always start with a hero
  const heroScenes = getHeroScenesForIndustry(industry);
  if (heroScenes.length > 0) {
    const hero = heroScenes[0];
    sequence.push(hero);
    used.add(hero.id);
  }

  // Add scenes for each required role
  for (const role of requiredRoles) {
    if (sequence.length >= maxScenes) break;

    const candidates = getScenesByRole(role)
      .filter(s => !used.has(s.id) && !excludeScenes.includes(s.id))
      .filter(s => {
        const fit = s.industryFit[industry] ?? 0;
        return fit >= 0.5;
      })
      .sort((a, b) => (b.industryFit[industry] ?? 0) - (a.industryFit[industry] ?? 0));

    if (candidates.length > 0) {
      const best = candidates[0];
      sequence.push(best);
      used.add(best.id);
    }
  }

  // Add footer if not already present and we have room
  if (!used.has('footer') && sequence.length < maxScenes) {
    const footer = getScene('footer');
    if (footer) sequence.push(footer);
  }

  // If we still have room, ensure footer is included by replacing last non-footer scene if needed
  if (!used.has('footer') && sequence.length >= maxScenes) {
    // Force include footer by trimming to make room
    sequence.pop();
    const footer = getScene('footer');
    if (footer) sequence.push(footer);
  }

  return sequence;
}
