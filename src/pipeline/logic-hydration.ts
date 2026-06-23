/**
 * Logic Hydration: Provides functional fallback templates when LLM fails.
 * These are NOT generic landing pages — they are fully interactive workspaces.
 */

import type { ASTPatch } from '../types/index.js';

// ─── Fallback Template: Data Dashboard ─────────────────────────

export function generateDataDashboardFallback(prompt: string): ASTPatch[] {
  const domain = detectDomainFromPrompt(prompt);
  
  return [
    {
      targetFile: 'src/app/page.tsx',
      targetExport: 'Home',
      action: 'insert',
      codeBlock: generateDashboardPage(domain),
    },
    {
      targetFile: 'src/components/DataTable.tsx',
      targetExport: 'DataTable',
      action: 'insert',
      codeBlock: generateDataTable(domain),
    },
    {
      targetFile: 'src/components/MetricCard.tsx',
      targetExport: 'MetricCard',
      action: 'insert',
      codeBlock: generateMetricCard(),
    },
    {
      targetFile: 'src/components/ActionForm.tsx',
      targetExport: 'ActionForm',
      action: 'insert',
      codeBlock: generateActionForm(domain),
    },
    {
      targetFile: 'src/lib/actions.ts',
      targetExport: '',
      action: 'insert',
      codeBlock: generateServerActions(domain),
    },
  ];
}

// ─── Domain Detection ──────────────────────────────────────────

function detectDomainFromPrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('saas') || lower.includes('subscription') || lower.includes('billing')) return 'saas';
  if (lower.includes('ecommerce') || lower.includes('shop') || lower.includes('store')) return 'ecommerce';
  if (lower.includes('dashboard') || lower.includes('analytics')) return 'analytics';
  if (lower.includes('crm') || lower.includes('customer')) return 'crm';
  if (lower.includes('project') || lower.includes('task')) return 'project';
  if (lower.includes('invoice') || lower.includes('billing') || lower.includes('payment')) return 'billing';
  
  return 'general';
}

// ─── Dashboard Page ────────────────────────────────────────────

function generateDashboardPage(domain: string): string {
  return `import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/DataTable';
import { MetricCard } from '@/components/MetricCard';
import { ActionForm } from '@/components/ActionForm';

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/${domain}');
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(\`/api/${domain}/\${id}\`, { method: 'DELETE' });
      setData(data.filter(item => item.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const filteredData = data
    .filter(item => 
      item.name?.toLowerCase().includes(filter.toLowerCase()) ||
      item.email?.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const metrics = {
    total: data.length,
    active: data.filter(d => d.status === 'active').length,
    revenue: data.reduce((sum, d) => sum + (d.amount || 0), 0),
    growth: data.length > 0 ? Math.round((data.filter(d => d.status === 'active').length / data.length) * 100) : 0,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">${domain.charAt(0).toUpperCase() + domain.slice(1)} Dashboard</h1>
          <button 
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
          >
            + Add New
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Total" value={metrics.total} trend="+12%" />
          <MetricCard label="Active" value={metrics.active} trend="+5%" />
          <MetricCard label="Revenue" value={\`\$\${metrics.revenue.toLocaleString()}\`} trend="+18%" />
          <MetricCard label="Growth" value={\`\${metrics.growth}%\`} trend="+3%" />
        </div>

        <div className="mb-4 flex items-center gap-4">
          <input
            type="text"
            placeholder="Search..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <span className="text-zinc-400 text-sm">{filteredData.length} results</span>
        </div>

        <DataTable
          data={filteredData}
          loading={loading}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
          onSelect={setSelectedItem}
          onDelete={handleDelete}
        />
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New ${domain.charAt(0).toUpperCase() + domain.slice(1)}</h2>
            <ActionForm 
              onSuccess={() => {
                setShowModal(false);
                fetchData();
              }} 
            />
            <button 
              onClick={() => setShowModal(false)}
              className="mt-4 w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Edit Details</h2>
            <div className="space-y-3">
              {Object.entries(selectedItem).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-zinc-400 capitalize">{key}:</span>
                  <span className="text-white">{String(value)}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setSelectedItem(null)}
              className="mt-4 w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}`;
}

// ─── Data Table Component ──────────────────────────────────────

function generateDataTable(domain: string): string {
  return `import React from 'react';

interface DataTableProps {
  data: any[];
  loading: boolean;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  onSelect: (item: any) => void;
  onDelete: (id: string) => void;
}

export function DataTable({ data, loading, sortField, sortDir, onSort, onSelect, onDelete }: DataTableProps) {
  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-zinc-400">Loading data...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-400">No data found. Add your first item to get started.</p>
      </div>
    );
  }

  const SortIcon = ({ field }: { field: string }) => (
    <span className="ml-1 text-zinc-500">
      {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th 
              onClick={() => onSort('name')}
              className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition"
            >
              Name <SortIcon field="name" />
            </th>
            <th 
              onClick={() => onSort('email')}
              className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition"
            >
              Email <SortIcon field="email" />
            </th>
            <th 
              onClick={() => onSort('status')}
              className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition"
            >
              Status <SortIcon field="status" />
            </th>
            <th 
              onClick={() => onSort('amount')}
              className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition"
            >
              Amount <SortIcon field="amount" />
            </th>
            <th className="px-6 py-4 text-right text-sm font-medium text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr 
              key={item.id} 
              className="border-b border-zinc-800/50 hover:bg-zinc-800/50 cursor-pointer transition"
              onClick={() => onSelect(item)}
            >
              <td className="px-6 py-4">
                <div className="font-medium">{item.name}</div>
              </td>
              <td className="px-6 py-4 text-zinc-400">{item.email}</td>
              <td className="px-6 py-4">
                <span className={\`px-2 py-1 text-xs rounded-full \${
                  item.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-zinc-500/20 text-zinc-400'
                }\`}>
                  {item.status}
                </span>
              </td>
              <td className="px-6 py-4 font-medium">\${item.amount?.toLocaleString() || '0'}</td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="text-red-400 hover:text-red-300 text-sm transition"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`;
}

// ─── Metric Card Component ─────────────────────────────────────

function generateMetricCard(): string {
  return `import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
}

export function MetricCard({ label, value, trend }: MetricCardProps) {
  const isPositive = trend?.startsWith('+');
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="text-sm text-zinc-400 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <div className={\`text-sm mt-1 \${isPositive ? 'text-green-400' : 'text-red-400'}\`}>
          {trend}
        </div>
      )}
    </div>
  );
}`;
}

// ─── Action Form Component ─────────────────────────────────────

function generateActionForm(domain: string): string {
  return `import React, { useState } from 'react';
import { createItem } from '@/lib/actions';

interface ActionFormProps {
  onSuccess: () => void;
}

export function ActionForm({ onSuccess }: ActionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    amount: '',
    status: 'active',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await createItem({
        name: form.name,
        email: form.email,
        amount: Number(form.amount) || 0,
        status: form.status,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="Enter name..."
        />
      </div>
      
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="email@example.com"
        />
      </div>
      
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Amount ($)</label>
        <input
          type="number"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="0.00"
        />
      </div>
      
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition"
      >
        {loading ? 'Creating...' : 'Create Item'}
      </button>
    </form>
  );
}`;
}

// ─── Server Actions ────────────────────────────────────────────

function generateServerActions(domain: string): string {
  return `"use server";

import { revalidatePath } from "next/cache";

// In-memory store for demo (replace with real database)
let items: any[] = [
  { id: "1", name: "Stellar Solutions", email: "contact@stellar.com", amount: 4999, status: "active", createdAt: "Jan 15, 2026" },
  { id: "2", name: "NovaTech Inc", email: "hello@novatech.io", amount: 2499, status: "active", createdAt: "Feb 3, 2026" },
  { id: "3", name: "Apex Digital", email: "support@apex.dev", amount: 1299, status: "pending", createdAt: "Mar 12, 2026" },
  { id: "4", name: "Pulse Systems", email: "info@pulse.co", amount: 3499, status: "active", createdAt: "Apr 8, 2026" },
  { id: "5", name: "Zenith Labs", email: "team@zenith.ai", amount: 5999, status: "inactive", createdAt: "May 21, 2026" },
];

export async function getItems() {
  return items;
}

export async function getItem(id: string) {
  return items.find(item => item.id === id) || null;
}

export async function createItem(data: { name: string; email: string; amount: number; status: string }) {
  const newItem = {
    id: String(Date.now()),
    ...data,
    createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
  items.push(newItem);
  revalidatePath("/");
  return newItem;
}

export async function updateItem(id: string, data: Partial<{ name: string; email: string; amount: number; status: string }>) {
  const index = items.findIndex(item => item.id === id);
  if (index === -1) throw new Error("Item not found");
  
  items[index] = { ...items[index], ...data };
  revalidatePath("/");
  return items[index];
}

export async function deleteItem(id: string) {
  const index = items.findIndex(item => item.id === id);
  if (index === -1) throw new Error("Item not found");
  
  items.splice(index, 1);
  revalidatePath("/");
  return { success: true };
}

export async function getMetrics() {
  const total = items.length;
  const active = items.filter(i => i.status === "active").length;
  const revenue = items.reduce((sum, i) => sum + (i.amount || 0), 0);
  const growth = total > 0 ? Math.round((active / total) * 100) : 0;
  
  return { total, active, revenue, growth };
}`;
}
