'use client';
import Link from 'next/link';
import Image from 'next/image';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '@/store/cart';
import { formatPrice } from '@/lib/data';

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!isOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={closeCart} />
      <div className="cart-drawer shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EDE9E3]">
          <h2 className="text-base font-semibold tracking-wide uppercase">
            Cart ({itemCount})
          </h2>
          <button onClick={closeCart} className="text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <ShoppingBag className="w-12 h-12 text-[#D4D4D4]" />
              <p className="text-[#6B6B6B] text-sm">Your cart is empty</p>
              <button onClick={closeCart} className="btn-primary text-xs">
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <Link href={`/products/${item.handle}`} onClick={closeCart}>
                    <div className="w-20 h-24 bg-[#F8F6F3] relative flex-shrink-0 overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.handle}`} onClick={closeCart}>
                      <p className="text-sm font-medium text-[#0A0A0A] leading-tight hover:underline">{item.name}</p>
                    </Link>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">{item.variantTitle}</p>
                    <p className="text-sm font-semibold mt-1">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center border border-[#D4D4D4] hover:border-[#0A0A0A] transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center border border-[#D4D4D4] hover:border-[#0A0A0A] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-[#D4D4D4] hover:text-[#0A0A0A] transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#EDE9E3] px-6 py-5 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Subtotal</span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-[#6B6B6B]">Shipping and taxes calculated at checkout</p>
            <a
              href="/checkout"
              className="block w-full btn-primary text-center"
            >
              Checkout
            </a>
            <button onClick={closeCart} className="block w-full text-center text-sm text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors underline underline-offset-2">
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
