import { ArchitectDecision } from './architect.js';
import { DomainContext, detectDomain } from './domain-detector.js';
import { DomainMockData, getDomainData, getSectionData } from './domain-data.js';
import { resolveDomainImages, ResolvedImages } from './image-resolver.js';
import { WebResearcher, WebResearchData } from './web-researcher.js';

function escapeJSX(s: string): string {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface DomainSynthesisContext {
  domain: DomainContext;
  data: DomainMockData;
  images: ResolvedImages;
  decision: ArchitectDecision;
  webResearch?: WebResearchData | undefined;
}

export async function createDomainSynthesisAsync(prompt: string, decision: ArchitectDecision): Promise<DomainSynthesisContext> {
  const domain = detectDomain(prompt);
  const data = getDomainData(domain.industry, domain.subIndustry);
  const images = resolveDomainImages(
    domain.imageKeywords.length > 0 ? domain.imageKeywords : data.imageKeywords,
    data.items.length,
    data.team.length,
  );

  console.log(`[domain-synth] Detected: ${domain.industry}/${domain.subIndustry || 'general'} mood=${domain.mood}`);
  console.log(`[domain-synth] Sections: ${domain.suggestedSections.join(', ')}`);

  // Research real competitors in the domain
  let webResearch: WebResearchData | undefined;
  try {
    const researcher = new WebResearcher();
    webResearch = await researcher.researchDomain(domain.industry, domain.subIndustry || 'general');
    console.log(`[domain-synth] Web research: ${webResearch.competitors.length} competitors, ${webResearch.popularServices.length} services`);
  } catch (err: any) {
    console.warn(`[domain-synth] Web research failed (using mock data): ${err.message}`);
  }

  return { domain, data, images, decision, webResearch };
}

export function createDomainSynthesis(prompt: string, decision: ArchitectDecision): DomainSynthesisContext {
  const domain = detectDomain(prompt);
  const data = getDomainData(domain.industry, domain.subIndustry);
  const images = resolveDomainImages(
    domain.imageKeywords.length > 0 ? domain.imageKeywords : data.imageKeywords,
    data.items.length,
    data.team.length,
  );

  console.log(`[domain-synth] Detected: ${domain.industry}/${domain.subIndustry || 'general'} mood=${domain.mood}`);
  console.log(`[domain-synth] Sections: ${domain.suggestedSections.join(', ')}`);

  return { domain, data, images, decision };
}

export function synthesizeDomainHero(ctx: DomainSynthesisContext): string {
  const { data, decision: d, images, webResearch } = ctx;
  const h = data.hero;

  // Use real CTA from web research if available
  const cta = webResearch?.ctaExamples[0] || h.cta;
  const ctaSecondary = webResearch?.ctaExamples[1] || h.ctaSecondary;

  return `<section className="relative pt-32 pb-20 px-6 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src="${images.hero}" alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/80 to-zinc-950"></div>
      </div>
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-${d.colorScheme.primary}-500/20 bg-${d.colorScheme.primary}-500/10 text-${d.colorScheme.primary}-400">${escapeJSX(h.badge)}</div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight">${escapeJSX(h.headline.split(' ').slice(0, Math.ceil(h.headline.split(' ').length / 2)).join(' '))} <span className="text-transparent bg-clip-text bg-gradient-to-r ${d.colorScheme.gradient}">${escapeJSX(h.headline.split(' ').slice(Math.ceil(h.headline.split(' ').length / 2)).join(' '))}</span></h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">${escapeJSX(h.subtitle)}</p>
        <div className="flex items-center justify-center gap-4">
          <button className="px-8 py-4 rounded-xl bg-${d.colorScheme.primary}-600 hover:bg-${d.colorScheme.primary}-700 font-bold transition-all">${escapeJSX(cta)}</button>
          ${ctaSecondary ? `<button className="px-8 py-4 rounded-xl border border-zinc-700 hover:border-zinc-500 font-bold transition-all">${escapeJSX(ctaSecondary)}</button>` : ''}
        </div>
      </div>
    </section>`;
}

export function synthesizeDomainStats(ctx: DomainSynthesisContext): string {
  const { data, decision: d } = ctx;

  return `<section className="px-6 pb-12">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        ${data.stats.map(s => `<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-2xl font-black text-${d.colorScheme.primary}-400">${escapeJSX(s.value)}</div>
          <div className="text-xs text-zinc-500">${escapeJSX(s.label)}</div>
        </div>`).join('\n        ')}
      </div>
    </section>`;
}

export function synthesizeDomainItems(ctx: DomainSynthesisContext, sectionType: string): string {
  const { data, decision: d, images } = ctx;
  const sectionData = getSectionData(ctx.domain.industry, sectionType, data);
  const items = sectionData.items;

  if (items.length === 0) return '';

  const itemCards = items.slice(0, 4).map((item, i) => {
    const itemImage = images.items[i % images.items.length];
    const hasPrice = item.price !== undefined && item.price > 0;

    return `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition group cursor-pointer">
        <div className="h-48 overflow-hidden relative">
          <img src="${itemImage}" alt="${item.name}" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
          ${item.tag ? `<span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-bold bg-${d.colorScheme.primary}-600/90 text-white backdrop-blur-sm">${escapeJSX(item.tag)}</span>` : ''}
        </div>
        <div className="p-5">
          ${item.rating ? `<div className="flex items-center gap-1 mb-2">
            <span className="text-yellow-400 text-sm">${'★'.repeat(Math.floor(item.rating))}</span>
            <span className="text-xs text-zinc-500">${item.rating} (${item.reviews} reviews)</span>
          </div>` : ''}
          <h3 className="font-bold text-lg">${escapeJSX(item.name)}</h3>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">${escapeJSX(item.description)}</p>
          ${item.details ? `<div className="flex flex-wrap gap-2 mt-3">
            ${item.details.map(d => `<span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">${escapeJSX(d)}</span>`).join('')}
          </div>` : ''}
          <div className="flex items-center justify-between mt-4">
            ${hasPrice ? `<span className="text-xl font-black text-${d.colorScheme.primary}-400">$${item.price!.toLocaleString()}</span>` : '<span></span>'}
            <button className="px-4 py-2 rounded-lg bg-${d.colorScheme.primary}-600 hover:bg-${d.colorScheme.primary}-700 text-sm font-bold transition">View Details</button>
          </div>
        </div>
      </div>`;
  }).join('\n            ');

  const sectionTitle = sectionData.label;

  return `<section className="px-6 pb-20">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-black mb-8">${sectionTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${itemCards}
        </div>
      </div>
    </section>`;
}

export function synthesizeDomainFeatures(ctx: DomainSynthesisContext): string {
  const { data, decision: d } = ctx;

  return `<section className="px-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-12">Why Choose ${d.name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          ${data.features.map(f => `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition">
            <div className="text-3xl mb-3">${f.icon}</div>
            <h3 className="font-bold text-lg">${f.title}</h3>
            <p className="text-sm text-zinc-400 mt-2">${f.description}</p>
          </div>`).join('\n          ')}
        </div>
      </div>
    </section>`;
}

export function synthesizeDomainTestimonials(ctx: DomainSynthesisContext): string {
  const { data, decision: d } = ctx;

  return `<section className="px-6 pb-20 bg-zinc-900/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-black mb-8 text-center">What People Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${data.testimonials.map(t => `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-1 mb-3">
              <span className="text-yellow-400">${'★'.repeat(t.rating)}</span>
            </div>
            <p className="text-sm text-zinc-400 mb-4">"${escapeJSX(t.text)}"</p>
            <div>
              <span className="text-sm font-bold">${escapeJSX(t.name)}</span>
              <span className="text-xs text-zinc-500 ml-2">${escapeJSX(t.role)}</span>
            </div>
          </div>`).join('\n          ')}
        </div>
      </div>
    </section>`;
}

export function synthesizeDomainTeam(ctx: DomainSynthesisContext): string {
  const { data, decision: d, images } = ctx;

  return `<section className="px-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-black mb-8 text-center">Meet Our Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-${Math.min(data.team.length, 4)} gap-4">
          ${data.team.map((t, i) => `<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center hover:border-zinc-700 transition">
            <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden">
              <img src="${images.team[i % images.team.length]}" alt="${t.name}" class="w-full h-full object-cover" />
            </div>
            <h3 className="font-bold">${escapeJSX(t.name)}</h3>
            <p className="text-sm text-${d.colorScheme.primary}-400">${escapeJSX(t.role)}</p>
            <p className="text-xs text-zinc-500 mt-1">${escapeJSX(t.bio)}</p>
          </div>`).join('\n          ')}
        </div>
      </div>
    </section>`;
}

export function synthesizeDomainCTA(ctx: DomainSynthesisContext): string {
  const { data, decision: d } = ctx;
  const c = data.cta;

  return `<section className="px-6 pb-20">
      <div className="max-w-xl mx-auto text-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <h2 className="text-xl font-black mb-3">${escapeJSX(c.headline)}</h2>
        <p className="text-sm text-zinc-500 mb-6">${escapeJSX(c.subtitle)}</p>
        <button className="px-8 py-4 rounded-xl bg-${d.colorScheme.primary}-600 hover:bg-${d.colorScheme.primary}-700 font-bold transition">${escapeJSX(c.button)}</button>
      </div>
    </section>`;
}

export function synthesizeDomainFooter(ctx: DomainSynthesisContext): string {
  const { data, decision: d } = ctx;
  const f = data.footer;

  return `<footer className="border-t border-zinc-800 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-${d.colorScheme.primary}-500 to-${d.colorScheme.secondary}-500 flex items-center justify-center font-black text-sm">${d.name.charAt(0)}</div>
            <span className="font-black text-lg tracking-tight">${d.name}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            ${f.links.map(l => `<a href="${l.href}" className="hover:text-white transition">${escapeJSX(l.label)}</a>`).join('\n            ')}
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-zinc-800 text-center text-xs text-zinc-600">
          <p>${escapeJSX(f.tagline)}</p>
          <p className="mt-1">&copy; ${new Date().getFullYear()} ${d.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>`;
}

export function synthesizeDomainSection(section: string, ctx: DomainSynthesisContext): string {
  switch (section) {
    case 'hero': return synthesizeDomainHero(ctx);
    case 'stats-bar': return synthesizeDomainStats(ctx);
    case 'featured-properties':
    case 'product-grid':
    case 'featured-products':
    case 'menu-highlights':
    case 'courses':
    case 'featured-projects':
    case 'course-featured':
      return synthesizeDomainItems(ctx, section);
    case 'features-grid':
    case 'features': return synthesizeDomainFeatures(ctx);
    case 'testimonials': return synthesizeDomainTestimonials(ctx);
    case 'team':
    case 'team/doctors':
    case 'trainers': return synthesizeDomainTeam(ctx);
    case 'cta': return synthesizeDomainCTA(ctx);
    case 'services':
    case 'services-grid':
    case 'practice-areas':
    case 'mission':
    case 'about': return synthesizeDomainItems(ctx, 'services');
    case 'pricing-table':
    case 'membership-plans': return synthesizeDomainItems(ctx, 'pricing-table');
    case 'contact-form': return synthesizeContactForm(ctx);
    case 'contact-info': return synthesizeContactInfo(ctx);
    case 'newsletter-cta': return synthesizeNewsletter(ctx);
    case 'faq': return synthesizeFAQ(ctx);
    case 'gallery': return synthesizeDomainItems(ctx, 'gallery');
    case 'class-schedule': return synthesizeClassSchedule(ctx);
    case 'case-studies': return synthesizeDomainItems(ctx, 'case-studies');
    case 'clients': return synthesizeClients(ctx);
    case 'filter-bar': return synthesizeFilterBar(ctx);
    case 'skills': return synthesizeSkills(ctx);
    case 'categories': return synthesizeFilterBar(ctx);
    case 'integrations': return synthesizeDomainFeatures(ctx);
    default: return synthesizeGenericSection(section, ctx);
  }
}

function synthesizeContactForm(ctx: DomainSynthesisContext): string {
  const { decision: d } = ctx;
  return `<section className="px-6 pb-20">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-black mb-8 text-center">Get in Touch</h2>
        <div className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <input type="text" placeholder="Your Name" className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-${d.colorScheme.primary}-500" />
          <input type="email" placeholder="Email Address" className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-${d.colorScheme.primary}-500" />
          <textarea placeholder="Your message..." rows={4} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-${d.colorScheme.primary}-500 resize-none" />
          <button className="w-full py-3 rounded-xl bg-${d.colorScheme.primary}-600 hover:bg-${d.colorScheme.primary}-700 font-bold transition">Send Message</button>
        </div>
      </div>
    </section>`;
}

function synthesizeContactInfo(ctx: DomainSynthesisContext): string {
  const { decision: d } = ctx;
  return `<section className="px-6 pb-20">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="font-black text-lg mb-4">Contact Info</h3>
          <div className="space-y-2 text-sm text-zinc-400">
            <p>123 Main Street, Downtown</p>
            <p>hello@${d.name.toLowerCase().replace(/\s/g, '')}.com</p>
            <p>(555) 123-4567</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="font-black text-lg mb-4">Hours</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-zinc-400">Mon - Fri</span><span>9:00 AM - 6:00 PM</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Saturday</span><span>10:00 AM - 4:00 PM</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Sunday</span><span>Closed</span></div>
          </div>
        </div>
      </div>
    </section>`;
}

function synthesizeNewsletter(ctx: DomainSynthesisContext): string {
  const { decision: d } = ctx;
  return `<section className="px-6 pb-20">
      <div className="max-w-xl mx-auto text-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <h2 className="text-xl font-black mb-3">Stay Updated</h2>
        <p className="text-sm text-zinc-500 mb-6">Get the latest news, offers, and updates delivered to your inbox.</p>
        <div className="flex gap-3">
          <input type="email" placeholder="your@email.com" className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-${d.colorScheme.primary}-500" />
          <button className="px-6 py-3 rounded-xl bg-${d.colorScheme.primary}-600 hover:bg-${d.colorScheme.primary}-700 text-sm font-bold transition">Subscribe</button>
        </div>
      </div>
    </section>`;
}

function synthesizeFAQ(ctx: DomainSynthesisContext): string {
  const { decision: d } = ctx;
  const faqs = [
    { q: 'How do I get started?', a: 'Simply reach out to us and we\'ll guide you through the process step by step.' },
    { q: 'What are your hours?', a: 'We\'re available Monday through Friday, 9 AM to 6 PM. Emergency support available 24/7.' },
    { q: 'Do you offer consultations?', a: 'Yes! We offer a free initial consultation to understand your needs and how we can help.' },
    { q: 'How can I contact you?', a: 'You can reach us by phone, email, or through the contact form on this page.' },
  ];

  return `<section className="px-6 pb-20">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-black mb-8 text-center">Frequently Asked Questions</h2>
        <div className="space-y-3">
          ${faqs.map(f => `<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-bold text-sm">${f.q}</h3>
            <p className="text-sm text-zinc-400 mt-2">${f.a}</p>
          </div>`).join('\n          ')}
        </div>
      </div>
    </section>`;
}

function synthesizeClassSchedule(ctx: DomainSynthesisContext): string {
  const { decision: d } = ctx;
  const classes = [
    { name: 'Morning Session', time: '6:00 AM', trainer: 'Coach Davis', spots: 8, intensity: 'High' },
    { name: 'Midday Flow', time: '12:00 PM', trainer: 'Instructor Kim', spots: 12, intensity: 'Medium' },
    { name: 'Afternoon Power', time: '3:00 PM', trainer: 'Coach Rivera', spots: 10, intensity: 'High' },
    { name: 'Evening Wind-Down', time: '6:00 PM', trainer: 'Instructor Chen', spots: 14, intensity: 'Low' },
  ];

  return `<section className="px-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-black mb-8">Class Schedule</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${classes.map(c => `<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full ${c.intensity === 'High' ? 'bg-red-500/10 text-red-400' : c.intensity === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}">${c.intensity}</span>
              <span className="text-xs text-zinc-500">${c.spots} spots</span>
            </div>
            <h3 className="font-bold text-lg">${c.name}</h3>
            <p className="text-sm text-zinc-500 mt-1">${c.time} · ${c.trainer}</p>
            <button className="w-full mt-4 py-2 rounded-lg bg-zinc-800 hover:bg-${d.colorScheme.primary}-600 text-sm font-bold transition">Book Spot</button>
          </div>`).join('\n          ')}
        </div>
      </div>
    </section>`;
}

function synthesizeClients(ctx: DomainSynthesisContext): string {
  return `<section className="px-6 pb-20">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-2xl font-black mb-8">Trusted By</h2>
        <div className="flex flex-wrap justify-center gap-4">
          ${['Global Corp', 'TechStart Inc', 'InnovateCo', 'FutureBuild', 'Summit Labs'].map(c => `<div className="px-6 py-4 rounded-xl bg-zinc-900 border border-zinc-800 font-bold text-zinc-500">${c}</div>`).join('\n          ')}
        </div>
      </div>
    </section>`;
}

function synthesizeFilterBar(ctx: DomainSynthesisContext): string {
  const { decision: d } = ctx;
  const categories = ['All', 'Featured', 'Popular', 'New'];

  return `<section className="px-6 pb-8">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          ${categories.map((cat, i) => `<button className="px-3 py-1.5 rounded-lg text-xs font-bold transition ${i === 0 ? 'bg-' + d.colorScheme.primary + '-600 text-white' : 'text-zinc-400 hover:text-white'}">${cat}</button>`).join('\n          ')}
        </div>
      </div>
    </section>`;
}

function synthesizeSkills(ctx: DomainSynthesisContext): string {
  const skills = ['React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL', 'AWS', 'Docker', 'Figma', 'GraphQL', 'Next.js'];
  return `<section className="px-6 pb-20">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-black mb-8">Skills & Technologies</h2>
        <div className="flex flex-wrap gap-3">
          ${skills.map(s => `<span className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm font-medium">${s}</span>`).join('\n          ')}
        </div>
      </div>
    </section>`;
}

function synthesizeGenericSection(section: string, ctx: DomainSynthesisContext): string {
  const { decision: d } = ctx;
  const title = section.split(/[-/]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return `<section className="px-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-black mb-8 text-center">${title}</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
          Content for ${title} section
        </div>
      </div>
    </section>`;
}
