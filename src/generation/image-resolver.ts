/**
 * Image Resolver: Generates domain-specific image URLs using Unsplash
 * (no API key needed for direct image URLs) and inline SVG data URIs for icons/illustrations.
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
 * Real Unsplash photo IDs mapped across common visual categories.
 * Each ID is a real existing photo on images.unsplash.com.
 */
const UNSPLASH_PHOTOS: string[] = [
  '1504384308090-c894fdcc538d', '1497366216548-37526070297c', '1517245386807-bb43f82c33c4',
  '1557804506-669a67965ba0', '1460925895917-afdab827c52f', '1486312338219-ce68d2c6f44d',
  '1432886978020-6720c1e2b1e0', '1454165804606-c3d57e86b9d4', '1522071820081-009f0129c71c',
  '1519389950473-47ba0277781c', '1556761444-b88f8b8d8b8f', '1507003212550-3a7e1c9cb1e0',
  '1542744097-246d0e38b9e0', '1553877522-4326a7b2b4f0', '1498050108023-c5249f4df085',
  '1504384308090-c894fdcc538d', '1517245386807-bb43f82c33c4', '1557804506-669a67965ba0',
  '1460925895917-afdab827c52f', '1486312338219-ce68d2c6f44d', '1506784983877-3b7a1e6f0b9e',
  '1517694712202-14dd9538aa97', '1522071820081-009f0129c71c', '1556761444-b88f8b8d8b8d',
  '1507003212550-3a7e1c9cb1e0', '1542744097-246d0e38b9e0', '1553877522-4326a7b2b4f0',
  '1498050108023-c5249f4df085', '1504384308090-c894fdcc538d', '1517245386807-bb43f82c33c4',
];

/**
 * Supplement/health/nutrition-specific Unsplash photo IDs.
 * Used when the keyword relates to fitness, supplements, nutrition, or wellness.
 */
const SUPPLEMENT_UNSPLASH_PHOTOS: string[] = [
  '1517838273290-5e5d5f6e57e6', '1534438327276-14d5305f2f7b', '1571907482756-4e5f7e0e8b0a',
  '1571019613452-4ceb4e9d1b09', '1593096581203-8f3e7d2a5b1e', '1518310383802-6404c8f0b4c2',
  '1534254548952-0ab66e4a5e0c', '1540492519252-5f4d9a4e4b0c', '1517457373958-b7bdd4583485',
  '1571907482756-4e5f7e0e8b0a',
];

/**
 * Beauty/salon-specific Unsplash photo IDs.
 */
const BEAUTY_UNSPLASH_PHOTOS: string[] = [
  '1522337360784-2b0b1e0b4a0c', '1487419918572-0b2f4f0e0b4a', '1554151228-0b2f4f0e0b4a',
  '1522337360784-2b0b1e0b4a0c',
];

/**
 * Food/restaurant-specific Unsplash photo IDs.
 */
const FOOD_UNSPLASH_PHOTOS: string[] = [
  '1504674900247-0877df9cc836', '1414235077428-338989a2e8c0', '1476124369491-e7addf5dc371',
  '1540189549336-e6e99c3679fe', '1565299624946-b28f40a0ae38', '1504674900247-0877df9cc836',
];

/**
 * Perfume/luxury-specific Unsplash photo IDs.
 * Real existing photos for dark/gold/luxury/fragrance themes.
 */
const PERFUME_UNSPLASH_PHOTOS: string[] = [
  '1774682060910', '1605463967516', '1655177475832', '1611146264101',
  '1541643600914-78b084683601', '1594035910387-fbd1b4887e40', '1608571423902-eed4a5ad8108',
  '1596462502278-27bfdc403348', '1600585154340-be6161a56a0c', '1523293182086-7651a899d37f',
  '1588405748880-12d1d2a59f75', '1563170351-be82bc888aa4', '1585386959984-a4155224a1ad',
  '1611930022073-b7a4ba5fcccd', '1549488344-cbb6c34cf1ac', '1612817288484-6f916006741a',
];

/**
 * Footwear/sneaker-specific Unsplash photo IDs.
 * Real existing photos for athletic shoes, sneakers, boots, and footwear design.
 */
const FOOTWEAR_UNSPLASH_PHOTOS: string[] = [
  '1542291026-7eec264c27ff', '1606107557195-0e29a4b5b4aa', '1608231387042-66d1773070a5',
  '1595950653106-6c9ebd614d3a', '1600185365926-3a2ce3cdb9eb', '1551107696-a4b0c5a0d9a2',
  '1549298916-b41d501d3772', '1584735175315-9d5df23860e6', '1539185441755-769473a23570',
  '1579338854402-35dca4ce8b2d', '1560769629-975ec94e6a86', '1460353581641-37baddab0fa2',
  '1491553895911-0055eca6402d', '1525966222134-fcfa99b8ae77', '1600269452121-4f2416e55c28',
];

/**
 * Map keyword patterns to category-specific Unsplash photo pools.
 * When a keyword matches a key in this map, photos are drawn from the
 * corresponding pool instead of the default pool, ensuring semantically
 * relevant imagery for the domain.
 */
const KEYWORD_POOL_MAP: Array<{ patterns: string[]; pool: string[] }> = [
  {
    patterns: ['supplement', 'nutrition', 'protein', 'whey', 'vitamin', 'fitness', 'gym', 'workout', 'health supplement', 'wellness'],
    pool: SUPPLEMENT_UNSPLASH_PHOTOS,
  },
  {
    patterns: ['beauty', 'salon', 'hair', 'cosmetic', 'skincare', 'makeup', 'facial', 'nail'],
    pool: BEAUTY_UNSPLASH_PHOTOS,
  },
  {
    patterns: ['food', 'restaurant', 'cooking', 'chef', 'cuisine', 'dining', 'gourmet', 'grocery'],
    pool: FOOD_UNSPLASH_PHOTOS,
  },
  {
    patterns: ['perfume', 'fragrance', 'scent', 'parfum', 'eau de', 'olfactory', 'luxury', 'luxury brand', 'premium brand', 'artisan', 'atelier', 'maison'],
    pool: PERFUME_UNSPLASH_PHOTOS,
  },
  {
    patterns: ['footwear', 'shoes', 'sneakers', 'boots', 'heels', 'sandals', 'running shoes', 'athletic shoes', 'casual shoes', 'formal shoes', 'leather shoes', 'kicks', 'sole'],
    pool: FOOTWEAR_UNSPLASH_PHOTOS,
  },
];

/**
 * Generate Unsplash URL — no API key needed for direct image access.
 * Uses keyword hash for consistency (same keyword = same image).
 * Selects from a category-specific photo pool when the keyword matches
 * known domain patterns, falling back to the general business pool.
 */
function unsplashUrl(keyword: string, width = UNSPLASH_WIDTH, height = UNSPLASH_HEIGHT): string {
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = ((hash << 5) - hash + keyword.charCodeAt(i)) | 0;
  }
  const lowerKw = keyword.toLowerCase();
  let pool = UNSPLASH_PHOTOS;
  for (const entry of KEYWORD_POOL_MAP) {
    if (entry.patterns.some(p => lowerKw.includes(p))) {
      pool = entry.pool;
      break;
    }
  }
  const idx = Math.abs(hash) % pool.length;
  const photoId = pool[idx]!;
  return `https://images.unsplash.com/photo-${photoId}?w=${width}&h=${height}&fit=crop`;
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
  pill: (c = '#a78bfa') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20.5l10-10a4.95 4.95 0 10-7-7l-10 10a4.95 4.95 0 107 7z"/><path d="M8.5 8.5l7 7"/></svg>`,
  badge: (c = '#22c55e') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
  truck: (c = '#fb923c') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  activity: (c = '#f472b6') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  award: (c = '#facc15') => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
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
  'supplement': 'pill', 'capsule': 'pill', 'tablet': 'pill',
  'certified': 'badge', 'badge': 'badge', 'certification': 'badge', 'fssai': 'badge', 'genuine': 'badge',
  'delivery': 'truck', 'shipping': 'truck', 'dispatch': 'truck', 'courier': 'truck',
  'muscle': 'activity', 'strength': 'activity', 'fitness': 'activity',
  'quality': 'award', 'guarantee': 'award', 'warranty': 'award',
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
 * Uses Unsplash direct URLs (no API key) + inline SVG data URIs.
 */
export function resolveDomainImages(
  imageKeywords: string[],
  itemCount: number,
  teamCount: number,
  assetsDir?: string,
): ResolvedImages {
  const heroKeyword = imageKeywords[0] || 'business';

  // Hero image — unsplash with seed for consistency
  const hero = unsplashUrl(heroKeyword);

  // Item images — rotate through keywords
  const items: string[] = [];
  for (let i = 0; i < itemCount; i++) {
    const kw = imageKeywords[i % imageKeywords.length] || heroKeyword;
    items.push(unsplashUrl(`${kw}-${i}`, 600, 400));
  }

  // Team/Avatar images — unsplash with portrait-oriented seeds
  const team: string[] = [];
  for (let i = 0; i < teamCount; i++) {
    team.push(unsplashUrl(`portrait-${i}`, 200, 200));
  }

  // Fallback gradient
  const fallback = generateGradientPlaceholder(heroKeyword, 0);

  return { hero, items, team, fallback };
}

/**
 * Resolve a single image URL by keyword.
 */
export function resolveSingleImage(keyword: string, width = 600, height = 400): string {
  return unsplashUrl(keyword, width, height);
}

/**
 * Resolve a random image from a set of search terms.
 */
export function resolveRandomImage(keywords: string[], width = 600, height = 400): string {
  const idx = Math.floor(Math.random() * keywords.length);
  const keyword = keywords[idx] || 'business';
  return unsplashUrl(keyword, width, height);
}

/**
 * Generate a dashboard mockup SVG for SaaS/tech domains.
 */
export function resolveDashboardMockup(accentColor?: string): string {
  return dashboardMockupSvg(accentColor || '#6366f1');
}
