import { ArchitectDecision } from './architect.js';
import { DesignSystem } from './design-system-generator.js';
import { ResearchResult } from './research-agent.js';
import { DomainContext } from './domain-detector.js';

export interface AssetPlan {
  images: ImageAsset[];
  icons: IconAsset[];
  illustrations: IllustrationAsset[];
  totalEstimatedSize: number;
}

export interface ImageAsset {
  id: string;
  purpose: 'hero' | 'product' | 'team' | 'feature' | 'testimonial' | 'background' | 'logo' | 'og-image';
  query: string;
  source: 'unsplash' | 'placeholder' | 'generated';
  url: string;
  localPath: string;
  width: number;
  height: number;
  aspectRatio: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface IconAsset {
  id: string;
  name: string;
  category: string;
  source: 'lucide' | 'svg-inline' | 'emoji';
  svg: string | undefined;
  size: string;
}

export interface IllustrationAsset {
  id: string;
  purpose: string;
  style: 'gradient' | 'pattern' | 'abstract' | 'geometric';
  colors: string[];
  css: string;
}

// ─── Image query templates by industry ────────────────────────────

const INDUSTRY_IMAGE_QUERIES: Record<string, { hero: string[]; products: string[]; team: string[]; features: string[] }> = {
  ecommerce: { hero: ['online shopping', 'ecommerce store', 'product display'], products: ['product photography', 'retail display', 'online store'], team: ['business team', 'retail staff', 'customer service'], features: ['delivery truck', 'secure payment', 'quality guarantee'] },
  saas: { hero: ['software dashboard', 'technology workspace', 'digital product'], products: ['app interface', 'software dashboard', 'tech team'], team: ['tech team', 'developers', 'startup office'], features: ['data analytics', 'cloud computing', 'integration'] },
  'local-business': { hero: ['local business', 'storefront', 'community'], products: ['service delivery', 'craft work', 'quality service'], team: ['local team', 'business owner', 'staff'], features: ['quality service', 'community', 'trust'] },
  restaurant: { hero: ['restaurant interior', 'fine dining', 'food plating'], products: ['gourmet food', 'chef cooking', 'restaurant menu'], team: ['chef team', 'restaurant staff', 'kitchen'], features: ['fresh ingredients', 'fast delivery', 'catering'] },
  fitness: { hero: ['gym interior', 'fitness class', 'workout'], products: ['gym equipment', 'fitness class', 'training session'], team: ['personal trainer', 'fitness coach', 'gym staff'], features: ['group class', 'personal training', 'nutrition'] },
  healthcare: { hero: ['medical office', 'healthcare professional', 'patient care'], products: ['medical equipment', 'healthcare service', 'clinic'], team: ['doctor team', 'medical staff', 'healthcare professional'], features: ['modern equipment', 'patient care', 'telehealth'] },
  education: { hero: ['classroom', 'online learning', 'education'], products: ['course platform', 'learning material', 'study'], team: ['teacher', 'instructor', 'education team'], features: ['online course', 'certification', 'mentorship'] },
  portfolio: { hero: ['creative workspace', 'design process', 'portfolio'], products: ['project showcase', 'creative work', 'design'], team: ['designer', 'creative team', 'developer'], features: ['design process', 'development', 'strategy'] },
  agency: { hero: ['agency workspace', 'creative team', 'strategy meeting'], products: ['client work', 'brand design', 'marketing'], team: ['agency team', 'creative directors', 'strategists'], features: ['brand strategy', 'digital marketing', 'web design'] },
};

// ─── Industry-specific icons ──────────────────────────────────────

const INDUSTRY_ICONS: Record<string, Array<{ name: string; category: string; emoji: string }>> = {
  ecommerce: [
    { name: 'ShoppingCart', category: 'commerce', emoji: '🛒' },
    { name: 'Package', category: 'shipping', emoji: '📦' },
    { name: 'CreditCard', category: 'payment', emoji: '💳' },
    { name: 'Star', category: 'review', emoji: '⭐' },
    { name: 'Heart', category: 'wishlist', emoji: '❤️' },
    { name: 'Truck', category: 'delivery', emoji: '🚚' },
    { name: 'Shield', category: 'security', emoji: '🛡️' },
    { name: 'Tag', category: 'pricing', emoji: '🏷️' },
  ],
  saas: [
    { name: 'BarChart3', category: 'analytics', emoji: '📊' },
    { name: 'Zap', category: 'speed', emoji: '⚡' },
    { name: 'Lock', category: 'security', emoji: '🔒' },
    { name: 'Globe', category: 'integration', emoji: '🌍' },
    { name: 'Code', category: 'developer', emoji: '💻' },
    { name: 'Layers', category: 'architecture', emoji: '📚' },
    { name: 'Rocket', category: 'launch', emoji: '🚀' },
    { name: 'Clock', category: 'time', emoji: '⏰' },
  ],
  'local-business': [
    { name: 'MapPin', category: 'location', emoji: '📍' },
    { name: 'Phone', category: 'contact', emoji: '📞' },
    { name: 'Clock', category: 'hours', emoji: '🕐' },
    { name: 'Star', category: 'review', emoji: '⭐' },
    { name: 'Users', category: 'team', emoji: '👥' },
    { name: 'Calendar', category: 'booking', emoji: '📅' },
    { name: 'CheckCircle', category: 'quality', emoji: '✅' },
    { name: 'Award', category: 'certification', emoji: '🏆' },
  ],
  restaurant: [
    { name: 'Utensils', category: 'dining', emoji: '🍴' },
    { name: 'Coffee', category: 'beverage', emoji: '☕' },
    { name: 'Pizza', category: 'food', emoji: '🍕' },
    { name: 'Flame', category: 'cooking', emoji: '🔥' },
    { name: 'Leaf', category: 'fresh', emoji: '🍃' },
    { name: 'Clock', category: 'delivery', emoji: '⏱️' },
    { name: 'Star', category: 'review', emoji: '⭐' },
    { name: 'Phone', category: 'order', emoji: '📞' },
  ],
  fitness: [
    { name: 'Dumbbell', category: 'equipment', emoji: '🏋️' },
    { name: 'Heart', category: 'health', emoji: '❤️' },
    { name: 'Timer', category: 'schedule', emoji: '⏱️' },
    { name: 'Users', category: 'community', emoji: '👥' },
    { name: 'TrendingUp', category: 'progress', emoji: '📈' },
    { name: 'Award', category: 'achievement', emoji: '🏆' },
    { name: 'Calendar', category: 'booking', emoji: '📅' },
    { name: 'Zap', category: 'energy', emoji: '⚡' },
  ],
  healthcare: [
    { name: 'Heart', category: 'health', emoji: '❤️' },
    { name: 'Stethoscope', category: 'medical', emoji: '🩺' },
    { name: 'Shield', category: 'safety', emoji: '🛡️' },
    { name: 'Clock', category: 'availability', emoji: '🕐' },
    { name: 'Users', category: 'team', emoji: '👥' },
    { name: 'Calendar', category: 'booking', emoji: '📅' },
    { name: 'Phone', category: 'contact', emoji: '📞' },
    { name: 'CheckCircle', category: 'quality', emoji: '✅' },
  ],
  education: [
    { name: 'BookOpen', category: 'learning', emoji: '📖' },
    { name: 'GraduationCap', category: 'achievement', emoji: '🎓' },
    { name: 'Lightbulb', category: 'ideas', emoji: '💡' },
    { name: 'Users', category: 'community', emoji: '👥' },
    { name: 'Award', category: 'certification', emoji: '🏆' },
    { name: 'PlayCircle', category: 'video', emoji: '▶️' },
    { name: 'Clock', category: 'schedule', emoji: '🕐' },
    { name: 'MessageCircle', category: 'discussion', emoji: '💬' },
  ],
};

// ─── Illustration patterns by mood ────────────────────────────────

const MOOD_ILLUSTRATIONS: Record<string, IllustrationAsset[]> = {
  premium: [
    { id: 'premium-gradient-1', purpose: 'hero background', style: 'gradient', colors: ['violet-500', 'fuchsia-500'], css: 'bg-gradient-to-br from-violet-500/20 via-transparent to-fuchsia-500/20' },
    { id: 'premium-gradient-2', purpose: 'card accent', style: 'gradient', colors: ['violet-400', 'purple-400'], css: 'bg-gradient-to-r from-violet-400/10 to-purple-400/10' },
  ],
  vibrant: [
    { id: 'vibrant-gradient-1', purpose: 'hero background', style: 'gradient', colors: ['pink-500', 'orange-500'], css: 'bg-gradient-to-br from-pink-500/20 via-transparent to-orange-500/20' },
  ],
  tech: [
    { id: 'tech-gradient-1', purpose: 'hero background', style: 'gradient', colors: ['cyan-500', 'blue-500'], css: 'bg-gradient-to-br from-cyan-500/20 via-transparent to-blue-500/20' },
    { id: 'tech-pattern', purpose: 'section background', style: 'pattern', colors: ['cyan-500', 'teal-500'], css: 'bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.08),transparent_50%)]' },
  ],
  minimal: [
    { id: 'minimal-gradient-1', purpose: 'hero background', style: 'gradient', colors: ['zinc-400', 'neutral-400'], css: 'bg-gradient-to-br from-zinc-400/5 via-transparent to-neutral-400/5' },
  ],
  energetic: [
    { id: 'energetic-gradient-1', purpose: 'hero background', style: 'gradient', colors: ['red-500', 'orange-500'], css: 'bg-gradient-to-br from-red-500/20 via-transparent to-orange-500/20' },
  ],
  creative: [
    { id: 'creative-gradient-1', purpose: 'hero background', style: 'gradient', colors: ['emerald-500', 'cyan-500'], css: 'bg-gradient-to-br from-emerald-500/20 via-transparent to-cyan-500/20' },
  ],
  trustworthy: [
    { id: 'trust-gradient-1', purpose: 'hero background', style: 'gradient', colors: ['emerald-500', 'teal-500'], css: 'bg-gradient-to-br from-emerald-500/15 via-transparent to-teal-500/15' },
  ],
  warm: [
    { id: 'warm-gradient-1', purpose: 'hero background', style: 'gradient', colors: ['amber-500', 'orange-500'], css: 'bg-gradient-to-br from-amber-500/20 via-transparent to-orange-500/20' },
  ],
  editorial: [
    { id: 'editorial-gradient-1', purpose: 'hero background', style: 'gradient', colors: ['rose-500', 'pink-500'], css: 'bg-gradient-to-br from-rose-500/15 via-transparent to-pink-500/15' },
  ],
};

// ─── Asset Intelligence Agent ─────────────────────────────────────

export class AssetIntelligence {
  planAssets(
    decision: ArchitectDecision,
    designSystem: DesignSystem,
    research: ResearchResult,
    domain?: DomainContext,
  ): AssetPlan {
    const industry = domain?.industry || decision.businessType || 'saas';
    const mood = decision.colorScheme.mood || 'premium';

    console.log(`[asset-intelligence] Planning assets for ${industry} (${mood})`);

    const images = this.planImages(industry, decision, domain);
    const icons = this.planIcons(industry);
    const illustrations = this.planIllustrations(mood);

    const totalSize = images.length * 200 + icons.length * 1 + illustrations.length * 0.5;

    console.log(`[asset-intelligence] ${images.length} images, ${icons.length} icons, ${illustrations.length} illustrations (~${totalSize}KB)`);

    return { images, icons, illustrations, totalEstimatedSize: totalSize };
  }

  private planImages(industry: string, decision: ArchitectDecision, domain?: DomainContext): ImageAsset[] {
    const defaultQueries = { hero: ['business'], products: ['product'], team: ['team'], features: ['feature'] };
    const queries = INDUSTRY_IMAGE_QUERIES[industry] || INDUSTRY_IMAGE_QUERIES.saas || defaultQueries;
    const images: ImageAsset[] = [];

    const hero0 = queries.hero[0] || 'business';
    const hero1 = queries.hero[1] || hero0;
    const products = queries.products || ['product'];
    const team = queries.team || ['team'];
    const features = queries.features || ['feature'];

    // Hero image — critical
    images.push({
      id: 'hero-main',
      purpose: 'hero',
      query: hero0,
      source: 'unsplash',
      url: `https://source.unsplash.com/1440x900/?${encodeURIComponent(hero0)}`,
      localPath: '/assets/hero-main.jpg',
      width: 1440,
      height: 900,
      aspectRatio: '16/9',
      priority: 'critical',
    });

    // OG image
    images.push({
      id: 'og-image',
      purpose: 'og-image',
      query: hero1,
      source: 'unsplash',
      url: `https://source.unsplash.com/1200x630/?${encodeURIComponent(hero1)}`,
      localPath: '/assets/og-image.jpg',
      width: 1200,
      height: 630,
      aspectRatio: '1.91/1',
      priority: 'high',
    });

    // Product/feature images — high priority
    for (let i = 0; i < 4; i++) {
      const query = products[i % products.length]!;
      images.push({
        id: `product-${i}`,
        purpose: 'product',
        query,
        source: 'unsplash',
        url: `https://source.unsplash.com/600x400/?${encodeURIComponent(query)}`,
        localPath: `/assets/product-${i}.jpg`,
        width: 600,
        height: 400,
        aspectRatio: '3/2',
        priority: i < 2 ? 'high' : 'medium',
      });
    }

    // Team images
    for (let i = 0; i < Math.min(decision.pages.length, 4); i++) {
      const query = team[i % team.length]!;
      images.push({
        id: `team-${i}`,
        purpose: 'team',
        query,
        source: 'unsplash',
        url: `https://source.unsplash.com/400x400/?${encodeURIComponent(query)}`,
        localPath: `/assets/team-${i}.jpg`,
        width: 400,
        height: 400,
        aspectRatio: '1/1',
        priority: 'medium',
      });
    }

    // Feature images
    for (let i = 0; i < 3; i++) {
      const query = features[i % features.length]!;
      images.push({
        id: `feature-${i}`,
        purpose: 'feature',
        query,
        source: 'unsplash',
        url: `https://source.unsplash.com/600x400/?${encodeURIComponent(query)}`,
        localPath: `/assets/feature-${i}.jpg`,
        width: 600,
        height: 400,
        aspectRatio: '3/2',
        priority: 'medium',
      });
    }

    return images;
  }

  private planIcons(industry: string): IconAsset[] {
    const iconDefs = INDUSTRY_ICONS[industry] || INDUSTRY_ICONS.saas || [];
    return iconDefs.map(def => ({
      id: `icon-${def.name.toLowerCase()}`,
      name: def.name,
      category: def.category,
      source: 'emoji' as const,
      svg: undefined,
      size: 'md',
    }));
  }

  private planIllustrations(mood: string): IllustrationAsset[] {
    return MOOD_ILLUSTRATIONS[mood] || MOOD_ILLUSTRATIONS.premium || [];
  }

  resolveImageUrl(asset: ImageAsset): string {
    if (asset.source === 'unsplash') {
      return `https://source.unsplash.com/${asset.width}x${asset.height}/?${encodeURIComponent(asset.query)}`;
    }
    return asset.url;
  }

  getIconEmoji(name: string, industry: string): string {
    const icons = INDUSTRY_ICONS[industry] || INDUSTRY_ICONS.saas || [];
    const found = icons.find(i => i.name === name);
    return found?.emoji || '📦';
  }

  getIllustrationCss(mood: string, purpose: string): string {
    const illustrations = MOOD_ILLUSTRATIONS[mood] || MOOD_ILLUSTRATIONS.premium || [];
    const found = illustrations.find(i => i.purpose === purpose);
    return found?.css || '';
  }
}
