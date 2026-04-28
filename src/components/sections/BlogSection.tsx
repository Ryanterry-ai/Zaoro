import Link from 'next/link';
import Image from 'next/image';
import { getBlogs } from '@/lib/data';

export function BlogSection() {
  const blogs = getBlogs().slice(0, 3);
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      <div className="flex items-end justify-between mb-10">
        <h2 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A]">Fashion Insider</h2>
        <Link href="/blogs" className="text-sm font-medium tracking-wide underline underline-offset-4 text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
          View All
        </Link>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {blogs.map(blog => (
          <Link key={blog.id} href={`/blogs/${blog.handle}`} className="group">
            <div className="relative aspect-video overflow-hidden bg-[#F8F6F3] mb-4">
              <Image
                src={blog.image}
                alt={blog.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <p className="text-xs text-[#6B6B6B] mb-2">
              Posted on {new Date(blog.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <h3 className="font-medium text-[#0A0A0A] hover:underline text-base leading-snug">
              {blog.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
