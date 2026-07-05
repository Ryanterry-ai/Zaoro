# 4. Provider Selection

## Overview

The Provider Selector chooses which SandboxProvider to use for each execution node. Selection considers capabilities, current load, cost, data affinity, and user preferences.

```typescript
interface ProviderSelectionConfig {
  strategies: ProviderSelectionStrategy[];
  defaultProvider: string;
  failoverOrder: string[];    // Ordered list of fallback providers
}
```

## Selection Strategies

### S1: Capability-Based

Checks provider capabilities against node requirements.

```typescript
function capabilityMatch(
  node: ExecutionNode,
  providers: SandboxProvider[]
): ProviderSelection[] {
  return providers
    .filter(p => {
      const caps = p.capabilities;
      const profile = RESOURCE_PROFILES[node.resourceProfile];

      // Must support at least one required environment
      if (profile.environment && !caps.environments.includes(profile.environment)) {
        return false;
      }

      // Must support port mapping if the node exposes a port
      if (node.kind === 'preview' && !caps.portMapping) {
        return false;
      }

      // Must support resource limits if the node specifies them
      if (node.resourceProfile && !caps.resourceLimits) {
        return false;
      }

      return true;
    })
    .map(p => ({
      provider: p.name,
      confidence: 1.0,
      reason: 'Capability match',
    }));
}
```

### S2: Load-Based

Prefers providers with lower current load.

```typescript
function loadBalance(
  node: ExecutionNode,
  providers: SandboxProvider[]
): ProviderSelection[] {
  const loadMetrics = getProviderLoadMetrics(providers);

  return providers.map(p => {
    const load = loadMetrics[p.name] ?? { running: 0, maxConcurrent: 10 };
    const utilization = load.running / load.maxConcurrent;
    const confidence = 1 - utilization;

    return {
      provider: p.name,
      confidence,
      reason: `Load: ${(utilization * 100).toFixed(0)}% utilized`,
    };
  }).sort((a, b) => b.confidence - a.confidence);
}
```

### S3: Cost-Based

Prefers providers with lower operating cost.

```typescript
interface CostConfig {
  costs: Record<string, {
    perSecond: number;      // Cost per second of execution
    perMbSecond: number;    // Cost per MB-second of memory
  }>;
}

function costOptimize(
  node: ExecutionNode,
  providers: SandboxProvider[],
  costConfig: CostConfig
): ProviderSelection[] {
  const estimatedDuration = estimateDuration(node);
  const profile = RESOURCE_PROFILES[node.resourceProfile];

  return providers.map(p => {
    const cost = costConfig.costs[p.name];
    if (!cost) return { provider: p.name, confidence: 0, reason: 'Cost data unavailable' };

    const estimatedCost =
      (estimatedDuration / 1000) * cost.perSecond +
      (parseInt(profile.memory) / 1024 / 1024) * (estimatedDuration / 1000) * cost.perMbSecond;

    return {
      provider: p.name,
      confidence: 1 / (1 + estimatedCost), // Lower cost = higher confidence
      reason: `Est. cost: $${estimatedCost.toFixed(4)}`,
    };
  }).sort((a, b) => b.confidence - a.confidence);
}
```

### S4: Affinity-Based

Prefers providers that already have the workspace data cached or the image warm.

```typescript
interface AffinityConfig {
  workspaceAffinity: boolean;     // Prefer provider where workspace exists
  imageAffinity: boolean;         // Prefer provider where image is cached
  zoneAffinity: boolean;          // Prefer provider in same zone
}

function affinityMatch(
  node: ExecutionNode,
  providers: SandboxProvider[],
  config: AffinityConfig,
  workspaceId: string
): ProviderSelection[] {
  const cacheLocations = getCacheLocations(workspaceId);

  return providers.map(p => {
    let score = 0;
    const reasons: string[] = [];

    if (config.workspaceAffinity && cacheLocations.workspace === p.name) {
      score += 0.5;
      reasons.push('Workspace cached');
    }

    if (config.imageAffinity && cacheLocations.image === p.name) {
      score += 0.3;
      reasons.push('Image cached');
    }

    return {
      provider: p.name,
      confidence: score,
      reason: reasons.join(', ') || 'No affinity',
    };
  }).sort((a, b) => b.confidence - a.confidence);
}
```

## Selection Algorithm

```typescript
function selectProvider(
  node: ExecutionNode,
  availableProviders: SandboxProvider[],
  config: ProviderSelectionConfig
): ProviderSelection {
  // 1. Filter by preferred providers (from node or user)
  const preferred = node.providerPreferences ?? [];
  const filtered = preferred.length > 0
    ? availableProviders.filter(p => preferred.includes(p.name))
    : availableProviders;

  if (filtered.length === 0) {
    // Fallback to all available providers
    return selectProvider(node, availableProviders, { ...config, strategies: config.strategies.slice(1) });
  }

  // 2. Run all strategies and aggregate scores
  const allSelections: ProviderSelection[] = [];
  for (const strategy of config.strategies) {
    const results = strategy.handler(node, filtered);
    allSelections.push(...results);
  }

  // 3. Aggregate by provider (average confidence across strategies)
  const aggregated = new Map<string, { totalConfidence: number; count: number; reasons: string[] }>();
  for (const sel of allSelections) {
    const existing = aggregated.get(sel.provider) ?? { totalConfidence: 0, count: 0, reasons: [] };
    existing.totalConfidence += sel.confidence;
    existing.count += 1;
    existing.reasons.push(sel.reason);
    aggregated.set(sel.provider, existing);
  }

  // 4. Select best provider
  let best: ProviderSelection = { provider: config.defaultProvider, confidence: 0, reason: 'Default fallback' };
  for (const [provider, agg] of aggregated) {
    const avgConfidence = agg.totalConfidence / agg.count;
    if (avgConfidence > best.confidence) {
      best = {
        provider,
        confidence: avgConfidence,
        reason: agg.reasons.join('; '),
      };
    }
  }

  return best;
}
```

## Provider Failover

If the selected provider fails to create a runtime:

```typescript
async function providerFailover(
  node: ExecutionNode,
  selected: ProviderSelection,
  config: ProviderSelectionConfig
): Promise<ProviderSelection> {
  const failoverIndex = config.failoverOrder.indexOf(selected.provider);
  const nextProvider = config.failoverOrder[failoverIndex + 1]
    ?? config.defaultProvider;

  return {
    provider: nextProvider,
    confidence: 0.5,
    reason: `Failover from ${selected.provider}`,
  };
}
```

## Provider Health Check (Pre-Selection)

Before selecting a provider, the Scheduler verifies its availability:

```typescript
interface ProviderHealthCheck {
  name: string;
  check(): Promise<{ healthy: boolean; latency: number; error?: string }>;
}

// Providers are checked every 30s
// Unhealthy providers are excluded from selection
// Providers that miss 3 consecutive health checks are marked as down
// Down providers are checked every 60s for recovery
```
