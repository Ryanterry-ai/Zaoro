'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface ContactFormProps {
  title?: string;
  subtitle?: string;
  fields?: Array<{ name: string; label: string; type?: string; required?: boolean; placeholder?: string; options?: Array<{ label: string; value: string }>; [key: string]: unknown }>;
  actions?: Array<{ label: string; action: string; style?: string; [key: string]: unknown }>;
}

export default function ContactForm(props: ContactFormProps) {
  const { title, subtitle, fields, actions } = props;

  return (
    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="px-6 pb-16">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-black text-zinc-50 text-center mb-3">{title}</h2>
        <p className="text-zinc-400 text-center mb-8">{subtitle}</p>
        <form className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
            <input type="text" name="name" required className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <input type="email" name="email" required className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Subject</label>
            <input type="text" name="subject"  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Message</label>
            <textarea name="message" required rows={4} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition resize-none" />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition">
            Send Message
          </button>
        </form>
      </motion.div>
    </motion.section>
  );
}
