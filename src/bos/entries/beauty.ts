import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { BEAUTY_BI } from '../knowledge/bi-profiles/beauty.js';

const BeautyEntry: BOSEntry = {
  id: 'beauty.salon',
  industry: 'Beauty',
  subIndustry: 'Salon & Spa',
  description: 'Salon or spa with service menu, stylist profiles, appointment booking, and product sales',
  capabilities: [
    'hero', 'services_menu', 'stylist_showcase', 'booking_form',
    'pricing_table', 'gallery', 'testimonials', 'product_shop',
    'gift_cards', 'contact_info', 'location_hours'
  ],
  references: {
    urls: ['https://www.ultabeauty.com', 'https://www.glossier.com', 'https://www.spafinder.com'],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      servicesList: '.service-item, [class*="service"]',
      stylistGrid: '.stylist-card, [class*="artist"]',
      bookingForm: 'form[class*="book"], .appointment-form',
      gallery: '.gallery, [class*="work"]'
    }
  },
  vocabularyOverrides: {
    'product': 'service', 'buy': 'book', 'store': 'salon',
    'cart': 'appointment', 'checkout': 'confirm', 'price': 'rate',
    'customer': 'guest', 'order': 'appointment'
  },
  workflows: [
    { name: 'Service Booking', steps: ['Choose service', 'Select stylist', 'Pick time', 'Confirm appointment'], revenue_impact: 'Reduces no-shows by 60%' },
    { name: 'Retail Sales', steps: ['Browse products', 'Consultation', 'Purchase', 'Loyalty points'], revenue_impact: 'Increases AOV by 25%' }
  ],
  entities: ['Service', 'Stylist', 'Appointment', 'Product', 'Client', 'GiftCard', 'Inventory'],
  revenueModel: ['service_fee', 'product_sales', 'membership', 'gift_cards', 'commission'],
  revenueIntelligence: BEAUTY_BI,
  compliance: ['Cosmetology License', 'Health Regulations', 'Product Safety', 'Data Privacy'],
  priority: 2,
  tags: ['beauty', 'salon', 'spa', 'hair', 'nails', 'skincare', 'cosmetics', 'stylist']
};
BOSRegistry.register(BeautyEntry);
export default BeautyEntry;
