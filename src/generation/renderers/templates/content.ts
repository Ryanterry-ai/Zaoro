/**
 * Content/Marketing Component Templates
 *
 * Production-quality component templates for content and marketing sites.
 */

export const CONTENT_TEMPLATES = {
  /**
   * Hero component with title, subtitle, badge, CTA buttons
   */
  Hero: () => `'use client';

import { motion } from 'framer-motion';

interface HeroAction {
  label: string;
  action: string;
  style?: 'primary' | 'secondary' | 'ghost';
}

interface HeroProps {
  title: string;
  subtitle: string;
  badge?: string;
  actions?: HeroAction[];
  image?: string;
}

export default function Hero({ title, subtitle, badge, actions, image }: HeroProps) {
  return (
    <section className="relative min-h-[80vh] flex items-center bg-card text-white overflow-hidden">
      {image && <div className="absolute inset-0"><img src={image} alt="" className="w-full h-full object-cover opacity-40" /></div>}
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-900/80 to-transparent" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          {badge && <span className="inline-block bg-indigo-600/20 text-indigo-400 px-4 py-2 rounded-full text-sm font-bold mb-6">{badge}</span>}
          <h1 className="font-display font-bold text-4xl md:text-6xl mb-6 max-w-3xl">{title}</h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl">{subtitle}</p>
          <div className="flex flex-wrap gap-4">
            {actions?.map((action, i) => (
              <a key={i} href={action.action} className={\`px-6 py-3 rounded-xl font-bold transition-colors \${
                action.style === 'primary' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' :
                action.style === 'secondary' ? 'bg-white/10 hover:bg-white/20 text-white' :
                'border border-white/30 hover:bg-white/10 text-white'
              }\`}>
                {action.label}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}`,

  /**
   * BlogCard component with image, date, read time, category
   */
  BlogCard: () => `'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

interface BlogCardProps {
  title: string;
  excerpt: string;
  image?: string;
  date: string;
  readTime: string;
  category?: string;
  slug: string;
}

export default function BlogCard({ title, excerpt, image, date, readTime, category, slug }: BlogCardProps) {
  return (
    <motion.article whileHover={{ y: -4 }} className="bg-white rounded-2xl overflow-hidden border border-neutral-100 hover:shadow-lg transition-shadow">
      {image && <img src={image} alt={title} className="w-full h-48 object-cover" />}
      <div className="p-6">
        {category && <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{category}</span>}
        <h3 className="font-display font-bold text-xl mt-2 mb-3 line-clamp-2 hover:text-indigo-600 cursor-pointer transition-colors">{title}</h3>
        <p className="text-muted-foreground text-sm line-clamp-3 mb-4">{excerpt}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar size={12} /> {date}</span>
          <span className="flex items-center gap-1"><Clock size={12} /> {readTime}</span>
        </div>
        <a href={\`/blog/\${slug}\`} className="mt-4 inline-flex items-center gap-1 text-indigo-600 font-bold text-sm hover:gap-2 transition-all">
          Read More <ArrowRight size={14} />
        </a>
      </div>
    </motion.article>
  );
}`,

  /**
   * Testimonial component with avatar, quote, rating
   */
  Testimonial: () => `'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

interface TestimonialProps {
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar?: string;
}

export default function Testimonial({ name, role, content, rating, avatar }: TestimonialProps) {
  return (
    <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
      <Quote size={24} className="text-indigo-600/30 mb-4" />
      <p className="text-muted-foreground mb-4 italic">"{content}"</p>
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} className={i < rating ? 'fill-amber-500 text-amber-500' : 'text-neutral-200'} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        {avatar ? <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">{name[0]}</div>}
        <div>
          <p className="font-bold text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}`,

  /**
   * CTASection component with title, subtitle, actions
   */
  CTASection: () => `'use client';

import { motion } from 'framer-motion';

interface CTAAction {
  label: string;
  action: string;
  style?: 'primary' | 'secondary';
}

interface CTASectionProps {
  title: string;
  subtitle: string;
  actions?: CTAAction[];
  background?: 'dark' | 'gradient' | 'light';
}

export default function CTASection({ title, subtitle, actions, background = 'dark' }: CTASectionProps) {
  const bgClasses = {
    dark: 'bg-card text-white',
    gradient: 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white',
    light: 'bg-neutral-50 text-neutral-900'
  };

  return (
    <section className={\`py-20 \${bgClasses[background]}\`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-display font-bold text-3xl md:text-4xl mb-4">{title}</h2>
          <p className={\`text-lg mb-8 \${background === 'light' ? 'text-muted-foreground' : 'opacity-90'}\`}>{subtitle}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {actions?.map((action, i) => (
              <a key={i} href={action.action} className={\`px-6 py-3 rounded-xl font-bold transition-colors \${
                action.style === 'primary'
                  ? (background === 'light' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white hover:bg-neutral-100 text-neutral-900')
                  : 'border border-current hover:bg-white/10'
              }\`}>
                {action.label}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}`,

  /**
   * FAQ component with accordion
   */
  FAQ: () => `'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  title: string;
  subtitle?: string;
  items: FAQItem[];
}

export default function FAQ({ title, subtitle, items }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl md:text-4xl mb-4">{title}</h2>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors">
                <span className="font-medium">{item.question}</span>
                <ChevronDown size={18} className={\`transition-transform \${openIndex === i ? 'rotate-180' : ''}\`} />
              </button>
              {openIndex === i && (
                <div className="p-4 pt-0 text-muted-foreground text-sm">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,

  /**
   * Newsletter component with email input
   */
  Newsletter: () => `'use client';

import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

interface NewsletterProps {
  title: string;
  subtitle?: string;
}

export default function Newsletter({ title, subtitle }: NewsletterProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (email) {
      setSubmitted(true);
      setEmail('');
    }
  };

  return (
    <section className="py-16 bg-indigo-600 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display font-bold text-2xl md:text-3xl mb-4">{title}</h2>
        {subtitle && <p className="text-indigo-100 mb-6">{subtitle}</p>}
        {submitted ? (
          <div className="flex items-center justify-center gap-2 text-lg">
            <CheckCircle size={24} />
            <span>Thank you for subscribing!</span>
          </div>
        ) : (
          <div className="flex gap-2 max-w-md mx-auto">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="flex-grow px-4 py-3 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-white/50" />
            <button onClick={handleSubmit} className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-neutral-100 transition-colors flex items-center gap-2">
              <Send size={16} /> Subscribe
            </button>
          </div>
        )}
      </div>
    </section>
  );
}`
};

export default CONTENT_TEMPLATES;
