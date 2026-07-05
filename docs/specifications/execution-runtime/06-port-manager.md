# 6. Port Manager

## Responsibilities

Manages a pool of host ports for runtime previews, ensuring no collisions and clean release.

```
PortManager
  ├── allocate() ──> port number
  ├── release(port) ──> void
  ├── isAvailable(port) ──> boolean
  ├── listAllocated() ──> PortAllocation[]
  └── countAvailable() ──> number
```

## Interface

```typescript
interface PortManager {
  /** Allocate the next available port */
  allocate(workspaceId?: string): Promise<PortAllocation>;

  /** Reserve a specific port */
  reserve(port: number, workspaceId: string): Promise<boolean>;

  /** Release a port back to the pool */
  release(port: number): Promise<void>;

  /** Check if a port is available */
  isAvailable(port: number): Promise<boolean>;

  /** List all current allocations */
  listAllocated(): PortAllocation[];

  /** Get pool stats */
  getStats(): PortPoolStats;

  /** Force-release all ports for a workspace */
  releaseByWorkspace(workspaceId: string): Promise<void>;
}

interface PortAllocation {
  port: number;
  workspaceId: string;
  allocatedAt: number;
  expiresAt?: number;
  releasedAt?: number;
}

interface PortPoolStats {
  total: number;
  allocated: number;
  available: number;
  utilizationPercent: number;
  allocatedPorts: number[];
}
```

## Port Pool

| Property | Value |
|----------|-------|
| Range | 3100–3999 (900 ports) |
| Allocation | Sequential with wrap-around |
| Collision check | Bind test before returning |
| Release | Explicit on destroy, or automatic on TTL |
| Persistence | In-memory with optional file-based recovery |

## Allocation Algorithm

```
1. Start from last allocated port + 1 (mod pool size)
2. Check if port is in allocatedPorts map → if yes, skip
3. Check if port is actually free (bind test on 0.0.0.0)
   → if occupied, skip
4. Mark as allocated, return
5. If no ports available after full scan → throw PoolExhaustedError
```

## Port Reuse Strategy

- Ports are released immediately on runtime destroy
- Released ports enter a 60-second cooldown before reuse (avoid TIME_WAIT)
- Workspace metadata is preserved in allocation history
