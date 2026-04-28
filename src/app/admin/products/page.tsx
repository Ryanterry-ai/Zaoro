'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft, Search, X } from 'lucide-react';

interface Product {
  id: string; handle: string; name: string; price: number;
  comparePrice?: number; images: string[]; category: string;
  badge?: string | null; stock: number; variants: { id: string; title: string; price: number; comparePrice?: number; stock: number; sku: string; options: Record<string,string> }[];
  description: string; tags: string[]; details?: Record<string,string>;
  reviews?: number; visible: boolean; currency: string;
}

const emptyProduct: Omit<Product,'id'> = {
  handle: '', name: '', price: 0, comparePrice: 0, images: [''],
  category: 'men', badge: '', stock: 0, variants: [
    { id: 'v-s', title: 'S', options: { size: 'S' }, price: 0, comparePrice: 0, stock: 0, sku: '' },
    { id: 'v-m', title: 'M', options: { size: 'M' }, price: 0, comparePrice: 0, stock: 0, sku: '' },
    { id: 'v-l', title: 'L', options: { size: 'L' }, price: 0, comparePrice: 0, stock: 0, sku: '' },
    { id: 'v-xl', title: 'XL', options: { size: 'XL' }, price: 0, comparePrice: 0, stock: 0, sku: '' },
  ],
  description: '', tags: [], details: { material: '', care: '' },
  reviews: 0, visible: true, currency: 'INR',
};

function NavSidebar() {
  const router = useRouter();
  const handleLogout = async () => { await fetch('/api/auth',{method:'DELETE'}); router.push('/admin/login'); };
  const navItems = [
    {href:'/admin/dashboard',label:'Dashboard'},{href:'/admin/products',label:'Products'},
    {href:'/admin/collections',label:'Collections'},{href:'/admin/navigation',label:'Navigation'},
    {href:'/admin/pages',label:'Pages'},{href:'/admin/media',label:'Media'},{href:'/admin/settings',label:'Settings'},
  ];
  return (
    <aside className="w-56 min-h-screen bg-[#0A0A0A] text-white flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-[#222]">
        <h1 className="font-serif text-xl font-semibold">ZARO</h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">Admin Panel</p>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 px-6 py-3 text-sm text-[#D4D4D4] hover:text-white hover:bg-[#1A1A1A] transition-colors">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-[#222] space-y-2">
        <a href="/" target="_blank" className="block px-2 py-2 text-sm text-[#6B6B6B] hover:text-white transition-colors">View Site</a>
        <button onClick={handleLogout} className="block w-full text-left px-2 py-2 text-sm text-[#6B6B6B] hover:text-white transition-colors">Logout</button>
      </div>
    </aside>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetch('/api/products').then(r=>r.json()).then(setProducts); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (paise: number) => `₹${(paise/100).toLocaleString('en-IN')}`;

  const startNew = () => {
    setEditing({ id: `prod_${Date.now()}`, ...emptyProduct });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updatedList = isNew
        ? [...products, editing]
        : products.map(p => p.id === editing.id ? editing : p);
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList),
      });
      if (res.ok) {
        setProducts(updatedList);
        setEditing(null);
        setIsNew(false);
        setMsg('Saved! Commit data/products.json to persist.');
        setTimeout(() => setMsg(''), 5000);
      }
    } finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this product?')) return;
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    fetch('/api/products', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) });
  };

  const toggleVisible = (id: string) => {
    const updated = products.map(p => p.id === id ? {...p, visible: !p.visible} : p);
    setProducts(updated);
    fetch('/api/products', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(updated) });
  };

  const updateVariant = (idx: number, field: string, value: string|number) => {
    if (!editing) return;
    const variants = editing.variants.map((v, i) => i === idx ? {...v, [field]: value} : v);
    setEditing({...editing, variants});
  };

  if (editing) {
    return (
      <div className="flex min-h-screen bg-[#F8F6F3]">
        <NavSidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => { setEditing(null); setIsNew(false); }} className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#0A0A0A]">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-xl font-semibold">{isNew ? 'New Product' : `Edit: ${editing.name}`}</h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white p-6 rounded shadow-sm space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">Basic Info</h3>
                {[
                  {label:'Product Name',key:'name',type:'text'},
                  {label:'Handle (URL slug)',key:'handle',type:'text'},
                  {label:'Description',key:'description',type:'textarea'},
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{f.label}</label>
                    {f.type === 'textarea'
                      ? <textarea rows={4} value={(editing as unknown as Record<string,unknown>)[f.key] as string || ''} onChange={e => setEditing({...editing, [f.key]: e.target.value})} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A] resize-none" />
                      : <input type="text" value={(editing as unknown as Record<string,unknown>)[f.key] as string || ''} onChange={e => setEditing({...editing, [f.key]: e.target.value})} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" />
                    }
                  </div>
                ))}
              </div>

              {/* Images */}
              <div className="bg-white p-6 rounded shadow-sm space-y-3">
                <h3 className="font-semibold text-sm border-b pb-2">Images (URLs)</h3>
                {editing.images.map((img, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="text" value={img} placeholder="https://..." onChange={e => {
                      const imgs = [...editing.images]; imgs[i] = e.target.value; setEditing({...editing, images: imgs});
                    }} className="flex-1 border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" />
                    {img && <div className="w-10 h-10 relative overflow-hidden bg-[#F8F6F3] flex-shrink-0"><Image src={img} alt="" fill className="object-cover" sizes="40px" /></div>}
                    <button onClick={() => setEditing({...editing, images: editing.images.filter((_,j)=>j!==i)})} className="text-red-400 hover:text-red-600"><X className="w-4 h-4"/></button>
                  </div>
                ))}
                <button onClick={() => setEditing({...editing, images: [...editing.images,'']})} className="text-xs text-[#6B6B6B] border border-dashed border-[#D4D4D4] px-3 py-2 w-full hover:border-[#0A0A0A] transition-colors">
                  + Add Image URL
                </button>
              </div>

              {/* Variants */}
              <div className="bg-white p-6 rounded shadow-sm">
                <h3 className="font-semibold text-sm border-b pb-2 mb-4">Variants</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-[#6B6B6B] border-b">
                        <th className="text-left pb-2 pr-3">Size</th>
                        <th className="text-left pb-2 pr-3">Price (₹)</th>
                        <th className="text-left pb-2 pr-3">Compare (₹)</th>
                        <th className="text-left pb-2 pr-3">Stock</th>
                        <th className="text-left pb-2">SKU</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EDE8]">
                      {editing.variants.map((v, i) => (
                        <tr key={v.id}>
                          <td className="py-2 pr-3 font-medium w-12">{v.title}</td>
                          {(['price','comparePrice','stock'] as const).map(field => (
                            <td key={field} className="py-2 pr-3">
                              <input type="number" value={field === 'price' || field === 'comparePrice' ? ((v[field] || 0)/100) : v[field]} onChange={e => {
                                const val = field === 'price' || field === 'comparePrice' ? Math.round(parseFloat(e.target.value)*100) : parseInt(e.target.value);
                                updateVariant(i, field, val);
                              }} className="w-24 border border-[#D4D4D4] px-2 py-1 text-xs outline-none focus:border-[#0A0A0A]" />
                            </td>
                          ))}
                          <td className="py-2">
                            <input type="text" value={v.sku} onChange={e => updateVariant(i,'sku',e.target.value)} className="w-28 border border-[#D4D4D4] px-2 py-1 text-xs outline-none focus:border-[#0A0A0A]" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Details */}
              <div className="bg-white p-6 rounded shadow-sm space-y-3">
                <h3 className="font-semibold text-sm border-b pb-2">Product Details</h3>
                {Object.entries(editing.details || {}).map(([k,v]) => (
                  <div key={k} className="flex gap-3">
                    <input value={k} readOnly className="w-32 border border-[#D4D4D4] px-3 py-2 text-xs bg-[#F8F6F3]" />
                    <input value={v} onChange={e => setEditing({...editing, details: {...editing.details, [k]: e.target.value}})} className="flex-1 border border-[#D4D4D4] px-3 py-2 text-xs outline-none focus:border-[#0A0A0A]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              <div className="bg-white p-6 rounded shadow-sm space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">Pricing</h3>
                {[{label:'Price (₹)',key:'price'},{label:'Compare Price (₹)',key:'comparePrice'}].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{f.label}</label>
                    <input type="number" value={((editing as unknown as Record<string,unknown>)[f.key] as number || 0)/100}
                      onChange={e => setEditing({...editing, [f.key]: Math.round(parseFloat(e.target.value)*100)})}
                      className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" />
                  </div>
                ))}
              </div>

              <div className="bg-white p-6 rounded shadow-sm space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">Organization</h3>
                <div>
                  <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Category</label>
                  <select value={editing.category} onChange={e => setEditing({...editing, category: e.target.value})} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]">
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Badge</label>
                  <input type="text" value={editing.badge || ''} placeholder="e.g. New, 20% Off" onChange={e => setEditing({...editing, badge: e.target.value})} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Tags (comma-separated)</label>
                  <input type="text" value={editing.tags.join(', ')} onChange={e => setEditing({...editing, tags: e.target.value.split(',').map(t=>t.trim()).filter(Boolean)})} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Stock</label>
                  <input type="number" value={editing.stock} onChange={e => setEditing({...editing, stock: parseInt(e.target.value)})} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#6B6B6B]">Visible</label>
                  <button onClick={() => setEditing({...editing, visible: !editing.visible})} className={`w-10 h-5 rounded-full transition-colors ${editing.visible ? 'bg-[#0A0A0A]' : 'bg-[#D4D4D4]'} relative`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editing.visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              <button onClick={handleSave} disabled={saving} className="btn-primary w-full disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Product'}
              </button>
              {msg && <p className="text-xs text-green-600 text-center">{msg}</p>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F6F3]">
      <NavSidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Products</h2>
            <p className="text-sm text-[#6B6B6B]">{products.length} products total</p>
          </div>
          <button onClick={startNew} className="btn-primary flex items-center gap-2 text-xs">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">{msg}</div>}

        <div className="bg-white rounded shadow-sm">
          <div className="p-4 border-b border-[#F0EDE8] flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4D4D4]" />
              <input type="text" placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full border border-[#D4D4D4] pl-9 pr-3 py-2 text-sm outline-none focus:border-[#0A0A0A]" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-[#6B6B6B] border-b border-[#F0EDE8]">
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">Price</th>
                  <th className="text-left p-4">Stock</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE8]">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-[#F8F6F3] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-14 bg-[#F8F6F3] relative overflow-hidden flex-shrink-0">
                          {p.images[0] && <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="48px" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-[#6B6B6B]">/{p.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm capitalize">{p.category}</td>
                    <td className="p-4 text-sm font-medium">{formatPrice(p.price)}</td>
                    <td className="p-4 text-sm">{p.stock}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.visible ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditing(p); setIsNew(false); }} className="text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleVisible(p.id)} className="text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                          {p.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="text-[#6B6B6B] hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
