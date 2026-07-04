import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { PROPTECH_BI } from '../knowledge/bi-profiles/proptech.js';

const PropTechEntry: BOSEntry = {
  id: 'proptech.property',
  industry: 'PropTech',
  subIndustry: 'Property Technology',
  description: 'Property management platform with tenant management, leases, maintenance tracking, and rent collection',
  capabilities: [
    'dashboard', 'property_list', 'tenant_portal', 'lease_tracking',
    'maintenance_board', 'payment_collection', 'data_tables',
    'reports', 'document_storage', 'communication', 'calendar'
  ],
  references: {
    urls: ['https://www.appfolio.com', 'https://www.buildium.com', 'https://www.yardi.com'],
    selectors: {
      dashboard: '.dashboard, [class*="metrics"]',
      propertyCard: '.property-card, [class*="unit"]',
      tenantTable: '.tenant-list, [class*="renter"]',
      maintenanceBoard: '.maintenance-board, [class*="repair"]',
      paymentForm: 'form[class*="payment"], .rent-form'
    }
  },
  vocabularyOverrides: {
    'product': 'property', 'buy': 'lease', 'store': 'portfolio',
    'cart': 'rent', 'checkout': 'pay', 'price': 'rent',
    'customer': 'tenant', 'order': 'lease'
  },
  workflows: [
    { name: 'Tenant Onboarding', steps: ['Application', 'Credit check', 'Lease signing', 'Move-in'], revenue_impact: 'Reduces vacancy by 20%' },
    { name: 'Maintenance Request', steps: ['Report issue', 'Assign', 'Schedule', 'Complete', 'Review'], revenue_impact: 'Increases tenant retention by 35%' }
  ],
  entities: ['Property', 'Unit', 'Tenant', 'Lease', 'MaintenanceRequest', 'Payment', 'Document', 'Vendor'],
  revenueModel: ['rent_collection', 'management_fee', 'late_fees', 'application_fee', 'maintenance_markup'],
  revenueIntelligence: PROPTECH_BI,
  compliance: ['Fair Housing', 'Rental Laws', 'GDPR', 'Eviction Laws', 'Security Deposit Laws'],
  priority: 2,
  tags: ['real estate', 'property', 'rental', 'tenant', 'lease', 'property management', 'apartment']
};
BOSRegistry.register(PropTechEntry);
export default PropTechEntry;
