// ─── Clone Progress Types ─────────────────────────────────────────
// Full progress tracking for every operation during cloning

export type ClonePhase =
  | 'analyze'
  | 'crawl'
  | 'assets'
  | 'generate'
  | 'self-contain'
  | 'preview'
  | 'complete';

export type ItemStatus = 'pending' | 'active' | 'done' | 'failed' | 'skipped';

export interface CloneProgressEvent {
  ts: number;
  phase: ClonePhase;
  phaseStatus: 'active' | 'done' | 'failed';
  message: string;
  data?: Record<string, unknown> | undefined;
}

// ─── Phase-level progress ─────────────────────────────────────────

export interface PhaseProgress {
  phase: ClonePhase;
  status: 'pending' | 'active' | 'done' | 'failed';
  startedAt: number | undefined;
  completedAt: number | undefined;
  itemsTotal: number;
  itemsDone: number;
  itemsFailed: number;
  itemsSkipped: number;
  errors: CloneError[];
}

// ─── Analyze phase ────────────────────────────────────────────────

export interface AnalyzeResult {
  url: string;
  techStack: TechStack;
  sitemapPages: SitemapEntry[];
  navItems: NavItem[];
  pages: AnalyzedPage[];
  totalEstimatedPages: number;
  robotsTxt: RobotsTxtInfo | null;
}

export interface TechStack {
  framework: string;
  cms: string;
  hosting: string;
  analytics: string[];
  fonts: string[];
  cssFramework: string;
  ecommerce: string;
  signals: string[];
}

export interface SitemapEntry {
  loc: string;
  lastModified: string;
  changeFreq: string;
  priority: string;
}

export interface NavItem {
  label: string;
  href: string;
  depth: number;
  children: NavItem[];
}

export interface AnalyzedPage {
  path: string;
  title: string;
  category: PageCategory;
  importance: 'critical' | 'high' | 'medium' | 'low';
  estimatedAssets: number;
  detectedFrom: 'sitemap' | 'navigation' | 'crawl' | 'user';
}

export type PageCategory =
  | 'home'
  | 'pdp'           // Product Detail Page
  | 'collection'    // Category/collection listing
  | 'blog'          // Blog post
  | 'blog-list'     // Blog listing
  | 'static'        // About, FAQ, Contact
  | 'auth'          // Login, Signup
  | 'cart'          // Cart, Checkout
  | 'policy'        // Privacy, Terms
  | 'search'        // Search results
  | 'other';

export interface RobotsTxtInfo {
  sitemaps: string[];
  disallowPaths: string[];
  crawlDelay: number | null;
}

// ─── Crawl phase ──────────────────────────────────────────────────

export interface CrawlPageResult {
  path: string;
  title: string;
  status: ItemStatus;
  error: string | undefined;
  imagesFound: number;
  videosFound: number;
  fontsFound: number;
  linksFound: number;
  duration: number;
}

// ─── Asset phase ──────────────────────────────────────────────────

export interface AssetDownloadResult {
  url: string;
  localPath: string;
  category: AssetCategory;
  size: number;
  status: ItemStatus;
  error: string | undefined;
}

export type AssetCategory = 'image' | 'video' | 'font' | 'svg' | 'favicon' | 'banner' | 'logo' | 'css' | 'other';

// ─── Generate phase ───────────────────────────────────────────────

export interface GeneratePageResult {
  path: string;
  category: PageCategory;
  status: ItemStatus;
  error: string | undefined;
  filePath: string;
  componentCount: number;
}

// ─── Errors ───────────────────────────────────────────────────────

export interface CloneError {
  phase: ClonePhase;
  item: string;
  reason: string;
  severity: 'error' | 'warning' | 'info';
  recoverable: boolean;
}

// ─── Full clone state ─────────────────────────────────────────────

export interface CloneState {
  url: string;
  phases: Record<ClonePhase, PhaseProgress>;
  analyze: AnalyzeResult | undefined;
  crawlResults: CrawlPageResult[];
  assetResults: AssetDownloadResult[];
  generateResults: GeneratePageResult[];
  errors: CloneError[];
  startedAt: number;
  completedAt: number | undefined;
  totalDuration: number;
}

// ─── Helper to create initial state ───────────────────────────────

export function createCloneState(url: string): CloneState {
  const now = Date.now();
  const phases: Record<ClonePhase, PhaseProgress> = {
    analyze:     { phase: 'analyze',     status: 'pending', startedAt: undefined, completedAt: undefined, itemsTotal: 0, itemsDone: 0, itemsFailed: 0, itemsSkipped: 0, errors: [] },
    crawl:       { phase: 'crawl',       status: 'pending', startedAt: undefined, completedAt: undefined, itemsTotal: 0, itemsDone: 0, itemsFailed: 0, itemsSkipped: 0, errors: [] },
    assets:      { phase: 'assets',      status: 'pending', startedAt: undefined, completedAt: undefined, itemsTotal: 0, itemsDone: 0, itemsFailed: 0, itemsSkipped: 0, errors: [] },
    generate:    { phase: 'generate',    status: 'pending', startedAt: undefined, completedAt: undefined, itemsTotal: 0, itemsDone: 0, itemsFailed: 0, itemsSkipped: 0, errors: [] },
    'self-contain': { phase: 'self-contain', status: 'pending', startedAt: undefined, completedAt: undefined, itemsTotal: 0, itemsDone: 0, itemsFailed: 0, itemsSkipped: 0, errors: [] },
    preview:     { phase: 'preview',     status: 'pending', startedAt: undefined, completedAt: undefined, itemsTotal: 0, itemsDone: 0, itemsFailed: 0, itemsSkipped: 0, errors: [] },
    complete:    { phase: 'complete',    status: 'pending', startedAt: undefined, completedAt: undefined, itemsTotal: 0, itemsDone: 0, itemsFailed: 0, itemsSkipped: 0, errors: [] },
  };

  return {
    url,
    phases,
    analyze: undefined,
    crawlResults: [],
    assetResults: [],
    generateResults: [],
    errors: [],
    startedAt: now,
    completedAt: undefined,
    totalDuration: 0,
  };
}
