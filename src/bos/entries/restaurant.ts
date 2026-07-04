import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { HOSPITALITY_RESTAURANT_BI } from '../knowledge/bi-profiles/hospitality-restaurant.js';

const RestaurantEntry: BOSEntry = {
  id: 'hospitality.restaurant',
  industry: 'Hospitality',
  subIndustry: 'Restaurant',
  description: 'Restaurant with menu, reservations, online ordering, and delivery integration',
  
  capabilities: [
    'hero',
    'menu_highlights',
    'reservation_form',
    'gallery',
    'about_story',
    'contact_info',
    'online_ordering',
    'reviews',
    'catering_info'
  ],
  
  references: {
    urls: [
      'https://www.opentable.com',
      'https://www.zomato.com',
      'https://www.ubereats.com'
    ],
    selectors: {
      heroHeadline: 'h1, .restaurant-name',
      menuGrid: '.menu-section, [class*="menu"]',
      menuItem: '.menu-item, [class*="dish"]',
      reservationForm: 'form[class*="reservation"], .booking-form',
      gallery: '.gallery, [class*="photo"]',
      reviews: '.reviews, [class*="testimonial"]',
      contactInfo: '.contact, [class*="address"]'
    }
  },
  
  vocabularyOverrides: {
    'product': 'dish',
    'buy': 'order',
    'store': 'restaurant',
    'cart': 'order',
    'checkout': 'payment',
    'price': 'menu_price',
    'customer': 'guest',
    'order': 'reservation'
  },
  
  workflows: [
    {
      name: 'Online Ordering',
      steps: ['Browse menu', 'Add items', 'Customize', 'Checkout', 'Delivery/pickup'],
      revenue_impact: 'Increases revenue by 30%'
    },
    {
      name: 'Table Reservation',
      steps: ['Select date/time', 'Party size', 'Confirm booking'],
      revenue_impact: 'Reduces no-shows by 50%'
    }
  ],
  
  entities: ['MenuItem', 'Category', 'Order', 'Reservation', 'Table', 'Customer', 'Delivery'],
  
  revenueModel: ['dine_in', 'takeout', 'delivery', 'catering', 'events'],
  revenueIntelligence: HOSPITALITY_RESTAURANT_BI,
  
  compliance: ['Food Safety', 'Health Permits', 'Alcohol Licensing'],
  
  priority: 2,
  
  tags: ['food', 'dining', 'menu', 'reservation', 'delivery', 'cuisine', 'chef', 'kitchen']
};

BOSRegistry.register(RestaurantEntry);
export default RestaurantEntry;
