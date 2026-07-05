import { AgentReachBridge } from '../business-intelligence/core/agent-reach-bridge.js';
import type { CrawlResult } from '../business-intelligence/core/agent-reach-bridge.js';
import type { WebContent } from '../business-intelligence/core/web-searcher.js';
import * as fs from 'fs';
import * as path from 'path';

// Extended WebContent with html property for crawling
interface CrawlPage extends WebContent {
  html?: string;
}

interface CrawlPage {
  url: string;
  title: string;
  text: string;
  html?: string;
  links: Array<{ text: string; href: string }>;
  images: Array<{ alt: string; src: string }>;
}

// ─── Scraped Reference Data Types ──────────────────────────────────

export interface ScrapedReference {
  url: string;
  businessName: string;
  industry: string;
  scrapedAt: Date;
  assets: ScrapedAssets;
  dataModels: ScrapedDataModel[];
  animations: ScrapedAnimation[];
  componentStructure: ScrapedComponent[];
  designSystem: ScrapedDesignSystem;
  content: ScrapedContent;
}

export interface ScrapedAssets {
  images: ScrapedImage[];
  svgs: ScrapedSVG[];
  videos: ScrapedVideo[];
  icons: ScrapedIcon[];
}

export interface ScrapedImage {
  id: string;
  url: string;
  localPath: string;
  alt: string;
  width: number;
  height: number;
  purpose: 'hero' | 'product' | 'team' | 'feature' | 'background' | 'logo' | 'testimonial';
  downloaded: boolean;
}

export interface ScrapedSVG {
  id: string;
  name: string;
  svgContent: string;
  viewBox: string;
  purpose: 'logo' | 'illustration' | 'icon' | 'decoration' | 'interactive';
  animated: boolean;
}

export interface ScrapedVideo {
  id: string;
  url: string;
  poster: string;
  purpose: 'hero' | 'background' | 'product' | 'tutorial';
}

export interface ScrapedIcon {
  name: string;
  library: 'lucide' | 'heroicons' | 'tabler' | 'custom-svg';
  svg: string;
  size: string;
}

export interface ScrapedDataModel {
  name: string;
  typeName: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  sampleData: Record<string, any>[];
  source: 'inline' | 'inferred';
}

export interface ScrapedAnimation {
  id: string;
  type: 'framer-motion' | 'css' | 'gsap' | 'lottie';
  trigger: 'mount' | 'hover' | 'click' | 'scroll' | 'stagger' | 'loop';
  code: string;
  description: string;
  component: string;
}

export interface ScrapedComponent {
  name: string;
  type: string;
  props: string[];
  children: string[];
  hasState: boolean;
  hasAnimation: boolean;
  hasImages: boolean;
  complexity: 'simple' | 'medium' | 'complex';
  code: string;
}

export interface ScrapedDesignSystem {
  colors: Record<string, string>;
  typography: {
    fonts: string[];
    fontSizes: string[];
    fontWeights: string[];
  };
  spacing: string[];
  borderRadius: string[];
  shadows: string[];
  gradients: string[];
}

export interface ScrapedContent {
  headlines: string[];
  taglines: string[];
  descriptions: string[];
  testimonials: string[];
  features: string[];
  ctas: string[];
  pricing: string[];
  faqPairs: Array<{ q: string; a: string }>;
}

// ─── Reference Scraper Agent ───────────────────────────────────────

export class ReferenceScraper {
  private reach: AgentReachBridge;

  constructor() {
    this.reach = new AgentReachBridge();
  }

  /**
   * Scrape a reference website for all assets, data models, animations,
   * component structures, and design patterns.
   */
  async scrapeReference(url: string, workspaceDir: string): Promise<ScrapedReference> {
    console.log(`[reference-scraper] Scraping: ${url}`);

    const crawl = await this.reach.crawlWebsite(url, 5);
    const allText = crawl.pages.map(p => p.text).join('\n');
    const allHtml = crawl.pages.map(p => p.text).join('\n'); // WebContent has text, not html

    const reference: ScrapedReference = {
      url,
      businessName: this.extractBusinessName(crawl),
      industry: this.inferIndustry(allText),
      scrapedAt: new Date(),
      assets: await this.scrapeAssets(crawl, workspaceDir),
      dataModels: this.extractDataModels(allText, crawl),
      animations: this.extractAnimations(allHtml),
      componentStructure: this.extractComponents(allHtml, allText),
      designSystem: this.extractDesignSystem(allHtml, allText),
      content: this.extractContent(allText, crawl),
    };

    console.log(`[reference-scraper] Complete: ${reference.assets.images.length} images, ${reference.dataModels.length} data models, ${reference.animations.length} animations, ${reference.componentStructure.length} components`);

    return reference;
  }

  // ─── Asset Scraping ───────────────────────────────────────────────

  private async scrapeAssets(crawl: CrawlResult, workspaceDir: string): Promise<ScrapedAssets> {
    const assets: ScrapedAssets = {
      images: [],
      svgs: [],
      videos: [],
      icons: [],
    };

    for (const page of crawl.pages) {
      const html = page.text; // WebContent has text, not html

      // Extract images
      const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi) || [];
      for (const imgTag of imgMatches) {
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
        const widthMatch = imgTag.match(/width=["'](\d+)["']/i);
        const heightMatch = imgTag.match(/height=["'](\d+)["']/i);

        if (srcMatch?.[1]) {
          const src = srcMatch[1];
          const fullUrl = src.startsWith('http') ? src : new URL(src, page.url).href;
          assets.images.push({
            id: `img-${assets.images.length}`,
            url: fullUrl,
            localPath: `/assets/images/${path.basename(fullUrl).split('?')[0]}`,
            alt: altMatch?.[1] || '',
            width: parseInt(widthMatch?.[1] || '800'),
            height: parseInt(heightMatch?.[1] || '600'),
            purpose: this.inferImagePurpose(src, altMatch?.[1] || ''),
            downloaded: false,
          });
        }
      }

      // Extract SVGs
      const svgMatches = html.match(/<svg[^>]*>[\s\S]*?<\/svg>/gi) || [];
      for (const svgContent of svgMatches) {
        const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i);
        const idMatch = svgContent.match(/id=["']([^"']+)["']/i);
        assets.svgs.push({
          id: `svg-${assets.svgs.length}`,
          name: idMatch?.[1] || `svg-${assets.svgs.length}`,
          svgContent,
          viewBox: viewBoxMatch?.[1] || '0 0 24 24',
          purpose: this.inferSVGPurpose(svgContent),
          animated: svgContent.includes('animate') || svgContent.includes('animation'),
        });
      }

      // Extract videos
      const videoMatches = html.match(/<video[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
      for (const videoTag of videoMatches) {
        const srcMatch = videoTag.match(/src=["']([^"']+)["']/i);
        const posterMatch = videoTag.match(/poster=["']([^"']+)["']/i);
        if (srcMatch?.[1]) {
          assets.videos.push({
            id: `video-${assets.videos.length}`,
            url: srcMatch[1],
            poster: posterMatch?.[1] || '',
            purpose: 'hero',
          });
        }
      }

      // Extract icon usage (lucide, heroicons, etc.)
      const lucideMatches = html.match(/<[^>]*(?:Lucide|lucide)[^>]*>/gi) || [];
      for (const iconTag of lucideMatches) {
        const nameMatch = iconTag.match(/name=["']([A-Z][a-zA-Z]+)["']/i);
        if (nameMatch?.[1]) {
          assets.icons.push({
            name: nameMatch[1],
            library: 'lucide',
            svg: '',
            size: 'md',
          });
        }
      }
    }

    return assets;
  }

  // ─── Data Model Extraction ────────────────────────────────────────

  private extractDataModels(text: string, crawl: CrawlResult): ScrapedDataModel[] {
    const models: ScrapedDataModel[] = [];

    // Look for TypeScript interface/type definitions in page content
    const interfacePattern = /(?:interface|type)\s+(\w+)\s*(?:=\s*)?\{([^}]+)\}/g;
    let match;

    for (const page of crawl.pages) {
      const html = (page as CrawlPage).html || '';
      while ((match = interfacePattern.exec(html)) !== null) {
        const name = match[1];
        const body = match[2];

        if (name && body && !['Props', 'State', 'Context', 'Ref'].includes(name)) {
          const fields = this.parseInterfaceFields(body);
          const sampleData = this.generateSampleData(name, fields);

          models.push({
            name,
            typeName: name,
            fields,
            sampleData,
            source: 'inline',
          });
        }
      }
    }

    // Infer data models from content structure
    const inferredModels = this.inferDataModelsFromContent(text);
    models.push(...inferredModels);

    return models;
  }

  private parseInterfaceFields(body: string): Array<{ name: string; type: string; required: boolean; description: string }> {
    const fields: Array<{ name: string; type: string; required: boolean; description: string }> = [];
    const lines = body.split('\n');

    for (const line of lines) {
      const fieldMatch = line.match(/^\s*(\w+)\s*(\?)?\s*:\s*([^;]+)/);
      if (fieldMatch?.[1]) {
        const fieldType = fieldMatch[3]?.trim();
        fields.push({
          name: fieldMatch[1],
          type: fieldType ? String(fieldType) : 'string',
          required: !fieldMatch[2],
          description: '',
        });
      }
    }

    return fields;
  }

  private generateSampleData(typeName: string, fields: Array<{ name: string; type: string }>): Record<string, any>[] {
    const samples: Record<string, any>[] = [];
    const count = Math.min(3, Math.max(1, fields.length));

    for (let i = 0; i < count; i++) {
      const sample: Record<string, any> = {};
      for (const field of fields) {
        sample[field.name] = this.generateSampleValue(field.name, field.type, i);
      }
      samples.push(sample);
    }

    return samples;
  }

  private generateSampleValue(fieldName: string, type: string, index: number): any {
    const lower = fieldName.toLowerCase();

    // Smart defaults based on field name
    if (lower.includes('name') || lower.includes('title')) return `Sample ${fieldName} ${index + 1}`;
    if (lower.includes('description') || lower.includes('text') || lower.includes('body')) return `This is a sample ${fieldName} for demonstration purposes.`;
    if (lower.includes('price') || lower.includes('cost') || lower.includes('amount')) return 99.99 + index * 10;
    if (lower.includes('id')) return `id-${index + 1}`;
    if (lower.includes('url') || lower.includes('link') || lower.includes('href')) return `https://example.com/${fieldName}/${index + 1}`;
    if (lower.includes('image') || lower.includes('img') || lower.includes('photo') || lower.includes('avatar')) return `https://picsum.photos/seed/${fieldName}${index + 1}/400/300`;
    if (lower.includes('email')) return `user${index + 1}@example.com`;
    if (lower.includes('phone')) return `+1-555-000-${1000 + index}`;
    if (lower.includes('date') || lower.includes('time') || lower.includes('created') || lower.includes('updated')) return new Date(Date.now() - index * 86400000).toISOString();
    if (lower.includes('rating') || lower.includes('score')) return 4 + Math.random();
    if (lower.includes('count') || lower.includes('total') || lower.includes('quantity')) return 10 + index * 5;
    if (lower.includes('active') || lower.includes('enabled') || lower.includes('published')) return true;
    if (lower.includes('tags') || lower.includes('categories')) return ['tag1', 'tag2'];
    if (type.includes('string[]')) return ['item1', 'item2', 'item3'];
    if (type.includes('number')) return 42;
    if (type.includes('boolean')) return true;
    if (type.includes('string')) return `Sample value`;
    return `Sample value`;
  }

  private inferDataModelsFromContent(text: string): ScrapedDataModel[] {
    const models: ScrapedDataModel[] = [];

    // Detect product/item patterns
    if (text.match(/product|item|collection|catalog/i)) {
      models.push({
        name: 'Product',
        typeName: 'Product',
        fields: [
          { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
          { name: 'name', type: 'string', required: true, description: 'Product name' },
          { name: 'description', type: 'string', required: true, description: 'Product description' },
          { name: 'price', type: 'number', required: true, description: 'Product price' },
          { name: 'image', type: 'string', required: true, description: 'Product image URL' },
          { name: 'category', type: 'string', required: false, description: 'Product category' },
          { name: 'features', type: 'string[]', required: false, description: 'Product features' },
        ],
        sampleData: [],
        source: 'inferred',
      });
    }

    // Detect testimonial patterns
    if (text.match(/testimonial|review|feedback|quote/i)) {
      models.push({
        name: 'Testimonial',
        typeName: 'Testimonial',
        fields: [
          { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
          { name: 'name', type: 'string', required: true, description: 'Reviewer name' },
          { name: 'role', type: 'string', required: true, description: 'Reviewer role/title' },
          { name: 'quote', type: 'string', required: true, description: 'Testimonial quote' },
          { name: 'rating', type: 'number', required: false, description: 'Rating out of 5' },
          { name: 'avatar', type: 'string', required: false, description: 'Avatar image URL' },
        ],
        sampleData: [],
        source: 'inferred',
      });
    }

    // Detect team/ambassador patterns
    if (text.match(/team|member|ambassador|expert|coach/i)) {
      models.push({
        name: 'TeamMember',
        typeName: 'TeamMember',
        fields: [
          { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
          { name: 'name', type: 'string', required: true, description: 'Full name' },
          { name: 'role', type: 'string', required: true, description: 'Job title' },
          { name: 'bio', type: 'string', required: false, description: 'Biography' },
          { name: 'image', type: 'string', required: true, description: 'Photo URL' },
          { name: 'social', type: 'Record<string, string>', required: false, description: 'Social links' },
        ],
        sampleData: [],
        source: 'inferred',
      });
    }

    // Detect pricing patterns
    if (text.match(/pricing|plan|tier|subscription/i)) {
      models.push({
        name: 'PricingTier',
        typeName: 'PricingTier',
        fields: [
          { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
          { name: 'name', type: 'string', required: true, description: 'Tier name' },
          { name: 'price', type: 'string', required: true, description: 'Price display' },
          { name: 'interval', type: 'string', required: true, description: 'Billing interval' },
          { name: 'features', type: 'string[]', required: true, description: 'Included features' },
          { name: 'highlighted', type: 'boolean', required: false, description: 'Is recommended tier' },
        ],
        sampleData: [],
        source: 'inferred',
      });
    }

    // Detect FAQ patterns
    if (text.match(/faq|frequently asked|questions/i)) {
      models.push({
        name: 'FAQ',
        typeName: 'FAQ',
        fields: [
          { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
          { name: 'question', type: 'string', required: true, description: 'Question text' },
          { name: 'answer', type: 'string', required: true, description: 'Answer text' },
          { name: 'category', type: 'string', required: false, description: 'FAQ category' },
        ],
        sampleData: [],
        source: 'inferred',
      });
    }

    return models;
  }

  // ─── Animation Extraction ─────────────────────────────────────────

  private extractAnimations(html: string): ScrapedAnimation[] {
    const animations: ScrapedAnimation[] = [];

    // Extract Framer Motion patterns
    const motionPatterns = html.match(/motion\.\w+\([^)]*\)/gi) || [];
    for (const pattern of motionPatterns) {
      const componentMatch = pattern.match(/motion\.(\w+)/i);
      if (componentMatch?.[1]) {
        animations.push({
          id: `framer-${animations.length}`,
          type: 'framer-motion',
          trigger: this.inferTrigger(pattern),
          code: pattern,
          description: `Framer Motion ${componentMatch[1]} animation`,
          component: componentMatch[1],
        });
      }
    }

    // Extract CSS animations
    const cssAnimations = html.match(/animation:\s*[^;]+/gi) || [];
    for (const anim of cssAnimations) {
      animations.push({
        id: `css-${animations.length}`,
        type: 'css',
        trigger: 'mount',
        code: anim,
        description: 'CSS animation',
        component: 'div',
      });
    }

    // Extract @keyframes
    const keyframes = html.match(/@keyframes\s+(\w+)[^}]*\{[^}]+\}/gi) || [];
    for (const kf of keyframes) {
      const nameMatch = kf.match(/@keyframes\s+(\w+)/i);
      if (nameMatch?.[1]) {
        animations.push({
          id: `keyframes-${nameMatch[1]}`,
          type: 'css',
          trigger: 'loop',
          code: kf,
          description: `Keyframes animation: ${nameMatch[1]}`,
          component: 'div',
        });
      }
    }

    // Extract AnimatePresence
    const animatePresence = html.match(/<AnimatePresence[^>]*>[\s\S]*?<\/AnimatePresence>/gi) || [];
    for (const ap of animatePresence) {
      animations.push({
        id: `presence-${animations.length}`,
        type: 'framer-motion',
        trigger: 'mount',
        code: ap.substring(0, 200),
        description: 'AnimatePresence exit animation',
        component: 'div',
      });
    }

    return animations;
  }

  private inferTrigger(code: string): 'mount' | 'hover' | 'click' | 'scroll' | 'stagger' | 'loop' {
    if (code.includes('whileHover') || code.includes('hover')) return 'hover';
    if (code.includes('whileTap') || code.includes('click')) return 'click';
    if (code.includes('whileInView') || code.includes('scroll')) return 'scroll';
    if (code.includes('stagger') || code.includes('variants')) return 'stagger';
    if (code.includes('animate') || code.includes('loop')) return 'loop';
    return 'mount';
  }

  // ─── Component Structure Extraction ───────────────────────────────

  private extractComponents(html: string, text: string): ScrapedComponent[] {
    const components: ScrapedComponent[] = [];

    // Detect section components from HTML structure
    const sectionPatterns = [
      { pattern: /<(?:section|div)[^>]*id=["']hero["'][^>]*>/gi, type: 'hero' },
      { pattern: /<(?:section|div)[^>]*id=["']collections?["'][^>]*>/gi, type: 'collections' },
      { pattern: /<(?:section|div)[^>]*id=["']customizer["'][^>]*>/gi, type: 'customizer' },
      { pattern: /<(?:section|div)[^>]*id=["']story["'][^>]*>/gi, type: 'story' },
      { pattern: /<(?:section|div)[^>]*id=["']craftsmanship["'][^>]*>/gi, type: 'craftsmanship' },
      { pattern: /<(?:section|div)[^>]*id=["']dealers?["'][^>]*>/gi, type: 'dealers' },
      { pattern: /<(?:section|div)[^>]*id=["']testimonials?["'][^>]*>/gi, type: 'testimonials' },
      { pattern: /<(?:section|div)[^>]*id=["']contact["'][^>]*>/gi, type: 'contact' },
      { pattern: /<(?:section|div)[^>]*id=["']footer["'][^>]*>/gi, type: 'footer' },
    ];

    for (const { pattern, type } of sectionPatterns) {
      const match = html.match(pattern);
      if (match) {
        components.push({
          name: type.charAt(0).toUpperCase() + type.slice(1),
          type,
          props: this.inferProps(type, text),
          children: [],
          hasState: html.includes('useState'),
          hasAnimation: html.includes('motion.'),
          hasImages: html.includes('<img'),
          complexity: this.inferComplexity(type, html),
          code: '',
        });
      }
    }

    return components;
  }

  private inferProps(type: string, text: string): string[] {
    const propsMap: Record<string, string[]> = {
      hero: ['onExplore', 'onCustomize'],
      collections: ['onSelectWatchForInquiry', 'onNavigateToCustomizer'],
      customizer: ['onReserveCustomBuild'],
      story: [],
      craftsmanship: [],
      dealers: ['onBookAtBoutique'],
      testimonials: [],
      contact: ['prefilledWatch', 'prefilledBoutique'],
      footer: ['onNavigate'],
    };
    return propsMap[type] || [];
  }

  private inferComplexity(type: string, html: string): 'simple' | 'medium' | 'complex' {
    if (type === 'customizer' || type === 'dealers') return 'complex';
    if (type === 'hero' || type === 'testimonials') return 'medium';
    return 'simple';
  }

  // ─── Design System Extraction ─────────────────────────────────────

  private extractDesignSystem(html: string, text: string): ScrapedDesignSystem {
    return {
      colors: this.extractColors(html, text),
      typography: this.extractTypography(html),
      spacing: this.extractSpacing(html),
      borderRadius: this.extractBorderRadius(html),
      shadows: this.extractShadows(html),
      gradients: this.extractGradients(html),
    };
  }

  private extractColors(html: string, text: string): Record<string, string> {
    const colors: Record<string, string> = {};

    // Extract hex colors
    const hexColors = html.match(/#[0-9a-fA-F]{6}/g) || [];
    for (const hex of hexColors) {
      colors[hex] = hex;
    }

    // Extract HSL colors
    const hslColors = html.match(/hsl\([^)]+\)/g) || [];
    for (const hsl of hslColors) {
      colors[hsl] = hsl;
    }

    // Extract Tailwind color classes
    const colorClasses = html.match(/(?:bg|text|border|from|to|via)-(red|blue|green|purple|amber|emerald|violet|indigo|cyan|orange|pink|rose|teal|sky|lime|fuchsia|slate|zinc|gray|stone|neutral|gold)-\d+/g) || [];
    for (const cls of colorClasses) {
      colors[cls] = cls;
    }

    return colors;
  }

  private extractTypography(html: string): ScrapedDesignSystem['typography'] {
    const fonts: string[] = [];
    const fontSizes: string[] = [];
    const fontWeights: string[] = [];

    // Extract font families
    const fontFamilies = html.match(/font-(?:family|sans|serif|mono)[^"]*["']([^"']+)["']/gi) || [];
    for (const ff of fontFamilies) {
      const match = ff.match(/["']([^"']+)["']/);
      if (match?.[1]) fonts.push(match[1]);
    }

    // Extract Google Fonts
    const googleFonts = html.match(/fonts\.googleapis\.com[^"']*/gi) || [];
    for (const gf of googleFonts) {
      fonts.push(gf);
    }

    // Extract font sizes from Tailwind classes
    const fontSizeClasses = html.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/gi) || [];
    fontSizes.push(...fontSizeClasses);

    // Extract font weights
    const fontWeightClasses = html.match(/font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/gi) || [];
    fontWeights.push(...fontWeightClasses);

    return {
      fonts: [...new Set(fonts)],
      fontSizes: [...new Set(fontSizes)],
      fontWeights: [...new Set(fontWeights)],
    };
  }

  private extractSpacing(html: string): string[] {
    const spacing: string[] = [];
    const spacingClasses = html.match(/(?:p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|space)-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96)/gi) || [];
    spacing.push(...spacingClasses);
    return [...new Set(spacing)];
  }

  private extractBorderRadius(html: string): string[] {
    const radius: string[] = [];
    const radiusClasses = html.match(/rounded-(none|sm|md|lg|xl|2xl|3xl|full)/gi) || [];
    radius.push(...radiusClasses);
    return [...new Set(radius)];
  }

  private extractShadows(html: string): string[] {
    const shadows: string[] = [];
    const shadowClasses = html.match(/shadow-(sm|md|lg|xl|2xl|inner|none)/gi) || [];
    shadows.push(...shadowClasses);
    return [...new Set(shadows)];
  }

  private extractGradients(html: string): string[] {
    const gradients: string[] = [];
    const gradientClasses = html.match(/(?:bg|from|to|via)-gradient-to-(?:r|l|t|b|tl|tr|bl|br)/gi) || [];
    gradients.push(...gradientClasses);
    return [...new Set(gradients)];
  }

  // ─── Content Extraction ───────────────────────────────────────────

  private extractContent(text: string, crawl: CrawlResult): ScrapedContent {
    return {
      headlines: this.extractHeadlines(text),
      taglines: this.extractTaglines(text),
      descriptions: this.extractDescriptions(text),
      testimonials: this.extractTestimonials(text),
      features: this.extractFeatures(text),
      ctas: this.extractCTAs(text),
      pricing: this.extractPricing(text),
      faqPairs: this.extractFAQs(text),
    };
  }

  private extractHeadlines(text: string): string[] {
    const headlines: string[] = [];
    const h1Matches = text.match(/^.{10,100}$/gm) || [];
    for (const h of h1Matches) {
      if (h.trim().length > 10 && !h.includes('{') && !h.includes('import')) {
        headlines.push(h.trim());
      }
    }
    return [...new Set(headlines)].slice(0, 10);
  }

  private extractTaglines(text: string): string[] {
    const taglines: string[] = [];
    const patterns = [
      /(?:tagline|subtitle|slogan)[:\s]+["']?([^"'\n]{10,100})["']?/gi,
      /^[A-Z][a-z]+ [a-z]+ [a-z]+ [a-z]+$/gm,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) taglines.push(match[1].trim());
      }
    }
    return [...new Set(taglines)].slice(0, 5);
  }

  private extractDescriptions(text: string): string[] {
    const descriptions: string[] = [];
    const sentences = text.match(/[A-Z][^.!?]{20,200}[.!?]/g) || [];
    for (const s of sentences) {
      if (s.length > 30 && !s.includes('{') && !s.includes('import')) {
        descriptions.push(s.trim());
      }
    }
    return [...new Set(descriptions)].slice(0, 10);
  }

  private extractTestimonials(text: string): string[] {
    const testimonials: string[] = [];
    const quotePatterns = [
      /"([^"]{20,300})"/g,
      /(?:testimonial|review|said|wrote|feedback)[:\s]+["']?([^"']{20,200})["']?/gi,
    ];
    for (const pattern of quotePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const quote = match[1]?.trim();
        if (quote && quote.length > 20) testimonials.push(quote);
      }
    }
    return [...new Set(testimonials)].slice(0, 8);
  }

  private extractFeatures(text: string): string[] {
    const features: string[] = [];
    const featurePatterns = [
      /(?:features?|capabilities|what we|why choose)[:\s]+([^\n]{10,200})/gi,
      /[•\-\*]\s*([^\n]{5,80})/g,
    ];
    for (const pattern of featurePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) features.push(match[1].trim());
      }
    }
    return [...new Set(features)].slice(0, 15);
  }

  private extractCTAs(text: string): string[] {
    const ctas: string[] = [];
    const ctaPatterns = [
      /(?:get started|sign up|book now|contact us|learn more|try free|join now|subscribe|download|schedule a call|request a demo|start free trial|buy now|add to cart|shop now|explore|discover|start building|launch)/gi,
    ];
    for (const pattern of ctaPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        ctas.push(match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase());
      }
    }
    return [...new Set(ctas)].slice(0, 8);
  }

  private extractPricing(text: string): string[] {
    const pricing: string[] = [];
    const priceMatches = text.match(/\$[\d,]+(?:\.\d{2})?(?:\/mo|\/year|\/mo\.|\/yr|\/month)?/g) || [];
    pricing.push(...priceMatches);
    return [...new Set(pricing)].slice(0, 10);
  }

  private extractFAQs(text: string): Array<{ q: string; a: string }> {
    const faqs: Array<{ q: string; a: string }> = [];
    const faqPattern = /([A-Z][^?]{10,80})\?\s*\n?\s*([A-Z][^.\n]{20,200})/g;
    let match;
    while ((match = faqPattern.exec(text)) !== null) {
      if (match[1] && match[2]) {
        faqs.push({
          q: match[1].trim() + '?',
          a: match[2].trim(),
        });
      }
    }
    return faqs.slice(0, 8);
  }

  // ─── Helper Methods ───────────────────────────────────────────────

  private extractBusinessName(crawl: CrawlResult): string {
    const title = crawl.pages[0]?.title || '';
    const nameMatch = title.match(/^([A-Z][A-Za-z0-9\s&.'-]+?)(?:\s*[-|–]\s*|$)/);
    return nameMatch?.[1]?.trim() || 'Business';
  }

  private inferIndustry(text: string): string {
    const lower = text.toLowerCase();
    if (lower.match(/watch|horology|timepiece|luxury|geneva|swiss/)) return 'luxury';
    if (lower.match(/restaurant|cafe|food|dining|menu/)) return 'restaurant';
    if (lower.match(/fitness|gym|yoga|workout/)) return 'fitness';
    if (lower.match(/software|saas|platform|dashboard/)) return 'saas';
    if (lower.match(/ecommerce|store|shop|product/)) return 'ecommerce';
    if (lower.match(/healthcare|clinic|medical|doctor/)) return 'healthcare';
    if (lower.match(/education|course|learning|school/)) return 'education';
    return 'general';
  }

  private inferImagePurpose(src: string, alt: string): ScrapedImage['purpose'] {
    const lower = (src + ' ' + alt).toLowerCase();
    if (lower.includes('hero') || lower.includes('banner')) return 'hero';
    if (lower.includes('product') || lower.includes('item')) return 'product';
    if (lower.includes('team') || lower.includes('member') || lower.includes('person')) return 'team';
    if (lower.includes('feature') || lower.includes('icon')) return 'feature';
    if (lower.includes('logo') || lower.includes('brand')) return 'logo';
    if (lower.includes('background') || lower.includes('bg')) return 'background';
    return 'feature';
  }

  private inferSVGPurpose(svg: string): ScrapedSVG['purpose'] {
    const lower = svg.toLowerCase();
    if (lower.includes('logo') || lower.includes('brand')) return 'logo';
    if (lower.includes('icon')) return 'icon';
    if (lower.includes('animate') || lower.includes('interactive')) return 'interactive';
    if (lower.includes('decoration') || lower.includes('pattern')) return 'decoration';
    return 'illustration';
  }
}
