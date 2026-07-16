'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface FeatureGridProps {
  title?: string;
  subtitle?: string;
  items?: Array<{ title?: string; description?: string; icon?: string; metadata?: Record<string, string>; [key: string]: unknown }>;
}

const FEATURES = [
  { icon: '🔬', title: 'Lab Tested', description: 'Every product is third-party lab tested for purity and potency. Reports available on request.' },
  { icon: '🚚', title: 'Free Delivery', description: 'Free shipping on orders above ₹999. Express delivery in metro cities within 24 hours.' },
  { icon: '↩️', title: 'Easy Returns', description: '7-day return policy on unopened products. No questions asked, full refund.' },
  { icon: '🔒', title: '100% Genuine', description: 'Direct imports from authorized distributors. No grey market products, ever.' },
  { icon: '💬', title: 'Expert Guidance', description: 'Chat with certified nutritionists. Get personalized supplement stacks for your goals.' },
  { icon: '📱', title: 'Track Orders', description: 'Real-time GPS tracking from warehouse to your doorstep. SMS & push notifications.' },
];

export default function FeatureGrid(props: FeatureGridProps) {
  return (
    <section className="py-20 px-6 bg-zinc-950" id="features">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-emerald-400 text-sm font-bold tracking-wide uppercase mb-3 block">Why NutriMart</span>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Trusted by Athletes, Built for Performance</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">We source directly from authorized distributors and lab-test every batch. No middlemen, no grey market, no compromise.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="group p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 hover:bg-zinc-900 transition-all"
            >
              <div className="w-14 h-14 mb-5 flex items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
