/**
 * SaaS Component Templates
 *
 * Production-quality component templates for SaaS applications.
 */

export const SAAS_TEMPLATES = {
  /**
   * PricingCard component with features list, highlighted tier, CTA
   */
  PricingCard: () => `'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface PricingCardProps {
  name: string;
  price: number;
  period?: string;
  features: string[];
  highlighted?: boolean;
  cta?: string;
  onSelect?: () => void;
}

export default function PricingCard({ name, price, period = 'month', features, highlighted, cta = 'Get Started', onSelect }: PricingCardProps) {
  return (
    <motion.div whileHover={{ y: -8 }} transition={{ duration: 0.3 }} className={\`rounded-2xl p-8 flex flex-col \${highlighted ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-4' : 'bg-white border border-neutral-200'}\`}>
      <h3 className="font-display font-bold text-xl mb-2">{name}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold">₹{price.toLocaleString('en-IN')}</span>
        <span className="text-sm opacity-70">/{period}</span>
      </div>
      <ul className="space-y-3 mb-8 flex-grow">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check size={16} className={highlighted ? 'text-white' : 'text-emerald-500'} />
            {feature}
          </li>
        ))}
      </ul>
      <button onClick={onSelect} className={\`w-full py-3 rounded-xl font-bold transition-colors \${highlighted ? 'bg-white text-indigo-600 hover:bg-neutral-100' : 'bg-indigo-600 text-white hover:bg-indigo-700'}\`}>
        {cta}
      </button>
    </motion.div>
  );
}`,

  /**
   * FeatureGrid component with icons, title, description
   */
  FeatureGrid: () => `'use client';

import { motion } from 'framer-motion';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface FeatureGridProps {
  title: string;
  subtitle: string;
  features: Feature[];
}

export default function FeatureGrid({ title, subtitle, features }: FeatureGridProps) {
  return (
    <section className="py-20 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl md:text-4xl mb-4">{title}</h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-neutral-600 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}`,

  /**
   * DashboardLayout component with sidebar, header, main content area
   */
  DashboardLayout: () => `'use client';

import { useState } from 'react';
import { LayoutDashboard, Settings, Users, BarChart3, Bell, Search, Menu } from 'lucide-react';

interface SidebarItem {
  icon: any;
  label: string;
  active?: boolean;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarItems?: SidebarItem[];
}

export default function DashboardLayout({ children, sidebarItems }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const items = sidebarItems || [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Users, label: 'Users' },
    { icon: BarChart3, label: 'Analytics' },
    { icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="flex h-screen bg-neutral-50">
      <aside className={\`bg-white border-r border-neutral-200 transition-all duration-300 \${sidebarOpen ? 'w-64' : 'w-20'}\`}>
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl">Dashboard</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-neutral-100 rounded-xl"><Menu size={20} /></button>
        </div>
        <nav className="p-4 space-y-2">
          {items.map((item, i) => (
            <button key={i} className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors \${item.active ? 'bg-indigo-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'}\`}>
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex-grow flex flex-col">
        <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Search size={20} className="text-neutral-400" />
            <input placeholder="Search..." className="bg-transparent focus:outline-none text-sm" />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-neutral-100 rounded-xl"><Bell size={20} /></button>
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">U</div>
          </div>
        </header>
        <main className="flex-grow p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}`,

  /**
   * StatsCard component for dashboard metrics
   */
  StatsCard: () => `'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: string;
}

export default function StatsCard({ title, value, change, icon }: StatsCardProps) {
  const isPositive = change && change > 0;

  return (
    <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-neutral-500">{title}</span>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold font-display">{value}</span>
        {change !== undefined && (
          <span className={\`flex items-center gap-1 text-sm font-medium \${isPositive ? 'text-emerald-600' : 'text-red-600'}\`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}`
};

export default SAAS_TEMPLATES;
