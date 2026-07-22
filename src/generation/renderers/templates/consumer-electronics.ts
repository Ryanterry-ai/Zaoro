/**
 * Consumer Electronics Component Templates
 *
 * Production-quality component templates for electronics / audio / gadget brands.
 * Templates consume structured data (JSON) and never hardcode content.
 */

export const CONSUMER_ELECTRONICS_TEMPLATES = {
  /**
   * ProductShowcase — hero-style product display with specs, pricing, and CTA.
   * Designed for headphone / audio / gadget product pages.
   */
  ProductShowcase: () => `'use client';

import { motion } from 'framer-motion';

interface ProductSpec {
  label: string;
  value: string;
}

interface Product {
  name: string;
  tagline?: string;
  price: string;
  originalPrice?: string;
  image?: string;
  badge?: string;
  description?: string;
  specs?: ProductSpec[];
  features?: string[];
  rating?: number;
  reviewCount?: number;
  [key: string]: unknown;
}

interface ProductShowcaseProps {
  title?: string;
  subtitle?: string;
  items?: Product[];
}

export default function ProductShowcase({ title, subtitle, items: products }: ProductShowcaseProps) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {title && (
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">{title}</h2>
            {subtitle && <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products?.map((product, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-300"
            >
              <div className="relative h-56 bg-gradient-to-br from-muted/50 to-muted/20 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {product.badge && (
                  <span className="absolute top-4 left-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    {product.badge}
                  </span>
                )}
              </div>
              <div className="p-6">
                {product.tagline && (
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{product.tagline}</p>
                )}
                <h3 className="text-xl font-black text-foreground mb-2">{product.name}</h3>
                {product.rating && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-yellow-400 text-sm">{'★'.repeat(Math.round(product.rating))}</span>
                    <span className="text-xs text-muted-foreground">({product.reviewCount ?? 0} reviews)</span>
                  </div>
                )}
                {product.specs && product.specs.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {product.specs.slice(0, 4).map((spec, j) => (
                      <div key={j} className="text-xs">
                        <span className="text-muted-foreground">{spec.label}: </span>
                        <span className="font-semibold text-foreground">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {product.features && product.features.length > 0 && (
                  <ul className="space-y-1 mb-4">
                    {product.features.slice(0, 3).map((f, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="text-primary">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <span className="text-2xl font-black text-foreground">{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through ml-2">{product.originalPrice}</span>
                    )}
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition">
                    Add to Cart
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
`,
  /**
   * SoundwaveHero — immersive scroll narrative with SVG path morph.
   * The wave morphs from chaotic noise to a flat line as user scrolls.
   * Uses Framer Motion useTransform on SVG d attribute.
   */
  SoundwaveHero: () => `'use client';

import React, { useRef, useMemo } from 'react';
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';

interface SoundwaveHeroProps {
  title?: string;
  subtitle?: string;
  beats?: Array<{ title: string; body: string }>;
  accentColor?: string;
}

function generateWavePath(width: number, height: number, chaos: number, offset: number): string {
  const mid = height / 2;
  const segments = 64;
  const segWidth = width / segments;
  let d = \`M 0 \${mid}\`;
  for (let i = 0; i <= segments; i++) {
    const x = i * segWidth;
    const noise = Math.sin(i * 0.8 + offset) * chaos * 0.6
      + Math.sin(i * 1.3 + offset * 1.7) * chaos * 0.3
      + Math.sin(i * 2.1 + offset * 0.5) * chaos * 0.1;
    const y = mid + noise;
    d += \` L \${x.toFixed(1)} \${y.toFixed(1)}\`;
  }
  return d;
}

export default function SoundwaveHero({ title, subtitle, beats: inputBeats, accentColor = '#00d4ff' }: SoundwaveHeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 30 });

  const width = 1200;
  const height = 200;
  const maxChaos = 80;

  const chaos = useTransform(progress, [0, 0.7], [maxChaos, 0]);
  const waveOpacity = useTransform(progress, [0, 0.8], [1, 0.08]);
  const glowOpacity = useTransform(progress, [0, 0.5, 1], [0.4, 0.2, 0]);
  const calmScale = useTransform(progress, [0.5, 1], [0.5, 1.5]);
  const calmOpacity = useTransform(progress, [0.5, 1], [0, 0.6]);
  const bgColor = useTransform(progress, [0, 1], [0.02, 0.06]);
  const scrollHintOpacity = useTransform(progress, [0, 0.15], [1, 0]);

  const beats = inputBeats?.length
    ? inputBeats
    : [
        { title: 'The world is loud.', body: 'A wall of overlapping signals. This is before.' },
        { title: 'Then, a threshold.', body: 'Adaptive cancellation reads the room and begins to fold the noise back on itself.' },
        { title: 'The static thins.', body: 'What was a roar becomes a whisper, then a tide pulling out to sea.' },
        { title: 'Complete silence.', body: 'Nothing left but the low hum of your own pulse.' },
      ];

  const [active, setActive] = React.useState(0);
  useMotionValueEvent(progress, 'change', (v) => {
    setActive(Math.min(beats.length - 1, Math.floor(v * beats.length)));
  });

  const [currentChaos, setCurrentChaos] = React.useState(maxChaos);
  useMotionValueEvent(chaos, 'change', (v) => setCurrentChaos(v));

  const wavePath = useMemo(
    () => generateWavePath(width, height, currentChaos, 0),
    [currentChaos],
  );

  return (
    <section ref={ref} className="relative h-[400vh] bg-black" aria-label="Soundwave transforms to silence">
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
        {/* Radial glow background */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: useTransform(bgColor, (l: number) =>
              \`radial-gradient(circle at 50% 50%, rgba(0,212,255,\${l}) 0%, #000 70%)\`
            ),
          }}
        />

        {/* SVG Soundwave */}
        <svg
          viewBox={\`0 0 \${width} \${height}\`}
          className="absolute w-full max-w-5xl px-8"
          style={{ opacity: waveOpacity as any }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.9" />
              <stop offset="50%" stopColor="#ff6b00" stopOpacity="0.7" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.9" />
            </linearGradient>
            <filter id="wave-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={wavePath}
            fill="none"
            stroke="url(#wave-gradient)"
            strokeWidth="3"
            filter="url(#wave-glow)"
            strokeLinecap="round"
          />
          {/* Mirror path for symmetry */}
          <path
            d={wavePath}
            fill="none"
            stroke="url(#wave-gradient)"
            strokeWidth="2"
            opacity="0.4"
            transform={\`scale(1,-1) translate(0,-\${height})\`}
            strokeLinecap="round"
          />
        </svg>

        {/* Calm circle — appears as wave flattens */}
        <motion.div
          className="absolute rounded-full"
          style={{
            scale: calmScale,
            opacity: calmOpacity,
            width: 200,
            height: 200,
            background: \`radial-gradient(circle, rgba(0,212,255,0.3), transparent 70%)\`,
            boxShadow: \`0 0 100px 30px rgba(0,212,255,0.2)\`,
          }}
        />

        {/* Text beats */}
        <div className="relative z-10 max-w-2xl px-6 text-center">
          {beats.map((beat, i) => (
            <motion.div
              key={beat.title}
              className="absolute inset-x-6"
              initial={false}
              animate={{ opacity: i === active ? 1 : 0, y: i === active ? 0 : 16 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4">{beat.title}</h2>
              <p className="text-lg text-white/70 max-w-xl mx-auto">{beat.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.3em] uppercase text-white/40"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          style={{ opacity: scrollHintOpacity }}
        >
          scroll to experience
        </motion.div>
      </div>
    </section>
  );
}
`,
};
