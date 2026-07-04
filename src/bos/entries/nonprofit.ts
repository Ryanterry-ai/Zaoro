import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { NONPROFIT_BI } from '../knowledge/bi-profiles/nonprofit.js';

const NonprofitEntry: BOSEntry = {
  id: 'nonprofit.charity',
  industry: 'Nonprofit',
  subIndustry: 'Charity & Foundation',
  description: 'Nonprofit organization with donation system, campaign showcase, volunteer management, and impact reporting',
  capabilities: [
    'hero', 'donation_form', 'campaign_showcase', 'impact_stats',
    'volunteer_signup', 'events_calendar', 'blog', 'gallery',
    'newsletter', 'contact_info', 'about_story'
  ],
  references: {
    urls: ['https://www.charitywater.org', 'https://www.unicef.org', 'https://www.wwf.org'],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      donationForm: 'form[class*="donate"], .donation-form',
      campaignGrid: '.campaign-card, [class*="cause"]',
      impactStats: '.impact-number, [class*="stat"]',
      volunteerForm: 'form[class*="volunteer"]'
    }
  },
  vocabularyOverrides: {
    'product': 'cause', 'buy': 'donate', 'store': 'foundation',
    'cart': 'donation', 'checkout': 'give', 'price': 'gift',
    'customer': 'supporter', 'order': 'contribution'
  },
  workflows: [
    { name: 'Donation Processing', steps: ['Select cause', 'Choose amount', 'Payment', 'Receipt', 'Impact update'], revenue_impact: 'Primary revenue source' },
    { name: 'Volunteer Management', steps: ['Sign up', 'Event selection', 'Orientation', 'Track hours'], revenue_impact: 'Increases volunteer retention by 50%' }
  ],
  entities: ['Donor', 'Campaign', 'Volunteer', 'Event', 'Donation', 'Impact', 'Newsletter', 'Partner'],
  revenueModel: ['donation', 'grant', 'sponsorship', 'merchandise', 'event_ticket'],
  revenueIntelligence: NONPROFIT_BI,
  compliance: ['GDPR', 'Donor Privacy', 'Charity Registration', 'Tax Receipt', 'Anti-Money Laundering'],
  priority: 2,
  tags: ['nonprofit', 'charity', 'donation', 'volunteer', 'cause', 'foundation', 'community', 'social']
};
BOSRegistry.register(NonprofitEntry);
export default NonprofitEntry;
