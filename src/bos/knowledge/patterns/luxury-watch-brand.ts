import type { Pattern } from '../../schemas/knowledge/pattern.schema.js';

export const LUXURY_WATCH_BRAND: Pattern = {
  id: 'pattern.luxury.watch-brand',
  version: '1.3.0',
  status: 'active',
  createdAt: '2025-01-01T00:00:00+00:00',
  updatedAt: '2025-01-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'Pattern',
  name: 'Luxury Watch Brand',
  description: 'Premium watch brand website with collections, craftsmanship storytelling, and dealer network',
  navigation: {
    items: [
      { label: 'Collections', href: '/collections' },
      { label: 'Craftsmanship', href: '/craftsmanship' },
      { label: 'Heritage', href: '/heritage' },
      { label: 'Dealers', href: '/dealers' },
      { label: 'Contact', href: '/contact' },
    ],
    style: 'horizontal',
    sticky: true,
    logo: true,
  },
  pages: [
    { path: '/', name: 'Home', type: 'home', sections: ['hero-spotlight', 'featured-collections', 'craftsmanship-teaser', 'heritage-story', 'dealer-cta'] },
    { path: '/collections', name: 'Collections', type: 'listing', sections: ['collection-grid', 'filter-bar'] },
    { path: '/collections/:slug', name: 'Collection Detail', type: 'detail', sections: ['product-hero', 'specifications', 'gallery', 'inquiry-form'] },
    { path: '/craftsmanship', name: 'Craftsmanship', type: 'static', sections: ['craftsmanship-hero', 'process-steps', 'artisan-story', 'macro-gallery'] },
    { path: '/heritage', name: 'Heritage', type: 'static', sections: ['heritage-timeline', 'brand-story', 'milestones'] },
    { path: '/dealers', name: 'Dealer Locator', type: 'page', sections: ['map-directory', 'dealer-list', 'contact-form'] },
    { path: '/contact', name: 'Contact', type: 'page', sections: ['contact-form', 'location-info', 'concierge-service'] },
  ],
  components: [
    'comp.hero.premium-spotlight',
    'comp.collections.grid-lux',
    'comp.section.story-timeline',
    'comp.section.craftsmanship-parallax',
    'comp.dealers.map-directory',
    'comp.testimonials.carousel',
    'comp.contact.rich-form',
  ],
  relationships: [
    { target: 'Collection', type: 'has_many' },
    { target: 'Dealer', type: 'has_many' },
    { target: 'Inquiry', type: 'has_many' },
  ],
  workflows: [
    'workflow.vip-inquiry',
    'workflow.dealer-network',
    'workflow.collection-browse',
  ],
  integrations: [
    { type: 'maps', name: 'Google Maps', config: {}, required: true },
    { type: 'email', name: 'Email Service', config: {}, required: true },
    { type: 'analytics', name: 'Analytics', config: {}, required: false },
  ],
  design: {
    profileRef: 'design.luxury.dark-opulence',
    restrictions: ['No bright colors', 'Minimal animations', 'Premium typography required'],
  },
  generationRules: [
    { id: 'rule.luxury.motion', params: { parallax: true, kburns: true } },
    { id: 'rule.luxury.typography', params: { displaySerif: true } },
  ],
  compatibleIndustries: ['luxury', 'fashion', 'jewelry', 'automotive'],
  compatibleBusinessModels: ['direct_sales', 'dealer_network', 'membership'],
};
