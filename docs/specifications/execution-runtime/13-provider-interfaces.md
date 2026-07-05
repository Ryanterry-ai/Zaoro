# 13. Provider Interfaces (Adapters)

## Overview

The `SandboxProvider` interface (defined in [02-runtime-api.md](02-runtime-api.md)) is implemented by each runtime backend. This document details the contract for each provider.

## Provider Registration

```typescript
interface ProviderRegistry {
  /** Register a provider by name */
  register(name: string, provider: SandboxProvider): void;

  /** Get a provider by name */
  get(name: string): SandboxProvider;

  /** List all registered providers */
  list(): string[];

  /** Get the default provider */
  getDefault(): SandboxProvider;

  /** Check if a provider is available (healthy) */
  isAvailable(name: string): Promise<boolean>;
}

// Registration
const registry = new ProviderRegistry();
registry.register('docker', new DockerProvider());
registry.register('podman', new PodmanProvider());   // future
registry.register('kubernetes', new K8sProvider());    // future
registry.register('firecracker', new FirecrackerProvider()); // future

// Usage
const provider = registry.get('docker');
const runtime = await provider.create(spec);
```

## DockerProvider

```typescript
class DockerProvider implements SandboxProvider {
  name = 'docker';
  capabilities: ProviderCapabilities = {
    snapshots: true,      // via docker commit
    resourceLimits: true, // via docker run flags
    filesystemMount: true, // via --volume
    portMapping: true,    // via --publish
    healthChecks: true,   // via docker exec
    maxConcurrent: 50,
    environments: ['container'],
  };

  constructor(config: DockerConfig);

  async create(spec: RuntimeSpec): Promise<RuntimeInstance>;
  async start(runtimeId: string): Promise<RuntimeInstance>;
  async stop(runtimeId: string): Promise<void>;
  async destroy(runtimeId: string): Promise<void>;
  async execute(runtimeId: string, command: CommandSpec): Promise<CommandResult>;
  stream(runtimeId: string, command: CommandSpec): AsyncIterable<StreamChunk>;
  async health(runtimeId: string): Promise<HealthStatus>;
  async resourceUsage(runtimeId: string): Promise<ResourceUsage>;
  async copyIn(runtimeId: string, source: string, dest: string): Promise<void>;
  async copyOut(runtimeId: string, source: string, dest: string): Promise<void>;
  async snapshot(runtimeId: string): Promise<Snapshot>;
  async restore(snapshotId: string): Promise<RuntimeInstance>;
  async logs(runtimeId: string, options?: LogOptions): Promise<LogEntry[]>;
}

interface DockerConfig {
  /** Docker socket path */
  socketPath?: string;              // default: /var/run/docker.sock
  /** Docker host (for remote Docker) */
  host?: string;
  /** Default resource profile */
  defaultProfile?: ResourceProfile;
  /** Base image to use */
  baseImage?: string;               // default: buildsame/runtime:base
  /** Pull policy */
  pullPolicy?: 'always' | 'if-not-present' | 'never';
  /** Network name */
  networkName?: string;             // default: buildsame-network
}
```

## PodmanProvider (Future)

```typescript
class PodmanProvider implements SandboxProvider {
  name = 'podman';
  capabilities: ProviderCapabilities = {
    snapshots: true,
    resourceLimits: true,
    filesystemMount: true,
    portMapping: true,
    healthChecks: true,
    maxConcurrent: 50,
    environments: ['container'],
  };

  // Same interface as DockerProvider
  // Key differences:
  // - Rootless by default (no daemon)
  // - Uses podman socket instead of Docker socket
  // - Native cgroup v2 support
  // - No daemon restart needed
}
```

## KubernetesProvider (Future)

```typescript
class K8sProvider implements SandboxProvider {
  name = 'kubernetes';
  capabilities: ProviderCapabilities = {
    snapshots: false,      // K8s doesn't have native snapshots
    resourceLimits: true,
    filesystemMount: true,
    portMapping: true,
    healthChecks: true,
    maxConcurrent: 100,
    environments: ['pod'],
  };

  // Key differences from Docker:
  // - Creates Pod instead of Container
  // - Port mapping via ClusterIP + Ingress
  // - Resource limits via ResourceQuota
  // - Health checks via liveness/readiness probes
  // - Snapshots via VolumeSnapshot CRD
  // - Logs via kubectl logs
}

interface K8sConfig {
  kubeconfig?: string;
  namespace?: string;       // default: buildsame-runtimes
  ingressClass?: string;
  storageClass?: string;
  serviceAccount?: string;
}
```

## FirecrackerProvider (Future)

```typescript
class FirecrackerProvider implements SandboxProvider {
  name = 'firecracker';
  capabilities: ProviderCapabilities = {
    snapshots: true,         // Native microVM snapshots
    resourceLimits: true,
    filesystemMount: false,  // No bind mounts in microVMs
    portMapping: true,
    healthChecks: true,
    maxConcurrent: 20,
    environments: ['microvm'],
  };

  // Key differences:
  // - Creates microVM instead of container
  // - No filesystem mount (uses root drive + scratch drive)
  // - Files must be copied into VM image
  // - Strongest isolation (hardware-level)
  // - Fastest startup (125ms to boot)
  // - Snapshots are full VM state (memory + disk)
}
```

## Provider Selection Strategy

```typescript
function selectProvider(
  request: RuntimeRequest,
  availableProviders: ProviderRegistry
): SandboxProvider {
  const providers = availableProviders.list();

  // 1. Check explicit preference
  if (request.requirements?.provider && providers.includes(request.requirements.provider)) {
    return availableProviders.get(request.requirements.provider);
  }

  // 2. Environment-specific defaults
  if (process.env.NODE_ENV === 'development') {
    return availableProviders.get('docker');
  }

  // 3. Production: prefer strongest isolation available
  const preference = ['firecracker', 'kubernetes', 'podman', 'docker'];
  for (const name of preference) {
    if (providers.includes(name) && availableProviders.isAvailable(name)) {
      return availableProviders.get(name);
    }
  }

  // 4. Fallback to first available
  return availableProviders.get(providers[0]);
}
```

## Testing Providers

```typescript
/** Mock provider for testing */
class MockProvider implements SandboxProvider {
  name = 'mock';
  capabilities: ProviderCapabilities = {
    snapshots: true,
    resourceLimits: true,
    filesystemMount: true,
    portMapping: true,
    healthChecks: true,
    maxConcurrent: 100,
    environments: ['process'],
  };

  // In-memory runtimes for fast unit tests
  private runtimes = new Map<string, MockRuntime>();

  async create(spec: RuntimeSpec): Promise<RuntimeInstance> { /* ... */ }
  async start(runtimeId: string): Promise<RuntimeInstance> { /* ... */ }
  // ... all methods return instantly, no Docker needed
}
```
