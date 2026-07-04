import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { PORTFOLIO_BI } from '../knowledge/bi-profiles/portfolio.js';

const PortfolioEntry: BOSEntry = {
  id: 'portfolio.creative',
  industry: 'Portfolio',
  subIndustry: 'Creative Portfolio',
  description: 'Personal or professional portfolio showcasing work, projects, skills, and creative services',
  capabilities: [
    'hero', 'project_showcase', 'gallery', 'about_me',
    'testimonials', 'contact_form', 'blog', 'resume',
    'social_links', 'skill_chart', 'process_timeline'
  ],
  references: {
    urls: ['https://www.behance.net', 'https://www.dribbble.com', 'https://www.adobe.com/portfolio'],
    selectors: {
      heroHeadline: 'h1, .hero-title',
      projectGrid: '.project-card, [class*="work"]',
      gallery: '.gallery, [class*="portfolio"]',
      aboutSection: '.about, [class*="bio"]',
      contactForm: 'form[class*="contact"]'
    }
  },
  vocabularyOverrides: {
    'product': 'project', 'buy': 'hire', 'store': 'portfolio',
    'cart': 'brief', 'checkout': 'inquire', 'price': 'quote',
    'customer': 'client', 'order': 'commission'
  },
  workflows: [
    { name: 'Project Showcase', steps: ['Select project', 'View details', 'Read case study', 'Contact'], revenue_impact: 'Generates leads at 15% conversion' },
    { name: 'Hire Process', steps: ['Browse work', 'Review skills', 'Send inquiry', 'Get quote'], revenue_impact: 'Direct revenue channel' }
  ],
  entities: ['Project', 'Skill', 'Testimonial', 'Client', 'Service', 'Blog'],
  revenueModel: ['commission', 'project_fee', 'consulting', 'hourly'],
  revenueIntelligence: PORTFOLIO_BI,
  compliance: ['Data Privacy', 'IP Rights'],
  priority: 3,
  tags: ['portfolio', 'creative', 'designer', 'artist', 'photographer', 'freelance', 'work']
};
BOSRegistry.register(PortfolioEntry);
export default PortfolioEntry;
