# 10. Resource Limits

## Overview

Strict resource constraints enforced on every runtime to prevent runaway code from affecting the host or other tenants.

## Limit Profiles

```typescript
type ResourceProfile = 'preview' | 'build' | 'test' | 'repair' | 'deploy';

interface ResourceProfileConfig {
  cpu: string;       // Docker --cpus
  memory: string;    // Docker --memory
  disk: string;      // Docker --storage-opt size
  pids: number;      // Docker --pids-limit
  ulimits: UlimitConfig[];
  network: 'isolated' | 'outbound-only' | 'open';
  timeout: number;   // max execution time in ms
  maxProcesses: number;
}

const RESOURCE_PROFILES: Record<ResourceProfile, ResourceProfileConfig> = {
  preview: {
    cpu: '1.0',
    memory: '1gb',
    disk: '2gb',
    pids: 200,
    ulimits: [
      { name: 'nofile', soft: 1024, hard: 2048 },
      { name: 'nproc', soft: 200, hard: 200 },
    ],
    network: 'outbound-only',  // can fetch npm packages
    timeout: 600_000,           // 10 min (but kept alive by heartbeat)
    maxProcesses: 50,
  },
  build: {
    cpu: '2.0',
    memory: '2gb',
    disk: '4gb',
    pids: 300,
    ulimits: [
      { name: 'nofile', soft: 2048, hard: 4096 },
      { name: 'nproc', soft: 300, hard: 300 },
    ],
    network: 'outbound-only',
    timeout: 300_000,           // 5 min
    maxProcesses: 100,
  },
  test: {
    cpu: '1.0',
    memory: '2gb',
    disk: '3gb',
    pids: 300,
    ulimits: [
      { name: 'nofile', soft: 2048, hard: 4096 },
      { name: 'nproc', soft: 300, hard: 300 },
    ],
    network: 'isolated',        // test env should not have network
    timeout: 300_000,           // 5 min
    maxProcesses: 100,
  },
  repair: {
    cpu: '1.0',
    memory: '1gb',
    disk: '2gb',
    pids: 200,
    ulimits: [
      { name: 'nofile', soft: 1024, hard: 2048 },
      { name: 'nproc', soft: 200, hard: 200 },
    ],
    network: 'outbound-only',
    timeout: 120_000,           // 2 min
    maxProcesses: 50,
  },
  deploy: {
    cpu: '0.5',
    memory: '512mb',
    disk: '1gb',
    pids: 100,
    ulimits: [
      { name: 'nofile', soft: 512, hard: 1024 },
      { name: 'nproc', soft: 100, hard: 100 },
    ],
    network: 'outbound-only',
    timeout: 120_000,           // 2 min
    maxProcesses: 20,
  },
};
```

## Enforcement Layers

### 1. Container Runtime (Docker/Podman)

Primary enforcement via native container flags:

```docker
--cpus=1.0
--memory=1g
--memory-reservation=512m
--memory-swap=1g          # no swap
--pids-limit=200
--storage-opt size=2g
--ulimit nofile=1024:2048
--ulimit nproc=200:200
--network="none"          # or custom network
```

### 2. cgroups (direct)

Fallback for environments where container runtime flags are insufficient:

```bash
# CPU
echo 100000 > /sys/fs/cgroup/cpu/runtime-xxx/cpu.cfs_quota_us
echo 100000 > /sys/fs/cgroup/cpu/runtime-xxx/cpu.cfs_period_us

# Memory
echo 1073741824 > /sys/fs/cgroup/memory/runtime-xxx/memory.limit_in_bytes

# PIDs
echo 200 > /sys/fs/cgroup/pids/runtime-xxx/pids.max
```

### 3. Application-level

Inside the runtime, wrapper scripts enforce additional limits:

```bash
# Timeout
timeout 600 $COMMAND

# Disk write limit (per-process)
ionice -c 2 -n 7 $COMMAND
```

## Enforcement Actions

| Violation | Action |
|-----------|--------|
| CPU > limit for 30s | Throttle, emit warning |
| Memory > 90% of limit | Emit warning, prepare for OOM |
| Memory > limit | OOM kill, capture logs |
| Disk > limit | Write fails, emit critical event |
| PID limit hit | New processes blocked, emit warning |
| Execution timeout | SIGTERM → 5s → SIGKILL |
| Network blocked | Connection refused (isolated mode) |
| Process count > max | Oldest idle process killed |

## Overcommit Policy

| Resource | Overcommit Ratio | Notes |
|----------|-----------------|-------|
| CPU | 4:1 | Most runtimes idle waiting for I/O |
| Memory | 1.5:1 | Only for previews (builds and tests at 1:1) |
| Disk | 1:1 | Strict, no overcommit |
| PIDs | 2:1 | Only for previews |

## Host Resource Budget

| Resource | Total Budget | Reserved (OS + Engine) | Available |
|----------|-------------|----------------------|-----------|
| CPU | 8 cores | 2 cores | 6 cores |
| Memory | 16 GB | 4 GB | 12 GB |
| Disk | 100 GB | 20 GB | 80 GB |
