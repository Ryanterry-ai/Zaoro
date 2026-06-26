import type { DesignProfile } from '../../schemas/knowledge/design-profile.schema.js';

export const LUXURY_DARK_OPULENCE: DesignProfile = {
  id: 'design.luxury.dark-opulence',
  version: '2.1.0',
  status: 'active',
  createdAt: '2025-01-01T00:00:00+00:00',
  updatedAt: '2025-01-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'DesignProfile',
  name: 'Luxury: Dark Opulence',
  description: 'Premium dark theme with gold accents for luxury brands',
  typography: {
    displayFamily: 'Playfair Display',
    bodyFamily: 'Inter',
    monoFamily: 'JetBrains Mono',
    scale: {
      display: { size: '3.5rem', lineHeight: '1.1', weight: '700', tracking: '-0.02em' },
      h1: { size: '2.5rem', lineHeight: '1.2', weight: '700', tracking: '-0.01em' },
      h2: { size: '2rem', lineHeight: '1.3', weight: '600' },
      h3: { size: '1.5rem', lineHeight: '1.4', weight: '600' },
      h4: { size: '1.25rem', lineHeight: '1.4', weight: '500' },
      bodyLg: { size: '1.125rem', lineHeight: '1.7', weight: '400' },
      body: { size: '1rem', lineHeight: '1.7', weight: '400' },
      bodySm: { size: '0.875rem', lineHeight: '1.6', weight: '400' },
      caption: { size: '0.75rem', lineHeight: '1.5', weight: '500' },
      overline: { size: '0.75rem', lineHeight: '1.5', weight: '600', tracking: '0.1em' },
    },
  },
  colorPsychology: {
    primary: '#D4AF37',
    secondary: '#1A1A1A',
    accent: '#C9B037',
    background: '#0A0A0A',
    foreground: '#F5F5F5',
    muted: '#2A2A2A',
    destructive: '#8B0000',
    success: '#2E7D32',
    warning: '#D4AF37',
    info: '#5C8A8A',
    psychology: {
      primary: 'Gold represents luxury, exclusivity, and prestige',
      background: 'Deep black creates drama and sophistication',
      accent: 'Gold accents reinforce premium positioning',
    },
    gradients: {
      hero: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #0A0A0A 100%)',
      card: 'linear-gradient(145deg, #1A1A1A 0%, #0A0A0A 100%)',
      button: 'linear-gradient(135deg, #D4AF37 0%, #C9B037 100%)',
      subtle: 'linear-gradient(180deg, transparent 0%, rgba(212,175,55,0.05) 100%)',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  grid: {
    columns: 12,
    gutter: '1.5rem',
    margin: '2rem',
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
  motion: {
    duration: {
      fast: '150ms',
      normal: '400ms',
      slow: '700ms',
    },
    easing: {
      default: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      enter: 'cubic-bezier(0, 0, 0.2, 1)',
      exit: 'cubic-bezier(0.4, 0, 1, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    reducedMotion: 'simplify',
  },
  accessibility: {
    contrastRatio: 7,
    focusVisible: true,
    keyboardNav: true,
    ariaLabels: true,
    reducedMotion: true,
    screenReader: true,
  },
  iconography: {
    library: 'lucide',
    style: 'outline',
    size: {
      sm: '16px',
      md: '20px',
      lg: '24px',
    },
  },
  illustration: {
    style: 'none',
  },
  photography: {
    style: 'editorial',
    mood: ['dramatic', 'sophisticated', 'moody', 'high-contrast'],
    aspectRatio: '16/9',
  },
  componentsStyling: {
    button: {
      primary: 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-semibold px-8 py-3 rounded-none hover:from-yellow-500 hover:to-yellow-400 transition-all duration-300',
      secondary: 'border border-yellow-600/30 text-yellow-500 px-8 py-3 rounded-none hover:bg-yellow-600/10 transition-all duration-300',
    },
    card: {
      default: 'bg-zinc-900/50 border border-zinc-800 rounded-none p-8',
      hover: 'bg-zinc-900/50 border border-zinc-800 rounded-none p-8 hover:border-yellow-600/30 transition-all duration-500',
    },
    input: {
      default: 'bg-zinc-900/50 border border-zinc-800 rounded-none px-4 py-3 text-white focus:border-yellow-600/50 transition-colors',
    },
    badge: {
      default: 'bg-yellow-600/10 text-yellow-500 border border-yellow-600/20 px-3 py-1 text-xs font-medium tracking-wider uppercase',
    },
    avatar: {
      default: 'rounded-none border border-zinc-800',
    },
    dialog: {
      default: 'bg-zinc-900 border border-zinc-800 rounded-none',
    },
    table: {
      default: 'bg-zinc-900/50 border border-zinc-800',
    },
    form: {
      default: 'space-y-6',
    },
    chart: {
      default: 'bg-zinc-900/50 border border-zinc-800 rounded-none p-6',
    },
  },
  brandPersonality: ['premium', 'luxury', 'exclusive', 'sophisticated'],
  microInteractions: [
    { trigger: 'hover', animation: 'scale(1.02)', duration: '400ms', easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
    { trigger: 'click', animation: 'scale(0.98)', duration: '150ms' },
    { trigger: 'scroll', animation: 'parallax(0.3)', duration: '700ms' },
  ],
};
