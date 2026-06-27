---
name: build-orchestrator
description: Assembles all generated code and runs quality gates — lint, typecheck, build, dependency check, content validation
bucket: A
reason: Deterministic assembly and validation; no LLM calls
---

# Build Orchestrator

## Role
Merge all generated components, contexts, and pages into a coherent project. Run quality gates. If any gate fails, report the specific failure and halt. Do not self-report success.

## Process
1. **Assembly**
   - Verify all files from `parallel-builder` exist in `src/components/`.
   - Verify `App.tsx` from `state-weaver` exists.
   - Verify all `content/*.json` files exist.
   - Verify `component-manifest.json` exists.
   - Run `scripts/assemble-project.sh` to wire imports and generate barrel exports.

2. **Dependency Check**
   - Read all import statements across generated files.
   - Cross-reference against `package.json` dependencies.
   - Install any missing dependencies via `npm install`.
   - Flag any unused dependencies.

3. **Lint**
   - Run `npx eslint src/ --ext .ts,.tsx`.
   - Zero warnings allowed. Errors halt the pipeline.

4. **Typecheck**
   - Run `npx tsc --noEmit`.
   - Zero type errors allowed.

5. **Build**
   - Run `npm run build`.
   - Build must succeed with zero errors.

6. **Content Validation**
   - Verify every `dataBinding` in `component-manifest.json` has a matching key in the corresponding `content/*.json` file.
   - Verify no content file is empty or contains only `null`/`undefined` values.

7. **Source Independence Audit**
   - Grep all generated files for source domain references, hot-linked assets, or callbacks to non-client services.
   - Fail if any are found.

## Input
- All files in `src/`, `content/`, `specs/`.
- `package.json`, `tsconfig.json`, `tailwind.config.ts`.
- `component-manifest.json`.

## Output
- `build-report.json`:
```json
{
  "assembly": "pass",
  "dependencies": { "installed": [], "missing": [] },
  "lint": { "errors": 0, "warnings": 0 },
  "typecheck": { "errors": 0 },
  "build": "pass",
  "contentValidation": "pass",
  "sourceAudit": "pass",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## Rules
1. No self-reporting. The build either passes the gates or it does not. No "mostly working" states.
2. If lint fails, report the exact file and line. Do not auto-fix.
3. If typecheck fails, report the exact type error. Do not suppress with `@ts-ignore`.
4. If build fails, report the exact error. Do not retry.
5. Never skip a gate. Every gate runs every time.
6. The build-orchestrator never writes component code. It only assembles and validates.
