'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface RecommendedProductsProps {
  title?: string;
  entity?: string;
  items?: Array<{ title?: string; description?: string; icon?: string; metadata?: Record<string, string>; [key: string]: unknown }>;
}

export default function RecommendedProducts(props: RecommendedProductsProps) {
  const { title, entity, items } = props;

  return (
    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-bold">You May Also Like</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
          {items?.map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="text-lg font-bold">{item.icon ? '★' : '→'}</span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">{item.title}</h3>
              <p className="text-zinc-400 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}
