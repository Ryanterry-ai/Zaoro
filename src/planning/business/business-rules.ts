/**
 * =============================================================================
 * Build.same V3
 * Business Planning Layer - Business Rules Engine
 * =============================================================================
 * Evaluates business rules against the Business Blueprint.
 * Validates constraints, policies, compliance, and governance.
 */

import {
  BusinessRuleSeverity,
  type BusinessBlueprint,
  type BusinessConstraint,
  type BusinessPolicy,
  type BusinessCompliance,
  type BusinessValidationResult,
  type BusinessValidationIssue,
} from './business-types.js';

/* -------------------------------------------------------------------------- */
/*                           RULE EVALUATION                                  */
/* -------------------------------------------------------------------------- */

export interface RuleEvaluationContext {
  readonly blueprint: BusinessBlueprint;
  readonly timestamp: Date;
}

export interface RuleEvaluationResult {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly passed: boolean;
  readonly severity: BusinessRuleSeverity;
  readonly message: string;
}

/**
 * BusinessRulesEngine evaluates business rules against the blueprint.
 * It validates constraints, policies, compliance, and governance rules.
 */
export class BusinessRulesEngine {
  private rules: Map<string, BusinessRuleDefinition> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Evaluate all business rules against the blueprint.
   */
  evaluate(context: RuleEvaluationContext): BusinessValidationResult {
    const issues: BusinessValidationIssue[] = [];

    // Validate constraints
    const constraintIssues = this.validateConstraints(context.blueprint);
    issues.push(...constraintIssues);

    // Validate policies
    const policyIssues = this.validatePolicies(context.blueprint);
    issues.push(...policyIssues);

    // Validate compliance
    const complianceIssues = this.validateCompliance(context.blueprint);
    issues.push(...complianceIssues);

    // Validate governance
    const governanceIssues = this.validateGovernance(context.blueprint);
    issues.push(...governanceIssues);

    // Validate entity relationships
    const relationshipIssues = this.validateRelationships(context.blueprint);
    issues.push(...relationshipIssues);

    // Validate capability dependencies
    const dependencyIssues = this.validateDependencies(context.blueprint);
    issues.push(...dependencyIssues);

    return {
      valid: issues.filter(i => i.severity === BusinessRuleSeverity.Required).length === 0,
      issues,
    };
  }

  /**
   * Validate constraints against the blueprint.
   */
  private validateConstraints(blueprint: BusinessBlueprint): BusinessValidationIssue[] {
    const issues: BusinessValidationIssue[] = [];

    for (const constraint of blueprint.constraints) {
      if (!constraint.title || constraint.title.trim() === '') {
        issues.push({
          severity: BusinessRuleSeverity.Required,
          message: `Constraint ${constraint.id} is missing title`,
          location: `constraints.${constraint.id}`,
        });
      }

      if (!constraint.description || constraint.description.trim() === '') {
        issues.push({
          severity: BusinessRuleSeverity.Recommended,
          message: `Constraint ${constraint.id} is missing description`,
          location: `constraints.${constraint.id}`,
        });
      }

      if (!constraint.severity) {
        issues.push({
          severity: BusinessRuleSeverity.Recommended,
          message: `Constraint ${constraint.id} is missing severity level`,
          location: `constraints.${constraint.id}`,
        });
      }
    }

    return issues;
  }

  /**
   * Validate policies against the blueprint.
   */
  private validatePolicies(blueprint: BusinessBlueprint): BusinessValidationIssue[] {
    const issues: BusinessValidationIssue[] = [];

    for (const policy of blueprint.policies) {
      if (!policy.metadata.name || policy.metadata.name.trim() === '') {
        issues.push({
          severity: BusinessRuleSeverity.Required,
          message: `Policy ${policy.id} is missing title`,
          location: `policies.${policy.id}`,
        });
      }

      if (!policy.category) {
        issues.push({
          severity: BusinessRuleSeverity.Recommended,
          message: `Policy ${policy.id} is missing category`,
          location: `policies.${policy.id}`,
        });
      }

      if (policy.ruleIds.length === 0) {
        issues.push({
          severity: BusinessRuleSeverity.Recommended,
          message: `Policy ${policy.id} has no associated rules`,
          location: `policies.${policy.id}`,
        });
      }
    }

    return issues;
  }

  /**
   * Validate compliance against the blueprint.
   */
  private validateCompliance(blueprint: BusinessBlueprint): BusinessValidationIssue[] {
    const issues: BusinessValidationIssue[] = [];

    for (const compliance of blueprint.compliance) {
      if (!compliance.metadata.name || compliance.metadata.name.trim() === '') {
        issues.push({
          severity: BusinessRuleSeverity.Required,
          message: `Compliance ${compliance.id} is missing title`,
          location: `compliance.${compliance.id}`,
        });
      }

      if (!compliance.authority || compliance.authority.trim() === '') {
        issues.push({
          severity: BusinessRuleSeverity.Required,
          message: `Compliance ${compliance.id} is missing authority`,
          location: `compliance.${compliance.id}`,
        });
      }

      if (compliance.applicableCountries.length === 0) {
        issues.push({
          severity: BusinessRuleSeverity.Recommended,
          message: `Compliance ${compliance.id} has no applicable countries`,
          location: `compliance.${compliance.id}`,
        });
      }
    }

    return issues;
  }

  /**
   * Validate governance against the blueprint.
   */
  private validateGovernance(blueprint: BusinessBlueprint): BusinessValidationIssue[] {
    const issues: BusinessValidationIssue[] = [];

    for (const governance of blueprint.governance) {
      // Check if governance has policies
      if (governance.policies.length === 0) {
        issues.push({
          severity: BusinessRuleSeverity.Recommended,
          message: `Governance ${governance.id} has no associated policies`,
          location: `governance.${governance.id}`,
        });
      }

      // Check if governance has KPIs
      if (governance.kpis.length === 0) {
        issues.push({
          severity: BusinessRuleSeverity.Recommended,
          message: `Governance ${governance.id} has no associated KPIs`,
          location: `governance.${governance.id}`,
        });
      }
    }

    return issues;
  }

  /**
   * Validate entity relationships.
   */
  private validateRelationships(blueprint: BusinessBlueprint): BusinessValidationIssue[] {
    const issues: BusinessValidationIssue[] = [];

    for (const relationship of blueprint.relationships) {
      // Check if source entity exists
      const sourceExists = blueprint.entities.some(e => e.id === relationship.sourceEntityId);
      if (!sourceExists) {
        issues.push({
          severity: BusinessRuleSeverity.Required,
          message: `Relationship ${relationship.id} references non-existent source entity ${relationship.sourceEntityId}`,
          location: `relationships.${relationship.id}`,
        });
      }

      // Check if target entity exists
      const targetExists = blueprint.entities.some(e => e.id === relationship.targetEntityId);
      if (!targetExists) {
        issues.push({
          severity: BusinessRuleSeverity.Required,
          message: `Relationship ${relationship.id} references non-existent target entity ${relationship.targetEntityId}`,
          location: `relationships.${relationship.id}`,
        });
      }

      // Check if relationship has description
      if (!relationship.description || relationship.description.trim() === '') {
        issues.push({
          severity: BusinessRuleSeverity.Recommended,
          message: `Relationship ${relationship.id} is missing description`,
          location: `relationships.${relationship.id}`,
        });
      }
    }

    return issues;
  }

  /**
   * Validate capability dependencies.
   */
  private validateDependencies(blueprint: BusinessBlueprint): BusinessValidationIssue[] {
    const issues: BusinessValidationIssue[] = [];

    for (const capability of blueprint.capabilities) {
      for (const dependency of capability.dependencies) {
        // Check if dependency capability exists
        const dependencyExists = blueprint.capabilities.some(c => c.id === dependency.capabilityId);
        if (!dependencyExists) {
          issues.push({
          severity: BusinessRuleSeverity.Required,
          message: `Capability ${capability.id} depends on non-existent capability ${dependency.capabilityId}`,
            location: `capabilities.${capability.id}.dependencies`,
          });
        }
      }

      // Check for circular dependencies
      if (this.hasCircularDependency(capability.id, blueprint, new Set())) {
        issues.push({
          severity: BusinessRuleSeverity.Required,
          message: `Capability ${capability.id} has circular dependency`,
          location: `capabilities.${capability.id}`,
        });
      }
    }

    return issues;
  }

  /**
   * Check for circular dependencies in capability graph.
   */
  private hasCircularDependency(
    capabilityId: string,
    blueprint: BusinessBlueprint,
    visited: Set<string>
  ): boolean {
    if (visited.has(capabilityId)) {
      return true;
    }

    visited.add(capabilityId);

    const capability = blueprint.capabilities.find(c => c.id === capabilityId);
    if (!capability) {
      return false;
    }

    for (const dependency of capability.dependencies) {
      if (this.hasCircularDependency(dependency.capabilityId, blueprint, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Register default business rules.
   */
  private registerDefaultRules(): void {
    // Rule: All entities must have at least one field
    this.registerRule({
      id: 'entity-must-have-fields',
      name: 'Entity must have fields',
      description: 'Every entity must have at least one field defined',
      severity: BusinessRuleSeverity.Required,
      evaluate: (blueprint) => {
        const issues: BusinessValidationIssue[] = [];
        for (const entity of blueprint.entities) {
          if (entity.fields.length === 0) {
            issues.push({
              severity: BusinessRuleSeverity.Required,
              message: `Entity ${entity.id} has no fields defined`,
              location: `entities.${entity.id}`,
            });
          }
        }
        return issues;
      },
    });

    // Rule: Capabilities must have owner roles
    this.registerRule({
      id: 'capability-must-have-owners',
      name: 'Capability must have owner roles',
      description: 'Every capability must have at least one owner role',
      severity: BusinessRuleSeverity.Recommended,
      evaluate: (blueprint) => {
        const issues: BusinessValidationIssue[] = [];
        for (const capability of blueprint.capabilities) {
          if (capability.ownerRoleIds.length === 0) {
            issues.push({
              severity: BusinessRuleSeverity.Recommended,
              message: `Capability ${capability.id} has no owner roles`,
              location: `capabilities.${capability.id}`,
            });
          }
        }
        return issues;
      },
    });

    // Rule: Processes must have capability
    this.registerRule({
      id: 'process-must-have-capability',
      name: 'Process must have capability',
      description: 'Every process must be associated with a capability',
      severity: BusinessRuleSeverity.Required,
      evaluate: (blueprint) => {
        const issues: BusinessValidationIssue[] = [];
        for (const process of blueprint.processes) {
          if (!process.capabilityId) {
            issues.push({
              severity: BusinessRuleSeverity.Required,
              message: `Process ${process.id} has no associated capability`,
              location: `processes.${process.id}`,
            });
          }
        }
        return issues;
      },
    });
  }

  /**
   * Register a custom business rule.
   */
  registerRule(rule: BusinessRuleDefinition): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Get all registered rules.
   */
  getRules(): BusinessRuleDefinition[] {
    return Array.from(this.rules.values());
  }
}

/* -------------------------------------------------------------------------- */
/*                           RULE DEFINITIONS                                 */
/* -------------------------------------------------------------------------- */

export interface BusinessRuleDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: BusinessRuleSeverity;
  readonly evaluate: (blueprint: BusinessBlueprint) => BusinessValidationIssue[];
}
