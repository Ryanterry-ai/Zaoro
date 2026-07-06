// ─── Visual Engine ──────────────────────────────────────────────────────────
//
// Wraps Taste capabilities. Handles:
//   - Color palette generation per industry
//   - Typography selection and pairing
//   - Visual hierarchy and contrast
//   - Brand personality to visual mapping
//   - Dark/light mode palettes
// ─────────────────────────────────────────────────────────────────────────────

import type { DesignSubEngine, DesignContext, DesignRecommendation, ColorTokens, TypographyTokens } from '../types.js';

// ─── Industry Color Palettes ────────────────────────────────────────────────

const INDUSTRY_COLORS: Record<string, ColorTokens> = {
  'ecommerce': { primary: '#2563EB', primaryLight: '#60A5FA', primaryDark: '#1D4ED8', secondary: '#7C3AED', secondaryLight: '#A78BFA', secondaryDark: '#6D28D9', accent: '#F59E0B', background: '#FFFFFF', surface: '#F8FAFC', surfaceElevated: '#FFFFFF', text: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8', border: '#E2E8F0', borderLight: '#F1F5F9', success: '#10B981', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6' },
  'saas': { primary: '#6366F1', primaryLight: '#818CF8', primaryDark: '#4F46E5', secondary: '#06B6D4', secondaryLight: '#22D3EE', secondaryDark: '#0891B2', accent: '#8B5CF6', background: '#FAFAFA', surface: '#F4F4F5', surfaceElevated: '#FFFFFF', text: '#18181B', textSecondary: '#52525B', textMuted: '#A1A1AA', border: '#E4E4E7', borderLight: '#F4F4F5', success: '#22C55E', warning: '#EAB308', error: '#EF4444', info: '#3B82F6' },
  'fintech': { primary: '#059669', primaryLight: '#34D399', primaryDark: '#047857', secondary: '#0F172A', secondaryLight: '#334155', secondaryDark: '#020617', accent: '#10B981', background: '#FFFFFF', surface: '#F8FAFC', surfaceElevated: '#FFFFFF', text: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8', border: '#E2E8F0', borderLight: '#F1F5F9', success: '#059669', warning: '#D97706', error: '#DC2626', info: '#2563EB' },
  'healthcare': { primary: '#0891B2', primaryLight: '#22D3EE', primaryDark: '#0E7490', secondary: '#6366F1', secondaryLight: '#818CF8', secondaryDark: '#4F46E5', accent: '#06B6D4', background: '#FFFFFF', surface: '#F0FDFA', surfaceElevated: '#FFFFFF', text: '#134E4A', textSecondary: '#0F766E', textMuted: '#5EEAD4', border: '#CCFBF1', borderLight: '#F0FDFA', success: '#059669', warning: '#D97706', error: '#DC2626', info: '#0891B2' },
  'education': { primary: '#7C3AED', primaryLight: '#A78BFA', primaryDark: '#6D28D9', secondary: '#F59E0B', secondaryLight: '#FCD34D', secondaryDark: '#D97706', accent: '#8B5CF6', background: '#FFFFFF', surface: '#FAF5FF', surfaceElevated: '#FFFFFF', text: '#1E1B4B', textSecondary: '#4338CA', textMuted: '#A78BFA', border: '#EDE9FE', borderLight: '#F5F3FF', success: '#22C55E', warning: '#EAB308', error: '#EF4444', info: '#6366F1' },
  'restaurant': { primary: '#DC2626', primaryLight: '#F87171', primaryDark: '#B91C1C', secondary: '#92400E', secondaryLight: '#B45309', secondaryDark: '#78350F', accent: '#F59E0B', background: '#FFFBEB', surface: '#FEF3C7', surfaceElevated: '#FFFFFF', text: '#451A03', textSecondary: '#78350F', textMuted: '#D97706', border: '#FDE68A', borderLight: '#FEF3C7', success: '#16A34A', warning: '#EA580C', error: '#DC2626', info: '#2563EB' },
  'fitness': { primary: '#EA580C', primaryLight: '#FB923C', primaryDark: '#C2410C', secondary: '#0F172A', secondaryLight: '#334155', secondaryDark: '#020617', accent: '#F97316', background: '#FFFFFF', surface: '#FFF7ED', surfaceElevated: '#FFFFFF', text: '#1C1917', textSecondary: '#57534E', textMuted: '#A8A29E', border: '#FED7AA', borderLight: '#FFF7ED', success: '#16A34A', warning: '#EAB308', error: '#EF4444', info: '#3B82F6' },
  'real-estate': { primary: '#1E40AF', primaryLight: '#3B82F6', primaryDark: '#1E3A8A', secondary: '#059669', secondaryLight: '#34D399', secondaryDark: '#047857', accent: '#2563EB', background: '#FFFFFF', surface: '#EFF6FF', surfaceElevated: '#FFFFFF', text: '#1E3A8A', textSecondary: '#1E40AF', textMuted: '#60A5FA', border: '#BFDBFE', borderLight: '#EFF6FF', success: '#059669', warning: '#D97706', error: '#DC2626', info: '#2563EB' },
  'media': { primary: '#18181B', primaryLight: '#27272A', primaryDark: '#09090B', secondary: '#DC2626', secondaryLight: '#EF4444', secondaryDark: '#B91C1C', accent: '#EF4444', background: '#FFFFFF', surface: '#FAFAFA', surfaceElevated: '#FFFFFF', text: '#09090B', textSecondary: '#52525B', textMuted: '#A1A1AA', border: '#E4E4E7', borderLight: '#F4F4F5', success: '#16A34A', warning: '#EAB308', error: '#DC2626', info: '#2563EB' },
  'portfolio': { primary: '#0F172A', primaryLight: '#334155', primaryDark: '#020617', secondary: '#6366F1', secondaryLight: '#818CF8', secondaryDark: '#4F46E5', accent: '#8B5CF6', background: '#FFFFFF', surface: '#F8FAFC', surfaceElevated: '#FFFFFF', text: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8', border: '#E2E8F0', borderLight: '#F1F5F9', success: '#22C55E', warning: '#EAB308', error: '#EF4444', info: '#6366F1' },
  'marketplace': { primary: '#7C3AED', primaryLight: '#A78BFA', primaryDark: '#6D28D9', secondary: '#F59E0B', secondaryLight: '#FCD34D', secondaryDark: '#D97706', accent: '#EC4899', background: '#FFFFFF', surface: '#FAF5FF', surfaceElevated: '#FFFFFF', text: '#1E1B4B', textSecondary: '#4338CA', textMuted: '#A78BFA', border: '#EDE9FE', borderLight: '#F5F3FF', success: '#22C55E', warning: '#EAB308', error: '#EF4444', info: '#6366F1' },
  'nonprofit': { primary: '#059669', primaryLight: '#34D399', primaryDark: '#047857', secondary: '#7C3AED', secondaryLight: '#A78BFA', secondaryDark: '#6D28D9', accent: '#10B981', background: '#FFFFFF', surface: '#F0FDF4', surfaceElevated: '#FFFFFF', text: '#14532D', textSecondary: '#166534', textMuted: '#4ADE80', border: '#BBF7D0', borderLight: '#F0FDF4', success: '#059669', warning: '#D97706', error: '#DC2626', info: '#2563EB' },
};

// ─── Typography Presets ─────────────────────────────────────────────────────

const TYPOGRAPHY_PRESETS: Record<string, TypographyTokens> = {
  'modern': { fontFamily: { heading: 'Inter, sans-serif', body: 'Inter, sans-serif', mono: 'JetBrains Mono, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 }, letterSpacing: { tight: '-0.025em', normal: '0em', wide: '0.025em' } },
  'clean': { fontFamily: { heading: 'Plus Jakarta Sans, sans-serif', body: 'Plus Jakarta Sans, sans-serif', mono: 'Fira Code, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: 1.2, normal: 1.6, relaxed: 1.8 }, letterSpacing: { tight: '-0.02em', normal: '0em', wide: '0.05em' } },
  'trustworthy': { fontFamily: { heading: 'DM Sans, sans-serif', body: 'DM Sans, sans-serif', mono: 'IBM Plex Mono, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: 1.3, normal: 1.6, relaxed: 1.8 }, letterSpacing: { tight: '-0.01em', normal: '0em', wide: '0.02em' } },
  'calm': { fontFamily: { heading: 'Nunito, sans-serif', body: 'Nunito, sans-serif', mono: 'Source Code Pro, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: 1.3, normal: 1.6, relaxed: 1.8 }, letterSpacing: { tight: '-0.01em', normal: '0em', wide: '0.02em' } },
  'friendly': { fontFamily: { heading: 'Poppins, sans-serif', body: 'Nunito, sans-serif', mono: 'Fira Code, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: 1.3, normal: 1.6, relaxed: 1.8 }, letterSpacing: { tight: '-0.01em', normal: '0em', wide: '0.02em' } },
  'warm': { fontFamily: { heading: 'Playfair Display, serif', body: 'Lato, sans-serif', mono: 'Fira Code, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: 1.2, normal: 1.6, relaxed: 1.8 }, letterSpacing: { tight: '-0.02em', normal: '0em', wide: '0.02em' } },
  'energetic': { fontFamily: { heading: 'Montserrat, sans-serif', body: 'Open Sans, sans-serif', mono: 'JetBrains Mono, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.7 }, letterSpacing: { tight: '-0.03em', normal: '0em', wide: '0.05em' } },
  'professional': { fontFamily: { heading: 'Source Sans Pro, sans-serif', body: 'Source Sans Pro, sans-serif', mono: 'Source Code Pro, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: 1.3, normal: 1.6, relaxed: 1.8 }, letterSpacing: { tight: '-0.01em', normal: '0em', wide: '0.02em' } },
  'editorial': { fontFamily: { heading: 'Merriweather, serif', body: 'Source Sans Pro, sans-serif', mono: 'IBM Plex Mono, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 700, bold: 800 }, lineHeight: { tight: 1.2, normal: 1.7, relaxed: 1.9 }, letterSpacing: { tight: '-0.02em', normal: '0em', wide: '0.01em' } },
  'creative': { fontFamily: { heading: 'Space Grotesk, sans-serif', body: 'Inter, sans-serif', mono: 'Fira Code, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.7 }, letterSpacing: { tight: '-0.03em', normal: '0em', wide: '0.05em' } },
  'vibrant': { fontFamily: { heading: 'Sora, sans-serif', body: 'DM Sans, sans-serif', mono: 'JetBrains Mono, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 }, letterSpacing: { tight: '-0.02em', normal: '0em', wide: '0.03em' } },
  'compassionate': { fontFamily: { heading: 'Nunito, sans-serif', body: 'Lato, sans-serif', mono: 'Fira Code, monospace' }, fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem' }, fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 }, lineHeight: { tight: 1.3, normal: 1.7, relaxed: 1.9 }, letterSpacing: { tight: '-0.01em', normal: '0em', wide: '0.02em' } },
};

// ─── Visual Engine ──────────────────────────────────────────────────────────

export class VisualEngine implements DesignSubEngine {
  readonly name = 'Visual Engine';
  readonly domain = 'visual' as const;

  recommend(ctx: DesignContext): DesignRecommendation[] {
    const personality = ctx.preferences?.typographyStyle ?? ctx.personality ?? 'modern';
    const recs: DesignRecommendation[] = [];

    // Color palette
    const colors = INDUSTRY_COLORS[ctx.industry] ?? INDUSTRY_COLORS['saas']!;
    recs.push({
      domain: 'visual',
      title: 'Color Palette',
      description: `Industry-optimized color palette with ${colors.primary} primary`,
      confidence: 0.9,
      priority: 'must',
      tokens: colors as unknown as Record<string, unknown>,
    });

    // Typography
    const typo = TYPOGRAPHY_PRESETS[personality] ?? TYPOGRAPHY_PRESETS['modern']!;
    recs.push({
      domain: 'visual',
      title: 'Typography System',
      description: `Typography pairing: ${typo.fontFamily.heading} / ${typo.fontFamily.body}`,
      confidence: 0.85,
      priority: 'must',
      tokens: typo as unknown as Record<string, unknown>,
    });

    // Visual hierarchy
    recs.push({
      domain: 'visual',
      title: 'Visual Hierarchy',
      description: 'Establish clear F-pattern or Z-pattern reading flow',
      confidence: 0.8,
      priority: 'should',
      tokens: { hierarchyPattern: this.getHierarchyPattern(ctx.industry) },
    });

    // Contrast and readability
    recs.push({
      domain: 'visual',
      title: 'Contrast & Readability',
      description: 'Minimum 4.5:1 contrast ratio for text, 3:1 for large text',
      confidence: 1.0,
      priority: 'must',
      tokens: { minContrast: 4.5, largeTextContrast: 3 },
    });

    // Spacing system
    recs.push({
      domain: 'visual',
      title: 'Spacing Scale',
      description: '4px base spacing unit with consistent scale',
      confidence: 0.9,
      priority: 'must',
      tokens: { baseUnit: 4, scale: [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128] },
    });

    return recs;
  }

  private getHierarchyPattern(industry: string): string {
    const patterns: Record<string, string> = {
      'ecommerce': 'F-pattern (product browsing)',
      'saas': 'Z-pattern (dashboard scanning)',
      'healthcare': 'F-pattern (information seeking)',
      'media': 'F-pattern (article reading)',
      'portfolio': 'Z-pattern (work showcase)',
      'restaurant': 'Z-pattern (menu browsing)',
    };
    return patterns[industry] ?? 'F-pattern';
  }
}

export function createVisualEngine(): VisualEngine {
  return new VisualEngine();
}
