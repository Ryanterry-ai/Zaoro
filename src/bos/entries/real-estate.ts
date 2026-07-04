// ─── BOS Entry: Real Estate ──────────────────────────────────────────

import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { REAL_ESTATE_BI } from '../knowledge/bi-profiles/real-estate.js';

const RealEstateEntry: BOSEntry = {
  id: 'realestate.agency',
  industry: 'Real Estate',
  subIndustry: 'Agency',
  description: 'Real estate agency with property listings, agent profiles, and inquiry forms',
  
  capabilities: [
    'hero',
    'property_listings',
    'property_detail',
    'agent_profiles',
    'search_filter',
    'inquiry_form',
    'neighborhood_guides',
    'mortgage_calculator',
    'testimonials'
  ],
  
  references: {
    urls: [
      'https://www.zillow.com',
      'https://www.realtor.com',
      'https://www.99acres.com'
    ],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      propertyGrid: '.property-list, [class*="listing"]',
      propertyCard: '.property-card, [class*="property"]',
      searchForm: 'form[class*="search"], .search-form',
      agentProfile: '.agent-card, [class*="agent"]',
      testimonial: '.reviews, [class*="testimonial"]',
      contactInfo: '.contact-section, [class*="office"]'
    }
  },
  
  vocabularyOverrides: {
    'product': 'property',
    'buy': 'purchase',
    'store': 'office',
    'cart': 'favorites',
    'checkout': 'offer',
    'price': 'listing_price',
    'customer': 'buyer',
    'order': 'inquiry'
  },
  
  workflows: [
    {
      name: 'Property Search',
      steps: ['Set filters', 'Browse listings', 'View details', 'Schedule tour', 'Make offer'],
      revenue_impact: 'Core conversion funnel'
    },
    {
      name: 'Lead Management',
      steps: ['Capture lead', 'Qualify', 'Follow up', 'Schedule viewing', 'Close deal'],
      revenue_impact: 'Increases conversion by 40%'
    }
  ],
  
  entities: ['Property', 'Agent', 'Inquiry', 'Tour', 'Offer', 'Client', 'Listing'],
  
  revenueModel: ['commission', 'listing_fees', 'referral_fees', 'property_management'],
  revenueIntelligence: REAL_ESTATE_BI,
  
  compliance: ['Fair Housing', 'MLS Rules', 'Disclosure Requirements'],
  
  priority: 2,
  
  tags: ['property', 'house', 'apartment', 'listing', 'agent', 'buyer', 'seller', 'rent']
};

BOSRegistry.register(RealEstateEntry);
export default RealEstateEntry;
