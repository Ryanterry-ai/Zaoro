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
  image: string;
  badge?: string;
  specs?: ProductSpec[];
  features?: string[];
  rating?: number;
  reviewCount?: number;
}

interface ProductShowcaseProps {
  title?: string;
  subtitle?: string;
  products?: Product[];
}

export default function ProductShowcase({ title, subtitle, products }: ProductShowcaseProps) {
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
};
