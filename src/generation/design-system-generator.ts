import { ArchitectDecision } from './architect.js';
import { DomainContext } from './domain-detector.js';
import { DesignDNA } from './design-dna.js';

export interface DesignSystem {
  typography: TypographySystem;
  colors: ColorSystem;
  spacing: SpacingSystem;
  layout: LayoutSystem;
  motion: MotionSystem;
  shadows: ShadowSystem;
  borders: BorderSystem;
  breakpoints: BreakpointSystem;
}

export interface TypographySystem {
  fontFamily: { heading: string; body: string; mono: string };
  scale: Record<string, { size: string; lineHeight: string; weight: string; letterSpacing: string }>;
  googleFontsUrl: string;
}

export interface ColorSystem {
  primary: ColorShades;
  secondary: ColorShades;
  accent: ColorShades;
  neutral: ColorShades;
  success: ColorShades;
  warning: ColorShades;
  error: ColorShades;
  surface: { bg: string; card: string; elevated: string; overlay: string };
  text: { heading: string; body: string; muted: string; inverse: string };
  border: { default: string; strong: string; subtle: string };
  cssVariables: Record<string, string>;
}

export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface SpacingSystem {
  scale: Record<string, string>;
  sectionPadding: string;
  containerMaxWidth: string;
  gridGap: string;
  cardPadding: string;
}

export interface LayoutSystem {
  containerClass: string;
  sectionClass: string;
  gridClass: string;
  cardGridClass: string;
  heroLayout: 'centered' | 'split' | 'left' | 'full-width';
  maxContentWidth: string;
}

export interface MotionSystem {
  transitionDuration: string;
  transitionEasing: string;
  hoverScale: string;
  fadeInClass: string;
  slideUpClass: string;
  staggerDelay: string;
}

export interface ShadowSystem {
  card: string;
  elevated: string;
  glow: string;
  input: string;
}

export interface BorderSystem {
  card: string;
  input: string;
  button: string;
  radius: { sm: string; md: string; lg: string; xl: string; full: string };
}

export interface BreakpointSystem {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

// ─── Typography Presets ───────────────────────────────────────────

const TYPOGRAPHY_PRESETS: Record<string, TypographySystem['fontFamily'] & { scale: TypographySystem['scale'] }> = {
  premium: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
    scale: {
      'display': { size: '4.5rem', lineHeight: '1', weight: '800', letterSpacing: '-0.04em' },
      'h1': { size: '3.5rem', lineHeight: '1.1', weight: '800', letterSpacing: '-0.03em' },
      'h2': { size: '2.5rem', lineHeight: '1.2', weight: '700', letterSpacing: '-0.02em' },
      'h3': { size: '1.875rem', lineHeight: '1.3', weight: '700', letterSpacing: '-0.01em' },
      'h4': { size: '1.5rem', lineHeight: '1.4', weight: '600', letterSpacing: '0' },
      'body-lg': { size: '1.125rem', lineHeight: '1.7', weight: '400', letterSpacing: '0' },
      'body': { size: '1rem', lineHeight: '1.6', weight: '400', letterSpacing: '0' },
      'body-sm': { size: '0.875rem', lineHeight: '1.5', weight: '400', letterSpacing: '0' },
      'caption': { size: '0.75rem', lineHeight: '1.4', weight: '500', letterSpacing: '0.02em' },
      'overline': { size: '0.75rem', lineHeight: '1.4', weight: '700', letterSpacing: '0.08em' },
    },
  },
  editorial: {
    heading: 'Georgia, "Times New Roman", serif',
    body: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
    scale: {
      'display': { size: '5rem', lineHeight: '0.95', weight: '700', letterSpacing: '-0.03em' },
      'h1': { size: '3.75rem', lineHeight: '1.05', weight: '700', letterSpacing: '-0.02em' },
      'h2': { size: '2.75rem', lineHeight: '1.15', weight: '600', letterSpacing: '-0.01em' },
      'h3': { size: '2rem', lineHeight: '1.25', weight: '600', letterSpacing: '0' },
      'h4': { size: '1.5rem', lineHeight: '1.35', weight: '600', letterSpacing: '0' },
      'body-lg': { size: '1.125rem', lineHeight: '1.8', weight: '400', letterSpacing: '0' },
      'body': { size: '1rem', lineHeight: '1.7', weight: '400', letterSpacing: '0' },
      'body-sm': { size: '0.875rem', lineHeight: '1.6', weight: '400', letterSpacing: '0' },
      'caption': { size: '0.75rem', lineHeight: '1.5', weight: '500', letterSpacing: '0.01em' },
      'overline': { size: '0.6875rem', lineHeight: '1.4', weight: '700', letterSpacing: '0.1em' },
    },
  },
  modern: {
    heading: 'Plus Jakarta Sans, system-ui, sans-serif',
    body: 'Plus Jakarta Sans, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
    scale: {
      'display': { size: '4rem', lineHeight: '1', weight: '800', letterSpacing: '-0.03em' },
      'h1': { size: '3.25rem', lineHeight: '1.1', weight: '800', letterSpacing: '-0.025em' },
      'h2': { size: '2.25rem', lineHeight: '1.2', weight: '700', letterSpacing: '-0.02em' },
      'h3': { size: '1.75rem', lineHeight: '1.3', weight: '700', letterSpacing: '-0.01em' },
      'h4': { size: '1.375rem', lineHeight: '1.4', weight: '600', letterSpacing: '0' },
      'body-lg': { size: '1.0625rem', lineHeight: '1.7', weight: '400', letterSpacing: '0' },
      'body': { size: '0.9375rem', lineHeight: '1.6', weight: '400', letterSpacing: '0' },
      'body-sm': { size: '0.8125rem', lineHeight: '1.5', weight: '400', letterSpacing: '0' },
      'caption': { size: '0.6875rem', lineHeight: '1.4', weight: '600', letterSpacing: '0.03em' },
      'overline': { size: '0.6875rem', lineHeight: '1.4', weight: '700', letterSpacing: '0.1em' },
    },
  },
  minimal: {
    heading: 'system-ui, -apple-system, sans-serif',
    body: 'system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, monospace',
    scale: {
      'display': { size: '3.5rem', lineHeight: '1.05', weight: '700', letterSpacing: '-0.02em' },
      'h1': { size: '3rem', lineHeight: '1.1', weight: '700', letterSpacing: '-0.02em' },
      'h2': { size: '2.25rem', lineHeight: '1.2', weight: '600', letterSpacing: '-0.01em' },
      'h3': { size: '1.75rem', lineHeight: '1.3', weight: '600', letterSpacing: '0' },
      'h4': { size: '1.375rem', lineHeight: '1.4', weight: '500', letterSpacing: '0' },
      'body-lg': { size: '1.0625rem', lineHeight: '1.7', weight: '400', letterSpacing: '0' },
      'body': { size: '1rem', lineHeight: '1.6', weight: '400', letterSpacing: '0' },
      'body-sm': { size: '0.875rem', lineHeight: '1.5', weight: '400', letterSpacing: '0' },
      'caption': { size: '0.75rem', lineHeight: '1.4', weight: '500', letterSpacing: '0.01em' },
      'overline': { size: '0.6875rem', lineHeight: '1.4', weight: '600', letterSpacing: '0.08em' },
    },
  },
  bold: {
    heading: 'Space Grotesk, system-ui, sans-serif',
    body: 'DM Sans, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
    scale: {
      'display': { size: '5rem', lineHeight: '0.95', weight: '800', letterSpacing: '-0.04em' },
      'h1': { size: '4rem', lineHeight: '1', weight: '800', letterSpacing: '-0.035em' },
      'h2': { size: '3rem', lineHeight: '1.1', weight: '700', letterSpacing: '-0.02em' },
      'h3': { size: '2.25rem', lineHeight: '1.2', weight: '700', letterSpacing: '-0.01em' },
      'h4': { size: '1.75rem', lineHeight: '1.3', weight: '600', letterSpacing: '0' },
      'body-lg': { size: '1.125rem', lineHeight: '1.7', weight: '400', letterSpacing: '0' },
      'body': { size: '1rem', lineHeight: '1.6', weight: '400', letterSpacing: '0' },
      'body-sm': { size: '0.875rem', lineHeight: '1.5', weight: '400', letterSpacing: '0' },
      'caption': { size: '0.75rem', lineHeight: '1.4', weight: '600', letterSpacing: '0.02em' },
      'overline': { size: '0.75rem', lineHeight: '1.4', weight: '800', letterSpacing: '0.12em' },
    },
  },
};

// ─── Color Palette Presets (oklch-inspired Tailwind palettes) ─────

const COLOR_PALETTES: Record<string, { primary: string; secondary: string; accent: string }> = {
  violet: { primary: 'violet', secondary: 'fuchsia', accent: 'purple' },
  indigo: { primary: 'indigo', secondary: 'blue', accent: 'violet' },
  emerald: { primary: 'emerald', secondary: 'teal', accent: 'green' },
  amber: { primary: 'amber', secondary: 'orange', accent: 'yellow' },
  rose: { primary: 'rose', secondary: 'pink', accent: 'red' },
  cyan: { primary: 'cyan', secondary: 'sky', accent: 'teal' },
  sky: { primary: 'sky', secondary: 'cyan', accent: 'blue' },
  slate: { primary: 'slate', secondary: 'gray', accent: 'zinc' },
  red: { primary: 'red', secondary: 'orange', accent: 'rose' },
};

// ─── Mood → Typography mapping ───────────────────────────────────

const MOODTypography: Record<string, string> = {
  premium: 'premium',
  luxury: 'premium',
  vibrant: 'modern',
  tech: 'modern',
  minimal: 'minimal',
  clean: 'minimal',
  calming: 'minimal',
  energetic: 'bold',
  bold: 'bold',
  creative: 'modern',
  trustworthy: 'premium',
  editorial: 'editorial',
  warm: 'premium',
  professional: 'premium',
  productive: 'modern',
  authoritative: 'minimal',
  community: 'modern',
  eco: 'minimal',
};

// ─── Mood → Motion mapping ────────────────────────────────────────

const MOOD_MOTION: Record<string, MotionSystem> = {
  premium: { transitionDuration: '300ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.02', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-4', staggerDelay: '75ms' },
  luxury: { transitionDuration: '400ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.01', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-6', staggerDelay: '100ms' },
  vibrant: { transitionDuration: '200ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.05', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-3', staggerDelay: '50ms' },
  tech: { transitionDuration: '150ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.03', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-2', staggerDelay: '40ms' },
  minimal: { transitionDuration: '200ms', transitionEasing: 'ease-out', hoverScale: '1.01', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-2', staggerDelay: '60ms' },
  calming: { transitionDuration: '350ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.01', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-4', staggerDelay: '80ms' },
  energetic: { transitionDuration: '150ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.06', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-2', staggerDelay: '30ms' },
  bold: { transitionDuration: '200ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.04', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-3', staggerDelay: '50ms' },
  creative: { transitionDuration: '250ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.03', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-4', staggerDelay: '60ms' },
  trustworthy: { transitionDuration: '300ms', transitionEasing: 'ease-out', hoverScale: '1.02', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-3', staggerDelay: '70ms' },
  editorial: { transitionDuration: '350ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.01', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-6', staggerDelay: '90ms' },
  warm: { transitionDuration: '300ms', transitionEasing: 'ease-out', hoverScale: '1.02', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-4', staggerDelay: '75ms' },
  professional: { transitionDuration: '250ms', transitionEasing: 'ease-out', hoverScale: '1.02', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-3', staggerDelay: '60ms' },
  productive: { transitionDuration: '150ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.03', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-2', staggerDelay: '40ms' },
  authoritative: { transitionDuration: '300ms', transitionEasing: 'ease-out', hoverScale: '1.01', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-4', staggerDelay: '80ms' },
  community: { transitionDuration: '200ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.03', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-3', staggerDelay: '50ms' },
  eco: { transitionDuration: '350ms', transitionEasing: 'ease-out', hoverScale: '1.01', fadeInClass: 'animate-in fade-in', slideUpClass: 'animate-in slide-in-from-bottom-4', staggerDelay: '80ms' },
};

// ─── Layout presets by business type ──────────────────────────────

const LAYOUT_PRESETS: Record<string, LayoutSystem> = {
  ecommerce: { containerClass: 'max-w-7xl mx-auto px-4 sm:px-6', sectionClass: 'py-16 sm:py-20 px-4 sm:px-6', gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6', cardGridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5', heroLayout: 'centered', maxContentWidth: 'max-w-7xl' },
  saas: { containerClass: 'max-w-6xl mx-auto px-4 sm:px-6', sectionClass: 'py-16 sm:py-24 px-4 sm:px-6', gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8', cardGridClass: 'grid grid-cols-1 md:grid-cols-3 gap-6', heroLayout: 'centered', maxContentWidth: 'max-w-6xl' },
  'local-business': { containerClass: 'max-w-6xl mx-auto px-4 sm:px-6', sectionClass: 'py-14 sm:py-20 px-4 sm:px-6', gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6', cardGridClass: 'grid grid-cols-1 sm:grid-cols-2 gap-5', heroLayout: 'split', maxContentWidth: 'max-w-6xl' },
  restaurant: { containerClass: 'max-w-6xl mx-auto px-4 sm:px-6', sectionClass: 'py-14 sm:py-20 px-4 sm:px-6', gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6', cardGridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5', heroLayout: 'full-width', maxContentWidth: 'max-w-6xl' },
  portfolio: { containerClass: 'max-w-5xl mx-auto px-4 sm:px-6', sectionClass: 'py-16 sm:py-24 px-4 sm:px-6', gridClass: 'grid grid-cols-1 sm:grid-cols-2 gap-8', cardGridClass: 'grid grid-cols-1 sm:grid-cols-2 gap-6', heroLayout: 'left', maxContentWidth: 'max-w-5xl' },
  blog: { containerClass: 'max-w-4xl mx-auto px-4 sm:px-6', sectionClass: 'py-14 sm:py-20 px-4 sm:px-6', gridClass: 'grid grid-cols-1 gap-8', cardGridClass: 'grid grid-cols-1 sm:grid-cols-2 gap-6', heroLayout: 'centered', maxContentWidth: 'max-w-4xl' },
  fitness: { containerClass: 'max-w-7xl mx-auto px-4 sm:px-6', sectionClass: 'py-16 sm:py-20 px-4 sm:px-6', gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6', cardGridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5', heroLayout: 'full-width', maxContentWidth: 'max-w-7xl' },
  healthcare: { containerClass: 'max-w-6xl mx-auto px-4 sm:px-6', sectionClass: 'py-14 sm:py-20 px-4 sm:px-6', gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6', cardGridClass: 'grid grid-cols-1 sm:grid-cols-2 gap-5', heroLayout: 'centered', maxContentWidth: 'max-w-6xl' },
  education: { containerClass: 'max-w-6xl mx-auto px-4 sm:px-6', sectionClass: 'py-16 sm:py-24 px-4 sm:px-6', gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8', cardGridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6', heroLayout: 'centered', maxContentWidth: 'max-w-6xl' },
  marketplace: { containerClass: 'max-w-7xl mx-auto px-4 sm:px-6', sectionClass: 'py-16 sm:py-20 px-4 sm:px-6', gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6', cardGridClass: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4', heroLayout: 'centered', maxContentWidth: 'max-w-7xl' },
  agency: { containerClass: 'max-w-6xl mx-auto px-4 sm:px-6', sectionClass: 'py-16 sm:py-24 px-4 sm:px-6', gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8', cardGridClass: 'grid grid-cols-1 sm:grid-cols-2 gap-6', heroLayout: 'split', maxContentWidth: 'max-w-6xl' },
};

// ─── Generator ────────────────────────────────────────────────────

export function generateDesignSystem(
  decision: ArchitectDecision,
  domain?: DomainContext,
  designDNA?: DesignDNA,
): DesignSystem {
  const mood = designDNA?.brandPersonality || decision.colorScheme.mood || 'premium';
  const businessType = decision.businessType || 'saas';

  // Use DesignDNA typography if available, otherwise fall back to presets
  const typographyPreset = MOODTypography[mood] || 'premium';
  const fontConfig = TYPOGRAPHY_PRESETS[typographyPreset] || TYPOGRAPHY_PRESETS.premium;

  const colorNames = COLOR_PALETTES[decision.colorScheme.primary] || COLOR_PALETTES.violet;
  const defaultLayout: LayoutSystem = { containerClass: 'max-w-7xl mx-auto px-6', sectionClass: 'py-20', gridClass: 'grid grid-cols-1 md:grid-cols-3 gap-8', cardGridClass: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', heroLayout: 'centered', maxContentWidth: 'max-w-7xl' };
  const defaultMotion: MotionSystem = { transitionDuration: '300ms', transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverScale: '1.02', fadeInClass: 'animate-fade-in', slideUpClass: 'animate-slide-up', staggerDelay: '100ms' };
  const layout = LAYOUT_PRESETS[businessType] || LAYOUT_PRESETS.saas || defaultLayout;
  const motion = MOOD_MOTION[mood] || MOOD_MOTION.premium || defaultMotion;

  // Override with DesignDNA values when available
  const typography: TypographySystem = {
    fontFamily: {
      heading: designDNA?.typography.heading || fontConfig?.heading || 'Inter',
      body: designDNA?.typography.body || fontConfig?.body || 'Inter',
      mono: designDNA?.typography.mono || fontConfig?.mono || 'Fira Code',
    },
    scale: fontConfig?.scale || (TYPOGRAPHY_PRESETS.premium as NonNullable<typeof TYPOGRAPHY_PRESETS['premium']>).scale,
    googleFontsUrl: designDNA?.typography.googleFontsUrl || buildGoogleFontsUrl(fontConfig?.heading || 'Inter', fontConfig?.body || 'Inter'),
  };

  const colors = buildColorSystem(colorNames?.primary || '#7c3aed', colorNames?.secondary || '#2563eb', colorNames?.accent || '#06b6d4', mood);

  // Override spacing with DesignDNA values
  const spacing = designDNA ? {
    scale: designDNA.spacing.scale,
    sectionPadding: designDNA.spacing.section.sm || 'py-16 sm:py-20',
    containerMaxWidth: designDNA.spacing.container.maxWidth || 'max-w-7xl',
    gridGap: designDNA.spacing.grid.gap || 'gap-6',
    cardPadding: designDNA.spacing.card.padding || 'p-6',
  } : buildSpacingSystem(mood);

  // Override shadows with DesignDNA values
  const shadows = designDNA ? {
    card: designDNA.shadows.card,
    elevated: designDNA.shadows.lg,
    glow: designDNA.shadows.glow,
    input: designDNA.shadows.input,
  } : buildShadowSystem(mood);

  // Override borders with DesignDNA radius
  const borders = designDNA ? {
    card: designDNA.cards.border,
    input: 'border border-border',
    button: 'border',
    radius: { sm: designDNA.radius.sm, md: designDNA.radius.md, lg: designDNA.radius.lg, xl: designDNA.radius.xl, full: designDNA.radius.full },
  } : buildBorderSystem(mood);

  const breakpoints: BreakpointSystem = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  };

  return {
    typography,
    colors,
    spacing,
    layout,
    motion,
    shadows,
    borders,
    breakpoints,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

function buildGoogleFontsUrl(heading: string, body: string): string {
  const fonts = new Set<string>();
  const extractFont = (family: string) => {
    const name = family.split(',')[0]?.trim().replace(/"/g, '');
    if (name && name !== 'system-ui' && name !== 'sans-serif' && name !== 'serif' && name !== 'monospace') {
      fonts.add(name.replace(/\s+/g, '+'));
    }
  };
  extractFont(heading);
  extractFont(body);
  if (fonts.size === 0) return '';
  return `https://fonts.googleapis.com/css2?${[...fonts].map(f => `family=${f}:wght@400;500;600;700;800`).join('&')}&display=swap`;
}

function buildColorSystem(primary: string, secondary: string, accent: string, _mood: string): ColorSystem {
  const primaryShades: ColorShades = {
    50: `${primary}-50`, 100: `${primary}-100`, 200: `${primary}-200`, 300: `${primary}-300`,
    400: `${primary}-400`, 500: `${primary}-500`, 600: `${primary}-600`, 700: `${primary}-700`,
    800: `${primary}-800`, 900: `${primary}-900`, 950: `${primary}-950`,
  };
  const secondaryShades: ColorShades = {
    50: `${secondary}-50`, 100: `${secondary}-100`, 200: `${secondary}-200`, 300: `${secondary}-300`,
    400: `${secondary}-400`, 500: `${secondary}-500`, 600: `${secondary}-600`, 700: `${secondary}-700`,
    800: `${secondary}-800`, 900: `${secondary}-900`, 950: `${secondary}-950`,
  };
  const accentShades: ColorShades = {
    50: `${accent}-50`, 100: `${accent}-100`, 200: `${accent}-200`, 300: `${accent}-300`,
    400: `${accent}-400`, 500: `${accent}-500`, 600: `${accent}-600`, 700: `${accent}-700`,
    800: `${accent}-800`, 900: `${accent}-900`, 950: `${accent}-950`,
  };

  const cssVariables: Record<string, string> = {
    '--color-primary': `var(--${primary}-500)`,
    '--color-primary-hover': `var(--${primary}-600)`,
    '--color-primary-light': `var(--${primary}-100)`,
    '--color-secondary': `var(--${secondary}-500)`,
    '--color-accent': `var(--${accent}-500)`,
  };

  return {
    primary: primaryShades,
    secondary: secondaryShades,
    accent: accentShades,
    neutral: {
      50: 'zinc-50', 100: 'zinc-100', 200: 'zinc-200', 300: 'zinc-300',
      400: 'zinc-400', 500: 'zinc-500', 600: 'zinc-600', 700: 'zinc-700',
      800: 'zinc-800', 900: 'zinc-900', 950: 'zinc-950',
    },
    success: { 50: 'emerald-50', 100: 'emerald-100', 200: 'emerald-200', 300: 'emerald-300', 400: 'emerald-400', 500: 'emerald-500', 600: 'emerald-600', 700: 'emerald-700', 800: 'emerald-800', 900: 'emerald-900', 950: 'emerald-950' },
    warning: { 50: 'amber-50', 100: 'amber-100', 200: 'amber-200', 300: 'amber-300', 400: 'amber-400', 500: 'amber-500', 600: 'amber-600', 700: 'amber-700', 800: 'amber-800', 900: 'amber-900', 950: 'amber-950' },
    error: { 50: 'red-50', 100: 'red-100', 200: 'red-200', 300: 'red-300', 400: 'red-400', 500: 'red-500', 600: 'red-600', 700: 'red-700', 800: 'red-800', 900: 'red-900', 950: 'red-950' },
    surface: { bg: 'zinc-950', card: 'zinc-900', elevated: 'zinc-800', overlay: 'black/80' },
    text: { heading: 'zinc-50', body: 'zinc-300', muted: 'zinc-500', inverse: 'zinc-950' },
    border: { default: 'zinc-800', strong: 'zinc-700', subtle: 'zinc-800/50' },
    cssVariables,
  };
}

function buildSpacingSystem(mood: string): SpacingSystem {
  const isDense = mood === 'minimal' || mood === 'clean';
  const isSpacious = mood === 'premium' || mood === 'luxury' || mood === 'editorial';

  return {
    scale: {
      '0': '0', '0.5': '0.125rem', '1': '0.25rem', '1.5': '0.375rem',
      '2': '0.5rem', '2.5': '0.625rem', '3': '0.75rem', '3.5': '0.875rem',
      '4': '1rem', '5': '1.25rem', '6': '1.5rem', '7': '1.75rem',
      '8': '2rem', '9': '2.25rem', '10': '2.5rem', '12': '3rem',
      '14': '3.5rem', '16': '4rem', '20': '5rem', '24': '6rem',
    },
    sectionPadding: isSpacious ? 'py-20 sm:py-28' : isDense ? 'py-10 sm:py-14' : 'py-16 sm:py-20',
    containerMaxWidth: isSpacious ? 'max-w-6xl' : 'max-w-7xl',
    gridGap: isDense ? 'gap-4' : isSpacious ? 'gap-8' : 'gap-6',
    cardPadding: isDense ? 'p-4' : isSpacious ? 'p-8' : 'p-6',
  };
}

function buildShadowSystem(mood: string): ShadowSystem {
  if (mood === 'minimal' || mood === 'clean') {
    return { card: 'shadow-none', elevated: 'shadow-none', glow: 'shadow-none', input: 'shadow-none' };
  }
  if (mood === 'premium' || mood === 'luxury') {
    return {
      card: 'shadow-lg shadow-black/20',
      elevated: 'shadow-xl shadow-black/30',
      glow: 'shadow-lg shadow-{primary}-500/20',
      input: 'shadow-inner shadow-black/20',
    };
  }
  return {
    card: 'shadow-md shadow-black/10',
    elevated: 'shadow-lg shadow-black/20',
    glow: 'shadow-md shadow-{primary}-500/15',
    input: 'shadow-inner shadow-black/10',
  };
}

function buildBorderSystem(mood: string): BorderSystem {
  const radii = mood === 'minimal'
    ? { sm: 'rounded-md', md: 'rounded-lg', lg: 'rounded-xl', xl: 'rounded-2xl', full: 'rounded-full' }
    : mood === 'bold'
      ? { sm: 'rounded-lg', md: 'rounded-xl', lg: 'rounded-2xl', xl: 'rounded-3xl', full: 'rounded-full' }
      : { sm: 'rounded-lg', md: 'rounded-xl', lg: 'rounded-2xl', xl: 'rounded-2xl', full: 'rounded-full' };

  return {
    card: mood === 'minimal' ? 'border border-zinc-800' : 'border border-zinc-800/80',
    input: 'border border-zinc-700',
    button: mood === 'bold' ? 'border-2' : 'border',
    radius: radii,
  };
}

// ─── CSS Output ───────────────────────────────────────────────────

export function designSystemToCss(ds: DesignSystem): string {
  const lines: string[] = [];

  lines.push(`@tailwind base;`);
  lines.push(`@tailwind components;`);
  lines.push(`@tailwind utilities;`);
  lines.push('');

  lines.push(`:root {`);
  for (const [key, value] of Object.entries(ds.colors.cssVariables)) {
    lines.push(`  ${key}: ${value};`);
  }
  lines.push(`  --font-heading: ${ds.typography.fontFamily.heading};`);
  lines.push(`  --font-body: ${ds.typography.fontFamily.body};`);
  lines.push(`  --font-mono: ${ds.typography.fontFamily.mono};`);
  lines.push(`  --transition-duration: ${ds.motion.transitionDuration};`);
  lines.push(`  --transition-easing: ${ds.motion.transitionEasing};`);
  lines.push(`}`);
  lines.push('');

  lines.push(`body {`);
  lines.push(`  font-family: var(--font-body);`);
  lines.push(`  background-color: var(--${ds.colors.surface.bg});`);
  lines.push(`  color: var(--${ds.colors.text.body});`);
  lines.push(`  -webkit-font-smoothing: antialiased;`);
  lines.push(`  -moz-osx-font-smoothing: grayscale;`);
  lines.push(`}`);
  lines.push('');

  lines.push(`h1, h2, h3, h4, h5, h6 {`);
  lines.push(`  font-family: var(--font-heading);`);
  lines.push(`  color: var(--${ds.colors.text.heading});`);
  lines.push(`}`);
  lines.push('');

  lines.push(`@layer utilities {`);
  lines.push(`  .animate-fade-in { animation: fadeIn var(--transition-duration) var(--transition-easing) both; }`);
  lines.push(`  .animate-slide-up { animation: slideUp var(--transition-duration) var(--transition-easing) both; }`);
  lines.push(`  .animate-scale-in { animation: scaleIn var(--transition-duration) var(--transition-easing) both; }`);
  lines.push(`}`);
  lines.push('');

  lines.push(`@keyframes fadeIn {`);
  lines.push(`  from { opacity: 0; }`);
  lines.push(`  to { opacity: 1; }`);
  lines.push(`}`);
  lines.push('');

  lines.push(`@keyframes slideUp {`);
  lines.push(`  from { opacity: 0; transform: translateY(16px); }`);
  lines.push(`  to { opacity: 1; transform: translateY(0); }`);
  lines.push(`}`);
  lines.push('');

  lines.push(`@keyframes scaleIn {`);
  lines.push(`  from { opacity: 0; transform: scale(0.95); }`);
  lines.push(`  to { opacity: 1; transform: scale(1); }`);
  lines.push(`}`);

  return lines.join('\n');
}

// ─── Tailwind Config Extension ────────────────────────────────────

export function designSystemToTailwindConfig(ds: DesignSystem): string {
  return `import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: [${ds.typography.fontFamily.heading.split(',').map(f => `'${f.trim()}'`).join(', ')}],
        body: [${ds.typography.fontFamily.body.split(',').map(f => `'${f.trim()}'`).join(', ')}],
        mono: [${ds.typography.fontFamily.mono.split(',').map(f => `'${f.trim()}'`).join(', ')}],
      },
      borderRadius: {
        sm: '${ds.borders.radius.sm.replace('rounded-', '')}',
        md: '${ds.borders.radius.md.replace('rounded-', '')}',
        lg: '${ds.borders.radius.lg.replace('rounded-', '')}',
        xl: '${ds.borders.radius.xl.replace('rounded-', '')}',
      },
      transitionDuration: {
        DEFAULT: '${ds.motion.transitionDuration}',
      },
      transitionTimingFunction: {
        DEFAULT: '${ds.motion.transitionEasing}',
      },
    },
  },
  plugins: [],
};

export default config;
`;
}
