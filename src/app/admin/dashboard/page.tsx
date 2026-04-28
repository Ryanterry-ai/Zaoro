'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Tag, Settings, Image as ImageIcon, Navigation, FileText, LogOut, BarChart3, ShoppingBag, Users, Eye } from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/collections', icon: Tag, label: 'Collections' },
  { href: '/admin/navigation', icon: Navigation, label: 'Navigation' },
  { href: '/admin/pages', icon: FileText, label: 'Pages' },
  { href: '/admin/media', icon: ImageIcon, label: 'Media' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

function AdminNav({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="w-56 min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <div className="p-6 border-b border-[#222]">
        <h1 className="font-serif text-xl font-semibold">TruArtz</h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">Admin Panel</p>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 px-6 py-3 text-sm text-[#D4D4D4] hover:text-white hover:bg-[#1A1A1A] transition-colors">
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-[#222] space-y-2">
        <a href="/" target="_blank" className="flex items-center gap-3 px-2 py-2 text-sm text-[#6B6B6B] hover:text-white transition-colors">
          <Eye className="w-4 h-4" />
          View Site
        </a>
        <button onClick={onLogout} className="flex items-center gap-3 px-2 py-2 text-sm text-[#6B6B6B] hover:text-white transition-colors w-full">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    fetch('/api/products').then(r=>r.json()).then(setProducts).catch(()=>{});
    fetch('/api/collections').then(r=>r.json()).then(setCollections).catch(()=>{});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const stats = [
    { label: 'Total Products', value: products.length, icon: Package, color: 'bg-blue-50 text-blue-600' },
    { label: 'Collections', value: collections.length, icon: Tag, color: 'bg-green-50 text-green-600' },
    { label: 'Total Orders', value: '0', icon: ShoppingBag, color: 'bg-orange-50 text-orange-600' },
    { label: 'Customers', value: '0', icon: Users, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8F6F3]">
      <AdminNav onLogout={handleLogout} />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-[#0A0A0A]">Dashboard</h2>
          <p className="text-[#6B6B6B] text-sm mt-1">Welcome back to your TruArtz store admin</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white p-5 rounded shadow-sm">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-[#0A0A0A]">{s.value}</div>
              <div className="text-xs text-[#6B6B6B] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded shadow-sm">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Add New Product', href: '/admin/products', desc: 'Create a new product listing' },
                { label: 'Edit Homepage', href: '/admin/pages', desc: 'Manage homepage sections' },
                { label: 'Update Navigation', href: '/admin/navigation', desc: 'Edit menu structure' },
                { label: 'Site Settings', href: '/admin/settings', desc: 'Configure store settings' },
              ].map(a => (
                <Link key={a.href} href={a.href} className="flex items-center justify-between py-2.5 border-b border-[#F0EDE8] last:border-0 hover:text-[#6B6B6B] transition-colors">
                  <div>
                    <div className="text-sm font-medium">{a.label}</div>
                    <div className="text-xs text-[#6B6B6B]">{a.desc}</div>
                  </div>
                  <span className="text-[#D4D4D4]">→</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded shadow-sm">
            <h3 className="font-semibold mb-4">Manage Content</h3>
            <div className="grid grid-cols-2 gap-3">
              {navItems.slice(1).map(item => (
                <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-2 p-4 border border-[#EDE9E3] rounded hover:border-[#0A0A0A] transition-colors text-center">
                  <item.icon className="w-5 h-5 text-[#6B6B6B]" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
