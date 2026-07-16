import { PrimitiveGraph, type PrimitiveEntry, type PrimitiveRelationship } from '../graph/primitive-graph.js';
import type { PrimitiveCategory } from './types.js';

// ─── Seed Primitives ─────────────────────────────────────────────
// 60+ universal experience primitives across 6 categories.
// These are the canonical vocabulary. Brands become evidence, not knowledge.

export const SEED_PRIMITIVES: Array<Omit<PrimitiveEntry, 'createdAt'>> = [
  // ── Aesthetic (15) ──
  { id: 'minimalism', name: 'Minimalism', category: 'aesthetic', description: 'Clean, reduced design with essential elements only' },
  { id: 'whitespace', name: 'Whitespace', category: 'aesthetic', description: 'Generous negative space for breathing room' },
  { id: 'bold-typography', name: 'Bold Typography', category: 'aesthetic', description: 'Large, impactful type as a design element' },
  { id: 'precision', name: 'Precision', category: 'aesthetic', description: 'Exact alignment, tight grids, mathematical spacing' },
  { id: 'gradient', name: 'Gradient', category: 'aesthetic', description: 'Color transitions for depth and visual interest' },
  { id: 'glassmorphism', name: 'Glassmorphism', category: 'aesthetic', description: 'Frosted glass effects with blur and transparency' },
  { id: 'dark-mode', name: 'Dark Mode', category: 'aesthetic', description: 'Dark backgrounds with light text' },
  { id: 'monochrome', name: 'Monochrome', category: 'aesthetic', description: 'Single color family for sophistication' },
  { id: 'duotone', name: 'Duotone', category: 'aesthetic', description: 'Two-color treatment for cohesive visual identity' },
  { id: 'editorial', name: 'Editorial', category: 'aesthetic', description: 'Magazine-style layouts with strong hierarchy' },
  { id: 'brutalist', name: 'Brutalist', category: 'aesthetic', description: 'Raw, unpolished, intentionally rough design' },
  { id: 'organic', name: 'Organic', category: 'aesthetic', description: 'Natural shapes, curves, flowing forms' },
  { id: 'geometric', name: 'Geometric', category: 'aesthetic', description: 'Sharp angles, circles, mathematical shapes' },
  { id: 'textured', name: 'Textured', category: 'aesthetic', description: 'Grain, noise, tactile surface quality' },
  { id: 'premium-product-reveal', name: 'Premium Product Reveal', category: 'aesthetic', description: 'Dramatic product showcase with cinematic lighting' },

  // ── Motion (10) ──
  { id: 'slow-cinematic', name: 'Slow Cinematic', category: 'motion', description: 'Deliberate, unhurried pacing like a film' },
  { id: 'parallax', name: 'Parallax', category: 'motion', description: 'Layered depth during scroll' },
  { id: 'micro-interaction', name: 'Micro-interaction', category: 'motion', description: 'Small, delightful responses to user actions' },
  { id: 'stagger', name: 'Stagger', category: 'motion', description: 'Sequential animation of grouped elements' },
  { id: 'scroll-trigger', name: 'Scroll Trigger', category: 'motion', description: 'Animations activated by scroll position' },
  { id: 'hover-reveal', name: 'Hover Reveal', category: 'motion', description: 'Content revealed on mouse hover' },
  { id: 'morphing', name: 'Morphing', category: 'motion', description: 'Smooth shape transitions between states' },
  { id: 'spring-physics', name: 'Spring Physics', category: 'motion', description: 'Natural, bouncy motion with overshoot' },
  { id: 'mechanical-motion', name: 'Mechanical Motion', category: 'motion', description: 'Precise, gear-like, engineered movement' },
  { id: 'glitch', name: 'Glitch', category: 'motion', description: 'Intentional digital distortion effects' },

  // ── Structure (10) ──
  { id: 'bento-grid', name: 'Bento Grid', category: 'structure', description: 'Apple-style asymmetric grid layout' },
  { id: 'card-based', name: 'Card-Based', category: 'structure', description: 'Content organized in discrete cards' },
  { id: 'single-page', name: 'Single Page', category: 'structure', description: 'One continuous scroll experience' },
  { id: 'multi-section', name: 'Multi-Section', category: 'structure', description: 'Distinct sections with clear boundaries' },
  { id: 'sidebar-navigation', name: 'Sidebar Navigation', category: 'structure', description: 'Persistent side navigation' },
  { id: 'hero-driven', name: 'Hero Driven', category: 'structure', description: 'Large hero section as primary visual' },
  { id: 'masonry', name: 'Masonry', category: 'structure', description: 'Pinterest-style staggered grid' },
  { id: 'split-screen', name: 'Split Screen', category: 'structure', description: 'Two-column opposing layout' },
  { id: 'full-bleed', name: 'Full Bleed', category: 'structure', description: 'Edge-to-edge content without margins' },
  { id: 'layered-depth', name: 'Layered Depth', category: 'structure', description: 'Stacked overlapping elements' },

  // ── Emotion (10) ──
  { id: 'luxury', name: 'Luxury', category: 'emotion', description: 'Premium, exclusive, high-end feeling' },
  { id: 'confidence', name: 'Confidence', category: 'emotion', description: 'Assured, authoritative presence' },
  { id: 'energy', name: 'Energy', category: 'emotion', description: 'Dynamic, exciting,活力充沛' },
  { id: 'warmth', name: 'Warmth', category: 'emotion', description: 'Inviting, cozy, approachable' },
  { id: 'trust', name: 'Trust', category: 'emotion', description: 'Reliable, professional, dependable' },
  { id: 'playfulness', name: 'Playfulness', category: 'emotion', description: 'Fun, lighthearted, whimsical' },
  { id: 'sophistication', name: 'Sophistication', category: 'emotion', description: 'Refined, cultured, elevated' },
  { id: 'innovation', name: 'Innovation', category: 'emotion', description: 'Forward-thinking, cutting-edge' },
  { id: 'nostalgia', name: 'Nostalgia', category: 'emotion', description: 'Warm回忆, retro comfort' },
  { id: 'power', name: 'Power', category: 'emotion', description: 'Strong, dominant, commanding' },

  // ── Interaction (8) ──
  { id: 'drag', name: 'Drag', category: 'interaction', description: 'Draggable interface elements' },
  { id: 'gesture', name: 'Gesture', category: 'interaction', description: 'Touch/swipe-based navigation' },
  { id: 'voice', name: 'Voice', category: 'interaction', description: 'Voice-controlled interface' },
  { id: 'progressive-disclosure', name: 'Progressive Disclosure', category: 'interaction', description: 'Information revealed incrementally' },
  { id: 'coaching', name: 'Coaching', category: 'interaction', description: 'Guided onboarding and tooltips' },
  { id: 'keyboard-shortcuts', name: 'Keyboard Shortcuts', category: 'interaction', description: 'Power-user keyboard navigation' },
  { id: 'real-time', name: 'Real Time', category: 'interaction', description: 'Live updates without refresh' },
  { id: 'collaborative', name: 'Collaborative', category: 'interaction', description: 'Multi-user real-time interaction' },

  // ── Industry (12) ──
  { id: 'coffee-craft', name: 'Coffee Craft', category: 'industry', description: 'Artisanal coffee culture warmth and ritual' },
  { id: 'mechanical-assembly', name: 'Mechanical Assembly', category: 'industry', description: 'Engineering, gears, precision machinery' },
  { id: 'precision-engineering', name: 'Precision Engineering', category: 'industry', description: 'Exact tolerances, high-tech manufacturing' },
  { id: 'couture-fashion', name: 'Couture Fashion', category: 'industry', description: 'High fashion, runway, editorial style' },
  { id: 'organic-farm', name: 'Organic Farm', category: 'industry', description: 'Farm-to-table, natural, sustainable' },
  { id: 'fintech-trust', name: 'Fintech Trust', category: 'industry', description: 'Financial security, reliability, compliance' },
  { id: 'biotech-innovation', name: 'Biotech Innovation', category: 'industry', description: 'Scientific research, breakthrough technology' },
  { id: 'gaming-immersion', name: 'Gaming Immersion', category: 'industry', description: 'Deep engagement, worlds, adventure' },
  { id: 'fitness-achievement', name: 'Fitness Achievement', category: 'industry', description: 'Progress tracking, competition, energy' },
  { id: 'luxury-timepiece', name: 'Luxury Timepiece', category: 'industry', description: 'Heritage, craftsmanship, timelessness' },
  { id: 'automotive-precision', name: 'Automotive Precision', category: 'industry', description: 'Speed, engineering excellence, design' },
  { id: 'architecture-space', name: 'Architecture Space', category: 'industry', description: 'Structural beauty, spatial awareness' },
];

// ─── Seed Relationships ─────────────────────────────────────────
// 40+ typed relationships between primitives.

export const SEED_RELATIONSHIPS: PrimitiveRelationship[] = [
  // Aesthetic → Aesthetic
  { source: 'minimalism', target: 'whitespace', type: 'implies', weight: 0.9 },
  { source: 'minimalism', target: 'precision', type: 'implies', weight: 0.7 },
  { source: 'bold-typography', target: 'minimalism', type: 'conflicts', weight: 0.6 },
  { source: 'editorial', target: 'bold-typography', type: 'implies', weight: 0.8 },
  { source: 'glassmorphism', target: 'gradient', type: 'requires', weight: 0.9 },
  { source: 'dark-mode', target: 'monochrome', type: 'strengthens', weight: 0.7 },
  { source: 'organic', target: 'whitespace', type: 'strengthens', weight: 0.6 },
  { source: 'geometric', target: 'precision', type: 'implies', weight: 0.85 },
  { source: 'premium-product-reveal', target: 'slow-cinematic', type: 'requires', weight: 0.9 },
  { source: 'premium-product-reveal', target: 'precision', type: 'requires', weight: 0.8 },
  { source: 'premium-product-reveal', target: 'whitespace', type: 'implies', weight: 0.7 },
  { source: 'brutalist', target: 'minimalism', type: 'conflicts', weight: 0.5 },
  { source: 'textured', target: 'organic', type: 'strengthens', weight: 0.6 },

  // Motion → Motion
  { source: 'parallax', target: 'scroll-trigger', type: 'requires', weight: 0.95 },
  { source: 'hover-reveal', target: 'micro-interaction', type: 'belongs_to', weight: 0.8 },
  { source: 'stagger', target: 'scroll-trigger', type: 'strengthens', weight: 0.7 },
  { source: 'mechanical-motion', target: 'precision', type: 'requires', weight: 0.85 },
  { source: 'slow-cinematic', target: 'spring-physics', type: 'conflicts', weight: 0.6 },
  { source: 'morphing', target: 'micro-interaction', type: 'composes', weight: 0.7 },

  // Structure → Structure
  { source: 'bento-grid', target: 'card-based', type: 'implies', weight: 0.7 },
  { source: 'single-page', target: 'scroll-trigger', type: 'requires', weight: 0.8 },
  { source: 'hero-driven', target: 'full-bleed', type: 'strengthens', weight: 0.75 },
  { source: 'masonry', target: 'card-based', type: 'requires', weight: 0.9 },
  { source: 'layered-depth', target: 'parallax', type: 'requires', weight: 0.8 },

  // Emotion → Emotion
  { source: 'luxury', target: 'sophistication', type: 'implies', weight: 0.9 },
  { source: 'luxury', target: 'whitespace', type: 'requires', weight: 0.7 },
  { source: 'confidence', target: 'precision', type: 'strengthens', weight: 0.8 },
  { source: 'innovation', target: 'power', type: 'strengthens', weight: 0.6 },
  { source: 'warmth', target: 'playfulness', type: 'strengthens', weight: 0.5 },
  { source: 'energy', target: 'playfulness', type: 'implies', weight: 0.6 },
  { source: 'nostalgia', target: 'warmth', type: 'implies', weight: 0.7 },

  // Industry → Primitives
  { source: 'coffee-craft', target: 'warmth', type: 'implies', weight: 0.9 },
  { source: 'coffee-craft', target: 'organic', type: 'implies', weight: 0.8 },
  { source: 'coffee-craft', target: 'textured', type: 'strengthens', weight: 0.7 },
  { source: 'mechanical-assembly', target: 'mechanical-motion', type: 'implies', weight: 0.95 },
  { source: 'mechanical-assembly', target: 'precision', type: 'implies', weight: 0.9 },
  { source: 'mechanical-assembly', target: 'power', type: 'strengthens', weight: 0.8 },
  { source: 'precision-engineering', target: 'precision', type: 'implies', weight: 0.95 },
  { source: 'couture-fashion', target: 'editorial', type: 'implies', weight: 0.85 },
  { source: 'couture-fashion', target: 'sophistication', type: 'implies', weight: 0.9 },
  { source: 'luxury-timepiece', target: 'luxury', type: 'implies', weight: 0.95 },
  { source: 'luxury-timepiece', target: 'precision', type: 'implies', weight: 0.9 },
  { source: 'luxury-timepiece', target: 'heritage', type: 'strengthens', weight: 0.8 },
  { source: 'gaming-immersion', target: 'energy', type: 'implies', weight: 0.85 },
  { source: 'gaming-immersion', target: 'layered-depth', type: 'requires', weight: 0.7 },
  { source: 'fitness-achievement', target: 'energy', type: 'implies', weight: 0.9 },
  { source: 'fitness-achievement', target: 'confidence', type: 'strengthens', weight: 0.8 },
  { source: 'fintech-trust', target: 'trust', type: 'implies', weight: 0.95 },
  { source: 'fintech-trust', target: 'precision', type: 'requires', weight: 0.8 },
  { source: 'biotech-innovation', target: 'innovation', type: 'implies', weight: 0.9 },
  { source: 'automotive-precision', target: 'precision', type: 'implies', weight: 0.9 },
  { source: 'automotive-precision', target: 'mechanical-motion', type: 'implies', weight: 0.85 },
  { source: 'architecture-space', target: 'geometric', type: 'implies', weight: 0.8 },
  { source: 'architecture-space', target: 'whitespace', type: 'implies', weight: 0.75 },
];

// ─── Entity → Primitive Mappings ────────────────────────────────
// 40+ known entities (brands, concepts, styles) → canonical primitives.
// Apple disappears after normalization. The primitives remain.

export const ENTITY_TO_PRIMITIVES: Record<string, string[]> = {
  // ── Tech Brands ──
  'Apple': ['minimalism', 'whitespace', 'precision', 'premium-product-reveal', 'slow-cinematic', 'bento-grid'],
  'Nike': ['bold-typography', 'energy', 'confidence', 'parallax', 'hero-driven'],
  'Tesla': ['precision', 'innovation', 'dark-mode', 'mechanical-motion', 'minimalism'],
  'Netflix': ['dark-mode', 'cinematic', 'single-page', 'personalization', 'scroll-trigger'],
  'Google': ['minimalism', 'whitespace', 'bold-typography', 'clean-ux'],
  'Microsoft': ['geometric', 'precision', 'trust', 'card-based', 'clean-ux'],
  'Amazon': ['efficiency', 'card-based', 'trust', 'real-time', 'search-first'],
  'Spotify': ['gradient', 'energy', 'bold-typography', 'dark-mode', 'stagger'],
  'Airbnb': ['warmth', 'organic', 'photography-first', 'trust', 'card-based'],
  'Stripe': ['minimalism', 'gradient', 'precision', 'developer-focused', 'trust'],

  // ── Entertainment / Pop Culture ──
  'Iron Man': ['mechanical-assembly', 'engineering', 'innovation', 'power', 'mechanical-motion', 'dark-mode'],
  'Gundam': ['mechanical-assembly', 'engineering', 'precision', 'power', 'mechanical-motion'],
  'Transformers': ['mechanical-assembly', 'morphing', 'power', 'engineering', 'innovation'],
  'Batman': ['dark-mode', 'power', 'mystery', 'gothic', 'night-city'],
  'Spider-Man': ['energy', 'playfulness', 'urban', 'dynamic-motion', 'web-interaction'],

  // ── Fashion / Luxury ──
  'Chanel': ['luxury', 'monochrome', 'editorial', 'sophistication', 'couture-fashion'],
  'Louis Vuitton': ['luxury', 'heritage', 'textured', 'editorial', 'sophistication'],
  'Rolex': ['luxury-timepiece', 'precision', 'confidence', 'heritage', 'luxury'],
  'Gucci': ['bold-typography', 'playfulness', 'sophistication', 'editorial', 'duotone'],

  // ── Industries ──
  'Coffee': ['warmth', 'organic', 'coffee-craft', 'textured', 'nostalgia'],
  'Gym': ['energy', 'power', 'confidence', 'fitness-achievement', 'bold-typography'],
  'Restaurant': ['warmth', 'editorial', 'photography-first', 'reservation', 'trust'],
  'Hospital': ['trust', 'clean-ux', 'warmth', 'efficiency', 'minimalism'],
  'School': ['playfulness', 'warmth', 'energy', 'education', 'progressive-disclosure'],
  'Bank': ['trust', 'precision', 'confidence', 'fintech-trust', 'minimalism'],
  'Startup': ['innovation', 'energy', 'bold-typography', 'gradient', 'single-page'],
  'Agency': ['editorial', 'portfolio', 'creativity', 'bold-typography', 'masonry'],
  'Ecommerce': ['card-based', 'trust', 'search-first', 'real-time', 'efficiency'],
  'SaaS': ['minimalism', 'clean-ux', 'efficiency', 'onboarding', 'trust'],
  'Real Estate': ['photography-first', 'card-based', 'trust', 'search-first', 'hero-driven'],
  'Luxury Watch': ['luxury-timepiece', 'heritage', 'precision', 'editorial', 'slow-cinematic'],
  'Perfume': ['editorial', 'luxury', 'sensory', 'slow-cinematic', 'textured'],
  'Sports': ['energy', 'dynamic-motion', 'bold-typography', 'real-time', 'confidence'],
  'Music': ['energy', 'dark-mode', 'gradient', 'stagger', 'waveform'],

  // ── Concepts / Styles ──
  'minimalism': ['minimalism', 'whitespace', 'precision'],
  'luxury': ['luxury', 'sophistication', 'precision', 'whitespace'],
  'bold': ['bold-typography', 'energy', 'confidence'],
  'retro': ['nostalgia', 'textured', 'warmth', 'duotone'],
  'futuristic': ['innovation', 'dark-mode', 'glitch', 'mechanical-motion'],
  'organic': ['organic', 'warmth', 'textured', 'whitespace'],
  'corporate': ['trust', 'precision', 'clean-ux', 'geometric'],
  'playful': ['playfulness', 'energy', 'spring-physics', 'duotone'],
};

// ─── Builder ────────────────────────────────────────────────────

export function buildPrimitiveGraph(): PrimitiveGraph {
  const graph = new PrimitiveGraph();
  for (const p of SEED_PRIMITIVES) {
    graph.addPrimitive(p);
  }
  for (const r of SEED_RELATIONSHIPS) {
    graph.addRelationship(r);
  }
  return graph;
}
