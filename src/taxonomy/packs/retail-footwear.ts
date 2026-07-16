/**
 * Knowledge Pack: retail/footwear
 * ================================
 *
 * Consolidates ALL footwear-specific knowledge from across the codebase
 * into a single, maintainable data file. No more scattered hardcoded logic.
 *
 * Source locations that this pack replaces:
 * - intake-parser.ts: footwear keywords, niche brand words, vocabulary
 * - domain-data.ts: ecommerce-footwear products, testimonials, features
 * - design-dna.ts: personality, colors, radius, photography, layout
 * - agent-generators.ts: design tokens (dark theme, Oswald font, orange accent)
 * - image-resolver.ts: FOOTWEAR_UNSPLASH_PHOTOS, KEYWORD_POOL_MAP
 * - content-resolver.ts: sub-category detection, hero subtitle
 * - industry-copy-schema.ts: hero copy, features, testimonials, CTA
 * - experience-profiles.ts: hover, scroll, motion, interaction
 * - skill-integrator.ts: layout overrides, palette, fonts
 * - design-intelligence engines: visual, polish, motion, component, design-system
 * - templates/: component templates
 */

import type { KnowledgePack } from '../types.js';

export const RETAIL_FOOTWEAR_PACK: KnowledgePack = {
  // ── Metadata ────────────────────────────────────────────────────────────
  id: 'retail/footwear',
  name: 'Footwear Retail',
  version: '1.0.0',
  taxonomyPath: 'retail/footwear',
  aliases: ['shoes', 'footwear', 'boot', 'sandal', 'sneaker store', 'shoe store'],
  detectionKeywords: [
    'shoe', 'footwear', 'boot', 'sandal', 'sneaker',
    'running shoe', 'athletic shoe', 'sports shoe',
    'leather shoe', 'casual shoe', 'formal shoe',
    'high-top', 'low-top', 'slip-on', 'lace-up',
    'insole', 'outsole', 'midsole', 'upper',
    'athleisure', 'streetwear', 'sneakerhead',
  ],

  // ── Copy & Content ──────────────────────────────────────────────────────
  copy: {
    heroHeading: '{appName} — Bold Footwear That Refuses to Compromise',
    heroSubheading: 'Bold footwear that refuses to compromise. Premium materials, innovative design, and unapologetic style for those who walk different.',
    heroPrimaryButton: 'Shop Collection',
    heroSecondaryButton: 'Our Story',
    heroTrustBadges: ['Free Shipping', '30-Day Returns', 'Authentic Guarantee'],
    heroImageKeywords: ['sneaker', 'running shoe', 'athletic footwear', 'streetwear shoe', 'premium sneaker'],
    featuresHeading: 'Why Runners Choose Us',
    featuresSubheading: 'Performance meets style in every step',
    features: [
      { icon: 'Zap', title: 'Performance Technology', description: 'Engineered for speed with responsive cushioning and energy return systems' },
      { icon: 'Shield', title: 'Durable Construction', description: 'Built to last with reinforced stitching and premium outsole materials' },
      { icon: 'Leaf', title: 'Sustainable Materials', description: 'Eco-friendly options using recycled materials without sacrificing performance' },
      { icon: 'Truck', title: 'Fast & Free Shipping', description: 'Free express delivery on orders over $75 with real-time tracking' },
      { icon: 'RefreshCw', title: '30-Day Comfort Guarantee', description: 'Not satisfied? Return within 30 days for a full refund, no questions asked' },
      { icon: 'Star', title: 'Expert Curation', description: 'Hand-selected by our team of footwear specialists and professional athletes' },
    ],
    testimonialsHeading: 'Trusted by Athletes & Runners',
    testimonialsSubheading: 'Real reviews from verified buyers',
    testimonials: [
      { text: 'These sneakers changed my running game. The cushioning is incredible and they look amazing.', author: 'Marcus Chen', role: 'Marathon Runner', company: '' },
      { text: 'Finally found shoes that can keep up with my workouts. Durable, comfortable, and stylish.', author: 'Sarah Williams', role: 'Fitness Enthusiast', company: '' },
      { text: 'Best online shoe shopping experience. Perfect fit, fast delivery, and the quality is unmatched.', author: 'James Rodriguez', role: 'Sneaker Collector', company: '' },
    ],
    ctaHeading: 'Ready to Upgrade Your Step?',
    ctaPrimaryButton: 'Shop Now',
    ctaTrustLine: 'Free shipping on orders over $75 · 30-day returns',
    stats: [
      { value: '50K+', label: 'Happy Customers' },
      { value: '4.9/5', label: 'Average Rating' },
      { value: '500+', label: 'Styles Available' },
      { value: '24h', label: 'Fast Delivery' },
    ],
    forbiddenPhrases: ['buy now', 'limited time offer', 'act fast', 'don\'t miss out'],
  },

  // ── Domain Data ──────────────────────────────────────────────────────────
  domainData: {
    products: [
      { name: 'Velocity Pro Runner', price: '$149.99', description: 'Lightweight performance running shoe with responsive cushioning', category: 'Running', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800' },
      { name: 'Street Elite Sneaker', price: '$129.99', description: 'Premium streetwear sneaker with premium leather upper', category: 'Lifestyle', image: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800' },
      { name: 'Trail Blazer Hiker', price: '$179.99', description: 'Rugged trail running shoe with waterproof membrane', category: 'Trail', image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800' },
      { name: 'Comfort Walk Daily', price: '$89.99', description: 'All-day comfort walking shoe with memory foam insole', category: 'Casual', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800' },
      { name: 'Flex Training Shoe', price: '$119.99', description: 'Cross-training shoe with lateral support and flexibility', category: 'Training', image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800' },
      { name: 'Classic Canvas Low', price: '$69.99', description: 'Timeless canvas sneaker for everyday casual wear', category: 'Casual', image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800' },
    ],
    testimonials: [
      { text: 'These sneakers changed my running game. The cushioning is incredible and they look amazing.', author: 'Marcus Chen', role: 'Marathon Runner', rating: 5 },
      { text: 'Finally found shoes that can keep up with my workouts. Durable, comfortable, and stylish.', author: 'Sarah Williams', role: 'Fitness Enthusiast', rating: 5 },
      { text: 'Best online shoe shopping experience. Perfect fit, fast delivery, and the quality is unmatched.', author: 'James Rodriguez', role: 'Sneaker Collector', rating: 5 },
    ],
    features: [
      { icon: 'Zap', title: 'Performance Technology', description: 'Engineered for speed with responsive cushioning' },
      { icon: 'Shield', title: 'Durable Construction', description: 'Built to last with premium materials' },
      { icon: 'Leaf', title: 'Sustainable Materials', description: 'Eco-friendly options using recycled materials' },
      { icon: 'Truck', title: 'Fast Shipping', description: 'Free express delivery on orders over $75' },
      { icon: 'RefreshCw', title: '30-Day Guarantee', description: 'Return within 30 days for a full refund' },
      { icon: 'Star', title: 'Expert Curation', description: 'Hand-selected by footwear specialists' },
    ],
    services: [
      { name: 'Custom Fitting', description: 'AI-powered foot measurement for perfect fit', price: 'Free', duration: '5 min' },
      { name: 'Shoe Care Kit', description: 'Premium cleaning and maintenance kit', price: '$29.99', duration: 'Instant' },
      { name: 'Membership Club', description: 'Early access to releases and exclusive discounts', price: '$9.99/mo', duration: 'Monthly' },
      { name: 'Corporate Orders', description: 'Bulk orders for teams and organizations', price: 'Custom', duration: '3-5 days' },
    ],
    team: [
      { name: 'Alex Rivera', role: 'Founder & CEO', bio: 'Former professional athlete with 15 years in footwear industry' },
      { name: 'Jordan Kim', role: 'Head of Design', bio: 'Award-winning shoe designer with background in industrial design' },
      { name: 'Sam Patel', role: 'VP of Operations', bio: 'Supply chain expert specializing in sustainable manufacturing' },
    ],
  },

  // ── Vocabulary ───────────────────────────────────────────────────────────
  vocabulary: {
    'product': 'shoe',
    'products': 'shoes',
    'item': 'pair',
    'items': 'pairs',
    'customer': 'runner',
    'customers': 'runners',
    'client': 'athlete',
    'clients': 'athletes',
    'order': 'pair order',
    'orders': 'pair orders',
    'cart': 'bag',
    'wishlist': 'saved pairs',
    'size': 'size',
    'color': 'colorway',
    'description': 'specs',
    'price': 'price',
    'sale': 'deal',
    'reviews': 'ratings',
    'category': 'collection',
    'categories': 'collections',
  },

  sectionNames: {
    'hero': 'Hero',
    'features': 'Why Choose Us',
    'testimonials': 'Runner Reviews',
    'products': 'Our Collection',
    'cta': 'Ready to Run?',
    'about': 'Our Story',
    'pricing': 'Pricing',
    'faq': 'FAQ',
    'contact': 'Contact',
    'footer': 'Footer',
  },

  // ── Design ───────────────────────────────────────────────────────────────
  design: {
    personality: 'bold',
    colorHint: '#FF4500',
    radiusScale: 'mixed',
    density: 'rich',
    mood: ['energetic', 'bold', 'dynamic', 'premium', 'athletic'],
    typography: {
      headingFont: 'Oswald, Impact, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
  },

  // ── Visual ───────────────────────────────────────────────────────────────
  visual: {
    palette: {
      primary: '#FF4500',
      secondary: '#1a1a1a',
      accent: '#FF6B35',
      background: '#0A0A0A',
      surface: '#141414',
      surfaceHover: '#1a1a1a',
      text: '#FFFFFF',
      textMuted: '#A0A0A0',
      border: '#2a2a2a',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    typography: {
      heading: 'Oswald, Impact, sans-serif',
      body: 'Inter, system-ui, sans-serif',
      accent: 'Oswald, Impact, sans-serif',
    },
    shadows: ['0 0 0 1px rgba(255,69,0,0.1)', '0 4px 12px rgba(0,0,0,0.5)'],
    borders: ['1px solid #2a2a2a', '1px solid rgba(255,69,0,0.3)'],
  },

  // ── Motion ───────────────────────────────────────────────────────────────
  motion: {
    defaultDuration: '0.4s',
    defaultEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    hoverDuration: '0.2s',
    scrollReveal: 'fade-up',
    staggerDelay: '0.1s',
  },

  // ── Components ───────────────────────────────────────────────────────────
  components: {
    recommended: ['ProductCard', 'ProductGrid', 'SizeGuide', 'QuickView', 'WishlistButton', 'ReviewStars', 'HeroBanner', 'FeatureGrid', 'TestimonialCarousel', 'CTASection', 'Footer'],
    avoid: ['PricingTable', 'DashboardStats', 'CalendarBooking', 'ChatWidget'],
    heroLayout: 'full-width-dark',
    featureLayout: '3-column-grid',
    testimonialLayout: 'carousel',
  },

  // ── Layout ───────────────────────────────────────────────────────────────
  layout: {
    heroVariant: 'dark-full-bleed',
    featureVariant: '3-column-grid',
    testimonialVariant: 'carousel',
    ctaVariant: 'centered-bold',
    navType: 'top-horizontal',
    footerType: 'multi-column',
  },

  // ── Experience ───────────────────────────────────────────────────────────
  experience: {
    defaultStyle: 'energetic',
    emotionalQualities: ['excitement', 'confidence', 'performance', 'style'],
    narrativeStructures: ['problem-solution', 'feature-showcase', 'social-proof'],
    hoverDefaults: ['scale-lift', 'glow-accent', 'image-zoom'],
    interactionDensity: 'energetic',
    motionIntensity: 'moderate',
    conversionFocus: 'product-focused',
    performanceSensitivity: 'high',
  },

  // ── Workflows ────────────────────────────────────────────────────────────
  workflows: [
    {
      name: 'Browse & Purchase',
      steps: ['Browse collection', 'Select shoe', 'Choose size/color', 'Add to bag', 'Checkout', 'Payment', 'Confirmation'],
      revenueImpact: 'Primary revenue driver',
    },
    {
      name: 'Size Exchange',
      steps: ['Request exchange', 'Select new size', 'Print label', 'Ship old pair', 'Receive new pair'],
      revenueImpact: 'Reduces returns, increases satisfaction',
    },
    {
      name: 'Membership Signup',
      steps: ['View benefits', 'Choose plan', 'Enter payment', 'Activate membership', 'Access perks'],
      revenueImpact: 'Recurring revenue stream',
    },
  ],

  // ── Entities ─────────────────────────────────────────────────────────────
  entities: [
    {
      name: 'Shoe',
      archetype: 'Product',
      fields: ['id', 'name', 'brand', 'price', 'description', 'category', 'sizes', 'colors', 'images', 'rating', 'reviews'],
      relationships: ['Shoe belongs to Category', 'Shoe has many Variants', 'Shoe has many Reviews'],
    },
    {
      name: 'Order',
      archetype: 'Order',
      fields: ['id', 'userId', 'items', 'total', 'status', 'shippingAddress', 'paymentMethod', 'createdAt'],
      relationships: ['Order belongs to User', 'Order has many OrderItems'],
    },
    {
      name: 'Review',
      archetype: 'Content',
      fields: ['id', 'userId', 'shoeId', 'rating', 'text', 'createdAt'],
      relationships: ['Review belongs to User', 'Review belongs to Shoe'],
    },
  ],

  // ── Compliance ───────────────────────────────────────────────────────────
  compliance: [
    {
      id: 'pci-dss',
      name: 'PCI DSS',
      required: true,
      checklist: ['Secure payment processing', 'Encrypt card data', 'Regular security audits'],
    },
    {
      id: 'gdpr',
      name: 'GDPR',
      required: true,
      checklist: ['Cookie consent', 'Data retention policy', 'Right to deletion', 'Privacy policy'],
    },
    {
      id: 'accessibility',
      name: 'WCAG 2.1 AA',
      required: true,
      checklist: ['Alt text for images', 'Keyboard navigation', 'Color contrast', 'Screen reader support'],
    },
  ],

  // ── Integrations ─────────────────────────────────────────────────────────
  integrations: [
    { name: 'Stripe', category: 'payments', purpose: 'Payment processing' },
    { name: 'ShipStation', category: 'shipping', purpose: 'Order fulfillment' },
    { name: 'Klaviyo', category: 'email', purpose: 'Email marketing' },
    { name: 'Google Analytics', category: 'analytics', purpose: 'Traffic tracking' },
    { name: 'Yotpo', category: 'reviews', purpose: 'Product reviews' },
  ],

  // ── KPIs ─────────────────────────────────────────────────────────────────
  kpis: [
    'Conversion Rate',
    'Average Order Value',
    'Return Rate',
    'Customer Lifetime Value',
    'Cart Abandonment Rate',
    'Size Exchange Rate',
    'Review Submission Rate',
    'Repeat Purchase Rate',
  ],

  // ── Revenue Model ────────────────────────────────────────────────────────
  revenueModel: ['direct-sales', 'membership', 'upsell', 'cross-sell'],
  paymentMethods: ['credit-card', 'debit-card', 'paypal', 'apple-pay', 'google-pay', 'klarna', 'afterpay'],

  // ── Pages ────────────────────────────────────────────────────────────────
  pages: [
    { path: '/', purpose: 'Homepage with hero, featured products, testimonials', workflows: ['Browse & Purchase'] },
    { path: '/shop', purpose: 'Product listing with filters', workflows: ['Browse & Purchase'] },
    { path: '/shop/[slug]', purpose: 'Product detail page', workflows: ['Browse & Purchase'] },
    { path: '/cart', purpose: 'Shopping cart', workflows: ['Browse & Purchase'] },
    { path: '/checkout', purpose: 'Checkout flow', workflows: ['Browse & Purchase'] },
    { path: '/about', purpose: 'Brand story and team', workflows: [] },
    { path: '/contact', purpose: 'Contact form and info', workflows: [] },
  ],

  // ── Features ─────────────────────────────────────────────────────────────
  features: [
    { icon: 'Search', title: 'Smart Search', description: 'Find shoes by style, activity, or brand', priority: 'essential' },
    { icon: 'Filter', title: 'Advanced Filters', description: 'Filter by size, color, price, category', priority: 'essential' },
    { icon: 'Heart', title: 'Wishlist', description: 'Save favorite pairs for later', priority: 'recommended' },
    { icon: 'Star', title: 'Reviews & Ratings', description: 'Read and write product reviews', priority: 'essential' },
    { icon: 'Truck', title: 'Order Tracking', description: 'Real-time shipping updates', priority: 'essential' },
    { icon: 'RefreshCw', title: 'Easy Returns', description: 'Hassle-free 30-day returns', priority: 'essential' },
    { icon: 'Users', title: 'Size Guide', description: 'AI-powered size recommendations', priority: 'recommended' },
    { icon: 'Zap', title: 'Quick View', description: 'Preview products without leaving listing', priority: 'optional' },
  ],

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    heading: '{appName} — Bold Footwear That Refuses to Compromise',
    subheading: 'Bold footwear that refuses to compromise. Premium materials, innovative design, and unapologetic style for those who walk different.',
    primaryButton: 'Shop Collection',
    secondaryButton: 'Our Story',
    trustBadges: ['Free Shipping', '30-Day Returns', 'Authentic Guarantee'],
    imageKeywords: ['sneaker', 'running shoe', 'athletic footwear'],
  },

  // ── CTA ──────────────────────────────────────────────────────────────────
  cta: {
    heading: 'Ready to Upgrade Your Step?',
    primaryButton: 'Shop Now',
    trustLine: 'Free shipping on orders over $75 · 30-day returns',
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    tagline: 'Premium footwear for those who walk different.',
    links: [
      { label: 'Shop All', href: '/shop' },
      { label: 'New Arrivals', href: '/shop?sort=new' },
      { label: 'Best Sellers', href: '/shop?sort=popular' },
      { label: 'About Us', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Size Guide', href: '/size-guide' },
      { label: 'Returns', href: '/returns' },
      { label: 'FAQ', href: '/faq' },
    ],
  },

  // ── Reference URLs ───────────────────────────────────────────────────────
  referenceUrls: [],
  referenceSelectors: {},
};
