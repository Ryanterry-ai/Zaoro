# 3. Compiler → Execution Graph Mapping

## Overview

The compiler produces an Execution Graph from the Application Graph (canonical build IR). This document defines the mapping.

## Mapping Rules

### Rule 1: Application Graph Root → Execution Graph Pipeline Root

```
ApplicationGraph.root  ──►  ExecutionGraph: virtual 'pipeline' root node

AppGraphMetadata.industry  ──►  ExecutionGraph.metadata.labels['industry']
AppGraphMetadata.country    ──►  ExecutionGraph.metadata.labels['country']
```

### Rule 2: Page Node → Build Task

```
Each ApplicationGraph PageNode  ──►  TaskNode { kind: 'build', label: page.title }

PageNode.route       ──►  TaskNode.entrypoint
PageNode.components  ──►  TaskNode.inputs
```

### Rule 3: Data Model Nodes → Validate Steps

```
Each DataModelNode  ──►  StepNode { kind: 'validate', label: 'validate:' + model.name }

DataModelNode.fields  ──►  validation conditions
```

### Rule 4: Workflow Nodes → Execution Pipeline

```
WorkflowNode.steps  ──►  Sequence of StepNodes with depends_on edges

Each step with prompt ──►  StepNode { kind: 'generate' }
Each step without     ──►  StepNode { kind: 'compile' }
```

### Rule 5: Build → Preview → Gate → Deploy

The compiler appends lifecycle stages automatically:

```
build task
  │
  ├── produces ──► source artifact
  │
  ├── depends_on ──► install step ──► produces ──► binary artifact (node_modules)
  │
  ├── depends_on ──► compile step ──► produces ──► source artifact (compiled)
  │
  ├── depends_on ──► validate step ──► produces ──► output artifact (lint + typecheck)
  │
  ├── depends_on ──► preview task ──► produces ──► output artifact (preview URL)
  │                        │
  │                        └── requires ──► resourceProfile: 'preview'
  │
  ├── depends_on ──► gate: approval (if configured)
  │
  └── depends_on ──► deploy task ──► produces ──► output artifact (deployment URL)
                           │
                           └── requires ──► resourceProfile: 'deploy'
```

### Rule 6: Resource Profile Selection

```
ApplicationGraph metadata ──► ResourceProfile

PageNode count > 20         ──► 'build' (higher resources)
DataModelNode count > 5     ──► 'build'
Contains 'preview' workflow ──► 'preview'
Test workflow present       ──► 'test'
Deploy config present       ──► 'deploy'
```

## Default Execution Graph (Minimum)

For simple builds, the compiler produces:

```
[pipeline root]
     │
     ▼
[build task: 'build-generated-app']
     │
     ├── depends_on ──► [install step: 'npm-install']
     │
     ├── depends_on ──► [compile step: 'ts-compile']
     │
     └── produces ──► [source artifact: 'generated-files']
                              │
                              ▼
                    [preview task: 'preview-app']
                              │
                              ├── requires ──► resourceProfile: 'preview'
                              │
                              └── produces ──► [output artifact: 'preview-url']
```

## Execution Graph from Build Report

The compiler can also produce an Execution Graph from an existing build report:

```typescript
function executionGraphFromReport(report: BuildReport): ExecutionGraph {
  return {
    id: `exec-${report.workspaceId}-${Date.now()}`,
    version: '1.0.0',
    nodes: [
      // Pipeline root
      { id: 'pipeline-root', kind: 'exec', label: 'pipeline', command: [], resourceProfile: 'build', timeout: 300_000 },
      // Install step
      { id: 'install', kind: 'install', label: 'npm install', parentTaskId: 'pipeline-root', command: ['npm', 'install'], resourceProfile: 'build', timeout: 120_000, cacheKey: `deps:${report.blueprint.dataModelsCount}` },
      // Validate step
      { id: 'validate', kind: 'validate', label: 'TypeScript audit', parentTaskId: 'pipeline-root', command: ['npx', 'tsc', '--noEmit'], resourceProfile: 'build', timeout: 60_000 },
      // Preview step
      { id: 'preview', kind: 'preview', label: 'preview', resourceProfile: 'preview', timeout: 600_000, retryPolicy: { maxAttempts: 1, backoff: 'fixed', baseDelayMs: 1000, maxDelayMs: 5000, jitter: false } },
    ],
    edges: [
      { id: 'e1', kind: 'depends_on', sourceId: 'pipeline-root', targetId: 'install' },
      { id: 'e2', kind: 'depends_on', sourceId: 'install', targetId: 'validate' },
      { id: 'e3', kind: 'depends_on', sourceId: 'validate', targetId: 'preview' },
    ],
    invariants: ['EG-I1', 'EG-I2', 'EG-I3', 'EG-I4', 'EG-I5', 'EG-I6', 'EG-I7', 'EG-I8'],
    checksum: '', // computed at submission
  };
}
```
