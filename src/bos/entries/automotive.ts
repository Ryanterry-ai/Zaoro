import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { AUTOMOTIVE_BI } from '../knowledge/bi-profiles/automotive.js';

const AutomotiveEntry: BOSEntry = {
  id: 'automotive.dealership',
  industry: 'Automotive',
  subIndustry: 'Car Dealership',
  description: 'Automotive dealership with vehicle inventory, test drive booking, financing, and service center',
  capabilities: [
    'hero', 'inventory_search', 'vehicle_detail', 'test_drive_form',
    'financing_calculator', 'service_booking', 'spec_comparison',
    'gallery', 'testimonials', 'contact_info', 'trade_in_form'
  ],
  references: {
    urls: ['https://www.carvana.com', 'https://www.autotrader.com', 'https://www.carmax.com'],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      inventoryGrid: '.vehicle-card, [class*="car"]',
      vehicleDetail: '.vehicle-detail, [class*="car-info"]',
      bookingForm: 'form[class*="test-drive"], .schedule-form',
      financeCalc: '.calculator, [class*="payment"]'
    }
  },
  vocabularyOverrides: {
    'product': 'vehicle', 'buy': 'finance', 'store': 'dealership',
    'cart': 'trade', 'checkout': 'purchase', 'price': 'msrp',
    'customer': 'buyer', 'order': 'purchase'
  },
  workflows: [
    { name: 'Vehicle Purchase', steps: ['Browse inventory', 'Compare', 'Test drive', 'Financing', 'Purchase'], revenue_impact: 'Primary revenue driver' },
    { name: 'Service Appointment', steps: ['Select service', 'Schedule', 'Drop off', 'Service', 'Pick up'], revenue_impact: 'Increases service revenue by 40%' }
  ],
  entities: ['Vehicle', 'Customer', 'TestDrive', 'ServiceRecord', 'TradeIn', 'FinanceApplication', 'Sale'],
  revenueModel: ['vehicle_sale', 'financing', 'service', 'parts', 'trade_in'],
  revenueIntelligence: AUTOMOTIVE_BI,
  compliance: ['Consumer Protection', 'Financing Disclosure', 'Warranty', 'Data Privacy'],
  priority: 2,
  tags: ['automotive', 'car', 'dealership', 'vehicle', 'inventory', 'service', 'financing', 'auto']
};
BOSRegistry.register(AutomotiveEntry);
export default AutomotiveEntry;
