// ─── BOS Entry: Luxury Retail ────────────────────────────────────────

import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';

const LuxuryRetailEntry: BOSEntry = {
  id: 'luxury.retail',
  industry: 'Luxury',
  subIndustry: 'Retail',
  description: 'High-end luxury brand with premium aesthetics, exclusive collections, and VIP experiences',
  
  capabilities: [
    'hero',
    'collections',
    'story',
    'craftsmanship',
    'dealers',
    'testimonials',
    'contact',
    'vip_form',
    'press_mentions'
  ],
  
  references: {
    urls: [
      'https://www.rolex.com',
      'https://www.louisvuitton.com',
      'https://www.porsche.com'
    ],
    selectors: {
      heroHeadline: 'h1, .hero-title, [class*="headline"]',
      productGrid: '[class*="collection"], .product-grid',
      productCard: '[class*="product"], .item-card',
      aboutSection: '.about-section, [class*="story"], [class*="heritage"]',
      craftsmanship: '[class*="craft"], [class*="making"]',
      testimonials: '.testimonials, [class*="review"]',
      dealerLocator: '[class*="store"], [class*="boutique"]',
      contactInfo: '[class*="contact"], [class*="concierge"]'
    }
  },
  
  vocabularyOverrides: {
    'product': 'timepiece',
    'buy': 'acquire',
    'store': 'atelier',
    'cart': 'trunk',
    'checkout': 'concierge',
    'price': 'investment',
    'customer': 'collector',
    'order': 'commission'
  },
  
  workflows: [
    {
      name: 'VIP Inquiry',
      steps: ['Browse collection', 'Request private viewing', 'Consultation', 'Custom order'],
      revenue_impact: 'Increases AOV by 200%'
    },
    {
      name: 'Dealer Network',
      steps: ['Find dealer', 'Check availability', 'Schedule visit', 'Purchase'],
      revenue_impact: 'Primary sales channel'
    }
  ],
  
  entities: ['Collection', 'Product', 'Dealer', 'Inquiry', 'VIP', 'Order', 'Service'],
  
  revenueModel: ['direct_sales', 'dealer_network', 'limited_editions', 'services'],
  
  compliance: ['Luxury Goods Regulations', 'Export Controls', 'Authentication'],
  
  priority: 2,
  
  tags: ['luxury', 'premium', 'exclusive', 'watch', 'fashion', 'designer', 'haute', 'couture']
};

BOSRegistry.register(LuxuryRetailEntry);
export default LuxuryRetailEntry;
