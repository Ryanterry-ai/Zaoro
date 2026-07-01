import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';

const EducationEntry: BOSEntry = {
  id: 'education.course',
  industry: 'Education',
  subIndustry: 'Online Learning',
  description: 'Educational platform with course catalog, enrollment, student tracking, and certificates',
  capabilities: [
    'hero', 'course_catalog', 'pricing_table', 'testimonials',
    'instructor_showcase', 'faq', 'student_dashboard', 'progress_tracker',
    'certificate_gallery', 'search', 'contact_info'
  ],
  references: {
    urls: ['https://www.udemy.com', 'https://www.coursera.org', 'https://www.skillshare.com'],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      courseGrid: '.course-card, [class*="course"]',
      pricingCards: '.pricing-card, [class*="plan"]',
      instructorBio: '.instructor, [class*="teacher"]',
      testimonial: '.testimonial, [class*="review"]'
    }
  },
  vocabularyOverrides: {
    'product': 'course', 'buy': 'enroll', 'store': 'academy',
    'cart': 'enrollment', 'checkout': 'register', 'price': 'tuition',
    'customer': 'student', 'order': 'enrollment'
  },
  workflows: [
    { name: 'Student Enrollment', steps: ['Browse courses', 'Enroll', 'Payment', 'Start learning'], revenue_impact: 'Primary revenue driver' },
    { name: 'Progress Tracking', steps: ['Watch lessons', 'Complete assignments', 'Take quiz', 'Get certificate'], revenue_impact: 'Increases completion rate by 45%' }
  ],
  entities: ['Course', 'Student', 'Instructor', 'Enrollment', 'Lesson', 'Quiz', 'Certificate', 'Category'],
  revenueModel: ['course_sale', 'subscription', 'institution_license', 'certification_fee'],
  compliance: ['GDPR', 'FERPA', 'Accessibility', 'Data Privacy'],
  priority: 2,
  tags: ['education', 'course', 'learning', 'student', 'training', 'academy', 'online', 'tutorial']
};
BOSRegistry.register(EducationEntry);
export default EducationEntry;
