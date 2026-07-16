'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface DataTableProps {
  title?: string;
  entity?: string;
  items?: Array<{ title?: string; description?: string; icon?: string; metadata?: Record<string, string>; [key: string]: unknown }>;
  columns?: Array<{ key: string; label: string; [key: string]: unknown }>;
  actions?: Array<{ label: string; action: string; style?: string; [key: string]: unknown }>;
}

export default function DataTable(props: DataTableProps) {
  const { title, entity, items, columns, actions } = props;

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: 0.1 }} className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">
        <h3 className="font-semibold text-zinc-100">{title}</h3>
        {actions?.map((action, i) => (
          <button key={i} className="px-4 py-2 text-sm rounded-lg bg-primary hover:bg-primary/90 text-white">{action.label}</button>
        ))}
      </motion.div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400">
            {columns?.map((col, i) => (<th key={i} className="px-4 py-3 text-left font-medium">{col.label}</th>))}
          </tr>
        </thead>
        <tbody>
          {items?.map((item, i) => (
            <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              {columns?.map((col, j) => (<td key={j} className="px-4 py-3 text-zinc-300">{String(item[col.key] ?? item.title ?? '—')}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
