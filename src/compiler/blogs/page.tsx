import Link from 'next/link';
import Image from 'next/image';
import { getBlogs } from '@/lib/data';
export default function BlogsPage() {
  const blogs = getBlogs();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-serif text-4xl font-light mb-10">Fashion Insider</h1>
      <div className="grid md:grid-cols-3 gap-8">
        {blogs.map(blog => (
          <Link key={blog.id} href={`/blogs/${blog.handle}`} className="group">
            <div className="relative aspect-video overflow-hidden bg-[#F8F6F3] mb-4">
              <Image src={blog.image} alt={blog.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" sizes="33vw" />
            </div>
            <p className="text-xs text-[#6B6B6B] mb-2">Posted on {new Date(blog.publishedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</p>
            <h3 className="font-medium hover:underline">{blog.title}</h3>
            <p className="text-sm text-[#6B6B6B] mt-2">{blog.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
