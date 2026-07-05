# 1. System Architecture

## Overview

The Execution Runtime is a service layer that isolates, runs, and manages generated projects. It sits between the Build Engine (orchestrator/compiler) and the underlying container runtime.

```
┌────────────────────────────────────────────────────┐
│                    Build Engine                     │
│  Orchestrator │ Compiler │ Planner │ Repair         │
└───────────────────────┬────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│              Execution Runtime Service               │
│                                                      │
│  ┌──────────┐  ┌──────┐  ┌─────┐  ┌─────────────┐  │
│  │ Runtime   │  │Worksp│  │ Port│  │ Health       │  │
│  │ Manager   │  │Mgr   │  │ Mgr │  │ Monitor      │  │
│  └────┬─────┘  └──┬───┘  └──┬──┘  └──────┬──────┘  │
│       │           │         │             │          │
│  ┌────┴───────────┴─────────┴─────────────┴──────┐  │
│  │            SandboxProvider (Interface)         │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │                               │
│  ┌────────────────────┼───────────────────────┐       │
│  │         Docker     │     Podman    │  K8s   │       │
│  │         Provider   │     Provider  │  ...   │       │
│  └────────────────────┘               └───────┘       │
└────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Container/Pod   │
              │  (isolated env)  │
              └──────────────────┘
```

## Layers

### Layer 1: Build Engine
The existing orchestrator, compiler, planner, and repair agents. They produce:
- Generated project files in a workspace directory
- Build artifacts
- Test configurations
- Deployment artifacts

### Layer 2: Execution Runtime Service
A standalone service (or integrated module) that:
1. Accepts execution requests from the Build Engine
2. Allocates resources (workspace, port, runtime container)
3. Manages lifecycle (create → start → monitor → destroy)
4. Emits structured events for every state transition
5. Enforces resource limits and security constraints

### Layer 3: SandboxProvider
An interface-adapter pattern that abstracts the underlying container technology:
- **DockerProvider**: Uses Docker SDK for local development and single-host deployments
- **PodmanProvider**: Rootless containers for secure multi-tenant setups
- **KubernetesProvider**: Pod-based execution for cluster environments
- **FirecrackerProvider**: MicroVM isolation for maximum security

### Layer 4: Execution Environment
The actual isolated environment where generated code runs:
- Container (Docker/Podman)
- Pod (Kubernetes)
- MicroVM (Firecracker)

## Service Boundaries

### Execution Runtime owns:
- Container lifecycle (create, start, stop, destroy)
- Port allocation and release
- Workspace directory mounting
- Health checking and heartbeats
- Resource limit enforcement
- Log collection
- Cleanup of idle/dead runtimes

### Execution Runtime does NOT own:
- Code generation (Build Engine)
- Project structure (Compiler)
- Business logic (Orchestrator)
- User authentication (Web UI)
- Telemetry/analytics (separate service)

## Directory Layout

```
execution-runtime/
├── src/
│   ├── index.ts                 # Service entry point
│   ├── types.ts                 # Core types and interfaces
│   ├── runtime-manager.ts       # Runtime lifecycle orchestration
│   ├── workspace-manager.ts     # Workspace mount/sync/cleanup
│   ├── port-manager.ts          # Port pool allocation
│   ├── health-monitor.ts        # Health check and heartbeat
│   ├── resource-limits.ts       # Resource constraint enforcement
│   ├── cache-manager.ts         # Build cache strategy
│   ├── cleanup-scheduler.ts     # Idle runtime cleanup
│   ├── preview-router.ts        # URL routing for previews
│   ├── providers/
│   │   ├── interface.ts         # SandboxProvider interface
│   │   ├── docker-provider.ts   # Docker implementation
│   │   ├── podman-provider.ts   # Podman implementation (future)
│   │   ├── kubernetes-provider.ts # K8s implementation (future)
│   │   └── firecracker-provider.ts # Firecracker implementation (future)
│   └── events/
│       ├── emitter.ts           # Event emission
│       └── types.ts             # Event type definitions
├── docker/
│   ├── Dockerfile.base          # Base image with Node.js, pnpm, Playwright
│   ├── Dockerfile.runtime       # Runtime container (extends base)
│   └── docker-compose.yml       # Local development
└── test/
    ├── runtime-manager.test.ts
    ├── port-manager.test.ts
    └── providers/
        └── docker-provider.test.ts
```
