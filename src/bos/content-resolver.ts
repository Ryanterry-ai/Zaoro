/**
 * ContentResolver — fills business content into component specs.
 *
 * This is where business intelligence meets component structure.
 * It takes an Execution Blueprint (which components) and produces
 * an Application Spec (what each component displays).
 *
 * ALL content comes from structured knowledge — zero LLM calls.
 */

import type { ApplicationBlueprint, EntityPlan } from './schemas/blueprint/application-blueprint.schema.js';
import type {
  ExecutionBlueprint,
  PageExecutionPlan,
  ComponentSlot,
} from './schemas/blueprint/execution-blueprint.schema.js';
import type {
  ApplicationSpec,
  PageSpec,
  ComponentSpec,
  ItemSpec,
  TierSpec,
  StatSpec,
} from './schemas/blueprint/execution-blueprint.schema.js';
import type { Pattern } from './schemas/knowledge/pattern.schema.js';
import type { DesignProfile } from './schemas/knowledge/design-profile.schema.js';
import { stageLogger } from '../core/debug-logger.js';

const log = stageLogger('resolve');

// ─── Vocabulary Helper ────────────────────────────────────────────────────────

/**
 * Apply vocabulary replacements to a string.
 * e.g. "All Products" → "All Dishes" for a restaurant.
 */
// ─── Industry Content Helpers ────────────────────────────────────────────────

/** Get industry-specific entity name (e.g., "dish" for restaurant, "property" for real estate) */
function getPrimaryEntityName(ctx: ContentResolverContext): string {
  const entity = ctx.blueprint.entities[0];
  return entity?.name ?? ctx.vocabulary['product'] ?? ctx.vocabulary['item'] ?? 'Item';
}

/** Get industry-specific workflow names */
function getWorkflowNames(ctx: ContentResolverContext): string[] {
  return ctx.blueprint.workflows.map(w => w.name);
}

/** Get industry-specific feature items from capabilities and workflows */
function getIndustryFeatures(ctx: ContentResolverContext): ItemSpec[] {
  const items: ItemSpec[] = [];
  const workflows = getWorkflowNames(ctx);
  const entities = ctx.blueprint.entities.map(e => e.name);
  const industry = ctx.blueprint.industry;

  // Add workflow-based features
  for (const wf of workflows.slice(0, 4)) {
    items.push({
      title: wf,
      description: `${vocab('Streamlined', ctx)} ${wf.toLowerCase()} ${vocab('process', ctx)}`,
      icon: 'zap',
    });
  }

  // Add entity-based features
  for (const ent of entities.slice(0, 4 - items.length)) {
    items.push({
      title: `${vocab('Manage', ctx)} ${ent}`,
      description: `${vocab('Full', ctx)} ${ent.toLowerCase()} ${vocab('management', ctx)}`,
      icon: 'database',
    });
  }

  // Pad with industry-specific features if needed
  if (items.length < 3) {
    const industryFeatures: Record<string, { title: string; desc: string; icon: string }[]> = {
      restaurant: [
        { title: 'Online Ordering', desc: 'Let customers order ahead for pickup or delivery', icon: 'shopping-bag' },
        { title: 'Table Reservations', desc: 'Real-time availability and instant booking', icon: 'calendar' },
        { title: 'Menu Management', desc: 'Update dishes, prices, and specials instantly', icon: 'book-open' },
      ],
      healthcare: [
        { title: 'Appointment Booking', desc: 'Patients book visits online 24/7', icon: 'calendar' },
        { title: 'Patient Portal', desc: 'Secure access to records and communications', icon: 'shield' },
        { title: 'Telehealth', desc: 'Virtual consultations from anywhere', icon: 'video' },
      ],
      saas: [
        { title: 'Usage Analytics', desc: 'Track feature adoption and user engagement', icon: 'bar-chart' },
        { title: 'Team Management', desc: 'Invite members and control permissions', icon: 'users' },
        { title: 'API Access', desc: 'Integrate with your existing tools', icon: 'code' },
      ],
      ecommerce: [
        { title: 'Product Catalog', desc: 'Showcase your products with rich media', icon: 'grid' },
        { title: 'Secure Checkout', desc: 'Fast, frictionless payment processing', icon: 'lock' },
        { title: 'Order Tracking', desc: 'Real-time shipping updates for customers', icon: 'truck' },
      ],
      fitness: [
        { title: 'Class Booking', desc: 'Reserve your spot in any class', icon: 'calendar' },
        { title: 'Membership Plans', desc: 'Flexible pricing for every commitment level', icon: 'credit-card' },
        { title: 'Workout Tracking', desc: 'Monitor progress and celebrate milestones', icon: 'activity' },
      ],
      education: [
        { title: 'Course Library', desc: 'Browse and enroll in courses instantly', icon: 'book-open' },
        { title: 'Progress Tracking', desc: 'See where you left off and what is next', icon: 'trending-up' },
        { title: 'Certificates', desc: 'Earn credentials for completed courses', icon: 'award' },
      ],
      realestate: [
        { title: 'Property Search', desc: 'Find your perfect property with smart filters', icon: 'search' },
        { title: 'Virtual Tours', desc: 'Explore properties from the comfort of home', icon: 'eye' },
        { title: 'Agent Connect', desc: 'Get matched with local market experts', icon: 'users' },
      ],
      legal: [
        { title: 'Case Management', desc: 'Track cases from intake to resolution', icon: 'briefcase' },
        { title: 'Document Assembly', desc: 'Generate legal documents from templates', icon: 'file-text' },
        { title: 'Client Portal', desc: 'Secure communication and document sharing', icon: 'lock' },
      ],
      agency: [
        { title: 'Project Pipeline', desc: 'Track leads from pitch to signed contract', icon: 'funnel' },
        { title: 'Client Portal', desc: 'Share deliverables and collect feedback', icon: 'users' },
        { title: 'Time Tracking', desc: 'Log hours and manage team workloads', icon: 'clock' },
      ],
      nonprofit: [
        { title: 'Donation Management', desc: 'Accept and track donations across channels', icon: 'heart' },
        { title: 'Volunteer Coordination', desc: 'Sign up, schedule, and manage volunteers', icon: 'users' },
        { title: 'Impact Reports', desc: 'Show donors the difference they make', icon: 'bar-chart' },
      ],
      media: [
        { title: 'Content Publishing', desc: 'Draft, review, and publish articles', icon: 'edit' },
        { title: 'Subscriber Management', desc: 'Grow and engage your audience', icon: 'users' },
        { title: 'Analytics Dashboard', desc: 'Track views, engagement, and growth', icon: 'bar-chart' },
      ],
      travel: [
        { title: 'Trip Builder', desc: 'Create custom itineraries in minutes', icon: 'map' },
        { title: 'Booking Engine', desc: 'Reserve flights, hotels, and activities', icon: 'calendar' },
        { title: 'Travel Guides', desc: 'Curated local insights and recommendations', icon: 'compass' },
      ],
      luxury: [
        { title: 'VIP Experience', desc: 'Exclusive access to limited editions', icon: 'gem' },
        { title: 'Concierge Service', desc: 'Personalized assistance for every need', icon: 'headphones' },
        { title: 'Private Viewings', desc: 'Book one-on-one appointments', icon: 'eye' },
      ],
      beauty: [
        { title: 'Service Menu', desc: 'Browse treatments and book online', icon: 'scissors' },
        { title: 'Stylist Profiles', desc: 'Find your perfect match by specialty', icon: 'user' },
        { title: 'Loyalty Rewards', desc: 'Earn points with every visit', icon: 'gift' },
      ],
      event: [
        { title: 'Event Discovery', desc: 'Find events that match your interests', icon: 'search' },
        { title: 'Ticket Purchase', desc: 'Secure your spot in seconds', icon: 'ticket' },
        { title: 'Event Calendar', desc: 'Never miss an upcoming event', icon: 'calendar' },
      ],
      portfolio: [
        { title: 'Project Showcase', desc: 'Display your best work with rich media', icon: 'image' },
        { title: 'Case Studies', desc: 'Tell the story behind each project', icon: 'file-text' },
        { title: 'Contact Form', desc: 'Make it easy for clients to reach you', icon: 'mail' },
      ],
      automotive: [
        { title: 'Vehicle Inventory', desc: 'Browse our complete vehicle lineup', icon: 'car' },
        { title: 'Test Drive Booking', desc: 'Schedule a test drive at your convenience', icon: 'calendar' },
        { title: 'Financing Calculator', desc: 'Estimate monthly payments instantly', icon: 'calculator' },
      ],
      enterprise: [
        { title: 'Workflow Automation', desc: 'Automate repetitive business processes', icon: 'zap' },
        { title: 'Reporting & Analytics', desc: 'Real-time insights across all departments', icon: 'bar-chart' },
        { title: 'Role-Based Access', desc: 'Granular permissions for every team member', icon: 'shield' },
      ],
      logistics: [
        { title: 'Shipment Tracking', desc: 'Monitor deliveries in real time', icon: 'truck' },
        { title: 'Route Optimization', desc: 'Reduce costs with smart routing', icon: 'map' },
        { title: 'Warehouse Management', desc: 'Track inventory across all locations', icon: 'package' },
      ],
      manufacturing: [
        { title: 'Production Planning', desc: 'Schedule and optimize manufacturing runs', icon: 'settings' },
        { title: 'Quality Control', desc: 'Track defect rates and ensure compliance', icon: 'check-circle' },
        { title: 'Supply Chain', desc: 'Manage suppliers and raw materials', icon: 'link' },
      ],
      fintech: [
        { title: 'Transaction Processing', desc: 'Accept payments with industry-leading security', icon: 'credit-card' },
        { title: 'Fraud Detection', desc: 'AI-powered monitoring for suspicious activity', icon: 'shield' },
        { title: 'Financial Reporting', desc: 'Real-time dashboards and compliance reports', icon: 'bar-chart' },
      ],
      proptech: [
        { title: 'Tenant Management', desc: 'Onboard and manage tenants efficiently', icon: 'users' },
        { title: 'Lease Tracking', desc: 'Never miss a renewal or payment deadline', icon: 'file-text' },
        { title: 'Maintenance Requests', desc: 'Submit and track repair requests', icon: 'tool' },
      ],
    };
    const extra = industryFeatures[industry] ?? industryFeatures['saas'] ?? [];
    for (const f of extra) {
      if (items.length >= 4) break;
      items.push({ title: f.title, description: f.desc, icon: f.icon });
    }
  }

  return items;
}

/** Get industry-specific about items */
function getAboutItems(ctx: ContentResolverContext): ItemSpec[] {
  const industry = ctx.blueprint.industry;
  const aboutData: Record<string, ItemSpec[]> = {
    restaurant: [
      { title: 'Our Kitchen', description: 'Farm-to-table ingredients prepared with passion by our award-winning chefs', icon: 'chef-hat' },
      { title: 'Our Story', description: 'Family-owned since 2010, serving the community with love and flavor', icon: 'heart' },
      { title: 'Our Promise', description: 'Every dish crafted fresh daily with locally sourced ingredients', icon: 'leaf' },
    ],
    healthcare: [
      { title: 'Our Practice', description: 'Compassionate care backed by the latest medical technology', icon: 'heart-pulse' },
      { title: 'Our Team', description: 'Board-certified physicians with decades of combined experience', icon: 'users' },
      { title: 'Our Mission', description: 'Making quality healthcare accessible to every patient', icon: 'stethoscope' },
    ],
    saas: [
      { title: 'Why We Built This', description: 'Frustrated by existing tools, we created the platform we wished existed', icon: 'lightbulb' },
      { title: 'Our Approach', description: 'Developer-first design with enterprise-grade reliability', icon: 'code' },
      { title: 'By the Numbers', description: 'Trusted by thousands of teams across 50+ countries', icon: 'globe' },
    ],
    ecommerce: [
      { title: 'Curated Quality', description: 'Every product hand-selected for quality, design, and value', icon: 'star' },
      { title: 'Our Story', description: 'Started with a simple idea: make great products accessible', icon: 'package' },
      { title: 'Our Promise', description: 'Free shipping, easy returns, and customer service that cares', icon: 'shield' },
    ],
    fitness: [
      { title: 'Our Space', description: 'State-of-the-art equipment in a motivating, welcoming environment', icon: 'dumbbell' },
      { title: 'Our Philosophy', description: 'Fitness is not a destination — it is a lifelong journey', icon: 'heart' },
      { title: 'Our Community', description: 'More than a gym — a supportive family of like-minded people', icon: 'users' },
    ],
    education: [
      { title: 'Our Academy', description: 'Industry experts teaching practical, job-ready skills', icon: 'graduation-cap' },
      { title: 'Our Method', description: 'Hands-on projects and real-world case studies, not just lectures', icon: 'monitor' },
      { title: 'Our Impact', description: 'Over 10,000 graduates and counting, each with new career opportunities', icon: 'trending-up' },
    ],
    realestate: [
      { title: 'Local Expertise', description: 'Deep knowledge of neighborhoods, markets, and investment opportunities', icon: 'map-pin' },
      { title: 'Our Network', description: 'Connections to the finest properties and trusted professionals', icon: 'link' },
      { title: 'Client First', description: 'Guiding you every step from search to closing', icon: 'handshake' },
    ],
    legal: [
      { title: 'Our Firm', description: 'Decades of courtroom experience with a track record of results', icon: 'scale' },
      { title: 'Our Values', description: 'Integrity, diligence, and unwavering commitment to our clients', icon: 'shield' },
      { title: 'Our Reach', description: 'Serving individuals and businesses across the region', icon: 'globe' },
    ],
    agency: [
      { title: 'Who We Are', description: 'A collective of strategists, designers, and technologists', icon: 'users' },
      { title: 'What We Do', description: 'Transform brands through compelling digital experiences', icon: 'palette' },
      { title: 'How We Work', description: 'Data-driven creative that delivers measurable business impact', icon: 'bar-chart' },
    ],
    nonprofit: [
      { title: 'Our Cause', description: 'Dedicated to creating lasting change in the communities we serve', icon: 'heart' },
      { title: 'Our Impact', description: 'Every donation directly funds programs that change lives', icon: 'trending-up' },
      { title: 'Our Community', description: 'Powered by volunteers who share a vision for a better world', icon: 'users' },
    ],
    media: [
      { title: 'Our Platform', description: 'Independent journalism and storytelling that matters', icon: 'newspaper' },
      { title: 'Our Mission', description: 'Inform, inspire, and spark meaningful conversations', icon: 'zap' },
      { title: 'Our Team', description: 'Award-winning writers, editors, and content creators', icon: 'users' },
    ],
    travel: [
      { title: 'Our Expertise', description: 'Years of curating unforgettable travel experiences worldwide', icon: 'compass' },
      { title: 'Our Partners', description: 'Exclusive deals with top airlines, hotels, and tour operators', icon: 'handshake' },
      { title: 'Our Promise', description: 'Every trip planned with care, every detail handled for you', icon: 'check-circle' },
    ],
    luxury: [
      { title: 'Heritage', description: 'A legacy of craftsmanship spanning three generations', icon: 'crown' },
      { title: 'Exclusivity', description: 'Limited editions and bespoke pieces for the discerning few', icon: 'gem' },
      { title: 'Experience', description: 'Private viewings and personalized concierge service', icon: 'star' },
    ],
    beauty: [
      { title: 'Our Studio', description: 'A sanctuary for self-care with award-winning treatments', icon: 'sparkles' },
      { title: 'Our Experts', description: 'Certified professionals trained in the latest techniques', icon: 'user' },
      { title: 'Our Products', description: 'Premium, cruelty-free products from top brands', icon: 'flower-2' },
    ],
    event: [
      { title: 'Our Vision', description: 'Creating unforgettable moments that bring people together', icon: 'sparkles' },
      { title: 'Our Track Record', description: 'Over 500 successful events and counting', icon: 'award' },
      { title: 'Our Team', description: 'Professional event planners with creative vision', icon: 'users' },
    ],
    portfolio: [
      { title: 'About Me', description: 'A creative professional with a passion for meaningful design', icon: 'user' },
      { title: 'My Process', description: 'Research-driven design that balances beauty and function', icon: 'compass' },
      { title: 'Recognition', description: 'Featured in industry publications and design awards', icon: 'award' },
    ],
    automotive: [
      { title: 'Our Dealership', description: 'Family-owned since 1985 with a reputation for honesty', icon: 'shield' },
      { title: 'Our Inventory', description: 'New and certified pre-owned vehicles with full warranties', icon: 'car' },
      { title: 'Our Service', description: 'Factory-trained technicians keeping your vehicle at its best', icon: 'wrench' },
    ],
    enterprise: [
      { title: 'Enterprise-Grade', description: 'Built for scale with 99.99% uptime SLA and SOC 2 compliance', icon: 'shield' },
      { title: 'Integration Hub', description: 'Connects with 200+ enterprise tools out of the box', icon: 'puzzle' },
      { title: 'Dedicated Support', description: 'Named account managers and 24/7 priority support', icon: 'headphones' },
    ],
    logistics: [
      { title: 'Global Reach', description: 'Delivery network spanning 150+ countries and 50,000+ zip codes', icon: 'globe' },
      { title: 'Real-Time Visibility', description: 'Track every package from warehouse to doorstep', icon: 'eye' },
      { title: 'Reliability', description: '99.5% on-time delivery rate with money-back guarantee', icon: 'check-circle' },
    ],
    manufacturing: [
      { title: 'Precision Engineering', description: 'ISO-certified processes ensuring consistent quality', icon: 'settings' },
      { title: 'Scale & Speed', description: 'From prototype to full production in weeks, not months', icon: 'zap' },
      { title: 'Quality Assurance', description: 'Every product inspected to meet the highest standards', icon: 'check-circle' },
    ],
    fintech: [
      { title: 'Security First', description: 'Bank-grade encryption and PCI DSS Level 1 compliance', icon: 'lock' },
      { title: 'Innovation', description: 'Cutting-edge technology powering financial transformation', icon: 'cpu' },
      { title: 'Trust', description: 'Processing billions in transactions for thousands of businesses', icon: 'shield' },
    ],
    proptech: [
      { title: 'Smart Property Management', description: 'Technology that simplifies every aspect of property operations', icon: 'building' },
      { title: 'Tenant Experience', description: 'Modern tools that tenants love and managers trust', icon: 'smile' },
      { title: 'Data-Driven Decisions', description: 'Real-time analytics for occupancy, revenue, and maintenance', icon: 'bar-chart' },
    ],
  };

  const items = aboutData[industry] ?? aboutData['saas'] ?? [
    { title: 'Our Story', description: ctx.blueprint.description ?? 'Built with a vision to transform the industry', icon: 'flag' },
    { title: 'Our Mission', description: 'Delivering exceptional value through innovative solutions', icon: 'target' },
    { title: 'Our Impact', description: 'Trusted by customers across the globe', icon: 'trending-up' },
  ];
  return items;
}

/** Get industry-specific mission items */
function getMissionItems(ctx: ContentResolverContext): ItemSpec[] {
  const industry = ctx.blueprint.industry;
  const missionData: Record<string, ItemSpec[]> = {
    restaurant: [
      { title: 'Fresh Ingredients', description: 'Locally sourced, seasonal produce from trusted farms', icon: 'leaf' },
      { title: 'Community', description: 'Bringing people together around exceptional food', icon: 'users' },
      { title: 'Sustainability', description: 'Zero-waste kitchen and eco-friendly packaging', icon: 'recycle' },
    ],
    healthcare: [
      { title: 'Patient-Centered Care', description: 'Every decision starts with what is best for the patient', icon: 'heart' },
      { title: 'Accessibility', description: 'Quality healthcare should not depend on location or income', icon: 'globe' },
      { title: 'Innovation', description: 'Adopting the latest evidence-based practices and technology', icon: 'zap' },
    ],
    saas: [
      { title: 'Simplicity', description: 'Complex problems deserve simple, elegant solutions', icon: 'zap' },
      { title: 'Reliability', description: 'Your business depends on us — we take that seriously', icon: 'shield' },
      { title: 'User Empowerment', description: 'Tools that make your team faster, not slower', icon: 'users' },
    ],
    ecommerce: [
      { title: 'Customer Obsession', description: 'Every touchpoint designed to delight and exceed expectations', icon: 'heart' },
      { title: 'Quality Curation', description: 'We vet every product so you do not have to', icon: 'star' },
      { title: 'Sustainable Commerce', description: 'Responsible sourcing and carbon-neutral shipping', icon: 'leaf' },
    ],
    fitness: [
      { title: 'Inclusive Wellness', description: 'Fitness for every body, every level, every goal', icon: 'heart' },
      { title: 'Community First', description: 'Building strength together, not just individually', icon: 'users' },
      { title: 'Holistic Health', description: 'Mind, body, and nutrition working in harmony', icon: 'sun' },
    ],
    education: [
      { title: 'Lifelong Learning', description: 'Knowledge should be accessible at every stage of life', icon: 'book-open' },
      { title: 'Practical Skills', description: 'Education that directly translates to career advancement', icon: 'briefcase' },
      { title: 'Inclusive Access', description: 'Breaking down barriers to quality education', icon: 'globe' },
    ],
    realestate: [
      { title: 'Trust & Transparency', description: 'Honest guidance through every transaction', icon: 'shield' },
      { title: 'Community Building', description: 'Creating neighborhoods where people thrive', icon: 'home' },
      { title: 'Market Expertise', description: 'Data-driven insights for smarter property decisions', icon: 'bar-chart' },
    ],
    legal: [
      { title: 'Justice', description: 'Fiercely advocating for the rights of our clients', icon: 'scale' },
      { title: 'Integrity', description: 'Ethical practice in every case we take on', icon: 'shield' },
      { title: 'Access to Justice', description: 'Legal help should not be reserved for the wealthy', icon: 'globe' },
    ],
    agency: [
      { title: 'Creative Excellence', description: 'Pushing boundaries with every project we deliver', icon: 'star' },
      { title: 'Client Partnership', description: 'Your success is our success — we work as one team', icon: 'handshake' },
      { title: 'Measurable Impact', description: 'Beautiful work that drives real business results', icon: 'trending-up' },
    ],
    nonprofit: [
      { title: 'Compassion', description: 'Leading with empathy in everything we do', icon: 'heart' },
      { title: 'Transparency', description: 'Every dollar accounted for, every impact measured', icon: 'eye' },
      { title: 'Sustainable Change', description: 'Building solutions that outlast any single program', icon: 'refresh-cw' },
    ],
  };

  const defaults: ItemSpec[] = [
    { title: 'Innovation', description: 'Pushing boundaries of what is possible in our industry', icon: 'zap' },
    { title: 'Accessibility', description: 'Making our solutions available to everyone who needs them', icon: 'globe' },
    { title: 'Impact', description: 'Measuring success by the difference we make', icon: 'heart' },
  ];

  return missionData[industry] ?? defaults;
}

/** Get industry-specific team roles */
function getTeamRoles(ctx: ContentResolverContext): ItemSpec[] {
  const industry = ctx.blueprint.industry;
  const teamData: Record<string, ItemSpec[]> = {
    restaurant: [
      { title: 'Executive Chef', description: 'Culinary visionary leading our kitchen with 15+ years of experience', icon: 'chef-hat' },
      { title: 'Sommelier', description: 'Expert wine pairing and curated beverage program', icon: 'wine' },
      { title: 'General Manager', description: 'Ensuring every guest has an exceptional dining experience', icon: 'user' },
    ],
    healthcare: [
      { title: 'Medical Director', description: 'Board-certified physician guiding clinical excellence', icon: 'stethoscope' },
      { title: 'Head Nurse', description: 'Leading our care team with compassion and expertise', icon: 'heart-pulse' },
      { title: 'Practice Manager', description: 'Keeping operations running smoothly for patients and staff', icon: 'settings' },
    ],
    saas: [
      { title: 'CEO & Founder', description: 'Product vision and company strategy', icon: 'crown' },
      { title: 'CTO', description: 'Technical architecture and engineering leadership', icon: 'cpu' },
      { title: 'Head of Product', description: 'Turning customer insights into product roadmaps', icon: 'compass' },
    ],
    ecommerce: [
      { title: 'Founder', description: 'Passionate about curating the best products for our customers', icon: 'star' },
      { title: 'Operations Lead', description: 'Ensuring every order ships fast and arrives perfect', icon: 'truck' },
      { title: 'Brand Director', description: 'Crafting the visual identity and customer experience', icon: 'palette' },
    ],
    fitness: [
      { title: 'Head Trainer', description: 'Certified fitness professional with specialized certifications', icon: 'dumbbell' },
      { title: 'Studio Manager', description: 'Creating a welcoming environment for every member', icon: 'smile' },
      { title: 'Wellness Coach', description: 'Guiding members on nutrition, recovery, and mindset', icon: 'heart' },
    ],
    education: [
      { title: 'Lead Instructor', description: 'Industry expert with a passion for teaching', icon: 'graduation-cap' },
      { title: 'Curriculum Director', description: 'Designing courses that deliver real-world skills', icon: 'book-open' },
      { title: 'Student Success Manager', description: 'Supporting learners from enrollment to graduation', icon: 'users' },
    ],
    realestate: [
      { title: 'Broker', description: 'Licensed professional with deep local market knowledge', icon: 'badge' },
      { title: 'Listing Agent', description: 'Specialist in marketing and selling properties', icon: 'home' },
      { title: 'Transaction Coordinator', description: 'Managing every detail from offer to closing', icon: 'clipboard' },
    ],
    legal: [
      { title: 'Managing Partner', description: 'Overseeing firm strategy and high-profile cases', icon: 'scale' },
      { title: 'Senior Associate', description: 'Lead counsel with expertise in complex litigation', icon: 'briefcase' },
      { title: 'Paralegal', description: 'Research and case preparation excellence', icon: 'file-text' },
    ],
    agency: [
      { title: 'Creative Director', description: 'Setting the creative vision across all projects', icon: 'palette' },
      { title: 'Strategy Lead', description: 'Turning business goals into actionable creative briefs', icon: 'target' },
      { title: 'Account Manager', description: 'Your primary point of contact and project advocate', icon: 'users' },
    ],
    nonprofit: [
      { title: 'Executive Director', description: 'Leading our mission with passion and integrity', icon: 'heart' },
      { title: 'Program Manager', description: 'Designing and executing programs that create real impact', icon: 'award' },
      { title: 'Community Outreach', description: 'Connecting with the people and partners who make our work possible', icon: 'users' },
    ],
  };

  const defaults: ItemSpec[] = [
    { title: 'Leadership', description: 'Driving our vision forward with experience and passion', icon: 'crown' },
    { title: 'Engineering', description: 'Building reliable, scalable technology solutions', icon: 'code' },
    { title: 'Design', description: 'Crafting intuitive and beautiful user experiences', icon: 'palette' },
  ];

  return teamData[industry] ?? defaults;
}

// ─── Component Resolvers ────────────────────────────────────────────────────

function vocab(text: string, ctx: ContentResolverContext): string {
  let result = text;
  for (const [generic, industry] of Object.entries(ctx.vocabulary)) {
    const regex = new RegExp(`\\b${generic}\\b`, 'gi');
    result = result.replace(regex, industry);
  }
  return result;
}

// ─── Content Resolver ────────────────────────────────────────────────────────

export interface ContentResolverContext {
  blueprint: ApplicationBlueprint;
  vocabulary: Record<string, string>;
  /** The matched industry pattern — provides navigation, workflows, integrations */
  pattern?: Pattern;
  /** The matched design profile — provides styling guidance */
  designProfile?: DesignProfile;
}

/**
 * Resolve an Execution Blueprint into an Application Spec.
 * Fills all content from structured business knowledge.
 */
export function resolveContent(
  execBlueprint: ExecutionBlueprint,
  ctx: ContentResolverContext,
): ApplicationSpec {
  log.info('Resolving content', {
    pages: execBlueprint.pages.length,
    industry: ctx.blueprint.industry,
  });

  const t = Date.now();
  const pages = execBlueprint.pages.map(page =>
    resolvePageSpec(page, ctx),
  );

  const totalComponents = pages.reduce((sum, p) => sum + p.components.length, 0);
  log.info('Content resolved', {
    pages: pages.length,
    totalComponents,
    duration: Date.now() - t,
  });

  return {
    id: `spec-${execBlueprint.id}`,
    createdAt: new Date().toISOString(),
    appId: execBlueprint.appId,
    appName: execBlueprint.appName,
    industry: execBlueprint.industry,
    themeId: execBlueprint.themeId,
    pages,
    metadata: execBlueprint.metadata,
  };
}

// ─── Page Resolution ─────────────────────────────────────────────────────────

function resolvePageSpec(
  page: PageExecutionPlan,
  ctx: ContentResolverContext,
): PageSpec {
  const components = page.slots.map(slot =>
    resolveComponentSpec(slot, page, ctx),
  );

  return {
    pageId: page.pageId,
    path: page.path,
    name: page.name,
    type: page.type,
    layout: page.layout,
    components,
    seo: page.seo,
  };
}

// ─── Component Resolution ────────────────────────────────────────────────────

function resolveComponentSpec(
  slot: ComponentSlot,
  page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const resolver = COMPONENT_RESOLVERS[slot.component] ?? resolveGenericComponent;
  return resolver(slot, page, ctx);
}

// ─── Individual Component Resolvers ──────────────────────────────────────────

type ComponentResolver = (
  slot: ComponentSlot,
  page: PageExecutionPlan,
  ctx: ContentResolverContext,
) => ComponentSpec;

const COMPONENT_RESOLVERS: Record<string, ComponentResolver> = {
  // ─── Core page sections ──────────────────────────────────────────────
  HeroBanner: resolveHeroBanner,
  FeatureGrid: resolveFeatureGrid,
  PricingTable: resolvePricingTable,
  Testimonials: resolveTestimonials,
  CTASection: resolveCTASection,
  FAQSection: resolveFAQSection,
  Footer: resolveFooter,

  // ─── Commerce ────────────────────────────────────────────────────────
  ProductGrid: resolveProductGrid,
  ProductGallery: resolveProductGallery,
  ProductInfo: resolveProductInfo,
  CategoryGrid: resolveCategoryGrid,
  CartItems: resolveCartItems,
  CheckoutForm: resolveCheckoutForm,
  OrderSummary: resolveOrderSummary,
  OrderReview: resolveOrderReview,
  OrderStatus: resolveOrderStatus,
  OrderHistory: resolveOrderHistory,
  OrderTracking: resolveOrderTracking,
  RecommendedProducts: resolveRecommendedProducts,
  PaymentForm: resolvePaymentForm,
  PaymentMethod: resolvePaymentMethod,
  FeatureComparison: resolveFeatureComparison,

  // ─── Dashboard ───────────────────────────────────────────────────────
  StatsCards: resolveStatsCards,
  ChartsPanel: resolveChartsPanel,
  ActivityFeed: resolveActivityFeed,
  DataGrid: resolveDataGrid,

  // ─── Auth ────────────────────────────────────────────────────────────
  AuthForm: resolveAuthForm,
  SocialAuth: resolveSocialAuth,

  // ─── Calendar / Booking ─────────────────────────────────────────────
  CalendarWidget: resolveCalendarWidget,
  BookingCalendar: resolveBookingCalendar,

  // ─── Account ─────────────────────────────────────────────────────────
  ProfileSection: resolveProfileSection,
  BillingSection: resolveBillingSection,
  NotificationsSection: resolveNotificationsSection,
  PlanDetails: resolvePlanDetails,
  InvoiceList: resolveInvoiceList,
  AddressBook: resolveAddressBook,
  Wishlist: resolveWishlist,

  // ─── Contact / About ─────────────────────────────────────────────────
  ContactForm: resolveContactForm,
  AboutSection: resolveAboutSection,
  TeamSection: resolveTeamSection,
  TeamGrid: resolveTeamGrid,
  MissionSection: resolveMissionSection,
  Gallery: resolveGallery,

  // ─── Data / Filtering ────────────────────────────────────────────────
  DataTable: resolveDataTable,
  FilterSidebar: resolveFilterSidebar,
  SortBar: resolveSortBar,
};

function resolveHeroBanner(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const ctaLabel = ctx.pattern?.workflows[0]
    ? `Start ${ctx.pattern.workflows[0]}`
    : vocab('Get Started', ctx);

  return {
    type: 'HeroBanner',
    content: {
      title: { value: ctx.blueprint.name, type: 'text' },
      subtitle: { value: ctx.blueprint.description ?? `${ctx.blueprint.industry} platform`, type: 'text' },
      badge: { value: ctx.blueprint.industry, type: 'text' },
    },
    actions: [
      { label: ctaLabel, action: '/signup', style: 'primary' },
      { label: vocab('Learn More', ctx), action: '#features', style: 'ghost' },
    ],
    layout: { alignment: 'center', maxWidth: '4xl', padding: 'lg' },
  };
}

function resolveFeatureGrid(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'FeatureGrid',
    content: {
      title: { value: vocab('Features', ctx), type: 'text' },
      subtitle: { value: vocab('Everything you need', ctx), type: 'text' },
    },
    items: resolveFeatures(ctx),
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

function resolveProductGrid(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'ProductGrid',
    content: {
      title: { value: vocab('All Products', ctx), type: 'text' },
      subtitle: { value: vocab('Browse our collection', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Product', type: 'text' },
    },
    columns: entity?.fields.map(f => ({
      key: f.name,
      label: f.name.charAt(0).toUpperCase() + f.name.slice(1),
      type: 'text' as const,
      sortable: true,
      filterable: f.indexed,
    })),
    layout: { alignment: 'left', maxWidth: '7xl' },
  };
}

function resolvePricingTable(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'PricingTable',
    content: {
      title: { value: vocab('Pricing', ctx), type: 'text' },
      subtitle: { value: vocab('Choose your plan', ctx), type: 'text' },
    },
    tiers: resolvePricingTiers(ctx),
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

function resolveTestimonials(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  // Derive industry-specific role titles from pattern or vocabulary
  const roleTitle = ctx.pattern
    ? ctx.pattern.compatibleIndustries[0]?.charAt(0).toUpperCase() + (ctx.pattern.compatibleIndustries[0]?.slice(1) ?? '')
    : vocab('User', ctx);

  return {
    type: 'Testimonials',
    content: {
      title: { value: vocab('What Our Users Say', ctx), type: 'text' },
      subtitle: { value: vocab('Trusted by thousands', ctx), type: 'text' },
    },
    items: [
      { title: 'Alex Rivera', description: `${roleTitle} Owner`, metadata: { quote: `This platform transformed how I run my ${vocab('business', ctx)}. Highly recommended!` } },
      { title: 'Jordan Lee', description: `Operations Lead`, metadata: { quote: `The best ${vocab('product', ctx)} we have used. Clean, fast, and reliable.` } },
      { title: 'Sam Patel', description: `Manager`, metadata: { quote: `Our team productivity increased by 40% since switching.` } },
    ],
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

function resolveCTASection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const ctaLabel = ctx.pattern?.workflows[0]
    ? ctx.pattern.workflows[0]
    : vocab('Get Started Free', ctx);

  return {
    type: 'CTASection',
    content: {
      title: { value: vocab('Ready to get started?', ctx), type: 'text' },
      subtitle: { value: `Join ${ctx.blueprint.name} today`, type: 'text' },
    },
    actions: [
      { label: ctaLabel, action: '/signup', style: 'primary' },
    ],
    layout: { alignment: 'center', maxWidth: '4xl', padding: 'lg' },
  };
}

function resolveFAQSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const items: ItemSpec[] = [
    { title: vocab('How do I get started?', ctx), description: 'Simply sign up for a free account and follow the onboarding wizard.' },
  ];

  // Add workflow-based FAQ from pattern
  if (ctx.pattern) {
    for (const workflow of ctx.pattern.workflows.slice(0, 2)) {
      items.push({
        title: `How does ${workflow.toLowerCase()} work?`,
        description: `${workflow} is easy through our platform. Follow the guided steps to complete your first ${workflow.toLowerCase()}.`,
      });
    }
  }

  // Add integration-based FAQ
  if (ctx.pattern?.integrations) {
    for (const integration of ctx.pattern.integrations.filter(i => i.required).slice(0, 1)) {
      items.push({
        title: `How do I set up ${integration.name}?`,
        description: `${integration.name} integration is included with all plans. Connect it from your account settings.`,
      });
    }
  }

  // Add entity import FAQ
  if (ctx.blueprint.entities.length > 0) {
    const entityName = ctx.blueprint.entities[0]!.name;
    items.push({
      title: `Can I import existing ${entityName.toLowerCase()}s?`,
      description: `Yes, we support CSV and JSON import for ${entityName.toLowerCase()}s.`,
    });
  }

  return {
    type: 'FAQSection',
    content: { title: { value: vocab('Frequently Asked Questions', ctx), type: 'text' } },
    items,
    layout: { alignment: 'left', maxWidth: '3xl' },
  };
}

function resolveStatsCards(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const stats: StatSpec[] = [];
  for (const entity of ctx.blueprint.entities.slice(0, 4)) {
    stats.push({ label: `Total ${entity.name}s`, value: '0', change: '+0%', trend: 'neutral' });
  }
  if (stats.length < 4) {
    stats.push(
      { label: vocab('Active Users', ctx), value: '0', change: '+0%', trend: 'neutral' },
      { label: vocab('Revenue', ctx), value: '$0', change: '+0%', trend: 'neutral' },
    );
  }
  return { type: 'StatsCards', stats, layout: { maxWidth: '7xl' } };
}

function resolveChartsPanel(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entities = ctx.blueprint.entities.map(e => e.name);
  const charts = ctx.blueprint.charts.length > 0
    ? ctx.blueprint.charts
    : [
        { id: 'chart-1', type: 'bar' as const, title: `${entities[0] ?? 'Data'} Overview`, series: [], dataEntity: entities[0] ?? '' },
        { id: 'chart-2', type: 'line' as const, title: 'Growth Trend', series: [], dataEntity: '' },
        { id: 'chart-3', type: 'pie' as const, title: 'Distribution', series: [], dataEntity: '' },
      ];

  return {
    type: 'ChartsPanel',
    content: { title: { value: vocab('Analytics Dashboard', ctx), type: 'text' } },
    items: charts.slice(0, 4).map(c => ({
      title: c.title,
      description: `${c.type.charAt(0).toUpperCase() + c.type.slice(1)} chart — ${(c as any).dataEntity ?? entities[0] ?? 'data'}`,
      metadata: { chartType: c.type, dataEntity: (c as any).dataEntity ?? '' },
    })),
    layout: { maxWidth: '7xl' },
  };
}

function resolveAuthForm(
  slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const isLogin = slot.slot.includes('login');
  return {
    type: 'AuthForm',
    content: {
      title: { value: isLogin ? vocab('Welcome Back', ctx) : vocab('Create Account', ctx), type: 'text' },
      subtitle: { value: isLogin ? 'Sign in to your account' : vocab('Get started with your free trial', ctx), type: 'text' },
    },
    fields: [
      { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
      { name: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
      ...(!isLogin ? [{ name: 'name', label: 'Name', type: 'text' as const, required: true, placeholder: 'Your name' }] : []),
    ],
    actions: [
      { label: isLogin ? vocab('Sign In', ctx) : vocab('Create Account', ctx), action: '/api/auth', style: 'primary' },
    ],
    layout: { alignment: 'center', maxWidth: 'sm' },
  };
}

function resolveContactForm(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'ContactForm',
    content: {
      title: { value: vocab('Contact Us', ctx), type: 'text' },
      subtitle: { value: `Get in touch with ${ctx.blueprint.name}`, type: 'text' },
    },
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'subject', label: 'Subject', type: 'text', required: false },
      { name: 'message', label: 'Message', type: 'textarea', required: true },
    ],
    actions: [
      { label: vocab('Send Message', ctx), action: '/api/contact', style: 'primary' },
    ],
    layout: { alignment: 'left', maxWidth: '2xl' },
  };
}

function resolveDataTable(
  slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, slot.slot);
  return {
    type: 'DataTable',
    content: { entity: { value: entity?.name ?? 'Item', type: 'text' } },
    columns: entity?.fields.map(f => ({
      key: f.name,
      label: f.name.charAt(0).toUpperCase() + f.name.slice(1),
      type: 'text' as const,
      sortable: true,
      filterable: f.indexed,
    })),
    layout: { maxWidth: '7xl' },
  };
}

function resolveFooter(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'Footer',
    content: {
      companyName: { value: ctx.blueprint.name, type: 'text' },
      tagline: { value: ctx.blueprint.description ?? '', type: 'text' },
    },
    items: ctx.blueprint.navigation.items.map(i => ({
      title: i.label,
      metadata: { href: i.href },
    })),
    layout: { maxWidth: '7xl' },
  };
}

// ─── Commerce Resolvers ────────────────────────────────────────────────────

function resolveProductGallery(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'ProductGallery',
    content: {
      title: { value: vocab('Product Gallery', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Product', type: 'text' },
    },
    layout: { alignment: 'left', maxWidth: '7xl' },
  };
}

function resolveProductInfo(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'ProductInfo',
    content: {
      title: { value: vocab('Product Details', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Product', type: 'text' },
    },
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'price', label: 'Price', type: 'number', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: false },
      { name: 'sku', label: 'SKU', type: 'text', required: false },
      { name: 'stock', label: 'Stock', type: 'number', required: false },
    ],
    layout: { alignment: 'left', maxWidth: '2xl' },
  };
}

function resolveCategoryGrid(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'CategoryGrid',
    content: {
      title: { value: vocab('Categories', ctx), type: 'text' },
      subtitle: { value: vocab('Browse by category', ctx), type: 'text' },
    },
    items: [
      { title: vocab('All', ctx), icon: 'grid', metadata: { href: '/shop' } },
      { title: vocab('Featured', ctx), icon: 'star', metadata: { href: '/shop?featured=true' } },
      { title: vocab('New Arrivals', ctx), icon: 'sparkles', metadata: { href: '/shop?new=true' } },
      { title: vocab('Sale', ctx), icon: 'tag', metadata: { href: '/shop?sale=true' } },
    ],
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

function resolveCartItems(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'CartItems',
    content: {
      title: { value: vocab('Shopping Cart', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Item', type: 'text' },
    },
    columns: [
      { key: 'name', label: 'Product', type: 'text', sortable: false, filterable: false },
      { key: 'price', label: 'Price', type: 'number', sortable: false, filterable: false },
      { key: 'quantity', label: 'Qty', type: 'number', sortable: false, filterable: false },
      { key: 'total', label: 'Total', type: 'number', sortable: false, filterable: false },
    ],
    actions: [
      { label: vocab('Continue Shopping', ctx), action: '/shop', style: 'ghost' },
      { label: vocab('Checkout', ctx), action: '/checkout', style: 'primary' },
    ],
    layout: { maxWidth: '4xl' },
  };
}

function resolveCheckoutForm(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'CheckoutForm',
    content: {
      title: { value: vocab('Checkout', ctx), type: 'text' },
      subtitle: { value: vocab('Complete your order', ctx), type: 'text' },
    },
    fields: [
      { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
      { name: 'fullName', label: 'Full Name', type: 'text', required: true, placeholder: 'John Doe' },
      { name: 'address', label: 'Address', type: 'text', required: true, placeholder: '123 Main St' },
      { name: 'city', label: 'City', type: 'text', required: true },
      { name: 'state', label: 'State', type: 'text', required: true },
      { name: 'zip', label: 'ZIP Code', type: 'text', required: true },
      { name: 'country', label: 'Country', type: 'select', required: true, options: [
        { label: 'United States', value: 'US' },
        { label: 'Canada', value: 'CA' },
        { label: 'United Kingdom', value: 'GB' },
      ]},
    ],
    actions: [
      { label: vocab('Place Order', ctx), action: '/api/checkout', style: 'primary' },
    ],
    layout: { alignment: 'left', maxWidth: '2xl' },
  };
}

function resolveOrderSummary(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'OrderSummary',
    content: {
      title: { value: vocab('Order Summary', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Subtotal', ctx), metadata: { value: '$0.00' } },
      { title: vocab('Shipping', ctx), metadata: { value: 'Free' } },
      { title: vocab('Tax', ctx), metadata: { value: '$0.00' } },
      { title: vocab('Total', ctx), metadata: { value: '$0.00', bold: 'true' } },
    ],
    layout: { maxWidth: 'md' },
  };
}

function resolveOrderReview(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'OrderReview',
    content: {
      title: { value: vocab('Review Your Order', ctx), type: 'text' },
    },
    columns: [
      { key: 'name', label: 'Product', type: 'text', sortable: false, filterable: false },
      { key: 'quantity', label: 'Qty', type: 'number', sortable: false, filterable: false },
      { key: 'price', label: 'Price', type: 'number', sortable: false, filterable: false },
    ],
    actions: [
      { label: vocab('Confirm Order', ctx), action: '/api/orders', style: 'primary' },
    ],
    layout: { maxWidth: '3xl' },
  };
}

function resolveOrderStatus(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'OrderStatus',
    content: {
      title: { value: vocab('Order Status', ctx), type: 'text' },
      subtitle: { value: vocab('Track your order', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Order Placed', ctx), description: vocab('Your order has been confirmed', ctx), icon: 'check-circle', metadata: { status: 'complete' } },
      { title: vocab('Processing', ctx), description: vocab('We are preparing your order', ctx), icon: 'clock', metadata: { status: 'active' } },
      { title: vocab('Shipped', ctx), description: vocab('Your order is on the way', ctx), icon: 'truck', metadata: { status: 'pending' } },
      { title: vocab('Delivered', ctx), description: vocab('Package delivered', ctx), icon: 'package', metadata: { status: 'pending' } },
    ],
    layout: { alignment: 'center', maxWidth: '2xl' },
  };
}

function resolveOrderHistory(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'OrderHistory',
    content: {
      title: { value: vocab('Order History', ctx), type: 'text' },
    },
    columns: [
      { key: 'orderId', label: 'Order ID', type: 'text', sortable: true, filterable: false },
      { key: 'date', label: 'Date', type: 'date', sortable: true, filterable: false },
      { key: 'status', label: 'Status', type: 'status', sortable: true, filterable: true },
      { key: 'total', label: 'Total', type: 'number', sortable: true, filterable: false },
    ],
    layout: { maxWidth: '7xl' },
  };
}

function resolveOrderTracking(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'OrderTracking',
    content: {
      title: { value: vocab('Track Order', ctx), type: 'text' },
      subtitle: { value: vocab('Enter your order number', ctx), type: 'text' },
    },
    fields: [
      { name: 'orderNumber', label: 'Order Number', type: 'text', required: true, placeholder: 'ORD-12345' },
    ],
    actions: [
      { label: vocab('Track', ctx), action: '/api/track', style: 'primary' },
    ],
    layout: { alignment: 'center', maxWidth: 'sm' },
  };
}

function resolveRecommendedProducts(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'RecommendedProducts',
    content: {
      title: { value: vocab('You May Also Like', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Product', type: 'text' },
    },
    items: [
      { title: vocab('Featured Item', ctx), description: vocab('Top rated product', ctx), icon: 'star' },
      { title: vocab('Popular Choice', ctx), description: vocab('Best seller in category', ctx), icon: 'trending-up' },
      { title: vocab('New Arrival', ctx), description: vocab('Just added to collection', ctx), icon: 'sparkles' },
    ],
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

function resolvePaymentForm(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'PaymentForm',
    content: {
      title: { value: vocab('Payment Details', ctx), type: 'text' },
    },
    fields: [
      { name: 'cardNumber', label: 'Card Number', type: 'text', required: true, placeholder: '4242 4242 4242 4242' },
      { name: 'cardName', label: 'Name on Card', type: 'text', required: true },
      { name: 'expiry', label: 'Expiry Date', type: 'text', required: true, placeholder: 'MM/YY' },
      { name: 'cvv', label: 'CVV', type: 'text', required: true, placeholder: '123' },
    ],
    layout: { alignment: 'left', maxWidth: 'sm' },
  };
}

function resolvePaymentMethod(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'PaymentMethod',
    content: {
      title: { value: vocab('Payment Methods', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Visa ending in 4242', ctx), description: vocab('Expires 12/25', ctx), icon: 'credit-card', metadata: { default: 'true' } },
    ],
    actions: [
      { label: vocab('Add Payment Method', ctx), action: '/account/payment/add', style: 'primary' },
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolveFeatureComparison(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const workflows = getWorkflowNames(ctx);
  const integrations = ctx.blueprint.integrations.map(i => i.name);
  const features = [
    ...(workflows.slice(0, 3).map(w => ({ title: w, metadata: { basic: 'Yes', pro: 'Yes', enterprise: 'Yes' } }))),
    { title: 'API Access', metadata: { basic: 'Limited', pro: 'Full', enterprise: 'Custom' } },
    { title: 'Integrations', metadata: { basic: '3', pro: '15', enterprise: 'Unlimited' } },
  ];

  return {
    type: 'FeatureComparison',
    content: {
      title: { value: vocab('Compare Plans', ctx), type: 'text' },
    },
    columns: [
      { key: 'feature', label: 'Feature', type: 'text', sortable: false, filterable: false },
      { key: 'basic', label: 'Basic', type: 'text', sortable: false, filterable: false },
      { key: 'pro', label: 'Pro', type: 'text', sortable: false, filterable: false },
      { key: 'enterprise', label: 'Enterprise', type: 'text', sortable: false, filterable: false },
    ],
    items: features,
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

// ─── Dashboard Resolvers ──────────────────────────────────────────────────

function resolveActivityFeed(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const primaryEntity = getPrimaryEntityName(ctx);
  const workflows = getWorkflowNames(ctx);
  return {
    type: 'ActivityFeed',
    content: {
      title: { value: vocab('Recent Activity', ctx), type: 'text' },
    },
    items: [
      { title: `New ${primaryEntity.toLowerCase()} added`, description: `${primaryEntity} #1234 — updated by your team`, icon: 'plus-circle', metadata: { time: '2 min ago' } },
      { title: `${workflows[0] ?? 'Task'} completed`, description: `Automated workflow finished successfully`, icon: 'check-circle', metadata: { time: '15 min ago' } },
      { title: 'Team member updated record', description: `${primaryEntity} details were modified`, icon: 'edit', metadata: { time: '1 hour ago' } },
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolveDataGrid(
  slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, slot.slot);
  return {
    type: 'DataGrid',
    content: {
      title: { value: vocab(`${entity?.name ?? 'Data'} Management`, ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Item', type: 'text' },
    },
    columns: entity?.fields.map(f => ({
      key: f.name,
      label: f.name.charAt(0).toUpperCase() + f.name.slice(1),
      type: 'text' as const,
      sortable: true,
      filterable: f.indexed,
    })),
    actions: [
      { label: vocab('Add', ctx), action: '#', style: 'primary' },
    ],
    layout: { maxWidth: '7xl' },
  };
}

// ─── Auth Resolvers ───────────────────────────────────────────────────────

function resolveSocialAuth(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const industry = ctx.blueprint.industry;
  // B2B/enterprise apps prefer Google/Microsoft, B2C adds Apple/Twitter
  const isB2B = ctx.blueprint.businessModels.some(m => m.includes('subscription') || m.includes('saas'));
  const providers = isB2B
    ? [
        { label: 'Google', action: '/api/auth/google', style: 'secondary' as const },
        { label: 'Microsoft', action: '/api/auth/microsoft', style: 'secondary' as const },
      ]
    : [
        { label: 'Google', action: '/api/auth/google', style: 'secondary' as const },
        { label: 'Apple', action: '/api/auth/apple', style: 'secondary' as const },
      ];

  return {
    type: 'SocialAuth',
    content: {
      title: { value: vocab('Or continue with', ctx), type: 'text' },
    },
    actions: providers,
    layout: { alignment: 'center', maxWidth: 'sm' },
  };
}

// ─── Calendar / Booking Resolvers ─────────────────────────────────────────

function resolveCalendarWidget(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'CalendarWidget',
    content: {
      title: { value: vocab('Calendar', ctx), type: 'text' },
      subtitle: { value: vocab('Select a date', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Monday', ctx), metadata: { day: '1', available: 'true' } },
      { title: vocab('Tuesday', ctx), metadata: { day: '2', available: 'true' } },
      { title: vocab('Wednesday', ctx), metadata: { day: '3', available: 'true' } },
      { title: vocab('Thursday', ctx), metadata: { day: '4', available: 'true' } },
      { title: vocab('Friday', ctx), metadata: { day: '5', available: 'true' } },
      { title: vocab('Saturday', ctx), metadata: { day: '6', available: 'false' } },
      { title: vocab('Sunday', ctx), metadata: { day: '0', available: 'false' } },
    ],
    actions: [
      { label: vocab('Previous', ctx), action: '#prev', style: 'ghost' },
      { label: vocab('Next', ctx), action: '#next', style: 'ghost' },
    ],
    layout: { alignment: 'center', maxWidth: '2xl' },
  };
}

function resolveBookingCalendar(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'BookingCalendar',
    content: {
      title: { value: vocab('Book an Appointment', ctx), type: 'text' },
      subtitle: { value: vocab('Choose your preferred date and time', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Morning', ctx), description: '9:00 AM - 12:00 PM', icon: 'sun', metadata: { slots: '3' } },
      { title: vocab('Afternoon', ctx), description: '1:00 PM - 5:00 PM', icon: 'sun', metadata: { slots: '5' } },
      { title: vocab('Evening', ctx), description: '6:00 PM - 8:00 PM', icon: 'moon', metadata: { slots: '2' } },
    ],
    fields: [
      { name: 'date', label: 'Preferred Date', type: 'date', required: true },
      { name: 'time', label: 'Preferred Time', type: 'select', required: true, options: [
        { label: '9:00 AM', value: '09:00' },
        { label: '10:00 AM', value: '10:00' },
        { label: '11:00 AM', value: '11:00' },
        { label: '1:00 PM', value: '13:00' },
        { label: '2:00 PM', value: '14:00' },
        { label: '3:00 PM', value: '15:00' },
        { label: '4:00 PM', value: '16:00' },
      ]},
      { name: 'notes', label: 'Notes', type: 'textarea', required: false },
    ],
    actions: [
      { label: vocab('Book Now', ctx), action: '/api/bookings', style: 'primary' },
    ],
    layout: { alignment: 'left', maxWidth: '2xl' },
  };
}

// ─── Account Resolvers ────────────────────────────────────────────────────

function resolveProfileSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const industry = ctx.blueprint.industry;
  const baseFields = [
    { name: 'name', label: 'Full Name', type: 'text' as const, required: true },
    { name: 'email', label: 'Email', type: 'email' as const, required: true },
  ];

  // Add industry-specific profile fields
  const extraFields: Record<string, { name: string; label: string; type: string; required: boolean }[]> = {
    healthcare: [{ name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: false }, { name: 'insuranceProvider', label: 'Insurance Provider', type: 'text', required: false }],
    restaurant: [{ name: 'dietaryRestrictions', label: 'Dietary Restrictions', type: 'text', required: false }, { name: 'tablePreference', label: 'Preferred Table', type: 'select', required: false }],
    fitness: [{ name: 'fitnessGoals', label: 'Fitness Goals', type: 'text', required: false }, { name: 'experienceLevel', label: 'Experience Level', type: 'select', required: false }],
    education: [{ name: 'learningGoals', label: 'Learning Goals', type: 'text', required: false }, { name: 'preferredLanguage', label: 'Preferred Language', type: 'select', required: false }],
    legal: [{ name: 'firmName', label: 'Firm / Company', type: 'text', required: false }, { name: 'barNumber', label: 'Bar Number', type: 'text', required: false }],
    realestate: [{ name: 'budget', label: 'Budget Range', type: 'select', required: false }, { name: 'preferredAreas', label: 'Preferred Areas', type: 'text', required: false }],
    ecommerce: [{ name: 'company', label: 'Company', type: 'text', required: false }, { name: 'address', label: 'Shipping Address', type: 'textarea', required: false }],
  };

  return {
    type: 'ProfileSection',
    content: {
      title: { value: vocab('My Profile', ctx), type: 'text' },
      subtitle: { value: vocab('Manage your account details', ctx), type: 'text' },
    },
    fields: [...baseFields, ...(extraFields[industry]?.map(f => ({ ...f, type: f.type as any })) ?? [
      { name: 'phone', label: 'Phone', type: 'text' as const, required: false },
      { name: 'bio', label: 'Bio', type: 'textarea' as const, required: false },
    ])],
    actions: [
      { label: vocab('Save Changes', ctx), action: '/api/profile', style: 'primary' },
    ],
    layout: { alignment: 'left', maxWidth: '2xl' },
  };
}

function resolveBillingSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const hasSubscription = ctx.blueprint.businessModels.some(m =>
    m.toLowerCase().includes('subscription'),
  );
  const industry = ctx.blueprint.industry;
  const primaryEntity = getPrimaryEntityName(ctx);

  // Industry-specific billing items
  const billingItems: Record<string, ItemSpec[]> = {
    saas: [
      { title: 'Current Plan', description: 'Pro — $29/month', icon: 'credit-card' },
      { title: 'Next Billing Date', description: 'Renews automatically', icon: 'calendar' },
      { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'shield' },
    ],
    fitness: [
      { title: 'Membership', description: 'Monthly Unlimited — $49/month', icon: 'credit-card' },
      { title: 'Next Payment', description: 'Auto-renewal on your renewal date', icon: 'calendar' },
      { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'shield' },
    ],
    healthcare: [
      { title: 'Insurance', description: 'Primary coverage on file', icon: 'shield' },
      { title: 'Last Payment', description: 'Copay processed at visit', icon: 'credit-card' },
      { title: 'Outstanding Balance', description: '$0.00', icon: 'dollar-sign' },
    ],
    ecommerce: [
      { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'credit-card' },
      { title: 'Default Shipping', description: '123 Main St, Anytown, USA', icon: 'truck' },
      { title: 'Loyalty Points', description: '2,450 points available', icon: 'gift' },
    ],
    education: [
      { title: 'Current Plan', description: 'Pro Learner — $19/month', icon: 'credit-card' },
      { title: 'Next Billing', description: 'Renews on your anniversary date', icon: 'calendar' },
      { title: 'Courses Included', description: 'Unlimited access to all courses', icon: 'book-open' },
    ],
    restaurant: [
      { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'credit-card' },
      { title: 'Rewards Balance', description: '1,200 points — $12 value', icon: 'gift' },
      { title: 'Last Order', description: 'Order #5678 — $45.00', icon: 'receipt' },
    ],
    realestate: [
      { title: 'Payment Method', description: 'Auto-pay enabled', icon: 'credit-card' },
      { title: 'Lease Payment', description: '$2,200/month due on the 1st', icon: 'calendar' },
      { title: 'Security Deposit', description: 'Held in escrow', icon: 'shield' },
    ],
    nonprofit: [
      { title: 'Total Donated', description: '$1,250 this year', icon: 'heart' },
      { title: 'Tax Receipt', description: '2025 receipt available for download', icon: 'file-text' },
      { title: 'Recurring Donation', description: '$50/month — thank you!', icon: 'refresh-cw' },
    ],
  };

  const items = billingItems[industry] ?? [
    { title: 'Current Plan', description: hasSubscription ? 'Pro Plan' : 'Free Tier', icon: 'credit-card' },
    { title: 'Payment Status', description: 'Active and current', icon: 'check-circle' },
    { title: 'Payment Method', description: 'Visa ending in 4242', icon: 'shield' },
  ];

  return {
    type: 'BillingSection',
    content: {
      title: { value: vocab('Billing', ctx), type: 'text' },
      subtitle: { value: hasSubscription ? vocab('Manage your subscription', ctx) : vocab('Manage your billing', ctx), type: 'text' },
    },
    items,
    actions: [
      { label: vocab('Update Billing', ctx), action: '/account/billing/update', style: 'primary' },
      ...(hasSubscription ? [{ label: vocab('Cancel Subscription', ctx), action: '/account/billing/cancel', style: 'ghost' as const }] : []),
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolveNotificationsSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const industry = ctx.blueprint.industry;
  const workflows = getWorkflowNames(ctx);
  const primaryEntity = getPrimaryEntityName(ctx);

  // Industry-specific notification preferences
  const notifItems: Record<string, ItemSpec[]> = {
    saas: [
      { title: 'Product Updates', description: 'New features and improvements', icon: 'zap', metadata: { enabled: 'true' } },
      { title: 'Weekly Digest', description: 'Summary of your team activity', icon: 'mail', metadata: { enabled: 'true' } },
      { title: 'Billing Alerts', description: 'Payment and usage notifications', icon: 'credit-card', metadata: { enabled: 'true' } },
    ],
    healthcare: [
      { title: 'Appointment Reminders', description: 'Upcoming visit notifications', icon: 'calendar', metadata: { enabled: 'true' } },
      { title: 'Lab Results', description: 'When new results are available', icon: 'file-text', metadata: { enabled: 'true' } },
      { title: 'Prescription Refills', description: 'Medication renewal reminders', icon: 'pill', metadata: { enabled: 'false' } },
    ],
    ecommerce: [
      { title: 'Order Updates', description: 'Shipping and delivery notifications', icon: 'truck', metadata: { enabled: 'true' } },
      { title: 'Price Alerts', description: 'When items in your wishlist drop in price', icon: 'tag', metadata: { enabled: 'false' } },
      { title: 'New Arrivals', description: 'Fresh products matching your interests', icon: 'sparkles', metadata: { enabled: 'false' } },
    ],
    fitness: [
      { title: 'Class Reminders', description: 'Upcoming class notifications', icon: 'calendar', metadata: { enabled: 'true' } },
      { title: 'Achievement Alerts', description: 'When you hit a new personal best', icon: 'trophy', metadata: { enabled: 'true' } },
      { title: 'Membership Renewals', description: 'Payment and plan notifications', icon: 'credit-card', metadata: { enabled: 'true' } },
    ],
    education: [
      { title: 'Course Updates', description: 'New lessons and materials', icon: 'book-open', metadata: { enabled: 'true' } },
      { title: 'Assignment Deadlines', description: 'Upcoming due dates', icon: 'clock', metadata: { enabled: 'true' } },
      { title: 'Grade Notifications', description: 'When grades are posted', icon: 'award', metadata: { enabled: 'true' } },
    ],
    restaurant: [
      { title: 'Reservation Confirmations', description: 'Booking status updates', icon: 'check-circle', metadata: { enabled: 'true' } },
      { title: 'Special Offers', description: 'Exclusive deals and events', icon: 'gift', metadata: { enabled: 'false' } },
      { title: 'Loyalty Rewards', description: 'Points earned and rewards available', icon: 'star', metadata: { enabled: 'true' } },
    ],
    nonprofit: [
      { title: 'Donation Receipts', description: 'Tax-deductible contribution confirmations', icon: 'heart', metadata: { enabled: 'true' } },
      { title: 'Impact Updates', description: 'How your donations are making a difference', icon: 'trending-up', metadata: { enabled: 'true' } },
      { title: 'Volunteer Opportunities', description: 'Upcoming events and ways to help', icon: 'users', metadata: { enabled: 'false' } },
    ],
  };

  const defaults: ItemSpec[] = [
    { title: 'Email Notifications', description: 'Receive updates via email', icon: 'mail', metadata: { enabled: 'true' } },
    { title: 'Push Notifications', description: 'Receive push notifications', icon: 'bell', metadata: { enabled: 'false' } },
    { title: 'SMS Notifications', description: 'Receive text messages', icon: 'smartphone', metadata: { enabled: 'false' } },
  ];

  return {
    type: 'NotificationsSection',
    content: {
      title: { value: vocab('Notifications', ctx), type: 'text' },
      subtitle: { value: vocab('Configure your notification preferences', ctx), type: 'text' },
    },
    items: notifItems[industry] ?? defaults,
    layout: { maxWidth: '2xl' },
  };
}

function resolvePlanDetails(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'PlanDetails',
    content: {
      title: { value: vocab('Your Plan', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Plan Name', ctx), description: 'Pro', icon: 'package' },
      { title: vocab('Price', ctx), description: '$29/month', icon: 'dollar-sign' },
      { title: vocab('Features Included', ctx), description: vocab('All features, priority support, API access', ctx), icon: 'check-circle' },
    ],
    actions: [
      { label: vocab('Upgrade Plan', ctx), action: '/pricing', style: 'primary' },
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolveInvoiceList(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'InvoiceList',
    content: {
      title: { value: vocab('Invoices', ctx), type: 'text' },
    },
    columns: [
      { key: 'invoiceId', label: 'Invoice', type: 'text', sortable: true, filterable: false },
      { key: 'date', label: 'Date', type: 'date', sortable: true, filterable: false },
      { key: 'amount', label: 'Amount', type: 'number', sortable: true, filterable: false },
      { key: 'status', label: 'Status', type: 'status', sortable: true, filterable: true },
    ],
    layout: { maxWidth: '7xl' },
  };
}

function resolveAddressBook(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'AddressBook',
    content: {
      title: { value: vocab('Address Book', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Home', ctx), description: vocab('123 Main St, City, State 12345', ctx), icon: 'home', metadata: { default: 'true' } },
    ],
    actions: [
      { label: vocab('Add Address', ctx), action: '/account/addresses/add', style: 'primary' },
    ],
    layout: { maxWidth: '2xl' },
  };
}

function resolveWishlist(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  const entity = findEntity(ctx.blueprint, 'product') ?? ctx.blueprint.entities[0];
  return {
    type: 'Wishlist',
    content: {
      title: { value: vocab('My Wishlist', ctx), type: 'text' },
      entity: { value: entity?.name ?? 'Product', type: 'text' },
    },
    items: [
      { title: vocab('Saved Item', ctx), description: vocab('Added to wishlist', ctx), icon: 'heart' },
    ],
    layout: { maxWidth: '7xl' },
  };
}

// ─── Content Resolvers ────────────────────────────────────────────────────

function resolveAboutSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'AboutSection',
    content: {
      title: { value: vocab('About Us', ctx), type: 'text' },
      subtitle: { value: ctx.blueprint.description ?? `Learn more about ${ctx.blueprint.name}`, type: 'text' },
    },
    items: getAboutItems(ctx),
    layout: { alignment: 'center', maxWidth: '4xl' },
  };
}

function resolveTeamSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'TeamSection',
    content: {
      title: { value: vocab('Meet Our Team', ctx), type: 'text' },
      subtitle: { value: vocab('The people behind the product', ctx), type: 'text' },
    },
    items: getTeamRoles(ctx),
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

function resolveTeamGrid(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'TeamGrid',
    content: {
      title: { value: vocab('Our Team', ctx), type: 'text' },
    },
    items: getTeamRoles(ctx),
    layout: { alignment: 'center', maxWidth: '6xl' },
  };
}

function resolveMissionSection(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'MissionSection',
    content: {
      title: { value: vocab('Our Mission', ctx), type: 'text' },
      subtitle: { value: vocab('What drives us every day', ctx), type: 'text' },
    },
    items: getMissionItems(ctx),
    layout: { alignment: 'center', maxWidth: '4xl' },
  };
}

function resolveGallery(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'Gallery',
    content: {
      title: { value: vocab('Gallery', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Photo 1', ctx), icon: 'image' },
      { title: vocab('Photo 2', ctx), icon: 'image' },
      { title: vocab('Photo 3', ctx), icon: 'image' },
      { title: vocab('Photo 4', ctx), icon: 'image' },
    ],
    layout: { alignment: 'center', maxWidth: '7xl' },
  };
}

// ─── Filter / Data Resolvers ──────────────────────────────────────────────

function resolveFilterSidebar(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'FilterSidebar',
    content: {
      title: { value: vocab('Filters', ctx), type: 'text' },
    },
    items: [
      { title: vocab('Category', ctx), icon: 'grid', metadata: { type: 'select' } },
      { title: vocab('Price Range', ctx), icon: 'dollar-sign', metadata: { type: 'range' } },
      { title: vocab('Rating', ctx), icon: 'star', metadata: { type: 'select' } },
      { title: vocab('Availability', ctx), icon: 'package', metadata: { type: 'checkbox' } },
    ],
    layout: { maxWidth: 'xs' },
  };
}

function resolveSortBar(
  _slot: ComponentSlot,
  _page: PageExecutionPlan,
  ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: 'SortBar',
    content: {
      title: { value: vocab('Sort By', ctx), type: 'text' },
    },
    actions: [
      { label: vocab('Newest', ctx), action: '?sort=newest', style: 'ghost' },
      { label: vocab('Price: Low to High', ctx), action: '?sort=price-asc', style: 'ghost' },
      { label: vocab('Price: High to Low', ctx), action: '?sort=price-desc', style: 'ghost' },
      { label: vocab('Popular', ctx), action: '?sort=popular', style: 'ghost' },
    ],
    layout: { maxWidth: '7xl' },
  };
}

// ─── Generic Fallback ─────────────────────────────────────────────────────

function resolveGenericComponent(
  slot: ComponentSlot,
  _page: PageExecutionPlan,
  _ctx: ContentResolverContext,
): ComponentSpec {
  return {
    type: slot.component,
    content: {
      title: { value: slot.slot.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), type: 'text' },
    },
    layout: { maxWidth: '7xl' },
  };
}

// ─── Business Content Resolvers ──────────────────────────────────────────────

function resolveFeatures(ctx: ContentResolverContext): ItemSpec[] {
  const items: ItemSpec[] = [];

  // Entity-based features
  for (const entity of ctx.blueprint.entities.slice(0, 4)) {
    items.push({
      title: vocab(`${entity.name} Management`, ctx),
      description: vocab(`Create, edit, and manage ${entity.name.toLowerCase()}s with ease`, ctx),
      icon: 'layers',
    });
  }

  // Pattern workflow-based features (industry-specific)
  if (ctx.pattern) {
    for (const workflow of ctx.pattern.workflows.slice(0, 4)) {
      if (items.length >= 6) break;
      items.push({
        title: workflow,
        description: `${workflow} seamlessly through our platform`,
        icon: 'zap',
      });
    }
    // Pattern component-based features
    for (const component of ctx.pattern.components.slice(0, 2)) {
      if (items.length >= 6) break;
      items.push({
        title: vocab(component.replace(/([A-Z])/g, ' $1').trim(), ctx),
        description: `Integrated ${component.toLowerCase()} for your workflow`,
        icon: 'box',
      });
    }
  }

  // Fallback generic features
  const genericFeatures: ItemSpec[] = [
    { title: vocab('Real-time Updates', ctx), description: 'See changes as they happen', icon: 'zap' },
    { title: vocab('Analytics Dashboard', ctx), description: 'Track your performance', icon: 'bar-chart' },
    { title: vocab('Team Collaboration', ctx), description: 'Work together seamlessly', icon: 'users' },
    { title: vocab('API Access', ctx), description: 'Integrate with your tools', icon: 'code' },
    { title: vocab('Mobile Responsive', ctx), description: 'Works on any device', icon: 'smartphone' },
    { title: vocab('Security First', ctx), description: 'Enterprise-grade security', icon: 'shield' },
  ];

  while (items.length < 6) {
    const generic = genericFeatures[items.length];
    if (generic) items.push(generic);
    else break;
  }

  return items;
}

function resolvePricingTiers(ctx: ContentResolverContext): TierSpec[] {
  const hasSubscription = ctx.blueprint.businessModels.some(m =>
    m.toLowerCase().includes('subscription'),
  );

  const priceWord = vocab('price', ctx);
  const featuresWord = vocab('features', ctx);

  if (hasSubscription) {
    return [
      { name: 'Starter', price: '$9', period: '/month', features: [`5 users`, `10GB storage`, `Basic ${featuresWord}`, `Email support`], highlighted: false },
      { name: 'Pro', price: '$29', period: '/month', features: [`25 users`, `100GB storage`, `Advanced ${featuresWord}`, `Priority support`, `API access`], highlighted: true },
      { name: 'Enterprise', price: 'Custom', period: '', features: [`Unlimited users`, `Unlimited storage`, `Custom integrations`, `Dedicated support`, `SLA`], highlighted: false },
    ];
  }

  return [
    { name: 'Basic', price: 'Free', period: '', features: [`Core ${featuresWord}`, 'Community support'], highlighted: false },
    { name: 'Premium', price: '$19', period: '/month', features: [`All ${featuresWord}`, 'Priority support', 'API access', 'Custom branding'], highlighted: true },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findEntity(blueprint: ApplicationBlueprint, sectionName: string): EntityPlan | undefined {
  const normalized = sectionName.toLowerCase();
  for (const entity of blueprint.entities) {
    if (normalized.includes(entity.slug.toLowerCase()) || normalized.includes(entity.name.toLowerCase())) {
      return entity;
    }
  }
  return undefined;
}
