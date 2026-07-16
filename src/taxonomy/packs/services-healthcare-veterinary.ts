/**
 * Knowledge Pack: services/healthcare/veterinary
 * ================================================
 *
 * Veterinary clinic — pet healthcare, wellness, surgery, and emergency care.
 */

import type { KnowledgePack } from '../types.js';

export const SERVICES_HEALTHCARE_VETERINARY_PACK: KnowledgePack = {
  id: 'services/healthcare/veterinary',
  name: 'Veterinary Clinic',
  version: '1.0.0',
  taxonomyPath: 'services/healthcare/veterinary',
  aliases: ['vet', 'veterinary', 'animal hospital', 'pet clinic', 'pet hospital'],
  detectionKeywords: [
    'veterinary', 'vet', 'animal hospital', 'pet clinic', 'pet hospital',
    'animal doctor', 'pet doctor', 'pet surgery', 'animal surgery',
    'pet wellness', 'animal wellness', 'vaccination', 'spay', 'neuter',
    'pet emergency', 'animal emergency', 'pet dental', 'animal dental',
  ],

  copy: {
    heroHeading: '{appName} — Compassionate Care for Your Companion',
    heroSubheading: 'Expert veterinary medicine with a gentle touch. From routine checkups to emergency surgery, we treat your pets like family.',
    heroPrimaryButton: 'Book Appointment',
    heroSecondaryButton: 'Our Services',
    heroTrustBadges: ['Licensed Veterinarians', '24/7 Emergency Care', 'Fear-Free Certified'],
    heroImageKeywords: ['veterinary', 'pet care', 'animal hospital', 'dog cat vet'],
    featuresHeading: 'Why Pet Parents Trust Us',
    featuresSubheading: 'Complete veterinary care under one roof',
    features: [
      { icon: 'Heart', title: 'Compassionate Care', description: 'Every patient treated with patience, gentleness, and genuine love for animals' },
      { icon: 'Stethoscope', title: 'Full-Service Clinic', description: 'Wellness exams, surgery, dentistry, diagnostics, and emergency care' },
      { icon: 'Shield', title: 'Board-Certified Vets', description: 'Licensed veterinarians with specialized training in companion animal medicine' },
      { icon: 'Clock', title: '24/7 Emergency Line', description: 'Round-the-clock emergency consultation and after-hours critical care' },
      { icon: 'Award', title: 'Fear-Free Certified', description: 'Low-stress handling techniques for a calmer, safer vet visit' },
      { icon: 'PawPrint', title: 'Preventive Wellness Plans', description: 'Affordable monthly plans covering exams, vaccines, and screenings' },
    ],
    testimonialsHeading: 'Loved by Pets & Their Parents',
    testimonialsSubheading: 'Real reviews from grateful pet owners',
    testimonials: [
      { text: 'Dr. Patel saved our dog Max after he ate something toxic. Quick diagnosis, calm demeanor, and Max is back to his playful self.', author: 'Sarah Mitchell', role: 'Dog Owner', company: '' },
      { text: 'The fear-free approach makes vet visits so much less stressful. My cat actually purred during the exam!', author: 'James Wong', role: 'Cat Owner', company: '' },
      { text: 'Best veterinary clinic in the city. Transparent pricing, honest advice, and genuinely caring staff.', author: 'Priya Sharma', role: 'Pet Parent', company: '' },
    ],
    ctaHeading: 'Your Pet Deserves the Best Care',
    ctaPrimaryButton: 'Schedule a Visit',
    ctaTrustLine: 'Same-day appointments available · Emergency care 24/7',
    stats: [
      { value: '10K+', label: 'Pets Treated' },
      { value: '4.9/5', label: 'Rating' },
      { value: '15+', label: 'Years Experience' },
      { value: '24/7', label: 'Emergency Care' },
    ],
    forbiddenPhrases: ['cheap vet', 'discount pet', 'budget animal'],
  },

  domainData: {
    products: [
      { name: 'Wellness Exam', price: '$65', description: 'Comprehensive nose-to-tail health assessment', category: 'Preventive', image: '' },
      { name: 'Vaccination Package', price: '$120', description: 'Core vaccines: DHPP, Rabies, Bordetella', category: 'Preventive', image: '' },
      { name: 'Dental Cleaning', price: '$280', description: 'Professional dental scaling and polishing under anesthesia', category: 'Dental', image: '' },
      { name: 'Spay/Neuter Surgery', price: '$350', description: 'Safe sterilization surgery with pre-anesthesia bloodwork', category: 'Surgery', image: '' },
      { name: 'Senior Wellness Panel', price: '$180', description: 'Bloodwork, urinalysis, and thyroid check for pets 7+', category: 'Diagnostics', image: '' },
      { name: 'Microchipping', price: '$45', description: 'ISO-compliant microchip with lifetime registration', category: 'Preventive', image: '' },
    ],
    testimonials: [
      { text: 'Dr. Patel saved our dog Max after he ate something toxic. Quick diagnosis, calm demeanor, and Max is back to his playful self.', author: 'Sarah Mitchell', role: 'Dog Owner', rating: 5 },
      { text: 'The fear-free approach makes vet visits so much less stressful. My cat actually purred during the exam!', author: 'James Wong', role: 'Cat Owner', rating: 5 },
      { text: 'Best veterinary clinic in the city. Transparent pricing, honest advice, and genuinely caring staff.', author: 'Priya Sharma', role: 'Pet Parent', rating: 5 },
    ],
    features: [
      { icon: 'Heart', title: 'Compassionate Care', description: 'Every patient treated with patience and love' },
      { icon: 'Stethoscope', title: 'Full-Service Clinic', description: 'Complete veterinary care under one roof' },
      { icon: 'Shield', title: 'Board-Certified Vets', description: 'Licensed and specialized veterinarians' },
      { icon: 'Clock', title: '24/7 Emergency', description: 'Round-the-clock emergency consultation' },
      { icon: 'Award', title: 'Fear-Free Certified', description: 'Low-stress handling techniques' },
      { icon: 'PawPrint', title: 'Wellness Plans', description: 'Affordable monthly preventive care' },
    ],
    services: [
      { name: 'Wellness Exam', description: 'Comprehensive health checkup', price: '$65', duration: '30 min' },
      { name: 'Emergency Visit', description: 'Urgent care for critical conditions', price: '$150', duration: '60 min' },
      { name: 'Telehealth Consult', description: 'Virtual vet consultation', price: '$35', duration: '15 min' },
      { name: 'Grooming Package', description: 'Bath, nail trim, ear cleaning', price: '$45', duration: '45 min' },
    ],
    team: [
      { name: 'Dr. Ananya Patel', role: 'Lead Veterinarian', bio: 'DVM with 15 years experience in small animal medicine and surgery' },
      { name: 'Dr. Marcus Lee', role: 'Associate Veterinarian', bio: 'Specializes in exotic animal medicine and feline internal medicine' },
      { name: 'Rachel Torres', role: 'Lead Veterinary Technician', bio: 'Licensed vet tech with fear-free certification and ER experience' },
    ],
  },

  vocabulary: {
    'product': 'service',
    'products': 'services',
    'item': 'visit',
    'items': 'visits',
    'customer': 'pet parent',
    'customers': 'pet parents',
    'client': 'pet owner',
    'clients': 'pet owners',
    'order': 'appointment',
    'orders': 'appointments',
    'cart': 'patient chart',
    'wishlist': 'care plan',
    'price': 'fee',
    'sale': 'promotion',
    'reviews': 'testimonials',
    'category': 'department',
    'categories': 'departments',
    'team': 'veterinary team',
    'about': 'about our practice',
    'contact': 'reach us',
    'blog': 'pet health resources',
  },

  sectionNames: {
    'hero': 'Hero',
    'features': 'Our Services',
    'testimonials': 'Pet Parent Reviews',
    'products': 'Services & Pricing',
    'cta': 'Schedule a Visit',
    'about': 'About Our Practice',
    'team': 'Meet Our Vets',
    'faq': 'Pet Parent FAQ',
    'contact': 'Contact Us',
    'footer': 'Footer',
  },

  design: {
    personality: 'caring',
    colorHint: '#059669',
    radiusScale: 'rounded',
    density: 'balanced',
    mood: ['caring', 'trustworthy', 'warm', 'professional', 'gentle'],
    typography: {
      headingFont: 'Nunito, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
  },

  visual: {
    palette: {
      primary: '#059669',
      secondary: '#065f46',
      accent: '#10b981',
      background: '#f0fdf4',
      surface: '#ffffff',
      surfaceHover: '#ecfdf5',
      text: '#064e3b',
      textMuted: '#6b7280',
      border: '#d1fae5',
      success: '#059669',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    typography: {
      heading: 'Nunito, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif',
      accent: 'Nunito, system-ui, sans-serif',
    },
    shadows: ['0 1px 3px rgba(5,150,105,0.1)', '0 4px 6px rgba(0,0,0,0.05)'],
    borders: ['1px solid #d1fae5', '1px solid #a7f3d0'],
  },

  motion: {
    defaultDuration: '0.3s',
    defaultEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    hoverDuration: '0.2s',
    scrollReveal: 'fade-up',
    staggerDelay: '0.08s',
  },

  components: {
    recommended: ['HeroBanner', 'FeatureGrid', 'TestimonialCarousel', 'ServiceCards', 'AppointmentForm', 'TeamGrid', 'FAQAccordion', 'CTASection', 'Footer'],
    avoid: ['PricingTable', 'ProductGrid', 'CartDrawer'],
    heroLayout: 'centered-warm',
    featureLayout: '3-column-grid',
    testimonialLayout: 'cards',
  },

  layout: {
    heroVariant: 'centered-warm',
    featureVariant: '3-column-grid',
    testimonialVariant: 'cards',
    ctaVariant: 'centered',
    navType: 'top-horizontal',
    footerType: 'multi-column',
  },

  experience: {
    defaultStyle: 'caring',
    emotionalQualities: ['trust', 'comfort', 'competence', 'compassion'],
    narrativeStructures: ['problem-solution', 'testimonial-driven', 'authority'],
    hoverDefaults: ['soft-lift', 'warm-glow'],
    interactionDensity: 'calm',
    motionIntensity: 'gentle',
    conversionFocus: 'appointment-focused',
    performanceSensitivity: 'medium',
  },

  workflows: [
    {
      name: 'Book Appointment',
      steps: ['Select service', 'Choose date/time', 'Enter pet info', 'Confirm booking', 'Receive reminder'],
      revenueImpact: 'Primary revenue driver',
    },
    {
      name: 'Wellness Plan Signup',
      steps: ['View plan options', 'Select tier', 'Enter payment', 'Activate plan', 'Schedule first visit'],
      revenueImpact: 'Recurring revenue stream',
    },
    {
      name: 'Emergency Consult',
      steps: ['Call hotline', 'Triage assessment', 'Visit clinic', 'Treatment', 'Follow-up'],
      revenueImpact: 'Critical care revenue',
    },
  ],

  entities: [
    {
      name: 'Patient',
      archetype: 'User',
      fields: ['id', 'name', 'species', 'breed', 'age', 'weight', 'gender', 'microchipId', 'ownerId', 'photo', 'medicalHistory'],
      relationships: ['Patient belongs to Owner', 'Patient has many Appointments', 'Patient has many MedicalRecords'],
    },
    {
      name: 'Appointment',
      archetype: 'Booking',
      fields: ['id', 'patientId', 'veterinarianId', 'serviceType', 'dateTime', 'status', 'notes', 'followUpDate'],
      relationships: ['Appointment belongs to Patient', 'Appointment assigned to Veterinarian'],
    },
    {
      name: 'MedicalRecord',
      archetype: 'Content',
      fields: ['id', 'patientId', 'date', 'type', 'diagnosis', 'treatment', 'prescriptions', 'veterinarianId'],
      relationships: ['MedicalRecord belongs to Patient', 'MedicalRecord created by Veterinarian'],
    },
  ],

  compliance: [
    {
      id: 'state-vet-license',
      name: 'State Veterinary License',
      required: true,
      checklist: ['Active veterinary license', 'DEA registration for controlled substances', 'Malpractice insurance'],
    },
    {
      id: 'hipaa-pet',
      name: 'Pet Health Records Privacy',
      required: true,
      checklist: ['Secure storage of medical records', 'Client consent for record sharing', 'Data retention compliance'],
    },
    {
      id: 'osha',
      name: 'OSHA Workplace Safety',
      required: true,
      checklist: ['Radiation safety protocols', 'Anesthesia safety procedures', 'Sharps disposal compliance'],
    },
  ],

  integrations: [
    { name: 'PetDesk', category: 'scheduling', purpose: 'Appointment scheduling and reminders' },
    { name: 'Cornerstone', category: 'practice-management', purpose: 'Practice management and EMR' },
    { name: 'Stripe', category: 'payments', purpose: 'Payment processing' },
    { name: 'Mailchimp', category: 'email', purpose: 'Pet owner newsletters' },
    { name: 'Google Analytics', category: 'analytics', purpose: 'Website traffic tracking' },
  ],

  kpis: [
    'Appointment Conversion Rate',
    'Patient Retention Rate',
    'Average Revenue Per Visit',
    'Emergency Case Volume',
    'Wellness Plan Enrollment',
    'Client Satisfaction Score',
    'No-Show Rate',
    'Referral Rate',
  ],

  revenueModel: ['service-booking', 'membership', 'product-sales'],
  paymentMethods: ['credit-card', 'debit-card', 'cash', 'pet-insurance', 'care-credit', 'scratchpay'],

  pages: [
    { path: '/', purpose: 'Homepage with hero, services overview, testimonials', workflows: ['Book Appointment'] },
    { path: '/services', purpose: 'Complete services listing with pricing', workflows: ['Book Appointment'] },
    { path: '/team', purpose: 'Meet our veterinarians and staff', workflows: [] },
    { path: '/wellness-plans', purpose: 'Monthly wellness plan options', workflows: ['Wellness Plan Signup'] },
    { path: '/appointment', purpose: 'Online appointment booking form', workflows: ['Book Appointment'] },
    { path: '/emergency', purpose: 'Emergency care info and hotline', workflows: ['Emergency Consult'] },
    { path: '/about', purpose: 'About our practice and philosophy', workflows: [] },
    { path: '/pet-health-blog', purpose: 'Pet health articles and tips', workflows: [] },
    { path: '/contact', purpose: 'Contact form, location, hours', workflows: [] },
  ],

  features: [
    { icon: 'Calendar', title: 'Online Booking', description: 'Schedule appointments 24/7 from any device', priority: 'essential' },
    { icon: 'Bell', title: 'Appointment Reminders', description: 'Automatic SMS/email reminders before visits', priority: 'essential' },
    { icon: 'FileText', title: 'Digital Records', description: 'Access pet health records anytime online', priority: 'essential' },
    { icon: 'Video', title: 'Telehealth', description: 'Virtual consultations for non-emergency concerns', priority: 'recommended' },
    { icon: 'CreditCard', title: 'Payment Plans', description: 'Flexible payment options including CareCredit', priority: 'essential' },
    { icon: 'MessageCircle', title: 'Secure Messaging', description: 'Chat with your vet team between visits', priority: 'recommended' },
    { icon: 'PawPrint', title: 'Pet Profiles', description: 'Manage multiple pets under one account', priority: 'essential' },
    { icon: 'Heart', title: 'Wellness Tracking', description: 'Track weight, vaccinations, and health milestones', priority: 'recommended' },
  ],

  hero: {
    heading: '{appName} — Compassionate Care for Your Companion',
    subheading: 'Expert veterinary medicine with a gentle touch. From routine checkups to emergency surgery, we treat your pets like family.',
    primaryButton: 'Book Appointment',
    secondaryButton: 'Our Services',
    trustBadges: ['Licensed Veterinarians', '24/7 Emergency Care', 'Fear-Free Certified'],
    imageKeywords: ['veterinary', 'pet care', 'animal hospital'],
  },

  cta: {
    heading: 'Your Pet Deserves the Best Care',
    primaryButton: 'Schedule a Visit',
    trustLine: 'Same-day appointments available · Emergency care 24/7',
  },

  footer: {
    tagline: 'Compassionate veterinary care for the pets you love.',
    links: [
      { label: 'Services', href: '/services' },
      { label: 'Our Team', href: '/team' },
      { label: 'Wellness Plans', href: '/wellness-plans' },
      { label: 'Book Appointment', href: '/appointment' },
      { label: 'Emergency', href: '/emergency' },
      { label: 'Pet Health Blog', href: '/pet-health-blog' },
      { label: 'Contact', href: '/contact' },
      { label: 'About', href: '/about' },
    ],
  },

  referenceUrls: [],
  referenceSelectors: {},
};
