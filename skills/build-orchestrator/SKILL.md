---
name: Build Orchestrator
bucket: A
---

# Build Orchestrator Skill

## Purpose
Assemble all parallel-built components, merge branches, run quality gates, and verify the build is complete.

## Assembly Steps

### 1. Merge Parallel Branches
Each parallel-builder unit works in its own git worktree/branch.
```
for each branch in parallel-build-branches:
  try deterministic merge
  if conflict:
    route to single LLM call (Bucket B) with only conflicting hunk
```

### 2. Install Dependencies
```
cd projects/<name> && npm install
```

### 3. Run Quality Gates (sequential, stop at first failure)
```
node tools/quality-gate/index.js --project-dir ./projects/<name>
```
- Lint
- TypeCheck
- Build
- Tests (if present)

### 4. Run Dependency Check
```
node tools/dependency-checker/index.js --project-dir ./projects/<name>
```
Asserts zero external URLs in output.

### 5. Run Screenshot Diff (clone pipeline only)
```
node tools/screenshot-diff/index.js <source> <generated> --threshold 0.85
```

### 6. Triage Failures
On any gate failure:
- Route specific error to specific component owner
- ONE LLM call per failure (Bucket B), given only that error and that file
- Never "fix the build" as an unscoped instruction

### 7. Mark Complete
Only after ALL gates pass AND dependency check passes:
- Write `projects/<name>/BUILD-REPORT.json` with all gate results
- The project is marked complete

## Output
`projects/<name>/BUILD-REPORT.json`:
```json
{
  "completed": true,
  "gates": {
    "lint": "pass",
    "typecheck": "pass",
    "build": "pass",
    "dependency-check": "pass",
    "screenshot-diff": "pass|skip|n/a"
  },
  "totalComponents": 15,
  "totalFiles": 42,
  "completedAt": "ISO date"
}
```
