// ─── BOS Entry: E-Commerce ───────────────────────────────────────────

import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';

const ECommerceEntry: BOSEntry = {
  id: 'retail.ecommerce',
  industry: 'Retail',
  subIndustry: 'E-Commerce',
  description: 'Online store with product catalog, shopping cart, checkout, and inventory management',
  
  capabilities: [
    'hero',
    'product_grid',
    'product_detail',
    'shopping_cart',
    'checkout_flow',
    'user_accounts',
    'search_filter',
    'reviews',
    'wishlist',
    'order_tracking'
  ],
  
  references: {
    urls: [
      'https://www.shopify.com',
      'https://www.amazon.in',
      'https://www.healthkart.com'
    ],
    selectors: {
      heroHeadline: 'h1, [class*="hero"] h1',
      productGrid: '[class*="product-grid"], .product-list',
      productCard: '[class*="product-card"], .product-item',
      price: '[class*="price"], .price',
      addToCart: 'button[class*="cart"], .add-to-cart',
      testimonial: '[class*="review"], .testimonial'
    }
  },
  
  vocabularyOverrides: {
    'product': 'item',
    'buy': 'purchase',
    'store': 'shop',
    'cart': 'bag',
    'checkout': 'payment',
    'price': 'cost',
    'customer': 'shopper',
    'order': 'purchase'
  },
  
  workflows: [
    {
      name: 'Purchase Flow',
      steps: ['Browse', 'Add to cart', 'Checkout', 'Payment', 'Confirmation'],
      revenue_impact: 'Core conversion funnel'
    },
    {
      name: 'Inventory Management',
      steps: ['Stock monitoring', 'Reorder alerts', 'Supplier management'],
      revenue_impact: 'Prevents stockouts'
    }
  ],
  
  entities: ['Product', 'Category', 'Order', 'Cart', 'Customer', 'Inventory', 'Payment', 'Shipping'],
  
  revenueModel: ['direct_sales', 'affiliate', 'subscription_boxes', 'upsell'],
  
  compliance: ['PCI DSS', 'GST', 'Consumer Protection'],
  
  priority: 1,
  
  tags: ['shop', 'store', 'buy', 'sell', 'product', 'inventory', 'shipping', 'payment']
};

BOSRegistry.register(ECommerceEntry);
export default ECommerceEntry;
