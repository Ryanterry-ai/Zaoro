// ─── Blueprint Compiler ───────────────────────────────────────────
// Compiles a structured application blueprint from knowledge graph queries.
// The Blueprint is the single artifact that drives all code generation.
//
// Design Principles:
// - Blueprint is immutable once compiled
// - Contains everything needed for generation (no runtime lookups)
// - Supports composition (blueprints can extend other blueprints)
// - Validation built into compilation

// ─── Blueprint Types ──────────────────────────────────────────────

export interface Blueprint {
  id: string;
  version: string;
  compiledAt: number;
  
  // Identity
  name: string;
  description: string;
  industry: string;
  
  // Structure
  pages: BlueprintPage[];
  entities: BlueprintEntity[];
  workflows: BlueprintWorkflow[];
  
  // UI
  designSystem: DesignSystemBlueprint;
  sections: BlueprintSection[];
  
  // Capabilities
  features: BlueprintFeature[];
  integrations: BlueprintIntegration[];
  compliance: BlueprintCompliance[];
  
  // Vocabulary
  vocabulary: Record<string, string>;
  
  // Metadata
  sourceIndustries: string[];
  compositionPrimitives: string[];
  confidence: number;
  warnings: string[];

  // NEW: Scraped reference data for enhanced generation
  scrapedReference?: ScrapedReferenceData;
}

// NEW: Scraped reference data from competitor websites
export interface ScrapedReferenceData {
  // Typed data models for data.ts generation
  dataModels: Array<{
    name: string;
    typeName: string;
    fields: Array<{ name: string; type: string; required: boolean }>;
    sampleData: Record<string, any>[];
  }>;
  // Component structures for reference
  componentStructures: Array<{
    name: string;
    type: string;
    props: string[];
    hasState: boolean;
    hasAnimation: boolean;
    complexity: 'simple' | 'medium' | 'complex';
  }>;
  // Animation patterns for Framer Motion generation
  animationPatterns: Array<{
    type: 'framer-motion' | 'css' | 'gsap';
    trigger: 'mount' | 'hover' | 'click' | 'scroll' | 'stagger' | 'loop';
    code: string;
    description: string;
  }>;
  // Design system extracted from reference
  designSystem: {
    colors: Record<string, string>;
    typography: { fonts: string[]; fontSizes: string[] };
    spacing: string[];
    borderRadius: string[];
  };
  // Real content for generation
  realContent: {
    headlines: string[];
    taglines: string[];
    descriptions: string[];
    testimonials: string[];
    features: string[];
    pricing: string[];
  };
}

export interface BlueprintPage {
  id: string;
  path: string;
  name: string;
  description: string;
  sections: string[];      // Section IDs in order
  isEntry: boolean;        // Is this a landing/home page
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

export interface BlueprintEntity {
  id: string;
  name: string;
  slug: string;
  fields: BlueprintField[];
  relationships: BlueprintRelationship[];
  uiSections: string[];
  workflows: string[];
}

export interface BlueprintField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'reference' | 'rich_text' | 'image' | 'file';
  required: boolean;
  indexed: boolean;
  unique: boolean;
  description?: string;
  defaultValue?: unknown;
  validation?: string;
}

export interface BlueprintRelationship {
  target: string;
  type: 'has_many' | 'belongs_to' | 'has_one' | 'many_to_many';
  foreignKey?: string;
  cascade?: boolean;
}

export interface BlueprintWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: BlueprintWorkflowStep[];
  entities: string[];
  services: string[];
}

export interface BlueprintWorkflowStep {
  name: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'validate' | 'transform' | 'notify' | 'redirect';
  entity?: string;
  service?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  condition?: string;
}

export interface DesignSystemBlueprint {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  typography: {
    fontFamily: string;
    fontSizes: Record<string, string>;
    fontWeights: Record<string, number>;
    lineHeights: Record<string, number>;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  animations: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
}

export interface BlueprintSection {
  id: string;
  name: string;
  type: 'hero' | 'content' | 'conversion' | 'navigation' | 'social' | 'form' | 'data' | 'interactive';
  layout: 'full' | 'split' | 'grid' | 'card' | 'list' | 'sidebar' | 'hero';
  components: BlueprintComponent[];
  content: Record<string, unknown>;
  responsive: {
    mobile: Partial<BlueprintSectionLayout>;
    tablet: Partial<BlueprintSectionLayout>;
    desktop: Partial<BlueprintSectionLayout>;
  };
}

export interface BlueprintSectionLayout {
  columns: number;
  gap: string;
  padding: string;
  display: string;
}

export interface BlueprintComponent {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: BlueprintComponent[];
  styles?: Record<string, unknown>;
}

export interface BlueprintFeature {
  id: string;
  name: string;
  description: string;
  priority: 'must_have' | 'should_have' | 'nice_to_have';
  entities: string[];
  workflows: string[];
  uiSections: string[];
  implementation: 'ui_only' | 'ui_with_state' | 'full_stack' | 'integration';
}

export interface BlueprintIntegration {
  id: string;
  type: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  required: boolean;
  api?: {
    baseUrl: string;
    endpoints: Array<{
      name: string;
      method: string;
      path: string;
    }>;
  } | undefined;
}

export interface BlueprintCompliance {
  id: string;
  type: string;
  name: string;
  description: string;
  requirements: string[];
  implementation: string;
}

// ─── Blueprint Compiler ───────────────────────────────────────────

export class BlueprintCompiler {
  /**
   * Compile a blueprint from structured input
   * This is the main entry point for the Reasoning Layer
   */
  compile(input: BlueprintInput): Blueprint {
    const warnings: string[] = [];

    // Validate input
    const validationErrors = this.validateInput(input);
    if (validationErrors.length > 0) {
      warnings.push(...validationErrors);
    }

    // Build pages
    const pages = this.compilePages(input);

    // Build entities
    const entities = this.compileEntities(input);

    // Build workflows
    const workflows = this.compileWorkflows(input);

    // Build design system
    const designSystem = this.compileDesignSystem(input);

    // Build sections
    const sections = this.compileSections(input);

    // Build features
    const features = this.compileFeatures(input);

    // Build integrations
    const integrations = this.compileIntegrations(input);

    // Build compliance
    const compliance = this.compileCompliance(input);

    // Apply vocabulary overrides
    const vocabulary = input.vocabulary || {};

    return {
      id: `blueprint-${Date.now()}`,
      version: '1.0.0',
      compiledAt: Date.now(),
      name: input.name,
      description: input.description,
      industry: input.industry,
      pages,
      entities,
      workflows,
      designSystem,
      sections,
      features,
      integrations,
      compliance,
      vocabulary,
      sourceIndustries: input.sourceIndustries || [],
      compositionPrimitives: input.compositionPrimitives || [],
      confidence: input.confidence || 0.8,
      warnings,
    };
  }

  private validateInput(input: BlueprintInput): string[] {
    const errors: string[] = [];
    if (!input.name) errors.push('Missing name');
    if (!input.industry) errors.push('Missing industry');
    if (!input.pages || input.pages.length === 0) errors.push('No pages defined');
    return errors;
  }

  private compilePages(input: BlueprintInput): BlueprintPage[] {
    return (input.pages || []).map((page, idx) => {
      const seo = page.seo || {};
      return {
        id: `page-${idx}`,
        path: page.path || '/',
        name: page.name || `Page ${idx}`,
        description: page.description || '',
        sections: page.sections || [],
        isEntry: idx === 0,
        seo: {
          title: seo.title || input.name,
          description: seo.description || input.description,
          keywords: seo.keywords || [input.industry],
        },
      };
    });
  }

  private compileEntities(input: BlueprintInput): BlueprintEntity[] {
    return (input.entities || []).map((entity, idx) => {
      const fields: BlueprintField[] = (entity.fields || []).map(f => {
        const field: BlueprintField = {
          name: f.name,
          type: f.type || 'string',
          required: f.required || false,
          indexed: f.indexed || false,
          unique: f.unique || false,
        };
        if (f.description) {
          field.description = f.description;
        }
        return field;
      });

      const relationships: BlueprintRelationship[] = (entity.relationships || []).map(r => {
        const rel: BlueprintRelationship = {
          target: r.target,
          type: r.type || 'belongs_to',
        };
        if (r.foreignKey) {
          rel.foreignKey = r.foreignKey;
        }
        return rel;
      });

      return {
        id: `entity-${idx}`,
        name: entity.name,
        slug: entity.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        fields,
        relationships,
        uiSections: entity.uiSections || [],
        workflows: entity.workflows || [],
      };
    });
  }

  private compileWorkflows(input: BlueprintInput): BlueprintWorkflow[] {
    return (input.workflows || []).map((wf, idx) => {
      const steps: BlueprintWorkflowStep[] = (wf.steps || []).map(s => {
        const step: BlueprintWorkflowStep = {
          name: s.name,
          action: s.action || 'read',
        };
        if (s.entity) step.entity = s.entity;
        if (s.service) step.service = s.service;
        return step;
      });

      return {
        id: `workflow-${idx}`,
        name: wf.name,
        description: wf.description || '',
        trigger: wf.trigger || 'manual',
        steps,
        entities: wf.entities || [],
        services: wf.services || [],
      };
    });
  }

  private compileDesignSystem(input: BlueprintInput): DesignSystemBlueprint {
    const ds = input.designSystem || {};
    return {
      colors: {
        primary: ds.colors?.primary || '#3B82F6',
        secondary: ds.colors?.secondary || '#10B981',
        accent: ds.colors?.accent || '#F59E0B',
        background: ds.colors?.background || '#FFFFFF',
        surface: ds.colors?.surface || '#F9FAFB',
        text: ds.colors?.text || '#111827',
        textSecondary: ds.colors?.textSecondary || '#6B7280',
        border: ds.colors?.border || '#E5E7EB',
        error: ds.colors?.error || '#EF4444',
        success: ds.colors?.success || '#10B981',
        warning: ds.colors?.warning || '#F59E0B',
      },
      typography: {
        fontFamily: ds.typography?.fontFamily || 'Inter, system-ui, sans-serif',
        fontSizes: ds.typography?.fontSizes || {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem',
        },
        fontWeights: ds.typography?.fontWeights || {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        lineHeights: ds.typography?.lineHeights || {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.75,
        },
      },
      spacing: ds.spacing || {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
      },
      borderRadius: ds.borderRadius || {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        full: '9999px',
      },
      shadows: ds.shadows || {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
      },
      animations: {
        duration: {
          fast: '150ms',
          normal: '300ms',
          slow: '500ms',
        },
        easing: {
          ease: 'ease-in-out',
          easeOut: 'ease-out',
          spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        },
      },
    };
  }

  private compileSections(input: BlueprintInput): BlueprintSection[] {
    return (input.sections || []).map((section, idx) => ({
      id: `section-${idx}`,
      name: section.name,
      type: section.type || 'content',
      layout: section.layout || 'full',
      components: section.components || [],
      content: section.content || {},
      responsive: section.responsive || {
        mobile: {},
        tablet: {},
        desktop: {},
      },
    }));
  }

  private compileFeatures(input: BlueprintInput): BlueprintFeature[] {
    return (input.features || []).map((feat, idx) => ({
      id: `feature-${idx}`,
      name: feat.name,
      description: feat.description || '',
      priority: feat.priority || 'must_have',
      entities: feat.entities || [],
      workflows: feat.workflows || [],
      uiSections: feat.uiSections || [],
      implementation: feat.implementation || 'ui_only',
    }));
  }

  private compileIntegrations(input: BlueprintInput): BlueprintIntegration[] {
    return (input.integrations || []).map((intg, idx) => ({
      id: `integration-${idx}`,
      type: intg.type,
      name: intg.name,
      description: intg.description || '',
      config: intg.config || {},
      required: intg.required || false,
      api: intg.api,
    }));
  }

  private compileCompliance(input: BlueprintInput): BlueprintCompliance[] {
    return (input.compliance || []).map((comp, idx) => ({
      id: `compliance-${idx}`,
      type: comp.type,
      name: comp.name,
      description: comp.description || '',
      requirements: comp.requirements || [],
      implementation: comp.implementation || '',
    }));
  }
}

// ─── Blueprint Input Types ────────────────────────────────────────

export interface BlueprintInput {
  name: string;
  description: string;
  industry: string;
  sourceIndustries?: string[];
  compositionPrimitives?: string[];
  confidence?: number;
  vocabulary?: Record<string, string>;
  
  pages?: Array<{
    path?: string;
    name?: string;
    description?: string;
    sections?: string[];
    seo?: {
      title?: string;
      description?: string;
      keywords?: string[];
    };
  }>;
  
  entities?: Array<{
    name: string;
    fields?: Array<{
      name: string;
      type?: BlueprintField['type'];
      required?: boolean;
      indexed?: boolean;
      unique?: boolean;
      description?: string;
    }>;
    relationships?: Array<{
      target: string;
      type?: BlueprintRelationship['type'];
      foreignKey?: string;
    }>;
    uiSections?: string[];
    workflows?: string[];
  }>;
  
  workflows?: Array<{
    name: string;
    description?: string;
    trigger?: string;
    steps?: Array<{
      name: string;
      action?: BlueprintWorkflowStep['action'];
      entity?: string;
      service?: string;
    }>;
    entities?: string[];
    services?: string[];
  }>;
  
  designSystem?: {
    colors?: Partial<DesignSystemBlueprint['colors']>;
    typography?: Partial<DesignSystemBlueprint['typography']>;
    spacing?: Record<string, string>;
    borderRadius?: Record<string, string>;
    shadows?: Record<string, string>;
  };
  
  sections?: Array<{
    name: string;
    type?: BlueprintSection['type'];
    layout?: BlueprintSection['layout'];
    components?: BlueprintComponent[];
    content?: Record<string, unknown>;
    responsive?: BlueprintSection['responsive'];
  }>;
  
  features?: Array<{
    name: string;
    description?: string;
    priority?: BlueprintFeature['priority'];
    entities?: string[];
    workflows?: string[];
    uiSections?: string[];
    implementation?: BlueprintFeature['implementation'];
  }>;
  
  integrations?: Array<{
    type: string;
    name: string;
    description?: string;
    config?: Record<string, unknown>;
    required?: boolean;
    api?: BlueprintIntegration['api'];
  }>;
  
  compliance?: Array<{
    type: string;
    name: string;
    description?: string;
    requirements?: string[];
    implementation?: string;
  }>;
}

// ─── Blueprint Serialization ──────────────────────────────────────

export function serializeBlueprint(blueprint: Blueprint): string {
  return JSON.stringify(blueprint, null, 2);
}

export function deserializeBlueprint(json: string): Blueprint {
  return JSON.parse(json);
}