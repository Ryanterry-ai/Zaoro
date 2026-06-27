import { describe, it, expect } from 'vitest';
import {
  generateDesignDNA,
  type DesignDNA,
  type IntentDNA,
} from '../src/generation/design-dna.js';

function makeIntent(overrides: Partial<IntentDNA> = {}): IntentDNA {
  return {
    business_domain: 'saas',
    app_name: 'TestApp',
    app_tagline: 'A test app',
    platform_target: 'web',
    framework: 'nextjs',
    styling: 'tailwind',
    features: [],
    entities: [],
    workflows: [],
    tables: [],
    ui_sections: [],
    design_style: '',
    color_palette: [],
    typography: 'sans-serif',
    confidence: 0.8,
    missing_info: [],
    ...overrides,
  };
}

describe('generateDesignDNA', () => {
  it('should return a valid DesignDNA object', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(dna).toBeDefined();
    expect(typeof dna.industry).toBe('string');
    expect(typeof dna.brandPersonality).toBe('string');
    expect(typeof dna.designStyle).toBe('string');
    expect(dna.colors).toBeDefined();
    expect(dna.typography).toBeDefined();
    expect(dna.spacing).toBeDefined();
    expect(dna.radius).toBeDefined();
    expect(dna.shadows).toBeDefined();
    expect(dna.motion).toBeDefined();
    expect(dna.icons).toBeDefined();
    expect(dna.photography).toBeDefined();
    expect(dna.illustration).toBeDefined();
    expect(dna.charts).toBeDefined();
    expect(dna.tables).toBeDefined();
    expect(dna.forms).toBeDefined();
    expect(dna.buttons).toBeDefined();
    expect(dna.cards).toBeDefined();
    expect(dna.navigation).toBeDefined();
    expect(dna.layout).toBeDefined();
  });

  it('should have a valid ColorDNA structure', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(dna.colors.primary).toBeTruthy();
    expect(dna.colors.secondary).toBeTruthy();
    expect(dna.colors.accent).toBeTruthy();
    expect(dna.colors.background).toBeTruthy();
    expect(dna.colors.foreground).toBeTruthy();
    expect(dna.colors.paletteName).toBeTruthy();
    expect(dna.colors.gradients.hero).toContain('linear-gradient');
    expect(dna.colors.gradients.button).toContain('linear-gradient');
  });

  it('should have valid TypographyDNA with Google Fonts URL', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(dna.typography.heading).toBeTruthy();
    expect(dna.typography.body).toBeTruthy();
    expect(dna.typography.mono).toBeTruthy();
    expect(dna.typography.googleFontsUrl).toContain('fonts.googleapis.com');
    expect(dna.typography.scale.display.size).toBeTruthy();
    expect(dna.typography.scale.h1.size).toBeTruthy();
    expect(dna.typography.scale.body.size).toBeTruthy();
  });

  it('should have valid SpacingDNA', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(dna.spacing.baseUnit).toBeGreaterThan(0);
    expect(dna.spacing.scale['0']).toBe('0');
    expect(dna.spacing.section.sm).toBeTruthy();
    expect(dna.spacing.container.maxWidth).toBeTruthy();
    expect(dna.spacing.grid.columns.sm).toBeGreaterThan(0);
  });

  it('should have valid RadiusDNA', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(dna.radius.none).toBe('0');
    expect(dna.radius.full).toBe('9999px');
    expect(dna.radius.button).toBeTruthy();
    expect(dna.radius.card).toBeTruthy();
    expect(dna.radius.input).toBeTruthy();
  });

  it('should have valid ShadowDNA', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(dna.shadows.none).toBe('none');
    expect(dna.shadows.card).toBeTruthy();
    expect(dna.shadows.cardHover).toBeTruthy();
    expect(dna.shadows.button).toBeTruthy();
    expect(dna.shadows.dropdown).toBeTruthy();
    expect(dna.shadows.modal).toBeTruthy();
  });

  it('should have valid MotionDNA', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(dna.motion.duration.instant).toBeGreaterThan(0);
    expect(dna.motion.duration.fast).toBeGreaterThan(0);
    expect(dna.motion.duration.normal).toBeGreaterThan(0);
    expect(dna.motion.duration.slow).toBeGreaterThan(0);
    expect(dna.motion.easing.default).toBeTruthy();
    expect(dna.motion.spring.gentle.stiffness).toBeGreaterThan(0);
    expect(dna.motion.gesture.hover.scale).toBeGreaterThanOrEqual(1);
    expect(dna.motion.stagger.children).toBeGreaterThan(0);
    expect(dna.motion.scrollReveal.viewportOnce).toBe(true);
  });

  it('should have valid IconDNA', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(['lucide', 'heroicons', 'tabler']).toContain(dna.icons.library);
    expect(Object.keys(dna.icons.mapping).length).toBeGreaterThan(10);
    expect(dna.icons.sizes.sm).toBeLessThan(dna.icons.sizes.lg);
  });

  it('should have valid PhotographyDNA', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(dna.photography.queryTemplates.length).toBeGreaterThan(0);
    expect(dna.photography.fallbackSource).toBeTruthy();
    expect(['photo', 'gradient', 'illustration', 'split']).toContain(dna.photography.heroStrategy);
  });

  it('should have valid ButtonDNA', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(dna.buttons.variants.primary).toContain('bg-primary');
    expect(dna.buttons.variants.ghost).toContain('hover:bg-accent');
    expect(dna.buttons.sizes.sm).toBeTruthy();
    expect(dna.buttons.sizes.lg).toBeTruthy();
    expect(dna.buttons.radius).toBeTruthy();
  });

  it('should have valid CardDNA', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(['filled', 'outlined', 'elevated', 'glass']).toContain(dna.cards.style);
    expect(dna.cards.variants.default).toBeTruthy();
    expect(dna.cards.variants.interactive).toContain('hover:shadow');
  });

  it('should have valid NavigationDNA', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(['top', 'sidebar', 'bottom', 'mixed']).toContain(dna.navigation.type);
    expect(dna.navigation.sticky).toBe(true);
    expect(dna.navigation.maxItems).toBeGreaterThan(0);
  });

  it('should have valid LayoutDNA', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(['centered', 'split', 'left', 'full-width', 'gradient']).toContain(dna.layout.heroLayout);
    expect(dna.layout.container).toContain('max-w');
    expect(dna.layout.maxWidth).toBeTruthy();
  });

  it('should detect fitness industry personality', () => {
    const dna = generateDesignDNA(makeIntent({ business_domain: 'fitness' }));
    expect(dna.brandPersonality).toBe('energetic');
    expect(dna.designStyle).toBe('bold');
    expect(dna.colors.paletteName).toBe('red');
  });

  it('should detect ecommerce industry personality', () => {
    const dna = generateDesignDNA(makeIntent({ business_domain: 'ecommerce' }));
    expect(dna.brandPersonality).toBe('premium');
    expect(dna.designStyle).toBe('glassmorphism');
  });

  it('should detect healthcare industry personality', () => {
    const dna = generateDesignDNA(makeIntent({ business_domain: 'healthcare' }));
    expect(dna.brandPersonality).toBe('trustworthy');
    expect(dna.designStyle).toBe('flat');
    expect(dna.colors.paletteName).toBe('blue');
  });

  it('should detect saas industry personality', () => {
    const dna = generateDesignDNA(makeIntent({ business_domain: 'saas' }));
    expect(dna.brandPersonality).toBe('modern');
    expect(dna.designStyle).toBe('gradient');
  });

  it('should detect restaurant industry personality', () => {
    const dna = generateDesignDNA(makeIntent({ business_domain: 'restaurant' }));
    expect(dna.brandPersonality).toBe('warm');
    expect(dna.designStyle).toBe('flat');
    expect(dna.colors.paletteName).toBe('orange');
  });

  it('should apply design_style override over industry default', () => {
    const dna = generateDesignDNA(makeIntent({ business_domain: 'saas', design_style: 'dark' }));
    expect(dna.brandPersonality).toBe('tech');
    expect(dna.designStyle).toBe('dark');
  });

  it('should apply brutalist design_style override', () => {
    const dna = generateDesignDNA(makeIntent({ design_style: 'brutalist' }));
    expect(dna.brandPersonality).toBe('bold');
  });

  it('should handle luxury personality', () => {
    const dna = generateDesignDNA(makeIntent({ business_domain: 'hotel' }));
    expect(dna.brandPersonality).toBe('luxury');
    expect(dna.typography.heading).toContain('Playfair');
  });

  it('should handle tech personality', () => {
    const dna = generateDesignDNA(makeIntent({ business_domain: 'crypto' }));
    expect(dna.brandPersonality).toBe('tech');
    expect(dna.designStyle).toBe('dark');
    expect(dna.typography.heading).toContain('Space Grotesk');
  });

  it('should return different palettes for different industries', () => {
    const saasDna = generateDesignDNA(makeIntent({ business_domain: 'saas' }));
    const fitnessDna = generateDesignDNA(makeIntent({ business_domain: 'fitness' }));
    const restaurantDna = generateDesignDNA(makeIntent({ business_domain: 'restaurant' }));

    expect(saasDna.colors.paletteName).not.toBe(fitnessDna.colors.paletteName);
    expect(fitnessDna.colors.paletteName).not.toBe(restaurantDna.colors.paletteName);
  });

  it('should return different typography for different personalities', () => {
    const minimalDna = generateDesignDNA(makeIntent({ business_domain: 'portfolio' }));
    const boldDna = generateDesignDNA(makeIntent({ business_domain: 'gaming' }));

    expect(minimalDna.typography.heading).not.toBe(boldDna.typography.heading);
  });

  it('should handle unknown industry gracefully', () => {
    const dna = generateDesignDNA(makeIntent({ business_domain: 'unknown-industry' }));
    expect(dna.brandPersonality).toBe('professional');
    expect(dna.designStyle).toBe('flat');
    expect(dna.colors.primary).toBeTruthy();
  });

  it('should set correct chart types', () => {
    const dna = generateDesignDNA(makeIntent());
    expect(dna.charts.byDataType.trend).toBeTruthy();
    expect(dna.charts.byDataType.comparison).toBeTruthy();
    expect(dna.charts.seriesColors.length).toBeGreaterThan(0);
  });

  it('should set correct form settings per industry', () => {
    const saasDna = generateDesignDNA(makeIntent({ business_domain: 'saas' }));
    expect(saasDna.forms.layout).toBe('stacked');
    expect(saasDna.forms.inputStyle).toBe('outlined');

    const financeDna = generateDesignDNA(makeIntent({ business_domain: 'finance' }));
    expect(financeDna.forms.layout).toBe('multi-column');
  });

  it('should set correct table density per industry', () => {
    const financeDna = generateDesignDNA(makeIntent({ business_domain: 'finance' }));
    expect(financeDna.tables.density).toBe('compact');

    const portfolioDna = generateDesignDNA(makeIntent({ business_domain: 'portfolio' }));
    expect(portfolioDna.tables.density).toBe('spacious');
  });

  it('should set correct navigation per industry', () => {
    const saasDna = generateDesignDNA(makeIntent({ business_domain: 'saas' }));
    expect(saasDna.navigation.type).toBe('top');
    expect(saasDna.navigation.maxItems).toBe(6);

    const dashboardDna = generateDesignDNA(makeIntent({ business_domain: 'dashboard' }));
    expect(dashboardDna.navigation.type).toBe('sidebar');
  });

  it('should set correct hero layout per industry', () => {
    const saasDna = generateDesignDNA(makeIntent({ business_domain: 'saas' }));
    expect(saasDna.layout.heroLayout).toBe('centered');

    const techDna = generateDesignDNA(makeIntent({ business_domain: 'tech' }));
    expect(techDna.layout.heroLayout).toBe('split');

    const restaurantDna = generateDesignDNA(makeIntent({ business_domain: 'restaurant' }));
    expect(restaurantDna.layout.heroLayout).toBe('full-width');
  });
});
