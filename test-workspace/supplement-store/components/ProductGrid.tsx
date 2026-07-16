'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface ProductGridProps {
  title?: string;
  subtitle?: string;
  entity?: string;
  columns?: Array<{ key: string; label: string; type?: string; sortable?: boolean; filterable?: boolean }>;
  items?: Array<{ name?: string; title?: string; price?: number | string; description?: string; image?: string; tag?: string; rating?: number; reviews?: number; emoji?: string; details?: string[]; [key: string]: unknown }>;
}

const PRODUCTS = [
  {
    name: 'MuscleBlaze Biozyme Performance Whey',
    price: 2499,
    originalPrice: 3299,
    description: 'India\'s highest-rated whey protein with 25g protein per serving. Lab-tested for purity.',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2e3c1?w=400&h=400&fit=crop',
    tag: 'Bestseller',
    rating: 4.8,
    reviews: 12450,
    details: ['25g Protein', '1kg', 'Lab Tested'],
  },
  {
    name: 'Optimum Nutrition Gold Standard',
    price: 3299,
    originalPrice: 3999,
    description: 'The world\'s best-selling whey protein. 24g protein, low sugar, instantized.',
    image: 'https://images.unsplash.com/photo-1622485831930-34ae8e7074f0?w=400&h=400&fit=crop',
    tag: 'Premium',
    rating: 4.9,
    reviews: 8920,
    details: ['24g Protein', '2kg', 'Global Brand'],
  },
  {
    name: 'HealthKart HK Vitals Multivitamin',
    price: 599,
    originalPrice: 899,
    description: 'Complete daily multivitamin with 23 essential nutrients. Supports immunity.',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop',
    tag: 'Value',
    rating: 4.6,
    reviews: 5670,
    details: ['60 Tablets', '30-Day Supply'],
  },
  {
    name: 'BSN Nitro-Tech Whey Gold',
    price: 2899,
    originalPrice: 3499,
    description: 'Advanced whey protein isolate with creatine and BCAAs.',
    image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400&h=400&fit=crop',
    tag: 'Performance',
    rating: 4.7,
    reviews: 3450,
    details: ['30g Protein', '1.8kg', 'Creatine'],
  },
  {
    name: 'TrueBasics Omega 3 Fish Oil',
    price: 449,
    originalPrice: 699,
    description: 'Triple-strength fish oil with 600mg EPA+DHA. Heart & joint health.',
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=400&fit=crop',
    tag: 'Essential',
    rating: 4.5,
    reviews: 7890,
    details: ['90 Softgels', '600mg EPA+DHA'],
  },
  {
    name: 'BigMuscles Crude Creatine',
    price: 399,
    originalPrice: 599,
    description: 'Pure creatine monohydrate for strength and endurance. Unflavored.',
    image: 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=400&h=400&fit=crop',
    tag: 'Strength',
    rating: 4.6,
    reviews: 4560,
    details: ['200g', '5g/serving'],
  },
  {
    name: 'Dymatize ISO100 Hydrolyzed',
    price: 3599,
    originalPrice: 4299,
    description: '100% hydrolyzed whey protein isolate. Zero sugar, zero fat.',
    image: 'https://images.unsplash.com/photo-1587049016823-69ef9d68f4af?w=400&h=400&fit=crop',
    tag: 'Isolate',
    rating: 4.9,
    reviews: 6780,
    details: ['25g Protein', '1.4kg', 'Zero Sugar'],
  },
  {
    name: 'GNC Slimvance',
    price: 1299,
    originalPrice: 1799,
    description: 'Clinically studied weight management formula. Supports metabolism.',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
    tag: 'Weight Loss',
    rating: 4.4,
    reviews: 2340,
    details: ['60 Capsules', 'Metabolism'],
  },
];

export default function ProductGrid(props: ProductGridProps) {
  return (
    <section className="py-20 px-6 bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-white mb-3">Shop Supplements</h2>
          <p className="text-zinc-400">Premium sports nutrition trusted by 50,000+ athletes across India</p>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {['All', 'Protein', 'Pre-Workout', 'Vitamins', 'Weight Loss', 'Essentials'].map((cat) => (
            <button
              key={cat}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                cat === 'All'
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRODUCTS.map((product, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all hover:shadow-xl hover:shadow-emerald-500/5"
            >
              {/* Product image */}
              <div className="relative aspect-square bg-zinc-800 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-zinc-950">
                    {product.tag}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <button className="w-9 h-9 rounded-full bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-white transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Product info */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className={`w-3.5 h-3.5 ${j < Math.floor(product.rating) ? 'text-amber-400' : 'text-zinc-700'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs text-zinc-500">({product.reviews.toLocaleString()})</span>
                </div>

                <h3 className="font-bold text-white text-sm mb-1 line-clamp-2 leading-snug">{product.name}</h3>
                <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{product.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {product.details.map((detail, j) => (
                    <span key={j} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-400">
                      {detail}
                    </span>
                  ))}
                </div>

                {/* Price + CTA */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-black text-white">₹{product.price.toLocaleString()}</span>
                    <span className="text-xs text-zinc-500 line-through ml-2">₹{product.originalPrice.toLocaleString()}</span>
                  </div>
                  <button className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all">
                    Add to Cart
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
