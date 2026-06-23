import * as fs from 'fs';
import * as path from 'path';

export interface ResolvedImages {
  hero: string;
  items: string[];
  team: string[];
  fallback: string;
}

const UNSPLASH_WIDTH = 1200;
const UNSPLASH_HEIGHT = 800;

function unsplashUrl(keyword: string, width = UNSPLASH_WIDTH, height = UNSPLASH_HEIGHT): string {
  const query = encodeURIComponent(keyword);
  return `https://images.unsplash.com/photo-${getPhotoId(keyword)}?w=${width}&h=${height}&fit=crop&auto=format&q=80`;
}

function getPhotoId(keyword: string): string {
  const photoMap: Record<string, string> = {
    'luxury home': '1600596542815-ffad4c1539a9',
    'modern house': '1600585154340-be6161a56a0c',
    'apartment interior': '1502672260266-1c1ef2d93688',
    'real estate': '1560518883-ce09059eeffa',
    'fine dining': '1414235077428-338989a2e8c0',
    'restaurant interior': '1517248135467-4c7edcad34c4',
    'gourmet food': '1504674900247-0877df9cc836',
    'chef cooking': '1556910103-1c02745aae4d',
    'gym interior': '1534438327276-14e5300c3a48',
    'personal training': '1571019614242-c5c5dee9f50b',
    'yoga class': '1544367567-0f2fcb009e0b',
    'fitness workout': '1517836357463-d25dfeac3438',
    'dashboard': '1551288049-bebda4e38f71',
    'software interface': '1517694712202-14dd9538aa97',
    'analytics': '1460925895917-afdab827c52f',
    'team collaboration': '1522071820081-009f0129c71c',
    'doctor office': '1519494026892-80bbd2d6fd0d',
    'medical clinic': '1516549655169-df83a0774514',
    'healthcare professional': '1559839734-2b71ea197ec2',
    'patient care': '1576091160399-112ba8d25d1d',
    'law office': '1589829545856-d10d557cf95f',
    'courtroom': '1589994965851-a8f479c573a9',
    'legal books': '1507679799987-c73779587ccf',
    'attorney consultation': '1521791136064-7986c2920216',
    'product photography': '1505740420928-5e560c06d30e',
    'online store': '1556742049-0cfed4f6a45d',
    'shopping': '1472851294608-062f824d29cc',
    'ecommerce': '1563013544-824ae1b704d3',
    'business': '1497366216548-37526070297c',
    'technology': '1518770660439-4636190af475',
    'office': '1497366811353-6870744d04b2',
    'teamwork': '1522202176988-66273c2fd55f',
    'coffee shop': '1501339847302-ac426a4a7cbb',
    'bakery': '1509440159596-0249088772ff',
    'pizza': '1565299624946-b28f40a0ae38',
    'sushi': '1579871494447-9811cf80d66c',
    'burger': '1568901346375-23c9450c58cd',
    'wedding': '1519741497674-611481863552',
    'conference': '1540575467063-178a50c2df87',
    'concert': '1470229722913-7c0e2dbbafd3',
    'yoga': '1544367567-0f2fcb009e0b',
    'pilates': '1518611012118-6920709ab815',
    'crossfit': '1534438327276-14e5300c3a48',
    'online learning': '1501504905252-473c47e087f8',
    'classroom': '1580582932707-520aed937b7b',
    'university': '1562774053-701939374585',
    'charity': '1532629345422-7515f3d16bb6',
    'volunteer': '1559027615-cd4628902d4a',
  };

  return photoMap[keyword] || '1505740420928-5e560c06d30e';
}

function generateGradientPlaceholder(keyword: string, index: number): string {
  const colors: string[][] = [
    ['#1a1a2e', '#16213e', '#0f3460'],
    ['#0d1117', '#161b22', '#21262d'],
    ['#1a1a2e', '#2d1b69', '#11998e'],
    ['#0c0c0c', '#1a1a1a', '#2d2d2d'],
    ['#1b1b2f', '#162447', '#1f4068'],
    ['#0f0f0f', '#1a1a1a', '#2a2a2a'],
  ];
  const idx = index % colors.length;
  const pair = colors[idx]!;
  const angle = 135 + (index * 15);
  return `linear-gradient(${angle}deg, ${pair[0]}, ${pair[1]}, ${pair[2]})`;
}

export function resolveDomainImages(
  imageKeywords: string[],
  itemCount: number,
  teamCount: number,
  assetsDir?: string,
): ResolvedImages {
  const heroKeyword = imageKeywords[0] || 'business';

  const items: string[] = [];
  for (let i = 0; i < itemCount; i++) {
    const kw = imageKeywords[i % imageKeywords.length] || heroKeyword;
    items.push(unsplashUrl(kw, 600, 400));
  }

  const team: string[] = [];
  for (let i = 0; i < teamCount; i++) {
    team.push(`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(`team-${i}`)}&backgroundColor=1a1a2e&textColor=ffffff&fontSize=40`);
  }

  return {
    hero: unsplashUrl(heroKeyword),
    items,
    team,
    fallback: generateGradientPlaceholder(heroKeyword, 0),
  };
}

export function resolveSectionImage(
  sectionType: string,
  imageKeywords: string[],
  index: number,
): string {
  const keywordMap: Record<string, string> = {
    'hero': imageKeywords[0] || 'business',
    'featured-properties': 'modern house',
    'product-grid': 'product photography',
    'featured-products': 'product photography',
    'menu-highlights': 'gourmet food',
    'gallery': imageKeywords[0] || 'portfolio',
    'team': 'teamwork',
    'team/doctors': 'healthcare professional',
    'services': imageKeywords[0] || 'business',
    'about': 'office',
    'testimonials': 'teamwork',
    'contact': 'office',
  };

  const keyword = keywordMap[sectionType] || imageKeywords[index % imageKeywords.length] || 'business';
  return unsplashUrl(keyword, 800, 600);
}

export function generateSvgIcon(text: string, bgColor: string = '#1a1a2e', size: number = 200): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bgColor}" rx="16"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-family="system-ui, sans-serif" font-size="${size * 0.4}" font-weight="bold">${text}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function downloadImages(
  images: ResolvedImages,
  assetsDir: string,
): ResolvedImages {
  if (!assetsDir) return images;

  fs.mkdirSync(assetsDir, { recursive: true });

  const downloaded: ResolvedImages = { ...images };

  try {
    const heroFile = path.join(assetsDir, 'hero.jpg');
    if (!fs.existsSync(heroFile)) {
      // Don't download in sync mode — just return URLs
    }
  } catch {}

  return downloaded;
}
