// ─── Motion Capability Presets ──────────────────────────────────────────────
//
// All 14 composable capabilities, declared declaratively.
// Selection is deterministic (see registry.ts selectCapabilities) — these are
// NOT vertical templates. They compose to cover every business type.
// ─────────────────────────────────────────────────────────────────────────────

import type { MotionCapability } from './types.js';

export const CAPABILITIES: MotionCapability[] = [
  // ─── 1. GSAP Timelines ──────────────────────────────────────────────────
  {
    id: 'gsap-timeline',
    name: 'GSAP Timelines',
    category: 'library',
    description: 'Complex, orchestrated timeline animations with fine-grained control (scrub, pin, stagger).',
    dependencies: ['gsap'],
    compatibleWith: ['framer-motion', 'motion-values', 'premium-transitions', 'stop-scroll'],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'standard',
    signals: {
      levels: ['moderate', 'expressive'],
      styles: ['cinematic', 'luxury', 'editorial', 'storytelling', 'brutalist', 'futuristic'],
      pacing: ['slow', 'moderate', 'variable'],
    },
    fulfills: ['cinematic', 'transition', 'stagger', 'parallax', 'scroll', 'unveil', 'text-reveal'],
    budgetCategories: ['critical', 'important', 'standard'],
  },

  // ─── 2. Framer Motion ────────────────────────────────────────────────────
  {
    id: 'framer-motion',
    name: 'Framer Motion',
    category: 'library',
    description: 'Declarative React animation primitives (whileInView, AnimatePresence, layout).',
    dependencies: ['framer-motion'],
    compatibleWith: ['motion-values', 'hover-choreography', 'premium-transitions', 'physics-interactions'],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'light',
    signals: { levels: ['subtle', 'moderate', 'expressive'], styles: [], pacing: [] },
    fulfills: ['reveal', 'entrance', 'exit', 'hover', 'tap', 'stagger', 'transition', 'scale-in', 'rotate-in', 'blur-in', 'bounce-in'],
    budgetCategories: ['critical', 'important', 'standard', 'decorative'],
  },

  // ─── 3. Motion Values ────────────────────────────────────────────────────
  {
    id: 'motion-values',
    name: 'Motion Values',
    category: 'interaction',
    description: 'useMotionValue / useTransform for smooth, derived, scroll-linked values without re-renders.',
    dependencies: ['framer-motion'],
    compatibleWith: ['gsap-timeline', 'framer-motion', 'hover-choreography', 'parallax'],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'light',
    signals: { levels: ['moderate', 'expressive'], styles: [], pacing: ['moderate', 'fast', 'variable'] },
    fulfills: ['scroll', 'parallax', 'magnetic', 'marquee'],
    budgetCategories: ['standard', 'decorative'],
  },

  // ─── 4. Hover Choreography ───────────────────────────────────────────────
  {
    id: 'hover-choreography',
    name: 'Hover Choreography',
    category: 'interaction',
    description: 'Coordinated multi-element hover sequences (lift, glow, reveal, cursor-follow).',
    dependencies: ['framer-motion'],
    compatibleWith: ['framer-motion', 'motion-values', 'physics-interactions'],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: false,
    reducedMotionSafe: true,
    performanceTier: 'light',
    signals: {
      levels: ['moderate', 'expressive'],
      styles: ['premium', 'luxury', 'playful', 'futuristic', 'editorial'],
      pacing: ['moderate', 'fast'],
    },
    fulfills: ['hover', 'magnetic'],
    budgetCategories: ['decorative', 'standard'],
  },

  // ─── 5. Sound Design (Howler.js) ─────────────────────────────────────────
  {
    id: 'sound-design',
    name: 'Sound Design (Howler.js)',
    category: 'audio',
    description: 'Layered audio feedback and ambient soundscapes via Howler.js, muted by default and reduced-motion aware.',
    dependencies: ['howler'],
    compatibleWith: ['gsap-timeline', 'framer-motion', 'premium-transitions'],
    conflictsWith: [],
    ssrSafe: false,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'standard',
    signals: {
      levels: ['expressive'],
      styles: ['cinematic', 'luxury', 'playful', 'futuristic', 'brutalist'],
      conversionGoals: [],
    },
    fulfills: ['hover', 'tap', 'entrance'],
    budgetCategories: ['decorative'],
  },

  // ─── 6. Three.js / React Three Fiber ─────────────────────────────────────
  {
    id: 'three-r3f',
    name: 'Three.js / React Three Fiber',
    category: '3d',
    description: 'Real-time 3D scenes, product viewers, and immersive hero experiences.',
    dependencies: ['three', '@react-three/fiber', '@react-three/drei'],
    compatibleWith: ['gsap-timeline', 'motion-values', 'physics-interactions', 'stop-scroll'],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: false,
    reducedMotionSafe: true,
    performanceTier: 'cinematic',
    signals: {
      levels: ['expressive'],
      styles: ['cinematic', 'luxury', 'futuristic'],
      pacing: ['slow', 'moderate'],
      minPerformanceTier: 'heavy',
    },
    fulfills: ['camera-push', 'camera-orbit', 'depth-blur', 'particle', 'morph', 'parallax'],
    budgetCategories: ['3d', 'particle'],
  },

  // ─── 7. Interactive Configurators ────────────────────────────────────────
  {
    id: 'configurator',
    name: 'Interactive Configurators',
    category: 'commerce',
    description: 'State-driven product/option configurators that update visuals and price in real time.',
    dependencies: ['framer-motion'],
    compatibleWith: ['live-pricing', 'framer-motion', 'three-r3f'],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'standard',
    signals: {
      levels: ['moderate', 'expressive'],
      conversionGoals: ['purchase', 'demo', 'subscription', 'trial'],
      styles: [],
    },
    fulfills: ['transition', 'hover', 'entrance'],
    budgetCategories: ['important', 'standard'],
  },

  // ─── 8. Live Pricing ──────────────────────────────────────────────────────
  {
    id: 'live-pricing',
    name: 'Live Pricing',
    category: 'commerce',
    description: 'Reactive price calculation from configuration/quantity/plan selection.',
    dependencies: ['framer-motion'],
    compatibleWith: ['configurator', 'framer-motion'],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'light',
    signals: {
      levels: ['subtle', 'moderate', 'expressive'],
      conversionGoals: ['purchase', 'subscription', 'trial'],
      styles: [],
    },
    fulfills: ['countup', 'transition'],
    budgetCategories: ['important', 'standard'],
  },

  // ─── 9. Physics-based Interactions ───────────────────────────────────────
  {
    id: 'physics-interactions',
    name: 'Physics-based Interactions',
    category: 'interaction',
    description: 'Spring physics, drag, and momentum for tactile, natural-feeling UI.',
    dependencies: ['framer-motion'],
    compatibleWith: ['framer-motion', 'motion-values', 'hover-choreography'],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'standard',
    signals: {
      levels: ['moderate', 'expressive'],
      styles: ['playful', 'premium', 'futuristic'],
      pacing: ['fast', 'moderate'],
    },
    fulfills: ['bounce-in', 'hover', 'tap', 'magnetic'],
    budgetCategories: ['decorative', 'standard'],
  },

  // ─── 10. Premium Transitions ─────────────────────────────────────────────
  {
    id: 'premium-transitions',
    name: 'Premium Transitions',
    category: 'interaction',
    description: 'Page, route, and layout transitions with shared-element and crossfade choreography.',
    dependencies: ['framer-motion'],
    compatibleWith: ['framer-motion', 'gsap-timeline'],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'standard',
    signals: {
      levels: ['moderate', 'expressive'],
      styles: ['premium', 'luxury', 'cinematic', 'editorial'],
      pacing: ['slow', 'moderate'],
    },
    fulfills: ['transition', 'exit', 'entrance'],
    budgetCategories: ['important', 'standard'],
  },

  // ─── 11. Stop-scroll Moments ──────────────────────────────────────────────
  {
    id: 'stop-scroll',
    name: 'Stop-scroll Moments',
    category: 'interaction',
    description: 'Pinned sections that hold scroll to deliver a focused, deliberate beat (scroll-jacking done tastefully).',
    dependencies: ['framer-motion', 'gsap'],
    compatibleWith: ['gsap-timeline', 'three-r3f', 'motion-values'],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'standard',
    signals: {
      levels: ['moderate', 'expressive'],
      styles: ['cinematic', 'luxury', 'storytelling', 'editorial'],
      pacing: ['slow'],
    },
    fulfills: ['sticky', 'scroll'],
    budgetCategories: ['important', 'standard'],
  },

  // ─── 12. Mobile Performance ───────────────────────────────────────────────
  {
    id: 'mobile-performance',
    name: 'Mobile Performance',
    category: 'performance',
    description: 'Device-tier gating: drops heavy/3D/audio on thin budgets, caps simultaneous animations.',
    dependencies: [],
    compatibleWith: [],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'light',
    signals: { levels: [], styles: [], pacing: [], default: true },
    fulfills: ['none'],
    budgetCategories: ['critical', 'important', 'standard', 'decorative', '3d', 'particle'],
  },

  // ─── 13. Reduced Motion Accessibility ─────────────────────────────────────
  {
    id: 'reduced-motion',
    name: 'Reduced Motion Accessibility',
    category: 'accessibility',
    description: 'Respects prefers-reduced-motion: disables transforms, keeps content instantly visible.',
    dependencies: [],
    compatibleWith: [],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'light',
    signals: { levels: [], styles: [], pacing: [], default: true },
    fulfills: ['none'],
    budgetCategories: ['critical', 'important', 'standard', 'decorative', '3d', 'particle'],
  },

  // ─── 14. SSR-safe Animations ─────────────────────────────────────────────
  {
    id: 'ssr-safe',
    name: 'SSR-safe Animations',
    category: 'accessibility',
    description: 'All content visible in SSR HTML; animations attach only after hydration. No blank first paint.',
    dependencies: [],
    compatibleWith: [],
    conflictsWith: [],
    ssrSafe: true,
    mobileSafe: true,
    reducedMotionSafe: true,
    performanceTier: 'light',
    signals: { levels: [], styles: [], pacing: [], default: true },
    fulfills: ['none'],
    budgetCategories: ['critical', 'important', 'standard', 'decorative', '3d', 'particle'],
  },
];

/** Lookup map by id */
export const CAPABILITY_BY_ID: Record<string, MotionCapability> = Object.fromEntries(
  CAPABILITIES.map(c => [c.id, c])
);
