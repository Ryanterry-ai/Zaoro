// ─── Knowledge Layer ──────────────────────────────────────────────
// Builds and maintains the knowledge graph from seed entries and evidence.
// Provides normalized business knowledge that can scale to 500+ industries
// through composition rather than duplication.
//
// Design Principles:
// - Seed entries define primitive capabilities
// - Industries are composed from primitives
// - Evidence enriches but doesn't define knowledge
// - Query-first design for downstream consumers

import { KnowledgeGraph } from '../graph/engine.js';
import {
  NodeId, BaseNode, NodeType, Edge, EdgeType,
  IndustryNode, SubIndustryNode, CapabilityNode, FeatureNode,
  WorkflowNode, EntityNode, UISectionNode, ComponentNode,
  VocabularyNode, PrimitiveNode,
} from '../graph/types.js';
import { EvidenceStore, EvidenceItem } from '../evidence/types.js';

// ─── Seed Data Types ──────────────────────────────────────────────

export interface PrimitiveCapability {
  id: string;
  name: string;
  description: string;
  category: 'auth' | 'data' | 'ui' | 'payment' | 'notification' | 'integration' | 'compliance' | 'analytics';
  industryAffinity: string[];  // Industries that commonly use this
}

export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  primitives: string[];        // Primitive IDs that compose this industry
  vocabulary?: Record<string, string>;
  requiredFeatures: string[];
  optionalFeatures: string[];
}

// ─── Knowledge Builder ────────────────────────────────────────────

export class KnowledgeBuilder {
  private graph: KnowledgeGraph;
  private evidenceStore: EvidenceStore;

  constructor(graph: KnowledgeGraph, evidenceStore: EvidenceStore) {
    this.graph = graph;
    this.evidenceStore = evidenceStore;
  }

  /**
   * Build knowledge graph from seed primitives and templates
   */
  async buildFromSeeds(
    primitives: PrimitiveCapability[],
    templates: IndustryTemplate[]
  ): Promise<void> {
    console.log(`[KnowledgeBuilder] Building from ${primitives.length} primitives and ${templates.length} templates`);

    // Step 1: Add all primitives as nodes
    for (const prim of primitives) {
      this.addPrimitive(prim);
    }

    // Step 2: Add industry templates as composed industries
    for (const template of templates) {
      this.addIndustryFromTemplate(template);
    }

    // Step 3: Enrich with evidence
    await this.enrichFromEvidence();

    // Step 4: Compute derived relationships
    this.computeDerivedRelationships();

    console.log(`[KnowledgeBuilder] Build complete: ${this.graph.stats().nodes} nodes, ${this.graph.stats().edges} edges`);
  }

  /**
   * Add a primitive capability to the graph
   */
  private addPrimitive(prim: PrimitiveCapability): void {
    const node: BaseNode = {
      id: `primitive-${prim.id}`,
      type: 'Primitive',
      properties: {
        name: prim.name,
        slug: prim.id,
        description: prim.description,
        category: prim.category,
        industryAffinity: prim.industryAffinity,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.graph.addNode(node);
  }

  /**
   * Add an industry composed from primitives
   */
  private addIndustryFromTemplate(template: IndustryTemplate): void {
    // Create industry node
    const industryNode: IndustryNode = {
      id: `industry-${template.id}`,
      type: 'Industry',
      properties: {
        name: template.name,
        slug: template.id,
        description: template.description,
        maturity: 'mature',
        tags: [template.id, template.name.toLowerCase()],
        compositionPrimitives: template.primitives.map(p => `primitive-${p}`),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.graph.addNode(industryNode);

    // Add composition edges
    for (const primId of template.primitives) {
      const primNodeId = `primitive-${primId}`;
      if (this.graph.getNode(primNodeId)) {
        this.graph.addEdge({
          id: `compose-${template.id}-${primId}`,
          source: industryNode.id,
          target: primNodeId,
          type: 'composes',
          weight: 1.0,
          properties: {},
          createdAt: Date.now(),
        });
      }
    }

    // Add vocabulary overrides
    if (template.vocabulary) {
      for (const [original, replacement] of Object.entries(template.vocabulary)) {
        const vocabId = `vocab-${template.id}-${original}`;
        const vocabNode: VocabularyNode = {
          id: vocabId,
          type: 'Vocabulary',
          properties: {
            original,
            replacement,
            context: `Industry-specific: ${template.name}`,
            industries: [industryNode.id],
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        this.graph.addNode(vocabNode);

        this.graph.addEdge({
          id: `override-${vocabId}`,
          source: vocabId,
          target: industryNode.id,
          type: 'overrides',
          weight: 1.0,
          properties: { original, replacement },
          createdAt: Date.now(),
        });
      }
    }
  }

  /**
   * Enrich knowledge graph with validated evidence
   */
  private async enrichFromEvidence(): Promise<void> {
    const validatedEvidence = this.evidenceStore.query({
      status: 'validated',
      minConfidence: 0.6,
    });

    for (const evidence of validatedEvidence) {
      this.enrichFromEvidenceItem(evidence);
    }
  }

  private enrichFromEvidenceItem(evidence: EvidenceItem): void {
    const content = evidence.content;

    // Extract navigation items as potential features
    if (Array.isArray(content.navigation)) {
      for (const navItem of content.navigation) {
        if (typeof navItem === 'string' && navItem.length > 2) {
          // Check if this maps to an existing capability
          const normalized = navItem.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const existingCap = this.graph.queryNodes({
            type: 'Capability',
            properties: { slug: normalized },
          });

          if (existingCap.length > 0) {
            // Evidence confirms this capability exists
            const cap = existingCap[0];
            if (cap) {
              this.graph.addEdge({
                id: `evidence-${evidence.id}-${cap.id}`,
                source: cap.id,
                target: cap.id, // self-reference for evidence count
                type: 'related_to',
                weight: evidence.confidence,
                properties: { evidenceId: evidence.id },
                createdAt: Date.now(),
              });
            }
          }
        }
      }
    }
  }

  /**
   * Compute derived relationships that aren't explicitly defined
   */
  private computeDerivedRelationships(): void {
    // 1. Industries with similar primitives should be related
    this.computeIndustrySimilarity();

    // 2. Capabilities required by same features should be related
    this.computeCapabilityClusters();

    // 3. UI sections that appear together should be related
    this.computeSectionAffinity();
  }

  private computeIndustrySimilarity(): void {
    const industries = this.graph.queryNodes({ type: 'Industry' }) as IndustryNode[];

    for (let i = 0; i < industries.length; i++) {
      for (let j = i + 1; j < industries.length; j++) {
        const a = industries[i];
        const b = industries[j];
        if (!a || !b) continue;

        const primitivesA = new Set(a.properties.compositionPrimitives);
        const primitivesB = new Set(b.properties.compositionPrimitives);

        // Compute Jaccard similarity
        const intersection = new Set([...primitivesA].filter(x => primitivesB.has(x)));
        const union = new Set([...primitivesA, ...primitivesB]);
        const similarity = union.size > 0 ? intersection.size / union.size : 0;

        if (similarity > 0.3) {
          this.graph.addEdge({
            id: `similar-${a.id}-${b.id}`,
            source: a.id,
            target: b.id,
            type: 'related_to',
            weight: similarity,
            properties: { similarity, sharedPrimitives: Array.from(intersection) },
            createdAt: Date.now(),
          });
        }
      }
    }
  }

  private computeCapabilityClusters(): void {
    // Group capabilities by their industry affinity
    const capabilities = this.graph.queryNodes({ type: 'Capability' }) as CapabilityNode[];
    const affinityGroups = new Map<string, string[]>();

    for (const cap of capabilities) {
      const affinity = (cap.properties as any).category || 'unknown';
      if (!affinityGroups.has(affinity)) {
        affinityGroups.set(affinity, []);
      }
      affinityGroups.get(affinity)!.push(cap.id);
    }

    // Create edges between capabilities in same affinity group
    for (const [affinity, capIds] of affinityGroups) {
      for (let i = 0; i < capIds.length; i++) {
        for (let j = i + 1; j < capIds.length; j++) {
          const a = capIds[i];
          const b = capIds[j];
          if (a && b) {
            this.graph.addEdge({
              id: `cluster-${affinity}-${a}-${b}`,
              source: a,
              target: b,
              type: 'related_to',
              weight: 0.5,
              properties: { affinity },
              createdAt: Date.now(),
            });
          }
        }
      }
    }
  }

  private computeSectionAffinity(): void {
    // UI sections that appear in same features are related
    const features = this.graph.queryNodes({ type: 'Feature' }) as FeatureNode[];

    for (const feature of features) {
      const sections = feature.properties.uiSections;
      for (let i = 0; i < sections.length; i++) {
        for (let j = i + 1; j < sections.length; j++) {
          const a = sections[i];
          const b = sections[j];
          if (a && b) {
            this.graph.addEdge({
              id: `affinity-${a}-${b}`,
              source: a,
              target: b,
              type: 'related_to',
              weight: 0.7,
              properties: { feature: feature.id },
              createdAt: Date.now(),
            });
          }
        }
      }
    }
  }
}

// ─── Knowledge Query Interface ────────────────────────────────────
// High-level query API for downstream consumers (Reasoning Layer)

export class KnowledgeQuery {
  private graph: KnowledgeGraph;

  constructor(graph: KnowledgeGraph) {
    this.graph = graph;
  }

  /**
   * Get full industry profile including capabilities and vocabulary
   */
  getIndustryProfile(industryId: string): {
    industry: IndustryNode | undefined;
    capabilities: CapabilityNode[];
    vocabulary: VocabularyNode[];
    features: FeatureNode[];
  } {
    const industry = this.graph.getTypedNode<IndustryNode>(industryId);
    if (!industry) {
      return { industry: undefined, capabilities: [], vocabulary: [], features: [] };
    }

    const capabilities = this.graph.getIndustryCapabilities(industryId);
    const vocabulary = this.graph.getVocabularyOverrides(industryId);

    // Get features for this industry's capabilities
    const features: FeatureNode[] = [];
    for (const cap of capabilities) {
      const capFeatures = this.graph.traverse({
        startNode: cap.id,
        edgeTypes: ['contains'],
        direction: 'incoming',
        maxDepth: 2,
        nodeFilter: ['Feature'],
      });
      for (const f of capFeatures) {
        if (f.type === 'Feature') {
          features.push(f as FeatureNode);
        }
      }
    }

    return { industry, capabilities, vocabulary, features };
  }

  /**
   * Find industries matching a query (semantic search)
   */
  findIndustries(query: string): IndustryNode[] {
    const normalizedQuery = query.toLowerCase();
    const terms = normalizedQuery.split(/\s+/);

    const industries = this.graph.queryNodes({ type: 'Industry' }) as IndustryNode[];

    // Score each industry by term overlap
    const scored = industries.map(ind => {
      const text = `${ind.properties.name} ${ind.properties.description} ${ind.properties.tags.join(' ')}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (text.includes(term)) score += 1;
      }
      return { industry: ind, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.industry);
  }

  /**
   * Get required features for an industry
   */
  getRequiredFeatures(industryId: string): FeatureNode[] {
    const profile = this.getIndustryProfile(industryId);
    return profile.features.filter(f => f.properties.priority === 'must_have');
  }

  /**
   * Compose a custom industry from primitives
   */
  composeCustomIndustry(
    name: string,
    primitiveIds: string[],
    extendsIndustry?: string
  ): string {
    const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const fullPrimitiveIds = primitiveIds.map(p => `primitive-${p}`);

    this.graph.composeIndustry(id, name, fullPrimitiveIds, extendsIndustry);
    return id;
  }

  /**
   * Get graph statistics
   */
  stats() {
    return this.graph.stats();
  }

  /**
   * Get the underlying KnowledgeGraph for direct access.
   */
  getGraph(): KnowledgeGraph {
    return this.graph;
  }
}