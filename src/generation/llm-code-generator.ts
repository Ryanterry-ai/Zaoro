// ─── LLM Code Generator ──────────────────────────────────────────
// Uses LLM to generate real JSX/HTML code with DesignDNA + DomainSynthesis context
// Falls back to template synthesis when LLM is unavailable

import { LLMGateway } from '../core/llm-gateway.js';
import { type IntentDNA } from './intent-dna.js';
import { type DesignDNA } from './design-dna.js';
import { type DomainSynthesisContext, synthesizeDomainSection } from './domain-synthesizer.js';
import { type AssetPlan } from './asset-intelligence.js';
import { type MotionPlan } from './motion-engine.js';
import { type DesignSystem } from './design-system-generator.js';
import { type ArchitectDecision } from './architect.js';

export interface LLMCodeGeneratorConfig {
  llm: LLMGateway;
  intent: IntentDNA;
  designDNA: DesignDNA;
  domain: DomainSynthesisContext;
  assetPlan: AssetPlan;
  motionPlan: MotionPlan;
  designSystem: DesignSystem;
  decision: ArchitectDecision;
}

function buildSectionPrompt(
  sectionType: string,
  ctx: LLMCodeGeneratorConfig,
): string {
  const { intent, designDNA, domain, assetPlan, motionPlan, designSystem } = ctx;
  const d = domain.data;
  const ds = designSystem;

  // Extract section-specific content from domain data
  let sectionData = '';
  switch (sectionType) {
    case 'hero':
      sectionData = `Hero badge: "${d.hero.badge}"
Headline: "${d.hero.headline}"
Subtitle: "${d.hero.subtitle}"
CTA: "${d.hero.cta}"
CTA Secondary: "${d.hero.ctaSecondary || ''}"`;
      break;
    case 'stats':
    case 'stats-bar':
      sectionData = `Stats: ${JSON.stringify(d.stats)}`;
      break;
    case 'features-grid':
    case 'features':
      sectionData = `Features: ${JSON.stringify(d.features)}`;
      break;
    case 'testimonials':
      sectionData = `Testimonials: ${JSON.stringify(d.testimonials)}`;
      break;
    case 'pricing-table':
    case 'membership-plans':
      sectionData = `Pricing items: ${JSON.stringify(d.items.filter(i => i.price))}`;
      break;
    case 'team':
      sectionData = `Team: ${JSON.stringify(d.team)}`;
      break;
    case 'cta':
      sectionData = `CTA: ${JSON.stringify(d.cta)}`;
      break;
    case 'faq':
      sectionData = `Services/FAQ: ${JSON.stringify(d.services)}`;
      break;
    default:
      sectionData = `Section type: ${sectionType}. Items: ${JSON.stringify(d.items.slice(0, 3))}`;
  }

  // Extract relevant assets
  const sectionAssets = assetPlan.images
    .filter(img => img.purpose.toLowerCase().includes(sectionType) || sectionType === 'hero')
    .slice(0, 3)
    .map(img => `- ${img.query}: ${img.url} (${img.purpose})`)
    .join('\n');

  // Extract relevant motion
  const sectionMotion = motionPlan.sectionAnimations
    .filter(s => s.sectionType.toLowerCase().includes(sectionType) || sectionType === 'hero')
    .slice(0, 1)
    .map(s => `Animation: ${s.enter.animation} (${s.enter.duration}, delay: ${s.enter.delay || '0ms'})`)
    .join('\n');

  return `You are a senior frontend developer. Generate a SINGLE React JSX section for a ${intent.business_domain} app called "${intent.app_name}".

DESIGN SYSTEM (MUST USE EXACTLY):
- Primary color: HSL(${ds.colors.primary[500]}) — use as bg-[hsl(220,90%,60%)] or similar arbitrary Tailwind values
- Accent color: HSL(${ds.colors.accent[500]})
- Background: ${ds.colors.surface.bg}
- Text heading: ${ds.colors.text.heading}
- Text body: ${ds.colors.text.body}
- Text muted: ${ds.colors.text.muted}
- Border: ${ds.colors.border.default}
- Heading font: ${ds.typography.fontFamily.heading}
- Body font: ${ds.typography.fontFamily.body}
- Border radius: ${ds.borders.radius.lg}
- Container: ${ds.layout.containerClass}

BRAND: ${intent.app_name} — ${designDNA.brandPersonality} personality, ${designDNA.designStyle} style
LAYOUT: Hero=${designDNA.layout.heroLayout}, Density=${designDNA.layout.density}, Nav=${designDNA.navigation.type}

SECTION CONTENT (USE THIS EXACT TEXT — DO NOT INVENT PLACEHOLDERS):
${sectionData}

ASSETS (USE THESE URLs IF NEEDED):
${sectionAssets || 'No specific assets — use inline SVG icons'}

MOTION: ${sectionMotion || 'Subtle fade-in on scroll'}

RULES:
1. Output ONLY the JSX code for this section. No imports, no exports, no function wrapper, no markdown.
2. Use Tailwind CSS. Use arbitrary values for exact colors: bg-[hsl(220,90%,60%)]
3. Use the EXACT text provided. No "Lorem ipsum" or placeholder text.
4. Use the brand name "${intent.app_name}" — never "MyApp" or "Dashboard".
5. Visually polished — proper spacing, hierarchy, contrast on dark background.
6. Include hover states and transitions on interactive elements.
7. Semantic HTML (section, h1, h2, p, button).
8. Responsive: md: and lg: breakpoints.
9. Dark theme: zinc-950/zinc-900 backgrounds.
10. Import icons from 'lucide-react' if icons are needed.

OUTPUT: Just the JSX code starting with <section`;
}

function buildPagePrompt(
  sections: string[],
  sectionCodeMap: Map<string, string>,
  ctx: LLMCodeGeneratorConfig,
): string {
  const { intent, designDNA, designSystem } = ctx;
  const ds = designSystem;

  const sectionSummaries = sections
    .map(s => {
      const code = sectionCodeMap.get(s);
      const preview = code ? code.substring(0, 300) + '...' : '(not generated)';
      return `### ${s}\n${preview}`;
    })
    .join('\n\n');

  return `You are a senior frontend developer. Generate a complete Next.js page for "${intent.app_name}" — a ${intent.business_domain} application.

DESIGN SYSTEM:
- Primary: HSL(${ds.colors.primary[500]})
- Background: ${ds.colors.surface.bg}
- Text: ${ds.colors.text.heading}
- Container: ${ds.layout.containerClass}
- Font heading: ${ds.typography.fontFamily.heading}
- Font body: ${ds.typography.fontFamily.body}

BRAND: ${intent.app_name} — ${designDNA.brandPersonality} personality

SECTIONS (in order): ${sections.join(', ')}

SECTION CODE (already generated — incorporate as-is):
${sectionSummaries}

RULES:
1. Output a complete 'use client' React component with import statements.
2. Compose the sections in order inside a <main> tag.
3. Add a Navbar with "${intent.app_name}" logo and navigation links.
4. Add a Footer with copyright.
5. Use the exact design system colors.
6. NO placeholder text — use the section code above.
7. Proper spacing between sections (py-16 to py-24).

OUTPUT: Complete page.tsx content`;
}

export async function generateSectionWithLLM(
  sectionType: string,
  ctx: LLMCodeGeneratorConfig,
): Promise<string | null> {
  try {
    const prompt = buildSectionPrompt(sectionType, ctx);
    const code = await ctx.llm.generateText(prompt, {
      temperature: 0.4,
      maxTokens: 4000,
    });

    // Clean up markdown code fences if present
    let cleaned = code.replace(/```(?:tsx?|jsx?|javascript)?\n/g, '').replace(/```$/g, '').trim();

    // Validate it looks like JSX
    if (!cleaned.includes('<') || !cleaned.includes('className')) {
      console.warn(`[llm-code-gen] Section "${sectionType}" output doesn't look like JSX, using fallback`);
      return null;
    }

    return cleaned;
  } catch (err: any) {
    console.warn(`[llm-code-gen] LLM failed for section "${sectionType}": ${err.message}`);
    return null;
  }
}

export async function generatePageWithLLM(
  sections: string[],
  sectionCodeMap: Map<string, string>,
  ctx: LLMCodeGeneratorConfig,
): Promise<string | null> {
  try {
    const prompt = buildPagePrompt(sections, sectionCodeMap, ctx);
    const code = await ctx.llm.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 8000,
    });

    let cleaned = code.replace(/```(?:tsx?|jsx?|javascript)?\n/g, '').replace(/```$/g, '').trim();

    if (!cleaned.includes('use client') && !cleaned.includes('export default')) {
      console.warn(`[llm-code-gen] Page output doesn't look like a React component, using fallback`);
      return null;
    }

    return cleaned;
  } catch (err: any) {
    console.warn(`[llm-code-gen] LLM failed for page generation: ${err.message}`);
    return null;
  }
}
