export interface AtomicPrimitive {
  name: string;
  category: 'layout' | 'ui' | 'input' | 'navigation' | 'data-display' | 'feedback' | 'ecommerce' | 'booking' | 'content' | 'media' | 'dashboard' | 'crm' | 'kanban' | 'subscription';
  description: string;
  props: string[];
  tailwindVariants: Record<string, string>;
  exampleCode: string;
  composeWith: string[];
}

export const ATOMIC_PRIMITIVES: AtomicPrimitive[] = [
  // ─── Layout ────────────────────────────────────────────────────
  {
    name: 'Container',
    category: 'layout',
    description: 'Responsive max-width container with padding',
    props: ['maxWidth', 'padding', 'center'],
    tailwindVariants: {
      sm: 'max-w-sm mx-auto px-4',
      md: 'max-w-md mx-auto px-4',
      lg: 'max-w-5xl mx-auto px-6',
      xl: 'max-w-7xl mx-auto px-6',
      full: 'w-full px-6',
    },
    exampleCode: `<div className="max-w-7xl mx-auto px-6">{children}</div>`,
    composeWith: ['Grid', 'Stack', 'Section'],
  },
  {
    name: 'Grid',
    category: 'layout',
    description: 'Responsive CSS grid with configurable columns',
    props: ['columns', 'gap', 'responsive'],
    tailwindVariants: {
      '2col': 'grid grid-cols-1 sm:grid-cols-2 gap-6',
      '3col': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
      '4col': 'grid grid-cols-2 md:grid-cols-4 gap-4',
      'auto': 'grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6',
    },
    exampleCode: `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{items.map(i => <Card key={i.id} {...i} />)}</div>`,
    composeWith: ['Card', 'Container'],
  },
  {
    name: 'Stack',
    category: 'layout',
    description: 'Vertical/horizontal flex stack with spacing',
    props: ['direction', 'gap', 'align', 'justify'],
    tailwindVariants: {
      'vertical': 'flex flex-col gap-4',
      'horizontal': 'flex items-center gap-4',
      'between': 'flex items-center justify-between',
      'center': 'flex flex-col items-center text-center',
      'wrap': 'flex flex-wrap gap-3',
    },
    exampleCode: `<div className="flex flex-col gap-4">{children}</div>`,
    composeWith: ['Container', 'Card'],
  },
  {
    name: 'Section',
    category: 'layout',
    description: 'Full-width section with vertical padding',
    props: ['padding', 'background'],
    tailwindVariants: {
      default: 'py-16 px-6',
      large: 'py-24 px-6',
      small: 'py-8 px-6',
      tinted: 'py-16 px-6 bg-zinc-900/50',
      card: 'py-12 px-6',
    },
    exampleCode: `<section className="py-16 px-6"><div className="max-w-7xl mx-auto">{children}</div></section>`,
    composeWith: ['Container', 'Grid', 'Stack'],
  },

  // ─── UI ────────────────────────────────────────────────────────
  {
    name: 'Button',
    category: 'ui',
    description: 'Styled button with variants and states',
    props: ['variant', 'size', 'icon', 'disabled', 'loading', 'onClick'],
    tailwindVariants: {
      primary: 'px-6 py-3 rounded-xl font-bold transition-all bg-violet-600 hover:bg-violet-700 text-white',
      secondary: 'px-6 py-3 rounded-xl font-bold transition-all border border-zinc-700 hover:border-zinc-500',
      ghost: 'px-4 py-2 rounded-lg text-sm font-bold transition hover:bg-zinc-800',
      danger: 'px-6 py-3 rounded-xl font-bold transition-all bg-red-600 hover:bg-red-700 text-white',
      success: 'px-6 py-3 rounded-xl font-bold transition-all bg-emerald-600 hover:bg-emerald-700 text-white',
      sm: 'px-4 py-2 rounded-lg text-sm font-bold',
      lg: 'px-8 py-4 rounded-xl font-bold text-lg',
      icon: 'w-10 h-10 rounded-xl flex items-center justify-center',
    },
    exampleCode: `<button className="px-6 py-3 rounded-xl font-bold transition-all bg-violet-600 hover:bg-violet-700 text-white">Click me</button>`,
    composeWith: ['Icon', 'Spinner'],
  },
  {
    name: 'Card',
    category: 'ui',
    description: 'Versatile content card container',
    props: ['variant', 'hover', 'padding', 'onClick'],
    tailwindVariants: {
      default: 'bg-zinc-900 border border-zinc-800 rounded-2xl p-6',
      interactive: 'bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition cursor-pointer',
      highlighted: 'bg-zinc-900 border border-violet-500/30 ring-1 ring-violet-500/20 rounded-2xl p-6',
      compact: 'bg-zinc-900 border border-zinc-800 rounded-xl p-4',
      flat: 'bg-zinc-900/50 rounded-2xl p-6',
      image: 'bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden',
    },
    exampleCode: `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition cursor-pointer">{children}</div>`,
    composeWith: ['Button', 'Badge', 'Stack'],
  },
  {
    name: 'Badge',
    category: 'ui',
    description: 'Small label/tag for status or categorization',
    props: ['variant', 'size'],
    tailwindVariants: {
      default: 'px-3 py-1 rounded-full text-xs font-bold',
      outline: 'px-3 py-1 rounded-full text-xs font-bold border',
      dot: 'px-2 py-0.5 rounded-full text-[10px] font-bold',
      tag: 'px-2 py-0.5 rounded-lg text-[10px] font-bold',
    },
    exampleCode: `<span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">New</span>`,
    composeWith: ['Stack'],
  },
  {
    name: 'Avatar',
    category: 'ui',
    description: 'User avatar with fallback initials',
    props: ['name', 'size', 'image'],
    tailwindVariants: {
      sm: 'w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold',
      md: 'w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold',
      lg: 'w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold',
    },
    exampleCode: `<div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold">JD</div>`,
    composeWith: ['Stack'],
  },
  {
    name: 'Icon',
    category: 'ui',
    description: 'Lucide icon wrapper',
    props: ['name', 'size', 'className'],
    tailwindVariants: {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-8 h-8',
    },
    exampleCode: `<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>`,
    composeWith: ['Button'],
  },
  {
    name: 'StatCard',
    category: 'ui',
    description: 'Statistics display card',
    props: ['value', 'label', 'trend', 'color'],
    tailwindVariants: {
      default: 'text-center bg-zinc-900 border border-zinc-800 rounded-xl p-4',
      highlighted: 'text-center bg-zinc-900 border border-zinc-800 rounded-xl p-4',
    },
    exampleCode: `<div className="text-center bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="text-2xl font-black text-violet-400">2,847</div><div className="text-xs text-zinc-500">Active Users</div></div>`,
    composeWith: ['Grid', 'Container'],
  },

  // ─── Input ─────────────────────────────────────────────────────
  {
    name: 'InputField',
    category: 'input',
    description: 'Text input with label and validation',
    props: ['label', 'placeholder', 'type', 'value', 'onChange', 'error'],
    tailwindVariants: {
      default: 'w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-violet-500',
      search: 'w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:outline-none focus:border-violet-500',
    },
    exampleCode: `<input type="text" placeholder="Full Name" className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-violet-500" />`,
    composeWith: ['Label', 'ErrorMessage', 'Stack'],
  },
  {
    name: 'Textarea',
    category: 'input',
    description: 'Multi-line text input',
    props: ['label', 'placeholder', 'rows', 'value', 'onChange'],
    tailwindVariants: {
      default: 'w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-violet-500 resize-none',
    },
    exampleCode: `<textarea placeholder="Tell us about your project..." rows={4} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-violet-500 resize-none" />`,
    composeWith: ['Label', 'Stack'],
  },
  {
    name: 'Select',
    category: 'input',
    description: 'Dropdown select with options',
    props: ['label', 'options', 'value', 'onChange'],
    tailwindVariants: {
      default: 'px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-violet-500',
    },
    exampleCode: `<select className="px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm"><option>Option 1</option></select>`,
    composeWith: ['Label', 'Stack'],
  },
  {
    name: 'ChipGroup',
    category: 'input',
    description: 'Horizontal scrollable chip/button selector',
    props: ['options', 'selected', 'onSelect', 'color'],
    tailwindVariants: {
      default: 'flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1',
      wrap: 'flex flex-wrap gap-2',
    },
    exampleCode: `<div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">{options.map(o => <button key={o} className="px-3 py-1.5 rounded-lg text-xs font-bold">{o}</button>)}</div>`,
    composeWith: ['Button', 'Stack'],
  },

  // ─── Navigation ────────────────────────────────────────────────
  {
    name: 'Navbar',
    category: 'navigation',
    description: 'Fixed top navigation bar with logo, links, and CTA',
    props: ['logo', 'links', 'cta', 'onCtaClick'],
    tailwindVariants: {
      default: 'fixed top-0 w-full z-50 backdrop-blur-md border-b border-zinc-800 bg-zinc-950/80',
      transparent: 'fixed top-0 w-full z-50',
    },
    exampleCode: `<nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-zinc-800 bg-zinc-950/80"><div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-black text-sm">A</div><span className="font-black text-lg">AppName</span></div><div className="hidden md:flex items-center gap-8 text-sm text-zinc-400"><span className="text-white cursor-pointer">Home</span><span className="hover:text-white cursor-pointer transition">About</span></div><button className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-bold transition">Get Started</button></div></nav>`,
    composeWith: ['Button', 'MobileMenu'],
  },
  {
    name: 'Footer',
    category: 'navigation',
    description: 'Page footer with links, social, and copyright',
    props: ['links', 'social', 'copyright'],
    tailwindVariants: {
      default: 'border-t border-zinc-800 py-12 px-6 text-center text-sm text-zinc-600',
      minimal: 'py-8 px-6 text-center text-xs text-zinc-700',
    },
    exampleCode: `<footer className="border-t border-zinc-800 py-12 px-6 text-center text-sm text-zinc-600"><p>© 2026 AppName. All rights reserved.</p></footer>`,
    composeWith: ['Container'],
  },
  {
    name: 'TabBar',
    category: 'navigation',
    description: 'Horizontal tab navigation for sections',
    props: ['tabs', 'active', 'onSelect', 'color'],
    tailwindVariants: {
      default: 'flex justify-center gap-2 mb-10 flex-wrap',
      pills: 'flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1',
    },
    exampleCode: `<div className="flex justify-center gap-2 mb-10 flex-wrap">{tabs.map(t => <button key={t} className="px-5 py-2 rounded-full text-sm font-bold capitalize transition bg-zinc-800 text-zinc-400 hover:text-white">{t}</button>)}</div>`,
    composeWith: ['Button', 'Stack'],
  },

  // ─── Data Display ──────────────────────────────────────────────
  {
    name: 'DataTable',
    category: 'data-display',
    description: 'Structured data table with headers and rows',
    props: ['columns', 'rows', 'striped'],
    tailwindVariants: {
      default: 'w-full text-sm',
      bordered: 'w-full text-sm border border-zinc-800 rounded-xl overflow-hidden',
    },
    exampleCode: `<table className="w-full text-sm"><thead><tr className="border-b border-zinc-800"><th className="text-left py-3 px-4 font-bold">Name</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b border-zinc-800 last:border-0"><td className="py-3 px-4">{r.name}</td></tr>)}</tbody></table>`,
    composeWith: ['Card', 'Container'],
  },
  {
    name: 'PriceTag',
    category: 'data-display',
    description: 'Styled price display',
    props: ['price', 'original', 'currency', 'size'],
    tailwindVariants: {
      default: 'text-xl font-black',
      large: 'text-3xl font-black',
      small: 'text-sm font-bold',
      strikethrough: 'text-sm text-zinc-500 line-through',
    },
    exampleCode: `<span className="text-xl font-black text-violet-400">$99</span>`,
    composeWith: ['Stack'],
  },
  {
    name: 'StarRating',
    category: 'data-display',
    description: 'Star rating display with count',
    props: ['rating', 'count', 'size'],
    tailwindVariants: {
      default: 'flex items-center gap-1 text-sm',
      large: 'flex items-center gap-2 text-base',
    },
    exampleCode: `<div className="flex items-center gap-1"><span className="text-amber-400">★★★★★</span><span className="text-sm text-zinc-500">(4.8 · 234 reviews)</span></div>`,
    composeWith: ['Stack'],
  },
  {
    name: 'Timeline',
    category: 'data-display',
    description: 'Vertical timeline with items',
    props: ['items'],
    tailwindVariants: {
      default: 'relative pl-8',
    },
    exampleCode: `<div className="relative pl-8"><div className="absolute left-3 top-2 bottom-0 w-px bg-zinc-800" /><div className="relative mb-8"><div className="absolute -left-5 w-3 h-3 rounded-full bg-violet-500" /><h3 className="font-bold">Step 1</h3><p className="text-sm text-zinc-400">Description</p></div></div>`,
    composeWith: ['Stack'],
  },

  // ─── Feedback ──────────────────────────────────────────────────
  {
    name: 'Modal',
    category: 'feedback',
    description: 'Full-screen overlay modal dialog',
    props: ['title', 'description', 'onClose'],
    tailwindVariants: {
      default: 'fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4',
    },
    exampleCode: `<div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}><div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-8" onClick={e => e.stopPropagation()}>{children}</div></div>`,
    composeWith: ['Button', 'Stack'],
  },
  {
    name: 'Toast',
    category: 'feedback',
    description: 'Notification toast/banner',
    props: ['message', 'type', 'onDismiss'],
    tailwindVariants: {
      success: 'flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold',
      error: 'flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold',
      info: 'flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold',
    },
    exampleCode: `<div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold">✓ Success!</div>`,
    composeWith: ['Icon'],
  },
  {
    name: 'EmptyState',
    category: 'feedback',
    description: 'Empty state placeholder',
    props: ['icon', 'title', 'description', 'action'],
    tailwindVariants: {
      default: 'text-center py-12 text-zinc-500',
    },
    exampleCode: `<div className="text-center py-12"><div className="text-4xl mb-4">📦</div><h3 className="font-bold mb-2">No items yet</h3><p className="text-sm text-zinc-500">Create your first item to get started.</p></div>`,
    composeWith: ['Button', 'Stack'],
  },

  // ─── E-commerce ────────────────────────────────────────────────
  {
    name: 'ProductCard',
    category: 'ecommerce',
    description: 'Product display card with image, info, and add-to-cart',
    props: ['product', 'onAddToCart', 'onView'],
    tailwindVariants: {
      default: 'bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition group cursor-pointer',
      compact: 'bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition',
    },
    exampleCode: `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition group cursor-pointer"><div className="h-48 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-6xl group-hover:scale-105 transition">👟</div><div className="p-5"><h3 className="font-bold text-lg">Product Name</h3><p className="text-xl font-black mt-2">$99</p><button className="w-full mt-3 py-2 rounded-lg bg-zinc-800 hover:bg-violet-600 text-sm font-bold transition">Add to Cart</button></div></div>`,
    composeWith: ['Button', 'Badge', 'StarRating', 'PriceTag'],
  },
  {
    name: 'CartDrawer',
    category: 'ecommerce',
    description: 'Slide-out cart with items list and total',
    props: ['items', 'total', 'onRemove', 'onCheckout'],
    tailwindVariants: {
      default: 'fixed right-0 top-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 z-50 p-6',
    },
    exampleCode: '<div className="fixed right-0 top-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 z-50 p-6"><h2 className="font-black text-xl mb-6">Cart ({count})</h2>{items.map(item => <div key={item.id} className="flex items-center justify-between py-3 border-b border-zinc-800"><span>{item.name}</span><span className="font-bold">{item.price}</span></div>)}<div className="mt-6 font-black text-lg">Total: {total}</div></div>',
    composeWith: ['Button', 'Stack', 'PriceTag'],
  },
  {
    name: 'FilterBar',
    category: 'ecommerce',
    description: 'Horizontal filter bar with category chips',
    props: ['categories', 'selected', 'onSelect'],
    tailwindVariants: {
      default: 'flex flex-wrap items-center gap-3',
    },
    exampleCode: `<div className="flex flex-wrap items-center gap-3"><div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">{categories.map(c => <button key={c} className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize">{c}</button>)}</div></div>`,
    composeWith: ['ChipGroup', 'InputField'],
  },

  // ─── Booking ───────────────────────────────────────────────────
  {
    name: 'BookingForm',
    category: 'booking',
    description: 'Appointment/booking form with date, time, contact',
    props: ['services', 'onSubmit', 'fields'],
    tailwindVariants: {
      default: 'space-y-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6',
    },
    exampleCode: `<div className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6"><input type="text" placeholder="Full Name" className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-violet-500" /><input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-violet-500" /><button className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 font-bold transition">Book Now</button></div>`,
    composeWith: ['InputField', 'Button', 'Select', 'Stack'],
  },
  {
    name: 'TimeSlotPicker',
    category: 'booking',
    description: 'Time slot selection grid',
    props: ['slots', 'selected', 'onSelect'],
    tailwindVariants: {
      default: 'flex gap-2 flex-wrap',
    },
    exampleCode: `<div className="flex gap-2 flex-wrap">{slots.map(s => <button key={s} className="px-3 py-2 rounded-lg text-xs font-bold transition bg-zinc-800 text-zinc-400 hover:text-white">{s}</button>)}</div>`,
    composeWith: ['Button', 'Stack'],
  },

  // ─── Content ───────────────────────────────────────────────────
  {
    name: 'Hero',
    category: 'content',
    description: 'Hero section with headline, subtitle, CTA',
    props: ['title', 'highlight', 'subtitle', 'ctaText', 'onCtaClick', 'badge'],
    tailwindVariants: {
      default: 'pt-32 pb-20 px-6 text-center',
      left: 'pt-32 pb-20 px-6',
    },
    exampleCode: `<section className="pt-32 pb-20 px-6 text-center"><div className="max-w-3xl mx-auto space-y-6"><div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-violet-500/20 bg-violet-500/10 text-violet-400">Badge Text</div><h1 className="text-5xl md:text-7xl font-black tracking-tight">Headline with <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Highlight</span></h1><p className="text-zinc-400 text-lg max-w-lg mx-auto">Subtitle text here.</p><button className="px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-700 font-bold transition-all">CTA Button</button></div></section>`,
    composeWith: ['Button', 'Container', 'Stack', 'Badge'],
  },
  {
    name: 'FeatureGrid',
    category: 'content',
    description: 'Grid of feature cards with icons',
    props: ['features', 'columns'],
    tailwindVariants: {
      '3col': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
      '4col': 'grid grid-cols-2 md:grid-cols-4 gap-4',
    },
    exampleCode: `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{features.map((f, i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"><div className="text-3xl mb-3">{f.icon}</div><h3 className="font-bold text-lg">{f.title}</h3><p className="text-sm text-zinc-400 mt-2">{f.desc}</p></div>)}</div>`,
    composeWith: ['Card', 'Grid', 'Container'],
  },
  {
    name: 'TestimonialGrid',
    category: 'content',
    description: 'Grid of testimonial cards',
    props: ['testimonials', 'columns'],
    tailwindVariants: {
      '3col': 'grid grid-cols-1 md:grid-cols-3 gap-6',
      '2col': 'grid grid-cols-1 md:grid-cols-2 gap-6',
    },
    exampleCode: `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">{testimonials.map((t, i) => <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"><div className="flex items-center gap-1 mb-3">★★★★★</div><p className="text-sm text-zinc-400 mb-4">{t.text}</p><span className="text-sm font-bold">{t.name}</span></div>)}</div>`,
    composeWith: ['Card', 'Grid', 'StarRating'],
  },
  {
    name: 'CTASection',
    category: 'content',
    description: 'Call-to-action section with centered content',
    props: ['title', 'subtitle', 'ctaText', 'onCtaClick'],
    tailwindVariants: {
      default: 'px-6 pb-20',
    },
    exampleCode: `<section className="px-6 pb-20"><div className="max-w-xl mx-auto text-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl"><h2 className="text-xl font-black mb-3">Ready to get started?</h2><p className="text-sm text-zinc-500 mb-6">Join thousands of happy customers.</p><button className="px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-700 font-bold transition">Get Started</button></div></section>`,
    composeWith: ['Button', 'Card', 'Container'],
  },
  {
    name: 'PricingTable',
    category: 'content',
    description: 'Pricing comparison cards',
    props: ['plans', 'selected', 'onSelect', 'billingCycle'],
    tailwindVariants: {
      '3col': 'grid grid-cols-1 md:grid-cols-3 gap-6',
    },
    exampleCode: '<div className="grid grid-cols-1 md:grid-cols-3 gap-6">{plans.map((p, i) => <div key={i} className="rounded-2xl p-6 border bg-zinc-900 border-zinc-800"><h3 className="font-black text-xl">{p.name}</h3><div className="text-4xl font-black mt-2">${p.price}<span className="text-sm font-normal text-zinc-500">/mo</span></div><ul className="mt-6 space-y-3">{p.features.map((f, j) => <li key={j} className="flex items-center gap-2 text-sm text-zinc-400">{f}</li>)}</ul><button className="w-full mt-6 py-3 rounded-xl font-bold text-sm bg-zinc-800 hover:bg-zinc-700">Get Started</button></div>)}</div>',
    composeWith: ['Card', 'Button', 'Grid', 'Badge'],
  },

  // ─── Media ─────────────────────────────────────────────────────
  {
    name: 'ImagePlaceholder',
    category: 'media',
    description: 'Placeholder for images with gradient background',
    props: ['aspect', 'icon', 'label'],
    tailwindVariants: {
      square: 'aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center',
      wide: 'aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center',
      tall: 'aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center',
    },
    exampleCode: `<div className="aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-6xl">📦</div>`,
    composeWith: ['Card'],
  },

  // ─── Dashboard ──────────────────────────────────────────────────
  {
    name: 'DashboardShell',
    category: 'dashboard',
    description: 'Dashboard layout with sidebar and main content area',
    props: ['sidebarItems', 'activeItem', 'onNavigate', 'header'],
    tailwindVariants: {
      default: 'flex min-h-screen bg-zinc-950',
      collapsed: 'flex min-h-screen bg-zinc-950',
    },
    exampleCode: `<div className="flex min-h-screen bg-zinc-950"><aside className="w-64 bg-zinc-900 border-r border-zinc-800 p-4"><nav className="space-y-2">{items.map(i => <button key={i.id} className="w-full text-left px-3 py-2 rounded-lg text-sm font-bold">{i.label}</button>)}</nav></aside><main className="flex-1 p-8">{children}</main></div>`,
    composeWith: ['Sidebar', 'Card', 'Grid'],
  },
  {
    name: 'AnalyticsCard',
    category: 'dashboard',
    description: 'Analytics metric card with trend indicator and sparkline',
    props: ['label', 'value', 'change', 'changeType', 'icon', 'data'],
    tailwindVariants: {
      default: 'bg-zinc-900 border border-zinc-800 rounded-2xl p-6',
      highlighted: 'bg-zinc-900 border border-zinc-800 rounded-2xl p-6 ring-1 ring-violet-500/20',
    },
    exampleCode: `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"><div className="flex items-center justify-between mb-4"><span className="text-sm text-zinc-500">Revenue</span><span className="text-emerald-400 text-xs font-bold">+12.5%</span></div><div className="text-3xl font-black">$45,231</div><div className="mt-4 h-12 bg-zinc-800 rounded-lg flex items-end px-2 gap-1"><div className="w-full bg-violet-500/30 rounded-t" style={{height:'60%'}} /><div className="w-full bg-violet-500/50 rounded-t" style={{height:'80%'}} /><div className="w-full bg-violet-500/70 rounded-t" style={{height:'45%'}} /><div className="w-full bg-violet-500 rounded-t" style={{height:'90%'}} /></div></div>`,
    composeWith: ['Card', 'Grid', 'StatCard'],
  },
  {
    name: 'UserProfile',
    category: 'dashboard',
    description: 'User profile card with avatar, name, role, and actions',
    props: ['user', 'onEdit', 'onDeactivate', 'variant'],
    tailwindVariants: {
      default: 'bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-4',
      compact: 'bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3',
      detailed: 'bg-zinc-900 border border-zinc-800 rounded-2xl p-6',
    },
    exampleCode: `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center font-bold">JD</div><div className="flex-1"><div className="font-bold">John Doe</div><div className="text-sm text-zinc-500">Admin</div></div><button className="px-4 py-2 rounded-lg text-sm font-bold bg-zinc-800 hover:bg-zinc-700">Edit</button></div>`,
    composeWith: ['Avatar', 'Button', 'Badge', 'Card'],
  },

  // ─── CRM ────────────────────────────────────────────────────────
  {
    name: 'CRMBoard',
    category: 'crm',
    description: 'CRM pipeline board with columns for deal stages',
    props: ['stages', 'deals', 'onDealMove', 'onDealClick'],
    tailwindVariants: {
      default: 'flex gap-4 overflow-x-auto pb-4',
    },
    exampleCode: '<div className="flex gap-4 overflow-x-auto pb-4">{stages.map(stage => <div key={stage.id} className="min-w-[280px] bg-zinc-900 border border-zinc-800 rounded-2xl p-4"><h3 className="font-bold text-sm mb-4 text-zinc-400">{stage.name} ({stage.deals.length})</h3><div className="space-y-3">{stage.deals.map(deal => <div key={deal.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition"><div className="font-bold">{deal.title}</div><div className="text-sm text-zinc-400 mt-1">${"{deal.value.toLocaleString()}"}</div></div>)}</div></div>)}</div>',
    composeWith: ['Card', 'Badge', 'Avatar', 'Button'],
  },
  {
    name: 'CRMContactCard',
    category: 'crm',
    description: 'Contact card with name, email, phone, company, and status',
    props: ['contact', 'onView', 'onEdit', 'onDelete'],
    tailwindVariants: {
      default: 'bg-zinc-900 border border-zinc-800 rounded-2xl p-6',
      compact: 'bg-zinc-900 border border-zinc-800 rounded-xl p-4',
    },
    exampleCode: `<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"><div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm">JD</div><div><div className="font-bold">John Doe</div><div className="text-sm text-zinc-500">Acme Corp</div></div></div><div className="space-y-2 text-sm text-zinc-400"><div>john@example.com</div><div>(555) 123-4567</div></div><div className="mt-4 flex gap-2"><span className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400">Active</span></div></div>`,
    composeWith: ['Avatar', 'Badge', 'Button', 'Card'],
  },

  // ─── Kanban ─────────────────────────────────────────────────────
  {
    name: 'KanbanBoard',
    category: 'kanban',
    description: 'Kanban board with draggable cards across columns',
    props: ['columns', 'items', 'onCardMove', 'onCardClick'],
    tailwindVariants: {
      default: 'flex gap-4 overflow-x-auto',
      compact: 'flex gap-3 overflow-x-auto',
    },
    exampleCode: `<div className="flex gap-4 overflow-x-auto">{columns.map(col => <div key={col.id} className="min-w-[300px] bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4"><h3 className="font-bold text-sm mb-4 flex items-center justify-between"><span>{col.title}</span><span className="px-2 py-0.5 rounded-full bg-zinc-800 text-xs">{col.items.length}</span></h3><div className="space-y-3">{col.items.map(item => <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition"><div className="font-bold text-sm">{item.title}</div>{item.assignee && <div className="mt-2 flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px]">{item.assignee[0]}</div><span className="text-xs text-zinc-500">{item.assignee}</span></div>}</div>)}</div></div>)}</div>`,
    composeWith: ['Card', 'Avatar', 'Badge', 'Button'],
  },
  {
    name: 'TaskCard',
    category: 'kanban',
    description: 'Individual task card with title, assignee, priority badge, and due date',
    props: ['title', 'assignee', 'priority', 'dueDate', 'status', 'onClick'],
    tailwindVariants: {
      default: 'bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition',
      compact: 'bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-600 transition',
    },
    exampleCode: '<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition"><div className="flex items-center justify-between mb-2"><span className="font-bold text-sm">{title}</span><span className={`px-2 py-0.5 rounded-full text-xs ${priority === "high" ? "bg-red-500/20 text-red-400" : priority === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"}`}>{priority}</span></div>{assignee && <div className="flex items-center gap-2 mt-2"><div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px]">{assignee[0]}</div><span className="text-xs text-zinc-500">{assignee}</span></div>}{dueDate && <div className="text-xs text-zinc-600 mt-2">Due {dueDate}</div>}</div>',
    composeWith: ['Badge', 'Avatar'],
  },
  {
    name: 'ProgressBar',
    category: 'dashboard',
    description: 'Progress indicator showing completion percentage',
    props: ['value', 'max', 'label', 'color'],
    tailwindVariants: {
      default: 'w-full',
      compact: 'w-full',
    },
    exampleCode: '<div className="w-full"><div className="flex items-center justify-between mb-1"><span className="text-sm text-zinc-400">{label}</span><span className="text-sm font-bold">{Math.round((value/max)*100)}%</span></div><div className="h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{width: `${(value/max)*100}%`}}></div></div></div>',
    composeWith: ['Card'],
  },
  {
    name: 'Calendar',
    category: 'dashboard',
    description: 'Monthly calendar view with event indicators',
    props: ['events', 'selectedDate', 'onDateSelect'],
    tailwindVariants: {
      default: 'bg-zinc-900 border border-zinc-800 rounded-2xl p-6',
      compact: 'bg-zinc-900 border border-zinc-800 rounded-xl p-4',
    },
    exampleCode: '<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"><div className="flex items-center justify-between mb-4"><h3 className="font-bold">{month} {year}</h3><div className="flex gap-2"><button className="p-2 rounded-lg hover:bg-zinc-800">←</button><button className="p-2 rounded-lg hover:bg-zinc-800">→</button></div></div><div className="grid grid-cols-7 gap-1 text-center text-xs"><span className="text-zinc-500 py-2">Sun</span><span className="text-zinc-500 py-2">Mon</span><span className="text-zinc-500 py-2">Tue</span><span className="text-zinc-500 py-2">Wed</span><span className="text-zinc-500 py-2">Thu</span><span className="text-zinc-500 py-2">Fri</span><span className="text-zinc-500 py-2">Sat</span>{days.map(d => <button key={d} className={`py-2 rounded-lg ${d === selected ? "bg-emerald-500 text-white" : "hover:bg-zinc-800"}`}>{d}</button>)}</div></div>',
    composeWith: ['Card', 'Button'],
  },

  // ─── Subscription ───────────────────────────────────────────────
  {
    name: 'SubscriptionSelector',
    category: 'subscription',
    description: 'Subscription plan selector with tier comparison',
    props: ['plans', 'selectedPlan', 'onSelect', 'billingCycle'],
    tailwindVariants: {
      default: 'grid grid-cols-1 md:grid-cols-3 gap-6',
      compact: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
    },
    exampleCode: '<div className="grid grid-cols-1 md:grid-cols-3 gap-6">{plans.map((plan, i) => <div key={i} className="rounded-2xl p-6 border bg-zinc-900 border-zinc-800"><div className="text-sm font-bold text-zinc-400 mb-2">{plan.name}</div><div className="text-4xl font-black">${plan.price}<span className="text-sm font-normal text-zinc-500">/mo</span></div><ul className="mt-6 space-y-3">{plan.features.map((f, j) => <li key={j} className="flex items-center gap-2 text-sm text-zinc-400"><span className="text-emerald-400">✓</span>{f}</li>)}</ul><button className="w-full mt-6 py-3 rounded-xl font-bold text-sm bg-zinc-800 hover:bg-zinc-700">Select Plan</button></div>)}</div>',
    composeWith: ['Card', 'Button', 'Badge', 'Grid'],
  },
];

export function getPrimitivesByCategory(category: AtomicPrimitive['category']): AtomicPrimitive[] {
  return ATOMIC_PRIMITIVES.filter(p => p.category === category);
}

export function getPrimitiveByName(name: string): AtomicPrimitive | undefined {
  return ATOMIC_PRIMITIVES.find(p => p.name === name);
}

export function getPrimitivesForCapabilities(capabilities: string[]): AtomicPrimitive[] {
  const capabilityCategoryMap: Record<string, AtomicPrimitive['category'][]> = {
    commerce: ['ecommerce'],
    booking: ['booking'],
    crm: ['crm'],
    subscriptions: ['subscription'],
    inventory: ['data-display'],
    orders: ['data-display'],
    'customer-management': ['data-display', 'dashboard'],
    analytics: ['dashboard'],
    content: ['content'],
    payments: ['data-display'],
    scheduling: ['booking'],
    'property-management': ['data-display', 'ecommerce'],
    marketplace: ['ecommerce'],
    education: ['content', 'data-display'],
    'case-management': ['crm', 'kanban'],
    'franchise-management': ['dashboard', 'data-display'],
    'membership-platform': ['crm', 'content'],
    'food-beverage': ['ecommerce', 'booking'],
    'fitness-wellness': ['booking', 'subscription'],
    'healthcare-clinic': ['booking', 'dashboard'],
    catalog: ['ecommerce'],
    'team-collaboration': ['dashboard'],
    'project-management': ['kanban', 'dashboard'],
    notifications: ['feedback'],
    'user-generated-content': ['content'],
  };

  const baseCategories: AtomicPrimitive['category'][] = ['layout', 'ui', 'input', 'navigation', 'content', 'data-display', 'media', 'feedback'];
  const matchedCategories = new Set<AtomicPrimitive['category']>(baseCategories);

  for (const cap of capabilities) {
    const cats = capabilityCategoryMap[cap] || [];
    for (const c of cats) {
      matchedCategories.add(c);
    }
  }

  return ATOMIC_PRIMITIVES.filter(p => matchedCategories.has(p.category));
}

export function getPrimitivesForDomain(businessType: string): AtomicPrimitive[] {
  const domainMap: Record<string, AtomicPrimitive['category'][]> = {
    ecommerce: ['layout', 'ui', 'input', 'navigation', 'ecommerce', 'content', 'feedback', 'media'],
    saas: ['layout', 'ui', 'input', 'navigation', 'content', 'data-display', 'feedback', 'dashboard'],
    restaurant: ['layout', 'ui', 'input', 'navigation', 'content', 'booking', 'media', 'ecommerce'],
    portfolio: ['layout', 'ui', 'navigation', 'content', 'media'],
    blog: ['layout', 'ui', 'input', 'navigation', 'content', 'media'],
    fitness: ['layout', 'ui', 'input', 'navigation', 'content', 'booking', 'data-display', 'subscription'],
    education: ['layout', 'ui', 'input', 'navigation', 'content', 'data-display'],
    healthcare: ['layout', 'ui', 'input', 'navigation', 'content', 'booking', 'data-display', 'dashboard'],
    marketplace: ['layout', 'ui', 'input', 'navigation', 'ecommerce', 'content', 'feedback'],
    'local-business': ['layout', 'ui', 'input', 'navigation', 'content', 'booking', 'media'],
    agency: ['layout', 'ui', 'input', 'navigation', 'content', 'data-display', 'media'],
  };

  const fallback: AtomicPrimitive['category'][] = ['layout', 'ui', 'input', 'navigation', 'content', 'data-display', 'media'];
  const categories: AtomicPrimitive['category'][] = domainMap[businessType as keyof typeof domainMap] ?? fallback;
  return ATOMIC_PRIMITIVES.filter(p => categories.includes(p.category));
}

export function buildPrimitivesCatalog(businessType: string): string {
  const relevant = getPrimitivesForDomain(businessType);
  const lines: string[] = [];

  for (const prim of relevant) {
    lines.push(`### ${prim.name} (${prim.category})`);
    lines.push(prim.description);
    lines.push(`Props: ${prim.props.join(', ')}`);
    lines.push(`Variants:`);
    for (const [key, val] of Object.entries(prim.tailwindVariants)) {
      lines.push(`  ${key}: "${val}"`);
    }
    lines.push(`Example: ${prim.exampleCode}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function buildPrimitivesCatalogForCapabilities(capabilities: string[]): string {
  const relevant = getPrimitivesForCapabilities(capabilities);
  const lines: string[] = [];

  for (const prim of relevant) {
    lines.push(`### ${prim.name} (${prim.category})`);
    lines.push(prim.description);
    lines.push(`Props: ${prim.props.join(', ')}`);
    lines.push(`Variants:`);
    for (const [key, val] of Object.entries(prim.tailwindVariants)) {
      lines.push(`  ${key}: "${val}"`);
    }
    lines.push(`Example: ${prim.exampleCode}`);
    lines.push('');
  }

  return lines.join('\n');
}
