import type { StageInput, CapabilityGraph, CapabilityNode, FeatureDef } from '../stages.js';

export function runCapabilityGraphStage(input: StageInput): CapabilityGraph {
  const capabilities = new Map<string, CapabilityNode>();
  const features: FeatureDef[] = [];
  const requiredIntegrations = new Set<string>();

  for (const decision of input.decisions) {
    if (decision.action.type === 'add_capability') {
      const existing = capabilities.get(decision.action.name);
      if (existing) {
        existing.features.push(...(decision.action.features ?? []));
      } else {
        capabilities.set(decision.action.name, {
          name: decision.action.name,
          category: mapCategory(decision.action.name),
          features: [...(decision.action.features ?? [])],
          priority: 'must_have',
        });
      }
    }

    if (decision.action.type === 'add_feature') {
      features.push({
        name: decision.action.name,
        capability: decision.action.capability,
        uiSections: decision.action.uiSections ?? [],
        entities: decision.action.entities ?? [],
      });
    }

    if (decision.action.type === 'add_integration') {
      requiredIntegrations.add(decision.action.name);
    }
  }

  // Derive capabilities from add_entity and add_page decisions
  for (const decision of input.decisions) {
    if (decision.action.type === 'add_entity' && !capabilities.has('Data Management')) {
      capabilities.set('Data Management', {
        name: 'Data Management',
        category: 'core',
        features: ['CRUD Operations'],
        priority: 'must_have',
      });
    }
    if (decision.action.type === 'add_page' && decision.action.path === '/dashboard' && !capabilities.has('Analytics')) {
      capabilities.set('Analytics', {
        name: 'Analytics',
        category: 'core',
        features: ['Dashboard', 'Reports'],
        priority: 'should_have',
      });
    }
  }

  // Always add auth capability
  if (!capabilities.has('Authentication')) {
    capabilities.set('Authentication', {
      name: 'Authentication',
      category: 'core',
      features: ['User Login', 'User Registration', 'Password Reset'],
      priority: 'must_have',
    });
  }

  return {
    capabilities: Array.from(capabilities.values()),
    requiredIntegrations: Array.from(requiredIntegrations),
    features,
  };
}

function mapCategory(name: string): CapabilityNode['category'] {
  const core = ['authentication', 'data management', 'user management', 'analytics', 'cms', 'payments'];
  const compliance = ['gdpr', 'hipaa', 'pci', 'accessibility'];
  const lower = name.toLowerCase();
  if (compliance.some(c => lower.includes(c))) return 'compliance';
  if (core.some(c => lower.includes(c))) return 'core';
  if (lower.includes('integration') || lower.includes('api') || lower.includes('webhook')) return 'integration';
  return 'enhancement';
}
