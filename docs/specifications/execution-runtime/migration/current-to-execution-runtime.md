# Migration: Current Implementation → Execution Runtime

## Current Architecture

```
server.ts
  ├── POST /api/workspace/:id/build
  │     → build-queue.ts (inline job queue)
  │       → deterministic-orchestrator-v4.ts (generates files)
  │       → write files to sandbox_workspaces/{id}/
  │       → inline npm install via child_process.exec()
  │       → sandbox/engine.ts (Docker-based preview)
  │       → health check via polling GET
  │       → preview-cache-{id}.html (static preview)
  │
  ├── GET /api/workspace/:id/events
  │     → SSE stream from ProgressEmitter (file-based)
  │
  └── GET /api/workspace/:id/preview
        → returns preview-cache-{id}.html
```

## Current Pain Points

| Problem | Current Behavior | Root Cause |
|---------|-----------------|------------|
| 502/530 preview errors | Cloudflare tunnel to engine fails | Tunnel URL changes on restart, env var stale |
| Single concurrent build | `running:1` blocks queue | Simple in-memory queue, no concurrent container management |
| No cleanup | Containers/processes accumulate | No TTL, no idle detection, no cleanup scheduler |
| No resource limits | Generated code runs without constraints | No cgroup limits on Docker containers |
| No health monitoring | Dead containers not detected | No health check loop |
| Preview through tunnel | Latency + reliability issues | No local preview router |
| Hardcoded port 3001 | Single preview only | No port pool |
| File-based progress | Race conditions on concurrent reads | No event bus |

## Migration Steps

### Step 1: Create Execution Runtime package (Phase 1-2)
- Add `src/execution-runtime/` directory
- Define all interfaces
- Implement RuntimeManager with MockProvider
- Keep existing code untouched

### Step 2: Feature flag
```typescript
// In .env
USE_EXECUTION_RUNTIME=false  // toggle when ready
```

### Step 3: Wire RuntimeManager into build pipeline (Phase 5)

```
Before:                         After:
server.ts                       server.ts
  POST /build                     POST /build
    → build-queue.ts                → build-queue.ts
    → orchestrator                    → orchestrator
    → sandbox/engine.ts              → execution-runtime/
                                       → RuntimeManager
                                       → DockerProvider
                                       → HealthMonitor
                                       → PreviewRouter
```

### Step 4: Replace endpoints

| Current Endpoint | New Endpoint | When |
|-----------------|-------------|------|
| `GET /api/workspace/:id/preview` | `GET /p/:runtimeId` (PreviewRouter) | Phase 5 |
| `GET /api/workspace/:id/events` (file-based) | `GET /api/runtime/:id/events` (event bus) | Phase 5 |
| `POST /api/workspace/:id/build` (inline) | BullMQ queue + RuntimeManager | Phase 4-5 |
| `GET /api/queue/status` (in-memory) | BullMQ queue stats | Phase 4 |

### Step 5: Remove old code

```
Remove:
  src/sandbox/engine.ts
  src/core/progress-emitter.ts (replaced by event emitter)
  src/engine/build-queue.ts (replaced by BullMQ)
  src/server.ts preview/preview-proxy logic
  web/src/app/api/workspace/[id]/events/route.ts (replaced)
  web/src/app/api/workspace/[id]/inspect/route.ts (replaced)
  preview-cache-* files
  start-tunnel.bat (replaced by PreviewRouter)
  tunnel-output.log
```

### Step 6: Deploy without tunnel

```
Before:
  Engine (port 3001) → Cloudflare Tunnel → Vercel (preview.build.same.vercel.app)

After:
  Engine (port 3001, including PreviewRouter) → Vercel (preview.build.same.vercel.app)
  Preview router on engine: GET /p/{runtimeId} → localhost:{port} → preview
  No tunnel needed for previews
```

## Migration Order

```
Week 1: Specification freeze + Phase 1 (interfaces)
Week 2: Phase 2 (RuntimeManager + Port + Workspace managers)
Week 3: Phase 3 (DockerProvider)
Week 4: Phase 4 (BullMQ queues)
Week 5: Phase 5 (preview lifecycle + wire into server.ts)
  → At this point, the tunnel + 502 errors can be eliminated
Week 6: Phase 6-7 (health monitoring, cache)
Week 7-8: Phase 8-9 (runners, hardening)
```

## Verification After Each Phase

```bash
# Phase 1: Types compile
npx tsc --noEmit

# Phase 2: Unit tests pass
npx vitest run src/execution-runtime/

# Phase 3: Docker integration test
npx tsx src/execution-runtime/test/integration/docker-provider.test.ts

# Phase 4: Queue integration
npx tsx src/execution-runtime/test/integration/queue.test.ts

# Phase 5: Full E2E
curl http://localhost:3001/api/create -d '{"prompt":"Test"}'
curl http://localhost:3001/api/workspace/{id}/build -X POST
curl http://localhost:3001/p/{runtimeId}  # should return HTML

# Phase 6-9: Existing test suite
npm test  # 301/301 should still pass
```
