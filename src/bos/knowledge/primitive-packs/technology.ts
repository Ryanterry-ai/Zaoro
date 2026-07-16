// ─── Technology Primitive Packs ────────────────────────────────────
// Determines the rendering/stack primitives. Seeds: React web (default),
// Next.js, Supabase, and a mobile/Flutter option for future use.

import { PrimitivePack, primitivePackId } from './types.js';

interface TechSeed {
  id: string;
  name: string;
  framework: string;
  integrations: string[];
  keywords: string[];
}

const TECH_SEEDS: TechSeed[] = [
  {
    id: 'react-web',
    name: 'React Web App',
    framework: 'react',
    integrations: ['nextjs', 'tailwindcss'],
    keywords: ['react', 'web', 'spa', 'next'],
  },
  {
    id: 'nextjs',
    name: 'Next.js App Router',
    framework: 'nextjs',
    integrations: ['nextjs', 'tailwindcss', 'vercel'],
    keywords: ['next', 'nextjs', 'ssr'],
  },
  {
    id: 'supabase',
    name: 'Supabase Backend',
    framework: 'react',
    integrations: ['supabase', 'postgres'],
    keywords: ['supabase', 'postgres', 'backend'],
  },
  {
    id: 'flutter-mobile',
    name: 'Flutter Mobile',
    framework: 'flutter',
    integrations: ['firebase'],
    keywords: ['flutter', 'mobile', 'ios', 'android'],
  },
];

export const TECHNOLOGY_PRIMITIVE_PACKS: PrimitivePack[] = TECH_SEEDS.map(seed => ({
  id: primitivePackId('technology', seed.id),
  dimension: 'technology',
  name: seed.name,
  description: `Technology primitive pack: ${seed.framework}`,
  keywords: seed.keywords,
  integrations: seed.integrations,
  providesCapabilities: ['tech:' + seed.id, 'framework:' + seed.framework],
  appliesTo: (ctx) => {
    const caps = ctx.capabilities ?? [];
    const models = [ctx.businessModel, ...(ctx.businessModels ?? [])];
    // Mobile framework is selected only when explicitly requested.
    if (seed.id === 'flutter-mobile') return caps.includes('mobile') || caps.includes('flutter');
    // Default web stack applies unless a mobile framework is requested.
    return !caps.includes('mobile');
  },
}));

export function getDefaultTechnologyPrimitivePack(): PrimitivePack {
  return TECHNOLOGY_PRIMITIVE_PACKS.find(p => p.id === primitivePackId('technology', 'react-web'))!;
}
