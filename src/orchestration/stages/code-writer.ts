// ─── Code Writer Stage ────────────────────────────────────────────────────────
//
// The critical missing layer: reads all JSON artifacts and writes real files.
//
// This stage:
//   1. Reads artifacts from all previous stages (frontend, database, API, etc.)
//   2. Generates package.json, tsconfig.json, tailwind.config.ts, next.config.mjs
//   3. Generates prisma/schema.prisma from database schema
//   4. Generates src/app/globals.css and layout.tsx
//   5. Generates one page.tsx per page from frontend.pages
//   6. Generates one .tsx per component from frontend.components
//   7. Generates API route handlers from api.endpoints
//   8. Writes all files to disk in the project directory
//
// This bridges the gap between planning (JSON) and actual code (files).
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, ProjectManifest } from '../types.js';
import {
  generatePackageJson,
  generateTsConfig,
  generateTailwindConfig,
  generateNextConfig,
  generatePostcssConfig,
  generateGlobalCss,
  generateRootLayout,
  generatePrismaSchema,
  generatePrismaClient,
  generateApiRoute,
  type DesignTokens as ScaffoldDesignTokens,
  type DbSchema,
  type TechStack,
} from '../../generation/scaffold-generators.js';
import { SkillIntegrator } from '../../generation/skill-integrator.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageDef {
  name: string;
  path: string;
  description?: string;
  layout?: string;
  sections?: string[];
  auth?: boolean;
  components?: string[];
}

interface ComponentDef {
  name: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: Record<string, unknown>;
  description?: string;
}

interface EndpointDef {
  method: string;
  path: string;
  description?: string;
  params?: string[];
  requestBody?: Record<string, unknown>;
}

// Re-export the DesignTokens type from scaffold-generators
type DesignTokens = ScaffoldDesignTokens;

// ─── Stage Metadata ───────────────────────────────────────────────────────────

const meta: StageMeta = {
  id: 'code-writer',
  name: 'Code Writer',
  description: 'Reads all JSON artifacts and writes real TypeScript/React files to disk',
  agentRole: 'developer' as AgentRole,
  dependencies: ['frontend-design', 'database-design', 'api-design', 'integration'],
  inputs: [
    'manifest',
    'frontend.pages',
    'frontend.components',
    'frontend.design-tokens',
    'database.schema',
    'api.endpoints',
    'architecture.tech-stack',
    'skill.design',
  ],
  outputs: [
    'code.files',
    'code.fileCount',
    'code.projectRoot',
  ],
  estimatedDurationSec: 60,
  skippable: false,
  maxRetries: 1,
  parallelizable: false,
};

// ─── Code Writer Stage ────────────────────────────────────────────────────────

export class CodeWriterStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    // ─── 1. Read all artifacts ─────────────────────────────────────────────

    const manifest = ctx.manifest;
    const pages = ctx.getArtifact<PageDef[]>('frontend.pages') ?? [];
    const components = ctx.getArtifact<ComponentDef[]>('frontend.components') ?? [];
    const tokens = ctx.getArtifact<ScaffoldDesignTokens>('frontend.design-tokens') ?? {};
    const schema = ctx.getArtifact<DbSchema>('database.schema');
    const endpoints = ctx.getArtifact<EndpointDef[]>('api.endpoints') ?? [];
    const techStack = ctx.getArtifact<TechStack>('architecture.tech-stack');
    const skillDesign = ctx.getArtifact<unknown>('skill.design');

    ctx.log.info(`Code Writer: ${pages.length} pages, ${components.length} components, ${endpoints.length} endpoints`);

    // ─── 2. Determine project root ─────────────────────────────────────────

    const rawName = manifest.name;
    const projectName = (typeof rawName === 'string' ? rawName : `project-${Date.now()}`).replace(/\s+/g, '-').toLowerCase();
    const workingDir = (manifest as unknown as Record<string, unknown>)['workingDirectory'] as string ?? '.build-anything';
    const projectRoot = path.join(
      process.cwd(),
      workingDir,
      'projects',
      projectName,
    );

    // Create project directory
    fs.mkdirSync(projectRoot, { recursive: true });
    ctx.log.info(`Project root: ${projectRoot}`);

    // ─── 3. Generate config files ──────────────────────────────────────────

    const files: Array<{ path: string; content: string }> = [];

    // package.json
    files.push({
      path: 'package.json',
      content: generatePackageJson(manifest as ProjectManifest, techStack),
    });

    // tsconfig.json
    files.push({
      path: 'tsconfig.json',
      content: generateTsConfig(),
    });

    // tailwind.config.ts
    files.push({
      path: 'tailwind.config.ts',
      content: generateTailwindConfig(tokens),
    });

    // next.config.mjs
    files.push({
      path: 'next.config.mjs',
      content: generateNextConfig(),
    });

    // postcss.config.mjs
    files.push({
      path: 'postcss.config.mjs',
      content: generatePostcssConfig(),
    });

    // ─── 4. Generate CSS and layout ────────────────────────────────────────

    // globals.css
    files.push({
      path: 'src/app/globals.css',
      content: generateGlobalCss(tokens),
    });

    // layout.tsx — pass pages for nav and extract business content from components
    const navPages = pages.map(p => ({ name: p.name, path: p.path }));
    // Extract business content from hero component's content field
    const heroComp = components.find(c => c.type === 'hero');
    const heroContent = heroComp?.content as Record<string, unknown> | undefined;
    const bizContent = {
      ...(heroContent?.subtitle && typeof heroContent.subtitle === 'string' ? { description: heroContent.subtitle } : {}),
      ...(manifest.description && typeof manifest.description === 'string' ? { description: manifest.description } : {}),
      contact: {} as Record<string, string>,
    };
    // Try to extract contact from any component's content
    for (const comp of components) {
      if (comp.content && typeof comp.content === 'object') {
        const c = comp.content as Record<string, unknown>;
        if (c.contact && typeof c.contact === 'object') {
          Object.assign(bizContent.contact, c.contact);
        }
      }
    }
    files.push({
      path: 'src/app/layout.tsx',
      content: generateRootLayout(manifest as ProjectManifest, tokens, navPages, bizContent),
    });

    // ─── 5. Generate pages ─────────────────────────────────────────────────

    for (const page of pages) {
      const rawPath = typeof page.path === 'string' ? page.path : '/';
      const route = rawPath === '/' ? 'page.tsx' : `${rawPath.slice(1).replace(/^\//, '')}/page.tsx`;
      const pageContent = this.generatePageFile(page, components, tokens, endpoints);
      files.push({
        path: `src/app/${route}`,
        content: pageContent,
      });
    }

    // ─── 6. Generate components ────────────────────────────────────────────

    for (const comp of components) {
      const rawName = typeof comp.name === 'string' ? comp.name : 'Component';
      const componentContent = this.generateComponentFile(comp, tokens);
      files.push({
        path: `src/components/${rawName}.tsx`,
        content: componentContent,
      });
    }

    // ─── 7. Generate Prisma schema ─────────────────────────────────────────

    if (schema && (schema.tables?.length ?? 0) > 0) {
      files.push({
        path: 'prisma/schema.prisma',
        content: generatePrismaSchema(schema, techStack?.database),
      });

      files.push({
        path: 'src/lib/db.ts',
        content: generatePrismaClient(),
      });
    }

    // ─── 8. Generate API routes ────────────────────────────────────────────

    for (const endpoint of endpoints) {
      // Remove leading slash and /api prefix if present
      let routePath = endpoint.path.replace(/^\//, '');
      if (routePath.startsWith('api/')) {
        routePath = routePath.slice(4);
      }
      files.push({
        path: `src/app/api/${routePath}/route.ts`,
        content: generateApiRoute(endpoint),
      });
    }

    // ─── 9. Generate index page if no root page exists ─────────────────────

    if (!pages.some(p => p.path === '/')) {
      files.push({
        path: 'src/app/page.tsx',
        content: this.generateIndexPage(manifest, components, tokens),
      });
    }

    // ─── 10. Write all files to disk ───────────────────────────────────────

    let writtenCount = 0;
    for (const file of files) {
      const fullPath = path.join(projectRoot, file.path);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content, 'utf-8');
      writtenCount++;
    }

    ctx.log.info(`Code Writer: wrote ${writtenCount} files to ${projectRoot}`);

    // ─── 11. Set artifacts ─────────────────────────────────────────────────

    ctx.setArtifact('code.files', files.map(f => f.path));
    ctx.setArtifact('code.fileCount', writtenCount);
    ctx.setArtifact('code.projectRoot', projectRoot);

    // Generate markdown report
    const md = this.generateReport(pages, components, endpoints, schema ?? null, writtenCount, projectRoot);

    return this.ok(
      {
        projectRoot,
        fileCount: writtenCount,
        pages: pages.length,
        components: components.length,
        endpoints: endpoints.length,
        hasDatabase: !!schema,
      },
      Date.now() - start,
      0,
      0,
      warnings,
      md,
    );
  }

  // ─── Page Generator ──────────────────────────────────────────────────────

  private generatePageFile(
    page: PageDef,
    components: ComponentDef[],
    tokens: DesignTokens,
    endpoints: EndpointDef[],
  ): string {
    const componentName = this.toPascalCase((typeof page.name === 'string' ? page.name : 'Page').replace(/\s+/g, ''));

    // Build imports
    const imports: string[] = ['import { motion } from \'framer-motion\''];
    const pageComponents = components.filter(c =>
      page.components?.includes(c.name) || !page.components
    );

    // Add component imports (use actual component names)
    const usedComponents: string[] = [];
    for (const comp of pageComponents.slice(0, 6)) {
      const safeName = typeof comp.name === 'string' ? comp.name : 'Component';
      imports.push(`import ${safeName} from '@/components/${safeName}'`);
      usedComponents.push(safeName);
    }

    // Build sections using actual component names
    const sections = usedComponents.map((compName, i) => {
      // Hero components get full width, others get container
      const isHero = i === 0 && usedComponents.length > 1;
      if (isHero) {
        return `      <${compName} />`;
      }
      return `
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <${compName} />
        </div>
      </section>`;
    }).join('\n');

    return `'use client'

${imports.join('\n')}

export default function ${componentName}Page() {
  return (
    <main className="min-h-screen">
${sections}
    </main>
  )
}
`;
  }

  // ─── Component Generator ─────────────────────────────────────────────────

  private generateComponentFile(
    comp: ComponentDef,
    tokens: DesignTokens,
  ): string {
    const componentName = comp.name;
    const type = (comp.type ?? '').toLowerCase();
    const props = comp.props ?? {};

    // Parse stats items from pipe-delimited format
    const statsItems = typeof props.items === 'string'
      ? props.items.split('|').map(item => {
          const [value, label] = item.split(',');
          return { value: value?.trim() ?? '', label: label?.trim() ?? '' };
        })
      : [];

    // Type-based component templates
    switch (type) {
      case 'hero':
        return this.generateHeroComponent(componentName, props, tokens);
      case 'grid':
        return this.generateGridComponent(componentName, props, tokens);
      case 'card':
        return this.generateCardComponent(componentName, props, tokens);
      case 'stats':
        return this.generateStatsComponent(componentName, statsItems, tokens);
      case 'carousel':
        return this.generateCarouselComponent(componentName, props, tokens);
      case 'cta':
        return this.generateCTAComponent(componentName, props, tokens);
      case 'form':
        return this.generateFormComponent(componentName, props, tokens);
      case 'gallery':
        return this.generateGalleryComponent(componentName, props, tokens);
      case 'details':
        return this.generateDetailsComponent(componentName, props, tokens);
      case 'price':
        return this.generatePriceComponent(componentName, props, tokens);
      case 'pricing':
        return this.generatePricingComponent(componentName, props, tokens);
      case 'text':
        return this.generateTextComponent(componentName, props, tokens);
      case 'map':
        return this.generateMapComponent(componentName, props, tokens);
      case 'calendar':
        return this.generateCalendarComponent(componentName, props, tokens);
      default:
        return this.generateDefaultComponent(componentName, comp.description, tokens);
    }
  }

  // ─── Hero Component ──────────────────────────────────────────────────────

  private generateHeroComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    const title = typeof props.title === 'string' ? props.title : 'Welcome Home';
    const subtitle = typeof props.subtitle === 'string' ? props.subtitle : 'Discover something extraordinary';
    const cta = typeof props.cta === 'string' ? props.cta : 'Get Started';
    const bg = tokens?.colors?.primary ?? '#1a1a2e';
    const accent = tokens?.colors?.accent ?? '#c9a962';

    // taste-skill: Hero MUST fit initial viewport, max 2 lines headline, max 20 words subtext
    // taste-skill: Anti-center-bias for high variance - use asymmetric layout
    return `'use client'

import { motion, useReducedMotion } from 'framer-motion'

export default function ${name}() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-zinc-950">
      {/* Background image with overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/60 to-transparent" />

      {/* Content - left aligned per taste-skill anti-center-bias */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-2xl">
          {/* Eyebrow - taste-skill: max 1 per 3 sections */}
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm font-semibold tracking-widest uppercase mb-4"
            style={{ color: '${accent}' }}
          >
            Exclusive Collection
          </motion.p>

          {/* Headline - taste-skill: max 2 lines, text-4xl to text-6xl range */}
          <motion.h1
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-50 leading-[1.1] tracking-tight mb-6"
          >
            ${title}
          </motion.h1>

          {/* Subtext - taste-skill: max 20 words */}
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-zinc-300 leading-relaxed mb-8 max-w-lg"
          >
            ${subtitle}
          </motion.p>

          {/* CTA group */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <button
              className="px-8 py-3.5 font-semibold rounded-lg transition-all duration-200"
              style={{
                backgroundColor: '${accent}',
                color: '${bg}',
              }}
            >
              ${cta}
            </button>
            <button className="px-8 py-3.5 font-semibold rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition-colors">
              View Properties
            </button>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={shouldReduceMotion ? false : { y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-zinc-500 rounded-full flex justify-center pt-2"
        >
          <div className="w-1 h-2 bg-zinc-400 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  )
}
`
  }

  // ─── Grid Component ──────────────────────────────────────────────────────

  private generateGridComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    const columns = typeof props.columns === 'string' ? parseInt(props.columns, 10) : 3;
    const gridCols = columns === 2 ? 'md:grid-cols-2' : columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3';
    const accent = tokens?.colors?.accent ?? '#6366f1';

    return `'use client'

import { motion } from 'framer-motion'

const items = [
  { id: 1, title: 'Featured Property', description: 'A stunning modern home with panoramic views', price: '\$1,250,000', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80' },
  { id: 2, title: 'Luxury Penthouse', description: ' Downtown penthouse with rooftop terrace', price: '\$2,500,000', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80' },
  { id: 3, title: 'Waterfront Estate', description: 'Exclusive waterfront property with private dock', price: '\$4,750,000', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&q=80' },
  { id: 4, title: 'Modern Villa', description: 'Contemporary villa with infinity pool', price: '\$3,200,000', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80' },
  { id: 5, title: 'Mountain Retreat', description: 'Serene mountain property with breathtaking views', price: '\$1,800,000', image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=80' },
  { id: 6, title: 'Urban Loft', description: 'Stylish industrial loft in the heart of the city', price: '\$890,000', image: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&q=80' },
]

export default function ${name}() {
  return (
    <div className="grid ${gridCols} gap-8">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
        >
          <div className="relative h-64 overflow-hidden">
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-gray-900">
              {item.price}
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-gray-600">{item.description}</p>
            <button
              className="mt-4 font-semibold transition-colors"
              style={{ color: '${accent}' }}
            >
              View Details &rarr;
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
`
  }

  // ─── Card Component ──────────────────────────────────────────────────────

  private generateCardComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    const showPrice = props.showPrice !== 'false';
    const showImage = props.showImage !== 'false';
    const accent = tokens?.colors?.accent ?? '#6366f1';

    return `'use client'

import { motion } from 'framer-motion'

export default function ${name}() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
    >
      ${showImage ? `
      <div className="relative h-48 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80"
          alt="Property"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        />
        <div
          className="absolute top-3 left-3 text-white px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: '${accent}' }}
        >
          Featured
        </div>
      </div>` : ''}
      <div className="p-5">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span>4 bed</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full" />
          <span>3 bath</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full" />
          <span>2,500 sqft</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Modern Luxury Home</h3>
        <p className="text-gray-600 text-sm mb-3">Beverly Hills, CA</p>
        ${showPrice ? `<p className="text-2xl font-bold" style={{ color: '${accent}' }}>$1,250,000</p>` : ''}
      </div>
    </motion.div>
  )
}
`
  }

  // ─── Stats Component ─────────────────────────────────────────────────────

  private generateStatsComponent(name: string, items: Array<{ value: string; label: string }>, tokens: DesignTokens): string {
    const defaultItems = items.length > 0 ? items : [
      { value: '500', label: 'Properties' },
      { value: '98', label: 'Client Satisfaction' },
      { value: '15', label: 'Years Experience' },
      { value: '2', label: 'Billion In Sales' },
    ];
    const accent = tokens?.colors?.accent ?? '#c9a962';

    // animated-component-libraries: CountUp pattern for animated numbers
    // taste-skill: Respect prefers-reduced-motion
    return `'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!isInView) return
    if (shouldReduceMotion) {
      setCount(target)
      return
    }
    let start = 0
    const duration = 2000
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [isInView, target, shouldReduceMotion])

  return <span ref={ref}>{count}{suffix}</span>
}

const stats = [
${defaultItems.map(item => {
  const numMatch = item.value.match(/(\d+)/);
  const num = numMatch && numMatch[1] ? parseInt(numMatch[1], 10) : 0;
  const suffix = item.value.replace(/\d+/, '');
  return `  { target: ${num}, suffix: '${suffix}', label: '${item.label}' }`;
}).join(',\n')}
]

export default function ${name}() {
  return (
    <section className="py-20 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl lg:text-5xl font-bold mb-2" style={{ color: '${accent}' }}>
                <CountUp target={stat.target} suffix={stat.suffix} />
              </div>
              <div className="text-zinc-400 font-medium tracking-wide uppercase text-sm">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
`
  }

  // ─── Carousel Component ──────────────────────────────────────────────────

  private generateCarouselComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    const accent = tokens?.colors?.accent ?? '#c9a962';

    // animated-component-libraries: Marquee pattern for infinite scroll
    // taste-skill: prefers-reduced-motion support
    return `'use client'

import { motion, useReducedMotion } from 'framer-motion'

const testimonials = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'Homeowner',
    content: 'Absolutely incredible experience. They found us the perfect home in just two weeks. The attention to detail and understanding of our needs was remarkable.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
    rating: 5,
  },
  {
    id: 2,
    name: 'Michael Chen',
    role: 'Real Estate Investor',
    content: 'Professional, knowledgeable, and always available. They helped me build a portfolio of 12 properties with excellent returns.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
    rating: 5,
  },
  {
    id: 3,
    name: 'Emily Davis',
    role: 'First-time Buyer',
    content: 'As a first-time buyer, I was nervous about the process. They made everything so simple and stress-free. I couldn\'t be happier!',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
    rating: 5,
  },
  {
    id: 4,
    name: 'James Wilson',
    role: 'Property Developer',
    content: 'Their market knowledge is unmatched. They identified opportunities I would have never found on my own. Highly recommended.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80',
    rating: 5,
  },
]

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
  return (
    <div className="flex-shrink-0 w-[400px] bg-zinc-900 rounded-2xl p-8 mx-4">
      <div className="flex items-center gap-1 mb-4">
        {[...Array(testimonial.rating)].map((_, i) => (
          <svg key={i} className="w-4 h-4 fill-current" style={{ color: '${accent}' }} viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
      <p className="text-zinc-300 leading-relaxed mb-6">"{testimonial.content}"</p>
      <div className="flex items-center gap-3">
        <img
          src={testimonial.avatar}
          alt={testimonial.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <div className="font-semibold text-zinc-100 text-sm">{testimonial.name}</div>
          <div className="text-zinc-500 text-xs">{testimonial.role}</div>
        </div>
      </div>
    </div>
  )
}

export default function ${name}() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="py-24 bg-zinc-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: '${accent}' }}>
            Testimonials
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-zinc-50">
            What Our Clients Say
          </h2>
        </motion.div>
      </div>

      {/* Marquee container - animated-component-libraries pattern */}
      <div className="relative">
        {/* Gradient fades on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10" />

        <motion.div
          animate={shouldReduceMotion ? false : { x: ['0%', '-50%'] }}
          transition={{
            x: { duration: 30, repeat: Infinity, ease: 'linear' },
          }}
          className="flex"
        >
          {[...testimonials, ...testimonials].map((testimonial, index) => (
            <TestimonialCard key={\`\${testimonial.id}-\${index}\`} testimonial={testimonial} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
`
  }

  // ─── CTA Component ───────────────────────────────────────────────────────

  private generateCTAComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    const title = typeof props.title === 'string' ? props.title : 'Ready to Get Started?';
    const button = typeof props.button === 'string' ? props.button : 'Contact Us';
    const bg = tokens?.colors?.primary ?? '#1a1a2e';

    return `'use client'

import { motion } from 'framer-motion'

export default function ${name}() {
  return (
    <section className="py-20 bg-[${bg}]">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold text-white mb-6"
        >
          ${title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-xl text-white/80 mb-8 max-w-2xl mx-auto"
        >
          Let us help you find the perfect property. Our team of experts is ready to assist you every step of the way.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="px-8 py-4 bg-white text-[${bg}] font-semibold rounded-lg hover:bg-white/90 transition-colors text-lg"
        >
          ${button}
        </motion.button>
      </div>
    </section>
  )
}
`
  }

  // ─── Form Component ──────────────────────────────────────────────────────

  private generateFormComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    const fields = typeof props.fields === 'string' ? props.fields.split(',') : ['name', 'email', 'message'];
    const accent = tokens?.colors?.accent ?? '#6366f1';

    return `'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function ${name}() {
  const [formData, setFormData] = useState({
${fields.map(f => `    ${f.trim()}: ''`).join(',\n')}
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto space-y-6"
    >
${fields.map(f => {
  const fieldName = f.trim();
  const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
  if (fieldName === 'message') {
    return `      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">${label}</label>
        <textarea
          name="${fieldName}"
          rows={4}
          value={formData.${fieldName}}
          onChange={(e) => setFormData({ ...formData, ${fieldName}: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent resize-none"
          style={{ '--tw-ring-color': '${accent}' } as React.CSSProperties}
          placeholder="Tell us about your requirements..."
        />
      </div>`;
  }
  return `      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">${label}</label>
        <input
          type="${fieldName === 'email' ? 'email' : 'text'}"
          name="${fieldName}"
          value={formData.${fieldName}}
          onChange={(e) => setFormData({ ...formData, ${fieldName}: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': '${accent}' } as React.CSSProperties}
          placeholder="Enter your ${label.toLowerCase()}"
        />
      </div>`;
}).join('\n')}
      <button
        type="submit"
        className="w-full py-3 text-white font-semibold rounded-lg transition-colors"
        style={{ backgroundColor: '${accent}' }}
      >
        Submit
      </button>
    </motion.form>
  )
}
`
  }

  // ─── Gallery Component ───────────────────────────────────────────────────

  private generateGalleryComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    return `'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const images = [
  { id: 1, src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80', alt: 'Living Room' },
  { id: 2, src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80', alt: 'Kitchen' },
  { id: 3, src: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80', alt: 'Bedroom' },
  { id: 4, src: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80', alt: 'Bathroom' },
  { id: 5, src: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800&q=80', alt: 'Exterior' },
  { id: 6, src: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80', alt: 'Pool' },
]

export default function ${name}() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img) => (
          <motion.div
            key={img.id}
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelected(img.src)}
            className="cursor-pointer overflow-hidden rounded-lg"
          >
            <img src={img.src} alt={img.alt} className="w-full h-48 object-cover hover:opacity-90 transition-opacity" />
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selected}
              alt="Gallery"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
`
  }

  // ─── Details Component ───────────────────────────────────────────────────

  private generateDetailsComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    return `'use client'

import { motion } from 'framer-motion'

const features = [
  { label: 'Bedrooms', value: '5', icon: '🛏️' },
  { label: 'Bathrooms', value: '4', icon: '🚿' },
  { label: 'Square Feet', value: '4,500', icon: '📐' },
  { label: 'Lot Size', value: '0.5 acres', icon: '🌳' },
  { label: 'Year Built', value: '2023', icon: '📅' },
  { label: 'Garage', value: '3 Car', icon: '🚗' },
]

export default function ${name}() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Property Details</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3"
          >
            <span className="text-2xl">{feature.icon}</span>
            <div>
              <div className="text-sm text-gray-500">{feature.label}</div>
              <div className="font-semibold text-gray-900">{feature.value}</div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-8 pt-6 border-t border-gray-100">
        <h4 className="font-semibold text-gray-900 mb-3">Description</h4>
        <p className="text-gray-600 leading-relaxed">
          This stunning modern home features floor-to-ceiling windows, an open-concept living space, 
          and a gourmet chef's kitchen with premium appliances. The primary suite includes a spa-like 
          bathroom and private terrace with breathtaking views. Additional features include a home theater, 
          wine cellar, and resort-style infinity pool.
        </p>
      </div>
    </div>
  )
}
`
  }

  // ─── Price Component ─────────────────────────────────────────────────────

  private generatePriceComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    const size = typeof props.size === 'string' ? props.size : 'lg';
    const sizeClasses = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-xl' : 'text-2xl';
    const accent = tokens?.colors?.accent ?? '#6366f1';

    return `'use client'

import { motion } from 'framer-motion'

export default function ${name}() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-block"
    >
      <div className="flex items-baseline gap-2">
        <span className="${sizeClasses} font-bold" style={{ color: '${accent}' }}>$1,250,000</span>
        <span className="text-gray-500">/asking price</span>
      </div>
      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
        <span>Est. \$5,200/mo</span>
        <span className="w-1 h-1 bg-gray-300 rounded-full" />
        <span>7.2% below market</span>
      </div>
    </motion.div>
  )
}
`
  }

  // ─── Pricing Component ───────────────────────────────────────────────────

  private generatePricingComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    const accent = tokens?.colors?.accent ?? '#6366f1';

    return `'use client'

import { motion } from 'framer-motion'

const plans = [
  {
    name: 'Starter',
    price: '\$29',
    period: '/month',
    features: ['5 Property Listings', 'Basic Analytics', 'Email Support', 'Standard Templates'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Professional',
    price: '\$79',
    period: '/month',
    features: ['Unlimited Listings', 'Advanced Analytics', 'Priority Support', 'Custom Branding', 'Lead Management'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '\$199',
    period: '/month',
    features: ['Everything in Pro', 'API Access', 'Dedicated Manager', 'Custom Integrations', 'SLA Guarantee'],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function ${name}() {
  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className={\`relative rounded-2xl p-8 \${plan.popular ? 'text-white ring-4 scale-105' : 'bg-white text-gray-900'}\`}
          style={plan.popular ? { backgroundColor: '${accent}', ringColor: '${accent}' } : {}}
        >
          {plan.popular && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </div>
          )}
          <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold">{plan.price}</span>
            <span className={plan.popular ? 'text-white/70' : 'text-gray-500'}>{plan.period}</span>
          </div>
          <ul className="space-y-3 mb-8">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <svg className={\`w-5 h-5 \${plan.popular ? 'text-white' : ''}\`} style={!plan.popular ? { color: '${accent}' } : {}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <button
            className={\`w-full py-3 rounded-lg font-semibold transition-colors \${plan.popular ? 'bg-white hover:bg-gray-100' : 'text-white hover:opacity-90'}\`}
            style={!plan.popular ? { backgroundColor: '${accent}' } : plan.popular ? { color: '${accent}' } : {}}
          >
            {plan.cta}
          </button>
        </motion.div>
      ))}
    </div>
  )
}
`
  }

  // ─── Text Component ──────────────────────────────────────────────────────

  private generateTextComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    const alignment = typeof props.alignment === 'string' ? props.alignment : 'center';
    const alignClass = alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center';

    return `'use client'

import { motion } from 'framer-motion'

export default function ${name}() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="${alignClass} max-w-3xl mx-auto py-12"
    >
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
        Finding Your Perfect Home
      </h2>
      <p className="text-lg text-gray-600 leading-relaxed mb-4">
        With over 15 years of experience in luxury real estate, we understand that finding the perfect home 
        is about more than just square footage and bedroom counts. It's about finding a space that 
        reflects your lifestyle and meets your family's needs.
      </p>
      <p className="text-lg text-gray-600 leading-relaxed">
        Our curated portfolio of exceptional properties spans the most desirable neighborhoods, 
        from waterfront estates to urban penthouses. Let us guide you home.
      </p>
    </motion.div>
  )
}
`
  }

  // ─── Map Component ───────────────────────────────────────────────────────

  private generateMapComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    const height = typeof props.height === 'string' ? props.height : '400';

    return `'use client'

import { motion } from 'framer-motion'

export default function ${name}() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl overflow-hidden shadow-lg"
    >
      <div className="bg-gray-200 flex items-center justify-center" style={{ height: '${height}px' }}>
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="font-medium">Interactive Map</p>
          <p className="text-sm">123 Luxury Lane, Beverly Hills, CA 90210</p>
        </div>
      </div>
    </motion.div>
  )
}
`
  }

  // ─── Calendar Component ──────────────────────────────────────────────────

  private generateCalendarComponent(name: string, props: Record<string, unknown>, tokens: DesignTokens): string {
    const accent = tokens?.colors?.accent ?? '#6366f1';

    return `'use client'

import { motion } from 'framer-motion'

const classes = [
  { time: '6:00 AM', name: 'Morning Yoga', instructor: 'Sarah', spots: 8, intensity: 'Low' },
  { time: '7:30 AM', name: 'HIIT Training', instructor: 'Mike', spots: 12, intensity: 'High' },
  { time: '9:00 AM', name: 'Strength & Condition', instructor: 'Alex', spots: 15, intensity: 'Medium' },
  { time: '12:00 PM', name: 'Lunch Express', instructor: 'Jordan', spots: 20, intensity: 'Medium' },
  { time: '5:30 PM', name: 'Evening Spin', instructor: 'Chris', spots: 25, intensity: 'High' },
  { time: '7:00 PM', name: 'Pilates', instructor: 'Emma', spots: 10, intensity: 'Low' },
]

export default function ${name}() {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900">Weekly Schedule</h3>
        <p className="text-sm text-gray-500">Monday - Friday</p>
      </div>
      <div className="divide-y divide-gray-100">
        {classes.map((cls, index) => (
          <motion.div
            key={cls.time + cls.name}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="text-sm font-mono text-gray-500 w-20">{cls.time}</div>
              <div>
                <div className="font-semibold text-gray-900">{cls.name}</div>
                <div className="text-sm text-gray-500">with {cls.instructor}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={\`px-2 py-1 rounded-full text-xs font-medium \${
                cls.intensity === 'High' ? 'bg-red-100 text-red-700' :
                cls.intensity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }\`}>
                {cls.intensity}
              </span>
              <span className="text-sm text-gray-500">{cls.spots} spots</span>
              <button
                className="px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors"
                style={{ backgroundColor: '${accent}' }}
              >
                Book
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
`
  }

  // ─── Default Component ───────────────────────────────────────────────────

  private generateDefaultComponent(name: string, description: string | undefined, tokens: DesignTokens): string {
    return `'use client'

import { motion } from 'framer-motion'

export default function ${name}() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2">${name}</h3>
      <p className="text-gray-600">
        ${description ?? `${name} component`}
      </p>
    </motion.div>
  )
}
`
  }

  // ─── Index Page Generator ────────────────────────────────────────────────

  private generateIndexPage(
    manifest: ProjectManifest,
    components: ComponentDef[],
    tokens: DesignTokens,
  ): string {
    const title = (manifest.name as string) ?? 'Build Anything App';
    const description = (manifest.description as string) ?? 'Built with Build.Anything';

    return `'use client'

import { motion } from 'framer-motion'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-6xl font-bold mb-4">${title}</h1>
        <p className="text-xl text-muted-foreground mb-8">${description}</p>
        <div className="flex gap-4 justify-center">
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition">
            Get Started
          </button>
          <button className="px-6 py-3 border rounded-lg font-medium hover:bg-muted transition">
            Learn More
          </button>
        </div>
      </motion.div>
    </main>
  )
}
`;
  }

  // ─── Report Generator ────────────────────────────────────────────────────

  private generateReport(
    pages: PageDef[],
    components: ComponentDef[],
    endpoints: EndpointDef[],
    schema: DbSchema | null,
    fileCount: number,
    projectRoot: string,
  ): string {
    const lines: string[] = [
      '# Code Writer Report',
      '',
      '## Summary',
      `- **Project Root**: \`${projectRoot}\``,
      `- **Files Written**: ${fileCount}`,
      `- **Pages**: ${pages.length}`,
      `- **Components**: ${components.length}`,
      `- **API Endpoints**: ${endpoints.length}`,
      `- **Database Tables**: ${schema?.tables?.length ?? 0}`,
      '',
      '## Pages',
      '',
    ];

    for (const page of pages) {
      lines.push(`- **${page.name}** (${page.path})`);
    }

    lines.push('', '## Components', '');

    for (const comp of components) {
      lines.push(`- **${comp.name}** ${comp.description ? `- ${comp.description}` : ''}`);
    }

    if (endpoints.length > 0) {
      lines.push('', '## API Endpoints', '');

      for (const ep of endpoints) {
        lines.push(`- **${ep.method}** ${ep.path}`);
      }
    }

    if (schema?.tables && schema.tables.length > 0) {
      lines.push('', '## Database Tables', '');

      for (const table of schema.tables) {
        lines.push(`- **${table.name}** (${table.columns?.length ?? 0} columns)`);
      }
    }

    return lines.join('\n');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (_, c) => c.toUpperCase());
  }

  private getTypeName(value: unknown): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'unknown[]';
    return 'unknown';
  }
}
