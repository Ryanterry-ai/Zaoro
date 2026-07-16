'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface CTASectionProps {
  title?: string;
  subtitle?: string;
  items?: Array<{ title?: string; description?: string; icon?: string; metadata?: Record<string, string>; [key: string]: unknown }>;
  actions?: Array<{ label: string; action: string; style?: string; [key: string]: unknown }>;
}

export default function CTASection(props: CTASectionProps) {
  const { title, subtitle, items, actions } = props;

  return (
    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="px-6 pb-20">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-xl mx-auto text-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <h2 className="text-xl font-black text-zinc-50 mb-3">{title}</h2>
        <p className="text-sm text-zinc-500 mb-6">{subtitle}</p>
        {items?.length ? (
          <div className="flex items-center justify-center gap-4 mb-6">
            {items?.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="text-primary">✓</span>
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-center gap-4">
          <a href="/shop" className="px-8 py-4 rounded-xl font-bold transition-all bg-primary hover:bg-primary/90 text-white">
            Shop Now
          </a>
          <a href="/shop" className="px-8 py-4 rounded-xl font-bold transition-all border border-zinc-700 hover:border-zinc-500 text-zinc-300">
            Browse Categories
          </a>
        </div>
      </motion.div>
    </motion.section>
  );
}
