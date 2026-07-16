'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface TestimonialsProps {
  title?: string;
  subtitle?: string;
  items?: Array<{ title?: string; description?: string; icon?: string; metadata?: Record<string, string>; [key: string]: unknown }>;
}

export default function Testimonials(props: TestimonialsProps) {
  const { title, subtitle, items } = props;

  return (
    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="py-20 px-6 bg-zinc-900/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-zinc-50 mb-3">{title}</h2>
          <p className="text-zinc-400">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items?.map((testimonial, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-1 mb-3 text-yellow-400 text-sm">★★★★★</div>
              <p className="text-sm text-zinc-400 mb-4">"{testimonial.metadata?.quote}"</p>
              <div>
                <div className="font-bold text-zinc-50">{testimonial.title}</div>
                <div className="text-sm text-zinc-500">{testimonial.description}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
