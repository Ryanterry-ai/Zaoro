/**
 * Mock Data Validator: Ensures generated code uses realistic data,
 * not placeholders, and that data is connected to interactive elements.
 */

export interface MockDataValidation {
  filePath: string;
  hasRealisticData: boolean;
  hasPlaceholderData: boolean;
  dataConnections: DataConnection[];
  issues: string[];
  score: number;
}

export interface DataConnection {
  type: 'state-to-ui' | 'api-to-state' | 'form-to-action' | 'data-to-chart';
  source: string;
  target: string;
  connected: boolean;
}

// ─── Placeholder Patterns (BAD) ────────────────────────────────

const PLACEHOLDER_PATTERNS = [
  { pattern: /lorem ipsum/gi, name: 'Lorem Ipsum' },
  { pattern: /placeholder/gi, name: 'Placeholder text' },
  { pattern: /example\.com/gi, name: 'Example domain' },
  { pattern: /john doe|jane doe/gi, name: 'Generic names' },
  { pattern: /test@test|user@example/gi, name: 'Test emails' },
  { pattern: /\[\s*.*?\s*\]/g, name: 'Bracket placeholders' },
  { pattern: /\{\{\s*.*?\s*\}\}/g, name: 'Template placeholders' },
  { pattern: /TODO|FIXME|XXX/gi, name: 'Code markers' },
  { pattern: /coming soon/gi, name: 'Coming soon' },
  { pattern: /coming soon/gi, name: 'Coming soon' },
];

// ─── Realistic Data Patterns (GOOD) ────────────────────────────

const REALISTIC_DATA_PATTERNS = {
  // Business names
  businessNames: /["'`](?:Acme|Stellar|Nova|Apex|Pulse|Zenith|Flux|Core|Edge|Peak|Swift|Bright|Smart|True|Prime)[\w\s]*["'`]/gi,
  
  // Real pricing
  pricing: /\$[\d,]+(?:\.\d{2})?(?:\/mo|\/year|\/month|\/user)?/g,
  
  // Real email formats
  emails: /["'`][\w.-]+@[\w.-]+\.\w+["'`]/g,
  
  // Real dates
  dates: /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}/g,
  
  // Real numbers (not round)
  realisticNumbers: /\b\d{1,3},?\d{3}\b/g,
  
  // Status values
  statuses: /["'`](?:active|inactive|pending|completed|failed|processing|draft|published)["'`]/g,
  
  // Role values
  roles: /["'`](?:admin|user|manager|viewer|editor|owner)["'`]/g,
};

// ─── Data Connection Patterns ──────────────────────────────────

const CONNECTION_PATTERNS = {
  'state-to-ui': {
    source: /const\s+\[(\w+),\s*set\w+\]/g,
    target: /\{\s*\w+\s*\}/g,
  },
  'api-to-state': {
    source: /await\s+fetch\s*\(\s*["'`](\/api\/[\w/]+)["'`]/g,
    target: /setData|setItems|setResult/g,
  },
  'form-to-action': {
    source: /action\s*=\s*\{\s*(\w+)/g,
    target: /["']use server["']|async\s+function/g,
  },
  'data-to-chart': {
    source: /(?:data|datasets|labels)\s*[=:]\s*\[/g,
    target: /Chart|LineChart|BarChart|PieChart/g,
  },
};

// ─── Validation Engine ─────────────────────────────────────────

export function validateMockData(code: string, filePath: string): MockDataValidation {
  const issues: string[] = [];
  const dataConnections: DataConnection[] = [];

  // Check for placeholder data
  let hasPlaceholder = false;
  for (const { pattern, name } of PLACEHOLDER_PATTERNS) {
    if (pattern.test(code)) {
      issues.push(`Placeholder detected: ${name}`);
      hasPlaceholder = true;
    }
  }

  // Check for realistic data
  let hasRealistic = false;
  for (const [name, pattern] of Object.entries(REALISTIC_DATA_PATTERNS)) {
    if (pattern.test(code)) {
      hasRealistic = true;
      break;
    }
  }

  // Check data connections
  for (const [type, patterns] of Object.entries(CONNECTION_PATTERNS)) {
    const sourceMatches = code.match(patterns.source);
    const targetMatches = code.match(patterns.target);
    
    if (sourceMatches && targetMatches) {
      dataConnections.push({
        type: type as DataConnection['type'],
        source: sourceMatches[0],
        target: targetMatches[0],
        connected: true,
      });
    } else if (sourceMatches) {
      dataConnections.push({
        type: type as DataConnection['type'],
        source: sourceMatches[0],
        target: 'NOT FOUND',
        connected: false,
      });
      issues.push(`Disconnected ${type}: ${sourceMatches[0]} has no target`);
    }
  }

  // Calculate score
  let score = 100;
  if (hasPlaceholder) score -= 30;
  if (!hasRealistic) score -= 20;
  
  const disconnectedCount = dataConnections.filter(c => !c.connected).length;
  score -= disconnectedCount * 10;
  
  score = Math.max(0, score);

  return {
    filePath,
    hasRealisticData: hasRealistic,
    hasPlaceholderData: hasPlaceholder,
    dataConnections,
    issues,
    score,
  };
}

/**
 * Generate mock data validation rules for LLM prompt.
 */
export function generateMockDataRules(): string {
  return `
## MOCK DATA RULES (CRITICAL)

### NEVER USE:
- Lorem ipsum text
- "Placeholder" or "Example" text
- Generic names like "John Doe" or "Jane Smith"
- Test emails like test@example.com
- Bracket placeholders like [Your Name]
- Template markers like {{variable}}
- TODO/FIXME comments
- "Coming soon" messages

### ALWAYS USE:
- Realistic business names: "Stellar Solutions", "NovaTech", "Apex Digital"
- Real pricing: "$49/mo", "$1,299/year", "$29/user/month"
- Real email formats: "sarah@acme.com", "billing@startup.io"
- Real dates: "Jan 15, 2026", "March 3, 2025"
- Status values: "active", "pending", "completed", "processing"
- Roles: "admin", "manager", "viewer", "editor"
- Realistic metrics: "12,847 users", "$847,293 revenue", "94.2% uptime"

### DATA CONNECTION RULES:
Every data source MUST connect to a UI element:
1. useState variables MUST appear in JSX
2. fetch() calls MUST update state with setData()
3. Form actions MUST connect to Server Actions
4. Chart data MUST come from state or props

Example of CORRECT data flow:
\`\`\`tsx
const [invoices, setInvoices] = useState([]);
useEffect(() => {
  fetch("/api/invoices").then(r => r.json()).then(setInvoices);
}, []);
return invoices.map(inv => <div>{inv.amount}</div>);
\`\`\`
`;
}
