# Compiler Specification

**Version**: 1.0.0  
**Status**: Frozen  
**Last Updated**: 2026-07-05

---

## Overview

The Compiler Specification defines how the Application Graph is transformed into executable code. It treats the compilation process like a language compiler with explicit passes, read/write permissions, validation stages, diagnostics, and error handling.

The Compiler answers: **"How do we turn the graph into code?"**

---

## Architecture

### Compiler Pipeline

```
ApplicationGraph
     ↓
[Pass 0: Schema] → Prisma Schema
     ↓
[Pass 1: Endpoints] → API Routes
     ↓
[Pass 2: Workflows] → Business Logic
     ↓
[Pass 3: Pages] → UI Components
     ↓
[Pass 4: Features] → Feature Modules
     ↓
[Pass 5: Validation] → Validation Rules
     ↓
[Pass 6: Optimization] → Optimized Graph
     ↓
[Pass 7: Output] → Framework-Specific Code
     ↓
Project Files
```

### Pass Definitions

#### Pass 0: Schema Pass
**Purpose**: Generate database schema from entities.

**Reads**:
- entity nodes
- table nodes
- entity_relation edges

**Writes**:
- prisma schema file
- database client

**Validation**:
- All entities have tables
- All fields have valid types
- All relationships are bidirectional

#### Pass 1: Endpoint Pass
**Purpose**: Generate API routes from endpoints.

**Reads**:
- entity nodes
- endpoint nodes
- endpoint_for_entity edges

**Writes**:
- API route files
- Request/response types
- Authentication middleware

**Validation**:
- All endpoints have handlers
- All endpoints have proper HTTP methods
- All endpoints have authentication

#### Pass 2: Workflow Pass
**Purpose**: Generate business logic from workflows.

**Reads**:
- workflow nodes
- entity nodes
- workflow_uses_entity edges

**Writes**:
- Service files
- Business logic functions
- State machines

**Validation**:
- All workflows have steps
- All steps have actions
- All entities are accessible

#### Pass 3: Page Pass
**Purpose**: Generate UI components from pages.

**Reads**:
- page nodes
- entity nodes
- page_uses_entity edges

**Writes**:
- Page components
- Layout components
- Form components

**Validation**:
- All pages have components
- All entities have forms
- All pages have proper routing

#### Pass 4: Feature Pass
**Purpose**: Generate feature modules.

**Reads**:
- feature nodes
- capability nodes
- feature_requires_entity edges

**Writes**:
- Feature modules
- Feature components
- Feature services

**Validation**:
- All features have components
- All features have services
- All features are properly scoped

#### Pass 5: Validation Pass
**Purpose**: Add validation rules.

**Reads**:
- entity nodes
- endpoint nodes
- field definitions

**Writes**:
- Validation schemas
- Input validators
- Error handlers

**Validation**:
- All fields have validation
- All endpoints have input validation
- All errors are handled

#### Pass 6: Optimization Pass
**Purpose**: Optimize the graph.

**Reads**:
- All nodes and edges

**Writes**:
- Optimized graph
- Performance hints
- Caching strategies

**Validation**:
- No circular dependencies
- No redundant nodes
- No redundant edges

#### Pass 7: Output Pass
**Purpose**: Generate framework-specific code.

**Reads**:
- Optimized graph
- All generated files

**Writes**:
- Framework-specific code
- Build configuration
- Deployment files

**Validation**:
- Code compiles
- Code passes linting
- Code has proper imports

---

## Read/Write Permissions

### Permission Matrix

| Pass | Reads | Writes | Cannot Read | Cannot Write |
|------|-------|--------|-------------|--------------|
| Pass 0 | entity, table, entity_relation | prisma, db_client | workflow, page, feature | api, ui, service |
| Pass 1 | entity, endpoint, endpoint_for_entity | api_routes, types, middleware | workflow, page, feature | prisma, ui, service |
| Pass 2 | workflow, entity, workflow_uses_entity | services, business_logic | page, feature, endpoint | prisma, api, ui |
| Pass 3 | page, entity, page_uses_entity | page_components, layouts, forms | workflow, feature, endpoint | prisma, api, service |
| Pass 4 | feature, capability, feature_requires_entity | feature_modules, components | workflow, page, endpoint | prisma, api, ui |
| Pass 5 | entity, endpoint, fields | validation_schemas, validators | workflow, page, feature | prisma, api, ui |
| Pass 6 | all nodes, all edges | optimized_graph, hints | none | none |
| Pass 7 | optimized_graph, all_files | framework_code, config | none | none |

### Permission Rules

1. **No Pass Reads from Future Passes**: Pass N cannot read from Pass N+1 or later.
2. **No Pass Writes to Past Passes**: Pass N cannot write to Pass N-1 or earlier.
3. **Explicit Read/Write**: Each pass must declare exactly what it reads and writes.
4. **No Implicit Access**: Passes cannot access undeclared resources.

---

## Validation Stages

### Pre-Compilation Validation
Before compilation begins:

1. **Graph Completeness**: All required nodes and edges exist.
2. **Referential Integrity**: All references point to existing nodes.
3. **Type Safety**: All node data matches expected types.
4. **Business Rules**: All business rules are satisfied.

### Per-Pass Validation
After each pass:

1. **Output Completeness**: All expected outputs are generated.
2. **Output Correctness**: All outputs are valid.
3. **No Side Effects**: Pass did not modify undeclared resources.
4. **Performance**: Pass completed within time limit.

### Post-Compilation Validation
After compilation:

1. **Code Compilation**: All generated code compiles.
2. **Code Linting**: All generated code passes linting.
3. **Code Testing**: All generated tests pass.
4. **Integration Testing**: All components integrate correctly.

---

## Diagnostics

### Error Levels

```typescript
enum DiagnosticLevel {
  Error = 'error',       // Compilation cannot continue
  Warning = 'warning',   // Compilation can continue, but may fail
  Info = 'info',         // Informational message
  Hint = 'hint',         // Suggestion for improvement
}
```

### Diagnostic Categories

```typescript
enum DiagnosticCategory {
  Syntax = 'syntax',           // Graph structure errors
  Type = 'type',               // Type errors
  Reference = 'reference',     // Reference errors
  Business = 'business',       // Business rule errors
  Performance = 'performance', // Performance warnings
  Security = 'security',       // Security warnings
}
```

### Diagnostic Output

```typescript
interface Diagnostic {
  level: DiagnosticLevel;
  category: DiagnosticCategory;
  message: string;
  location?: {
    node?: string;
    edge?: string;
    pass?: string;
    line?: number;
    column?: number;
  };
  suggestion?: string;
}
```

---

## Error Handling

### Error Types

```typescript
enum CompilerErrorType {
  ValidationError = 'validation',
  TransformationError = 'transformation',
  OutputError = 'output',
  OptimizationError = 'optimization',
  IntegrationError = 'integration',
}
```

### Error Response

```typescript
interface CompilerError {
  type: CompilerErrorType;
  message: string;
  pass: string;
  diagnostics: Diagnostic[];
  recoverable: boolean;
  suggestion?: string;
}
```

### Recovery Strategies

1. **Retry**: Re-run the failed pass.
2. **Skip**: Skip the failed pass and continue.
3. **Fallback**: Use a fallback implementation.
4. **Abort**: Stop compilation and report error.

### Error Handling Rules

1. **Fail Fast**: Report errors as soon as they are detected.
2. **Context**: Include relevant context in error messages.
3. **Suggestions**: Provide suggestions for fixing errors.
4. **Recovery**: When possible, suggest recovery strategies.

---

## Replay Points

### What is a Replay Point?
A replay point is a saved state of the compiler that can be restored.

### Replay Points

1. **Pre-Compilation**: Before any passes run.
2. **Post-Pass 0**: After schema generation.
3. **Post-Pass 1**: After endpoint generation.
4. **Post-Pass 2**: After workflow generation.
5. **Post-Pass 3**: After page generation.
6. **Post-Pass 4**: After feature generation.
7. **Post-Pass 5**: After validation.
8. **Post-Pass 6**: After optimization.
9. **Post-Compilation**: After all passes complete.

### Replay Usage

```typescript
// Save replay point
const replayPoint = compiler.saveReplayPoint();

// Restore replay point
compiler.restoreReplayPoint(replayPoint);
```

---

## Compiler Configuration

### Configuration Options

```typescript
interface CompilerConfig {
  // Pass configuration
  passes: {
    enabled: boolean;
    timeout: number;
    retries: number;
  }[];
  
  // Validation configuration
  validation: {
    enabled: boolean;
    strict: boolean;
    level: DiagnosticLevel;
  };
  
  // Optimization configuration
  optimization: {
    enabled: boolean;
    level: 'none' | 'basic' | 'aggressive';
  };
  
  // Output configuration
  output: {
    framework: 'nextjs' | 'react' | 'vue' | 'flutter';
    typescript: boolean;
    eslint: boolean;
    prettier: boolean;
  };
}
```

### Default Configuration

```typescript
const defaultConfig: CompilerConfig = {
  passes: Array(8).fill({
    enabled: true,
    timeout: 30000,
    retries: 3,
  }),
  validation: {
    enabled: true,
    strict: true,
    level: DiagnosticLevel.Warning,
  },
  optimization: {
    enabled: true,
    level: 'basic',
  },
  output: {
    framework: 'nextjs',
    typescript: true,
    eslint: true,
    prettier: true,
  },
};
```

---

## Performance Requirements

### Time Limits

| Pass | Maximum Time |
|------|--------------|
| Pass 0 | 5 seconds |
| Pass 1 | 5 seconds |
| Pass 2 | 5 seconds |
| Pass 3 | 5 seconds |
| Pass 4 | 5 seconds |
| Pass 5 | 5 seconds |
| Pass 6 | 10 seconds |
| Pass 7 | 10 seconds |
| **Total** | **50 seconds** |

### Memory Limits

| Pass | Maximum Memory |
|------|----------------|
| Pass 0 | 100 MB |
| Pass 1 | 100 MB |
| Pass 2 | 100 MB |
| Pass 3 | 100 MB |
| Pass 4 | 100 MB |
| Pass 5 | 100 MB |
| Pass 6 | 200 MB |
| Pass 7 | 200 MB |
| **Total** | **1 GB** |

### Optimization Goals

1. **Compilation Speed**: Minimize total compilation time.
2. **Code Quality**: Generate clean, maintainable code.
3. **Bundle Size**: Minimize generated bundle size.
4. **Performance**: Generate performant code.

---

## Testing

### Unit Tests
Each pass must have unit tests that verify:
1. Correct input/output
2. Error handling
3. Performance requirements

### Integration Tests
The compiler must have integration tests that verify:
1. End-to-end compilation
2. All passes work together
3. Generated code compiles

### Regression Tests
The compiler must have regression tests that verify:
1. Known issues are fixed
2. No new issues are introduced
3. Performance is maintained

---

## Monitoring

### Metrics

```typescript
interface CompilerMetrics {
  compilationTime: number;
  passTimes: number[];
  memoryUsage: number;
  diagnostics: {
    errors: number;
    warnings: number;
    info: number;
    hints: number;
  };
  output: {
    files: number;
    lines: number;
    bytes: number;
  };
}
```

### Logging

```typescript
interface CompilerLog {
  timestamp: string;
  level: DiagnosticLevel;
  pass: string;
  message: string;
  metadata?: Record<string, unknown>;
}
```

---

**End of Compiler Specification**
