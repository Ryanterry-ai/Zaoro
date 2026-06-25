// ─── Enhanced Feature Extractor ──────────────────────────────────
// Takes IntentDNA and enriches it with detailed feature specs,
// entity relationships, workflow definitions, and component
// requirements. This is the "planning brain" that turns a
// vague prompt into a precise blueprint.

import { LLMGateway } from '../core/llm-gateway.js';
import type { IntentDNA, FeatureSpec, EntitySpec, WorkflowSpec, TableSpec, UISectionSpec } from './intent-dna.js';

export interface FeatureBlueprint {
  feature: FeatureSpec;
  components: ComponentSpec[];
  props: PropSpec[];
  state: StateSpec[];
  api_endpoints: APISpec[];
  styling: StylingSpec;
}

export interface ComponentSpec {
  name: string;
  type: 'client' | 'server';
  imports: string[];
  subcomponents: string[];
  variant: string;              // "card", "grid", "form", "modal", etc.
}

export interface PropSpec {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

export interface StateSpec {
  name: string;
  type: string;
  initial: string;
  description: string;
}

export interface APISpec {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  request_body?: Record<string, string>;
  response_body?: Record<string, string>;
}

export interface StylingSpec {
  layout: string;               // "flex", "grid", "stack"
  spacing: string;              // "tight", "normal", "spacious"
  colors: string;               // "primary", "accent", "muted"
  responsive: string[];         // ["mobile", "tablet", "desktop"]
}

export interface EnrichedIntent {
  intent: IntentDNA;
  blueprints: FeatureBlueprint[];
  page_structure: PageStructureSpec[];
  global_styles: GlobalStyleSpec;
  interaction_map: InteractionSpec[];
}

export interface PageStructureSpec {
  page: string;
  route: string;
  sections: string[];
  layout: string;
}

export interface GlobalStyleSpec {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background: string;
  text_color: string;
  border_radius: string;
  font_family: string;
  font_sizes: Record<string, string>;
}

export interface InteractionSpec {
  trigger: string;              // "click", "submit", "hover", "scroll"
  target: string;
  action: string;
  state_change?: string;
}

const ENRICHMENT_PROMPT = `You are a senior frontend architect. Given an IntentDNA object, produce a detailed FeatureBlueprint for EACH feature.

For each feature, specify:
1. Components needed (client vs server, imports, subcomponents, variant)
2. Props the component accepts
3. State management needed (useState, etc.)
4. API endpoints if the feature needs data
5. Styling approach (layout, spacing, responsive)

Also produce:
- page_structure: what pages/routes exist, what sections each has
- global_styles: design tokens (colors, fonts, spacing)
- interaction_map: what interactions exist (click → modal, submit → api call, etc.)

Return ONLY valid JSON matching this schema:
{
  "blueprints": [
    {
      "feature": {"name": "string", "type": "string", "priority": "string", "description": "string", "interactive": boolean, "component_type": "string"},
      "components": [{"name": "string", "type": "client|server", "imports": ["string"], "subcomponents": ["string"], "variant": "string"}],
      "props": [{"name": "string", "type": "string", "required": boolean, "default": "string", "description": "string"}],
      "state": [{"name": "string", "type": "string", "initial": "string", "description": "string"}],
      "api_endpoints": [{"method": "GET|POST|PUT|DELETE", "path": "string", "description": "string", "request_body": {}, "response_body": {}}],
      "styling": {"layout": "string", "spacing": "string", "colors": "string", "responsive": ["string"]}
    }
  ],
  "page_structure": [{"page": "string", "route": "string", "sections": ["string"], "layout": "string"}],
  "global_styles": {"primary_color": "hex", "secondary_color": "hex", "accent_color": "hex", "background": "hex", "text_color": "hex", "border_radius": "string", "font_family": "string", "font_sizes": {"sm": "string", "md": "string", "lg": "string", "xl": "string"}},
  "interaction_map": [{"trigger": "string", "target": "string", "action": "string", "state_change": "string"}]
}

Rules:
- Hero: always server component, static, no state, no API
- Features grid: server component, static data, grid layout
- Pricing: server component, static data, grid layout, cards
- Contact form: client component, state for form fields, POST endpoint
- Auth: client component, state for form, POST/GET endpoints
- Dashboard: client component, state for data, GET endpoints
- CTA: server component, static, no state
- Testimonials: server component, static or API-driven
- Nav: server component, static links
- Footer: server component, static links
- For interactive features, add appropriate state and API endpoints
- Global styles should match the design_style from IntentDNA
- Interaction map should cover all user actions`;

export class FeatureEnricher {
  private llm: LLMGateway;

  constructor(llm: LLMGateway) {
    this.llm = llm;
  }

  async enrich(intent: IntentDNA): Promise<EnrichedIntent> {
    console.log(`[feature-enricher] Enriching ${intent.features.length} features for ${intent.business_domain}`);

    const prompt = ENRICHMENT_PROMPT + '\n\nIntentDNA:\n' + JSON.stringify(intent, null, 2);

    let response: string;
    try {
      response = await this.llm.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 6000,
      });
    } catch (err: any) {
      console.error(`[feature-enricher] LLM call failed: ${err.message} — using blueprint fallback`);
      return this.fallbackEnrich(intent);
    }

    let enriched: EnrichedIntent;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const parsed = JSON.parse(jsonMatch[0]);
      enriched = {
        intent,
        blueprints: parsed.blueprints || [],
        page_structure: parsed.page_structure || [],
        global_styles: parsed.global_styles || this.defaultStyles(intent),
        interaction_map: parsed.interaction_map || [],
      };
    } catch (err) {
      console.error(`[feature-enricher] LLM parse failed, using blueprint fallback`);
      enriched = this.fallbackEnrich(intent);
    }

    // Ensure all features have blueprints
    const blueprintFeatures = new Set(enriched.blueprints.map(b => b.feature.name));
    for (const feat of intent.features) {
      if (!blueprintFeatures.has(feat.name)) {
        enriched.blueprints.push(this.defaultBlueprint(feat));
      }
    }

    console.log(`[feature-enricher] Generated ${enriched.blueprints.length} blueprints, ${enriched.interaction_map.length} interactions`);
    return enriched;
  }

  private fallbackEnrich(intent: IntentDNA): EnrichedIntent {
    const blueprints = intent.features.map(f => this.defaultBlueprint(f));

    const page_structure: PageStructureSpec[] = [{
      page: 'home',
      route: '/',
      sections: intent.features.filter(f => f.type === 'ui_section').map(f => f.name),
      layout: 'default',
    }];

    return {
      intent,
      blueprints,
      page_structure,
      global_styles: this.defaultStyles(intent),
      interaction_map: [],
    };
  }

  private defaultBlueprint(feat: FeatureSpec): FeatureBlueprint {
    const isInteractive = feat.interactive || feat.component_type === 'form';
    return {
      feature: feat,
      components: [{
        name: `${feat.name.charAt(0).toUpperCase() + feat.name.slice(1)}Section`,
        type: isInteractive ? 'client' : 'server',
        imports: isInteractive ? ['useState'] : [],
        subcomponents: [],
        variant: feat.component_type || 'static',
      }],
      props: [],
      state: isInteractive ? [{ name: 'isOpen', type: 'boolean', initial: 'false', description: 'Toggle state' }] : [],
      api_endpoints: feat.component_type === 'form' ? [{ method: 'POST', path: `/api/${feat.name}`, description: `Handle ${feat.name} submission` }] : [],
      styling: { layout: 'flex', spacing: 'normal', colors: 'primary', responsive: ['mobile', 'desktop'] },
    };
  }

  private defaultStyles(intent: IntentDNA): GlobalStyleSpec {
    const colors = intent.color_palette;
    return {
      primary_color: colors[0] || '#6366f1',
      secondary_color: colors[1] || '#4f46e5',
      accent_color: colors[2] || '#f59e0b',
      background: intent.design_style === 'dark' ? '#0f172a' : '#ffffff',
      text_color: intent.design_style === 'dark' ? '#f8fafc' : '#1e293b',
      border_radius: '0.75rem',
      font_family: intent.typography === 'serif' ? 'Georgia, serif' : 'Inter, system-ui, sans-serif',
      font_sizes: { sm: '0.875rem', md: '1rem', lg: '1.25rem', xl: '1.5rem' },
    };
  }
}
