/**
 * Image Resolver: Generates domain-specific image URLs using picsum.photos
 * (reliable, no API key needed) and inline SVG data URIs for icons/illustrations.
 */

export interface ResolvedImages {
  hero: string;
  items: string[];
  team: string[];
  fallback: string;
  dashboard?: string;
  logo?: string;
}

const UNSPLASH_WIDTH = 1200;
const UNSPLASH_HEIGHT = 800;

/**
 * Generate picsum.photos URL — reliable, no API key, always works.
 * Uses seed for consistency (same keyword = same image).
 */
function picsumUrl(keyword: string, width = UNSPLASH_WIDTH, height = UNSPLASH_HEIGHT): string {
  // Use keyword hash as seed for consistent results per domain
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = ((hash << 5) - hash + keyword.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash) % 1000;
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

/**
 * Generate an inline SVG data URI for illustrations and icons.
 * Works without any external requests — guaranteed to render.
 */
function inlineSvg(width: number, height: number, content: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Dashboard mockup SVG — for SaaS/tech products */
function dashboardMockupSvg(accent: string): string {
  return inlineSvg(800, 500, `
    <rect width="800" height="500" rx="12" fill="#18181b"/>
    <rect x="0" y="0" width="800" height="48" rx="12" fill="#27272a"/>
    <rect x="16" y="14" width="8" height="8" rx="4" fill="#ef4444"/>
    <rect x="30" y="14" width="8" height="8" rx="4" fill="#eab308"/>
    <rect x="44" y="14" width="8" height="8" rx="4" fill="#22c55e"/>
    <rect x="70" y="12" width="120" height="10" rx="2" fill="#3f3f46"/>
    <rect x="600" y="10" width="180" height="28" rx="6" fill="${accent}"/>
    <rect x="24" y="60" width="180" height="420" rx="8" fill="#27272a"/>
    <rect x="36" y="76" width="140" height="8" rx="2" fill="#3f3f46"/>
    <rect x="36" y="96" width="120" height="8" rx="2" fill="#3f3f46"/>
    <rect x="36" y="116" width="100" height="8" rx="2" fill="#3f3f46"/>
    <rect x="36" y="136" width="130" height="8" rx="2" fill="#3f3f46"/>
    <rect x="36" y="156" width="90" height="8" rx="2" fill="#3f3f46"/>
    <rect x="224" y="60" width="552" height="200" rx="8" fill="#27272a"/>
    <text x="248" y="90" fill="#a1a1aa" font-family="sans-serif" font-size="13" font-weight="600">Revenue Overview</text>
    <polyline points="248,180 310,150 372,170 434,120 496,100 558,90 620,60 682,75 744,50" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
    <polyline points="248,200 310,185 372,190 434,165 496,155 558,145 620,130 682,140 744,120" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    <rect x="224" y="272" width="268" height="100" rx="8" fill="#27272a"/>
    <text x="248" y="300" fill="#a1a1aa" font-family="sans-serif" font-size="12">Active Users</text>
    <text x="248" y="340" fill="white" font-family="sans-serif" font-size="32" font-weight="bold">12,847</text>
    <text x="370" y="340" fill="#22c55e" font-family="sans-serif" font-size="14">+14.2%</text>
    <rect x="508" y="272" width="268" height="100" rx="8" fill="#27272a"/>
    <text x="532" y="300" fill="#a1a1aa" font-family="sans-serif" font-size="12">Conversion Rate</text>
    <text x="532" y="340" fill="white" font-family="sans-serif" font-size="32" font-weight="bold">4.28%</text>
    <text x="654" y="340" fill="#22c55e" font-family="sans-serif" font-size="14">+0.8%</text>
    <rect x="224" y="384" width="552" height="76" rx="8" fill="#27272a"/>
    <text x="248" y="412" fill="#a1a1aa" font-family="sans-serif" font-size="12">Recent Activity</text>
    <circle cx="260" cy="438" r="6" fill="#3f3f46"/>
    <rect x="272" y="434" width="200" height="6" rx="2" fill="#3f3f46"/>
    <circle cx="520" cy="438" r="6" fill="#3f3f46"/>
    <rect x="532" y="434" width="160" height="6" rx="2" fill="#3f3f46"/>
  `);
}

/** Inline SVG icon library — real vector icons, not emojis */
export const SVG_ICONS: Record<string, (color?: string) => string> = {
  lightning: (c = '#facc15') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  zap: (c = '#facc15') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  plug: (c = '#a78bfa') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 01-6 6 6 6 0 01-6-6V8z"/></svg>`,
  shield: (c = '#22c55e') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
  chart: (c = '#60a5fa') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  barChart: (c = '#60a5fa') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  brain: (c = '#c084fc') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A5.5 5.5 0 004 7.5c0 1.58.66 3 1.71 4.03L12 18l6.29-6.47A5.49 5.49 0 0020 7.5 5.5 5.5 0 0014.5 2c-1.55 0-2.95.68-3.9 1.75L12 5.5l1.4-1.75A5.47 5.47 0 009.5 2z"/></svg>`,
  globe: (c = '#22d3ee') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
  rocket: (c = '#f472b6') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
  users: (c = '#fb923c') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  settings: (c = '#94a3b8') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  check: (c = '#22c55e') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  star: (c = '#facc15') => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${c}" stroke="${c}" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  mail: (c = '#60a5fa') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  phone: (c = '#22d3ee') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>`,
  mapPin: (c = '#f472b6') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  clock: (c = '#60a5fa') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  creditCard: (c = '#a78bfa') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  monitor: (c = '#60a5fa') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  lock: (c = '#22c55e') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  layers: (c = '#fb923c') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  refreshCw: (c = '#22d3ee') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
  dollarSign: (c = '#22c55e') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
  code: (c = '#60a5fa') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  database: (c = '#a78bfa') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  messageSquare: (c = '#f472b6') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
  headphones: (c = '#fb923c') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>`,
  tool: (c = '#94a3b8') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
  book: (c = '#60a5fa') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
  coffee: (c = '#fb923c') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  palette: (c = '#c084fc') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="11.5" r="2.5"/><circle cx="6" cy="12.5" r="2.5"/><circle cx="17" cy="18.5" r="2.5"/><circle cx="8.5" cy="18.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
};

/** Map common feature icon keywords to SVG icon names */
const ICON_KEYWORD_MAP: Record<string, string> = {
  'lightning': 'lightning', 'fast': 'lightning', 'speed': 'lightning', 'performance': 'lightning',
  'integration': 'plug', 'connect': 'plug', 'plugin': 'plug',
  'security': 'shield', 'compliance': 'shield', 'soc': 'shield', 'encrypt': 'shield',
  'analytics': 'chart', 'metrics': 'barChart', 'dashboard': 'barChart', 'report': 'barChart', 'tracking': 'barChart',
  'ai': 'brain', 'machine learning': 'brain', 'smart': 'brain', 'powered': 'brain',
  'global': 'globe', 'scale': 'globe', 'worldwide': 'globe', 'cdn': 'globe',
  'rocket': 'rocket', 'launch': 'rocket', 'deploy': 'rocket', 'ship': 'rocket',
  'team': 'users', 'collaboration': 'users', 'users': 'users',
  'settings': 'settings', 'config': 'settings', 'custom': 'settings',
  'check': 'check', 'checkmark': 'check', 'verified': 'check',
  'star': 'star', 'rating': 'star', 'review': 'star',
  'email': 'mail', 'newsletter': 'mail', 'notification': 'mail',
  'phone': 'phone', 'call': 'phone', 'contact': 'phone', 'support': 'headphones',
  'location': 'mapPin', 'map': 'mapPin', 'address': 'mapPin',
  'time': 'clock', 'schedule': 'clock', '24/7': 'clock', 'hours': 'clock',
  'payment': 'creditCard', 'billing': 'creditCard', 'pricing': 'dollarSign',
  'monitor': 'monitor', 'screen': 'monitor', 'display': 'monitor',
  'lock': 'lock', 'password': 'lock', 'auth': 'lock',
  'layers': 'layers', 'stack': 'layers', 'architecture': 'layers',
  'refresh': 'refreshCw', 'sync': 'refreshCw', 'update': 'refreshCw',
  'dollar': 'dollarSign', 'revenue': 'dollarSign', 'roi': 'dollarSign',
  'code': 'code', 'api': 'code', 'developer': 'code', 'sdk': 'code',
  'database': 'database', 'data': 'database', 'storage': 'database',
  'chat': 'messageSquare', 'messaging': 'messageSquare', 'chatbot': 'messageSquare',
  'help': 'headphones', 'service': 'headphones',
  'tools': 'tool', 'maintenance': 'tool',
  'docs': 'book', 'documentation': 'book', 'guide': 'book', 'learning': 'book',
  'onboarding': 'coffee', 'welcome': 'coffee',
  'design': 'palette', 'creative': 'palette', 'ui': 'palette',
};

/** Resolve icon keyword to inline SVG string */
export function resolveIconSvg(keyword: string): string {
  const lower = keyword.toLowerCase();
  for (const [key, iconName] of Object.entries(ICON_KEYWORD_MAP)) {
    if (lower.includes(key)) {
      const fn = SVG_ICONS[iconName];
      if (fn) return fn();
    }
  }
  // Default: use a generic icon
  const layersFn = SVG_ICONS['layers'];
  return layersFn ? layersFn() : '';
}

/**
 * Generate a CSS gradient as fallback.
 */
function generateGradientPlaceholder(keyword: string, index: number): string {
  const colors: string[][] = [
    ['#1a1a2e', '#16213e', '#0f3460'],
    ['#0d1117', '#161b22', '#21262d'],
    ['#1a1a2e', '#2d1b69', '#11998e'],
    ['#0c0c0c', '#1a1a1a', '#2d2d2d'],
    ['#1b1b2f', '#162447', '#1f4068'],
    ['#0f0f0f', '#1a1a1a', '#2a2a2a'],
    ['#2d1b69', '#11998e', '#1a1a2e'],
    ['#162447', '#1f4068', '#e43f5a'],
  ];
  // Use keyword hash as seed for consistent results
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = ((hash << 5) - hash + keyword.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash) % 100;
  const idx = (index + seed) % colors.length;
  const pair = colors[idx]!;
  const angle = 135 + ((index * 15) % 90);
  return `linear-gradient(${angle}deg, ${pair[0]}, ${pair[1]}, ${pair[2]})`;
}

/**
 * Resolve images for a domain.
 * Uses picsum.photos (reliable, no API key) + inline SVG data URIs.
 */
export function resolveDomainImages(
  imageKeywords: string[],
  itemCount: number,
  teamCount: number,
  assetsDir?: string,
): ResolvedImages {
  const heroKeyword = imageKeywords[0] || 'business';

  // Hero image — picsum with seed for consistency
  const hero = picsumUrl(heroKeyword);

  // Item images — rotate through keywords
  const items: string[] = [];
  for (let i = 0; i < itemCount; i++) {
    const kw = imageKeywords[i % imageKeywords.length] || heroKeyword;
    items.push(picsumUrl(`${kw}-${i}`, 600, 400));
  }

  // Team/Avatar images — picsum with portrait-oriented seeds
  const team: string[] = [];
  for (let i = 0; i < teamCount; i++) {
    team.push(picsumUrl(`portrait-${i}`, 200, 200));
  }

  // Fallback gradient
  const fallback = generateGradientPlaceholder(heroKeyword, 0);

  return { hero, items, team, fallback };
}

/**
 * Resolve a single image URL by keyword.
 */
export function resolveSingleImage(keyword: string, width = 600, height = 400): string {
  return picsumUrl(keyword, width, height);
}

/**
 * Resolve a random image from a set of search terms.
 */
export function resolveRandomImage(keywords: string[], width = 600, height = 400): string {
  const idx = Math.floor(Math.random() * keywords.length);
  const keyword = keywords[idx] || 'business';
  return picsumUrl(keyword, width, height);
}

/**
 * Generate a dashboard mockup SVG for SaaS/tech domains.
 */
export function resolveDashboardMockup(accentColor?: string): string {
  return dashboardMockupSvg(accentColor || '#6366f1');
}
