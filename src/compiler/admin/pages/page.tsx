'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

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

const pages = [
  { name:'Homepage', path:'/', desc:'Hero slider, trending, collections, bestsellers, blog sections' },
  { name:'Shop / All Products', path:'/products', desc:'Full product catalogue listing' },
  { name:'About', path:'/about', desc:'Brand story and values' },
  { name:'Contact', path:'/contact-us', desc:'Contact form' },
  { name:'FAQ', path:'/faq', desc:'Frequently asked questions' },
  { name:'Blog', path:'/blogs', desc:'Fashion insider articles' },
  { name:'Privacy Policy', path:'/general/privacy-policy', desc:'Legal privacy policy' },
  { name:'Refund Policy', path:'/general/refund-policy', desc:'Returns & refund terms' },
  { name:'Shipping Policy', path:'/general/shipping-policy', desc:'Delivery information' },
];

export default function AdminPagesPage() {
  return (
    <div className="flex min-h-screen bg-[#F8F6F3]">
      <NavSidebar />
      <main className="flex-1 p-8">
        <div className="mb-6"><h2 className="text-xl font-semibold">Pages</h2><p className="text-sm text-[#6B6B6B]">View and preview all pages in your store</p></div>
        <div className="bg-white rounded shadow-sm divide-y divide-[#F0EDE8]">
          {pages.map(p=>(
            <div key={p.path} className="flex items-center justify-between p-4 hover:bg-[#FAFAFA] transition-colors">
              <div>
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5">{p.desc}</p>
                <p className="text-xs text-[#C8A882] mt-0.5 font-mono">{p.path}</p>
              </div>
              <a href={p.path} target="_blank" className="flex items-center gap-1 text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors border border-[#D4D4D4] px-3 py-1.5 hover:border-[#0A0A0A]">
                <ExternalLink className="w-3 h-3"/>Preview
              </a>
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-[#FFF9F0] border border-[#F0D4A0] rounded text-sm text-[#8B6914]">
          <strong>Tip:</strong> To edit homepage sections (hero text, images, slide content), edit the section files in <code className="bg-[#F0D4A0]/50 px-1 rounded">src/components/sections/</code>. Policy pages can be edited in <code className="bg-[#F0D4A0]/50 px-1 rounded">src/app/general/</code>.
        </div>
      </main>
    </div>
  );
}
