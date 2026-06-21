import { WebsiteAnalysis, ExtractedRoute, ExtractedComponent, ExtractedAsset, DesignTokens, BusinessType } from './types.js';
import { BusinessClassifier } from './business-classifier.js';

export class WebsiteAnalyzer {
  private classifier: BusinessClassifier;

  constructor() {
    this.classifier = new BusinessClassifier();
  }

  /**
   * Create a WebsiteAnalysis from structured metadata.
   * This is the architecture-only interface. Actual HTML/DOM scraping
   * will be implemented in a future phase using Playwright.
   */
  createAnalysis(params: {
    domain?: string;
    url?: string;
    title?: string;
    description?: string;
    technologies?: string[];
    routes?: ExtractedRoute[];
    assets?: ExtractedAsset[];
    components?: ExtractedComponent[];
    designTokens?: DesignTokens;
    metadata?: Record<string, string>;
  }): WebsiteAnalysis {
    const domain = params.domain || 'unknown';
    const url = params.url || `https://${domain}`;
    const title = params.title || 'Unknown Website';

    const classifierResult = this.classifier.classify({
      title,
      description: params.description || '',
      domain,
      url,
      routes: params.routes?.map((r) => r.path) ?? [],
      technologies: params.technologies ?? [],
    });

    return {
      domain,
      url,
      title,
      description: params.description || '',
      businessType: classifierResult.type,
      technologies: params.technologies || [],
      routes: params.routes || [],
      designTokens: params.designTokens || emptyDesignTokens(),
      assets: params.assets || [],
      components: params.components || [],
      metadata: params.metadata || {},
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Analyze from HTML content (architecture contract).
   * Future implementation will parse actual HTML with a DOM parser.
   */
  analyzeFromHtml(params: {
    url: string;
    html: string;
  }): WebsiteAnalysis {
    const domain = this.extractDomain(params.url);
    const title = this.extractTitle(params.html);
    const description = this.extractDescription(params.html);
    const technologies = this.detectTechnologies(params.html);
    const routes = this.extractRoutes(params.html, params.url);
    const assets = this.extractAssets(params.html, params.url);
    const designTokens = this.extractDesignTokens(params.html);

    return this.createAnalysis({
      domain,
      url: params.url,
      title,
      description,
      technologies,
      routes,
      assets,
      designTokens,
    });
  }

  /**
   * Merge multiple analyses into a unified view.
   */
  merge(analyses: WebsiteAnalysis[]): WebsiteAnalysis {
    if (analyses.length === 0) {
      throw new Error('Cannot merge zero analyses');
    }

    const primary = analyses[0]!;
    const allRoutes = new Map<string, ExtractedRoute>();
    const allAssets = new Map<string, ExtractedAsset>();
    const allComponents = new Map<string, ExtractedComponent>();
    const allTech = new Set(primary.technologies);
    const allMetadata = { ...primary.metadata };

    for (const analysis of analyses) {
      for (const route of analysis.routes) {
        allRoutes.set(route.path, route);
      }
      for (const asset of analysis.assets) {
        allAssets.set(asset.url, asset);
      }
      for (const comp of analysis.components) {
        allComponents.set(comp.name, comp);
      }
      for (const tech of analysis.technologies) {
        allTech.add(tech);
      }
      Object.assign(allMetadata, analysis.metadata);
    }

    return {
      ...primary,
      routes: [...allRoutes.values()],
      assets: [...allAssets.values()],
      components: [...allComponents.values()],
      technologies: [...allTech],
      metadata: allMetadata,
    };
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  private extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match?.[1]?.trim() || 'Unknown Website';
  }

  private extractDescription(html: string): string {
    const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    return match?.[1]?.trim() || '';
  }

  private detectTechnologies(html: string): string[] {
    const techs: string[] = [];

    if (html.includes('next') || html.includes('__next')) techs.push('Next.js');
    if (html.includes('react') || html.includes('__REACT')) techs.push('React');
    if (html.includes('vue') || html.includes('__VUE')) techs.push('Vue.js');
    if (html.includes('angular') || html.includes('ng-')) techs.push('Angular');
    if (html.includes('svelte')) techs.push('Svelte');
    if (html.includes('tailwind') || html.includes('tailwindcss')) techs.push('Tailwind CSS');
    if (html.includes('bootstrap')) techs.push('Bootstrap');
    if (html.includes('wordpress') || html.includes('wp-content')) techs.push('WordPress');
    if (html.includes('shopify') || html.includes('Shopify')) techs.push('Shopify');
    if (html.includes('woocommerce')) techs.push('WooCommerce');
    if (html.includes('prismic') || html.includes('prismicio')) techs.push('Prismic');
    if (html.includes('contentful')) techs.push('Contentful');
    if (html.includes('sanity') || html.includes('sanity.io')) techs.push('Sanity');
    if (html.includes('vercel')) techs.push('Vercel');
    if (html.includes('netlify')) techs.push('Netlify');
    if (html.includes('cloudflare')) techs.push('Cloudflare');

    return techs;
  }

  private extractRoutes(html: string, baseUrl: string): ExtractedRoute[] {
    const routes: ExtractedRoute[] = [];
    const linkRegex = /href=["']([^"']+)["']/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;

      try {
        const url = new URL(href, baseUrl);
        const routePath = url.pathname;

        if (routePath === '/') {
          routes.push({ path: '/', title: 'Home', type: 'page' });
        } else if (!routes.some((r) => r.path === routePath)) {
          const segments = routePath.split('/').filter(Boolean);
          const lastSegment = segments[segments.length - 1] || routePath;
          routes.push({
            path: routePath,
            title: lastSegment.replace(/-/g, ' '),
            type: routePath.startsWith('/api/') ? 'api' : 'page',
          });
        }
      } catch {
        // Invalid URL, skip
      }
    }

    return routes;
  }

  private extractAssets(html: string, baseUrl: string): ExtractedAsset[] {
    const assets: ExtractedAsset[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      if (!src) continue;
      try {
        const url = new URL(src, baseUrl);
        assets.push({
          url: url.href,
          type: 'image',
          alt: match[2] || undefined,
        });
      } catch {
        // Skip invalid URLs
      }
    }

    return assets;
  }

  private extractDesignTokens(html: string): DesignTokens {
    const tokens = emptyDesignTokens();

    // Extract colors from inline styles and CSS
    const colorRegex = /(?:color|background|background-color|border-color):\s*([^;}\n]+)/gi;
    let match;
    while ((match = colorRegex.exec(html)) !== null) {
      const color = match[1]?.trim();
      if (color && (/^#[0-9a-fA-F]{3,8}$/.test(color) || /^rgb/.test(color) || /^hsl/.test(color))) {
        tokens.colors[color] = color;
      }
    }

    // Extract font families
    const fontRegex = /font-family:\s*([^;}\n]+)/gi;
    while ((match = fontRegex.exec(html)) !== null) {
      const fontStr = match[1];
      if (!fontStr) continue;
      const fonts = fontStr.split(',').map((f) => f.trim().replace(/["']/g, ''));
      for (const font of fonts) {
        if (font && !tokens.fonts.includes(font) && !['serif', 'sans-serif', 'monospace', 'cursive', 'system-ui'].includes(font)) {
          tokens.fonts.push(font);
        }
      }
    }

    // Extract breakpoints from media queries
    const breakpointRegex = /@media[^{]*\((?:min|max)-width:\s*(\d+)(?:px|rem|em)/gi;
    while ((match = breakpointRegex.exec(html)) !== null) {
      const value = match[1];
      if (value && !Object.values(tokens.breakpoints).includes(value + 'px')) {
        tokens.breakpoints[`bp${Object.keys(tokens.breakpoints).length + 1}`] = value + 'px';
      }
    }

    return tokens;
  }
}

function emptyDesignTokens(): DesignTokens {
  return {
    colors: {},
    fonts: [],
    spacing: [],
    borderRadius: [],
    shadows: [],
    breakpoints: {},
  };
}
