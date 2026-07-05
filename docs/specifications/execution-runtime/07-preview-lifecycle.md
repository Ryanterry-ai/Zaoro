# 7. Preview Lifecycle

## Overview

The complete lifecycle of a preview runtime, from generated files to a live preview URL.

```
Generated Files
      │
      ▼
Workspace Manager ──> mount project
      │
      ▼
Runtime Manager ──> create runtime (port + workspace + limits)
      │
      ▼
npm install ──> install dependencies
      │
      ▼
next dev ──> start dev server
      │
      ▼
Health Check ──> poll until / responds 200
      │
      ▼
Preview Ready ──> URL available: preview.build.same/ws-xxx
      │
      ▼
Heartbeat ──> every 30s
      │
      ▼
Idle Timeout (30 min) or User Close
      │
      ▼
Destroy ──> stop container, release port, clean workspace
```

## Stage Details

### Stage 1: Mount Workspace

```
Input:  generated files at /workspaces/ws-xxx/src
Output: runtime has /app mounted to /workspaces/ws-xxx/src
```

Mount as bind mount for Docker, copy for Firecracker. The target is always `/app` inside the runtime.

### Stage 2: Install Dependencies

```
Command: npm install (or pnpm install)
Working Dir: /app
Timeout: 120s
```

Cache: `node_modules/` is cached by the Cache Manager (see [cache-strategy.md](12-cache-strategy.md)). If a cached `node_modules/` exists for the same dependency set, it is linked/symlinked instead of running install.

### Stage 3: Start Dev Server

```
Command: npx next dev --port 3000
Working Dir: /app
Timeout: 60s to become healthy
```

The dev server always runs on port 3000 inside the container. The Port Manager allocates a host port that maps to container port 3000.

### Stage 4: Health Check

```
Poll: GET http://localhost:{hostPort}/
Interval: 2s
Max Attempts: 30 (60s total)
Expected: HTTP 200
```

Once the health check passes, the preview is marked `ready` and the URL is exposed.

### Stage 5: Active Preview

- Preview URL format: `https://preview.build.same/p/{runtimeId}`
- Heartbeat every 30s from the web UI
- If no heartbeat for 5 minutes → mark as idle

### Stage 6: Destroy

Triggered by:
- 30 min idle timeout
- User closes workspace page
- Engine shutdown
- Out-of-memory/resource limit hit

```
1. Send SIGTERM to next dev (graceful)
2. Wait 5s
3. Send SIGKILL if still running
4. Provider.destroy()
5. PortManager.release(port)
6. WorkspaceManager.unmount(workspaceId)
7. CleanupScheduler.unschedule(runtimeId)
```

## Timeline

```
0s      Generate files
1s      Mount workspace
2s      Create runtime
3s      npm install
35s     Install complete
36s     next dev
55s     Health check passes
56s     Preview URL active
56s+    Heartbeat every 30s
~30min  Idle → destroy (if no activity)
```
