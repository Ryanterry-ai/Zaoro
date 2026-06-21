import { BuildCapability, CapabilityResult } from './types.js';

interface CapabilityDefinition {
  name: BuildCapability;
  description: string;
  requiredModules: string[];
  futureDependencies: string[];
}

const CAPABILITY_REGISTRY: CapabilityDefinition[] = [
  {
    name: 'generate-app',
    description: 'Generate a complete Next.js application from a natural language prompt',
    requiredModules: ['project-blueprint', 'business-classifier'],
    futureDependencies: ['llm-provider', 'template-engine'],
  },
  {
    name: 'generate-website',
    description: 'Generate a multi-page website from a natural language prompt',
    requiredModules: ['project-blueprint', 'business-classifier'],
    futureDependencies: ['llm-provider', 'template-engine', 'cms-connector'],
  },
  {
    name: 'clone-website',
    description: 'Clone an existing public website by analyzing its structure and content',
    requiredModules: ['website-analyzer', 'clone-plan-generator', 'business-classifier'],
    futureDependencies: ['playwright-crawler', 'asset-downloader', 'dom-extractor'],
  },
  {
    name: 'analyze-domain',
    description: 'Analyze a public website and extract structured metadata',
    requiredModules: ['website-analyzer', 'business-classifier'],
    futureDependencies: ['playwright-crawler', 'screenshot-analyzer'],
  },
  {
    name: 'extract-components',
    description: 'Extract reusable UI components from a public website',
    requiredModules: ['website-analyzer'],
    futureDependencies: ['playwright-crawler', 'dom-extractor', 'component-renderer'],
  },
  {
    name: 'extract-design-system',
    description: 'Extract design tokens (colors, fonts, spacing) from a public website',
    requiredModules: ['website-analyzer'],
    futureDependencies: ['playwright-crawler', 'screenshot-analyzer', 'color-extractor'],
  },
];

export class CapabilityRegistry {
  private capabilities: Map<BuildCapability, CapabilityDefinition>;

  constructor() {
    this.capabilities = new Map();
    for (const cap of CAPABILITY_REGISTRY) {
      this.capabilities.set(cap.name, cap);
    }
  }

  list(): CapabilityDefinition[] {
    return [...this.capabilities.values()];
  }

  get(capability: BuildCapability): CapabilityDefinition | undefined {
    return this.capabilities.get(capability);
  }

  isRegistered(capability: BuildCapability): boolean {
    return this.capabilities.has(capability);
  }

  register(definition: CapabilityDefinition): void {
    this.capabilities.set(definition.name, definition);
  }

  evaluate(capability: BuildCapability): CapabilityResult {
    const def = this.capabilities.get(capability);
    if (!def) {
      return { capability, supported: false, reason: `Capability '${capability}' is not registered.` };
    }

    const missingModules = def.requiredModules.filter(() => {
      // Architecture-only phase: modules exist as architectural contracts
      // In future phases, this will check for actual implementations
      return false;
    });

    if (missingModules.length > 0) {
      return {
        capability,
        supported: false,
        reason: `Missing required modules: ${missingModules.join(', ')}`,
      };
    }

    const hasFutureDeps = def.futureDependencies.length > 0;
    if (hasFutureDeps) {
      return {
        capability,
        supported: true,
        reason: `Architecture ready. Future dependencies pending: ${def.futureDependencies.join(', ')}`,
      };
    }

    return {
      capability,
      supported: true,
      reason: 'Fully supported with current architecture.',
    };
  }

  evaluateAll(): CapabilityResult[] {
    return [...this.capabilities.keys()].map((cap) => this.evaluate(cap));
  }
}
