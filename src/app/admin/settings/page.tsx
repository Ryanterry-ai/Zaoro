'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
        <a href="/" target="_blank" className="block px-2 py-2 text-sm text-[#6B6B6B] hover:text-white">View Site</a>
        <button onClick={async()=>{await fetch('/api/auth',{method:'DELETE'});router.push('/admin/login');}} className="block w-full text-left px-2 py-2 text-sm text-[#6B6B6B] hover:text-white">Logout</button>
      </div>
    </aside>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string,unknown>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('general');

  useEffect(()=>{ fetch('/api/settings').then(r=>r.json()).then(setSettings); },[]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)});
      if (res.ok) { setMsg('Settings saved successfully.'); setTimeout(()=>setMsg(''),5000); }
    } finally { setSaving(false); }
  };

  const update = (path: string, value: unknown) => {
    const keys = path.split('.');
    setSettings(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      let cur: Record<string,unknown> = copy;
      for (let i=0;i<keys.length-1;i++) {
        if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') {
          cur[keys[i]] = {};
        }
        cur = cur[keys[i]] as Record<string,unknown>;
      }
      cur[keys[keys.length-1]] = value;
      return copy;
    });
  };

  const ann = (settings.announcementBar || {}) as Record<string,unknown>;
  const social = (settings.socialLinks || {}) as Record<string,string>;
  const seo = (settings.seo || {}) as Record<string,unknown>;

  const tabs = ['general','announcement','social','seo','homepage'];

  return (
    <div className="flex min-h-screen bg-[#F8F6F3]">
      <NavSidebar />
      <main className="flex-1 p-8">
        <div className="mb-6"><h2 className="text-xl font-semibold">Settings</h2><p className="text-sm text-[#6B6B6B]">Manage your store configuration</p></div>
        {msg && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">{msg}</div>}

        <div className="flex gap-1 mb-6">
          {tabs.map(t=><button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm capitalize font-medium border transition-colors ${tab===t?'bg-[#0A0A0A] text-white border-[#0A0A0A]':'bg-white text-[#6B6B6B] border-[#D4D4D4] hover:border-[#0A0A0A]'}`}>{t}</button>)}
        </div>

        <div className="max-w-2xl bg-white p-6 rounded shadow-sm space-y-4">
          {tab==='general' && <>
            {[
              {label:'Site Name',path:'siteName'},{label:'Tagline',path:'tagline'},
              {label:'Description',path:'description'},{label:'Contact Email',path:'contactEmail'},
              {label:'Contact Phone',path:'contactPhone'},{label:'Address',path:'address'},
              {label:'Footer Tagline',path:'footerTagline'},
            ].map(f=>(
              <div key={f.path}>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{f.label}</label>
                <input type="text" value={settings[f.path] as string||''} onChange={e=>update(f.path,e.target.value)} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]"/>
              </div>
            ))}
          </>}

          {tab==='announcement' && <>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#6B6B6B]">Enabled</label>
              <button onClick={()=>update('announcementBar.enabled',!ann.enabled)} className={`w-10 h-5 rounded-full transition-colors ${ann.enabled?'bg-[#0A0A0A]':'bg-[#D4D4D4]'} relative`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${ann.enabled?'translate-x-5':'translate-x-0.5'}`}/>
              </button>
            </div>
            {[{label:'Text',path:'announcementBar.text'},{label:'Link Text',path:'announcementBar.linkText'},{label:'Link URL',path:'announcementBar.linkUrl'},{label:'BG Color',path:'announcementBar.bgColor'},{label:'Text Color',path:'announcementBar.textColor'}].map(f=>(
              <div key={f.path}>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{f.label}</label>
                <input type="text" value={f.path.split('.').reduce((o,k)=>(o as Record<string,unknown>)[k],settings) as string||''} onChange={e=>update(f.path,e.target.value)} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]"/>
              </div>
            ))}
          </>}

          {tab==='social' && <>
            {['instagram','facebook','twitter'].map(s=>(
              <div key={s}>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1 capitalize">{s} URL</label>
                <input type="text" value={social[s]||''} onChange={e=>update(`socialLinks.${s}`,e.target.value)} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]"/>
              </div>
            ))}
          </>}

          {tab==='seo' && <>
            {[{label:'SEO Title',path:'seo.title'},{label:'SEO Description',path:'seo.description'}].map(f=>(
              <div key={f.path}>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{f.label}</label>
                <input type="text" value={f.path.split('.').reduce((o,k)=>(o as Record<string,unknown>)[k],settings) as string||''} onChange={e=>update(f.path,e.target.value)} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]"/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-[#6B6B6B] mb-1">Keywords (comma-separated)</label>
              <input type="text" value={(seo.keywords as string[]||[]).join(', ')} onChange={e=>update('seo.keywords',e.target.value.split(',').map(k=>k.trim()).filter(Boolean))} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]"/>
            </div>
          </>}

          {tab==='homepage' && <>
            {[
              {label:'Trending Title',path:'homeContent.trendingTitle'},
              {label:'Trending CTA Label',path:'homeContent.trendingViewAllLabel'},
              {label:'Trending CTA URL',path:'homeContent.trendingViewAllUrl'},
              {label:'Featured Collections Title',path:'homeContent.featuredCollectionsTitle'},
              {label:'Featured Collections Subtitle',path:'homeContent.featuredCollectionsSubtitle'},
              {label:'Featured Collections CTA Label',path:'homeContent.featuredCollectionsCtaLabel'},
              {label:'Featured Collections CTA URL',path:'homeContent.featuredCollectionsCtaUrl'},
              {label:'Fashion Insider Title',path:'homeContent.fashionInsiderTitle'},
              {label:'Fashion Insider CTA Label',path:'homeContent.fashionInsiderViewAllLabel'},
              {label:'Fashion Insider CTA URL',path:'homeContent.fashionInsiderViewAllUrl'},
              {label:'Offer Badge Text',path:'homeContent.saleBannerBadgeText'},
              {label:'Offer Heading',path:'homeContent.saleBannerHeading'},
              {label:'Offer Body Text',path:'homeContent.saleBannerBody'},
              {label:'Offer Promo Line',path:'homeContent.saleBannerPromoText'},
              {label:'Offer CTA Label',path:'homeContent.saleBannerCtaLabel'},
              {label:'Offer CTA URL',path:'homeContent.saleBannerCtaUrl'},
            ].map(f=>(
              <div key={f.path}>
                <label className="block text-xs font-medium text-[#6B6B6B] mb-1">{f.label}</label>
                <input type="text" value={f.path.split('.').reduce((o,k)=>(o as Record<string,unknown>)?.[k],settings) as string||''} onChange={e=>update(f.path,e.target.value)} className="w-full border border-[#D4D4D4] px-3 py-2 text-sm outline-none focus:border-[#0A0A0A]"/>
              </div>
            ))}
            <p className="text-xs text-[#6B6B6B]">
              Edit homepage section headings, CTA labels/links, and offer block copy from here.
            </p>
          </>}

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full">{saving?'Saving...':'Save Settings'}</button>
        </div>
      </main>
    </div>
  );
}
