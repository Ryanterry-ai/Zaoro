'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';

export interface FeatureGridProps {
  title?: string;
  subtitle?: string;
  items?: Array<{ title?: string; description?: string; icon?: string; metadata?: Record<string, string>; [key: string]: unknown }>;
}

export default function FeatureGrid(props: FeatureGridProps) {
  const { title, subtitle, items } = props;

  return (
    <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.2 }} className="py-20 px-6 ">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-zinc-50 mb-3">{title}</h2>
          <p className="text-zinc-400">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items?.map((feature, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition">
              <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name={feature.icon || 'layers'} />
              </div>
              <h3 className="font-bold text-lg text-zinc-50 mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
