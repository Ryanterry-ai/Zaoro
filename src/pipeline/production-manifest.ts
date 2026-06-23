/**
 * Production Manifest: Defines rules for what code generation MUST include.
 * BANS static-only frames unless they contain active interactive elements.
 */

export interface ManifestRule {
  id: string;
  name: string;
  description: string;
  severity: 'block' | 'warn' | 'info';
  check: (code: string, filePath: string) => RuleResult;
}

export interface RuleResult {
  passed: boolean;
  message: string;
  suggestion?: string;
}

export interface ValidationReport {
  filePath: string;
  passed: boolean;
  violations: Array<{ rule: string; message: string; severity: string }>;
  score: number; // 0-100
}

// ─── Interactive Element Patterns ───────────────────────────────

const INTERACTIVE_PATTERNS = {
  // Forms and inputs
  forms: /<(form|input|textarea|select)[\s>]/gi,
  formActions: /action\s*=\s*["'{]/gi,
  onSubmit: /onSubmit\s*=\s*[{(]/gi,
  
  // Server Actions and async handlers
  serverActions: /["']use server["']/gi,
  asyncHandlers: /async\s*\(|await\s+fetch|await\s+\w+\(/gi,
  
  // State management
  useState: /useState\s*[<(]/gi,
  useReducer: /useReducer\s*[<(]/gi,
  useEffect: /useEffect\s*[<(]/gi,
  
  // Event handlers
  eventHandlers: /on(Click|Change|Submit|KeyDown|Focus|Blur)\s*=\s*[{(]/gi,
  
  // Data fetching
  fetchCalls: /fetch\s*\(\s*["'`]/gi,
  apiCalls: /\/api\/|endpoint|baseUrl/gi,
  
  // Dynamic content
  conditionalRender: /\?\s*[<(]|&&\s*[<(]/gi,
  mapCalls: /\.map\s*\(\s*\(/gi,
  
  // Tables with data
  tableRows: /<tr[\s>]|<td[\s>]|tableData|rowData/gi,
  
  // Charts with data
  chartData: /chartData|datasets|data\s*:\s*\[/gi,
  
  // Modals
  modals: /Modal|Dialog|isOpen|setIsOpen|showModal/gi,
};

// ─── Static Frame Patterns (BANNED without interactivity) ──────

const STATIC_FRAME_PATTERNS = {
  // Pure promotional blocks
  testimonialGrid: /testimonial|review|testimonial-grid|customer-says/gi,
  featureCards: /feature-card|feature-grid|feature-summary|key-features/gi,
  pricingCards: /pricing-card|pricing-grid|pricing-tier/gi,
  heroSections: /hero-section|hero-banner|cta-banner/gi,
  
  // Pure display elements
  imageGallery: /gallery|image-grid|photo-grid/gi,
  videoEmbed: /video-embed|youtube-embed|vimeo/gi,
  socialProof: /trusted-by|logo-wall|partner-grid/gi,
};

// ─── Production Manifest Rules ─────────────────────────────────

export const MANIFEST_RULES: ManifestRule[] = [
  {
    id: 'BAN_STATIC_FRAMES',
    name: 'Ban Static Frames',
    description: 'Reject pure promotional blocks unless they contain active forms, data tables, or state-driven elements.',
    severity: 'block',
    check: (code: string, filePath: string): RuleResult => {
      // Check if code contains static frame patterns
      const staticMatches: string[] = [];
      for (const [name, pattern] of Object.entries(STATIC_FRAME_PATTERNS)) {
        if (pattern.test(code)) {
          staticMatches.push(name);
        }
      }

      if (staticMatches.length === 0) {
        return { passed: true, message: 'No static frame patterns detected' };
      }

      // Check if code contains interactive elements
      const interactiveCount = countInteractiveElements(code);
      
      if (interactiveCount >= 2) {
        return { 
          passed: true, 
          message: `Static frames detected (${staticMatches.join(', ')}) but accompanied by ${interactiveCount} interactive elements` 
        };
      }

      return {
        passed: false,
        message: `BANNED: Static frame patterns detected without sufficient interactivity: ${staticMatches.join(', ')}`,
        suggestion: 'Add form inputs, data tables, state management, or event handlers to make this component functional.'
      };
    }
  },
  {
    id: 'ENFORCE_FORM_INTERACTIVITY',
    name: 'Enforce Form Interactivity',
    description: 'Each page must have at least 2 operational Server Actions or async fetch handlers.',
    severity: 'block',
    check: (code: string, filePath: string): RuleResult => {
      // Count Server Actions
      const serverActions = (code.match(/["']use server["']/g) || []).length;
      
      // Count async handlers
      const asyncHandlers = (code.match(/async\s*\(|await\s+fetch/g) || []).length;
      
      // Count fetch calls to real endpoints
      const fetchCalls = (code.match(/fetch\s*\(\s*["'`]/g) || []).length;
      
      // Count form submissions
      const formSubmissions = (code.match(/onSubmit|handleSubmit|formData/gi) || []).length;

      const totalHandlers = serverActions + asyncHandlers + fetchCalls + formSubmissions;

      if (totalHandlers >= 2) {
        return { 
          passed: true, 
          message: `${totalHandlers} operational handlers found (${serverActions} server actions, ${asyncHandlers} async, ${fetchCalls} fetch, ${formSubmissions} form)` 
        };
      }

      return {
        passed: false,
        message: `INSUFFICIENT INTERACTIVITY: Only ${totalHandlers} handler(s) found. Minimum 2 required.`,
        suggestion: 'Add Server Actions ("use server"), async fetch handlers, or form submission logic connected to API endpoints.'
      };
    }
  },
  {
    id: 'REQUIRE_DATA_DISPLAY',
    name: 'Require Data Display',
    description: 'Pages must display dynamic data, not just static text.',
    severity: 'warn',
    check: (code: string, filePath: string): RuleResult => {
      const hasDataMapping = /\.map\s*\(/.test(code);
      const hasConditional = /\?\s*[<(]|&&\s*[<(]/.test(code);
      const hasState = /useState|useReducer/.test(code);
      const hasTable = /<table|<tr|<td|tableData/.test(code);

      const dataElements = [hasDataMapping, hasConditional, hasState, hasTable].filter(Boolean).length;

      if (dataElements >= 2) {
        return { passed: true, message: `${dataElements} dynamic data patterns detected` };
      }

      return {
        passed: false,
        message: `LIMITED DYNAMIC DATA: Only ${dataElements} dynamic pattern(s) found.`,
        suggestion: 'Add .map() calls, conditional rendering, or state-driven data display.'
      };
    }
  },
  {
    id: 'ENFORCE_STATE_MANAGEMENT',
    name: 'Enforce State Management',
    description: 'Interactive components must use React state.',
    severity: 'warn',
    check: (code: string, filePath: string): RuleResult => {
      const hasState = /useState\s*[<(]/.test(code);
      const hasReducer = /useReducer\s*[<(]/.test(code);
      const hasEffects = /useEffect\s*[<(]/.test(code);

      if (hasState || hasReducer) {
        return { passed: true, message: 'State management detected' };
      }

      return {
        passed: false,
        message: 'NO STATE MANAGEMENT: Component lacks useState or useReducer.',
        suggestion: 'Add useState for interactive elements like modals, forms, and filters.'
      };
    }
  },
  {
    id: 'REQUIRE_DARK_THEME',
    name: 'Require Dark Theme',
    description: 'All components must use dark theme styling.',
    severity: 'warn',
    check: (code: string, filePath: string): RuleResult => {
      const hasDarkBg = /bg-zinc-9[05]0|bg-gray-9[05]0|bg-slate-9[05]0|bg-black/.test(code);
      const hasDarkText = /text-zinc-[0-9]|text-gray-[0-9]|text-white/.test(code);

      if (hasDarkBg && hasDarkText) {
        return { passed: true, message: 'Dark theme styling detected' };
      }

      return {
        passed: false,
        message: 'LIGHT THEME DETECTED: Components must use dark theme.',
        suggestion: 'Use bg-zinc-950 for backgrounds, text-zinc-50 for text, border-zinc-800 for borders.'
      };
    }
  },
];

// ─── Helper Functions ──────────────────────────────────────────

function countInteractiveElements(code: string): number {
  let count = 0;
  
  for (const [, pattern] of Object.entries(INTERACTIVE_PATTERNS)) {
    const matches = code.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  
  return count;
}

// ─── Validation Engine ─────────────────────────────────────────

export function validateCodeManifest(code: string, filePath: string): ValidationReport {
  const violations: ValidationReport['violations'] = [];
  let totalWeight = 0;
  let passedWeight = 0;

  for (const rule of MANIFEST_RULES) {
    const result = rule.check(code, filePath);
    const weight = rule.severity === 'block' ? 3 : rule.severity === 'warn' ? 2 : 1;
    
    totalWeight += weight;
    
    if (result.passed) {
      passedWeight += weight;
    } else {
      violations.push({
        rule: rule.id,
        message: result.message,
        severity: rule.severity,
      });
    }
  }

  const score = Math.round((passedWeight / totalWeight) * 100);
  const hasBlockers = violations.some(v => v.severity === 'block');

  return {
    filePath,
    passed: !hasBlockers,
    violations,
    score,
  };
}

/**
 * Generate enforcement rules text for LLM system prompt.
 */
export function generateEnforcementPrompt(): string {
  return `
## CRITICAL ENFORCEMENT RULES (MANDATORY)

### RULE 1: BAN STATIC FRAMES
REJECT any generation that outputs pure promotional landing blocks (testimonial grids, feature summary cards, pricing cards) UNLESS they contain:
- Active <form> submitters with onSubmit handlers
- Data table pagination hooks (useState for page number, .map() for rows)
- State-driven dynamic elements (isOpen, showModal, filter state)

If you detect a static frame without these, REWRITE it to include interactive elements.

### RULE 2: ENFORCE FORM INTERACTIVITY
Every page MUST generate at least TWO (2) operational:
- Next.js Server Actions ("use server" at top of file)
- OR async fetch handlers connected to /api/ endpoints
- OR form submission handlers with real database operations

Examples:
\`\`\`tsx
async function createInvoice(formData: FormData) {
  "use server";
  const amount = formData.get("amount");
  await db.invoice.create({ data: { amount: Number(amount) } });
  revalidatePath("/dashboard");
}
\`\`\`

\`\`\`tsx
async function handleCheckout() {
  const res = await fetch("/api/checkout", { method: "POST" });
  const { url } = await res.json();
  window.location.href = url;
}
\`\`\`

### RULE 3: LOGIC HYDRATION OVERRIDE
If the LLM layer fails or times out, DO NOT serve a generic landing page.
Instead, generate a FUNCTIONAL WORKSPACE containing:
- Active data dashboard grid with editable inputs
- Integrated data list with CRUD operations
- Server Actions for all database mutations
- Real-time state updates via useState/useEffect

The fallback template MUST include:
1. A data table with useState for sorting/filtering
2. A form with onSubmit connected to a Server Action
3. A chart or visualization with dynamic data
4. CRUD operations (Create, Read, Update, Delete)

NEVER output a page that is pure HTML/CSS without JavaScript interactivity.
`;
}
