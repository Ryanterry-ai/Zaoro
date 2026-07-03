// ─── Design DNA Engine ────────────────────────────────────────────
// Single source of truth for every visual decision.
// Maps Industry -> Audience -> Brand Personality -> Design Language.
// Every downstream agent reads from this instead of making its own choices.

// Minimal IntentDNA — only the fields design-dna needs
interface IntentDNA {
  business_domain: string;
  design_style?: string;
}

export interface DesignDNA {
  industry: string;
  brandPersonality: BrandPersonality;
  designStyle: DesignStyle;
  colors: ColorDNA;
  typography: TypographyDNA;
  spacing: SpacingDNA;
  radius: RadiusDNA;
  shadows: ShadowDNA;
  motion: MotionDNA;
  icons: IconDNA;
  photography: PhotographyDNA;
  illustration: IllustrationDNA;
  charts: ChartDNA;
  tables: TableDNA;
  forms: FormDNA;
  buttons: ButtonDNA;
  cards: CardDNA;
  navigation: NavigationDNA;
  layout: LayoutDNA;
}

export type BrandPersonality =
  | 'premium' | 'luxury' | 'professional' | 'trustworthy'
  | 'energetic' | 'playful' | 'creative' | 'modern'
  | 'minimal' | 'bold' | 'warm' | 'calming'
  | 'authoritative' | 'community' | 'eco' | 'tech';

export type DesignStyle =
  | 'glassmorphism' | 'flat' | 'neumorphism' | 'brutalist'
  | 'minimal' | 'bold' | 'editorial' | 'gradient'
  | 'dark' | 'light' | 'mixed';

export interface ColorDNA {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  info: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  border: string;
  input: string;
  ring: string;
  paletteName: string;
  gradients: { hero: string; card: string; button: string; subtle: string };
}

export interface TypographyDNA {
  heading: string;
  body: string;
  mono: string;
  googleFontsUrl: string;
  scale: {
    display: { size: string; lineHeight: string; weight: string; tracking: string };
    h1: { size: string; lineHeight: string; weight: string; tracking: string };
    h2: { size: string; lineHeight: string; weight: string; tracking: string };
    h3: { size: string; lineHeight: string; weight: string; tracking: string };
    h4: { size: string; lineHeight: string; weight: string; tracking: string };
    bodyLg: { size: string; lineHeight: string; weight: string; tracking: string };
    body: { size: string; lineHeight: string; weight: string; tracking: string };
    bodySm: { size: string; lineHeight: string; weight: string; tracking: string };
    caption: { size: string; lineHeight: string; weight: string; tracking: string };
    overline: { size: string; lineHeight: string; weight: string; tracking: string };
  };
  weights: { heading: string; subheading: string; body: string; caption: string; button: string };
}

export interface SpacingDNA {
  baseUnit: number;
  scale: Record<string, string>;
  section: { sm: string; md: string; lg: string; xl: string };
  container: { padding: string; maxWidth: string };
  card: { padding: string; gap: string };
  stack: { gap: string };
  grid: { columns: { sm: number; md: number; lg: number; xl: number }; gap: string };
}

export interface RadiusDNA {
  none: string; sm: string; md: string; lg: string; xl: string; '2xl': string; full: string;
  button: string; card: string; input: string; badge: string; avatar: string; dialog: string;
}

export interface ShadowDNA {
  none: string; xs: string; sm: string; md: string; lg: string; xl: string; '2xl': string; glow: string;
  card: string; cardHover: string; button: string; input: string; dropdown: string; modal: string;
}

export interface MotionDNA {
  duration: { instant: number; fast: number; normal: number; slow: number; verySlow: number };
  easing: { default: string; in: string; out: string; inOut: string; spring: string };
  spring: { gentle: { stiffness: number; damping: number }; wobbly: { stiffness: number; damping: number }; stiff: { stiffness: number; damping: number }; slow: { stiffness: number; damping: number } };
  gesture: { hover: { scale: number; duration: number }; tap: { scale: number; duration: number }; focus: { ring: string; offset: number } };
  stagger: { children: number; grid: number; list: number };
  scrollReveal: { initial: Record<string, number>; whileInView: Record<string, number>; viewportOnce: boolean; viewportAmount: number };
  entranceDirection: 'bottom' | 'left' | 'right' | 'scale';
}

export interface IconDNA {
  library: 'lucide' | 'heroicons' | 'tabler';
  mapping: Record<string, string>;
  sizes: { sm: number; md: number; lg: number; xl: number };
  strokeWidth: number;
}

export interface PhotographyDNA {
  queryTemplates: string[];
  style: string;
  moodKeywords: string[];
  fallbackSource: 'picsum' | 'unsplash' | 'pexels';
  heroStrategy: 'photo' | 'gradient' | 'illustration' | 'split';
  treatment: { overlay: boolean; overlayOpacity: number; borderRadius: string; aspectRatio: string };
}

export interface IllustrationDNA {
  style: 'line' | 'filled' | 'isometric' | '3d' | 'abstract' | 'none';
  colorTreatment: 'mono' | 'duotone' | 'full' | 'accent-only';
  complexity: 'simple' | 'moderate' | 'detailed';
  contexts: string[];
}

export interface ChartDNA {
  byDataType: {
    trend: 'line' | 'area'; comparison: 'bar' | 'horizontalBar';
    distribution: 'pie' | 'donut'; composition: 'stackedBar' | 'area';
    relationship: 'scatter' | 'bubble'; kpi: 'number' | 'gauge' | 'sparkline';
  };
  seriesColors: string[];
  style: { borderWidth: number; borderRadius: number; gridColor: string; labelColor: string; fontFamily: string };
}

export interface TableDNA {
  density: 'compact' | 'comfortable' | 'spacious';
  striped: boolean; bordered: boolean; hoverable: boolean;
  headerStyle: 'filled' | 'underline' | 'bordered';
  cellPadding: string; fontSize: string;
}

export interface FormDNA {
  layout: 'stacked' | 'inline' | 'floating' | 'multi-column';
  inputStyle: 'outlined' | 'filled' | 'underlined' | 'glass';
  labelPosition: 'top' | 'left' | 'floating' | 'placeholder';
  validation: 'inline' | 'toast' | 'modal';
  submitStyle: 'full-width' | 'auto' | 'loading-spinner';
}

export interface ButtonDNA {
  variants: { primary: string; secondary: string; outline: string; ghost: string; destructive: string; link: string };
  sizes: { sm: string; md: string; lg: string; icon: string };
  radius: string; shadow: string; shadowHover: string;
}

export interface CardDNA {
  style: 'filled' | 'outlined' | 'elevated' | 'glass';
  variants: { default: string; interactive: string; featured: string };
  padding: string; border: string; shadow: string; shadowHover: string;
}

export interface NavigationDNA {
  type: 'top' | 'sidebar' | 'bottom' | 'mixed';
  style: 'solid' | 'transparent' | 'glass' | 'bordered';
  sticky: boolean;
  mobileStyle: 'hamburger' | 'bottom-bar' | 'drawer';
  maxItems: number;
}

export interface LayoutDNA {
  heroLayout: 'centered' | 'split' | 'left' | 'full-width' | 'gradient';
  sectionSpacing: string; container: string; grid: string; maxWidth: string;
  density: 'compact' | 'comfortable' | 'spacious';
  sidebar: boolean; sidebarWidth: string;
}

// ─── Design DNA Generator ────────────────────────────────────────
// Single entry point: IntentDNA → full DesignDNA object

export function generateDesignDNA(intent: IntentDNA): DesignDNA {
  const industry = intent.business_domain;
  const personality = inferPersonality(industry, intent.design_style);
  const style = inferStyle(personality);
  return {
    industry, brandPersonality: personality, designStyle: style,
    colors: buildColors(industry, personality),
    typography: buildTypography(personality),
    spacing: buildSpacing(personality),
    radius: buildRadius(industry),
    shadows: buildShadows(personality),
    motion: buildMotion(personality),
    icons: buildIcons(industry),
    photography: buildPhotography(industry, personality),
    illustration: buildIllustration(personality),
    charts: buildCharts(industry),
    tables: buildTables(industry),
    forms: buildForms(industry),
    buttons: buildButtons(personality),
    cards: buildCards(personality),
    navigation: buildNav(industry),
    layout: buildLayout(industry, personality),
  };
}

function inferPersonality(industry: string, ds?: string): BrandPersonality {
  if (ds) {
    const m: Record<string, BrandPersonality> = {
      glassmorphism:'modern', flat:'minimal', neumorphism:'premium',
      brutalist:'bold', minimal:'minimal', bold:'bold',
      editorial:'creative', gradient:'modern', dark:'tech', light:'minimal',
    };
    if (m[ds]) return m[ds];
  }
  const im: Record<string, BrandPersonality> = {
    saas:'modern', tech:'tech', startup:'modern', ecommerce:'premium', shopify:'premium',
    restaurant:'warm', cafe:'warm', bakery:'warm', food:'warm', beverage:'warm',
    fitness:'energetic', gym:'energetic', wellness:'calming', yoga:'calming',
    healthcare:'trustworthy', medical:'trustworthy', dental:'trustworthy',
    finance:'professional', banking:'authoritative', insurance:'trustworthy', accounting:'professional',
    law:'authoritative', legal:'authoritative', education:'trustworthy', university:'authoritative',
    portfolio:'creative', agency:'creative', studio:'creative',
    blog:'professional', news:'professional', magazine:'professional',
    real_estate:'professional', property:'professional', travel:'warm', hotel:'luxury', booking:'modern',
    nonprofit:'community', charity:'community', government:'authoritative',
    crypto:'tech', web3:'tech', gaming:'bold', fashion:'luxury', beauty:'premium',
    automotive:'bold', manufacturing:'professional', agriculture:'eco', sustainability:'eco',
  };
  return im[industry.toLowerCase()] || 'professional';
}

function inferStyle(p: BrandPersonality): DesignStyle {
  const m: Record<BrandPersonality, DesignStyle> = {
    premium:'glassmorphism', luxury:'minimal', professional:'flat', trustworthy:'flat',
    energetic:'bold', playful:'bold', creative:'editorial', modern:'gradient',
    minimal:'minimal', bold:'bold', warm:'flat', calming:'minimal',
    authoritative:'flat', community:'flat', eco:'minimal', tech:'dark',
  };
  return m[p] || 'flat';
}

function buildColors(industry: string, personality: BrandPersonality): ColorDNA {
  const P: Record<string, string> = {
    blue:'217.2 91.2% 59.8%', indigo:'234.7 80.4% 59.8%', sky:'198.6 88.7% 48.4%', cyan:'183.5 65.3% 40.4%',
    emerald:'160.1 84.1% 39.4%', teal:'171.3 76.4% 35.9%', green:'142.1 70.6% 45.3%',
    violet:'263.4 83.5% 57.8%', purple:'270.7 76.4% 51.6%', fuchsia:'290.9 66.6% 56.1%',
    amber:'37.7 92.1% 50.2%', orange:'24.6 95% 53.1%', yellow:'47.9 95.8% 53.1%',
    red:'0 84.2% 60.2%', rose:'346.8 77.2% 49.8%', pink:'330.4 74.2% 55.3%',
    slate:'215.4 16.3% 46.9%', gray:'220 8.9% 46.1%', zinc:'240 5.2% 46.1%',
    neutral:'0 0% 45.1%', stone:'24 5.4% 45.5%',
  };
  const ic: Record<string, string> = {
    saas:'indigo', tech:'blue', startup:'violet', ecommerce:'violet', shopify:'violet',
    restaurant:'orange', cafe:'amber', bakery:'amber', food:'orange', beverage:'amber',
    fitness:'red', gym:'red', wellness:'teal', yoga:'emerald',
    healthcare:'blue', medical:'blue', dental:'sky',
    finance:'blue', banking:'indigo', insurance:'blue', accounting:'slate',
    law:'slate', legal:'zinc', education:'blue', university:'indigo',
    portfolio:'violet', agency:'violet', studio:'fuchsia',
    blog:'slate', news:'slate', magazine:'stone',
    real_estate:'blue', property:'slate', travel:'teal', hotel:'emerald', booking:'cyan',
    nonprofit:'green', charity:'emerald', crypto:'violet', web3:'purple',
    gaming:'red', fashion:'rose', beauty:'pink', automotive:'slate', manufacturing:'gray',
    agriculture:'green', sustainability:'emerald', government:'slate',
  };
  const pn = ic[industry.toLowerCase()] || 'blue';
  const sec: Record<string, string> = {
    blue:'sky', indigo:'violet', sky:'cyan', cyan:'teal', emerald:'teal', teal:'cyan',
    green:'emerald', violet:'purple', purple:'fuchsia', fuchsia:'pink',
    amber:'orange', orange:'red', yellow:'amber', red:'orange', rose:'pink', pink:'rose',
    slate:'gray', gray:'zinc', zinc:'neutral', neutral:'stone', stone:'zinc',
  };
  const ac: Record<string, string> = {
    blue:'cyan', indigo:'blue', sky:'blue', cyan:'emerald', emerald:'green', teal:'green',
    green:'teal', violet:'indigo', purple:'violet', fuchsia:'purple',
    amber:'yellow', orange:'amber', yellow:'orange', red:'rose', rose:'fuchsia', pink:'fuchsia',
    slate:'zinc', gray:'slate', zinc:'slate', neutral:'gray', stone:'neutral',
  };
  const s = sec[pn] || 'slate', a = ac[pn] || 'indigo';
  const dark = personality === 'tech' || personality === 'bold';
  const bg = dark ? '222.2 84% 4.9%' : '0 0% 100%';
  const fg = dark ? '210 40% 98%' : '222.2 84% 4.9%';
  const cd = dark ? '222.2 84% 6.9%' : '0 0% 100%';
  const mt = dark ? '217.2 32.6% 17.5%' : '210 40% 96.1%';
  const bd = dark ? '217.2 32.6% 17.5%' : '214.3 31.8% 91.4%';
  const primaryHsl = P[pn] ?? P.blue ?? '217.2 91.2% 59.8%';
  const secondaryHsl = P[s] ?? P.slate ?? '215.4 16.3% 46.9%';
  const accentHsl = P[a] ?? P.indigo ?? '234.7 80.4% 59.8%';
  return {
    primary: primaryHsl, primaryForeground: '210 40% 98%',
    secondary: secondaryHsl, secondaryForeground: fg,
    accent: accentHsl, accentForeground: fg,
    muted: mt, mutedForeground: '215.4 16.3% 46.9%',
    destructive: '0 84.2% 60.2%', destructiveForeground: '210 40% 98%',
    success: '142.1 70.6% 45.3%', warning: '37.7 92.1% 50.2%', info: '217.2 91.2% 59.8%',
    background: bg, foreground: fg, card: cd, cardForeground: fg,
    popover: cd, popoverForeground: fg, border: bd, input: bd, ring: primaryHsl,
    paletteName: pn,
    gradients: {
      hero: `linear-gradient(135deg, hsl(${primaryHsl}) 0%, hsl(${secondaryHsl}) 100%)`,
      card: `linear-gradient(180deg, hsl(${cd}) 0%, hsl(${mt}) 100%)`,
      button: `linear-gradient(135deg, hsl(${primaryHsl}) 0%, hsl(${accentHsl}) 100%)`,
      subtle: `linear-gradient(180deg, transparent 0%, hsl(${mt}) 100%)`,
    },
  };
}

function buildTypography(personality: BrandPersonality): TypographyDNA {
  const pf: Record<string, { h: string; b: string; m: string }> = {
    premium:{h:'Inter, system-ui, sans-serif',b:'Inter, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    luxury:{h:'Playfair Display, Georgia, serif',b:'Inter, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    professional:{h:'Inter, system-ui, sans-serif',b:'Inter, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    trustworthy:{h:'Inter, system-ui, sans-serif',b:'Inter, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    energetic:{h:'Space Grotesk, system-ui, sans-serif',b:'DM Sans, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    playful:{h:'Nunito, system-ui, sans-serif',b:'Nunito, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    creative:{h:'Plus Jakarta Sans, system-ui, sans-serif',b:'Plus Jakarta Sans, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    modern:{h:'Plus Jakarta Sans, system-ui, sans-serif',b:'Plus Jakarta Sans, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    minimal:{h:'system-ui, -apple-system, sans-serif',b:'system-ui, -apple-system, sans-serif',m:'ui-monospace, monospace'},
    bold:{h:'Space Grotesk, system-ui, sans-serif',b:'DM Sans, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    warm:{h:'Inter, system-ui, sans-serif',b:'Inter, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    calming:{h:'Inter, system-ui, sans-serif',b:'Inter, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    authoritative:{h:'system-ui, -apple-system, sans-serif',b:'system-ui, -apple-system, sans-serif',m:'ui-monospace, monospace'},
    community:{h:'Inter, system-ui, sans-serif',b:'Inter, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    eco:{h:'Inter, system-ui, sans-serif',b:'Inter, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
    tech:{h:'Space Grotesk, system-ui, sans-serif',b:'DM Sans, system-ui, sans-serif',m:'JetBrains Mono, monospace'},
  };
  const defaultFonts = { h:'Inter, system-ui, sans-serif', b:'Inter, system-ui, sans-serif', m:'JetBrains Mono, monospace' };
  const f = pf[personality] ?? defaultFonts;
  const S = (sz: string, lh: string, w: string, tr: string) => ({ size: sz, lineHeight: lh, weight: w, tracking: tr });
  const modern = { display:S('4rem','1','800','-0.03em'), h1:S('3.25rem','1.1','800','-0.025em'), h2:S('2.25rem','1.2','700','-0.02em'), h3:S('1.75rem','1.3','700','-0.01em'), h4:S('1.375rem','1.4','600','0'), bodyLg:S('1.0625rem','1.7','400','0'), body:S('0.9375rem','1.6','400','0'), bodySm:S('0.8125rem','1.5','400','0'), caption:S('0.6875rem','1.4','600','0.03em'), overline:S('0.6875rem','1.4','700','0.1em') };
  const premium = { display:S('4.5rem','1','800','-0.04em'), h1:S('3.5rem','1.1','800','-0.03em'), h2:S('2.5rem','1.2','700','-0.02em'), h3:S('1.875rem','1.3','700','-0.01em'), h4:S('1.5rem','1.4','600','0'), bodyLg:S('1.125rem','1.7','400','0'), body:S('1rem','1.6','400','0'), bodySm:S('0.875rem','1.5','400','0'), caption:S('0.75rem','1.4','500','0.02em'), overline:S('0.75rem','1.4','700','0.08em') };
  const luxury = { display:S('5rem','0.95','700','-0.03em'), h1:S('3.75rem','1.05','700','-0.02em'), h2:S('2.75rem','1.15','600','-0.01em'), h3:S('2rem','1.25','600','0'), h4:S('1.5rem','1.35','600','0'), bodyLg:S('1.125rem','1.8','400','0'), body:S('1rem','1.7','400','0'), bodySm:S('0.875rem','1.6','400','0'), caption:S('0.75rem','1.5','500','0.01em'), overline:S('0.6875rem','1.4','700','0.1em') };
  const bold = { display:S('5rem','0.95','800','-0.04em'), h1:S('4rem','1','800','-0.035em'), h2:S('3rem','1.1','700','-0.02em'), h3:S('2.25rem','1.2','700','-0.01em'), h4:S('1.75rem','1.3','600','0'), bodyLg:S('1.125rem','1.7','400','0'), body:S('1rem','1.6','400','0'), bodySm:S('0.875rem','1.5','400','0'), caption:S('0.75rem','1.4','600','0.02em'), overline:S('0.75rem','1.4','800','0.12em') };
  const minimal = { display:S('3.5rem','1.05','700','-0.02em'), h1:S('3rem','1.1','700','-0.02em'), h2:S('2.25rem','1.2','600','-0.01em'), h3:S('1.75rem','1.3','600','0'), h4:S('1.375rem','1.4','500','0'), bodyLg:S('1.0625rem','1.7','400','0'), body:S('1rem','1.6','400','0'), bodySm:S('0.875rem','1.5','400','0'), caption:S('0.75rem','1.4','500','0.01em'), overline:S('0.6875rem','1.4','600','0.08em') };
  const scaleMap: Record<string, typeof modern> = { premium, luxury, bold, minimal, modern };
  const sc = scaleMap[personality] ?? modern;
  const hFont = f.h.split(',')[0] ?? 'Inter';
  const bFont = f.b.split(',')[0] ?? 'Inter';
  const uniqueFonts = [hFont, bFont].filter((v, i, a) => a.indexOf(v) === i);
  const gf = uniqueFonts.map(v => v.replace(/ /g, '+')).join('&family=');
  return {
    heading: f.h, body: f.b, mono: f.m,
    googleFontsUrl: `https://fonts.googleapis.com/css2?family=${gf}:wght@400;500;600;700;800&display=swap`,
    scale: sc,
    weights: { heading:'700', subheading:'600', body:'400', caption:'500', button:'600' },
  };
}

function buildSpacing(personality: BrandPersonality): SpacingDNA {
  const dm: Record<string, string> = {
    luxury:'spacious', premium:'comfortable', professional:'comfortable', trustworthy:'comfortable',
    energetic:'compact', playful:'comfortable', creative:'comfortable', modern:'comfortable',
    minimal:'spacious', bold:'compact', warm:'comfortable', calming:'spacious',
    authoritative:'comfortable', community:'comfortable', eco:'comfortable', tech:'compact',
  };
  const d = dm[personality] || 'comfortable';
  const cfg: Record<string, {
    u: number;
    s: { sm: string; md: string; lg: string; xl: string };
    c: { padding: string; maxWidth: string };
    card: { padding: string; gap: string };
    st: { gap: string };
    g: { columns: { sm: number; md: number; lg: number; xl: number }; gap: string };
  }> = {
    compact: {
      u: 4,
      s: { sm:'py-8 sm:py-12', md:'py-12 sm:py-16', lg:'py-16 sm:py-20', xl:'py-20 sm:py-24' },
      c: { padding:'px-4 sm:px-6', maxWidth:'max-w-6xl' },
      card: { padding:'p-4', gap:'gap-4' },
      st: { gap:'gap-3' },
      g: { columns: { sm:1, md:2, lg:3, xl:4 }, gap:'gap-4' },
    },
    comfortable: {
      u: 4,
      s: { sm:'py-10 sm:py-14', md:'py-14 sm:py-20', lg:'py-20 sm:py-28', xl:'py-24 sm:py-32' },
      c: { padding:'px-4 sm:px-6 lg:px-8', maxWidth:'max-w-7xl' },
      card: { padding:'p-6', gap:'gap-6' },
      st: { gap:'gap-4' },
      g: { columns: { sm:1, md:2, lg:3, xl:4 }, gap:'gap-6' },
    },
    spacious: {
      u: 8,
      s: { sm:'py-12 sm:py-16', md:'py-20 sm:py-28', lg:'py-28 sm:py-36', xl:'py-32 sm:py-40' },
      c: { padding:'px-6 sm:px-8 lg:px-12', maxWidth:'max-w-6xl' },
      card: { padding:'p-8', gap:'gap-8' },
      st: { gap:'gap-6' },
      g: { columns: { sm:1, md:2, lg:3, xl:3 }, gap:'gap-8' },
    },
  };
  const defaultSpacing = {
    u: 4,
    s: { sm:'py-10 sm:py-14', md:'py-14 sm:py-20', lg:'py-20 sm:py-28', xl:'py-24 sm:py-32' },
    c: { padding:'px-4 sm:px-6 lg:px-8', maxWidth:'max-w-7xl' },
    card: { padding:'p-6', gap:'gap-6' },
    st: { gap:'gap-4' },
    g: { columns: { sm:1, md:2, lg:3, xl:4 }, gap:'gap-6' },
  };
  const c = cfg[d] ?? defaultSpacing;
  return {
    baseUnit: c.u,
    scale: { '0':'0', px:'1px', '0.5':'0.125rem', '1':'0.25rem', '1.5':'0.375rem', '2':'0.5rem', '2.5':'0.625rem', '3':'0.75rem', '3.5':'0.875rem', '4':'1rem', '5':'1.25rem', '6':'1.5rem', '7':'1.75rem', '8':'2rem', '9':'2.25rem', '10':'2.5rem', '12':'3rem', '14':'3.5rem', '16':'4rem', '20':'5rem', '24':'6rem', '28':'7rem', '32':'8rem' },
    section: c.s, container: c.c, card: c.card, stack: c.st, grid: c.g,
  };
}

function buildRadius(industry: string): RadiusDNA {
  const rm: Record<string, { sm: string; md: string; lg: string; xl: string }> = {
    healthcare: { sm:'0.375rem', md:'0.5rem', lg:'0.75rem', xl:'1rem' },
    finance: { sm:'0.25rem', md:'0.375rem', lg:'0.5rem', xl:'0.75rem' },
    legal: { sm:'0.125rem', md:'0.25rem', lg:'0.375rem', xl:'0.5rem' },
    crypto: { sm:'0.5rem', md:'0.75rem', lg:'1rem', xl:'1.5rem' },
    gaming: { sm:'0.5rem', md:'0.75rem', lg:'1rem', xl:'1.5rem' },
    startup: { sm:'0.5rem', md:'0.75rem', lg:'1rem', xl:'1.25rem' },
    saas: { sm:'0.375rem', md:'0.5rem', lg:'0.75rem', xl:'1rem' },
    restaurant: { sm:'0.5rem', md:'0.75rem', lg:'1rem', xl:'1.25rem' },
    luxury: { sm:'0.125rem', md:'0.25rem', lg:'0.375rem', xl:'0.5rem' },
    portfolio: { sm:'0.25rem', md:'0.375rem', lg:'0.5rem', xl:'0.75rem' },
  };
  const r = rm[industry.toLowerCase()] || { sm:'0.375rem', md:'0.5rem', lg:'0.75rem', xl:'1rem' };
  return {
    none:'0', sm:r.sm, md:r.md, lg:r.lg, xl:r.xl, '2xl':r.xl, full:'9999px',
    button:r.md, card:r.lg, input:r.md, badge:'9999px', avatar:'50%', dialog:r.xl,
  };
}

function buildShadows(personality: BrandPersonality): ShadowDNA {
  const sm: Record<BrandPersonality, { c: string; e: string; g: string }> = {
    luxury: { c:'0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', e:'0 4px 20px rgba(0,0,0,0.08)', g:'0 0 40px rgba(0,0,0,0.06)' },
    premium: { c:'0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08)', e:'0 8px 24px rgba(0,0,0,0.12)', g:'0 0 40px rgba(0,0,0,0.08)' },
    professional: { c:'0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08)', e:'0 4px 16px rgba(0,0,0,0.1)', g:'0 0 30px rgba(0,0,0,0.06)' },
    trustworthy: { c:'0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08)', e:'0 4px 16px rgba(0,0,0,0.1)', g:'0 0 30px rgba(0,0,0,0.06)' },
    energetic: { c:'0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.1)', e:'0 8px 24px rgba(0,0,0,0.14)', g:'0 0 40px rgba(255,100,50,0.15)' },
    playful: { c:'0 2px 8px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.08)', e:'0 8px 20px rgba(0,0,0,0.12)', g:'0 0 40px rgba(120,80,255,0.12)' },
    creative: { c:'0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)', e:'0 8px 24px rgba(0,0,0,0.12)', g:'0 0 40px rgba(120,80,255,0.1)' },
    modern: { c:'0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', e:'0 4px 20px rgba(0,0,0,0.1)', g:'0 0 40px rgba(99,102,241,0.1)' },
    minimal: { c:'0 1px 2px rgba(0,0,0,0.04)', e:'0 2px 8px rgba(0,0,0,0.06)', g:'none' },
    bold: { c:'0 2px 8px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.12)', e:'0 8px 24px rgba(0,0,0,0.16)', g:'0 0 40px rgba(239,68,68,0.15)' },
    warm: { c:'0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08)', e:'0 4px 16px rgba(0,0,0,0.1)', g:'0 0 40px rgba(245,158,11,0.1)' },
    calming: { c:'0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', e:'0 4px 16px rgba(0,0,0,0.08)', g:'0 0 40px rgba(20,184,166,0.1)' },
    authoritative: { c:'0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08)', e:'0 4px 16px rgba(0,0,0,0.1)', g:'none' },
    community: { c:'0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', e:'0 4px 16px rgba(0,0,0,0.08)', g:'0 0 30px rgba(34,197,94,0.1)' },
    eco: { c:'0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', e:'0 4px 16px rgba(0,0,0,0.08)', g:'0 0 30px rgba(34,197,94,0.1)' },
    tech: { c:'0 0 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.3)', e:'0 8px 24px rgba(0,0,0,0.4)', g:'0 0 40px rgba(99,102,241,0.2)' },
  };
  const s = sm[personality] || sm.professional;
  return {
    none:'none', xs:'0 1px 2px rgba(0,0,0,0.04)',
    sm:'0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08)',
    md:'0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
    lg:'0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
    xl:'0 20px 25px rgba(0,0,0,0.1), 0 8px 10px rgba(0,0,0,0.04)',
    '2xl':'0 25px 50px rgba(0,0,0,0.25)',
    glow: s.g, card: s.c, cardHover: s.e,
    button:'0 1px 2px rgba(0,0,0,0.05)', input:'0 1px 2px rgba(0,0,0,0.04)',
    dropdown:'0 4px 20px rgba(0,0,0,0.12)', modal:'0 8px 32px rgba(0,0,0,0.2)',
  };
}

function buildMotion(personality: BrandPersonality): MotionDNA {
  const b = (
    dur: number[], hsc: number, ts: number[],
    ent: 'bottom' | 'left' | 'right' | 'scale',
  ): MotionDNA => ({
    duration: { instant: dur[0] ?? 100, fast: dur[1] ?? 150, normal: dur[2] ?? 250, slow: dur[3] ?? 350, verySlow: dur[4] ?? 500 },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: `spring(${ts[0] ?? 100}, ${ts[1] ?? 20})`,
    },
    spring: {
      gentle: { stiffness: ts[0] ?? 100, damping: ts[1] ?? 20 },
      wobbly: { stiffness: ts[2] ?? 200, damping: ts[3] ?? 10 },
      stiff: { stiffness: 400, damping: 30 },
      slow: { stiffness: 50, damping: 20 },
    },
    gesture: {
      hover: { scale: hsc, duration: 200 },
      tap: { scale: 0.98, duration: 100 },
      focus: { ring: '2px solid ring', offset: 2 },
    },
    stagger: { children: 75, grid: 50, list: 60 },
    scrollReveal: {
      initial: { opacity: 0, y: 30 },
      whileInView: { opacity: 1, y: 0 },
      viewportOnce: true,
      viewportAmount: 0.3,
    },
    entranceDirection: ent,
  });
  const m: Record<BrandPersonality, MotionDNA> = {
    premium: b([100,150,250,350,500], 1.02, [100,20], 'bottom'),
    luxury: b([150,200,350,450,600], 1.01, [80,25], 'bottom'),
    professional: b([100,150,250,350,500], 1.02, [100,20], 'bottom'),
    trustworthy: b([100,150,250,350,500], 1.02, [100,20], 'bottom'),
    energetic: b([50,100,150,250,400], 1.06, [200,10], 'bottom'),
    playful: b([50,100,200,300,400], 1.05, [150,12], 'scale'),
    creative: b([100,150,250,350,500], 1.03, [120,15], 'left'),
    modern: b([50,100,200,300,400], 1.03, [150,12], 'bottom'),
    minimal: b([100,200,300,400,500], 1.01, [100,20], 'bottom'),
    bold: b([50,100,150,250,400], 1.05, [200,10], 'scale'),
    warm: b([100,150,300,400,500], 1.02, [100,20], 'bottom'),
    calming: b([150,200,350,450,600], 1.01, [80,25], 'bottom'),
    authoritative: b([100,150,250,350,500], 1.01, [100,20], 'bottom'),
    community: b([100,150,200,300,400], 1.03, [120,15], 'bottom'),
    eco: b([150,200,350,450,600], 1.01, [80,25], 'bottom'),
    tech: b([50,100,150,250,400], 1.04, [180,12], 'left'),
  };
  return m[personality] || m.professional;
}

function buildIcons(_industry: string): IconDNA {
  return {
    library: 'lucide',
    mapping: {
      dashboard:'LayoutDashboard', analytics:'BarChart3', users:'Users', settings:'Settings',
      billing:'CreditCard', payments:'Wallet', revenue:'TrendingUp', search:'Search',
      filter:'Filter', download:'Download', upload:'Upload', share:'Share2',
      heart:'Heart', star:'Star', check:'Check', close:'X', plus:'Plus',
      edit:'Pencil', trash:'Trash2', eye:'Eye', lock:'Lock', mail:'Mail',
      phone:'Phone', calendar:'Calendar', clock:'Clock', map:'MapPin', globe:'Globe',
      shield:'Shield', lightning:'Zap', rocket:'Rocket', target:'Target', code:'Code',
      database:'Database', server:'Server', cloud:'Cloud', cart:'ShoppingCart',
      tag:'Tag', image:'Image', video:'Video', file:'File', folder:'Folder',
      link:'Link', menu:'Menu', chevron:'ChevronRight', arrow:'ArrowRight',
    },
    sizes: { sm:16, md:24, lg:32, xl:48 },
    strokeWidth: 1.5,
  };
}

function buildPhotography(industry: string, personality: BrandPersonality): PhotographyDNA {
  const iq: Record<string, string[]> = {
    saas: ['modern software dashboard','team collaborating','technology workspace'],
    tech: ['data center technology','coding developer','digital innovation'],
    ecommerce: ['online shopping','product photography','retail store display'],
    restaurant: ['gourmet food plating','restaurant interior','chef cooking kitchen'],
    fitness: ['modern gym equipment','fitness training workout','healthy lifestyle'],
    healthcare: ['medical consultation','modern clinic interior','healthcare professional'],
    finance: ['modern office building','financial charts data','business meeting'],
    education: ['modern classroom','students learning','library study'],
    portfolio: ['creative workspace','design process','artistic studio'],
    travel: ['beautiful landscape','luxury hotel','adventure destination'],
    real_estate: ['modern architecture','luxury interior design','property exterior'],
  };
  const mk: Record<BrandPersonality, string[]> = {
    premium: ['elegant','refined','polished'], luxury: ['opulent','exclusive','sophisticated'],
    professional: ['clean','structured','corporate'], trustworthy: ['warm','reliable','genuine'],
    energetic: ['dynamic','vibrant','powerful'], playful: ['fun','colorful','joyful'],
    creative: ['artistic','expressive','unique'], modern: ['sleek','minimal','innovative'],
    minimal: ['simple','clean','spacious'], bold: ['dramatic','striking','high-contrast'],
    warm: ['cozy','inviting','soft'], calming: ['serene','peaceful','natural'],
    authoritative: ['strong','commanding','established'], community: ['inclusive','connected','social'],
    eco: ['natural','organic','sustainable'], tech: ['futuristic','digital','cutting-edge'],
  };
  return {
    queryTemplates: iq[industry.toLowerCase()] ?? iq.saas ?? ['modern workspace', 'team collaboration', 'technology'],
    style: personality === 'luxury' ? 'editorial' : personality === 'tech' ? 'futuristic' : 'lifestyle',
    moodKeywords: mk[personality] ?? mk.professional ?? ['professional', 'clean'],
    fallbackSource: 'picsum',
    heroStrategy: personality === 'luxury' ? 'split' : personality === 'tech' ? 'gradient' : 'photo',
    treatment: {
      overlay: personality !== 'minimal',
      overlayOpacity: personality === 'tech' ? 0.6 : 0.3,
      borderRadius: '0',
      aspectRatio: '16/9',
    },
  };
}

function buildIllustration(personality: BrandPersonality): IllustrationDNA {
  const m: Record<BrandPersonality, IllustrationDNA> = {
    premium: { style:'line', colorTreatment:'duotone', complexity:'moderate', contexts:['onboarding','empty-state','features'] },
    luxury: { style:'line', colorTreatment:'mono', complexity:'simple', contexts:['empty-state'] },
    professional: { style:'line', colorTreatment:'duotone', complexity:'moderate', contexts:['onboarding','empty-state','features'] },
    trustworthy: { style:'filled', colorTreatment:'duotone', complexity:'moderate', contexts:['onboarding','empty-state','features'] },
    energetic: { style:'filled', colorTreatment:'full', complexity:'detailed', contexts:['onboarding','empty-state','features','hero'] },
    playful: { style:'filled', colorTreatment:'full', complexity:'detailed', contexts:['onboarding','empty-state','features','hero'] },
    creative: { style:'abstract', colorTreatment:'full', complexity:'detailed', contexts:['hero','features','about'] },
    modern: { style:'line', colorTreatment:'accent-only', complexity:'moderate', contexts:['onboarding','empty-state','features'] },
    minimal: { style:'line', colorTreatment:'mono', complexity:'simple', contexts:['empty-state'] },
    bold: { style:'filled', colorTreatment:'full', complexity:'detailed', contexts:['hero','features'] },
    warm: { style:'line', colorTreatment:'duotone', complexity:'moderate', contexts:['onboarding','features'] },
    calming: { style:'line', colorTreatment:'mono', complexity:'simple', contexts:['empty-state','onboarding'] },
    authoritative: { style:'line', colorTreatment:'mono', complexity:'simple', contexts:['empty-state'] },
    community: { style:'filled', colorTreatment:'duotone', complexity:'moderate', contexts:['onboarding','features'] },
    eco: { style:'line', colorTreatment:'duotone', complexity:'moderate', contexts:['features','about'] },
    tech: { style:'abstract', colorTreatment:'accent-only', complexity:'detailed', contexts:['hero','features'] },
  };
  return m[personality] || m.professional;
}

function buildCharts(_industry: string): ChartDNA {
  return {
    byDataType: {
      trend: 'area', comparison: 'bar', distribution: 'donut',
      composition: 'stackedBar', relationship: 'scatter', kpi: 'sparkline',
    },
    seriesColors: ['blue','sky','cyan','emerald','violet','amber','rose','slate'],
    style: { borderWidth:2, borderRadius:4, gridColor:'rgba(0,0,0,0.06)', labelColor:'rgba(0,0,0,0.5)', fontFamily:'Inter, system-ui, sans-serif' },
  };
}

function buildTables(industry: string): TableDNA {
  const dm: Record<string, 'compact' | 'comfortable' | 'spacious'> = {
    finance:'compact', healthcare:'comfortable', saas:'comfortable',
    ecommerce:'compact', restaurant:'comfortable', education:'comfortable', portfolio:'spacious',
  };
  const d = dm[industry.toLowerCase()] || 'comfortable';
  return {
    density: d, striped: d === 'compact', bordered: false, hoverable: true,
    headerStyle: 'filled',
    cellPadding: d === 'compact' ? 'px-3 py-2' : d === 'spacious' ? 'px-6 py-4' : 'px-4 py-3',
    fontSize: 'text-sm',
  };
}

function buildForms(industry: string): FormDNA {
  const fm: Record<string, FormDNA> = {
    saas: { layout:'stacked', inputStyle:'outlined', labelPosition:'top', validation:'inline', submitStyle:'auto' },
    healthcare: { layout:'stacked', inputStyle:'outlined', labelPosition:'top', validation:'inline', submitStyle:'auto' },
    ecommerce: { layout:'stacked', inputStyle:'outlined', labelPosition:'top', validation:'inline', submitStyle:'full-width' },
    restaurant: { layout:'stacked', inputStyle:'filled', labelPosition:'top', validation:'toast', submitStyle:'auto' },
    finance: { layout:'multi-column', inputStyle:'outlined', labelPosition:'left', validation:'inline', submitStyle:'auto' },
    education: { layout:'stacked', inputStyle:'outlined', labelPosition:'top', validation:'inline', submitStyle:'auto' },
    portfolio: { layout:'stacked', inputStyle:'underlined', labelPosition:'floating', validation:'inline', submitStyle:'auto' },
  };
  return fm[industry.toLowerCase()] ?? fm.saas ?? { layout:'stacked', inputStyle:'outlined', labelPosition:'top', validation:'inline', submitStyle:'auto' };
}

function buildButtons(personality: BrandPersonality): ButtonDNA {
  const r = personality === 'luxury' || personality === 'minimal'
    ? 'rounded-sm'
    : personality === 'bold' || personality === 'playful'
      ? 'rounded-xl'
      : 'rounded-md';
  return {
    variants: {
      primary: `bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm ${r}`,
      secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/80 ${r}`,
      outline: `border border-input bg-background hover:bg-accent hover:text-accent-foreground ${r}`,
      ghost: `hover:bg-accent hover:text-accent-foreground ${r}`,
      destructive: `bg-destructive text-destructive-foreground hover:bg-destructive/90 ${r}`,
      link: 'text-primary underline-offset-4 hover:underline',
    },
    sizes: { sm:'h-9 px-3 text-sm', md:'h-10 px-4 text-sm', lg:'h-11 px-6 text-base', icon:'h-10 w-10' },
    radius: r,
    shadow: '0 1px 2px rgba(0,0,0,0.05)',
    shadowHover: '0 4px 12px rgba(0,0,0,0.15)',
  };
}

function buildCards(personality: BrandPersonality): CardDNA {
  const s: CardDNA['style'] = personality === 'tech'
    ? 'elevated'
    : personality === 'premium'
      ? 'glass'
      : personality === 'minimal'
        ? 'outlined'
        : 'filled';
  return {
    style: s,
    variants: {
      default: 'bg-card border border-border shadow-sm rounded-lg',
      interactive: 'bg-card border border-border shadow-sm rounded-lg hover:shadow-md transition-shadow cursor-pointer',
      featured: 'bg-card border-2 border-primary/20 shadow-md rounded-lg',
    },
    padding: 'p-6', border: 'border border-border',
    shadow: 'shadow-sm', shadowHover: 'shadow-md',
  };
}

function buildNav(industry: string): NavigationDNA {
  const nm: Record<string, NavigationDNA> = {
    saas: { type:'top', style:'solid', sticky:true, mobileStyle:'hamburger', maxItems:6 },
    ecommerce: { type:'top', style:'solid', sticky:true, mobileStyle:'hamburger', maxItems:8 },
    portfolio: { type:'top', style:'transparent', sticky:true, mobileStyle:'hamburger', maxItems:5 },
    dashboard: { type:'sidebar', style:'solid', sticky:true, mobileStyle:'drawer', maxItems:12 },
  };
  const defaultNav: NavigationDNA = { type:'top', style:'solid', sticky:true, mobileStyle:'hamburger', maxItems:6 };
  return nm[industry.toLowerCase()] ?? defaultNav;
}

function buildLayout(industry: string, personality: BrandPersonality): LayoutDNA {
  const hl: Record<string, LayoutDNA['heroLayout']> = {
    saas:'centered', tech:'split', ecommerce:'centered', restaurant:'full-width',
    fitness:'full-width', healthcare:'centered', education:'centered',
    portfolio:'left', agency:'split', blog:'centered',
    real_estate:'split', travel:'full-width', fashion:'split',
  };
  const dn: Record<string, LayoutDNA['density']> = {
    saas:'comfortable', tech:'compact', ecommerce:'comfortable', restaurant:'comfortable',
    fitness:'compact', healthcare:'comfortable', education:'comfortable',
    portfolio:'spacious', agency:'spacious', blog:'comfortable',
  };
  return {
    heroLayout: hl[industry.toLowerCase()] || 'centered',
    sectionSpacing: personality === 'luxury'
      ? 'py-24 sm:py-32'
      : personality === 'bold'
        ? 'py-12 sm:py-16'
        : 'py-16 sm:py-24',
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
    maxWidth: 'max-w-7xl',
    density: dn[industry.toLowerCase()] || 'comfortable',
    sidebar: personality === 'luxury' || personality === 'premium' || industry.toLowerCase() === 'dashboard',
    sidebarWidth: 'w-64',
  };
}
