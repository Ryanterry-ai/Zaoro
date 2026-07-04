// ─── BOS Entry: Healthcare / Dental Clinic ────────────────────────────

import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { HEALTHCARE_DENTAL_BI } from '../knowledge/bi-profiles/healthcare-dental.js';

const HealthcareDentalEntry: BOSEntry = {
  id: 'healthcare.dental',
  industry: 'Healthcare',
  subIndustry: 'Dental Clinic',
  description: 'Medical/dental clinic with appointment booking, patient portal, and service listings',
  
  capabilities: [
    'hero',
    'services_list',
    'team_bios',
    'booking_form',
    'testimonials',
    'contact_info',
    'insurance_verification',
    'before_after_gallery',
    'faq'
  ],
  
  references: {
    urls: [
      'https://www.bupa.co.uk/dental',
      'https://www.smilebrilliant.com',
      'https://www.dentalcare.com'
    ],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      servicesList: '.services-grid, [class*="service"]',
      teamBios: '.team-section, [class*="doctor"], [class*="team"]',
      bookingForm: 'form[class*="booking"], .appointment-form',
      testimonials: '.testimonials, [class*="review"]',
      contactInfo: '.contact-section, [class*="address"]',
      pricing: '.pricing, [class*="fee"]'
    }
  },
  
  vocabularyOverrides: {
    'product': 'treatment',
    'buy': 'book',
    'store': 'clinic',
    'cart': 'treatment_plan',
    'checkout': 'appointment',
    'price': 'fee',
    'customer': 'patient',
    'order': 'appointment',
    'inventory': 'supplies'
  },
  
  workflows: [
    {
      name: 'Patient Booking',
      steps: ['Select service', 'Choose doctor', 'Pick time slot', 'Confirm appointment'],
      revenue_impact: 'Primary revenue driver'
    },
    {
      name: 'Treatment Plan',
      steps: ['Consultation', 'Diagnosis', 'Treatment proposal', 'Consent', 'Treatment'],
      revenue_impact: 'Increases case acceptance by 60%'
    }
  ],
  
  entities: ['Patient', 'Doctor', 'Appointment', 'Treatment', 'Service', 'Insurance', 'Payment'],
  
  revenueModel: ['service_fees', 'insurance_billing', 'membership_plans', 'cosmetic_upsell'],
  revenueIntelligence: HEALTHCARE_DENTAL_BI,
  
  compliance: ['HIPAA', 'GDPR', 'Medical Records', 'Insurance Verification'],
  
  priority: 2,
  
  tags: ['clinic', 'doctor', 'appointment', 'medical', 'dental', 'health', 'patient', 'treatment']
};

BOSRegistry.register(HealthcareDentalEntry);
export default HealthcareDentalEntry;
