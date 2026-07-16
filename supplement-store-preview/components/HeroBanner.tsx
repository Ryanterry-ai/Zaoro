'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface HeroBannerProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  items?: Array<{ title?: string; description?: string; icon?: string; metadata?: Record<string, string>; [key: string]: unknown }>;
  actions?: Array<{ label: string; action: string; style?: string; [key: string]: unknown }>;
}

export default function HeroBanner(props: HeroBannerProps) {
  const { title, subtitle, badge, items, actions } = props;

  return (
    <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.2 }} className="relative pt-24 pb-16 px-6 bg-gradient-to-br from-zinc-900 via-zinc-900 to-[#2563EB]/20">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-primary/20 bg-primary/10 text-primary">{badge}</div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-50">{title}</h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">{subtitle}</p>
        <div className="flex items-center justify-center gap-4">
          <a href="#features" className="px-8 py-4 rounded-xl font-bold transition-all bg-primary hover:bg-primary/90 text-white">
            Shop Now
          </a>
          <a href="#contact" className="px-8 py-4 rounded-xl font-bold transition-all border border-zinc-700 hover:border-zinc-500 text-zinc-300">
            View Collections
          </a>
        </div>
      </div>
    </motion.section>
  );
}
