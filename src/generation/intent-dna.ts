// ─── IntentDNA ───────────────────────────────────────────────────
// Structured intent extraction from user prompts.
// Captures business domain, platform target, core features,
// entities, workflows, and data requirements in a single object
// that drives all downstream generation decisions.

import { LLMGateway } from '../core/llm-gateway.js';

export interface IntentDNA {
  // Core identity
  business_domain: string;          // "saas", "ecommerce", "restaurant", "fitness", etc.
  app_name: string;                 // extracted or generated name
  app_tagline: string;              // one-line description

  // Platform
  platform_target: 'web' | 'mobile' | 'both';
  framework: string;                // "nextjs", "react", "vue", etc.
  styling: string;                  // "tailwind", "css-modules", "styled-components", etc.

  // Features — explicit list extracted from prompt
  features: FeatureSpec[];

  // Entities — domain objects the app deals with
  entities: EntitySpec[];

  // Workflows — user journeys / processes
  workflows: WorkflowSpec[];

  // Data requirements
  tables: TableSpec[];

  // UI sections — what sections the page(s) need
  ui_sections: UISectionSpec[];

  // Design intent
  design_style: string;             // "minimal", "bold", "corporate", "playful", etc.
  color_palette: string[];          // extracted or generated colors
  typography: string;               // "sans-serif", "serif", "mixed", etc.

  // Quality signals
  confidence: number;               // 0-1, how confident we are in the extraction
  missing_info: string[];           // what we had to guess about
}

export interface FeatureSpec {
  name: string;                     // "hero", "pricing", "contact", "auth", etc.
  type: 'ui_section' | 'functional' | 'integration' | 'interactive';
  priority: 'must_have' | 'should_have' | 'nice_to_have';
  description: string;
  interactive: boolean;             // does it need user input / state?
  component_type: string;           // "static", "form", "widget", "dashboard", "list", "grid"
}

export interface EntitySpec {
  name: string;                     // "User", "Product", "Order", etc.
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'reference';
    required: boolean;
  }>;
  relationships: string[];          // "has_many_orders", "belongs_to_user", etc.
}

export interface WorkflowSpec {
  name: string;                     // "signup", "checkout", "content_generation"
  steps: string[];
  triggers: string;                 // what initiates this workflow
  outputs: string[];                // what gets created/changed
}

export interface TableSpec {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    primary: boolean;
    foreign_key?: string;
  }>;
}

export interface UISectionSpec {
  id: string;
  type: string;                     // "hero", "features", "pricing", "testimonials", "cta", "footer", "nav"
  has_form: boolean;
  has_interactive: boolean;
  content_strategy: string;         // "static", "dynamic", "user_generated", "api_driven"
  data_sources: string[];           // where the content comes from
}

// ─── Extraction Engine ───────────────────────────────────────────

const INTENT_EXTRACTION_PROMPT = `You are an expert application architect. Analyze the user's prompt and extract a structured IntentDNA object.

For EACH field, reason carefully about what the user actually needs. Do NOT assume — if something is ambiguous, list it in missing_info.

Return ONLY valid JSON matching this schema:
{
  "business_domain": "string — saas|ecommerce|restaurant|fitness|healthcare|portfolio|agency|education|blog|news|law|travel|booking|real_estate|other",
  "app_name": "string — a fitting brand name for this type of app",
  "app_tagline": "string — one-line value proposition",
  "platform_target": "web|mobile|both",
  "framework": "nextjs|react|vue|svelte",
  "styling": "tailwind|css-modules|styled-components",
  "features": [
    {
      "name": "string",
      "type": "ui_section|functional|integration|interactive",
      "priority": "must_have|should_have|nice_to_have",
      "description": "string",
      "interactive": true|false,
      "component_type": "static|form|widget|dashboard|list|grid"
    }
  ],
  "entities": [
    {
      "name": "string",
      "fields": [{"name": "string", "type": "string|number|boolean|date|enum|reference", "required": true|false}],
      "relationships": ["string"]
    }
  ],
  "workflows": [
    {
      "name": "string",
      "steps": ["string"],
      "triggers": "string",
      "outputs": ["string"]
    }
  ],
  "tables": [
    {
      "name": "string",
      "columns": [{"name": "string", "type": "string", "primary": true|false, "foreign_key": "string|undefined"}]
    }
  ],
  "ui_sections": [
    {
      "id": "string",
      "type": "string",
      "has_form": true|false,
      "has_interactive": true|false,
      "content_strategy": "static|dynamic|user_generated|api_driven",
      "data_sources": ["string"]
    }
  ],
  "design_style": "string — minimal|bold|corporate|playful|luxury|technical|warm",
  "color_palette": ["string — hex colors"],
  "typography": "string — sans-serif|serif|mixed",
  "confidence": 0.0-1.0,
  "missing_info": ["string — what you had to guess about"]
}

Rules:
- If the user says "SaaS landing page", business_domain = "saas", features MUST include hero, features, pricing, testimonials, cta, footer, nav
- If the user mentions "contact", add a contact form feature with has_form=true
- If the user mentions "dashboard", add a dashboard feature with component_type="dashboard"
- If the user mentions "auth", "login", "signup" — add auth feature and User entity
- If the user mentions "pricing", "plans", "subscription" — add pricing feature and Billing entity
- If the prompt is vague, set confidence < 0.5 and list what you guessed in missing_info
- Always include nav and footer as must_have features
- For interactive features, set interactive=true and component_type appropriately
- Extract entities from nouns in the prompt (User, Product, Order, Post, etc.)
- Generate tables that would be needed for the entities
- Color palette: generate 5-6 colors that fit the design style
- app_name: if user didn't specify, generate a fitting name (e.g., SaaS → "Nexus", Restaurant → "Savora")`;

export class IntentDNAExtractor {
  private llm: LLMGateway;

  constructor(llm: LLMGateway) {
    this.llm = llm;
  }

  async extract(prompt: string): Promise<IntentDNA> {
    console.log(`[intent-dna] Extracting intent from: "${prompt.substring(0, 80)}..."`);

    let response: string;
    try {
      response = await this.llm.generateText(INTENT_EXTRACTION_PROMPT + '\n\nUser prompt: ' + prompt, {
        temperature: 0.3,
        maxTokens: 4000,
      });
    } catch (err: any) {
      console.error(`[intent-dna] LLM call failed: ${err.message} — using keyword fallback`);
      const intent = this.fallbackExtract(prompt);
      return this.validateAndFill(intent, prompt);
    }

    let intent: IntentDNA;
    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in LLM response');
      intent = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error(`[intent-dna] Failed to parse LLM response, using fallback`);
      intent = this.fallbackExtract(prompt);
    }

    // Ensure required fields
    intent = this.validateAndFill(intent, prompt);

    console.log(`[intent-dna] Extracted: domain=${intent.business_domain}, name=${intent.app_name}, features=${intent.features.length}, entities=${intent.entities.length}, confidence=${intent.confidence}`);

    return intent;
  }

  private fallbackExtract(prompt: string): IntentDNA {
    const lower = prompt.toLowerCase();

    // Detect domain
    let domain = 'other';
    if (lower.includes('saas') || lower.includes('software') || lower.includes('platform')) domain = 'saas';
    else if (lower.includes('ecommerce') || lower.includes('shop') || lower.includes('store')) domain = 'ecommerce';
    else if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('food')) domain = 'restaurant';
    else if (lower.includes('fitness') || lower.includes('gym') || lower.includes('workout')) domain = 'fitness';
    else if (lower.includes('portfolio') || lower.includes('personal')) domain = 'portfolio';
    else if (lower.includes('blog') || lower.includes('news')) domain = 'blog';

    // Detect features from prompt
    const features: FeatureSpec[] = [
      { name: 'nav', type: 'ui_section', priority: 'must_have', description: 'Navigation header', interactive: false, component_type: 'static' },
      { name: 'footer', type: 'ui_section', priority: 'must_have', description: 'Page footer', interactive: false, component_type: 'static' },
    ];

    const featureMap: Record<string, Partial<FeatureSpec>> = {
      'hero': { type: 'ui_section', priority: 'must_have', description: 'Hero section with headline and CTA', interactive: false, component_type: 'static' },
      'features': { type: 'ui_section', priority: 'must_have', description: 'Features grid', interactive: false, component_type: 'grid' },
      'pricing': { type: 'ui_section', priority: 'must_have', description: 'Pricing cards', interactive: false, component_type: 'grid' },
      'testimonials': { type: 'ui_section', priority: 'should_have', description: 'Customer testimonials', interactive: false, component_type: 'list' },
      'cta': { type: 'ui_section', priority: 'must_have', description: 'Call to action section', interactive: false, component_type: 'static' },
      'contact': { type: 'functional', priority: 'should_have', description: 'Contact form', interactive: true, component_type: 'form' },
      'auth': { type: 'functional', priority: 'nice_to_have', description: 'Authentication', interactive: true, component_type: 'form' },
      'dashboard': { type: 'functional', priority: 'nice_to_have', description: 'User dashboard', interactive: true, component_type: 'dashboard' },
    };

    for (const [key, spec] of Object.entries(featureMap)) {
      if (lower.includes(key)) {
        features.push({ name: key, ...spec } as FeatureSpec);
      }
    }

    // Always add common features for SaaS
    if (domain === 'saas') {
      const names = features.map(f => f.name);
      if (!names.includes('hero')) features.splice(1, 0, { name: 'hero', type: 'ui_section', priority: 'must_have', description: 'Hero section', interactive: false, component_type: 'static' });
      if (!names.includes('features')) features.splice(2, 0, { name: 'features', type: 'ui_section', priority: 'must_have', description: 'Features grid', interactive: false, component_type: 'grid' });
      if (!names.includes('pricing')) features.splice(3, 0, { name: 'pricing', type: 'ui_section', priority: 'must_have', description: 'Pricing cards', interactive: false, component_type: 'grid' });
      if (!names.includes('testimonials')) features.splice(4, 0, { name: 'testimonials', type: 'ui_section', priority: 'should_have', description: 'Testimonials', interactive: false, component_type: 'list' });
      if (!names.includes('cta')) features.splice(5, 0, { name: 'cta', type: 'ui_section', priority: 'must_have', description: 'CTA section', interactive: false, component_type: 'static' });
    }

    return {
      business_domain: domain,
      app_name: 'Your Brand',
      app_tagline: prompt.substring(0, 100),
      platform_target: 'web',
      framework: 'nextjs',
      styling: 'tailwind',
      features,
      entities: [],
      workflows: [],
      tables: [],
      ui_sections: features.filter(f => f.type === 'ui_section').map(f => ({
        id: f.name,
        type: f.name,
        has_form: false,
        has_interactive: false,
        content_strategy: 'static' as const,
        data_sources: [],
      })),
      design_style: 'minimal',
      color_palette: ['#6366f1', '#4f46e5', '#1e1b4b', '#f8fafc', '#18181b'],
      typography: 'sans-serif',
      confidence: 0.4,
      missing_info: ['Extracted from keyword matching — LLM extraction failed'],
    };
  }

  private validateAndFill(intent: IntentDNA, prompt: string): IntentDNA {
    // Ensure arrays exist
    intent.features = intent.features || [];
    intent.entities = intent.entities || [];
    intent.workflows = intent.workflows || [];
    intent.tables = intent.tables || [];
    intent.ui_sections = intent.ui_sections || [];
    intent.color_palette = intent.color_palette || ['#6366f1', '#4f46e5', '#1e1b4b', '#f8fafc', '#18181b'];
    intent.missing_info = intent.missing_info || [];

    // Ensure nav and footer exist
    const names = intent.features.map(f => f.name);
    if (!names.includes('nav')) {
      intent.features.unshift({ name: 'nav', type: 'ui_section', priority: 'must_have', description: 'Navigation', interactive: false, component_type: 'static' });
    }
    if (!names.includes('footer')) {
      intent.features.push({ name: 'footer', type: 'ui_section', priority: 'must_have', description: 'Footer', interactive: false, component_type: 'static' });
    }

    // Ensure ui_sections covers all features
    const sectionIds = intent.ui_sections.map(s => s.id);
    for (const feat of intent.features) {
      if (feat.type === 'ui_section' && !sectionIds.includes(feat.name)) {
        intent.ui_sections.push({
          id: feat.name,
          type: feat.name,
          has_form: feat.component_type === 'form',
          has_interactive: feat.interactive,
          content_strategy: 'static',
          data_sources: [],
        });
      }
    }

    // Ensure confidence is set
    if (typeof intent.confidence !== 'number') intent.confidence = 0.5;

    return intent;
  }
}
