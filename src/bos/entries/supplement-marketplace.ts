// ─── BOS Entry: Supplement / Nutraceutical Marketplace ────────────────
// India-specific: FSSAI compliance, ₹ pricing, COD/UPI, multi-brand catalog

import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { SUPPLEMENT_MARKETPLACE_BI } from '../knowledge/bi-profiles/supplement-marketplace.js';

const SupplementMarketplaceEntry: BOSEntry = {
  id: 'retail.ecommerce.supplement',
  industry: 'Retail',
  subIndustry: 'Supplement Marketplace',
  description: 'Indian supplement marketplace with multi-brand catalog, FSSAI-certified products, health goal browsing, and COD/UPI payments',

  capabilities: [
    'hero',
    'feature_grid',
    'product_grid',
    'product_detail',
    'shopping_cart',
    'checkout_flow',
    'user_accounts',
    'search_filter',
    'reviews',
    'wishlist',
    'order_tracking',
    'subscription_save',
  ],

  references: {
    urls: [
      'https://www.healthkart.com',
      'https://www.nutrabay.com',
      'https://www.muscleblaze.com',
      'https://www.fitbake.in',
    ],
    selectors: {
      heroHeadline: 'h1, [class*="hero"] h1',
      productGrid: '[class*="product-grid"], .product-list',
      productCard: '[class*="product-card"], .product-item',
      price: '[class*="price"], .price',
      addToCart: 'button[class*="cart"], .add-to-cart',
      testimonial: '[class*="review"], .testimonial',
    },
  },

  vocabularyOverrides: {
    'product': 'supplement',
    'buy': 'order',
    'store': 'marketplace',
    'cart': 'cart',
    'checkout': 'checkout',
    'price': 'price',
    'customer': 'health enthusiast',
    'order': 'order',
    'category': 'health goal',
    'brand': 'brand',
    'seller': 'brand partner',
    'item': 'product',
    'shop now': 'explore supplements',
    'browse': 'discover',
    'collection': 'supplement stack',
  },

  workflows: [
    {
      name: 'Supplement Purchase Flow',
      steps: ['Browse by health goal', 'Compare products', 'Add to cart', 'Checkout (UPI/COD/Card)', 'Order tracking', 'Re-order'],
      revenue_impact: 'Core conversion funnel — 2-4% visitor-to-order',
    },
    {
      name: 'Subscription Refill',
      steps: ['Choose supplement', 'Select subscription frequency', 'Auto-delivery setup', 'Recurring billing', 'Replenishment reminder'],
      revenue_impact: '30% of revenue — recurring subscription model',
    },
    {
      name: 'Inventory & Compliance',
      steps: ['Stock monitoring', 'FSSAI certification audit', 'Batch tracking for expiry', 'Supplier management', 'Quality control'],
      revenue_impact: 'Prevents stockouts and compliance issues',
    },
  ],

  entities: [
    'Supplement',
    'Brand',
    'HealthGoal',
    'Category',
    'Order',
    'Cart',
    'Customer',
    'Address',
    'Payment',
    'Shipping',
    'Review',
    'Subscription',
  ],

  revenueModel: [
    'direct_sales',
    'subscription_refills',
    'supplement_stacks_bundles',
    'affiliate_brand_commission',
  ],

  revenueIntelligence: SUPPLEMENT_MARKETPLACE_BI,

  compliance: [
    'FSSAI',
    'GST',
    'PCI DSS',
    'Consumer Protection',
    'Legal Metrology',
    'Drugs and Cosmetics Act',
  ],

  priority: 1,

  tags: [
    'supplement', 'nutrition', 'protein', 'vitamin', 'health', 'fitness',
    'wellness', 'marketplace', 'india', 'fssai', 'cod', 'upi',
    'muscleblaze', 'nutrabay', 'healthkart', 'whey', 'creatine',
  ],
};

BOSRegistry.register(SupplementMarketplaceEntry);
export default SupplementMarketplaceEntry;
