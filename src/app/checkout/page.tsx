'use client';
import { useCart } from '@/store/cart';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/data';

export default function CheckoutPage() {
  const { items } = useCart();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 200000 ? 0 : 9900;
  const total = subtotal + shipping;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl font-light mb-8">Checkout</h1>
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="space-y-5">
          <h2 className="font-semibold text-sm tracking-wide uppercase">Shipping Information</h2>
          <div className="grid grid-cols-2 gap-3">
            {['First Name','Last Name'].map(f=><input key={f} type="text" placeholder={f} className="border border-[#D4D4D4] px-4 py-3 text-sm outline-none focus:border-[#0A0A0A] w-full"/>)}
          </div>
          {['Email Address','Phone Number','Address Line 1','City','State','PIN Code'].map(f=>(
            <input key={f} type="text" placeholder={f} className="w-full border border-[#D4D4D4] px-4 py-3 text-sm outline-none focus:border-[#0A0A0A]"/>
          ))}
          <h2 className="font-semibold text-sm tracking-wide uppercase pt-4">Payment</h2>
          <div className="border border-[#D4D4D4] p-4 text-center text-sm text-[#6B6B6B]">
            <p className="font-medium mb-1">Pay via Razorpay</p>
            <p className="text-xs">UPI · Cards · Net Banking · Wallets</p>
          </div>
          <button className="btn-primary w-full">Pay {formatPrice(total)}</button>
          <p className="text-xs text-center text-[#6B6B6B]">
            Secure checkout powered by Razorpay. <Link href="/general/privacy-policy" className="underline">Privacy Policy</Link>
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-sm tracking-wide uppercase mb-5">Order Summary</h2>
          <div className="space-y-4 mb-6">
            {items.map(item=>(
              <div key={item.id} className="flex gap-4">
                <div className="relative w-16 h-20 bg-[#F8F6F3] flex-shrink-0 overflow-hidden">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px"/>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-[#6B6B6B]">{item.variantTitle} × {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-[#EDE9E3] pt-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-[#6B6B6B]">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#6B6B6B]">Shipping</span><span>{shipping===0?'Free':formatPrice(shipping)}</span></div>
            <div className="flex justify-between font-semibold border-t border-[#EDE9E3] pt-3 mt-2"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
