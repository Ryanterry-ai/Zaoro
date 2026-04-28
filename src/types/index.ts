export interface ProductVariant {
  id: string;
  title: string;
  options: Record<string, string>;
  price: number;
  comparePrice?: number;
  stock: number;
  sku: string;
  image?: string;
}

export interface Product {
  id: string;
  handle: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  currency: string;
  images: string[];
  category: string;
  tags: string[];
  badge?: string | null;
  stock: number;
  variants: ProductVariant[];
  details?: Record<string, string>;
  reviews?: number;
  visible: boolean;
}

export interface Collection {
  id: string;
  handle: string;
  name: string;
  description: string;
  image: string;
  products: string[];
  visible: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantTitle: string;
  price: number;
  quantity: number;
  image: string;
  handle: string;
}

export interface NavItem {
  id: string;
  label: string;
  url: string;
  children?: NavItem[];
}

export interface NavigationData {
  main: NavItem[];
  footer: {
    quickLinks: Array<{ label: string; url: string }>;
    collections: Array<{ label: string; url: string }>;
    legal: Array<{ label: string; url: string }>;
  };
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  currency: string;
  currencySymbol: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  announcementBar: {
    enabled: boolean;
    text: string;
    linkText: string;
    linkUrl: string;
    bgColor: string;
    textColor: string;
  };
  socialLinks: Record<string, string>;
  seo: { title: string; description: string; keywords: string[] };
  footerTagline: string;
  footerBg: string;
  homeContent?: {
    trendingTitle: string;
    trendingViewAllLabel: string;
    trendingViewAllUrl: string;
    featuredCollectionsTitle: string;
    featuredCollectionsSubtitle: string;
    featuredCollectionsCtaLabel: string;
    featuredCollectionsCtaUrl: string;
    fashionInsiderTitle: string;
    fashionInsiderViewAllLabel: string;
    fashionInsiderViewAllUrl: string;
    saleBannerBadgeText: string;
    saleBannerHeading: string;
    saleBannerBody: string;
    saleBannerPromoText: string;
    saleBannerCtaLabel: string;
    saleBannerCtaUrl: string;
  };
  trustBadges: Array<{ icon: string; title: string; description: string }>;
}

export interface Blog {
  id: string;
  handle: string;
  title: string;
  excerpt: string;
  image: string;
  publishedAt: string;
  content: string;
  visible: boolean;
}
