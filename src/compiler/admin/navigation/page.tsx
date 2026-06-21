'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface NavItem { id:string; label:string; url:string; children?: NavItem[]; }

function NavSidebar() {
  const router = useRouter();
  const navItems = [{href:'/admin/dashboard',label:'Dashboard'},{href:'/admin/products',label:'Products'},{href:'/admin/collections',label:'Collections'},{href:'/admin/navigation',label:'Navigation'},{href:'/admin/pages',label:'Pages'},{href:'/admin/media',label:'Media'},{href:'/admin/settings',label:'Settings'}];
  return (
    <aside className="w-56 min-h-screen bg-[#0A0A0A] text-white flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-[#222]"><h1 className="font-serif text-xl font-semibold">ZARO</h1><p className="text-xs text-[#6B6B6B] mt-0.5">Admin Panel</p></div>
      <nav className="flex-1 py-4">{navItems.map(i=><Link key={i.href} href={i.href} className="flex items-center gap-3 px-6 py-3 text-sm text-[#D4D4D4] hover:text-white hover:bg-[#1A1A1A] transition-colors">{i.label}</Link>)}</nav>
      <div className="p-4 border-t border-[#222]">
        <a href="/" target="_blank" className="block px-2 py-2 text-sm text-[#6B6B6B] hover:text-white">View Site</a>
        <button onClick={async()=>{await fetch('/api/auth',{method:'DELETE'});router.push('/admin/login');}} className="block w-full text-left px-2 py-2 text-sm text-[#6B6B6B] hover:text-white">Logout</button>
      </div>
    </aside>
  );
}

export default function AdminNavigationPage() {
  const [nav, setNav] = useState<{main:NavItem[]}>({main:[]});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(()=>{ fetch('/api/navigation').then(r=>r.json()).then(setNav); },[]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/navigation',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(nav)});
      if (res.ok) { setMsg('Navigation saved!'); setTimeout(()=>setMsg(''),4000); }
    } finally { setSaving(false); }
  };

  const addMainItem = () => setNav(n=>({...n,main:[...n.main,{id:`nav_${Date.now()}`,label:'New Item',url:'/'}]}));
  const removeMainItem = (id:string) => setNav(n=>({...n,main:n.main.filter(i=>i.id!==id)}));
  const updateMainItem = (id:string,field:string,value:string) => setNav(n=>({...n,main:n.main.map(i=>i.id===id?{...i,[field]:value}:i)}));
  const addChild = (parentId:string) => setNav(n=>({...n,main:n.main.map(i=>i.id===parentId?{...i,children:[...(i.children||[]),{id:`nav_${Date.now()}`,label:'Sub Item',url:'/'}]}:i)}));
  const removeChild = (parentId:string,childId:string) => setNav(n=>({...n,main:n.main.map(i=>i.id===parentId?{...i,children:(i.children||[]).filter(c=>c.id!==childId)}:i)}));
  const updateChild = (parentId:string,childId:string,field:string,value:string) => setNav(n=>({...n,main:n.main.map(i=>i.id===parentId?{...i,children:(i.children||[]).map(c=>c.id===childId?{...c,[field]:value}:c)}:i)}));

  return (
    <div className="flex min-h-screen bg-[#F8F6F3]">
      <NavSidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-xl font-semibold">Navigation</h2><p className="text-sm text-[#6B6B6B]">Edit your main menu structure</p></div>
          <div className="flex gap-3">
            <button onClick={addMainItem} className="flex items-center gap-2 text-sm border border-[#D4D4D4] bg-white px-4 py-2 hover:border-[#0A0A0A] transition-colors"><Plus className="w-4 h-4"/>Add Item</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">{saving?'Saving...':'Save Navigation'}</button>
          </div>
        </div>
        {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">{msg}</div>}
        <div className="max-w-2xl space-y-3">
          {nav.main.map(item=>(
            <div key={item.id} className="bg-white rounded shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-[#F0EDE8]">
                <GripVertical className="w-4 h-4 text-[#D4D4D4]"/>
                <input type="text" value={item.label} onChange={e=>updateMainItem(item.id,'label',e.target.value)} placeholder="Label" className="flex-1 border border-[#D4D4D4] px-3 py-1.5 text-sm outline-none focus:border-[#0A0A0A]"/>
                <input type="text" value={item.url} onChange={e=>updateMainItem(item.id,'url',e.target.value)} placeholder="URL" className="flex-1 border border-[#D4D4D4] px-3 py-1.5 text-sm outline-none focus:border-[#0A0A0A]"/>
                <button onClick={()=>addChild(item.id)} className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] border border-dashed border-[#D4D4D4] px-2 py-1 hover:border-[#0A0A0A] transition-colors">+ Sub</button>
                <button onClick={()=>removeMainItem(item.id)} className="text-[#D4D4D4] hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
              {(item.children||[]).map(child=>(
                <div key={child.id} className="flex items-center gap-3 px-4 py-3 pl-10 border-b border-[#F8F6F3] last:border-0 bg-[#FAFAFA]">
                  <span className="text-[#D4D4D4] text-xs">↳</span>
                  <input type="text" value={child.label} onChange={e=>updateChild(item.id,child.id,'label',e.target.value)} placeholder="Label" className="flex-1 border border-[#D4D4D4] px-3 py-1.5 text-sm outline-none focus:border-[#0A0A0A]"/>
                  <input type="text" value={child.url} onChange={e=>updateChild(item.id,child.id,'url',e.target.value)} placeholder="URL" className="flex-1 border border-[#D4D4D4] px-3 py-1.5 text-sm outline-none focus:border-[#0A0A0A]"/>
                  <button onClick={()=>removeChild(item.id,child.id)} className="text-[#D4D4D4] hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
