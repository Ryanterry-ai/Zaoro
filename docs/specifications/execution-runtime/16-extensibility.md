# 16. Extensibility

## Provider Extension Points

Adding a new runtime provider requires implementing exactly one interface:

```typescript
// Step 1: Implement SandboxProvider
class MyCustomProvider implements SandboxProvider { ... }

// Step 2: Register it
registry.register('my-custom', new MyCustomProvider());

// Step 3: Use it
const provider = registry.get('my-custom');
const runtime = await provider.create(spec);
```

No changes needed to:
- Runtime Manager
- Workspace Manager
- Port Manager
- Health Monitor
- Queue system
- Preview Router

## Custom Provider Checklist

```markdown
- [ ] Implement SandboxProvider interface (12 methods)
- [ ] Define ProviderCapabilities (which features are supported)
- [ ] Handle create/start/stop/destroy lifecycle
- [ ] Handle execute() with timeout and output capture
- [ ] Handle resource usage reporting (if supported)
- [ ] Handle log collection (docker logs equivalent)
- [ ] Handle snapshot/restore (if supported)
- [ ] Handle health checks (if supported)
- [ ] Handle port mapping (if supported)
- [ ] Handle workspace mounting (if supported)
- [ ] Add proper error handling for all methods
- [ ] Register in ProviderRegistry
- [ ] Add config validation
- [ ] Write integration tests
```

## Adding New Queue Types

```typescript
// Step 1: Define queue config
QUEUES['security-scan'] = {
  name: 'security-scan',
  concurrency: 1,
  retries: 0,
  backoff: 'exponential',
  ttl: 300_000,
  stalledTimeout: 120_000,
};

// Step 2: Create worker
const worker = new Worker('security-scan', async (job) => {
  const runtimeId = await runtimeManager.request({ type: 'security-scan', ... });
  await provider.execute(runtimeId, { command: ['npx', 'audit'] });
});

// Step 3: Use in pipeline
build.queue({ ... })
  .then(() => securityScan.queue({ workspaceId }))
  .then(() => deploy.queue({ workspaceId }));
```

No changes needed to the Execution Runtime itself — the new queue is a consumer of the existing RuntimeManager API.

## Adding New Runner Types

The Execution Runtime can execute anything. New runners just use the existing API:

```typescript
// Example: Lighthouse Runner
async function runLighthouse(workspaceId: string): Promise<LighthouseReport> {
  const runtime = await runtimeManager.request({
    id: `lh-${workspaceId}`,
    workspaceId,
    type: 'test',
    projectPath: `/workspaces/${workspaceId}`,
  });

  await provider.execute(runtime.id, {
    command: ['npx', 'lighthouse', 'http://localhost:3000', '--output=json'],
  });

  const { stdout } = await provider.execute(runtime.id, {
    command: ['cat', '/app/lighthouse-report.json'],
  });

  await runtimeManager.release(runtime.id);
  return JSON.parse(stdout);
}
```

## Adding Validation/Repair Steps

```typescript
// Example: TypeScript Error Repairer
async function repairTypescript(workspaceId: string, errors: TSError[]): Promise<boolean> {
  const runtime = await runtimeManager.request({
    id: `repair-${workspaceId}`,
    workspaceId,
    type: 'repair',
    projectPath: `/workspaces/${workspaceId}`,
  });

  // Apply fixes
  for (const error of errors) {
    await provider.execute(runtime.id, {
      command: ['sed', '-i', error.fix, error.file],
    });
  }

  // Re-check
  const result = await provider.execute(runtime.id, {
    command: ['npx', 'tsc', '--noEmit'],
  });

  await runtimeManager.release(runtime.id);
  return result.exitCode === 0;
}
```

## Future Provider Ideas

| Provider | Use Case | Isolation Level | Startup Time |
|----------|----------|----------------|--------------|
| **Docker** | Local dev, single-tenant | Container | 1-2s |
| **Podman** | Rootless multi-tenant | Container (rootless) | 1-2s |
| **Kubernetes** | Cluster-scale multi-tenant | Pod | 5-10s |
| **Firecracker** | Security-critical workloads | MicroVM | 125ms |
| **gVisor** | Additional security layer (inside container) | Sandboxed kernel | 1-2s |
| **WASM** | Lightweight function execution | WebAssembly sandbox | <10ms |
| **AWS Lambda** | Serverless execution | Function | <100ms (warm) |

## Changing the Base Image

```dockerfile
# docs/execution-runtime/docker/Dockerfile.base
FROM node:20-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install Playwright with Chromium (for tests + Lighthouse)
RUN npx playwright install chromium --with-deps

# Install common build tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Prisma (pre-installed for faster init)
RUN npm install -g prisma

# Set working directory
WORKDIR /app

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

LABEL maintainer="build.same" \
      description="Base runtime image for executing generated applications"
```

## Configuration Extensibility

```typescript
// Configuration is extensible via:
// 1. Config file (execution-runtime.yaml)
// 2. Environment variables
// 3. Provider-specific config

interface ExecutionRuntimeConfig {
  // General
  portRange: [number, number];         // default: [3100, 3999]
  defaultProfile: ResourceProfile;
  warmPool: boolean;
  cacheEnabled: boolean;

  // Provider selection
  defaultProvider: string;
  providers: {
    docker?: DockerConfig;
    podman?: PodmanConfig;
    kubernetes?: K8sConfig;
    firecracker?: FirecrackerConfig;
  };

  // Queues
  redis: {
    host: string;
    port: number;
    password?: string;
  };

  // Monitoring
  healthCheckInterval: number;
  heartbeatTimeout: number;
  idleTimeout: number;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logRetentionDays: number;
}
```
