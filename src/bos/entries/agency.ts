import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';

const AgencyEntry: BOSEntry = {
  id: 'agency.creative',
  industry: 'Agency',
  subIndustry: 'Creative Agency',
  description: 'Creative or digital agency with portfolio, services, case studies, and client management',
  capabilities: [
    'hero', 'portfolio_grid', 'services_list', 'case_studies',
    'testimonials', 'team_showcase', 'blog', 'contact_form',
    'process_timeline', 'pricing_table', 'faq'
  ],
  references: {
    urls: ['https://www.akqa.com', 'https://www.ideo.com', 'https://www.wieden-kennedy.com'],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      portfolioGrid: '.project-card, [class*="work"]',
      servicesList: '.service-item, [class*="service"]',
      testimonial: '.testimonial, [class*="client"]',
      teamGrid: '.team-member, [class*="team"]'
    }
  },
  vocabularyOverrides: {
    'product': 'project', 'buy': 'inquire', 'store': 'studio',
    'cart': 'brief', 'checkout': 'proposal', 'price': 'investment',
    'customer': 'client', 'order': 'engagement'
  },
  workflows: [
    { name: 'Client Onboarding', steps: ['Discovery call', 'Proposal', 'Contract', 'Kickoff'], revenue_impact: 'Converts leads at 40%' },
    { name: 'Project Delivery', steps: ['Research', 'Concept', 'Design', 'Develop', 'Launch'], revenue_impact: 'Ensures 95% on-time delivery' }
  ],
  entities: ['Client', 'Project', 'TeamMember', 'Service', 'CaseStudy', 'Testimonial', 'Invoice'],
  revenueModel: ['project_based', 'retainer', 'hourly', 'value_based', 'productized'],
  compliance: ['NDA', 'IP Assignment', 'Data Protection', 'Contract Law'],
  priority: 2,
  tags: ['agency', 'creative', 'studio', 'portfolio', 'design', 'branding', 'digital', 'marketing']
};
BOSRegistry.register(AgencyEntry);
export default AgencyEntry;
