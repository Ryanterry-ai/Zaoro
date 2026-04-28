import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getBlogByHandle } from '@/lib/data-server';
interface Props { params: { handle: string } }

export default async function BlogDetailPage({ params }: Props) {
  const blog = await getBlogByHandle(params.handle);
  if (!blog) notFound();
  return (
    <article className="max-w-3xl mx-auto px-4 py-16">
      <p className="text-xs tracking-widest uppercase text-[#6B6B6B] mb-3">Posted on {new Date(blog.publishedAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>
      <h1 className="font-serif text-4xl font-light mb-6">{blog.title}</h1>
      <div className="relative aspect-video mb-8 overflow-hidden">
        <Image src={blog.image} alt={blog.title} fill className="object-cover" sizes="100vw" />
      </div>
      <p className="text-[#6B6B6B] leading-relaxed">{blog.content}</p>
    </article>
  );
}
