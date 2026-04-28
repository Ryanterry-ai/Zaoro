'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';

interface Collection { id:string; handle:string; name:string; description:string; image:string; products:string[]; visible:boolean; }

function NavSidebar() {
  const router = useRouter();
  const navItems = [
    {href:'/admin/dashboard',label:'Dashboard'},{href:'/admin/products',label:'Products'},
    {href:'/admin/collections',label:'Collections'},{href:'/admin/navigation',label:'Navigation'},
    {href:'/admin/pages',label:'Pages'},{href:'/admin/media',label:'Media'},{href:'/admin/settings',label:'Settings'},
  ];
  return (
    <aside className="w-56 min-h-screen bg-[#0A0A0A] text-white flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-[#222]"><h1 className="font-serif text-xl font-semibold">ZARO</h1><p className="text-xs text-[#6B6B6B] mt-0.5">Admin Panel</p></div>
      <nav className="flex-1 py-4">{navItems.map(i=><Link key={i.href} href={i.href} className="flex items-center gap-3 px-6 py-3 text-sm text-[#D4D4D4] hover:text-white hover:bg-[#1A1A1A] transition-colors">{i.label}</Link>)}</nav>
      <div className="p-4 border-t border-[#222]">
        <a href="/" target="_blank" className="block px-2 py-2 text-sm text-[#6B6B6B] hover:text-white transition-colors">View Site</a>
        <button onClick={async()=>{await fetch('/api/auth',{method:'DELETE'});router.push('/admin/login');}} className="block w-full text-left px-2 py-2 text-sm text-[#6B6B6B] hover:text-white transition-colors">Logout</button>
      </div>
    </aside>
  );
}

const empty: Collection = { id:'', handle:'', name:'', description:'', image:'', products:[], visible:true };

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [editing, setEditing] = useState<Collection|null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(()=>{ fetch('/api/collections').then(r=>r.json()).then(setCollections); },[]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = isNew ? [...collections, editing] : collections.map(c=>c.id===editing.id?editing:c);
      const res = await fetch('/api/collections',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)});
      if (res.ok) { setCollections(updated); setEditing(null); setIsNew(false); setMsg('Saved!'); setTimeout(()=>setMsg(''),4000); }
    } finally { setSaving(false); }
  };

  const handleDelete = (id:string) => {
    if (!confirm('Delete this collection?')) return;
    const updated = collections.filter(c=>c.id!==id);
    setCollections(updated);
    fetch('/api/collections',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)});
  };

  if (editing) return (
    <div className="flex min-h-screen bg-[#F8F6F3]">
      <NavSidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={()=>{setEditing(null);setIsNew(false);}} className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#0A0A0A]"><ArrowLeft className="w-4 h-4"/>Back</button>
          <h2 className="text-xl font-semibold">{isNew?'New Collection':editing.name}</h2>
        </div>
        <div className="max-w-2xl bg-white p-6 rounded shadow-sm space-y-4">
          {[{label:'Name',key:'name'},{label:'Handle',key:'handle'},{label:'Description',key:'description'},{label:'Image URL',key:'image'}].map(f=>(
            <div key={f.key}>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{f.label}</label>
              <input type="text" value={(editing as Record<string,unknown>)[f.key] as string||''} onChange={e=>setEditing({...editing,[f.key]:e.target.value})} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]"/>
            </div>
          ))}
          {editing.image && (
            <div className="relative w-full h-40 overflow-hidden bg-[#F8F6F3]">
              <Image src={editing.image} alt="Preview" fill className="object-cover" sizes="100%" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#6B6B6B]">Visible</label>
            <button onClick={()=>setEditing({...editing,visible:!editing.visible})} className={`w-10 h-5 rounded-full transition-colors ${editing.visible?'bg-[#0A0A0A]':'bg-[#D4D4D4]'} relative`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editing.visible?'translate-x-5':'translate-x-0.5'}`}/>
            </button>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">{saving?'Saving...':'Save Collection'}</button>
          {msg && <p className="text-xs text-green-600 text-center">{msg}</p>}
        </div>
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8F6F3]">
      <NavSidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-xl font-semibold">Collections</h2><p className="text-sm text-[#6B6B6B]">{collections.length} collections</p></div>
          <button onClick={()=>{setEditing({...empty,id:`col_${Date.now()}`});setIsNew(true);}} className="btn-primary flex items-center gap-2 text-xs"><Plus className="w-4 h-4"/>Add Collection</button>
        </div>
        {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">{msg}</div>}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map(c=>(
            <div key={c.id} className="bg-white rounded shadow-sm overflow-hidden">
              <div className="relative h-40 bg-[#F8F6F3]">
                {c.image && <Image src={c.image} alt={c.name} fill className="object-cover" sizes="33vw"/>}
                {!c.visible && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white text-xs bg-black/60 px-2 py-1 rounded">Hidden</span></div>}
              </div>
              <div className="p-4">
                <h3 className="font-medium">{c.name}</h3>
                <p className="text-xs text-[#6B6B6B] mt-1 line-clamp-2">{c.description}</p>
                <p className="text-xs text-[#6B6B6B] mt-1">{c.products.length} products</p>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={()=>{setEditing(c);setIsNew(false);}} className="flex items-center gap-1 text-xs text-[#6B6B6B] hover:text-[#0A0A0A]"><Pencil className="w-3 h-3"/>Edit</button>
                  <button onClick={()=>handleDelete(c.id)} className="flex items-center gap-1 text-xs text-[#6B6B6B] hover:text-red-500"><Trash2 className="w-3 h-3"/>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
