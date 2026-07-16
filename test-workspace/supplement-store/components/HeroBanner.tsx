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
  const { title, subtitle, badge, actions } = props;

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-zinc-950">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&h=1080&fit=crop"
          alt="Gym supplements"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-zinc-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="max-w-2xl">
          {badge && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {badge}
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.1] mb-6"
          >
            {title?.split(' ').map((word, i) => (
              <span key={i} className={i === 0 ? 'text-emerald-400' : ''}>
                {word}{' '}
              </span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-zinc-400 max-w-lg mb-8 leading-relaxed"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center gap-4"
          >
            {actions?.map((action, i) => (
              <a
                key={i}
                href={action.action}
                className={`px-8 py-4 rounded-xl font-bold text-sm transition-all ${
                  action.style === 'primary'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/25'
                    : 'border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white'
                }`}
              >
                {action.label}
              </a>
            ))}
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center gap-8 mt-12 pt-8 border-t border-zinc-800"
          >
            {[
              { value: '50K+', label: 'Happy Customers' },
              { value: '4.9★', label: 'Rating' },
              { value: 'FSSAI', label: 'Certified' },
              { value: '100%', label: 'Genuine' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
