# Execution Runtime Specification

The execution layer of Build.same — runtime-agnostic infrastructure for running generated applications, executing tests, running audits, and performing deployment validation in isolated environments.

## Scope

The Execution Runtime manages the full lifecycle of generated projects:

- **Preview**: Run `next dev` and surface a live URL
- **Build**: Run `next build` and capture output
- **Testing**: Execute Playwright, Lighthouse, and accessibility audits
- **Repair**: Self-healing compilation loops
- **Deployment Validation**: Verify deploy-ready artifacts
- **Future CI/CD**: Any isolated task execution

## Design Principles

1. **Runtime-agnostic provider model**: Docker today, Podman/Kubernetes/Firecracker later — no engine code changes
2. **No host access**: Generated code never touches the host filesystem, Docker socket, or network
3. **Resource-bounded**: Strict cgroup limits enforced at every level
4. **Warm pooling**: Pre-provisioned containers reduce startup from 30s to 3-5s
5. **Self-cleaning**: Idle runtimes are destroyed after configurable TTL
6. **Observable by design**: Every state transition emits typed events
7. **Portable workspaces**: Workspaces can be mounted, snapshotted, and replayed

## Specification Documents

| Document | Description |
|----------|-------------|
| [01-architecture.md](01-architecture.md) | System architecture, layers, component boundaries |
| [02-runtime-api.md](02-runtime-api.md) | `SandboxProvider` interface, types, contracts |
| [03-state-machine.md](03-state-machine.md) | Runtime states, transitions, events |
| [04-runtime-manager.md](04-runtime-manager.md) | Lifecycle orchestration, allocation strategy |
| [05-workspace-manager.md](05-workspace-manager.md) | Workspace mount, sync, cleanup, snapshot |
| [06-port-manager.md](06-port-manager.md) | Port pool allocation, release, collision prevention |
| [07-preview-lifecycle.md](07-preview-lifecycle.md) | Generated files → install → dev → health → destroy |
| [08-queue-architecture.md](08-queue-architecture.md) | BullMQ queues: Planning, Build, Preview, Repair, Test, Deploy |
| [09-health-monitor.md](09-health-monitor.md) | CPU/RAM/port/heartbeat/timeout monitoring |
| [10-resource-limits.md](10-resource-limits.md) | cgroup constraints, enforcement, overcommit policy |
| [11-security-model.md](11-security-model.md) | Sandboxing, seccomp, AppArmor, network isolation |
| [12-cache-strategy.md](12-cache-strategy.md) | Layer caching, node_modules, binary cache |
| [13-provider-interfaces.md](13-provider-interfaces.md) | Docker/Podman/K8s/Firecracker adapter contracts |
| [14-sequence-diagrams.md](14-sequence-diagrams.md) | Key flow sequence diagrams |
| [15-events-logging.md](15-events-logging.md) | Event schema, log pipeline, structured output |
| [16-extensibility.md](16-extensibility.md) | Future provider integration points |
| [17-implementation-roadmap.md](17-implementation-roadmap.md) | Phased implementation plan |

## Status

**Frozen** — v1.0.0. Approved for implementation.
