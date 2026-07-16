'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface AuthFormProps {
  title?: string;
  subtitle?: string;
  fields?: Array<{ name: string; label: string; type?: string; required?: boolean; placeholder?: string; options?: Array<{ label: string; value: string }>; [key: string]: unknown }>;
  actions?: Array<{ label: string; action: string; style?: string; [key: string]: unknown }>;
}

export default function AuthForm(props: AuthFormProps) {
  const { title, subtitle, fields, actions } = props;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="min-h-screen flex items-center justify-center px-6 bg-zinc-950">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
        <h1 className="text-2xl font-black text-zinc-50 text-center mb-2">{title}</h1>
        <p className="text-zinc-400 text-center mb-8">{subtitle}</p>
        <form className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <input type="email" name="email" required className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
            <input type="password" name="password" required className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition" />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition">
            Sign In
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
