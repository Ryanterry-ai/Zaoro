import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { FITNESS_GYM_BI } from '../knowledge/bi-profiles/fitness-gym.js';

const FitnessEntry: BOSEntry = {
  id: 'fitness.gym',
  industry: 'Fitness',
  subIndustry: 'Gym & Fitness Center',
  description: 'Gym or fitness center with class scheduling, membership management, and trainer profiles',
  capabilities: [
    'hero', 'class_schedule', 'pricing_table', 'trainer_showcase',
    'booking_form', 'testimonials', 'contact_info', 'gallery',
    'blog', 'membership_portal', 'achievement_tracker'
  ],
  references: {
    urls: ['https://www.anytimefitness.com', 'https://www.orangesheriff.com', 'https://www.planetfitness.com'],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      classGrid: '.class-grid, [class*="class"]',
      pricingCards: '.pricing-card, [class*="membership"]',
      trainerBios: '.trainer-section, [class*="trainer"]',
      bookingForm: 'form[class*="booking"], .schedule-form',
      gallery: '.gallery, [class*="photo"]'
    }
  },
  vocabularyOverrides: {
    'product': 'class', 'buy': 'join', 'store': 'gym',
    'cart': 'membership', 'checkout': 'enroll', 'price': 'rate',
    'customer': 'member', 'order': 'enrollment'
  },
  workflows: [
    { name: 'Member Onboarding', steps: ['Choose plan', 'Sign up', 'Waiver', 'Tour', 'Start classes'], revenue_impact: 'Primary acquisition funnel' },
    { name: 'Class Booking', steps: ['Browse schedule', 'Select class', 'Reserve spot', 'Check in'], revenue_impact: 'Increases retention by 35%' }
  ],
  entities: ['Member', 'Class', 'Trainer', 'Membership', 'Schedule', 'CheckIn', 'Achievement'],
  revenueModel: ['membership', 'drop_in', 'personal_training', 'merchandise', 'nutrition'],
  revenueIntelligence: FITNESS_GYM_BI,
  compliance: ['Waiver', 'Liability Insurance', 'CPR Certification', 'Data Privacy'],
  priority: 2,
  tags: ['gym', 'fitness', 'workout', 'class', 'trainer', 'membership', 'health', 'exercise']
};
BOSRegistry.register(FitnessEntry);
export default FitnessEntry;
