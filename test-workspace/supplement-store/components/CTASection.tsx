'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface CTASectionProps {
  title?: string;
  subtitle?: string;
  items?: Array<{ title?: string; description?: string; icon?: string; [key: string]: unknown }>;
  actions?: Array<{ label: string; action: string; style?: string; [key: string]: unknown }>;
}

export default function CTASection(props: CTASectionProps) {
  const { title, subtitle, actions } = props;

  return (
    <section className="py-20 px-6 bg-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="text-emerald-400 text-sm font-bold tracking-wide uppercase mb-4 block">Start Today</span>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
            {title?.replace('Get Started with NutriMart', 'Fuel Your Performance') || 'Fuel Your Performance'}
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-10">
            {subtitle || 'Join 50,000+ athletes who trust NutriMart for genuine, lab-tested supplements.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
            {actions?.map((action, i) => (
              <a key={i} href={action.action} className={`px-8 py-4 rounded-xl font-bold text-sm transition-all ${action.style === 'primary' ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/25' : 'border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white'}`}>
                {action.label === 'Get Started' ? 'Shop Now' : action.label}
              </a>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-500">
            <div className="flex items-center gap-2"><svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>FSSAI Certified</div>
            <div className="flex items-center gap-2"><svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>100% Genuine Products</div>
            <div className="flex items-center gap-2"><svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>Free Delivery ₹999+</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
