# 17. Implementation Roadmap

## Phased Plan

### Phase 0: Specification (this document)
**Duration: 1-2 days | No code**

- [x] Architecture specification
- [x] Runtime API interfaces
- [x] State machine
- [x] Provider interfaces
- [x] Sequence diagrams
- [ ] **Peer review and freeze spec**

### Phase 1: Runtime API (Interfaces Only)
**Duration: 1 day | Code: interfaces + types**

```
New files:
  src/execution-runtime/
    ├── types.ts                    # All TypeScript interfaces
    ├── providers/
    │   └── interface.ts            # SandboxProvider + ProviderRegistry
    └── events/
        └── types.ts                # Event types and emitter interface
```

**Deliverable**: TypeScript compiles, all interfaces and types defined, no implementation.

### Phase 2: Runtime Manager (Orchestration Only)
**Duration: 2 days | Code: orchestration without Docker**

```
New files:
  src/execution-runtime/
    ├── runtime-manager.ts          # RuntimeManager class
    ├── port-manager.ts              # PortManager class
    ├── workspace-manager.ts         # WorkspaceManager class
    ├── warm-pool.ts                 # WarmPool class
    ├── cleanup-scheduler.ts         # CleanupScheduler class
    └── index.ts                     # Service entry point
```

**Deliverable**: RuntimeManager accepts requests, allocates ports, manages workspace paths, schedules cleanup — all in-memory. `request()` returns a RuntimeInstance but fails at `provider.create()` since no provider is registered yet. All tests pass with MockProvider.

### Phase 3: Docker Provider
**Duration: 2-3 days | Code: Docker integration**

```
New files:
  src/execution-runtime/
    ├── providers/
    │   ├── docker-provider.ts      # DockerProvider class
    │   └── docker-config.ts        # Docker configuration
    └── docker/
        ├── Dockerfile.base
        ├── Dockerfile.runtime
        └── docker-compose.yml
```

**Deliverable**: `request()` → Docker container running, port mapped, workspace mounted. Can execute `npm install`, `next dev`, and health check succeeds.

### Phase 4: Queue Integration (BullMQ)
**Duration: 2 days | Code: Redis + BullMQ**

```
New files:
  src/execution-runtime/
    ├── queues/
    │   ├── queue-manager.ts         # BullMQ queue setup
    │   ├── planning-queue.ts
    │   ├── build-queue.ts
    │   ├── preview-queue.ts
    │   ├── repair-queue.ts
    │   ├── test-queue.ts
    │   └── deploy-queue.ts
    └── workers/
        ├── planning-worker.ts
        ├── build-worker.ts
        ├── preview-worker.ts
        └── repair-worker.ts
```

**Deliverable**: Full queue pipeline with Redis-backed retries, job dependencies, and stalled job detection. Web UI shows queue status.

### Phase 5: Preview Lifecycle
**Duration: 2 days | Code: full preview pipeline**

```
New files:
  src/execution-runtime/
    ├── preview-router.ts            # URL routing
    └── lifecycle/
        └── preview-lifecycle.ts     # Preview state machine
```

**Modifications**:
- Wire RuntimeManager into existing orchestrator pipeline
- Replace current inline Docker logic in `server.ts` and `build-queue.ts` with Execution Runtime calls
- Integrate SSE event stream with existing ProgressEmitter

**Deliverable**: Full end-to-end: prompt → build → container → npm install → next dev → health check → preview URL → user sees live site. Current 502/530 errors resolved.

### Phase 6: Health Monitor + Resource Limits
**Duration: 1-2 days | Code: monitoring**

```
New files:
  src/execution-runtime/
    ├── health-monitor.ts            # Health check loop
    ├── resource-limits.ts           # Limit enforcement
    ├── log-collector.ts             # Log pipeline
    └── metrics.ts                   # Prometheus metrics
```

**Modifications**: Wire health checks into RuntimeManager, enforce resource limits on container creation, add cleanup on health failure.

### Phase 7: Cache Layer
**Duration: 1 day | Code: caching**

```
New files:
  src/execution-runtime/
    └── cache-manager.ts             # Dependency + build + binary cache
```

**Modifications**: Cache checks in preview/ build lifecycle. npm install skipped on cache hit.

### Phase 8: Test + Repair + Deploy Runners
**Duration: 2-3 days | Code: additional runners**

```
New files:
  src/execution-runtime/
    ├── runners/
    │   ├── playright-runner.ts
    │   ├── lighthouse-runner.ts
    │   ├── repair-runner.ts
    │   └── deploy-runner.ts
    └── validation/
        ├── ts-checker.ts
        ├── eslint-runner.ts
        └── accessibility-audit.ts
```

**Deliverable**: Playwright tests, Lighthouse audits, self-healing repair, and deployment validation all execute inside isolated runtimes.

### Phase 9: Production Hardening
**Duration: 2-3 days | Code: security, monitoring, reliability**

```
Modifications to:
  - Security model enforcement (seccomp, AppArmor)
  - Network isolation
  - Graceful shutdown
  - Backup/restore
  - Prometheus metrics dashboard
  - Grafana dashboards
  - Error budget monitoring
```

## Current State vs. Target

| Capability | Current | Target (End of Phase 5) | Target (End of Phase 9) |
|-----------|---------|------------------------|------------------------|
| Container management | Single inline Docker call in `server.ts` | Full lifecycle via RuntimeManager | Full lifecycle + warm pool |
| Port allocation | Hardcoded 3001 | PortManager (3100-3999) | PortManager + collision prevention |
| Workspace mounting | `sandbox_workspaces/` directory | WorkspaceManager mount/sync | Snapshot/restore |
| npm install | Inline in build script | Queued via preview queue | Cached (skip if lockfile unchanged) |
| Health checks | None | HealthMonitor (30s interval) | HealthMonitor + Prometheus |
| Resource limits | None | cgroup limits per profile | Hardened with seccomp + AppArmor |
| Cleanup | Manual / process death | CleanupScheduler (30 min TTL) | Scheduler + forced reclaim |
| Preview URLs | Tunnel URL (cloudflared) | PreviewRouter (preview.build.same/p/xxx) | Same + custom domains |
| Queue | Simple in-memory array (build-queue.ts) | BullMQ with Redis | Same + prioritization |
| Logs | console.log | Structured JSON logs | Log pipeline + ELK |
| Provider | Docker only | DockerProvider | Docker + Podman + K8s + Firecracker |

## Migration Strategy

The current implementation uses inline Docker calls in `src/sandbox/engine.ts` and `src/server.ts`. Migration to the Execution Runtime should be done incrementally:

1. **Phase 1-2**: Build the Execution Runtime service alongside existing code (no changes to existing code)
2. **Phase 3**: Add DockerProvider, run integration tests in parallel with existing Docker calls
3. **Phase 5**: Swap the build-preview pipeline to use Execution Runtime:
   - Replace `src/sandbox/engine.ts` with RuntimeManager calls
   - Replace inline Docker logic in `server.ts`
   - Wire SSE events from new event system
4. **Phase 6+**: Remove old Docker code, old build-queue.ts, old preview cache logic

## Rollback Plan

If any phase causes regression:
1. Keep old code paths as fallback (feature flag: `USE_LEGACY_RUNTIME=true`)
2. The old `src/sandbox/engine.ts` remains untouched until Phase 9
3. Each phase is independently verifiable (all tests must pass before moving on)
