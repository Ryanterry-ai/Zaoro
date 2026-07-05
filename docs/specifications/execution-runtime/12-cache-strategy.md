# 12. Cache Strategy

## Overview

Multi-level caching to eliminate redundant operations across build runs.

```
CacheManager
  ├── dependencyCache   (node_modules, .pnpm-store)
  ├── buildCache        (.next, .turbo)
  ├── binaryCache       (Playwright browsers, Chromium)
  ├── layerCache        (Docker image layers, base image)
  └── fileHashCache     (mtime + hash for sync optimization)
```

## Cache Types

### 1. Dependency Cache

```typescript
interface DependencyCache {
  /** Cached node_modules per dependency hash */
  get(depHash: string): Promise<string | null>;
  set(depHash: string, nodeModulesPath: string): Promise<void>;
  invalidate(depHash: string): Promise<void>;

  /** Dependency hash strategy */
  hashAlgorithm: 'content-hash' | 'lockfile-hash' | 'manifest-hash';
}

// Strategy: hash package.json + package-lock.json
// Key format: deps:{sha256(lockfile)}
// Storage: Host path /cache/deps/{hash}/node_modules
// TTL: 7 days since last use
// Invalidation: When lockfile changes
```

Implementation:

- On npm install completion, compute `sha256(package-lock.json)`
- Copy `node_modules/` to `/cache/deps/{hash}/`
- On next build with same lockfile hash, symlink `/cache/deps/{hash}/node_modules` into workspace
- Saves ~30s per rebuild

### 2. Build Cache

```typescript
interface BuildCache {
  /** Cached .next build output */
  get(workspaceId: string, buildHash: string): Promise<string | null>;
  set(workspaceId: string, buildHash: string, buildPath: string): Promise<void>;

  /** Build hash includes source file hashes + config */
  buildHash: 'content-hash'; // sha256 of all source files + next.config
}

// Strategy: content-hash of /src + next.config
// Key format: build:{sha256(src + config)}
// Storage: Host path /cache/build/{hash}/.next
// TTL: 24 hours
```

### 3. Binary Cache

```typescript
interface BinaryCache {
  /** Cached Playwright browsers */
  getPlaywrightBrowsers(version: string): Promise<string | null>;
  setPlaywrightBrowsers(version: string, path: string): Promise<void>;

  /** Cached Chromium for Lighthouse */
  getChromium(version: string): Promise<string | null>;
  setChromium(version: string, path: string): Promise<void>;
}

// Storage: /cache/binaries/playwright/{version}/
// Storage: /cache/binaries/chromium/{version}/
// Pre-baked into base Docker image
```

### 4. Docker Layer Cache

```typescript
interface LayerCache {
  /** Cache Docker image layers */
  getImage(imageRef: string): Promise<boolean>;
  setImage(imageRef: string): Promise<void>;

  /** Pre-baked base image with dependencies */
  baseImage: 'buildsame/runtime:base';
  baseImageDigest: string; // pinned digest
}

// Strategy:
// Base image is built once with Node.js, pnpm, Playwright, Prisma
// Only code changes, never base image changes during development
// Image is pulled by digest, not tag
```

### 5. File Hash Cache

```typescript
interface FileHashCache {
  /** Track file hashes for incremental sync */
  getHash(filePath: string): Promise<string | null>;
  setHash(filePath: string, hash: string): Promise<void>;
  getChangedFiles(basePath: string): Promise<string[]>;

  // Used by WorkspaceManager.sync() to only copy changed files
  algorithm: 'xxhash'; // fast non-cryptographic hash
}
```

## Cache Storage Layout

```
/cache/
├── deps/
│   ├── a1b2c3d4.../
│   │   └── node_modules/
│   └── e5f6g7h8.../
│       └── node_modules/
├── build/
│   ├── abc123.../
│   │   └── .next/
│   └── def456.../
│       └── .next/
├── binaries/
│   ├── playwright/
│   │   └── 1.45.0/
│   └── chromium/
│       └── 120.0/
└── hashes/
    └── sqlite.db    # Key-value store for file hashes
```

## Invalidation Policy

| Cache | TTL | Invalidation Trigger |
|-------|-----|---------------------|
| Dependency | 7 days since last use | Lockfile changes, explicit clear |
| Build | 24 hours | Source code changes |
| Binary | Forever | Version upgrade, explicit clear |
| Layer | Image lifetime | Dockerfile changes, explicit rebuild |
| File hash | Session lifetime | File mtime changes |

## Cache-to-Container Strategy

```
Container Creation
  │
  ├── Base image with Node.js + pnpm + Playwright
  │   → Pre-baked, pulled by digest
  │
  ├── Mount workspace as volume
  │   → No copy needed (bind mount)
  │
  ├── Symlink cached node_modules if lockfile matches
  │   → Skip npm install entirely
  │
  ├── Symlink cached .next if source hasn't changed
  │   → Skip next build entirely
  │
  └── Start next dev
      → Cold start only if nothing cached
```
