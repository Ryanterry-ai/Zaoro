import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';

const TravelEntry: BOSEntry = {
  id: 'travel.tourism',
  industry: 'Travel',
  subIndustry: 'Tourism & Hospitality',
  description: 'Travel and tourism platform with destination showcase, booking, itineraries, and reviews',
  capabilities: [
    'hero', 'destination_grid', 'search_filters', 'booking_form',
    'itinerary_planner', 'reviews', 'gallery', 'travel_guides',
    'contact_info', 'newsletter', 'map_integration'
  ],
  references: {
    urls: ['https://www.airbnb.com', 'https://www.tripadvisor.com', 'https://www.booking.com'],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      destinationCard: '.destination-card, [class*="listing"]',
      searchForm: 'form[class*="search"], .booking-form',
      reviewSection: '.review-card, [class*="review"]',
      gallery: '.gallery, [class*="photo"]'
    }
  },
  vocabularyOverrides: {
    'product': 'destination', 'buy': 'book', 'store': 'travel',
    'cart': 'booking', 'checkout': 'confirm', 'price': 'rate',
    'customer': 'traveler', 'order': 'reservation'
  },
  workflows: [
    { name: 'Travel Booking', steps: ['Search destination', 'Compare options', 'Book', 'Payment', 'Confirmation'], revenue_impact: 'Primary revenue driver' },
    { name: 'Trip Planning', steps: ['Select dates', 'Build itinerary', 'Book activities', 'Share plan'], revenue_impact: 'Increases booking value by 40%' }
  ],
  entities: ['Destination', 'Booking', 'Review', 'Itinerary', 'Activity', 'Traveler', 'Payment'],
  revenueModel: ['commission', 'booking_fee', 'premium_listing', 'travel_insurance', 'advertising'],
  compliance: ['GDPR', 'Travel Insurance', 'Cancellation Policy', 'Consumer Rights'],
  priority: 2,
  tags: ['travel', 'tourism', 'hotel', 'destination', 'vacation', 'booking', 'trip', 'hospitality']
};
BOSRegistry.register(TravelEntry);
export default TravelEntry;
