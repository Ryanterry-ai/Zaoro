'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Product {
  title: string;
  description: string;
  price: string;
  image?: string;
  specs?: Array<{ label: string; value: string }>;
  [key: string]: unknown;
}

export interface ProductShowcaseProps {
  title?: string;
  subtitle?: string;
  items?: Product[];
  currency?: string;
  columns?: string;
}

export default function ProductShowcase(props: ProductShowcaseProps) {
  const { title, subtitle, items = [], currency = 'USD', columns = '3' } = props;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const gridCols = columns === '4' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    : columns === '2' ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-foreground mb-3">{title}</h2>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Product Grid */}
        <div className={`grid ${gridCols} gap-6`}>
          {items.map((product, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Product Image */}
              <div className="relative h-48 bg-muted">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-2">{product.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.description}</p>

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-black text-foreground">{product.price}</span>
                </div>

                {/* Specs Accordion */}
                {product.specs && product.specs.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                      className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Specifications</span>
                      <motion.svg
                        animate={{ rotate: expandedIndex === i ? 180 : 0 }}
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </motion.svg>
                    </button>
                    <AnimatePresence>
                      {expandedIndex === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <dl className="mt-4 space-y-2">
                            {product.specs.map((spec, j) => (
                              <div key={j} className="flex justify-between text-sm">
                                <dt className="text-muted-foreground">{spec.label}</dt>
                                <dd className="font-medium text-foreground">{spec.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Shop Now Button */}
                <button className="w-full mt-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold transition hover:opacity-90">
                  Shop Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
