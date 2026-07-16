'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface CheckoutFormProps {
  title?: string;
  subtitle?: string;
  fields?: Array<{ name: string; label: string; type?: string; required?: boolean; placeholder?: string; options?: Array<{ label: string; value: string }>; [key: string]: unknown }>;
  actions?: Array<{ label: string; action: string; style?: string; [key: string]: unknown }>;
}

export default function CheckoutForm(props: CheckoutFormProps) {
  const { title, subtitle, fields, actions } = props;

  return (
    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-bold">Checkout</h2>
        <p className="text-zinc-400 mt-2">Complete your order</p>
        <div className="mt-8 space-y-4 max-w-lg">
          {fields?.map((field, i) => (
            <div key={i}>
              <label className="block text-sm font-medium text-zinc-300 mb-1">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100" rows={3} />
              ) : field.type === 'select' ? (
                <select className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100">
                  {field.options?.map((opt, j) => <option key={j} value={opt.value}>{opt.label}</option>)}
                </select>
              ) : (
                <input type={field.type || 'text'} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100" placeholder={field.placeholder} />
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}
