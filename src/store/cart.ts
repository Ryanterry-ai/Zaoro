'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant } from '@/types';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      addItem: (product, variant, quantity = 1) => {
        const cartId = `${product.id}-${variant.id}`;
        const existing = get().items.find(i => i.id === cartId);
        if (existing) {
          set(state => ({
            items: state.items.map(i =>
              i.id === cartId ? { ...i, quantity: i.quantity + quantity } : i
            ),
            isOpen: true,
          }));
        } else {
          set(state => ({
            items: [...state.items, {
              id: cartId,
              productId: product.id,
              variantId: variant.id,
              name: product.name,
              variantTitle: variant.title,
              price: variant.price,
              quantity,
              image: product.images[0],
              handle: product.handle,
            }],
            isOpen: true,
          }));
        }
      },
      removeItem: (id) => set(state => ({ items: state.items.filter(i => i.id !== id) })),
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set(state => ({
          items: state.items.map(i => i.id === id ? { ...i, quantity } : i),
        }));
      },
      clearCart: () => set({ items: [] }),
      get itemCount() { return get().items.reduce((sum, i) => sum + i.quantity, 0); },
      get subtotal() { return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0); },
    }),
    { name: 'truartz-cart' }
  )
);
