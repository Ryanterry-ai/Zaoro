'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface CartItemsProps {
  title?: string;
  entity?: string;
  items?: Array<{ title?: string; description?: string; icon?: string; metadata?: Record<string, string>; [key: string]: unknown }>;
  columns?: Array<{ key: string; label: string; [key: string]: unknown }>;
  actions?: Array<{ label: string; action: string; style?: string; [key: string]: unknown }>;
}

export default function CartItems(props: CartItemsProps) {
  const { title, entity, items, columns, actions } = props;

  return (
    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-7xl mx-auto px-6">
        <h2 className="text-2xl font-bold">Shopping Cart</h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              {columns?.map((col, i) => <th key={i} className="px-4 py-3 text-left font-medium text-zinc-300">{col.label}</th>)}
            </tr></thead>
            <tbody>
              {items?.map((row, i) => (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-zinc-100">{row.title}</td>
                  {columns?.slice(1).map((col, j) => <td key={j} className="px-4 py-3 text-zinc-400">{(row.metadata as any)?.[col.key] ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.section>
  );
}
