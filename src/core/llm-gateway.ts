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
      case 'gemini': return 'gemini-2.5-flash';
      case 'openai':
      default: return 'gpt-4o';
    }
  }

  public async generatePatches(context: LLMContext): Promise<ASTPatch[]> {
    const decision = this.architect.designArchitecture(context.prompt);
    const architecturePrompt = this.architect.buildArchitecturePrompt(decision);

    if (!this.apiKey || this.apiKey.trim() === '') {
      console.log(`[gateway] No API key. Falling back to JIT synthesis.`);
      return this.synthesizeFallback(decision, context);
    }

    const systemPrompt = this.buildSystemPrompt(architecturePrompt);
    const userPrompt = this.buildUserPrompt(context);

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`[gateway] LLM call: ${this.provider}/${this.model} (attempt ${attempt})`);
        const patches = await this.callProvider(systemPrompt, userPrompt);
        console.log(`[gateway] Received ${patches.length} patches`);
        return patches;
      } catch (err: any) {
        const isTransient = this.isTransientError(err);
        const delay = isTransient ? RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) : 0;

        if (attempt < RETRY_ATTEMPTS && isTransient) {
          console.log(`[gateway] Transient error (${err.message}). Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        console.log(`[gateway] LLM failed: ${err.message}. Falling back to JIT synthesis.`);
        return this.synthesizeFallback(decision, context);
      }
    }

    return this.synthesizeFallback(decision, context);
  }

  /**
   * Single-call optimization: generates ALL patches for ALL pages in one LLM call.
   * Returns a Map keyed by target file path for efficient per-page splitting.
   */
  public async generateAllPatchesCombined(
    prompt: string,
    pagePrompts: Array<{ pagePath: string; targetFile: string; prompt: string }>
  ): Promise<Map<string, ASTPatch[]>> {
    const decision = this.architect.designArchitecture(prompt);
    const architecturePrompt = this.architect.buildArchitecturePrompt(decision);

    const patchMap = new Map<string, ASTPatch[]>();

    if (!this.apiKey || this.apiKey.trim() === '') {
      console.log(`[gateway] No API key. Falling back to JIT synthesis for combined call.`);
      const allPatches = this.synthesizeFallback(decision, { prompt, attempt: 0, changedFiles: [], errors: [] });
      for (const patch of allPatches) {
        const existing = patchMap.get(patch.targetFile) || [];
        existing.push(patch);
        patchMap.set(patch.targetFile, existing);
      }
      return patchMap;
    }

    const pageList = pagePrompts.map((pp, i) =>
      `Page ${i + 1}: ${pp.pagePath} → target: ${pp.targetFile}\n${pp.prompt}`
    ).join('\n\n');

    const combinedUserPrompt = `User Directive: "${prompt}"

Generate COMPLETE ASTPatch arrays for ALL of the following pages in a SINGLE JSON array.
Each patch must have the correct targetFile path for its page.

Pages to generate:
${pageList}

IMPORTANT:
- Return ONE JSON array containing patches for ALL pages
- Each page's patches must target the correct targetFile
- Include component patches (src/components/*.tsx) as separate entries
- Each page component must be a complete, self-contained React component with Tailwind CSS
- Do NOT include import statements in codeBlock
- Every interactive element must have onClick/handlers

Active Attempt Loop: 0`;

    const systemPrompt = this.buildSystemPrompt(architecturePrompt);

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`[gateway] Combined LLM call: ${this.provider}/${this.model} (attempt ${attempt}) — ${pagePrompts.length} pages`);
        const allPatches = await this.callProvider(systemPrompt, combinedUserPrompt);
        console.log(`[gateway] Received ${allPatches.length} total patches for ${pagePrompts.length} pages`);

        for (const patch of allPatches) {
          const existing = patchMap.get(patch.targetFile) || [];
          existing.push(patch);
          patchMap.set(patch.targetFile, existing);
        }
        return patchMap;
      } catch (err: any) {
        const isTransient = this.isTransientError(err);
        const delay = isTransient ? RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) : 0;

        if (attempt < RETRY_ATTEMPTS && isTransient) {
          console.log(`[gateway] Transient error (${err.message}). Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        console.log(`[gateway] Combined LLM failed: ${err.message}. Falling back to JIT synthesis.`);
        const allPatches = this.synthesizeFallback(decision, { prompt, attempt: 0, changedFiles: [], errors: [] });
        for (const patch of allPatches) {
          const existing = patchMap.get(patch.targetFile) || [];
          existing.push(patch);
          patchMap.set(patch.targetFile, existing);
        }
        return patchMap;
      }
    }

    return patchMap;
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
          maxOutputTokens: 65536,
          thinkingConfig: { thinkingBudget: 0 }
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
    let cleaned = rawJson.trim();

    try {
      const data = JSON.parse(cleaned);
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
    } catch (parseError) {
      cleaned = cleaned.replace(/[\u0000-\u001f]/g, ' ').replace(/\\[^"\\\/bfnrtu]/g, (match) => match[1] === 'n' ? match : (match[1] || ''));
      try {
        const data = JSON.parse(cleaned);
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
      } catch {
        const jsonMatch = rawJson.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[0]);
            return data.map((p: any) => {
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
          } catch {}
        }
        throw parseError;
      }
    }
  }

  // ─── JIT Synthesis Fallback ────────────────────────────────────
  // Generates deterministic but architecturally sound code from the
  // ArchitectAgent decision — no hardcoded templates, just composition.
  // This is the explicit degraded mode for when no API key is configured.
  // All content is generic — no domain-specific branches. The LLM handles domain specificity.

  private synthesizeFallback(decision: ArchitectDecision, context: LLMContext): ASTPatch[] {
    console.log(`[gateway] JIT synthesis: ${decision.capabilities?.join(',') || decision.businessType}, ${decision.pages.length} pages`);

    const patches: ASTPatch[] = [];

    for (const page of decision.pages) {
      patches.push(this.synthesizePage(page, decision));
    }

    return patches;
  }

  private synthesizePage(page: import('../generation/architect.js').PageDesign, decision: ArchitectDecision): ASTPatch {
    const sections = page.sections.map(s => this.synthesizeSection(s, decision)).join('\n\n');

    const componentName = page.route === '/' ? 'Home' : page.name.replace(/\s+/g, '');
    const filePath = page.route === '/' ? 'src/app/page.tsx' : `src/app${page.route}/page.tsx`;

    const ctaText = page.type === 'shop' ? 'View Collection'
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
    switch (section) {
      case 'hero': return this.synthesizeHero(decision);
      case 'stats-bar': return this.synthesizeStatsBar(decision);
      case 'featured-products':
      case 'product-grid': return this.synthesizeProductGrid(decision);
      case 'categories': return this.synthesizeCategories(decision);
      case 'testimonials': return this.synthesizeTestimonials(decision);
      case 'newsletter-cta': return this.synthesizeNewsletter(decision);
      case 'features-grid':
      case 'features': return this.synthesizeFeatures(decision);
      case 'pricing-table': return this.synthesizePricing(decision);
      case 'faq': return this.synthesizeFAQ(decision);
      case 'services':
      case 'services-grid': return this.synthesizeServices(decision);
      case 'team/doctors':
      case 'team': return this.synthesizeTeam(decision);
      case 'class-schedule': return this.synthesizeClassSchedule(decision);
      case 'trainers': return this.synthesizeTeam(decision);
      case 'membership-plans': return this.synthesizePricing(decision);
      case 'course-featured': return this.synthesizeProductGrid(decision);
      case 'menu-highlights': return this.synthesizeProductGrid(decision);
      case 'gallery': return this.synthesizeGallery(decision);
      case 'featured-projects': return this.synthesizeProductGrid(decision);
      case 'caseStudies': return this.synthesizeCaseStudies(decision);
      case 'clients': return this.synthesizeClients(decision);
      case 'cta': return this.synthesizeCTA(decision);
      case 'contact-form': return this.synthesizeContactForm(decision);
      case 'contact-info': return this.synthesizeContactInfo(decision);
      case 'filter-bar': return this.synthesizeFilterBar(decision);
      case 'skills': return this.synthesizeSkills(decision);
      default: return this.synthesizeGenericSection(section, decision);
    }
  }

  private synthesizeHero(d: ArchitectDecision): string {
    const caps = d.capabilities || [d.businessType];
    const hasEcommerce = caps.some(c => ['commerce', 'marketplace', 'catalog', 'food-beverage'].includes(c));
    const hasBooking = caps.some(c => ['booking', 'healthcare-clinic', 'fitness-wellness'].includes(c));
    const hasEducation = caps.includes('education');
    const hasContent = caps.includes('content');

    const badgeText = hasEcommerce ? 'Explore Our Collection'
      : hasBooking ? 'Book Your Appointment'
      : hasEducation ? 'Start Learning Today'
      : hasContent ? 'Fresh Insights'
      : 'Welcome';

    const headline = hasEcommerce ? `Discover What ${d.name} Offers`
      : hasBooking ? `Book With ${d.name}`
      : hasEducation ? `Learn With ${d.name}`
      : hasContent ? `Insights From ${d.name}`
      : `Welcome to ${d.name}`;

    const subtitle = hasEcommerce ? 'Quality products curated for you. Browse our collection and find what you love.'
      : hasBooking ? 'Easy online booking. Schedule your appointment in just a few clicks.'
      : hasEducation ? 'Expert-led content to help you grow. Join our community today.'
      : hasContent ? 'Stay informed with our latest articles, guides, and resources.'
      : `Everything you need, all in one place.`;

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
    const stats = [
      { v: '1,000+', l: 'Happy Customers' },
      { v: '50+', l: 'Products' },
      { v: '4.9', l: 'Average Rating' },
      { v: '24/7', l: 'Support' },
    ];

    return `<section className="px-6 pb-12">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          ${stats.map(s => `<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-2xl font-black text-${d.colorScheme.primary}-400">${s.v}</div><div className="text-xs text-zinc-500">${s.l}</div></div>`).join('\n          ')}
        </div>
      </section>`;
  }

  private synthesizeProductGrid(d: ArchitectDecision): string {
    const products = [
      { id: 1, name: 'Premium Option', price: 99, rating: 4.9, reviews: 156, tag: 'Popular', emoji: '⭐', desc: 'Our most popular choice. Complete with all features.' },
      { id: 2, name: 'Essential Choice', price: 49, rating: 4.7, reviews: 234, tag: 'Value', emoji: '📦', desc: 'Everything you need to get started at a great price.' },
      { id: 3, name: 'Pro Edition', price: 149, rating: 4.8, reviews: 189, tag: 'Advanced', emoji: '🚀', desc: 'Advanced features for power users and teams.' },
      { id: 4, name: 'Team Plan', price: 299, rating: 4.9, reviews: 98, tag: 'Enterprise', emoji: '👥', desc: 'Collaborate with your entire team. Scale as you grow.' },
    ];

    return `<section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-black mb-8">Featured Collection</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
    const categories = ['Featured', 'Popular', 'New Arrivals', 'Best Sellers'];

    return `<section className="px-6 pb-12">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4 justify-center text-sm">
          ${categories.map(cat => `<div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800"><span className="text-zinc-400">${cat}</span></div>`).join('\n          ')}
        </div>
      </section>`;
  }

  private synthesizeTestimonials(d: ArchitectDecision): string {
    const testimonials = [
      { name: 'Alex M.', rating: 5, text: 'Absolutely love this! The quality exceeded my expectations. Highly recommend to everyone.' },
      { name: 'Jordan K.', rating: 5, text: 'Fast, reliable, and amazing customer service. Will definitely be coming back.' },
      { name: 'Sam R.', rating: 5, text: 'Best decision I have made this year. The value is unmatched. Five stars!' },
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
    const features = [
      { icon: '⚡', title: 'Lightning Fast', desc: 'Optimized performance that delivers results in milliseconds.' },
      { icon: '🔒', title: 'Secure & Reliable', desc: 'Enterprise-grade security to keep your data safe.' },
      { icon: '📱', title: 'Works Everywhere', desc: 'Responsive design that works beautifully on any device.' },
      { icon: '🎨', title: 'Beautiful Design', desc: 'Crafted with attention to every detail. Design that converts.' },
      { icon: '🔧', title: 'Easy to Use', desc: 'Get started in minutes with our intuitive experience.' },
      { icon: '💬', title: '24/7 Support', desc: 'Our team is always here to help you succeed.' },
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
    const plans = [
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
      { q: 'How do I get started?', a: 'Simply sign up and follow our quick onboarding process. You will be up and running in minutes.' },
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
    const services = [
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
    const team = [
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
      { name: 'Session A', time: '9:00 AM', trainer: 'Lead Instructor', spots: 8, intensity: 'High' },
      { name: 'Session B', time: '11:00 AM', trainer: 'Specialist', spots: 12, intensity: 'Medium' },
      { name: 'Session C', time: '2:00 PM', trainer: 'Coach', spots: 10, intensity: 'Medium' },
      { name: 'Session D', time: '4:00 PM', trainer: 'Lead Instructor', spots: 6, intensity: 'High' },
      { name: 'Session E', time: '6:00 PM', trainer: 'Specialist', spots: 14, intensity: 'Low' },
    ];

    return `<section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-black mb-8">Schedule</h2>
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

  private synthesizeGallery(d: ArchitectDecision): string {
    return `<section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-black mb-8 text-center">Gallery</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            ${[1,2,3,4,5,6].map(i => `<div className="aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl flex items-center justify-center text-4xl hover:border-zinc-700 transition cursor-pointer">📸</div>`).join('\n            ')}
          </div>
        </div>
      </section>`;
  }

  private synthesizeCaseStudies(d: ArchitectDecision): string {
    const cases = [
      { title: 'Project Alpha', client: 'Client Corp', result: '340% Improvement', desc: 'Complete overhaul that delivered measurable results.' },
      { title: 'Project Beta', client: 'Startup Inc', result: '50K Users in 3 Months', desc: 'Built from zero to launch with rapid iteration.' },
      { title: 'Project Gamma', client: 'Enterprise Co', result: '4.8 Rating', desc: 'Scaled to serve 200K+ users with zero downtime.' },
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
    const clients = ['Client Alpha', 'Client Beta', 'Client Gamma', 'Client Delta', 'Client Epsilon', 'Client Zeta'];
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
    const categories = ['All', 'Featured', 'Popular', 'New'];

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
