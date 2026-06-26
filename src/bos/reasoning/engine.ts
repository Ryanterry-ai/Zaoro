// ─── Business Reasoning Engine ────────────────────────────────────
// Derives application blueprints from user intent using knowledge graph.
// This is the "brain" that connects intent to concrete requirements.
//
// Design Principles:
// - Intent → Knowledge Query → Blueprint
// - Deterministic reasoning (no LLM calls for core logic)
// - Composable rules that scale with knowledge graph
// - Clear audit trail of reasoning decisions

import { KnowledgeGraph } from '../graph/engine.js';
import { KnowledgeQuery } from '../knowledge/builder.js';
import {
  BlueprintCompiler, BlueprintInput, Blueprint,
} from './blueprint-compiler.js';
import {
  IndustryNode, CapabilityNode, FeatureNode, EntityNode,
  WorkflowNode, UISectionNode, VocabularyNode,
} from '../graph/types.js';

// ─── Intent Input ─────────────────────────────────────────────────

export interface BusinessIntent {
  industry: string;
  subIndustry?: string;
  appName: string;
  description: string;
  features: string[];
  entities: string[];
  workflows: string[];
  designStyle?: string;
  compliance?: string[];
  integrations?: string[];
}

// ─── Reasoning Result ─────────────────────────────────────────────

export interface ReasoningResult {
  blueprint: Blueprint;
  reasoning: {
    matchedIndustry: string | undefined;
    matchedCapabilities: string[];
    appliedVocabulary: Record<string, string>;
    derivedFeatures: string[];
    derivedEntities: string[];
    derivedWorkflows: string[];
    confidence: number;
    decisions: ReasoningDecision[];
  };
}

export interface ReasoningDecision {
  step: string;
  input: string;
  output: string;
  confidence: number;
  source: 'knowledge_graph' | 'default' | 'inference';
}

// ─── Business Reasoning Engine ────────────────────────────────────

export class BusinessReasoningEngine {
  private knowledgeQuery: KnowledgeQuery;
  private blueprintCompiler: BlueprintCompiler;

  constructor(graph: KnowledgeGraph) {
    this.knowledgeQuery = new KnowledgeQuery(graph);
    this.blueprintCompiler = new BlueprintCompiler();
  }

  /**
   * Derive a complete blueprint from business intent
   */
  async deriveBlueprint(intent: BusinessIntent): Promise<ReasoningResult> {
    const decisions: ReasoningDecision[] = [];

    // Step 1: Match intent to industry
    const industryMatch = this.matchIndustry(intent.industry, decisions);

    // Step 2: Get industry profile (capabilities, vocabulary, features)
    const profile = industryMatch
      ? this.knowledgeQuery.getIndustryProfile(industryMatch.id)
      : { industry: undefined, capabilities: [], vocabulary: [], features: [] };

    // Step 3: Apply vocabulary overrides
    const vocabulary = this.applyVocabulary(profile.vocabulary, intent, decisions);

    // Step 4: Derive required features
    const derivedFeatures = this.deriveFeatures(intent, profile.features, decisions);

    // Step 5: Derive entities
    const derivedEntities = this.deriveEntities(intent, decisions);

    // Step 6: Derive workflows
    const derivedWorkflows = this.deriveWorkflows(intent, derivedEntities, decisions);

    // Step 7: Compile blueprint
    const blueprintInput: BlueprintInput = {
      name: intent.appName,
      description: intent.description,
      industry: intent.industry,
      sourceIndustries: industryMatch ? [industryMatch.id] : [],
      compositionPrimitives: profile.industry?.properties.compositionPrimitives || [],
      vocabulary,
      pages: this.derivePages(intent, derivedFeatures),
      entities: derivedEntities,
      workflows: derivedWorkflows,
      sections: this.deriveSections(intent, derivedFeatures, profile.features),
      features: derivedFeatures,
      integrations: this.deriveIntegrations(intent, decisions),
      compliance: this.deriveCompliance(intent, decisions),
    };

    const blueprint = this.blueprintCompiler.compile(blueprintInput);

    return {
      blueprint,
      reasoning: {
        matchedIndustry: industryMatch?.id,
        matchedCapabilities: profile.capabilities.map(c => c.id),
        appliedVocabulary: vocabulary,
        derivedFeatures: derivedFeatures.map(f => f.name),
        derivedEntities: derivedEntities.map(e => e.name),
        derivedWorkflows: derivedWorkflows.map(w => w.name),
        confidence: industryMatch ? 0.85 : 0.5,
        decisions,
      },
    };
  }

  // ─── Industry Matching ─────────────────────────────────────────

  private matchIndustry(
    industry: string,
    decisions: ReasoningDecision[]
  ): IndustryNode | undefined {
    const results = this.knowledgeQuery.findIndustries(industry);

    if (results.length > 0) {
      const matched = results[0];
      decisions.push({
        step: 'industry_matching',
        input: industry,
        output: matched!.properties.name,
        confidence: 0.9,
        source: 'knowledge_graph',
      });
      return matched;
    }

    decisions.push({
      step: 'industry_matching',
      input: industry,
      output: 'No match found',
      confidence: 0,
      source: 'default',
    });

    return undefined;
  }

  // ─── Vocabulary Application ────────────────────────────────────

  private applyVocabulary(
    vocabOverrides: VocabularyNode[],
    intent: BusinessIntent,
    decisions: ReasoningDecision[]
  ): Record<string, string> {
    const vocabulary: Record<string, string> = {};

    for (const vocab of vocabOverrides) {
      vocabulary[vocab.properties.original] = vocab.properties.replacement;
    }

    if (Object.keys(vocabulary).length > 0) {
      decisions.push({
        step: 'vocabulary_override',
        input: `${vocabOverrides.length} overrides`,
        output: JSON.stringify(vocabulary),
        confidence: 0.9,
        source: 'knowledge_graph',
      });
    }

    return vocabulary;
  }

  // ─── Feature Derivation ────────────────────────────────────────

  private deriveFeatures(
    intent: BusinessIntent,
    industryFeatures: FeatureNode[],
    decisions: ReasoningDecision[]
  ): Array<{
    name: string;
    description: string;
    priority: 'must_have' | 'should_have' | 'nice_to_have';
    entities: string[];
    workflows: string[];
    uiSections: string[];
    implementation: 'ui_only' | 'ui_with_state' | 'full_stack' | 'integration';
  }> {
    const features: Array<{
      name: string;
      description: string;
      priority: 'must_have' | 'should_have' | 'nice_to_have';
      entities: string[];
      workflows: string[];
      uiSections: string[];
      implementation: 'ui_only' | 'ui_with_state' | 'full_stack' | 'integration';
    }> = [];

    // Start with industry features
    for (const feat of industryFeatures) {
      features.push({
        name: feat.properties.name,
        description: feat.properties.description,
        priority: feat.properties.priority,
        entities: [],
        workflows: [],
        uiSections: feat.properties.uiSections,
        implementation: 'ui_only',
      });
    }

    // Add user-specified features
    for (const userFeature of intent.features) {
      const existing = features.find(f =>
        f.name.toLowerCase().includes(userFeature.toLowerCase()) ||
        userFeature.toLowerCase().includes(f.name.toLowerCase())
      );

      if (!existing) {
        features.push({
          name: userFeature,
          description: `User-requested feature: ${userFeature}`,
          priority: 'must_have',
          entities: [],
          workflows: [],
          uiSections: [],
          implementation: 'ui_only',
        });
      }
    }

    // Add standard features if not present
    const standardFeatures = [
      { name: 'Hero', description: 'Main hero section', priority: 'must_have' as const },
      { name: 'Navigation', description: 'Site navigation', priority: 'must_have' as const },
      { name: 'Footer', description: 'Site footer', priority: 'must_have' as const },
      { name: 'Contact', description: 'Contact information', priority: 'should_have' as const },
      { name: 'About', description: 'About the business', priority: 'should_have' as const },
    ];

    for (const std of standardFeatures) {
      if (!features.find(f => f.name === std.name)) {
        features.push({
          ...std,
          entities: [],
          workflows: [],
          uiSections: [],
          implementation: 'ui_only',
        });
      }
    }

    decisions.push({
      step: 'feature_derivation',
      input: `${intent.features.length} user features + ${industryFeatures.length} industry features`,
      output: `${features.length} total features`,
      confidence: 0.8,
      source: 'inference',
    });

    return features;
  }

  // ─── Entity Derivation ─────────────────────────────────────────

  private deriveEntities(
    intent: BusinessIntent,
    decisions: ReasoningDecision[]
  ): Array<{
    name: string;
    fields: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'reference';
      required: boolean;
    }>;
    relationships: Array<{
      target: string;
      type: 'has_many' | 'belongs_to' | 'has_one' | 'many_to_many';
    }>;
  }> {
    const entities: Array<{
      name: string;
      fields: Array<{
        name: string;
        type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'reference';
        required: boolean;
      }>;
      relationships: Array<{
        target: string;
        type: 'has_many' | 'belongs_to' | 'has_one' | 'many_to_many';
      }>;
    }> = [];

    // User-specified entities
    for (const entityName of intent.entities) {
      entities.push({
        name: entityName,
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'createdAt', type: 'date', required: true },
        ],
        relationships: [],
      });
    }

    // Add standard entities if not present
    const standardEntities = [
      {
        name: 'User',
        fields: [
          { name: 'id', type: 'string' as const, required: true },
          { name: 'email', type: 'string' as const, required: true },
          { name: 'name', type: 'string' as const, required: false },
          { name: 'createdAt', type: 'date' as const, required: true },
        ],
        relationships: [],
      },
    ];

    for (const std of standardEntities) {
      if (!entities.find(e => e.name === std.name)) {
        entities.push(std);
      }
    }

    decisions.push({
      step: 'entity_derivation',
      input: `${intent.entities.length} user entities`,
      output: `${entities.length} total entities`,
      confidence: 0.7,
      source: 'inference',
    });

    return entities;
  }

  // ─── Workflow Derivation ───────────────────────────────────────

  private deriveWorkflows(
    intent: BusinessIntent,
    entities: Array<{ name: string }>,
    decisions: ReasoningDecision[]
  ): Array<{
    name: string;
    description: string;
    trigger: string;
    steps: Array<{
      name: string;
      action: 'create' | 'read' | 'update' | 'delete' | 'validate';
      entity?: string;
    }>;
    entities: string[];
  }> {
    const workflows: Array<{
      name: string;
      description: string;
      trigger: string;
      steps: Array<{
        name: string;
        action: 'create' | 'read' | 'update' | 'delete' | 'validate';
        entity?: string;
      }>;
      entities: string[];
    }> = [];

    // User-specified workflows
    for (const wfName of intent.workflows) {
      workflows.push({
        name: wfName,
        description: `User-requested workflow: ${wfName}`,
        trigger: 'manual',
        steps: [],
        entities: [],
      });
    }

    // Add standard CRUD workflows for each entity
    for (const entity of entities) {
      const wfName = `${entity.name} Management`;
      if (!workflows.find(w => w.name === wfName)) {
        workflows.push({
          name: wfName,
          description: `CRUD operations for ${entity.name}`,
          trigger: 'user_action',
          steps: [
            { name: `Create ${entity.name}`, action: 'create', entity: entity.name },
            { name: `Read ${entity.name}`, action: 'read', entity: entity.name },
            { name: `Update ${entity.name}`, action: 'update', entity: entity.name },
            { name: `Delete ${entity.name}`, action: 'delete', entity: entity.name },
          ],
          entities: [entity.name],
        });
      }
    }

    decisions.push({
      step: 'workflow_derivation',
      input: `${intent.workflows.length} user workflows`,
      output: `${workflows.length} total workflows`,
      confidence: 0.7,
      source: 'inference',
    });

    return workflows;
  }

  // ─── Page Derivation ───────────────────────────────────────────

  private derivePages(
    intent: BusinessIntent,
    features: Array<{ name: string; description: string; uiSections: string[] }>
  ): NonNullable<BlueprintInput['pages']> {
    const pages: NonNullable<BlueprintInput['pages']> = [
      {
        path: '/',
        name: 'Home',
        description: 'Landing page',
        sections: features
          .filter(f => ['Hero', 'Navigation', 'Footer'].includes(f.name))
          .map(f => f.name),
        seo: {
          title: intent.appName,
          description: intent.description,
          keywords: [intent.industry, intent.appName],
        },
      },
    ];

    // Add pages for major features
    const majorFeatures = features.filter(f =>
      !['Hero', 'Navigation', 'Footer'].includes(f.name) &&
      f.uiSections.length > 0
    );

    for (const feature of majorFeatures) {
      const slug = feature.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      pages.push({
        path: `/${slug}`,
        name: feature.name,
        description: feature.description,
        sections: feature.uiSections,
      });
    }

    return pages;
  }

  // ─── Section Derivation ────────────────────────────────────────

  private deriveSections(
    intent: BusinessIntent,
    derivedFeatures: Array<{ name: string; uiSections: string[] }>,
    industryFeatures: FeatureNode[]
  ): NonNullable<BlueprintInput['sections']> {
    const sections: NonNullable<BlueprintInput['sections']> = [];

    // Standard sections
    const standardSections = [
      { name: 'Hero', type: 'hero' as const, layout: 'full' as const },
      { name: 'Navigation', type: 'navigation' as const, layout: 'full' as const },
      { name: 'Footer', type: 'navigation' as const, layout: 'full' as const },
    ];

    for (const std of standardSections) {
      sections.push({
        ...std,
        components: [],
        content: {},
      });
    }

    // Feature sections
    for (const feature of derivedFeatures) {
      for (const sectionName of feature.uiSections) {
        if (!sections.find(s => s.name === sectionName)) {
          sections.push({
            name: sectionName,
            type: 'content',
            layout: 'full',
            components: [],
            content: {},
          });
        }
      }
    }

    return sections;
  }

  // ─── Integration Derivation ────────────────────────────────────

  private deriveIntegrations(
    intent: BusinessIntent,
    decisions: ReasoningDecision[]
  ): NonNullable<BlueprintInput['integrations']> {
    const integrations: NonNullable<BlueprintInput['integrations']> = [];

    for (const intg of intent.integrations || []) {
      integrations.push({
        type: intg,
        name: intg,
        description: `${intg} integration`,
        required: true,
      });
    }

    return integrations;
  }

  // ─── Compliance Derivation ─────────────────────────────────────

  private deriveCompliance(
    intent: BusinessIntent,
    decisions: ReasoningDecision[]
  ): NonNullable<BlueprintInput['compliance']> {
    const compliance: NonNullable<BlueprintInput['compliance']> = [];

    for (const comp of intent.compliance || []) {
      compliance.push({
        type: comp,
        name: comp.toUpperCase(),
        description: `${comp.toUpperCase()} compliance requirements`,
        requirements: [],
        implementation: '',
      });
    }

    return compliance;
  }
}