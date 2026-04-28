'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Upload, ExternalLink, Copy, Check } from 'lucide-react';

function NavSidebar() {
  const router = useRouter();
  const navItems = [{href:'/admin/dashboard',label:'Dashboard'},{href:'/admin/products',label:'Products'},{href:'/admin/collections',label:'Collections'},{href:'/admin/navigation',label:'Navigation'},{href:'/admin/pages',label:'Pages'},{href:'/admin/media',label:'Media'},{href:'/admin/settings',label:'Settings'}];
  return (
    <aside className="w-56 min-h-screen bg-[#0A0A0A] text-white flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-[#222]"><h1 className="font-serif text-xl font-semibold">TruArtz</h1><p className="text-xs text-[#6B6B6B] mt-0.5">Admin Panel</p></div>
      <nav className="flex-1 py-4">{navItems.map(i=><Link key={i.href} href={i.href} className="flex items-center gap-3 px-6 py-3 text-sm text-[#D4D4D4] hover:text-white hover:bg-[#1A1A1A] transition-colors">{i.label}</Link>)}</nav>
      <div className="p-4 border-t border-[#222]">
        <a href="/" target="_blank" className="block px-2 py-2 text-sm text-[#6B6B6B] hover:text-white">View Site</a>
        <button onClick={async()=>{await fetch('/api/auth',{method:'DELETE'});router.push('/admin/login');}} className="block w-full text-left px-2 py-2 text-sm text-[#6B6B6B] hover:text-white">Logout</button>
      </div>
    </aside>
  );
}

const sampleImages = [
  'https://framerusercontent.com/images/PuJISqVxNQeLj8hdU0eVqRd2hY.png',
  'https://framerusercontent.com/images/e0N6XC63RzgwQULQ6zcoGHeDGys.png',
  'https://framerusercontent.com/images/owvNYpDfAEpRrFywrEazwZU1Wk.png',
  'https://framerusercontent.com/images/mRbu6lXFYdwYgUhECkRhvigfmnI.png',
  'https://framerusercontent.com/images/zUicdvLfPfdOmPfVJcctQTJXM4.jpg',
  'https://framerusercontent.com/images/GsJwwgGmmJntyUZ5ucbNJbLQkw.jpg',
];

export default function AdminMediaPage() {
  const [copied, setCopied] = useState<string|null>(null);

  const copy = (url:string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(()=>setCopied(null),2000);
  };

  return (
    <div className="flex min-h-screen bg-[#F8F6F3]">
      <NavSidebar />
      <main className="flex-1 p-8">
        <div className="mb-6"><h2 className="text-xl font-semibold">Media</h2><p className="text-sm text-[#6B6B6B]">Current product and site images in use</p></div>

        <div className="mb-6 p-4 bg-[#FFF9F0] border border-[#F0D4A0] rounded text-sm text-[#8B6914]">
          <strong>To add new images:</strong> Upload to any image host (Cloudinary, Uploadcare, ImgBB, etc.) and paste the URL into a product or collection image field. All images are served via remote URLs.
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sampleImages.map((url,i)=>(
            <div key={i} className="bg-white rounded shadow-sm overflow-hidden group">
              <div className="relative aspect-square bg-[#F8F6F3]">
                <Image src={url} alt={`Image ${i+1}`} fill className="object-cover" sizes="25vw"/>
              </div>
              <div className="p-2 flex items-center justify-between gap-2">
                <p className="text-xs text-[#6B6B6B] truncate flex-1">Image {i+1}</p>
                <div className="flex gap-1">
                  <button onClick={()=>copy(url)} className="text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
                    {copied===url ? <Check className="w-3.5 h-3.5 text-green-500"/> : <Copy className="w-3.5 h-3.5"/>}
                  </button>
                  <a href={url} target="_blank" className="text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"><ExternalLink className="w-3.5 h-3.5"/></a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
