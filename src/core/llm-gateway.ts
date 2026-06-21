import { ASTPatch, LLMContext, LLMConfig, LLMProvider } from '../types/index.js';
import { ArchitectAgent, ArchitectDecision } from '../generation/architect.js';

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class LLMGateway {
  private provider: LLMProvider;
  private apiKey: string;
  private model: string;
  private architect: ArchitectAgent;

  constructor(config: LLMConfig) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;
    this.model = config.model || this.defaultModel(config.provider);
    this.architect = new ArchitectAgent();
  }

  private defaultModel(provider: LLMProvider): string {
    switch (provider) {
      case 'anthropic': return 'claude-3-7-sonnet-20250219';
      case 'gemini': return 'gemini-2.5-pro';
      case 'openai':
      default: return 'gpt-4o';
    }
  }

  public async generatePatches(context: LLMContext): Promise<ASTPatch[]> {
    const decision = this.architect.designArchitecture(context.prompt);
    const architecturePrompt = this.architect.buildArchitecturePrompt(decision);

    if (!this.apiKey || this.apiKey.trim() === '') {
      console.warn(`[build.same.gateway] NO_API_KEY: provider=${this.provider}. Falling back to JIT synthesis. Set LLM_API_KEY to use real LLM generation.`);
      return this.synthesizeFallback(decision, context);
    }

    const systemPrompt = this.buildSystemPrompt(architecturePrompt);
    const userPrompt = this.buildUserPrompt(context);

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`[build.same.gateway] LLM_CALL: provider=${this.provider} model=${this.model} attempt=${attempt}/${RETRY_ATTEMPTS}`);
        const patches = await this.callProvider(systemPrompt, userPrompt);
        console.log(`[build.same.gateway] LLM_OK: received ${patches.length} patches from ${this.provider}`);
        return patches;
      } catch (err: any) {
        const isTransient = this.isTransientError(err);
        const delay = isTransient ? RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) : 0;

        if (attempt < RETRY_ATTEMPTS && isTransient) {
          console.warn(`[build.same.gateway] LLM_RETRY: ${err.message} (status=${this.extractStatus(err)}). Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        console.error(`[build.same.gateway] LLM_FAIL: provider=${this.provider} attempt=${attempt} error="${err.message}". Falling back to JIT synthesis.`);
        return this.synthesizeFallback(decision, context);
      }
    }

    return this.synthesizeFallback(decision, context);
  }

  private async callProvider(systemPrompt: string, userPrompt: string): Promise<ASTPatch[]> {
    switch (this.provider) {
      case 'anthropic': return this.callAnthropic(systemPrompt, userPrompt);
      case 'gemini': return this.callGemini(systemPrompt, userPrompt);
      case 'openai':
      default: return this.callOpenAI(systemPrompt, userPrompt);
    }
  }

  private isTransientError(err: any): boolean {
    const status = this.extractStatus(err);
    if (status && TRANSIENT_STATUS_CODES.has(status)) return true;
    if (err.message?.includes('ETIMEDOUT') || err.message?.includes('ECONNRESET')) return true;
    return false;
  }

  private extractStatus(err: any): number | null {
    const match = err.message?.match(/(?:HTTP Error|status)[\s:=]+(\d{3})/);
    return match ? parseInt(match[1], 10) : null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── Provider Implementations ──────────────────────────────────

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<ASTPatch[]> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return this.parseAndValidatePatches(content);
  }

  private async callAnthropic(systemPrompt: string, userPrompt: string): Promise<ASTPatch[]> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) throw new Error('Empty response from Anthropic');

    return this.parseAndValidatePatches(content);
  }

  private async callGemini(systemPrompt: string, userPrompt: string): Promise<ASTPatch[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 8000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Empty response from Gemini');

    return this.parseAndValidatePatches(content);
  }

  // ─── Prompt Construction ───────────────────────────────────────

  private buildSystemPrompt(architecturePrompt: string): string {
    return `You are build.same, an elite AI software architect and frontend engineer.
You generate complete, production-quality Next.js App Router applications from atomic primitives.
You NEVER use pre-built templates. You compose from atomic building blocks like LEGO.

## Your Architecture
${architecturePrompt}

## Output Format
You must emit a JSON array of ASTPatch objects. Each patch targets a specific file and export.

Schema:
interface ASTPatch {
  targetFile: string;     // Relative path from workspace root
  targetExport?: string; // The function/component name being updated
  action: 'insert' | 'update' | 'delete';
  codeBlock: string;      // Valid TypeScript/JSX code
}

## Rules
1. Generate COMPLETE, production-quality React components with Tailwind CSS
2. Use the atomic primitives catalog above to compose sections
3. Each page component must be self-contained with its own state management
4. Use React.useState for interactive state (cart, filters, forms, modals)
5. Include realistic mock data that matches the business domain
6. Every component MUST have beautiful, modern dark-theme styling (bg-zinc-950, bg-zinc-900, border-zinc-800)
7. Use gradient text for headings: text-transparent bg-clip-text bg-gradient-to-r from-{primary}-400 to-{secondary}-400
8. Include hover effects, transitions, and micro-interactions
9. All form inputs must have focus states: focus:outline-none focus:border-{primary}-500
10. Generate multi-file patches: page.tsx AND component files in src/components/
11. Do NOT include import statements in codeBlock — imports are handled by the scaffold
12. Export default function components named exactly: Home, Shop, Booking, Dashboard, etc.
13. Ensure all JSX is valid and will compile without errors
14. Include realistic product/service/feature data — NOT placeholder "lorem ipsum"
15. Every interactive element must have onClick/handlers that update state

## Code Style
- Use inline React.useState for all state
- Use Tailwind utility classes exclusively (no CSS modules, no styled-components)
- Use Lucide-style SVG icons inline (simple path elements)
- All sections use max-w-7xl mx-auto px-6 for content width
- Cards use bg-zinc-900 border border-zinc-800 rounded-2xl p-6
- Buttons use px-6 py-3 rounded-xl font-bold transition-all
- Headings use text-5xl md:text-7xl font-black tracking-tight

Generate ASTPatch[] that builds every page and component listed in the architecture.`;
  }

  private buildUserPrompt(context: LLMContext): string {
    let prompt = `User Directive: "${context.prompt}"

Generate complete AST patches for ALL pages and components in the architecture above.
Focus on making this a real, functional application — not a placeholder.

Active Attempt Loop: ${context.attempt}`;

    if (context.attempt > 0) {
      prompt += `
Recently Modified Files: ${JSON.stringify(context.changedFiles)}
Current Compilation Diagnostics: ${JSON.stringify(context.errors)}

Review any compilation diagnostics carefully and generate AST patches that resolve the errors while preserving all other functionality.`;
    }

    return prompt;
  }

  // ─── Response Parsing ──────────────────────────────────────────

  private parseAndValidatePatches(rawJson: string): ASTPatch[] {
    const data = JSON.parse(rawJson.trim());
    const patches: ASTPatch[] = Array.isArray(data) ? data : data.patches || [];

    return patches.map((p: any) => {
      const patch: ASTPatch = {
        targetFile: String(p.targetFile),
        action: p.action as 'insert' | 'update' | 'delete',
        codeBlock: String(p.codeBlock)
      };
      if (p.targetExport !== undefined) {
        patch.targetExport = String(p.targetExport);
      }
      return patch;
    });
  }

  // ─── JIT Synthesis Fallback ────────────────────────────────────
  // Generates deterministic but architecturally sound code from the
  // ArchitectAgent decision — no hardcoded templates, just composition.
  // This is the explicit degraded mode for when no API key is configured.

  private synthesizeFallback(decision: ArchitectDecision, context: LLMContext): ASTPatch[] {
    console.log(`[build.same.gateway] JIT_SYNTHESIS: provider=${this.provider} businessType=${decision.businessType} pages=${decision.pages.length}`);
    console.log(`[build.same.gateway] JIT_SYNTHESIS: subDomains=[${decision.subDomains.join(', ')}]`);
    console.log(`[build.same.gateway] JIT_SYNTHESIS: pages=[${decision.pages.map(p => p.route).join(', ')}]`);

    const patches: ASTPatch[] = [];

    for (const page of decision.pages) {
      patches.push(this.synthesizePage(page, decision));
    }

    return patches;
  }

  private synthesizePage(page: import('../generation/architect.js').PageDesign, decision: ArchitectDecision): ASTPatch {
    const sections = page.sections.map(s => this.synthesizeSection(s, decision)).join('\n\n');

    const navLinks = decision.pages
      .filter(p => p.route !== page.route)
      .map(p => ({ label: p.name, route: p.route }))
      .slice(0, 5);

    const componentName = page.route === '/' ? 'Home' : page.name.replace(/\s+/g, '');
    const filePath = page.route === '/' ? 'src/app/page.tsx' : `src/app${page.route}/page.tsx`;

    const ctaText = page.type === 'shop' ? 'View Cart'
      : page.type === 'booking' ? 'Book Now'
      : page.type === 'dashboard' ? 'Open Dashboard'
      : 'Get Started';

    const codeBlock = `function ${componentName}() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-zinc-800 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-${decision.colorScheme.primary}-500 to-${decision.colorScheme.secondary}-500 flex items-center justify-center font-black text-sm">${decision.name.charAt(0)}</div>
            <span className="font-black text-lg tracking-tight">${decision.name}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            ${decision.pages.map(p => `<span className="${p.route === page.route ? 'text-white' : 'hover:text-white cursor-pointer transition'}">${p.name}</span>`).join('\n            ')}
          </div>
          <button className="px-5 py-2.5 rounded-xl bg-${decision.colorScheme.primary}-600 hover:bg-${decision.colorScheme.primary}-700 text-sm font-bold transition">${ctaText}</button>
        </div>
      </nav>

      ${sections}

      <footer className="border-t border-zinc-800 py-12 px-6 text-center text-sm text-zinc-600">
        <p>&copy; 2026 ${decision.name}. All rights reserved.</p>
      </footer>
    </div>
  );
}`;

    return {
      targetFile: filePath,
      targetExport: componentName,
      action: 'update',
      codeBlock,
    };
  }

  private synthesizeSection(section: string, decision: ArchitectDecision): string {
    const c = decision.colorScheme;

    switch (section) {
      case 'hero':
        return this.synthesizeHero(decision);
      case 'stats-bar':
        return this.synthesizeStatsBar(decision);
      case 'featured-products':
      case 'product-grid':
        return this.synthesizeProductGrid(decision);
      case 'categories':
        return this.synthesizeCategories(decision);
      case 'testimonials':
        return this.synthesizeTestimonials(decision);
      case 'newsletter-cta':
        return this.synthesizeNewsletter(decision);
      case 'features-grid':
      case 'features':
        return this.synthesizeFeatures(decision);
      case 'pricing-table':
        return this.synthesizePricing(decision);
      case 'faq':
        return this.synthesizeFAQ(decision);
      case 'services':
      case 'services-grid':
        return this.synthesizeServices(decision);
      case 'team/doctors':
      case 'team':
        return this.synthesizeTeam(decision);
      case 'class-schedule':
        return this.synthesizeClassSchedule(decision);
      case 'trainers':
        return this.synthesizeTrainers(decision);
      case 'membership-plans':
        return this.synthesizeMembership(decision);
      case 'course-featured':
        return this.synthesizeCourses(decision);
      case 'menu-highlights':
        return this.synthesizeMenu(decision);
      case 'gallery':
        return this.synthesizeGallery(decision);
      case 'featured-projects':
        return this.synthesizeProjects(decision);
      case 'caseStudies':
        return this.synthesizeCaseStudies(decision);
      case 'clients':
        return this.synthesizeClients(decision);
      case 'cta':
        return this.synthesizeCTA(decision);
      case 'contact-form':
        return this.synthesizeContactForm(decision);
      case 'contact-info':
        return this.synthesizeContactInfo(decision);
      case 'filter-bar':
        return this.synthesizeFilterBar(decision);
      case 'skills':
        return this.synthesizeSkills(decision);
      default:
        return this.synthesizeGenericSection(section, decision);
    }
  }

  private synthesizeHero(d: ArchitectDecision): string {
    const badgeText = d.subDomains.includes('ecommerce') ? 'New Collection 2026'
      : d.subDomains.includes('saas') ? 'Trusted by 2,800+ teams'
      : d.subDomains.includes('fitness') ? 'Transform Your Body'
      : d.subDomains.includes('healthcare') ? 'Trusted Healthcare'
      : d.subDomains.includes('education') ? 'Learn Without Limits'
      : d.subDomains.includes('restaurant') ? 'Fine Dining Experience'
      : d.subDomains.includes('portfolio') ? 'Available for Hire'
      : d.subDomains.includes('agency') ? 'Full-Service Digital Agency'
      : d.subDomains.includes('martialarts') ? 'Train Like a Warrior'
      : d.subDomains.includes('tea') ? 'Organic & Wellness'
      : 'Welcome';

    const headline = d.subDomains.includes('ecommerce') ? 'Discover Products You\'ll Love'
      : d.subDomains.includes('saas') ? `Ship faster with ${d.name}`
      : d.subDomains.includes('fitness') ? 'Push Your Limits'
      : d.subDomains.includes('healthcare') ? 'Your Health, Our Priority'
      : d.subDomains.includes('education') ? 'Learn Without Limits'
      : d.subDomains.includes('restaurant') ? 'Taste the Extraordinary'
      : d.subDomains.includes('portfolio') ? 'I Build Digital Products'
      : d.subDomains.includes('agency') ? `We Build ${d.name}`
      : d.subDomains.includes('martialarts') ? 'Train Like a Warrior'
      : d.subDomains.includes('tea') ? 'Sip Wellness, Naturally'
      : d.name;

    const subtitle = d.subDomains.includes('ecommerce') ? 'Premium products curated for quality, comfort, and style. Free shipping on orders over $100.'
      : d.subDomains.includes('saas') ? 'The all-in-one platform that helps teams collaborate, build, and deploy 10x faster.'
      : d.subDomains.includes('fitness') ? 'World-class training, expert coaches, and a community that pushes you further.'
      : d.subDomains.includes('healthcare') ? 'Compassionate care from experienced professionals. Accepting new patients.'
      : d.subDomains.includes('education') ? 'Expert-led courses to advance your career. Join 15,000+ students already learning.'
      : d.subDomains.includes('restaurant') ? 'Farm-to-table cuisine crafted with passion and precision. Reserve your table tonight.'
      : d.subDomains.includes('portfolio') ? 'Full-stack developer helping startups and enterprises ship products that users love.'
      : d.subDomains.includes('agency') ? 'A full-service digital agency creating products that users love and businesses profit from.'
      : d.subDomains.includes('martialarts') ? 'Expert instruction in martial arts for all skill levels. Build discipline, strength, and confidence.'
      : d.subDomains.includes('tea') ? 'Premium organic teas sourced from the world\'s finest gardens. Wellness in every cup.'
      : `Building something amazing with ${d.name}.`;

    return `<section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-${d.colorScheme.primary}-500/20 bg-${d.colorScheme.primary}-500/10 text-${d.colorScheme.primary}-400">${badgeText}</div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">${headline.split(' ').slice(0, Math.ceil(headline.split(' ').length / 2)).join(' ')} <span className="text-transparent bg-clip-text bg-gradient-to-r ${d.colorScheme.gradient}">${headline.split(' ').slice(Math.ceil(headline.split(' ').length / 2)).join(' ')}</span></h1>
          <p className="text-zinc-400 text-lg max-w-lg mx-auto">${subtitle}</p>
          <button className="px-8 py-4 rounded-xl bg-${d.colorScheme.primary}-600 hover:bg-${d.colorScheme.primary}-700 font-bold transition-all">Get Started</button>
        </div>
      </section>`;
  }

  private synthesizeStatsBar(d: ArchitectDecision): string {
    const stats = d.subDomains.includes('ecommerce')
      ? [{ v: '10K+', l: 'Happy Customers' }, { v: '500+', l: 'Products' }, { v: '4.9', l: 'Average Rating' }, { v: 'Free', l: 'Shipping $100+' }]
      : d.subDomains.includes('saas')
      ? [{ v: '2,847+', l: 'Teams Using' }, { v: '99.9%', l: 'Uptime SLA' }, { v: '4.9/5', l: 'Avg Rating' }, { v: '50K+', l: 'Deployments' }]
      : d.subDomains.includes('fitness')
      ? [{ v: '500+', l: 'Active Members' }, { v: '30+', l: 'Classes Weekly' }, { v: '15+', l: 'Expert Trainers' }, { v: '4.9', l: 'Member Rating' }]
      : d.subDomains.includes('healthcare')
      ? [{ v: '20+', l: 'Years Experience' }, { v: '15K+', l: 'Patients Served' }, { v: '4', l: 'Specialties' }, { v: '4.9', l: 'Patient Rating' }]
      : d.subDomains.includes('education')
      ? [{ v: '15K+', l: 'Students' }, { v: '94%', l: 'Completion' }, { v: '4.8/5', l: 'Rating' }, { v: '85%', l: 'Career Advancement' }]
      : d.subDomains.includes('martialarts')
      ? [{ v: '500+', l: 'Active Students' }, { v: '10+', l: 'Martial Arts' }, { v: '15+', l: 'Black Belt Instructors' }, { v: '4.9', l: 'Student Rating' }]
      : d.subDomains.includes('tea')
      ? [{ v: '50+', l: 'Tea Varieties' }, { v: '12', l: 'Source Countries' }, { v: '100%', l: 'Organic' }, { v: '4.9', l: 'Customer Rating' }]
      : [{ v: '120+', l: 'Projects' }, { v: '$50M+', l: 'Revenue Generated' }, { v: '80+', l: 'Clients' }, { v: '98%', l: 'Retention' }];

    return `<section className="px-6 pb-12">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          ${stats.map(s => `<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-2xl font-black text-${d.colorScheme.primary}-400">${s.v}</div><div className="text-xs text-zinc-500">${s.l}</div></div>`).join('\n          ')}
        </div>
      </section>`;
  }

  private synthesizeProductGrid(d: ArchitectDecision): string {
    const products = d.subDomains.includes('tea')
      ? [
          { id: 1, name: 'Dragon Well Green', price: 24, rating: 4.9, reviews: 189, tag: 'Best Seller', emoji: '🍵', desc: 'Hand-picked Longjing from Hangzhou. Sweet, nutty, and floral.' },
          { id: 2, name: 'Ceremonial Matcha', price: 34, rating: 4.8, reviews: 156, tag: 'Premium', emoji: '🍃', desc: 'Stone-ground Uji matcha. Vibrant green, umami-rich, zero bitterness.' },
          { id: 3, name: 'Earl Grey Supreme', price: 18, rating: 4.7, reviews: 234, tag: 'Classic', emoji: '🫖', desc: 'Bergamot-kissed Assam with cornflower petals. Bold and aromatic.' },
          { id: 4, name: 'Chamomile Dreams', price: 16, rating: 4.8, reviews: 178, tag: 'Wellness', emoji: '🌼', desc: 'Egyptian chamomile blossoms. Calming, floral, and naturally sweet.' },
          { id: 5, name: 'Iron Goddess Oolong', price: 28, rating: 4.9, reviews: 142, tag: 'Rare', emoji: '🏔️', desc: 'Tieguanyin from Anxi. Orchid fragrance with a creamy, lasting finish.' },
          { id: 6, name: 'Masala Chai Blend', price: 22, rating: 4.7, reviews: 203, tag: 'Spiced', emoji: '🫚', desc: 'Assam black tea with cardamom, ginger, cinnamon, and clove.' },
        ]
      : d.subDomains.includes('ecommerce')
      ? [
          { id: 1, name: 'Classic Runner', price: 129, rating: 4.8, reviews: 234, tag: 'Best Seller', emoji: '👟', desc: 'Lightweight mesh upper with responsive cushioning.' },
          { id: 2, name: 'Air Max Pro', price: 189, rating: 4.9, reviews: 189, tag: 'New', emoji: '🏃', desc: 'Maximum air cushioning with a sleek silhouette.' },
          { id: 3, name: 'Urban Walker', price: 99, rating: 4.6, reviews: 312, tag: 'Popular', emoji: '👞', desc: 'Premium leather with memory foam insole.' },
          { id: 4, name: 'Trail Blazer', price: 159, rating: 4.7, reviews: 156, tag: 'Outdoor', emoji: '🥾', desc: 'Waterproof Gore-Tex with Vibram outsole.' },
          { id: 5, name: 'Street Style', price: 119, rating: 4.5, reviews: 278, tag: 'Trending', emoji: '👟', desc: 'Retro-inspired with modern comfort.' },
          { id: 6, name: 'Speed Elite', price: 209, rating: 4.9, reviews: 98, tag: 'Premium', emoji: '⚡', desc: 'Carbon fiber plate for race-day performance.' },
        ]
      : [
          { id: 1, name: 'Premium Package', price: 99, rating: 4.9, reviews: 156, tag: 'Popular', emoji: '⭐', desc: 'Complete solution with all features included.' },
          { id: 2, name: 'Starter Kit', price: 49, rating: 4.7, reviews: 234, tag: 'Value', emoji: '📦', desc: 'Everything you need to get started.' },
          { id: 3, name: 'Pro Edition', price: 149, rating: 4.8, reviews: 189, tag: 'Advanced', emoji: '🚀', desc: 'Advanced features for power users.' },
          { id: 4, name: 'Team Plan', price: 299, rating: 4.9, reviews: 98, tag: 'Enterprise', emoji: '👥', desc: 'Collaborate with your entire team.' },
        ];

    return `<section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black mb-8">Featured Collection</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${products.map(p => `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition group cursor-pointer">
              <div className="h-48 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-6xl group-hover:scale-105 transition">${p.emoji}</div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-${d.colorScheme.primary}-400 bg-${d.colorScheme.primary}-500/10 px-2 py-0.5 rounded-full">${p.tag}</span>
                  <span className="text-xs text-zinc-500">${p.rating} (${p.reviews})</span>
                </div>
                <h3 className="font-bold text-lg">${p.name}</h3>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">${p.desc}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xl font-black text-${d.colorScheme.primary}-400">$${p.price}</span>
                  <button className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-${d.colorScheme.primary}-600 text-sm font-bold transition">Add to Cart</button>
                </div>
              </div>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeCategories(d: ArchitectDecision): string {
    const categories = d.subDomains.includes('ecommerce')
      ? ['Running', 'Lifestyle', 'Outdoor', 'Premium']
      : d.subDomains.includes('tea')
      ? ['Green', 'Black', 'Herbal', 'Oolong', 'Matcha']
      : ['Category 1', 'Category 2', 'Category 3', 'Category 4'];

    return `<section className="px-6 pb-12">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4 justify-center text-sm">
          ${categories.map(cat => `<div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800"><span className="text-zinc-400">${cat}</span></div>`).join('\n          ')}
        </div>
      </section>`;
  }

  private synthesizeTestimonials(d: ArchitectDecision): string {
    const testimonials = d.subDomains.includes('martialarts')
      ? [
          { name: 'Marcus J.', rating: 5, text: 'After 6 months of training, I lost 30 lbs and gained incredible confidence. The instructors truly care about each student.' },
          { name: 'Sarah K.', rating: 5, text: 'My kids love the youth program. They have learned discipline and respect while having a blast.' },
          { name: 'David R.', rating: 5, text: 'Best martial arts academy in the city. The facility is top-notch and the community is welcoming.' },
        ]
      : d.subDomains.includes('tea')
      ? [
          { name: 'Emily W.', rating: 5, text: 'The Dragon Well Green is the best green tea I have ever tasted. The quality is unmatched.' },
          { name: 'Michael T.', rating: 5, text: 'I switched from coffee to matcha and my energy levels are more stable throughout the day.' },
          { name: 'Lisa M.', rating: 5, text: 'Beautiful packaging, fast shipping, and the tea is incredibly fresh. A customer for life.' },
        ]
      : [
          { name: 'Sarah M.', rating: 5, text: 'Absolutely love this product! The quality exceeded my expectations.' },
          { name: 'Mike R.', rating: 5, text: 'Fast shipping and amazing customer service. Will definitely order again.' },
          { name: 'Emily K.', rating: 5, text: 'Best purchase I have made this year. Highly recommended to everyone.' },
        ];

    return `<section className="px-6 pb-20 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black mb-8 text-center">What Customers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${testimonials.map(t => `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-1 mb-3">${'★'.repeat(t.rating)}</div>
              <p className="text-sm text-zinc-400 mb-4">${t.text}</p>
              <span className="text-sm font-bold">${t.name}</span>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeNewsletter(d: ArchitectDecision): string {
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

  private synthesizeFeatures(d: ArchitectDecision): string {
    const features = d.subDomains.includes('martialarts')
      ? [
          { icon: '🥊', title: 'Expert Instruction', desc: 'Learn from black belt instructors with decades of experience in multiple martial arts disciplines.' },
          { icon: '🏋️', title: 'All Skill Levels', desc: 'Programs for beginners to advanced fighters. Everyone is welcome on the mat.' },
          { icon: '🏆', title: 'Competition Ready', desc: 'Optional competition training for students who want to test their skills in tournaments.' },
          { icon: '🧘', title: 'Mind & Body', desc: 'Develop mental focus, discipline, and physical strength through structured training.' },
          { icon: '👥', title: 'Community', desc: 'Join a supportive family of martial artists who train, grow, and succeed together.' },
          { icon: '📅', title: 'Flexible Schedule', desc: 'Morning, afternoon, and evening classes. Train on your schedule.' },
        ]
      : d.subDomains.includes('tea')
      ? [
          { icon: '🌱', title: '100% Organic', desc: 'Every tea is certified organic, sourced directly from sustainable farms worldwide.' },
          { icon: '🫖', title: 'Freshly Packed', desc: 'Tea is packed within 24 hours of order to lock in flavor and aroma.' },
          { icon: '🌍', title: 'Global Sourcing', desc: 'Direct relationships with farms in Japan, China, India, and Sri Lanka.' },
          { icon: '📚', title: 'Brewing Guides', desc: 'Detailed instructions for each tea type to ensure the perfect cup every time.' },
          { icon: '🎁', title: 'Gift Sets', desc: 'Curated tea collections in premium packaging. Perfect for any occasion.' },
          { icon: '🔄', title: 'Subscribe & Save', desc: 'Monthly tea deliveries at 15% off. Cancel anytime.' },
        ]
      : [
          { icon: '⚡', title: 'Lightning Fast', desc: 'Optimized performance that loads in milliseconds. No compromises on speed.' },
          { icon: '🔒', title: 'Enterprise Security', desc: 'Bank-level encryption and security protocols to keep your data safe.' },
          { icon: '📱', title: 'Mobile First', desc: 'Responsive design that works beautifully on every device and screen size.' },
          { icon: '🎨', title: 'Beautiful Design', desc: 'Crafted with attention to every pixel. Design that converts and delights.' },
          { icon: '🔧', title: 'Easy Setup', desc: 'Get started in minutes with our intuitive onboarding process.' },
          { icon: '💬', title: '24/7 Support', desc: 'Our team is always here to help you succeed. Chat, email, or phone.' },
        ];

    return `<section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Why Choose ${d.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${features.map(f => `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition">
              <div className="text-3xl mb-3">${f.icon}</div>
              <h3 className="font-bold text-lg">${f.title}</h3>
              <p className="text-sm text-zinc-400 mt-2">${f.desc}</p>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizePricing(d: ArchitectDecision): string {
    const plans = d.subDomains.includes('fitness')
      ? [
          { name: 'Starter', price: 29, features: ['Gym Access', '2 Classes/week', 'Locker Room', 'Basic Tracking'], popular: false },
          { name: 'Pro', price: 59, features: ['Unlimited Access', 'All Classes', 'Personal Trainer', 'Nutrition Plan', 'Priority Booking'], popular: true },
          { name: 'Elite', price: 99, features: ['Everything in Pro', 'Private Sessions', 'Recovery Suite', 'VIP Events', 'Guest Passes'], popular: false },
        ]
      : d.subDomains.includes('education')
      ? [
          { name: 'Basic', price: 19, features: ['5 Courses', 'Community Access', 'Certificate'], popular: false },
          { name: 'Pro', price: 49, features: ['Unlimited Courses', 'Mentorship', 'Projects', 'Career Support'], popular: true },
          { name: 'Team', price: 99, features: ['Everything in Pro', 'Team Dashboard', 'Admin Controls', 'SSO'], popular: false },
        ]
      : [
          { name: 'Starter', price: 9, features: ['1 Project', '1GB Storage', 'Email Support'], popular: false },
          { name: 'Pro', price: 29, features: ['Unlimited Projects', '100GB Storage', 'Priority Support', 'API Access'], popular: true },
          { name: 'Enterprise', price: 99, features: ['Everything in Pro', 'SSO', 'SLA', 'Dedicated Manager'], popular: false },
        ];

    return `<section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Simple Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${plans.map(p => `<div className="rounded-2xl p-6 border ${p.popular ? 'bg-zinc-900 border-' + d.colorScheme.primary + '-500 ring-1 ring-' + d.colorScheme.primary + '-500/20' : 'bg-zinc-900 border-zinc-800'}">
              ${p.popular ? `<div className="text-xs font-bold text-${d.colorScheme.primary}-400 mb-3">Most Popular</div>` : ''}
              <h3 className="font-black text-xl">${p.name}</h3>
              <div className="text-4xl font-black mt-2">$${p.price}<span className="text-sm font-normal text-zinc-500">/mo</span></div>
              <ul className="mt-6 space-y-3">
                ${p.features.map(f => `<li className="flex items-center gap-2 text-sm text-zinc-400"><span className="text-emerald-400">✓</span>${f}</li>`).join('\n                ')}
              </ul>
              <button className="w-full mt-6 py-3 rounded-xl font-bold text-sm ${p.popular ? 'bg-' + d.colorScheme.primary + '-600 hover:bg-' + d.colorScheme.primary + '-700 text-white' : 'bg-zinc-800 hover:bg-zinc-700'} transition">Get Started</button>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeFAQ(d: ArchitectDecision): string {
    const faqs = [
      { q: 'How do I get started?', a: 'Simply sign up for an account and follow our quick onboarding process. You will be up and running in minutes.' },
      { q: 'Can I change plans later?', a: 'Yes! Upgrade or downgrade at any time. Changes take effect immediately with prorated billing.' },
      { q: 'Do you offer refunds?', a: 'We offer a 30-day money-back guarantee on all plans. No questions asked.' },
      { q: 'Is there a free trial?', a: 'Yes, all plans come with a 14-day free trial. No credit card required.' },
    ];

    return `<section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-3">
            ${faqs.map(f => `<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="font-bold text-sm">${f.q}</h3>
              <p className="text-sm text-zinc-400 mt-2">${f.a}</p>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeServices(d: ArchitectDecision): string {
    const services = d.subDomains.includes('martialarts')
      ? [
          { name: 'Brazilian Jiu-Jitsu', desc: 'Grappling and submission techniques for all levels', price: '$89/mo', duration: '60 min' },
          { name: 'Muay Thai', desc: 'Striking art using fists, elbows, knees, and shins', price: '$89/mo', duration: '60 min' },
          { name: 'Karate', desc: 'Traditional striking art emphasizing discipline and form', price: '$79/mo', duration: '45 min' },
          { name: 'Kids Program', desc: 'Age-appropriate martial arts training for children 5-12', price: '$59/mo', duration: '45 min' },
        ]
      : [
          { name: 'Consultation', desc: 'Free initial assessment and personalized plan', price: '$0', duration: '30 min' },
          { name: 'Standard Service', desc: 'Complete service with premium quality', price: '$199', duration: '2 hours' },
          { name: 'Premium Package', desc: 'VIP treatment with dedicated specialist', price: '$399', duration: '4 hours' },
          { name: 'Maintenance Plan', desc: 'Regular upkeep to keep everything optimal', price: '$99/mo', duration: '1 hour' },
        ];

    return `<section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Our Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            ${services.map(s => `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition">
              <h3 className="font-bold text-xl">${s.name}</h3>
              <p className="text-sm text-zinc-400 mt-1 mb-3">${s.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">${s.duration}</span>
                <span className="text-2xl font-black text-${d.colorScheme.primary}-400">${s.price}</span>
              </div>
              <button className="w-full mt-4 py-3 rounded-xl bg-${d.colorScheme.primary}-600 hover:bg-${d.colorScheme.primary}-700 font-bold text-sm transition">Book Now</button>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeTeam(d: ArchitectDecision): string {
    const team = d.subDomains.includes('healthcare')
      ? [
          { name: 'Dr. Sarah Chen', role: 'Cardiology', exp: '15 years' },
          { name: 'Dr. James Wilson', role: 'Neurology', exp: '12 years' },
          { name: 'Dr. Emily Park', role: 'Pediatrics', exp: '10 years' },
          { name: 'Dr. Michael Brown', role: 'Orthopedics', exp: '18 years' },
        ]
      : d.subDomains.includes('martialarts')
      ? [
          { name: 'Sensei Tanaka', role: 'Head Instructor', exp: '25 years, 7th Dan' },
          { name: 'Coach Marcus', role: 'Muay Thai', exp: '15 years, former champion' },
          { name: 'Prof. Silva', role: 'BJJ', exp: '20 years, Black Belt' },
          { name: 'Coach Kim', role: 'Karate', exp: '18 years, 6th Dan' },
        ]
      : [
          { name: 'Alex Rivera', role: 'Founder & CEO', exp: '15 years' },
          { name: 'Sarah Kim', role: 'Head of Design', exp: '10 years' },
          { name: 'James Chen', role: 'Lead Engineer', exp: '12 years' },
          { name: 'Maya Patel', role: 'Head of Growth', exp: '8 years' },
        ];

    return `<section className="px-6 pb-20 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-black mb-8 text-center">Meet Our Team</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${team.map(t => `<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center hover:border-zinc-700 transition">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold mx-auto mb-3">${t.name.split(' ').map(n => n[0]).join('')}</div>
              <h3 className="font-bold">${t.name}</h3>
              <p className="text-sm text-${d.colorScheme.primary}-400">${t.role}</p>
              <p className="text-xs text-zinc-500 mt-1">${t.exp}</p>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeClassSchedule(d: ArchitectDecision): string {
    const classes = [
      { name: 'Morning HIIT', time: '6:00 AM', trainer: 'Coach Marcus', spots: 4, intensity: 'High' },
      { name: 'Yoga Flow', time: '8:00 AM', trainer: 'Sarah K.', spots: 8, intensity: 'Medium' },
      { name: 'Strength Training', time: '10:00 AM', trainer: 'Alex T.', spots: 6, intensity: 'High' },
      { name: 'Boxing Basics', time: '4:00 PM', trainer: 'Coach Marcus', spots: 10, intensity: 'Medium' },
      { name: 'BJJ Fundamentals', time: '6:00 PM', trainer: 'Prof. Silva', spots: 8, intensity: 'Medium' },
      { name: 'Recovery & Stretch', time: '7:30 PM', trainer: 'Sarah K.', spots: 12, intensity: 'Low' },
    ];

    return `<section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-black mb-8">Today&apos;s Classes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${classes.map(c => `<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full ${c.intensity === 'High' ? 'bg-red-500/10 text-red-400' : c.intensity === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}">${c.intensity}</span>
                <span className="text-xs text-zinc-500">${c.spots} spots left</span>
              </div>
              <h3 className="font-bold text-lg">${c.name}</h3>
              <p className="text-sm text-zinc-500 mt-1">${c.time} · ${c.trainer}</p>
              <button className="w-full mt-4 py-2 rounded-lg bg-zinc-800 hover:bg-${d.colorScheme.primary}-600 text-sm font-bold transition">Book Spot</button>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeTrainers(d: ArchitectDecision): string {
    return this.synthesizeTeam(d);
  }

  private synthesizeMembership(d: ArchitectDecision): string {
    return this.synthesizePricing(d);
  }

  private synthesizeCourses(d: ArchitectDecision): string {
    return this.synthesizeProductGrid(d);
  }

  private synthesizeMenu(d: ArchitectDecision): string {
    return this.synthesizeProductGrid(d);
  }

  private synthesizeGallery(d: ArchitectDecision): string {
    return `<section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-black mb-8 text-center">Our Space</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            ${[1,2,3,4,5,6].map(i => `<div className="aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl flex items-center justify-center text-4xl hover:border-zinc-700 transition cursor-pointer">📸</div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeProjects(d: ArchitectDecision): string {
    return this.synthesizeProductGrid(d);
  }

  private synthesizeCaseStudies(d: ArchitectDecision): string {
    const cases = [
      { title: 'E-Commerce Revamp', client: 'RetailPro', result: '340% Revenue Increase', desc: 'Rebuilt platform with Next.js. Load times dropped 60%, conversion doubled.' },
      { title: 'SaaS Dashboard', client: 'DataPulse', result: '50K Users in 3 Months', desc: 'Designed and developed analytics dashboard from zero to launch.' },
      { title: 'Mobile Banking', client: 'FinFlow', result: '4.8 App Store Rating', desc: 'Built mobile banking app serving 200K+ users with zero downtime.' },
    ];

    return `<section className="px-6 pb-20 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-black mb-8">Case Studies</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${cases.map(c => `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition">
              <div className="text-xs text-zinc-500 mb-2">${c.client}</div>
              <h3 className="font-bold text-xl mb-1">${c.title}</h3>
              <div className="text-lg font-black text-emerald-400 mb-3">${c.result}</div>
              <p className="text-sm text-zinc-400">${c.desc}</p>
            </div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeClients(d: ArchitectDecision): string {
    const clients = ['TechCorp', 'FinanceHub', 'HealthPlus', 'EduLearn', 'RetailPro', 'CloudBase'];
    return `<section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-8">Trusted By</h2>
          <div className="flex flex-wrap justify-center gap-4">
            ${clients.map(c => `<div className="px-6 py-4 rounded-xl bg-zinc-900 border border-zinc-800 font-bold text-zinc-500">${c}</div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeCTA(d: ArchitectDecision): string {
    return `<section className="px-6 pb-20">
        <div className="max-w-xl mx-auto text-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <h2 className="text-xl font-black mb-3">Ready to Get Started?</h2>
          <p className="text-sm text-zinc-500 mb-6">Join thousands of satisfied customers. Start your journey today.</p>
          <button className="px-8 py-4 rounded-xl bg-${d.colorScheme.primary}-600 hover:bg-${d.colorScheme.primary}-700 font-bold transition">Get Started Now</button>
        </div>
      </section>`;
  }

  private synthesizeContactForm(d: ArchitectDecision): string {
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

  private synthesizeContactInfo(d: ArchitectDecision): string {
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

  private synthesizeFilterBar(d: ArchitectDecision): string {
    const categories = d.subDomains.includes('ecommerce')
      ? ['All', 'Running', 'Lifestyle', 'Outdoor', 'Premium']
      : d.subDomains.includes('tea')
      ? ['All', 'Green', 'Black', 'Herbal', 'Oolong']
      : ['All', 'Category 1', 'Category 2', 'Category 3'];

    return `<section className="px-6 pb-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            ${categories.map((cat, i) => `<button className="px-3 py-1.5 rounded-lg text-xs font-bold transition ${i === 0 ? 'bg-' + d.colorScheme.primary + '-600 text-white' : 'text-zinc-400 hover:text-white'}">${cat}</button>`).join('\n          ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeSkills(d: ArchitectDecision): string {
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

  private synthesizeGenericSection(section: string, d: ArchitectDecision): string {
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
}
