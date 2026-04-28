'use client';
import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, RotateCcw, Truck, ShieldCheck } from 'lucide-react';
import { useCart } from '@/store/cart';
import { formatPrice } from '@/lib/data';
import type { Product, ProductVariant } from '@/types';

interface Props { product: Product }

const FAQs = [
  { q: 'How long will it take to receive my order?', a: 'Standard shipping typically takes 3–7 business days. Expedited options available. You\'ll receive a tracking link once your order ships.' },
  { q: 'Can I return or exchange an item?', a: 'We accept returns and exchanges within 30 days of delivery. Items must be unused and in original packaging.' },
  { q: 'How do I track my order?', a: 'Once your order ships, you\'ll receive a confirmation email with a tracking number.' },
  { q: 'What payment methods do you accept?', a: 'We accept Razorpay, UPI, credit/debit cards, net banking, and more.' },
  { q: 'Is my payment information secure?', a: 'Yes. We use SSL encryption and Razorpay\'s trusted payment gateway.' },
  { q: 'Can I change or cancel my order after placing it?', a: 'Please contact us immediately with your order number. We\'ll do our best before the item ships.' },
];

export function ProductDetailClient({ product }: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>('description');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const { addItem } = useCart();

  const handleAddToCart = () => {
    setAdding(true);
    addItem(product, selectedVariant, quantity);
    setTimeout(() => setAdding(false), 1500);
  };

  const reviews = [
    { text: 'The fit is impeccable and the fabric feels incredibly luxurious. It\'s elegant, comfortable, and effortlessly transitions from day to evening — truly a timeless addition to my wardrobe.', author: 'Sophia L.', count: 224 },
    { text: 'I was blown away by the quality and attention to detail. It drapes beautifully and somehow manages to be both structured and soft. I\'ve received compliments every single time I\'ve worn it.', author: 'David M.', count: 350 },
    { text: 'This piece is my new go-to for everything. It has that rare ability to feel polished without sacrificing an ounce of comfort. The craftsmanship is evident in every stitch—absolutely worth it.', author: 'Olivia P.', count: 384 },
  ];

  const accordionSections = [
    { id: 'description', label: 'Product Description', content: product.description },
    { id: 'details', label: 'Product Details', content: product.details ? Object.entries(product.details).map(([k, v]) => `${k}: ${v}`).join('\n') : '' },
    { id: 'commitment', label: 'Our Commitment', content: 'We believe great fashion should combine durability, comfort, and timeless design. Our commitment begins with carefully selected fabrics known for their strength and natural character.' },
  ];

  return (
    <div>
      {/* Product Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Gallery */}
          <div className="flex gap-4">
            <div className="hidden md:flex flex-col gap-3 w-20">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`product-gallery-thumb relative w-20 h-24 bg-[#F8F6F3] overflow-hidden ${i === selectedImage ? 'active' : ''}`}
                >
                  <Image src={img} alt={`${product.name} ${i+1}`} fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
            <div className="flex-1 relative aspect-[4/5] bg-[#F8F6F3] overflow-hidden">
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </div>

          {/* Product Info */}
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A] mb-3">{product.name}</h1>
            <p className="text-sm text-[#6B6B6B] mb-4">{product.description.slice(0, 100)}...</p>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl font-semibold">{formatPrice(selectedVariant.price)}</span>
              {selectedVariant.comparePrice && (
                <span className="text-lg text-[#6B6B6B] line-through">{formatPrice(selectedVariant.comparePrice)}</span>
              )}
            </div>

            {product.reviews && (
              <p className="text-sm text-[#6B6B6B] mb-6">{product.reviews} Reviews</p>
            )}

            {/* Size Selector */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Select Size</p>
              <div className="flex gap-2 flex-wrap">
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-4 py-2 text-sm border transition-colors ${
                      v.id === selectedVariant.id
                        ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                        : 'bg-white text-[#0A0A0A] border-[#D4D4D4] hover:border-[#0A0A0A]'
                    }`}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-3">Quantity</p>
              <div className="flex items-center gap-0 w-fit border border-[#D4D4D4]">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">−</button>
                <span className="w-10 h-10 flex items-center justify-center text-sm">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">+</button>
              </div>
            </div>

            <button onClick={handleAddToCart} className="w-full btn-primary mb-6">
              {adding ? '✓ Added to Cart' : 'Add to Cart'}
            </button>

            {/* Trust badges */}
            <div className="space-y-3 border-t border-[#EDE9E3] pt-6">
              <div className="flex items-center gap-3 text-sm text-[#6B6B6B]">
                <Truck className="w-4 h-4 text-[#0A0A0A]" />
                <div><span className="font-medium text-[#0A0A0A]">Fast Shipping</span> — Express and standard delivery options available.</div>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#6B6B6B]">
                <RotateCcw className="w-4 h-4 text-[#0A0A0A]" />
                <div><span className="font-medium text-[#0A0A0A]">Seamless Returns</span> — Seamless Returns and Exchanges.</div>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#6B6B6B]">
                <ShieldCheck className="w-4 h-4 text-[#0A0A0A]" />
                <div><span className="font-medium text-[#0A0A0A]">Authenticity Guaranteed</span> — 100% verified premium product.</div>
              </div>
            </div>

            {/* Accordion */}
            <div className="mt-8 space-y-0 border-t border-[#EDE9E3]">
              {accordionSections.map(section => (
                <div key={section.id} className="border-b border-[#EDE9E3]">
                  <button
                    className="flex items-center justify-between w-full py-4 text-sm font-medium text-left"
                    onClick={() => setOpenAccordion(openAccordion === section.id ? null : section.id)}
                  >
                    {section.label}
                    {openAccordion === section.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {openAccordion === section.id && (
                    <div className="pb-4 text-sm text-[#6B6B6B] leading-relaxed whitespace-pre-line">
                      {section.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="relative py-16 overflow-hidden">
        <div className="absolute inset-0">
          <Image src="https://framerusercontent.com/images/NQKZlDa3FB5f0exnKuSv412WsbE.jpg" alt="Reviews background" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-[#0A0A0A]/60" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {reviews.map((r, i) => (
              <div key={i} className="text-center">
                <p className="text-sm text-white/60 mb-3">{r.count} Reviews</p>
                <blockquote className="text-white text-sm leading-relaxed mb-4 font-light italic">"{r.text}"</blockquote>
                <p className="text-white/70 text-sm">— {r.author}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Help section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-serif text-3xl font-light mb-4">Questions? We're Here to Help.</h2>
            <p className="text-[#6B6B6B] mb-6">Our team is ready to assist you with sizing, styling, orders, and more—ensuring a smooth and confident shopping experience every time.</p>
            <a href="/contact-us" className="btn-primary inline-block">Get in Touch</a>
          </div>
          <div className="space-y-0">
            {FAQs.map((faq, i) => (
              <div key={i} className="border-b border-[#EDE9E3]">
                <button
                  className="flex items-center justify-between w-full py-4 text-sm font-medium text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.q}
                  {openFaq === i ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                </button>
                {openFaq === i && <div className="pb-4 text-sm text-[#6B6B6B] leading-relaxed">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
