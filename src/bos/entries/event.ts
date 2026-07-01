import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';

const EventEntry: BOSEntry = {
  id: 'event.management',
  industry: 'Event',
  subIndustry: 'Event Management',
  description: 'Event management platform with event discovery, ticketing, scheduling, and attendee management',
  capabilities: [
    'hero', 'event_grid', 'search_filters', 'event_detail',
    'ticketing_form', 'calendar', 'speaker_showcase', 'gallery',
    'contact_info', 'faq', 'sponsor_showcase'
  ],
  references: {
    urls: ['https://www.eventbrite.com', 'https://www.meetup.com', 'https://www.ticketmaster.com'],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      eventCard: '.event-card, [class*="event"]',
      searchForm: 'form[class*="search"]',
      ticketOptions: '.ticket-tier, [class*="ticket"]',
      calendar: '.calendar, [class*="schedule"]'
    }
  },
  vocabularyOverrides: {
    'product': 'event', 'buy': 'attend', 'store': 'events',
    'cart': 'ticket', 'checkout': 'register', 'price': 'admission',
    'customer': 'attendee', 'order': 'registration'
  },
  workflows: [
    { name: 'Event Registration', steps: ['Browse events', 'Select tickets', 'Checkout', 'Receive QR code'], revenue_impact: 'Primary revenue driver' },
    { name: 'Event Check-in', steps: ['Scan QR code', 'Verify ticket', 'Issue badge', 'Track attendance'], revenue_impact: 'Reduces fraud by 90%' }
  ],
  entities: ['Event', 'Ticket', 'Attendee', 'Speaker', 'Sponsor', 'Venue', 'Schedule'],
  revenueModel: ['ticket_sales', 'sponsorship', 'exhibitor_fee', 'commission', 'premium_listing'],
  compliance: ['GDPR', 'Venue Contract', 'Insurance', 'Refund Policy', 'Accessibility'],
  priority: 2,
  tags: ['event', 'tickets', 'conference', 'meetup', 'workshop', 'concert', 'festival', 'registration']
};
BOSRegistry.register(EventEntry);
export default EventEntry;
