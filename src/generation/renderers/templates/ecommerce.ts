/**
 * Ecommerce Component Templates
 *
 * Production-quality component templates for ecommerce applications.
 * These are code strings that the renderer injects into the generated project.
 * Templates consume structured data (JSON) and never hardcode content.
 */

export const ECOMMERCE_TEMPLATES = {
  /**
   * ProductCard component with badges, veg/non-veg indicator, discount %, star ratings
   */
  ProductCard: () => `'use client';

import { motion } from 'framer-motion';
import { Star, ShoppingCart, Eye, Heart } from 'lucide-react';

interface ProductCardProps {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number;
  image: string;
  rating: number;
  reviews: number;
  isVeg?: boolean;
  isBestseller?: boolean;
  tag?: string;
  description?: string;
  onViewDetails?: (id: string) => void;
  onAddToCart?: (id: string) => void;
}

export default function ProductCard({
  id,
  name,
  brand,
  price,
  originalPrice,
  image,
  rating,
  reviews,
  isVeg,
  isBestseller,
  tag,
  onViewDetails,
  onAddToCart
}: ProductCardProps) {
  const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-xs hover:shadow-md transition-shadow flex flex-col h-full group relative"
    >
      {isBestseller && (
        <div className="absolute top-4 left-4 z-10 bg-amber-500 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-xs">
          Bestseller
        </div>
      )}
      {tag && !isBestseller && (
        <div className="absolute top-4 left-4 z-10 bg-emerald-500 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-xs">
          {tag}
        </div>
      )}
      {isVeg !== undefined && (
        <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-xs p-1 rounded-md shadow-xs">
          <div className={isVeg ? 'w-3 h-3 border border-green-500 flex items-center justify-center' : 'w-3 h-3 border border-red-500 flex items-center justify-center'}>
            <div className={isVeg ? 'w-1.5 h-1.5 bg-green-500 rounded-full' : 'w-1.5 h-1.5 bg-red-500 rounded-full'} />
          </div>
        </div>
      )}
      <div className="h-48 md:h-52 bg-neutral-50 overflow-hidden relative cursor-pointer" onClick={() => onViewDetails?.(id)}>
        <img src={image} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">{brand}</span>
        <h3 className="font-display font-medium text-neutral-800 text-sm md:text-base leading-tight mb-2 line-clamp-2 min-h-[2.5rem] cursor-pointer hover:text-amber-600 transition-colors" onClick={() => onViewDetails?.(id)}>
          {name}
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-[11px] font-semibold">
            <span>{rating}</span>
            <Star size={12} className="fill-amber-600 stroke-amber-600" />
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">({reviews.toLocaleString()} reviews)</span>
        </div>
        <div className="mt-auto pt-3 border-t border-neutral-100">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg md:text-xl font-bold font-display text-neutral-900">₹{price.toLocaleString('en-IN')}</span>
            <span className="text-xs text-muted-foreground line-through">₹{originalPrice.toLocaleString('en-IN')}</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600">Save ₹{(originalPrice - price).toLocaleString('en-IN')} ({discountPercent}% OFF)</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={() => onViewDetails?.(id)} className="border border-border text-neutral-700 hover:border-border font-medium text-xs py-2 rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1">
            <Eye size={14} /> Details
          </button>
          <button onClick={() => onAddToCart?.(id)} className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs py-2 rounded-xl transition-colors shadow-sm cursor-pointer text-center flex items-center justify-center gap-1">
            <ShoppingCart size={14} /> Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}`,

  /**
   * CartDrawer component with slide-out cart, quantity controls, total
   */
  CartDrawer: () => `'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({ isOpen, items, onClose, onUpdateQuantity, onRemoveItem, onCheckout }: CartDrawerProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-card/60 backdrop-blur-xs z-50" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 350 }} className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <h2 className="font-display font-bold text-lg">Your Cart ({items.length})</h2>
              <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-neutral-50 p-3 rounded-xl">
                    <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg" referrerPolicy="no-referrer" />
                    <div className="flex-grow">
                      <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">{item.brand}</p>
                      <p className="font-bold text-sm mt-1">₹{item.price.toLocaleString('en-IN')}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-neutral-100"><Minus size={12} /></button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-neutral-100"><Plus size={12} /></button>
                        <button onClick={() => onRemoveItem(item.id)} className="ml-auto text-red-500 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {items.length > 0 && (
              <div className="border-t border-neutral-100 p-4 space-y-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                <button onClick={onCheckout} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-colors">Proceed to Checkout</button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}`,

  /**
   * CheckoutModal component with 2-step flow (Address → Payment), GST calculation
   */
  CheckoutModal: () => `'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, CreditCard, CheckCircle } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  onClose: () => void;
  onOrderSuccess: (order: any) => void;
}

export default function CheckoutModal({ isOpen, items, onClose, onOrderSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [address, setAddress] = useState({ fullName: '', phone: '', addressLine1: '', city: '', state: '', pinCode: '' });
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gst = subtotal / 1.18;
  const shipping = subtotal > 999 ? 0 : 99;
  const total = subtotal + shipping;

  const handleSubmit = () => {
    const order = { id: \`ORD-\${Date.now()}\`, items, subtotal, gst, shipping, total, address, paymentMethod, date: new Date().toISOString(), status: 'Processing' };
    onOrderSuccess(order);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-card/60 backdrop-blur-xs" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} transition={{ type: 'spring', damping: 25, stiffness: 350 }} className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative z-10">
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-neutral-700 hover:bg-neutral-100 p-2 rounded-full transition-all z-20"><X size={20} /></button>
            <div className="p-6">
              <h2 className="font-display font-bold text-2xl mb-6">Checkout</h2>
              {step === 1 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><MapPin size={18} /> Shipping Address</h3>
                  <input placeholder="Full Name" value={address.fullName} onChange={(e) => setAddress({...address, fullName: e.target.value})} className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600" />
                  <input placeholder="Phone Number" value={address.phone} onChange={(e) => setAddress({...address, phone: e.target.value})} className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600" />
                  <input placeholder="Address Line 1" value={address.addressLine1} onChange={(e) => setAddress({...address, addressLine1: e.target.value})} className="w-full border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600" />
                  <div className="grid grid-cols-3 gap-4">
                    <input placeholder="City" value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} className="border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600" />
                    <input placeholder="State" value={address.state} onChange={(e) => setAddress({...address, state: e.target.value})} className="border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600" />
                    <input placeholder="PIN Code" value={address.pinCode} onChange={(e) => setAddress({...address, pinCode: e.target.value})} className="border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600" />
                  </div>
                  <button onClick={() => setStep(2)} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-colors">Continue to Payment</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><CreditCard size={18} /> Payment Method</h3>
                  <div className="space-y-2">
                    {['upi', 'card', 'cod'].map((method) => (
                      <label key={method} className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:border-amber-600 transition-colors">
                        <input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={(e) => setPaymentMethod(e.target.value)} className="accent-amber-600" />
                        <span className="capitalize font-medium">{method === 'upi' ? 'UPI (GPay/PhonePe)' : method === 'card' ? 'Credit/Debit Card' : 'Cash on Delivery'}</span>
                      </label>
                    ))}
                  </div>
                  <div className="bg-neutral-50 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between text-sm"><span>GST (18%)</span><span>₹{Math.round(gst).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between text-sm"><span>Shipping</span><span>{shipping === 0 ? 'FREE' : \`₹\${shipping}\`}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t border-border pt-2"><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
                  </div>
                  <button onClick={handleSubmit} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"><CheckCircle size={18} /> Place Order</button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}`,

  /**
   * ProductFilter component with category pills, sort dropdown, veg-only toggle
   */
  ProductFilter: () => `'use client';

import { SlidersHorizontal } from 'lucide-react';

interface ProductFilterProps {
  categories: string[];
  selectedCategory: string | null;
  sortBy: string;
  vegOnly: boolean;
  onCategoryChange: (category: string | null) => void;
  onSortChange: (sort: string) => void;
  onVegOnlyChange: (vegOnly: boolean) => void;
}

export default function ProductFilter({
  categories,
  selectedCategory,
  sortBy,
  vegOnly,
  onCategoryChange,
  onSortChange,
  onVegOnlyChange
}: ProductFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-sm font-medium transition-colors">
        <SlidersHorizontal size={16} /> Filters
      </button>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(selectedCategory === cat ? null : cat)}
            className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${
              selectedCategory === cat
                ? 'bg-amber-600 text-white'
                : 'bg-neutral-100 text-muted-foreground hover:bg-neutral-200'
            }\`}
          >
            {cat}
          </button>
        ))}
      </div>
      <select value={sortBy} onChange={(e) => onSortChange(e.target.value)} className="px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20">
        <option value="bestseller">Bestseller</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="rating">Rating</option>
      </select>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={vegOnly} onChange={(e) => onVegOnlyChange(e.target.checked)} className="accent-green-500" />
        Veg Only
      </label>
    </div>
  );
}`,

  /**
   * Zustand cart store with localStorage persistence
   */
  CartStore: () => `import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  quantity: number;
  flavor?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => {
        const existing = state.items.find((i) => i.id === item.id && i.flavor === item.flavor);
        if (existing) {
          return { items: state.items.map((i) => i.id === item.id && i.flavor === item.flavor ? { ...i, quantity: i.quantity + 1 } : i) };
        }
        return { items: [...state.items, { ...item, quantity: 1 }] };
      }),
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: quantity <= 0 ? state.items.filter((i) => i.id !== id) : state.items.map((i) => i.id === id ? { ...i, quantity } : i)
      })),
      clearCart: () => set({ items: [] }),
      getTotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0)
    }),
    { name: 'cart-storage' }
  )
);`,

  /**
   * ProductDetailModal component with flavor selector, benefits, reviews
   */
  ProductDetailModal: () => `'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, ShieldCheck, ShoppingCart, Heart } from 'lucide-react';

interface ProductDetail {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice: number;
  image: string;
  rating: number;
  reviews: number;
  description: string;
  flavors?: string[];
  benefits?: string[];
  authenticityDetails?: string;
  isVeg?: boolean;
}

interface ProductDetailModalProps {
  product: ProductDetail | null;
  onClose: () => void;
  onAddToCart: (id: string, flavor?: string) => void;
}

export default function ProductDetailModal({ product, onClose, onAddToCart }: ProductDetailModalProps) {
  const [selectedFlavor, setSelectedFlavor] = useState(product?.flavors?.[0] || '');

  if (!product) return null;

  const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-card/60 backdrop-blur-xs" />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} transition={{ type: 'spring', damping: 25, stiffness: 350 }} className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 grid grid-cols-1 md:grid-cols-12">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-neutral-700 hover:bg-neutral-100 p-2 rounded-full transition-all z-20"><X size={20} /></button>
          <div className="md:col-span-5 bg-neutral-50 p-4 rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none">
            <img src={product.image} alt={product.name} className="w-full h-64 md:h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
          </div>
          <div className="md:col-span-7 p-6">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">{product.brand}</span>
            <h2 className="font-display font-bold text-2xl mt-1 mb-2">{product.name}</h2>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-sm font-semibold">
                <span>{product.rating}</span>
                <Star size={14} className="fill-amber-600 stroke-amber-600" />
              </div>
              <span className="text-sm text-muted-foreground">({product.reviews.toLocaleString()} reviews)</span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold font-display text-neutral-900">₹{product.price.toLocaleString('en-IN')}</span>
              <span className="text-sm text-muted-foreground line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
              <span className="text-sm font-semibold text-emerald-600">{discountPercent}% OFF</span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">{product.description}</p>
            {product.flavors && product.flavors.length > 0 && (
              <div className="mb-4">
                <span className="text-sm font-medium mb-2 block">Flavor:</span>
                <div className="flex flex-wrap gap-2">
                  {product.flavors.map((flavor) => (
                    <button key={flavor} onClick={() => setSelectedFlavor(flavor)} className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors \${selectedFlavor === flavor ? 'bg-amber-600 text-white' : 'bg-neutral-100 text-muted-foreground hover:bg-neutral-200'}\`}>
                      {flavor}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {product.benefits && product.benefits.length > 0 && (
              <div className="mb-4">
                <span className="text-sm font-medium mb-2 block">Benefits:</span>
                <ul className="space-y-1">
                  {product.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ShieldCheck size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {product.authenticityDetails && (
              <div className="bg-emerald-50 p-3 rounded-xl mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <ShieldCheck size={16} />
                  Authenticity Guarantee
                </div>
                <p className="text-xs text-emerald-600 mt-1">{product.authenticityDetails}</p>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2" onClick={() => onAddToCart(product.id, selectedFlavor)}>
                <ShoppingCart size={18} /> Add to Cart
              </button>
              <button className="p-3 border border-border rounded-xl hover:bg-neutral-50 transition-colors">
                <Heart size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}`
};

export default ECOMMERCE_TEMPLATES;
