/**
 * =============================================================================
 * Build.same V3
 * Business Planning Layer - Business Blueprint Builder
 * =============================================================================
 * Constructs and validates the Business Blueprint from reasoning results.
 * The blueprint is the immutable business contract consumed by the Application Layer.
 */

import type {
  BusinessBlueprint,
  BusinessBlueprintMetadata,
  BusinessReasoningResult,
  BusinessEntity,
  BusinessCapability,
  BusinessProcess,
  BusinessRelationship,
  BusinessGoal,
  BusinessConstraint,
  BusinessPolicy,
  BusinessCompliance,
  BusinessIntegration,
  BusinessGovernance,
  BusinessRisk,
  BusinessKpi,
  BusinessServiceLevelAgreement,
  BusinessRequirement,
  BusinessEvidence,
  BusinessTeam,
  BusinessActor,
  BusinessRole,
  BusinessWorkflow,
  TaxonomyNode,
  BusinessOrganization,
  IndustryId,
  SemVer,
  ISODateString,
  BusinessPlanningStatus,
  BusinessImportance,
  BusinessLifecycleStatus,
} from './business-types.js';
import { BusinessRuleSeverity } from './business-types.js';

/* -------------------------------------------------------------------------- */
/*                           BLUEPRINT BUILDER                                */
/* -------------------------------------------------------------------------- */

export interface BlueprintBuilderConfig {
  readonly industry: IndustryId;
  readonly name: string;
  readonly description: string;
  readonly version: SemVer;
}

/**
 * BusinessBlueprintBuilder constructs the immutable Business Blueprint
 * from reasoning results and industry-specific data.
 */
export class BusinessBlueprintBuilder {
  private config: BlueprintBuilderConfig;
  private organizations: BusinessOrganization[] = [];
  private teams: BusinessTeam[] = [];
  private actors: BusinessActor[] = [];
  private roles: BusinessRole[] = [];
  private entities: BusinessEntity[] = [];
  private relationships: BusinessRelationship[] = [];
  private capabilities: BusinessCapability[] = [];
  private processes: BusinessProcess[] = [];
  private workflows: BusinessWorkflow[] = [];
  private policies: BusinessPolicy[] = [];
  private compliance: BusinessCompliance[] = [];
  private integrations: BusinessIntegration[] = [];
  private governance: BusinessGovernance[] = [];
  private goals: BusinessGoal[] = [];
  private kpis: BusinessKpi[] = [];
  private risks: BusinessRisk[] = [];
  private serviceLevels: BusinessServiceLevelAgreement[] = [];
  private constraints: BusinessConstraint[] = [];
  private requirements: BusinessRequirement[] = [];
  private evidence: BusinessEvidence[] = [];
  private taxonomy: TaxonomyNode[] = [];

  constructor(config: BlueprintBuilderConfig) {
    this.config = config;
  }

  /**
   * Build the final immutable Business Blueprint.
   */
  build(): BusinessBlueprint {
    const now = new Date().toISOString() as ISODateString;

    const metadata: BusinessBlueprintMetadata = {
      id: `bp-${Date.now()}` as any,
      name: this.config.name,
      description: this.config.description,
      version: this.config.version,
      status: 'draft' as BusinessPlanningStatus,
      industry: this.config.industry,
      classification: {
        industry: this.config.industry,
        domains: [],
        verticals: [],
        keywords: [],
      },
      ownership: {
        owner: 'system',
        stakeholders: [],
      },
      context: {
        locale: 'en-US' as any,
        currency: 'USD' as any,
        timezone: 'UTC' as any,
      },
      createdAt: now,
      updatedAt: now,
    };

    return {
      metadata,
      organizations: this.organizations,
      teams: this.teams,
      actors: this.actors,
      roles: this.roles,
      entities: this.entities,
      relationships: this.relationships,
      capabilities: this.capabilities,
      processes: this.processes,
      workflows: this.workflows,
      policies: this.policies,
      compliance: this.compliance,
      integrations: this.integrations,
      governance: this.governance,
      goals: this.goals,
      kpis: this.kpis,
      risks: this.risks,
      serviceLevels: this.serviceLevels,
      constraints: this.constraints,
      requirements: this.requirements,
      evidence: this.evidence,
      taxonomy: this.taxonomy,
    };
  }

  /**
   * Add organization to the blueprint.
   */
  addOrganization(org: BusinessOrganization): this {
    this.organizations.push(org);
    return this;
  }

  /**
   * Add team to the blueprint.
   */
  addTeam(team: BusinessTeam): this {
    this.teams.push(team);
    return this;
  }

  /**
   * Add actor to the blueprint.
   */
  addActor(actor: BusinessActor): this {
    this.actors.push(actor);
    return this;
  }

  /**
   * Add role to the blueprint.
   */
  addRole(role: BusinessRole): this {
    this.roles.push(role);
    return this;
  }

  /**
   * Add entity to the blueprint.
   */
  addEntity(entity: BusinessEntity): this {
    this.entities.push(entity);
    return this;
  }

  /**
   * Add relationship to the blueprint.
   */
  addRelationship(relationship: BusinessRelationship): this {
    this.relationships.push(relationship);
    return this;
  }

  /**
   * Add capability to the blueprint.
   */
  addCapability(capability: BusinessCapability): this {
    this.capabilities.push(capability);
    return this;
  }

  /**
   * Add process to the blueprint.
   */
  addProcess(process: BusinessProcess): this {
    this.processes.push(process);
    return this;
  }

  /**
   * Add workflow to the blueprint.
   */
  addWorkflow(workflow: BusinessWorkflow): this {
    this.workflows.push(workflow);
    return this;
  }

  /**
   * Add policy to the blueprint.
   */
  addPolicy(policy: BusinessPolicy): this {
    this.policies.push(policy);
    return this;
  }

  /**
   * Add compliance to the blueprint.
   */
  addCompliance(compliance: BusinessCompliance): this {
    this.compliance.push(compliance);
    return this;
  }

  /**
   * Add integration to the blueprint.
   */
  addIntegration(integration: BusinessIntegration): this {
    this.integrations.push(integration);
    return this;
  }

  /**
   * Add governance to the blueprint.
   */
  addGovernance(governance: BusinessGovernance): this {
    this.governance.push(governance);
    return this;
  }

  /**
   * Add goal to the blueprint.
   */
  addGoal(goal: BusinessGoal): this {
    this.goals.push(goal);
    return this;
  }

  /**
   * Add KPI to the blueprint.
   */
  addKpi(kpi: BusinessKpi): this {
    this.kpis.push(kpi);
    return this;
  }

  /**
   * Add risk to the blueprint.
   */
  addRisk(risk: BusinessRisk): this {
    this.risks.push(risk);
    return this;
  }

  /**
   * Add service level agreement to the blueprint.
   */
  addServiceLevel(sl: BusinessServiceLevelAgreement): this {
    this.serviceLevels.push(sl);
    return this;
  }

  /**
   * Add constraint to the blueprint.
   */
  addConstraint(constraint: BusinessConstraint): this {
    this.constraints.push(constraint);
    return this;
  }

  /**
   * Add requirement to the blueprint.
   */
  addRequirement(requirement: BusinessRequirement): this {
    this.requirements.push(requirement);
    return this;
  }

  /**
   * Add evidence to the blueprint.
   */
  addEvidence(evidence: BusinessEvidence): this {
    this.evidence.push(evidence);
    return this;
  }

  /**
   * Add taxonomy node to the blueprint.
   */
  addTaxonomyNode(node: TaxonomyNode): this {
    this.taxonomy.push(node);
    return this;
  }

  /**
   * Apply reasoning results to the blueprint.
   */
  applyReasoningResult(result: BusinessReasoningResult): this {
    // Add inferred capabilities
    for (const capId of result.inferredCapabilities) {
      // Create capability from inferred ID if not exists
      const existing = this.capabilities.find(c => c.id === capId);
      if (!existing) {
        this.capabilities.push(this.createCapabilityFromId(capId));
      }
    }

    // Add inferred processes
    for (const procId of result.inferredProcesses) {
      const existing = this.processes.find(p => p.id === procId);
      if (!existing) {
        this.processes.push(this.createProcessFromId(procId));
      }
    }

    // Add inferred constraints
    for (const constId of result.inferredConstraints) {
      const existing = this.constraints.find(c => c.id === constId);
      if (!existing) {
        this.constraints.push(this.createConstraintFromId(constId));
      }
    }

    // Add inferred policies
    for (const polId of result.inferredPolicies) {
      const existing = this.policies.find(p => p.id === polId);
      if (!existing) {
        this.policies.push(this.createPolicyFromId(polId));
      }
    }

    // Add inferred compliance
    for (const compId of result.inferredCompliance) {
      const existing = this.compliance.find(c => c.id === compId);
      if (!existing) {
        this.compliance.push(this.createComplianceFromId(compId));
      }
    }

    return this;
  }

  /* ---------------------------------------------------------------------- */
  /*                           HELPER METHODS                                */
  /* ---------------------------------------------------------------------- */

  private createCapabilityFromId(id: string): BusinessCapability {
    return {
      id: id as any,
      metadata: {
        name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Inferred capability: ${id}`,
        tags: ['inferred'],
      },
      version: { version: '1.0.0' as SemVer, createdAt: new Date().toISOString() as ISODateString, updatedAt: new Date().toISOString() as ISODateString },
      audit: { createdBy: 'system', updatedBy: 'system' },
      source: { source: 'reasoning', confidence: 0.8, evidence: [] },
      lifecycle: 'active' as BusinessLifecycleStatus,
      importance: 'medium' as BusinessImportance,
      category: 'core' as any,
      childCapabilityIds: [],
      entityIds: [],
      processIds: [],
      ownerRoleIds: [],
      dependencies: [],
      kpiIds: [],
      constraintIds: [],
    };
  }

  private createProcessFromId(id: string): BusinessProcess {
    return {
      id: id as any,
      metadata: {
        name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Inferred process: ${id}`,
        tags: ['inferred'],
      },
      version: { version: '1.0.0' as SemVer, createdAt: new Date().toISOString() as ISODateString, updatedAt: new Date().toISOString() as ISODateString },
      audit: { createdBy: 'system', updatedBy: 'system' },
      source: { source: 'reasoning', confidence: 0.8, evidence: [] },
      lifecycle: 'active' as BusinessLifecycleStatus,
      importance: 'medium' as BusinessImportance,
      processType: 'operational' as any,
      capabilityId: id as any,
      ownerRoleIds: [],
      workflowIds: [],
      inputs: [],
      outputs: [],
      businessRuleIds: [],
      integrationIds: [],
      complianceIds: [],
    };
  }

  private createConstraintFromId(id: string): BusinessConstraint {
    return {
      id: id as any,
      type: 'functional' as any,
      title: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `Inferred constraint: ${id}`,
      severity: BusinessRuleSeverity.Recommended,
    };
  }

  private createPolicyFromId(id: string): BusinessPolicy {
    return {
      id: id as any,
      metadata: {
        name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Inferred policy: ${id}`,
        tags: ['inferred'],
      },
      version: { version: '1.0.0' as SemVer, createdAt: new Date().toISOString() as ISODateString, updatedAt: new Date().toISOString() as ISODateString },
      audit: { createdBy: 'system', updatedBy: 'system' },
      source: { source: 'reasoning', confidence: 0.8, evidence: [] },
      lifecycle: 'active' as BusinessLifecycleStatus,
      importance: 'medium' as BusinessImportance,
      category: 'operations' as any,
      appliesToCapabilities: [],
      appliesToProcesses: [],
      appliesToRoles: [],
      ruleIds: [],
    };
  }

  private createComplianceFromId(id: string): BusinessCompliance {
    return {
      id: id as any,
      metadata: {
        name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Inferred compliance: ${id}`,
        tags: ['inferred'],
      },
      version: { version: '1.0.0' as SemVer, createdAt: new Date().toISOString() as ISODateString, updatedAt: new Date().toISOString() as ISODateString },
      audit: { createdBy: 'system', updatedBy: 'system' },
      source: { source: 'reasoning', confidence: 0.8, evidence: [] },
      lifecycle: 'active' as BusinessLifecycleStatus,
      importance: 'medium' as BusinessImportance,
      category: 'regulatory' as any,
      authority: 'Unknown',
      applicableCountries: [],
      policyIds: [],
      ruleIds: [],
      capabilityIds: [],
    };
  }
}
