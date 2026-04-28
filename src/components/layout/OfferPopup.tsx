'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'zaro_offer_popup_dismissed';

export function OfferPopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => {
        setMounted(true);
        setOpen(true);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, '1');
    setTimeout(() => setMounted(false), 260);
  };

  if (!mounted) return null;

  return (
    <div className={`offer-popup-shell ${open ? 'is-open' : ''}`}>
      <button className="offer-popup-backdrop" onClick={close} aria-label="Close offer popup" />
      <div className="offer-popup-panel" role="dialog" aria-modal="true">
        <button className="offer-popup-close" onClick={close} aria-label="Close offer popup">
          <X className="w-4 h-4" />
        </button>
        <p className="text-xs uppercase tracking-[0.18em] text-[#6B6B6B] mb-2">Limited offer</p>
        <h3 className="font-serif text-2xl font-light mb-2">Extra 30% Off</h3>
        <p className="text-sm text-[#6B6B6B] mb-4">Use code FLASH30 on selected styles.</p>
        <input type="email" placeholder="Email Address" className="w-full border border-[#D4D4D4] px-3 py-2 text-sm mb-3 outline-none focus:border-[#0A0A0A]" />
        <button className="btn-primary w-full">Get Offer</button>
        <button className="w-full mt-2 text-xs text-[#6B6B6B] hover:text-[#0A0A0A]" onClick={close}>No thanks</button>
      </div>
    </div>
  );
}

