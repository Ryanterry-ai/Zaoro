import type { BREContext } from './rules-engine.js';

export type AppFamily =
  | 'productivity-tool'
  | 'data-organiser'
  | 'information-site'
  | 'booking-platform'
  | 'commerce'
  | 'community'
  | 'dashboard-tool'
  | 'communication'
  | 'developer-tool'
  | 'education-app'
  | 'industry-specific';

export type AppType =
  | 'task-tracker' | 'habit-tracker' | 'todo' | 'kanban' | 'notes' | 'journal'
  | 'time-tracker' | 'pomodoro' | 'goal-tracker' | 'project-management-lite'
  | 'recipe-organiser' | 'book-tracker' | 'movie-tracker' | 'collection-manager'
  | 'expense-tracker' | 'budget-tracker' | 'contact-organiser' | 'inventory-lite'
  | 'bug-tracker' | 'issue-tracker' | 'changelog' | 'feature-request'
  | 'landing-page' | 'portfolio' | 'blog' | 'documentation' | 'about-site'
  | 'generic';

export type Complexity = 'micro' | 'standard' | 'complex';
export type UIMode = 'app' | 'site' | 'dashboard' | 'hybrid';
export type DataModel = 'minimal' | 'relational' | 'enterprise';

export interface AppFamilyResult {
  family: AppFamily;
  appType: AppType;
  complexity: Complexity;
  uiMode: UIMode;
  dataModel: DataModel;
  confidence: number;
  primaryEntity: string | null;
  reason: string;
}

type FamilyEntry = [RegExp, AppFamily, AppType, string | null, number];

const FAMILY_PATTERNS: FamilyEntry[] = [
  // ── Commerce (before industry override) ─────────────────────────────────────
  [/\becommerce\b/i, 'commerce', 'generic', 'Product', 0.95],
  [/\be?-?commerce\s*(store|shop|platform)\b/i, 'commerce', 'generic', 'Product', 0.95],
  [/\bonline\s*store\b/i, 'commerce', 'generic', 'Product', 0.90],
  [/\bonline\s*shop\b/i, 'commerce', 'generic', 'Product', 0.90],
  [/\bshopify\b/i, 'commerce', 'generic', 'Product', 0.85],

  // ── Developer tools (before productivity) ───────────────────────────────────
  [/\bbug\s*track/i, 'developer-tool', 'bug-tracker', 'Bug', 0.95],
  [/\bissue\s*track/i, 'developer-tool', 'issue-tracker', 'Issue', 0.95],
  [/\bchangelog\b/i, 'developer-tool', 'changelog', null, 0.90],
  [/\bfeature\s*request/i, 'developer-tool', 'feature-request', null, 0.90],
  [/\bticket\s*system\b/i, 'developer-tool', 'issue-tracker', 'Ticket', 0.85],

  [/\btask\s*track/i, 'productivity-tool', 'task-tracker', 'Task', 0.95],
  [/\btask\s*manager\b/i, 'productivity-tool', 'task-tracker', 'Task', 0.95],
  [/\btask\s*management\b/i, 'productivity-tool', 'task-tracker', 'Task', 0.90],
  [/\bto[\s-]?do\s*(list|app)?\b/i, 'productivity-tool', 'todo', 'Todo', 0.90],
  [/\bhabit\s*track/i, 'productivity-tool', 'habit-tracker', 'Habit', 0.95],
  [/\bhabit\s*log/i, 'productivity-tool', 'habit-tracker', 'Habit', 0.90],
  [/\bkanban\b/i, 'productivity-tool', 'kanban', 'Card', 0.95],
  [/\bsprint\s*(board|planner)?\b/i, 'productivity-tool', 'kanban', 'Task', 0.85],
  [/\bnote[\s-]?taking\b/i, 'productivity-tool', 'notes', 'Note', 0.95],
  [/\bnote[\s-]?app\b/i, 'productivity-tool', 'notes', 'Note', 0.95],
  [/\bnotebook\s*app\b/i, 'productivity-tool', 'notes', 'Note', 0.90],
  [/\bjournal\s*app\b/i, 'productivity-tool', 'journal', 'Entry', 0.90],
  [/\bdiary\s*app\b/i, 'productivity-tool', 'journal', 'Entry', 0.85],
  [/\btime\s*track/i, 'productivity-tool', 'time-tracker', 'TimeEntry', 0.90],
  [/\bpomodoro\b/i, 'productivity-tool', 'pomodoro', null, 0.95],
  [/\bgoal\s*track/i, 'productivity-tool', 'goal-tracker', 'Goal', 0.90],
  [/\bgoal\s*setting\b/i, 'productivity-tool', 'goal-tracker', 'Goal', 0.85],

  [/\brecipe\s*(organis|organiz|app|track|collect)/i, 'data-organiser', 'recipe-organiser', 'Recipe', 0.95],
  [/\bcookbook\s*app\b/i, 'data-organiser', 'recipe-organiser', 'Recipe', 0.90],
  [/\bbook\s*track/i, 'data-organiser', 'book-tracker', 'Book', 0.95],
  [/\breading\s*(list|track|log)/i, 'data-organiser', 'book-tracker', 'Book', 0.90],
  [/\bmovie\s*(track|list|log)/i, 'data-organiser', 'movie-tracker', 'Movie', 0.95],
  [/\bwatchlist\b/i, 'data-organiser', 'movie-tracker', 'Movie', 0.90],
  [/\bcollection\s*(manager|app|tracker)\b/i, 'data-organiser', 'collection-manager', null, 0.85],
  [/\bexpense\s*track/i, 'data-organiser', 'expense-tracker', 'Expense', 0.90],
  [/\bbudget\s*(track|planner|app)\b/i, 'data-organiser', 'budget-tracker', 'Budget', 0.90],
  [/\bpersonal\s*finance\b/i, 'data-organiser', 'budget-tracker', 'Transaction', 0.85],
  [/\bcontact\s*(organis|book)\b/i, 'data-organiser', 'contact-organiser', 'Contact', 0.85],

  [/\blanding\s*page\b/i, 'information-site', 'landing-page', null, 0.95],
  [/\bportfolio\s*(site|page|app|website)?\b/i, 'information-site', 'portfolio', 'Project', 0.90],
  [/\bpersonal\s*(site|website|page)\b/i, 'information-site', 'portfolio', null, 0.85],
  [/\bblog\s*(site|platform|engine|app)\b/i, 'information-site', 'blog', 'Post', 0.90],
  [/\bdocumentation\s*(site|app)?\b/i, 'information-site', 'documentation', 'Article', 0.90],
  [/\bdocs\s*(site|app)?\b/i, 'information-site', 'documentation', 'Article', 0.85],

  [/\bflashcard\s*app\b/i, 'education-app', 'generic', 'Flashcard', 0.90],
  [/\bquiz\s*app\b/i, 'education-app', 'generic', 'Question', 0.90],
  [/\bspaced\s*repetition\b/i, 'education-app', 'generic', 'Card', 0.90],
  [/\bvocabulary\s*(app|trainer)\b/i, 'education-app', 'generic', 'Word', 0.85],
];

const INDUSTRY_OVERRIDE_PATTERNS: RegExp[] = [
  /\bcrm\b/i, /\berp\b/i, /\bpos\b/i, /\bmarketplace\b/i,
  /\becommerce\b/i, /\be-commerce\b/i, /\bonline\s*store\b/i,
  /\bsubscription\s*(plan|billing|management)\b/i,
  /\bcustomer(s)?\b/i, /\binventory\s*management\b/i,
  /\bsupplier(s)?\b/i, /\bwarehouse\b/i, /\bmanufactur/i,
  /\bshipping\b/i, /\bpayroll\b/i, /\bsaas\s*platform\b/i,
  /\bmulti[\s-]?tenant\b/i,
];

const INDUSTRY_CONTEXT_SIGNALS: string[] = [
  'healthcare', 'restaurant', 'fitness', 'ecommerce', 'fintech',
  'logistics', 'manufacturing', 'realestate', 'legal', 'education',
  'automotive', 'travel', 'luxury', 'beauty', 'event', 'nonprofit',
];

function detectComplexity(prompt: string): Complexity {
  const lower = prompt.toLowerCase();
  if (/\bsimple\b|\bbasic\b|\bminimal\b|\bsmall\b|\bquick\b|\btiny\b/.test(lower)) {
    return 'micro';
  }
  if (/\benterprise\b|\bcomplex\b|\badvanced\b|\bfull.featured\b|\bcomprehensive\b/.test(lower)) {
    return 'complex';
  }
  return 'standard';
}

function detectUIMode(family: AppFamily, prompt: string): UIMode {
  const lower = prompt.toLowerCase();
  if (family === 'information-site') return 'site';
  if (family === 'dashboard-tool') return 'dashboard';
  if (/\bdashboard\b/.test(lower)) return 'dashboard';
  if (/\bwebsite\b|\blanding\b|\bpublic\b/.test(lower)) return 'site';
  return 'app';
}

function detectDataModel(family: AppFamily, complexity: Complexity): DataModel {
  if (family === 'industry-specific') return 'relational';
  if (complexity === 'complex') return 'relational';
  if (complexity === 'micro') return 'minimal';
  if (family === 'productivity-tool' || family === 'data-organiser' || family === 'education-app') {
    return 'minimal';
  }
  return 'relational';
}

export function classify(prompt: string, ctx: BREContext): AppFamilyResult {
  const lower = prompt.toLowerCase();

  // First: check family patterns (e-commerce, task trackers, etc.)
  for (const [pattern, family, appType, primaryEntity, confidence] of FAMILY_PATTERNS) {
    if (pattern.test(lower)) {
      const complexity = detectComplexity(prompt);
      const uiMode = detectUIMode(family, prompt);
      const dataModel = detectDataModel(family, complexity);

      return {
        family,
        appType,
        complexity,
        uiMode,
        dataModel,
        confidence,
        primaryEntity,
        reason: `Pattern match: "${pattern.source}" → family=${family}, type=${appType}`,
      };
    }
  }

  // Then: check industry override (only for business systems that aren't cross-industry app types)
  for (const override of INDUSTRY_OVERRIDE_PATTERNS) {
    if (override.test(lower)) {
      return {
        family: 'industry-specific',
        appType: 'generic',
        complexity: detectComplexity(prompt),
        uiMode: 'hybrid',
        dataModel: 'relational',
        confidence: 0.9,
        primaryEntity: null,
        reason: `Override: prompt contains business system keyword matching ${override.source}`,
      };
    }
  }

  // Then: check industry context from BREContext
  if (ctx.industry !== 'general' && INDUSTRY_CONTEXT_SIGNALS.includes(ctx.industry)) {
    return {
      family: 'industry-specific',
      appType: 'generic',
      complexity: detectComplexity(prompt),
      uiMode: detectUIMode('industry-specific', prompt),
      dataModel: 'relational',
      confidence: 0.85,
      primaryEntity: null,
      reason: `Industry context: BREContext.industry="${ctx.industry}" is a known business industry`,
    };
  }

  // Fallback
  return {
    family: 'industry-specific',
    appType: 'generic',
    complexity: detectComplexity(prompt),
    uiMode: detectUIMode('industry-specific', prompt),
    dataModel: 'relational',
    confidence: 0.2,
    primaryEntity: null,
    reason: 'No application family matched — routing to industry-specific path',
  };
}