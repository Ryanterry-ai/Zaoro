---
name: state-weaver
description: Generates App.tsx with cross-component shared state from ComponentManifest.globalState
bucket: A
reason: Pure code generation from structured spec; no LLM calls
---

# State Weaver

## Role
Read the `ComponentManifest.globalState` block and generate `src/App.tsx` with React Context providers, shared state hooks, and the component tree wired together.

## Process
1. Read `component-manifest.json` to get the page/section list and `globalState` definitions.
2. Read `visual-dna.json` for the theme provider config.
3. Generate context files for each shared state entry.
4. Generate `src/App.tsx` that composes all pages and sections with their providers.
5. Generate a `useAppContext.ts` hook that exposes all shared state.

## Input
- `component-manifest.json` — page structure and globalState declarations.
- `visual-dna.json` — theme configuration.
- `content/*.json` — data files to seed initial state.

## Output
- `src/App.tsx` — root component with provider tree and route composition.
- `src/contexts/ThemeContext.tsx` — theme provider from VisualDNA.
- `src/contexts/CartContext.tsx` — cart state (if applicable).
- `src/contexts/AuthContext.tsx` — auth state (if applicable).
- `src/hooks/useAppContext.ts` — combined context hook.
- `src/types/index.ts` — TypeScript types for all state shapes.

## App.tsx Template Structure
```tsx
import { ThemeProvider } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';

export default function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <Router>
          {/* Pages and sections composed from manifest */}
        </Router>
      </CartProvider>
    </ThemeProvider>
  );
}
```

## Rules
1. Zero LLM calls. This is a pure template-and-fill skill.
2. Context providers must be nested in dependency order (theme first, then auth, then cart).
3. Every context must export a `use*` hook for consuming components.
4. State initializers must read from `content/*.json`, not hardcoded values.
5. TypeScript types must be generated, not `any`.
6. The generated App.tsx must pass `tsc --noEmit` with zero errors.
