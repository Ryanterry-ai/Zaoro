/**
 * Agent Generators — produces all pipeline artifacts directly.
 *
 * When running in Claude Code/OpenCode/Claude Desktop, the agent IS the LLM.
 * These generators produce real, prompt-aware artifacts without separate LLM calls.
 *
 * Usage: The agent calls these functions to generate artifacts, then passes them
 * to the orchestrator for validation and file writing.
 */

import type { Industry } from '../orchestration/types.js';
import { extractPrimitives } from './primitive-extractor.js';
import { deriveFromPrimitives } from './primitive-reasoner.js';
import { analyzePromptFromPrimitives, generatePagesFromPrimitives } from './primitive-prompt-bridge.js';
import { generateDesignTokensFromPrimitives } from './primitive-domain-bridge.js';
import { adaptPrimitiveOutput } from './primitive-adapter.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedArtifacts {
  manifest: Record<string, unknown>;
  requirements: Record<string, unknown>;
  research: Record<string, unknown>;
  architecture: Record<string, unknown>;
  databaseSchema: Record<string, unknown>;
  apiDesign: Record<string, unknown>;
  frontendDesign: Record<string, unknown>;
  integration: Record<string, unknown>;
  deployment: Record<string, unknown>;
}

export interface PageSpec {
  name: string;
  path: string;
  description: string;
  layout: string;
  auth: boolean;
  sections: SectionSpec[];
}

export interface SectionSpec {
  name: string;
  type: string;
  components: ComponentSpec[];
}

export interface ComponentSpec {
  name: string;
  type: string;
  props: Record<string, string>;
  content?: Record<string, unknown>;
}

export interface EndpointSpec {
  method: string;
  path: string;
  description: string;
  auth: boolean;
  requestBody?: Record<string, string>;
}

export interface TableSpec {
  name: string;
  columns: ColumnSpec[];
  indexes?: IndexSpec[];
}

export interface ColumnSpec {
  name: string;
  type: string;
  primaryKey?: boolean;
  unique?: boolean;
  nullable?: boolean;
  foreignKey?: string | undefined;
}

export interface IndexSpec {
  columns: string[];
  unique?: boolean;
}

// ─── Prompt Analyzer ──────────────────────────────────────────────────────────

function analyzePrompt(prompt: string): {
  projectName: string;
  slug: string;
  industry: Industry;
  description: string;
  keywords: string[];
  url: string | undefined;
} {
  // Extract URL if present
  const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
  const url = urlMatch?.[0];

  // Extract business name — look for "for [Name]" pattern first
  // "build a landing page for Luxe Realty, a luxury real estate agency in Miami"
  // → "Luxe Realty"
  let projectName = 'My Project';
  const forMatch = prompt.match(/(?:for|of|from)\s+([A-Z][A-Za-z\s&'.-]+?)(?:\s*,|\s+a\s|\s+the\s|\s+in\s|\s+—\s|\s+-\s|$)/);
  if (forMatch?.[1]) {
    projectName = forMatch[1].trim();
  } else {
    // Fallback: look for capitalized words that look like a business name
    const businessMatch = prompt.match(/([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)/);
    if (businessMatch?.[1] && !/^(build|create|make|design|landing|page|website|app|the|a|an)$/i.test(businessMatch[1])) {
      projectName = businessMatch[1].trim();
    }
  }

  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Detect industry
  let industry: Industry = 'saas';
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('real estate') || lowerPrompt.includes('property') || lowerPrompt.includes('realt')) {
    industry = 'real-estate';
  } else if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('food') || lowerPrompt.includes('dining')) {
    industry = 'restaurant';
  } else if (lowerPrompt.includes('gym') || lowerPrompt.includes('fitness') || lowerPrompt.includes('workout')) {
    industry = 'fitness';
  } else if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shop') || lowerPrompt.includes('store')) {
    industry = 'ecommerce';
  } else if (lowerPrompt.includes('health') || lowerPrompt.includes('medical') || lowerPrompt.includes('clinic')) {
    industry = 'healthcare';
  } else if (lowerPrompt.includes('education') || lowerPrompt.includes('learn') || lowerPrompt.includes('course')) {
    industry = 'education';
  } else if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('personal')) {
    industry = 'portfolio';
  } else if (lowerPrompt.includes('blog') || lowerPrompt.includes('news') || lowerPrompt.includes('media')) {
    industry = 'media';
  } else if (lowerPrompt.includes('fintech') || lowerPrompt.includes('finance') || lowerPrompt.includes('banking')) {
    industry = 'fintech';
  }

  // Extract keywords
  const keywords = lowerPrompt.split(/\s+/).filter(w => w.length > 3);

  return { projectName, slug, industry, description: prompt, keywords, url };
}

// ─── Business Content Extraction ──────────────────────────────────────────────
// Extracts real, structured content from the user's prompt so components
// display actual business data instead of hardcoded placeholders.

interface BusinessContent {
  name: string;
  tagline: string;
  description: string;
  services: Array<{ name: string; description: string; price?: string }>;
  stats: Array<{ value: string; label: string }>;
  testimonials: Array<{ quote: string; author: string; role?: string; rating?: number }>;
  features: string[];
  team: Array<{ name: string; role: string; bio?: string }>;
  pricing: Array<{ name: string; price: string; period: string; features: string[]; popular?: boolean }>;
  schedule: Array<{ time: string; name: string; instructor?: string; spots?: number; intensity?: string }>;
  contact: { email?: string; phone?: string; address?: string; city?: string };
  cta: { title: string; button: string };
}

function extractBusinessContent(prompt: string): BusinessContent {
  const lower = prompt.toLowerCase();

  // Extract business name — same logic as analyzePrompt
  let name = 'My Project';
  const forMatch = prompt.match(/(?:for|of|from)\s+([A-Z][A-Za-z\s&'.-]+?)(?:\s*,|\s+a\s|\s+the\s|\s+in\s|\s+—\s|\s+-\s|$)/);
  if (forMatch?.[1]) {
    name = forMatch[1].trim();
  } else {
    const businessMatch = prompt.match(/([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)/);
    if (businessMatch?.[1] && !/^(build|create|make|design|landing|page|website|app|the|a|an)$/i.test(businessMatch[1])) {
      name = businessMatch[1].trim();
    }
  }

  // Extract tagline — look for quoted strings, "tagline:", "slogan:", or extract from prompt
  const taglineMatch = prompt.match(/(?:tagline|slogan|headline|subtitle)[:\s]+["']?([^"']+?)["']?\s*(?:\.|$)/i)
    ?? prompt.match(/["']([^"']+)["']/);
  // Also try to extract location from "in [City]"
  const locationMatch = prompt.match(/\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  const location = locationMatch?.[1] ?? '';
  const tagline = taglineMatch?.[1]?.trim() ?? (location ? `Premium services in ${location}` : 'Premium quality, exceptional results');

  // Extract description (look for "description:", or generate from name+tagline)
  const descMatch = prompt.match(/description[:\s]+(.+?)(?:\.|$)/i);
  const description = descMatch?.[1]?.trim() ?? `${name} — ${tagline}`;

  // Extract services/products (look for "services:", "products:", or listed items)
  const services: BusinessContent['services'] = [];
  const servicesMatch = prompt.match(/(?:services?|products?|offerings?)[:\s]+(.+?)(?:\.|$)/i);
  if (servicesMatch?.[1]) {
    const items = servicesMatch[1].split(/[,;|]/).map(s => s.trim()).filter(Boolean);
    for (const item of items) {
      const priceMatch = item.match(/\$[\d,]+/);
      services.push({
        name: item.replace(/\$[\d,]+/, '').trim(),
        description: item,
        ...(priceMatch?.[0] ? { price: priceMatch[0] } : {}),
      });
    }
  }

  // Extract stats (look for numbers with labels)
  const stats: BusinessContent['stats'] = [];
  const statPatterns = [
    /(\d+[\d,]*\+?)\s*(?:properties|listings|clients|customers|members|years|projects|sold|transactions)/gi,
    /(\d+[\d,]*%?)\s*(?:satisfaction|rating|success|retention|growth)/gi,
    /\$[\d,]*\.?\d*\s*(?:million|billion|M|B)/gi,
  ];
  for (const pattern of statPatterns) {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      const val = match[0].trim();
      const numMatch = val.match(/(\d[\d,.]*\+?%?)/);
      const label = val.replace(numMatch?.[0] ?? '', '').trim();
      if (numMatch?.[1] && label) {
        stats.push({ value: numMatch[1], label });
      }
    }
  }
  // Add defaults if nothing extracted
  if (stats.length === 0) {
    stats.push(
      { value: '100+', label: 'Clients Served' },
      { value: '10+', label: 'Years Experience' },
      { value: '50+', label: 'Projects Completed' },
      { value: '98%', label: 'Client Satisfaction' },
    );
  }

  // Extract testimonials (look for quotes)
  const testimonials: BusinessContent['testimonials'] = [];
  const quoteMatches = prompt.matchAll(/["']([^"']{20,})["']/g);
  for (const m of quoteMatches) {
    if (m[1]) testimonials.push({ quote: m[1], author: 'Client' });
  }
  if (testimonials.length === 0) {
    testimonials.push(
      { quote: 'Outstanding service and results. Highly recommended!', author: 'Sarah M.', role: 'Client', rating: 5 },
      { quote: 'Professional, responsive, and exceeded our expectations.', author: 'James R.', role: 'Client', rating: 5 },
      { quote: 'A true partner in our success. Cannot recommend enough.', author: 'Emily T.', role: 'Client', rating: 5 },
    );
  }

  // Extract features (look for "features:", "includes:", or bullet-like lists)
  const features: string[] = [];
  const featuresMatch = prompt.match(/(?:features?|includes?|benefits?)[:\s]+(.+?)(?:\.|$)/i);
  if (featuresMatch?.[1]) {
    features.push(...featuresMatch[1].split(/[,;|]/).map(s => s.trim()).filter(Boolean));
  }

  // Extract team members (look for "team:", names with roles)
  const team: BusinessContent['team'] = [];
  const teamMatch = prompt.match(/(?:team|agents?|members?)[:\s]+(.+?)(?:\.|$)/i);
  if (teamMatch?.[1]) {
    const members = teamMatch[1].split(/[,;|]/).map(s => s.trim()).filter(Boolean);
    for (const member of members) {
      const roleMatch = member.match(/(.+?)\s*(?:as|-\s*|,\s*)(.+)/);
      if (roleMatch?.[1] && roleMatch?.[2]) {
        team.push({ name: roleMatch[1].trim(), role: roleMatch[2].trim() });
      } else {
        team.push({ name: member, role: 'Team Member' });
      }
    }
  }

  // Extract pricing (look for "$XX/mo", "pricing:", plan names)
  const pricing: BusinessContent['pricing'] = [];
  const priceMatches = prompt.matchAll(/\$?(\d+[\d,]*(?:\.\d{2})?)\s*(?:\/|per)\s*(mo|month|year|yr)/gi);
  for (const m of priceMatches) {
    pricing.push({
      name: 'Plan',
      price: `$${m[1]}`,
      period: `/${m[2]}`,
      features: [],
    });
  }

  // Extract schedule (look for times)
  const schedule: BusinessContent['schedule'] = [];
  const timeMatches = prompt.matchAll(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-:]?\s*(.+?)(?:[,;|$])/gi);
  for (const m of timeMatches) {
    if (m[1] && m[2]) schedule.push({ time: m[1].trim(), name: m[2].trim() });
  }

  // Extract contact info
  const emailMatch = prompt.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const phoneMatch = prompt.match(/\+?[\d\s()-]{7,}/);
  const addressMatch = prompt.match(/\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|blvd|drive|dr|lane|ln)/i);
  const cityMatch = prompt.match(/(?:in|near|located in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);

  const contact: BusinessContent['contact'] = {
    ...(emailMatch?.[0] ? { email: emailMatch[0] } : {}),
    ...(phoneMatch?.[0] ? { phone: phoneMatch[0].trim() } : {}),
    ...(addressMatch?.[0] ? { address: addressMatch[0] } : {}),
    ...(cityMatch?.[1] ? { city: cityMatch[1] } : {}),
  };

  // CTA
  const ctaMatch = prompt.match(/(?:cta|call to action|button)[:\s]+["']?([^"']+?)["']?\s*(?:\.|$)/i);
  const cta: BusinessContent['cta'] = {
    title: tagline || `Ready to Get Started?`,
    button: ctaMatch?.[1]?.trim() ?? 'Contact Us',
  };

  return { name, tagline, description, services, stats, testimonials, features, team, pricing, schedule, contact, cta };
}

// ─── Industry-Specific Generators ─────────────────────────────────────────────

function generateRealEstatePages(slug: string, projectName: string, biz: BusinessContent): PageSpec[] {
  const statsStr = biz.stats.map(s => `${s.value},${s.label}`).join('|');
  const testimonialsStr = biz.testimonials.map(t => `${t.quote}|${t.author}|${t.role ?? 'Client'}|${t.rating ?? 5}`).join('||');
  const teamStr = biz.team.map(t => `${t.name}|${t.role}|${t.bio ?? ''}`).join('||');

  return [
    {
      name: 'Home',
      path: '/',
      description: biz.tagline || 'Hero section with property showcase',
      layout: 'default',
      auth: false,
      sections: [
        {
          name: 'Hero',
          type: 'hero',
          components: [
            { name: 'HeroSection', type: 'hero', props: { title: biz.name, subtitle: biz.tagline || biz.description.slice(0, 120), cta: biz.cta.button }, content: { title: biz.name, subtitle: biz.tagline || biz.description.slice(0, 120), cta: biz.cta.button } },
          ],
        },
        {
          name: 'Featured Properties',
          type: 'grid',
          components: [
            { name: 'PropertyGrid', type: 'grid', props: { columns: '3', gap: '8' } },
            { name: 'PropertyCard', type: 'card', props: { showPrice: 'true', showImage: 'true' } },
          ],
        },
        {
          name: 'Stats',
          type: 'stats',
          components: [
            { name: 'StatsBar', type: 'stats', props: { items: statsStr }, content: { items: biz.stats } },
          ],
        },
        {
          name: 'Testimonials',
          type: 'testimonials',
          components: [
            { name: 'TestimonialCarousel', type: 'carousel', props: { items: String(biz.testimonials.length) }, content: { items: biz.testimonials } },
          ],
        },
        {
          name: 'CTA',
          type: 'cta',
          components: [
            { name: 'CallToAction', type: 'cta', props: { title: biz.cta.title, button: biz.cta.button }, content: { title: biz.cta.title, button: biz.cta.button } },
          ],
        },
      ],
    },
    {
      name: 'Properties',
      path: '/properties',
      description: 'Property listings with filters',
      layout: 'sidebar',
      auth: false,
      sections: [
        {
          name: 'Filters',
          type: 'filters',
          components: [
            { name: 'PropertyFilters', type: 'form', props: { location: 'true', price: 'true', beds: 'true', type: 'true' } },
          ],
        },
        {
          name: 'Listing Grid',
          type: 'grid',
          components: [
            { name: 'PropertyGrid', type: 'grid', props: { columns: '3' } },
            { name: 'PropertyCard', type: 'card', props: { variant: 'detailed' } },
          ],
        },
      ],
    },
    {
      name: 'Property Detail',
      path: '/properties/[id]',
      description: 'Single property detail page',
      layout: 'default',
      auth: false,
      sections: [
        {
          name: 'Gallery',
          type: 'gallery',
          components: [
            { name: 'ImageGallery', type: 'gallery', props: { layout: 'hero' } },
          ],
        },
        {
          name: 'Details',
          type: 'details',
          components: [
            { name: 'PropertyDetails', type: 'details', props: { showMap: 'true' } },
            { name: 'PriceTag', type: 'price', props: { size: 'lg' } },
          ],
        },
        {
          name: 'Agent',
          type: 'agent',
          components: [
            { name: 'AgentCard', type: 'card', props: { showContact: 'true' } },
          ],
        },
      ],
    },
    {
      name: 'About',
      path: '/about',
      description: `About ${projectName}`,
      layout: 'default',
      auth: false,
      sections: [
        {
          name: 'Story',
          type: 'content',
          components: [
            { name: 'ContentSection', type: 'text', props: { alignment: 'center' }, content: { body: biz.description } },
          ],
        },
        {
          name: 'Team',
          type: 'grid',
          components: [
            { name: 'TeamGrid', type: 'grid', props: { columns: '4' } },
            { name: 'TeamMember', type: 'card', props: { showSocial: 'true' }, content: { items: biz.team } },
          ],
        },
      ],
    },
    {
      name: 'Contact',
      path: '/contact',
      description: 'Contact form and information',
      layout: 'default',
      auth: false,
      sections: [
        {
          name: 'Contact Form',
          type: 'form',
          components: [
            { name: 'ContactForm', type: 'form', props: { fields: 'name,email,phone,message' } },
          ],
        },
        {
          name: 'Map',
          type: 'map',
          components: [
            { name: 'OfficeMap', type: 'map', props: { height: '400' } },
          ],
        },
      ],
    },
  ];
}

function generateFitnessPages(slug: string, projectName: string, biz: BusinessContent): PageSpec[] {
  const statsStr = biz.stats.map(s => `${s.value},${s.label}`).join('|');
  const scheduleStr = biz.schedule.map(s => `${s.time},${s.name},${s.instructor ?? 'TBD'},${s.spots ?? 20},${s.intensity ?? 'Medium'}`).join('|');

  // Default fitness pricing if none extracted
  const pricing = biz.pricing.length > 0 ? biz.pricing : [
    { name: 'Basic', price: '$29', period: '/month', features: ['Gym Access', 'Basic Classes', 'Locker Room', 'Mobile App'] },
    { name: 'Premium', price: '$59', period: '/month', features: ['All Basic Features', 'Unlimited Classes', 'Personal Trainer', 'Sauna Access', 'Guest Passes'], popular: true },
    { name: 'Elite', price: '$99', period: '/month', features: ['All Premium Features', 'Nutrition Coaching', 'Recovery Sessions', 'Priority Booking', 'Merchandise Discount'] },
  ];

  // Default schedule if none extracted
  const schedule = biz.schedule.length > 0 ? biz.schedule : [
    { time: '6:00 AM', name: 'Morning Yoga', instructor: 'Sarah' },
    { time: '7:30 AM', name: 'HIIT Training', instructor: 'Mike' },
    { time: '9:00 AM', name: 'Strength & Conditioning', instructor: 'Alex' },
    { time: '12:00 PM', name: 'Lunch Express', instructor: 'Jordan' },
    { time: '5:30 PM', name: 'Evening Spin', instructor: 'Chris' },
    { time: '7:00 PM', name: 'Pilates', instructor: 'Emma' },
  ];

  return [
    {
      name: 'Home',
      path: '/',
      description: biz.tagline || 'Gym landing page',
      layout: 'default',
      auth: false,
      sections: [
        {
          name: 'Hero',
          type: 'hero',
          components: [
            { name: 'HeroSection', type: 'hero', props: { title: biz.name, subtitle: biz.tagline || 'Transform your body, transform your life', cta: biz.cta.button }, content: { title: biz.name, subtitle: biz.tagline || 'Transform your body, transform your life', cta: biz.cta.button } },
          ],
        },
        {
          name: 'Programs',
          type: 'grid',
          components: [
            { name: 'ProgramGrid', type: 'grid', props: { columns: '3' } },
            { name: 'ProgramCard', type: 'card', props: { showSchedule: 'true' }, content: { items: biz.services.length > 0 ? biz.services : [{ name: 'Yoga', description: 'Flexibility and mindfulness' }, { name: 'HIIT', description: 'High intensity interval training' }, { name: 'Strength', description: 'Build muscle and endurance' }] } },
          ],
        },
        {
          name: 'Stats',
          type: 'stats',
          components: [
            { name: 'StatsBar', type: 'stats', props: { items: statsStr }, content: { items: biz.stats } },
          ],
        },
        {
          name: 'Pricing',
          type: 'pricing',
          components: [
            { name: 'PricingTable', type: 'pricing', props: { plans: String(pricing.length) }, content: { plans: pricing } },
          ],
        },
        {
          name: 'Testimonials',
          type: 'testimonials',
          components: [
            { name: 'TestimonialCarousel', type: 'carousel', props: { items: String(biz.testimonials.length) }, content: { items: biz.testimonials } },
          ],
        },
        {
          name: 'CTA',
          type: 'cta',
          components: [
            { name: 'CallToAction', type: 'cta', props: { title: biz.cta.title, button: biz.cta.button }, content: { title: biz.cta.title, button: biz.cta.button } },
          ],
        },
      ],
    },
    {
      name: 'Dashboard',
      path: '/dashboard',
      description: 'Member dashboard',
      layout: 'sidebar',
      auth: true,
      sections: [
        {
          name: 'Stats',
          type: 'stats',
          components: [
            { name: 'WorkoutStats', type: 'stats', props: { period: 'week' } },
          ],
        },
        {
          name: 'Schedule',
          type: 'calendar',
          components: [
            { name: 'ClassSchedule', type: 'calendar', props: { view: 'week' }, content: { schedule } },
          ],
        },
      ],
    },
  ];
}

function generateSaaSPages(slug: string, projectName: string, biz: BusinessContent): PageSpec[] {
  const statsStr = biz.stats.map(s => `${s.value},${s.label}`).join('|');
  const featuresStr = biz.features.length > 0 ? biz.features.join('|') : 'Responsive Design|Fast Performance|Secure|Easy Integration|24/7 Support|Analytics Dashboard';

  // Default SaaS pricing if none extracted
  const pricing = biz.pricing.length > 0 ? biz.pricing : [
    { name: 'Starter', price: '$19', period: '/month', features: ['5 Projects', 'Basic Analytics', 'Email Support', 'API Access'] },
    { name: 'Professional', price: '$49', period: '/month', features: ['Unlimited Projects', 'Advanced Analytics', 'Priority Support', 'Custom Branding', 'Team Collaboration'], popular: true },
    { name: 'Enterprise', price: '$149', period: '/month', features: ['Everything in Pro', 'Dedicated Manager', 'SLA Guarantee', 'Custom Integrations', 'SSO'] },
  ];

  return [
    {
      name: 'Home',
      path: '/',
      description: biz.tagline || 'SaaS landing page',
      layout: 'default',
      auth: false,
      sections: [
        {
          name: 'Hero',
          type: 'hero',
          components: [
            { name: 'HeroSection', type: 'hero', props: { title: biz.name, subtitle: biz.tagline || 'The modern solution for your business', cta: biz.cta.button }, content: { title: biz.name, subtitle: biz.tagline || 'The modern solution for your business', cta: biz.cta.button } },
          ],
        },
        {
          name: 'Features',
          type: 'grid',
          components: [
            { name: 'FeatureGrid', type: 'grid', props: { columns: '3' } },
            { name: 'FeatureCard', type: 'card', props: { showIcon: 'true' }, content: { items: biz.features.length > 0 ? biz.features.map(f => ({ name: f, description: f })) : [{ name: 'Fast', description: 'Lightning-fast performance' }, { name: 'Secure', description: 'Enterprise-grade security' }, { name: 'Scalable', description: 'Grows with your business' }] } },
          ],
        },
        {
          name: 'Stats',
          type: 'stats',
          components: [
            { name: 'StatsBar', type: 'stats', props: { items: statsStr }, content: { items: biz.stats } },
          ],
        },
        {
          name: 'Pricing',
          type: 'pricing',
          components: [
            { name: 'PricingTable', type: 'pricing', props: { plans: String(pricing.length) }, content: { plans: pricing } },
          ],
        },
        {
          name: 'Testimonials',
          type: 'testimonials',
          components: [
            { name: 'TestimonialCarousel', type: 'carousel', props: { items: String(biz.testimonials.length) }, content: { items: biz.testimonials } },
          ],
        },
        {
          name: 'CTA',
          type: 'cta',
          components: [
            { name: 'CallToAction', type: 'cta', props: { title: biz.cta.title, button: biz.cta.button }, content: { title: biz.cta.title, button: biz.cta.button } },
          ],
        },
      ],
    },
    {
      name: 'Dashboard',
      path: '/dashboard',
      description: 'Main dashboard',
      layout: 'sidebar',
      auth: true,
      sections: [
        {
          name: 'Overview',
          type: 'stats',
          components: [
            { name: 'DashboardStats', type: 'stats', props: {} },
          ],
        },
      ],
    },
  ];
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export function generateFromPrompt(prompt: string): GeneratedArtifacts {
  // Check if primitive reasoning is enabled
  const usePrimitives = process.env.PRIMITIVE_REASONING === '1';

  if (usePrimitives) {
    return generateFromPromptWithPrimitives(prompt);
  }

  return generateFromPromptLegacy(prompt);
}

function generateFromPromptWithPrimitives(prompt: string): GeneratedArtifacts {
  // Step 1: Extract primitives
  const primitives = extractPrimitives(prompt);

  // Step 2: Derive spec from primitives
  const derivedSpec = deriveFromPrimitives(primitives);

  // Step 3: Use primitive-based analysis
  const { projectName, slug, industry, description, url } = analyzePromptFromPrimitives(primitives, derivedSpec, prompt);

  // Step 4: Extract business content
  const biz = extractBusinessContent(prompt);
  biz.name = projectName;

  // Step 5: Generate pages from primitives
  const pages = generatePagesFromPrimitives(primitives, derivedSpec, biz);

  // Step 6: Generate design tokens from primitives
  const designTokens = generateDesignTokensFromPrimitives(primitives, derivedSpec);

  // Step 7: Use adapter to translate primitive output to renderer format
  const { components } = adaptPrimitiveOutput(pages, primitives, derivedSpec);

  // Step 8: Generate database schema from entities
  const databaseSchema = {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          { name: 'email', type: 'string', unique: true },
          { name: 'name', type: 'string' },
          { name: 'password', type: 'string' },
          { name: 'role', type: 'enum' },
          { name: 'createdAt', type: 'datetime' },
          { name: 'updatedAt', type: 'datetime' },
        ],
        indexes: [{ columns: ['email'], unique: true }],
      },
      ...derivedSpec.entities.map(entity => ({
        name: entity.slug + 's',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
          ...Object.entries(entity.fields).map(([name, type]) => ({
            name,
            type: type === 'datetime' ? 'datetime' : type === 'number' ? 'decimal' : type === 'text' ? 'text' : 'string',
          })),
          { name: 'createdAt', type: 'datetime' },
        ],
        indexes: [],
      })),
    ],
    enums: [],
  };

  // Step 9: Generate API design from pages
  const apiDesign = {
    endpoints: pages.flatMap(p => [
      {
        method: 'GET',
        path: `/api${p.path === '/' ? '' : p.path}`,
        description: `Get ${p.name}`,
        response: `${p.name} data`,
      },
      {
        method: 'POST',
        path: `/api${p.path === '/' ? '' : p.path}`,
        description: `Create ${p.name}`,
        response: `${p.name} created`,
      },
    ]),
    authentication: {
      type: 'JWT',
      header: 'Authorization',
      expiry: '24h',
    },
  };

  return {
    manifest: {
      name: projectName,
      displayName: projectName,
      slug,
      description: biz.description || description,
      industry,
      category: industry,
      complexity: 'moderate',
      goals: ['Build a modern, responsive application'],
      targetUsers: ['End users'],
      url: url ?? null,
      scope: {
        pages: pages.map(p => p.name),
        features: ['Responsive design', 'Modern UI', 'Fast performance'],
      },
    },
    requirements: {
      functional: pages.map(p => `${p.name} page - ${p.description}`),
      nonFunctional: ['Responsive design', 'Fast load times', 'Accessible'],
      features: components.map(c => c.name),
    },
    research: {
      industry,
      competitors: ['Competitor A', 'Competitor B'],
      keyFeatures: components.map(c => c.name),
      techRecommendations: ['Next.js', 'Tailwind CSS', 'PostgreSQL'],
    },
    architecture: {
      pattern: 'MVC',
      layers: ['Presentation', 'Business Logic', 'Data Access'],
      techStack: {
        frontend: 'Next.js 14',
        backend: 'Next.js API Routes',
        database: 'PostgreSQL with Prisma',
        styling: 'Tailwind CSS',
        auth: 'NextAuth.js',
      },
    },
    databaseSchema,
    apiDesign,
    frontendDesign: {
      pages,
      components,
      designTokens,
      navigation: {
        type: pages.length > 5 ? 'sidebar' : 'top',
        items: pages.filter(p => !p.path.includes('[')).map(p => ({
          label: p.name,
          path: p.path,
          icon: getPageIcon(p.name),
        })),
      },
    },
    integration: {
      environmentVariables: [
        { name: 'DATABASE_URL', description: 'PostgreSQL connection string', required: true },
        { name: 'NEXTAUTH_SECRET', description: 'NextAuth.js secret', required: true },
        { name: 'NEXTAUTH_URL', description: 'Application URL', required: true },
      ],
    },
    deployment: {
      hosting: { platform: 'vercel', region: 'global' },
      cicd: { provider: 'github-actions', stages: ['lint', 'test', 'build', 'deploy'] },
      monitoring: { errorTracking: 'sentry', analytics: 'posthog' },
    },
  };
}

function generateFromPromptLegacy(prompt: string): GeneratedArtifacts {
  const { projectName, slug, industry, description, url } = analyzePrompt(prompt);
  const biz = extractBusinessContent(prompt);
  // Use the extracted business name, not the slug
  biz.name = projectName;

  // Generate pages based on industry, passing real business content
  let pages: PageSpec[];
  switch (industry) {
    case 'real-estate':
      pages = generateRealEstatePages(slug, projectName, biz);
      break;
    case 'fitness':
      pages = generateFitnessPages(slug, projectName, biz);
      break;
    default:
      pages = generateSaaSPages(slug, projectName, biz);
      break;
  }

  // Generate database schema based on industry
  const databaseSchema = generateDatabaseSchema(industry, slug);

  // Generate API endpoints based on pages
  const apiDesign = generateApiDesign(pages, industry);

  // Generate design tokens based on industry
  const designTokens = generateDesignTokens(industry);

  // Generate components from pages
  const components = pages.flatMap(p =>
    p.sections.flatMap(s => s.components)
  );

  return {
    manifest: {
      name: projectName,
      displayName: projectName,
      slug,
      description: biz.description || description,
      industry,
      category: industry,
      complexity: 'moderate',
      goals: ['Build a modern, responsive application'],
      targetUsers: ['End users'],
      url: url ?? null,
      scope: {
        pages: pages.map(p => p.name),
        features: ['Responsive design', 'Modern UI', 'Fast performance'],
      },
    },
    requirements: {
      functional: pages.map(p => `${p.name} page - ${p.description}`),
      nonFunctional: ['Responsive design', 'Fast load times', 'Accessible'],
      features: components.map(c => c.name),
    },
    research: {
      industry,
      competitors: ['Competitor A', 'Competitor B'],
      keyFeatures: components.map(c => c.name),
      techRecommendations: ['Next.js', 'Tailwind CSS', 'PostgreSQL'],
    },
    architecture: {
      pattern: 'MVC',
      layers: ['Presentation', 'Business Logic', 'Data Access'],
      techStack: {
        frontend: 'Next.js 14',
        backend: 'Next.js API Routes',
        database: 'PostgreSQL with Prisma',
        styling: 'Tailwind CSS',
        auth: 'NextAuth.js',
      },
    },
    databaseSchema,
    apiDesign,
    frontendDesign: {
      pages,
      components,
      designTokens,
      navigation: {
        type: pages.length > 5 ? 'sidebar' : 'top',
        items: pages.filter(p => !p.path.includes('[')).map(p => ({
          label: p.name,
          path: p.path,
          icon: getPageIcon(p.name),
        })),
      },
    },
    integration: {
      environmentVariables: [
        { name: 'DATABASE_URL', description: 'PostgreSQL connection string', required: true },
        { name: 'NEXTAUTH_SECRET', description: 'NextAuth.js secret', required: true },
        { name: 'NEXTAUTH_URL', description: 'Application URL', required: true },
      ],
    },
    deployment: {
      hosting: { platform: 'vercel', region: 'global' },
      cicd: { provider: 'github-actions', stages: ['lint', 'test', 'build', 'deploy'] },
      monitoring: { errorTracking: 'sentry', analytics: 'posthog' },
    },
  };
}

// ─── Helper Generators ────────────────────────────────────────────────────────

function generateDatabaseSchema(industry: string, slug: string): Record<string, unknown> {
  const baseTables: TableSpec[] = [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'uuid', primaryKey: true },
        { name: 'email', type: 'string', unique: true },
        { name: 'name', type: 'string' },
        { name: 'password', type: 'string' },
        { name: 'role', type: 'enum', foreignKey: undefined },
        { name: 'createdAt', type: 'datetime' },
        { name: 'updatedAt', type: 'datetime' },
      ],
      indexes: [{ columns: ['email'], unique: true }],
    },
  ];

  switch (industry) {
    case 'real-estate':
      return {
        tables: [
          ...baseTables,
          {
            name: 'properties',
            columns: [
              { name: 'id', type: 'uuid', primaryKey: true },
              { name: 'title', type: 'string' },
              { name: 'description', type: 'text' },
              { name: 'price', type: 'decimal' },
              { name: 'bedrooms', type: 'integer' },
              { name: 'bathrooms', type: 'integer' },
              { name: 'sqft', type: 'integer' },
              { name: 'address', type: 'string' },
              { name: 'city', type: 'string' },
              { name: 'state', type: 'string' },
              { name: 'zipCode', type: 'string' },
              { name: 'type', type: 'enum' },
              { name: 'status', type: 'enum' },
              { name: 'agentId', type: 'uuid', foreignKey: 'users.id' },
              { name: 'createdAt', type: 'datetime' },
            ],
            indexes: [{ columns: ['city'] }, { columns: ['price'] }, { columns: ['type'] }],
          },
          {
            name: 'inquiries',
            columns: [
              { name: 'id', type: 'uuid', primaryKey: true },
              { name: 'propertyId', type: 'uuid', foreignKey: 'properties.id' },
              { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
              { name: 'message', type: 'text' },
              { name: 'status', type: 'enum' },
              { name: 'createdAt', type: 'datetime' },
            ],
          },
        ],
        enums: [
          { name: 'UserRole', values: ['admin', 'agent', 'user'] },
          { name: 'PropertyType', values: ['house', 'condo', 'apartment', 'land', 'commercial'] },
          { name: 'PropertyStatus', values: ['active', 'pending', 'sold'] },
          { name: 'InquiryStatus', values: ['new', 'contacted', 'closed'] },
        ],
      };
    case 'fitness':
      return {
        tables: [
          ...baseTables,
          {
            name: 'memberships',
            columns: [
              { name: 'id', type: 'uuid', primaryKey: true },
              { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
              { name: 'plan', type: 'enum' },
              { name: 'status', type: 'enum' },
              { name: 'startDate', type: 'datetime' },
              { name: 'endDate', type: 'datetime' },
            ],
          },
          {
            name: 'workouts',
            columns: [
              { name: 'id', type: 'uuid', primaryKey: true },
              { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
              { name: 'name', type: 'string' },
              { name: 'duration', type: 'integer' },
              { name: 'calories', type: 'integer' },
              { name: 'date', type: 'datetime' },
            ],
          },
        ],
        enums: [
          { name: 'UserRole', values: ['admin', 'trainer', 'member'] },
          { name: 'MembershipPlan', values: ['basic', 'premium', 'vip'] },
          { name: 'MembershipStatus', values: ['active', 'inactive', 'cancelled'] },
        ],
      };
    default:
      return {
        tables: [
          ...baseTables,
          {
            name: 'projects',
            columns: [
              { name: 'id', type: 'uuid', primaryKey: true },
              { name: 'name', type: 'string' },
              { name: 'userId', type: 'uuid', foreignKey: 'users.id' },
              { name: 'createdAt', type: 'datetime' },
            ],
          },
        ],
        enums: [
          { name: 'UserRole', values: ['admin', 'user'] },
        ],
      };
  }
}

function generateApiDesign(pages: PageSpec[], industry: string): Record<string, unknown> {
  const endpoints: EndpointSpec[] = [
    { method: 'POST', path: '/api/auth/register', description: 'Register new user', auth: false, requestBody: { email: 'string', password: 'string', name: 'string' } },
    { method: 'POST', path: '/api/auth/login', description: 'Login user', auth: false, requestBody: { email: 'string', password: 'string' } },
    { method: 'GET', path: '/api/auth/session', description: 'Get current session', auth: true },
  ];

  switch (industry) {
    case 'real-estate':
      endpoints.push(
        { method: 'GET', path: '/api/properties', description: 'List properties', auth: false },
        { method: 'GET', path: '/api/properties/[id]', description: 'Get property', auth: false },
        { method: 'POST', path: '/api/properties', description: 'Create property', auth: true },
        { method: 'PUT', path: '/api/properties/[id]', description: 'Update property', auth: true },
        { method: 'DELETE', path: '/api/properties/[id]', description: 'Delete property', auth: true },
        { method: 'POST', path: '/api/inquiries', description: 'Create inquiry', auth: true },
      );
      break;
    case 'fitness':
      endpoints.push(
        { method: 'GET', path: '/api/workouts', description: 'List workouts', auth: true },
        { method: 'POST', path: '/api/workouts', description: 'Log workout', auth: true },
        { method: 'GET', path: '/api/memberships', description: 'List memberships', auth: true },
        { method: 'POST', path: '/api/memberships', description: 'Create membership', auth: true },
      );
      break;
    default:
      endpoints.push(
        { method: 'GET', path: '/api/projects', description: 'List projects', auth: true },
        { method: 'POST', path: '/api/projects', description: 'Create project', auth: true },
      );
  }

  return {
    style: 'REST',
    baseUrl: '/api/v1',
    authentication: { type: 'JWT', header: 'Authorization', expiry: '24h' },
    endpoints,
    middleware: [
      { name: 'rateLimit', config: '100 requests per minute' },
      { name: 'cors', config: 'allow specific origins' },
      { name: 'validation', config: 'validate request bodies with zod' },
    ],
  };
}

function generateDesignTokens(industry: string): Record<string, unknown> {
  switch (industry) {
    case 'real-estate':
      return {
        colors: {
          primary: '#1a1a2e',
          secondary: '#c9a962',
          accent: '#e8d5b7',
          background: '#fafafa',
          foreground: '#1a1a2e',
          muted: '#f5f5f5',
          card: '#ffffff',
          border: '#e5e5e5',
        },
        typography: {
          fontFamily: 'Playfair Display, Georgia, serif',
          headingFont: 'Playfair Display, Georgia, serif',
          bodyFont: 'Inter, system-ui, sans-serif',
          scale: ['12px', '14px', '16px', '20px', '24px', '32px', '48px', '64px'],
        },
        spacing: ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'],
        borderRadius: { sm: '4px', md: '8px', lg: '12px', full: '9999px' },
      };
    case 'fitness':
      return {
        colors: {
          primary: '#dc2626',
          secondary: '#171717',
          accent: '#fbbf24',
          background: '#ffffff',
          foreground: '#171717',
          muted: '#f5f5f5',
          card: '#ffffff',
          border: '#e5e5e5',
        },
        typography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          headingFont: 'Oswald, Impact, sans-serif',
          bodyFont: 'Inter, system-ui, sans-serif',
          scale: ['12px', '14px', '16px', '20px', '24px', '32px', '48px', '64px'],
        },
        spacing: ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'],
        borderRadius: { sm: '4px', md: '8px', lg: '12px', full: '9999px' },
      };
    case 'perfume':
    case 'fragrance':
    case 'luxury':
    case 'beauty':
      return {
        colors: {
          primary: '#C9A96E',
          secondary: '#D4AF37',
          accent: '#8B7355',
          background: '#0a0a0a',
          foreground: '#f5f5f5',
          muted: '#1a1a1a',
          card: '#141414',
          border: '#2a2a2a',
        },
        typography: {
          fontFamily: 'Playfair Display, Georgia, serif',
          headingFont: 'Playfair Display, Georgia, serif',
          bodyFont: 'Inter, system-ui, sans-serif',
          scale: ['12px', '14px', '16px', '20px', '24px', '32px', '48px', '64px'],
        },
        spacing: ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'],
        borderRadius: { sm: '4px', md: '8px', lg: '12px', full: '9999px' },
      };
    case 'footwear':
    case 'shoes':
    case 'sneakers':
      return {
        colors: {
          primary: '#171717',
          secondary: '#FF4500',
          accent: '#F97316',
          background: '#0A0A0A',
          foreground: '#FAFAFA',
          muted: '#1A1A1A',
          card: '#141414',
          border: '#262626',
        },
        typography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          headingFont: 'Oswald, Impact, sans-serif',
          bodyFont: 'Inter, system-ui, sans-serif',
          scale: ['12px', '14px', '16px', '20px', '24px', '32px', '48px', '64px'],
        },
        spacing: ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'],
        borderRadius: { sm: '2px', md: '4px', lg: '8px', full: '9999px' },
      };
    default:
      return {
        colors: {
          primary: '#3b82f6',
          secondary: '#10b981',
          accent: '#8b5cf6',
          background: '#ffffff',
          foreground: '#1f2937',
          muted: '#f9fafb',
          card: '#ffffff',
          border: '#e5e7eb',
        },
        typography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          headingFont: 'Inter, system-ui, sans-serif',
          bodyFont: 'Inter, system-ui, sans-serif',
          scale: ['12px', '14px', '16px', '20px', '24px', '32px', '48px', '64px'],
        },
        spacing: ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'],
        borderRadius: { sm: '4px', md: '8px', lg: '12px', full: '9999px' },
      };
  }
}

function getPageIcon(name: string): string {
  const icons: Record<string, string> = {
    'Home': 'home',
    'Properties': 'building',
    'Property Detail': 'building',
    'About': 'info',
    'Contact': 'mail',
    'Dashboard': 'layout-dashboard',
    'Workouts': 'dumbbell',
    'Memberships': 'credit-card',
    'Analytics': 'bar-chart',
    'Settings': 'settings',
    'Login': 'log-in',
    'Register': 'user-plus',
    'Pricing': 'credit-card',
    'Features': 'star',
  };
  return icons[name] ?? 'circle';
}
