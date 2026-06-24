import { ArchitectDecision, PageDesign } from './architect.js';
import { DesignSystem } from './design-system-generator.js';
import { ComponentPlan } from './component-sourcer.js';
import { MotionPlan } from './motion-engine.js';

export interface UXAuditResult {
  overall: number;
  categories: AuditCategory[];
  issues: AuditIssue[];
  recommendations: string[];
  score: UXScore;
}

export interface AuditCategory {
  name: string;
  score: number;
  weight: number;
  findings: string[];
}

export interface AuditIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  fix: string;
}

export interface UXScore {
  visualQuality: number;
  accessibility: number;
  conversionOptimization: number;
  mobileExperience: number;
  performance: number;
  contentQuality: number;
}

// ─── UX Evaluation Agent ──────────────────────────────────────────

export class UXEvaluator {
  evaluate(
    decision: ArchitectDecision,
    designSystem: DesignSystem,
    componentPlan: ComponentPlan,
    motionPlan: MotionPlan,
    generatedCode: string,
  ): UXAuditResult {
    console.log(`[ux-evaluator] Auditing ${decision.pages.length} pages`);

    const issues: AuditIssue[] = [];
    const recommendations: string[] = [];

    const visualQuality = this.auditVisualQuality(designSystem, issues, recommendations);
    const accessibility = this.auditAccessibility(generatedCode, issues, recommendations);
    const conversionOptimization = this.auditConversion(decision, issues, recommendations);
    const mobileExperience = this.auditMobile(designSystem, componentPlan, issues, recommendations);
    const performance = this.auditPerformance(generatedCode, issues, recommendations);
    const contentQuality = this.auditContent(decision, issues, recommendations);

    const categories: AuditCategory[] = [
      { name: 'Visual Quality', score: visualQuality, weight: 0.25, findings: this.getVisualFindings(designSystem) },
      { name: 'Accessibility', score: accessibility, weight: 0.2, findings: this.getAccessibilityFindings(generatedCode) },
      { name: 'Conversion', score: conversionOptimization, weight: 0.2, findings: this.getConversionFindings(decision) },
      { name: 'Mobile', score: mobileExperience, weight: 0.15, findings: this.getMobileFindings(designSystem, componentPlan) },
      { name: 'Performance', score: performance, weight: 0.1, findings: this.getPerformanceFindings(generatedCode) },
      { name: 'Content', score: contentQuality, weight: 0.1, findings: this.getContentFindings(decision) },
    ];

    const overall = Math.round(
      categories.reduce((sum, c) => sum + c.score * c.weight, 0)
    );

    const score: UXScore = { visualQuality, accessibility, conversionOptimization, mobileExperience, performance, contentQuality };

    console.log(`[ux-evaluator] Overall: ${overall}/100 (V:${visualQuality} A:${accessibility} C:${conversionOptimization} M:${mobileExperience} P:${performance} Q:${contentQuality})`);

    return { overall, categories, issues, recommendations, score };
  }

  private auditVisualQuality(ds: DesignSystem, issues: AuditIssue[], recommendations: string[]): number {
    let score = 85;

    // Check typography variety
    const hasTypographyScale = Object.keys(ds.typography.scale).length >= 8;
    if (!hasTypographyScale) { score -= 10; issues.push({ severity: 'warning', category: 'visual', message: 'Limited typography scale', fix: 'Add more type sizes for hierarchy' }); }

    // Check color system completeness
    const hasCompleteColors = ds.colors.primary && ds.colors.secondary && ds.colors.accent;
    if (!hasCompleteColors) { score -= 10; issues.push({ severity: 'warning', category: 'visual', message: 'Incomplete color system', fix: 'Define primary, secondary, and accent colors' }); }

    // Check spacing consistency
    const hasSpacingScale = Object.keys(ds.spacing.scale).length >= 10;
    if (!hasSpacingScale) { score -= 5; issues.push({ severity: 'info', category: 'visual', message: 'Spacing scale could be more granular', fix: 'Use consistent spacing tokens' }); }

    // Check border radius consistency
    if (!ds.borders?.radius) { score -= 5; issues.push({ severity: 'info', category: 'visual', message: 'No border radius system', fix: 'Define consistent border radius tokens' }); }

    recommendations.push('Use consistent spacing scale across all sections');
    recommendations.push('Maintain visual hierarchy with typography scale');
    recommendations.push('Use color system consistently — primary for CTAs, secondary for accents');

    return Math.max(0, Math.min(100, score));
  }

  private auditAccessibility(code: string, issues: AuditIssue[], recommendations: string[]): number {
    let score = 75;

    // Check for semantic HTML
    if (!code.includes('<nav')) { score -= 5; issues.push({ severity: 'warning', category: 'accessibility', message: 'Missing semantic <nav> element', fix: 'Use <nav> for navigation sections' }); }
    if (!code.includes('<main')) { score -= 5; issues.push({ severity: 'warning', category: 'accessibility', message: 'Missing semantic <main> element', fix: 'Wrap main content in <main>' }); }
    if (!code.includes('<footer')) { score -= 3; issues.push({ severity: 'info', category: 'accessibility', message: 'Missing semantic <footer> element', fix: 'Use <footer> for footer sections' }); }
    if (!code.includes('<section')) { score -= 3; issues.push({ severity: 'info', category: 'accessibility', message: 'Consider using <section> for content blocks', fix: 'Wrap sections in semantic <section> elements' }); }

    // Check heading hierarchy
    const h1Count = (code.match(/<h1[\s>]/g) || []).length;
    if (h1Count === 0) { score -= 10; issues.push({ severity: 'critical', category: 'accessibility', message: 'No <h1> heading found', fix: 'Add exactly one <h1> per page' }); }
    if (h1Count > 1) { score -= 5; issues.push({ severity: 'warning', category: 'accessibility', message: `Multiple <h1> headings (${h1Count})`, fix: 'Use exactly one <h1> per page' }); }

    // Check for alt text on images
    const imgCount = (code.match(/<img[\s>]/g) || []).length;
    const altCount = (code.match(/alt="/g) || []).length;
    if (imgCount > 0 && altCount < imgCount * 0.8) { score -= 8; issues.push({ severity: 'warning', category: 'accessibility', message: `Images missing alt text (${altCount}/${imgCount} have alt)`, fix: 'Add descriptive alt text to all images' }); }

    // Check for focus states
    if (!code.includes('focus:') && !code.includes('focus-')) { score -= 5; issues.push({ severity: 'warning', category: 'accessibility', message: 'No visible focus states found', fix: 'Add focus:ring or focus:border classes' }); }

    // Check button accessibility
    const buttonCount = (code.match(/<button[\s>]/g) || []).length;
    if (buttonCount > 0 && !code.includes('aria-')) { score -= 3; issues.push({ severity: 'info', category: 'accessibility', message: 'No ARIA attributes found', fix: 'Add aria-label to icon-only buttons' }); }

    recommendations.push('Ensure all images have descriptive alt text');
    recommendations.push('Use proper heading hierarchy (h1 → h2 → h3)');
    recommendations.push('Add visible focus states for keyboard navigation');
    recommendations.push('Use semantic HTML elements (nav, main, section, footer)');

    return Math.max(0, Math.min(100, score));
  }

  private auditConversion(decision: ArchitectDecision, issues: AuditIssue[], recommendations: string[]): number {
    let score = 80;

    // Check for CTA sections
    const hasCTA = decision.pages.some(p => p.sections.includes('cta'));
    if (!hasCTA) { score -= 15; issues.push({ severity: 'critical', category: 'conversion', message: 'No CTA section found', fix: 'Add a clear call-to-action section' }); }

    // Check for testimonials (social proof)
    const hasTestimonials = decision.pages.some(p => p.sections.includes('testimonials'));
    if (!hasTestimonials) { score -= 10; issues.push({ severity: 'warning', category: 'conversion', message: 'No testimonials section', fix: 'Add social proof with testimonials' }); }

    // Check for contact method
    const hasContact = decision.pages.some(p => p.route === '/contact' || p.sections.includes('contact-form'));
    if (!hasContact) { score -= 5; issues.push({ severity: 'info', category: 'conversion', message: 'No contact page or form', fix: 'Add a contact page or form' }); }

    // Check for hero with CTA
    const homePage = decision.pages.find(p => p.route === '/');
    if (homePage && !homePage.sections.includes('hero')) { score -= 10; issues.push({ severity: 'warning', category: 'conversion', message: 'Home page missing hero section', fix: 'Add a hero section with clear value prop and CTA' }); }

    recommendations.push('Place CTAs above the fold on every page');
    recommendations.push('Use action-oriented button text ("Get Started" not "Submit")');
    recommendations.push('Add urgency elements where appropriate');
    recommendations.push('Include social proof near conversion points');

    return Math.max(0, Math.min(100, score));
  }

  private auditMobile(designSystem: DesignSystem, componentPlan: ComponentPlan, issues: AuditIssue[], recommendations: string[]): number {
    let score = 80;

    // Check responsive breakpoints
    if (!designSystem.breakpoints.sm || !designSystem.breakpoints.md || !designSystem.breakpoints.lg) {
      score -= 10;
      issues.push({ severity: 'warning', category: 'mobile', message: 'Incomplete responsive breakpoints', fix: 'Define sm, md, lg, xl breakpoints' });
    }

    // Check container responsiveness
    if (!designSystem.layout.containerClass.includes('px-')) {
      score -= 5;
      issues.push({ severity: 'info', category: 'mobile', message: 'Container may lack mobile padding', fix: 'Ensure container has responsive horizontal padding' });
    }

    // Check for mobile-first grid
    if (!designSystem.layout.gridClass.includes('grid-cols-1')) {
      score -= 5;
      issues.push({ severity: 'warning', category: 'mobile', message: 'Grid may not be mobile-first', fix: 'Start with single column and scale up' });
    }

    // Check touch targets
    if (!designSystem.layout.containerClass.includes('py-')) {
      score -= 3;
      issues.push({ severity: 'info', category: 'mobile', message: 'Verify touch target sizes (min 44px)', fix: 'Ensure buttons and interactive elements are at least 44px' });
    }

    recommendations.push('Test on mobile viewport (375px width)');
    recommendations.push('Ensure all buttons are at least 44px touch targets');
    recommendations.push('Stack grid columns on mobile');
    recommendations.push('Use responsive text sizes (text-3xl md:text-5xl)');

    return Math.max(0, Math.min(100, score));
  }

  private auditPerformance(code: string, issues: AuditIssue[], recommendations: string[]): number {
    let score = 85;

    // Check for external resources
    const externalScripts = (code.match(/src="https?:\/\/[^"]+\.js"/g) || []).length;
    if (externalScripts > 2) { score -= 10; issues.push({ severity: 'warning', category: 'performance', message: `${externalScripts} external scripts loaded`, fix: 'Minimize external script dependencies' }); }

    // Check for large images
    const largeImages = (code.match(/src="[^"]*\.(jpg|png)"/g) || []).length;
    if (largeImages > 5) { score -= 5; issues.push({ severity: 'info', category: 'performance', message: `${largeImages} raster images`, fix: 'Consider using WebP format and lazy loading' }); }

    // Check for lazy loading
    if (code.includes('<img') && !code.includes('loading="lazy"') && !code.includes('Loading=')) {
      score -= 5;
      issues.push({ severity: 'info', category: 'performance', message: 'No lazy loading on images', fix: 'Add loading="lazy" to below-fold images' });
    }

    recommendations.push('Use Next.js Image component for optimization');
    recommendations.push('Add loading="lazy" to below-fold images');
    recommendations.push('Minimize client-side JavaScript');
    recommendations.push('Use font-display: swap for web fonts');

    return Math.max(0, Math.min(100, score));
  }

  private auditContent(decision: ArchitectDecision, issues: AuditIssue[], recommendations: string[]): number {
    let score = 80;

    // Check for meta description
    if (!decision.description || decision.description.length < 20) {
      score -= 10;
      issues.push({ severity: 'warning', category: 'content', message: 'Missing or short meta description', fix: 'Add a descriptive meta description (120-160 chars)' });
    }

    // Check page count
    if (decision.pages.length < 3) {
      score -= 5;
      issues.push({ severity: 'info', category: 'content', message: 'Limited page count', fix: 'Consider adding About, Pricing, or FAQ pages' });
    }

    // Check for content sections
    const totalSections = decision.pages.reduce((sum, p) => sum + p.sections.length, 0);
    if (totalSections < 10) {
      score -= 5;
      issues.push({ severity: 'info', category: 'content', message: 'Limited content sections', fix: 'Add more content sections for richer pages' });
    }

    recommendations.push('Write unique meta descriptions for each page');
    recommendations.push('Use clear, benefit-focused headings');
    recommendations.push('Include relevant keywords naturally in content');
    recommendations.push('Keep paragraphs short and scannable');

    return Math.max(0, Math.min(100, score));
  }

  // ─── Findings helpers ──────────────────────────────────────────

  private getVisualFindings(ds: DesignSystem): string[] {
    return [
      `Typography: ${Object.keys(ds.typography.scale).length} scale levels`,
      `Colors: primary=${ds.colors.primary[500]}, secondary=${ds.colors.secondary[500]}`,
      `Spacing: ${Object.keys(ds.spacing.scale).length} scale values`,
      `Motion: ${ds.motion.transitionDuration} transitions`,
    ];
  }

  private getAccessibilityFindings(code: string): string[] {
    const findings: string[] = [];
    const h1 = (code.match(/<h1[\s>]/g) || []).length;
    const nav = (code.match(/<nav[\s>]/g) || []).length;
    const main = (code.match(/<main[\s>]/g) || []).length;
    const footer = (code.match(/<footer[\s>]/g) || []).length;
    findings.push(`Headings: ${h1} h1, ${nav} nav, ${main} main, ${footer} footer`);
    const imgs = (code.match(/<img[\s>]/g) || []).length;
    const alts = (code.match(/alt="/g) || []).length;
    findings.push(`Images: ${imgs} total, ${alts} with alt text`);
    return findings;
  }

  private getConversionFindings(decision: ArchitectDecision): string[] {
    const sections = new Set<string>();
    decision.pages.forEach(p => p.sections.forEach(s => sections.add(s)));
    return [
      `${decision.pages.length} pages planned`,
      `${sections.size} unique section types`,
      sections.has('cta') ? 'CTA section included' : 'No CTA section',
      sections.has('testimonials') ? 'Social proof included' : 'No social proof',
    ];
  }

  private getMobileFindings(ds: DesignSystem, cp: ComponentPlan): string[] {
    return [
      `Container: ${ds.layout.containerClass}`,
      `Grid: ${ds.layout.gridClass}`,
      `${cp.sharedComponents.length} shared components`,
      `${cp.layoutComponents.length} layout components`,
    ];
  }

  private getPerformanceFindings(code: string): string[] {
    const lines = code.split('\n').length;
    const imgs = (code.match(/<img[\s>]/g) || []).length;
    const btns = (code.match(/<button[\s>]/g) || []).length;
    return [`${lines} lines of code`, `${imgs} images`, `${btns} buttons`];
  }

  private getContentFindings(decision: ArchitectDecision): string[] {
    return [
      `${decision.pages.length} pages`,
      `Business type: ${decision.businessType}`,
      `Name: ${decision.name}`,
      `Description: ${decision.description?.slice(0, 60) || 'none'}`,
    ];
  }
}
