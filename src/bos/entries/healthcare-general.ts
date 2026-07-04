import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { HEALTHCARE_GENERAL_BI } from '../knowledge/bi-profiles/healthcare-general.js';

const HealthcareGeneralEntry: BOSEntry = {
  id: 'healthcare.general',
  industry: 'Healthcare',
  subIndustry: 'Healthcare Provider',
  description: 'General healthcare provider with appointment booking, patient portal, medical records, and telehealth',
  capabilities: [
    'hero', 'services_list', 'provider_showcase', 'booking_form',
    'patient_portal', 'telehealth', 'testimonials', 'insurance_info',
    'faq', 'blog', 'contact_info', 'prescription_refill'
  ],
  references: {
    urls: ['https://www.onemedical.com', 'https://www.teladoc.com', 'https://www.cvs.com/minuteclinic'],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      servicesList: '.service-card, [class*="service"]',
      providerGrid: '.provider-card, [class*="doctor"]',
      bookingForm: 'form[class*="appointment"], .booking-form',
      patientPortal: '.portal, [class*="patient"]'
    }
  },
  vocabularyOverrides: {
    'product': 'treatment', 'buy': 'book', 'store': 'practice',
    'cart': 'visit', 'checkout': 'appointment', 'price': 'fee',
    'customer': 'patient', 'order': 'visit'
  },
  workflows: [
    { name: 'Patient Visit', steps: ['Book appointment', 'Check in', 'Consultation', 'Treatment', 'Follow up'], revenue_impact: 'Primary revenue driver' },
    { name: 'Telehealth Session', steps: ['Schedule', 'Join video', 'Diagnose', 'Prescribe', 'Schedule follow up'], revenue_impact: 'Increases access by 300%' }
  ],
  entities: ['Patient', 'Provider', 'Appointment', 'MedicalRecord', 'Prescription', 'Insurance', 'Payment', 'TelehealthSession'],
  revenueModel: ['insurance_billing', 'self_pay', 'subscription', 'telehealth_fee', 'copay'],
  revenueIntelligence: HEALTHCARE_GENERAL_BI,
  compliance: ['HIPAA', 'HITECH', 'GDPR', 'Medical Records', 'Telehealth Regulations', 'Malpractice'],
  priority: 1,
  tags: ['healthcare', 'medical', 'doctor', 'clinic', 'hospital', 'patient', 'telehealth', 'health']
};
BOSRegistry.register(HealthcareGeneralEntry);
export default HealthcareGeneralEntry;
