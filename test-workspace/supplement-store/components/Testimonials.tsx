'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface TestimonialsProps {
  title?: string;
  subtitle?: string;
  items?: Array<{ title?: string; description?: string; metadata?: Record<string, string>; [key: string]: unknown }>;
}

const TESTIMONIALS = [
  {
    name: 'Rahul Sharma',
    role: 'Fitness Coach, Mumbai',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    text: "I've been recommending MuscleBlaze to my clients for 3 years. The quality is consistent and the lab reports give real confidence. Best supplement store in India.",
    rating: 5,
  },
  {
    name: 'Priya Patel',
    role: 'Marathon Runner',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    text: 'The ON Gold Standard whey I ordered was genuine and fresh. Delivery was super fast — got it in 2 days. Now my go-to for all supplements.',
    rating: 5,
  },
  {
    name: 'Amit Singh',
    role: 'Gym Owner, Delhi',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    text: 'Bulk orders for my gym members are always handled professionally. Great prices on BSN and Dymatize. Highly recommend for gym owners.',
    rating: 5,
  },
];

export default function Testimonials(props: TestimonialsProps) {
  return (
    <section className="py-20 px-6 bg-zinc-900/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-emerald-400 text-sm font-bold tracking-wide uppercase mb-3 block">Testimonials</span>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Loved by 50,000+ Athletes</h2>
          <p className="text-zinc-400">Don't take our word for it. Here's what our customers say.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="relative p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <svg key={j} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">"{testimonial.text}"</p>
              <div className="flex items-center gap-3">
                <img src={testimonial.avatar} alt={testimonial.name} className="w-11 h-11 rounded-full object-cover border-2 border-zinc-800" />
                <div>
                  <div className="font-bold text-white text-sm">{testimonial.name}</div>
                  <div className="text-xs text-zinc-500">{testimonial.role}</div>
                </div>
              </div>
              <div className="absolute top-6 right-6 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
