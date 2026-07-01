import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';

const LegalEntry: BOSEntry = {
  id: 'legal.lawfirm',
  industry: 'Legal',
  subIndustry: 'Law Firm',
  description: 'Law firm or legal practice with case management, consultation booking, and attorney profiles',
  capabilities: [
    'hero', 'practice_areas', 'attorney_showcase', 'booking_form',
    'testimonials', 'faq', 'blog', 'contact_info',
    'case_results', 'resource_center', 'newsletter'
  ],
  references: {
    urls: ['https://www.avvo.com', 'https://www.lawyers.com', 'https://www.justia.com'],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      practiceAreas: '.practice-area, [class*="service"]',
      attorneyGrid: '.attorney-card, [class*="lawyer"]',
      bookingForm: 'form[class*="consultation"], .booking-form',
      testimonial: '.testimonial, [class*="review"]'
    }
  },
  vocabularyOverrides: {
    'product': 'service', 'buy': 'retain', 'store': 'firm',
    'cart': 'case', 'checkout': 'consultation', 'price': 'fee',
    'customer': 'client', 'order': 'case'
  },
  workflows: [
    { name: 'Client Intake', steps: ['Initial consultation', 'Case evaluation', 'Retainer agreement', 'Case opening'], revenue_impact: 'Primary acquisition funnel' },
    { name: 'Case Management', steps: ['Document collection', 'Legal research', 'Filing', 'Hearing', 'Resolution'], revenue_impact: 'Drives case throughput by 60%' }
  ],
  entities: ['Client', 'Case', 'Attorney', 'Consultation', 'Document', 'Hearing', 'Invoice', 'Practice'],
  revenueModel: ['hourly_billing', 'contingency', 'flat_fee', 'retainer', 'consultation'],
  compliance: ['Attorney-Client Privilege', 'Data Protection', 'Trust Accounting', 'Conflict Check'],
  priority: 2,
  tags: ['legal', 'lawyer', 'attorney', 'law', 'firm', 'case', 'consultation', 'legal services']
};
BOSRegistry.register(LegalEntry);
export default LegalEntry;
