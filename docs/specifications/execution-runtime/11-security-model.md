# 11. Security Model

## Principles

1. **Default deny**: Everything is blocked unless explicitly allowed
2. **Least privilege**: Runtimes get only what they need to execute
3. **No host access**: Generated code never touches host resources
4. **Defense in depth**: Multiple layers of isolation
5. **Auditability**: Every access attempt is logged

## Security Layers

```
Layer 1: Container Isolation
  ─────────────────────────────
  - Namespace isolation (PID, network, mount, user, IPC, UTS)
  - No privileged mode
  - No Docker socket mount
  - Read-only root filesystem
  - Drop all capabilities

Layer 2: Kernel Security
  ─────────────────────────────
  - Seccomp profile (default Docker + custom denylist)
  - AppArmor profile (custom)
  - No new privileges
  - cgroup device whitelist

Layer 3: Network Isolation
  ─────────────────────────────
  - Isolated network by default
  - Outbound-only for package downloads
  - DNS allow-list (registry.npmjs.org, etc.)
  - No inbound except mapped preview port

Layer 4: Resource Isolation
  ─────────────────────────────
  - cgroup CPU/memory/PID limits
  - Disk quota
  - Execution timeout
  - Process count limit

Layer 5: Filesystem Isolation
  ─────────────────────────────
  - Read-only root filesystem
  - Writable /tmp (tmpfs, size-limited)
  - Writable /app (workspace mount, size-limited)
  - No host paths accessible
  - No Docker socket
```

## Container Security Configuration

```typescript
const SECURITY_CONFIG: SecurityConfig = {
  // Privilege
  privileged: false,
  allowDockerSocket: false,
  allowSSH: false,
  allowHostFS: false,

  // Root filesystem
  readOnlyRoot: true,
  writableTmpfs: '/tmp:size=100M,noexec,nosuid,nodev',
  writableVolume: '/app:size=2G',

  // Capabilities (drop all, add only what's needed)
  capabilities: {
    drop: ['ALL'],
    add: [],  // none needed for Next.js dev server
  },

  // Seccomp
  seccompProfile: 'runtime-seccomp.json',

  // AppArmor
  appArmorProfile: 'runtime-apparmor',

  // No new privileges
  noNewPrivileges: true,
};
```

## Seccomp Profile

Custom seccomp profile that blocks dangerous syscalls while allowing normal Node.js operation.

```json
{
  "defaultAction": "SCMP_ACT_ALLOW",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "acct",
        "add_key",
        "bpf",
        "clock_adjtime",
        "clock_settime",
        "create_module",
        "delete_module",
        "finit_module",
        "get_kernel_syms",
        "get_mempolicy",
        "init_module",
        "ioperm",
        "iopl",
        "kexec_file_load",
        "kexec_load",
        "keyctl",
        "lookup_dcookie",
        "mbind",
        "mount",
        "move_pages",
        "name_to_handle_at",
        "nfsservctl",
        "open_by_handle_at",
        "perf_event_open",
        "personality",
        "pivot_root",
        "process_vm_readv",
        "process_vm_writev",
        "ptrace",
        "query_module",
        "reboot",
        "request_key",
        "set_mempolicy",
        "setns",
        "swapoff",
        "swapon",
        "sysfs",
        "umount",
        "umount2",
        "unshare",
        "uselib",
        "userfaultfd",
        "ustat",
        "vm86",
        "vm86old"
      ],
      "action": "SCMP_ACT_ERRNO"
    }
  ]
}
```

## AppArmor Profile

```
profile runtime-profile flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/lwm>

  # Deny dangerous operations
  deny /var/run/docker.sock rw,
  deny /proc/sys/** w,
  deny capability:sys_admin,
  deny capability:sys_module,
  deny capability:sys_ptrace,
  deny capability:sys_rawio,

  # Allow normal Node.js operations
  /app/** rw,
  /tmp/** rw,
  /usr/** r,
  /opt/** r,
  /bin/** ix,
  /usr/bin/** ix,

  # Network (allow npm install and next dev)
  network tcp,
  network udp,
}
```

## Network Isolation

```typescript
interface NetworkIsolationConfig {
  // Default: completely isolated (no network at all)
  default: {
    mode: 'isolated';
    inbound: false;
    outbound: false;
  };

  // Preview: outbound only, needed for npm install
  preview: {
    mode: 'outbound-only';
    inbound: false;
    outbound: true;
    allowedDomains: [
      'registry.npmjs.org',
      '*.npmjs.org',
      'github.com',
      'raw.githubusercontent.com',
      'objects.githubusercontent.com',
      'codeload.github.com',
    ];
    blockedDomains: [
      '169.254.169.254',  // metadata endpoints
      '127.0.0.1:2375',   // Docker socket
      '*.internal',
      '10.*',
      '172.16.*',
      '192.168.*',
    ];
  };

  // Test: no network at all
  test: {
    mode: 'isolated';
    inbound: false;
    outbound: false;
  };
}
```

## Docker Socket Protection

- Docker socket is NEVER mounted inside a runtime
- Docker socket path is blocked by seccomp (`/var/run/docker.sock`)
- Docker API port (2375) is blocked by network rules
- Runtime cannot create sibling containers

## Supply Chain Protection

- npm packages are fetched with integrity checks (lockfile)
- Base images are pinned by digest, not tag
- All images are scanned for vulnerabilities on build
- Only approved base images can be used

## Audit Logging

All security-relevant events are logged:

```typescript
interface SecurityEvent {
  type: 'security.violation' | 'security.attempt_blocked';
  runtimeId: string;
  category: 'capability' | 'network' | 'filesystem' | 'process' | 'syscall';
  detail: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
}
```

## Prohibited Operations

| Operation | Blocked By |
|-----------|-----------|
| Mount Docker socket | Seccomp + AppArmor |
| Access host filesystem | Read-only root + no host bind mounts |
| Spawn privileged process | Dropped capabilities |
| Modify cgroup settings | Seccomp + cgroup namespace |
| Network scanning | Isolated network |
| Cryptomining | Resource limits + seccomp |
| Fork bomb | PID limit |
| Disk fill | Disk quota |
| Container escape | Multiple isolation layers |
| SSH/RCE | No SSH server, no inbound network |
