'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/store/cart';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/types';

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const [hoveredImg, setHoveredImg] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);
    addItem(product, product.variants[0]);
    setTimeout(() => setIsAdding(false), 1000);
  };

  return (
    <div className="group relative">
      <Link href={`/products/${product.handle}`}>
        {/* Image */}
        <div className="relative aspect-[4/5] bg-[#F8F6F3] overflow-hidden">
          {product.badge && (
            <span className="absolute top-3 left-3 z-10 bg-[#0A0A0A] text-white text-[10px] font-medium tracking-widest uppercase px-2.5 py-1">
              {product.badge}
            </span>
          )}
          {product.images.map((img, i) => (
            <Image
              key={i}
              src={img}
              alt={product.name}
              fill
              className={`object-cover transition-all duration-700 ${
                i === hoveredImg ? 'opacity-100 scale-100' : 'opacity-0 scale-100'
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={i === 0}
            />
          ))}
          {/* Image dots */}
          {product.images.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 hidden group-hover:flex justify-center gap-1 pb-3">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  className={`w-8 h-0.5 transition-colors ${i === hoveredImg ? 'bg-[#0A0A0A]' : 'bg-[#D4D4D4]'}`}
                  onMouseEnter={() => setHoveredImg(i)}
                />
              ))}
            </div>
          )}
          {/* Add to cart overlay */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleAddToCart}
              className="w-full bg-[#0A0A0A] text-white py-3 text-xs font-medium tracking-widest uppercase hover:bg-[#333] transition-colors"
            >
              {isAdding ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-3 space-y-1">
          <h3 className="text-sm font-medium text-[#0A0A0A] hover:underline leading-snug">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#0A0A0A]">{formatPrice(product.price)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-sm text-[#6B6B6B] line-through">{formatPrice(product.comparePrice)}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
