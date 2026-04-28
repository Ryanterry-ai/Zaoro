'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, Menu, X, ChevronDown } from 'lucide-react';
import { useCart } from '@/store/cart';
import type { NavigationData } from '@/types';

interface HeaderProps {
  navigation: NavigationData;
}

export function Header({ navigation }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { openCart, items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 bg-white transition-shadow duration-300 ${scrolled ? 'shadow-sm' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link href="/" className="font-serif text-2xl font-semibold tracking-wider text-[#0A0A0A]">
            ZARO
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navigation.main.map((item) => (
              item.children ? (
                <div key={item.id} className="relative group">
                  <button
                    className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A] hover:text-[#6B6B6B] transition-colors tracking-wide"
                  >
                    {item.label}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {/* Dropdown */}
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
                  >
                    <div className="bg-white border border-[#EDE9E3] shadow-lg min-w-[180px] py-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.id}
                          href={child.url}
                          className="block px-5 py-2.5 text-sm text-[#0A0A0A] hover:bg-[#F8F6F3] transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.id}
                  href={item.url}
                  className="text-sm font-medium text-[#0A0A0A] hover:text-[#6B6B6B] transition-colors tracking-wide"
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-4">
            <button className="hidden lg:block text-[#0A0A0A] hover:text-[#6B6B6B] transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={openCart} className="relative text-[#0A0A0A] hover:text-[#6B6B6B] transition-colors">
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#0A0A0A] text-white text-[10px] font-medium w-4 h-4 flex items-center justify-center rounded-full">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              className="lg:hidden text-[#0A0A0A]"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#EDE9E3] bg-white">
          <div className="px-4 py-4 space-y-1">
            {navigation.main.map((item) => (
              <div key={item.id}>
                <Link
                  href={item.url === '#' ? '#' : item.url}
                  className="block py-2.5 text-sm font-medium text-[#0A0A0A] tracking-wide"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="pl-4 space-y-1 pb-2">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.url}
                        className="block py-2 text-sm text-[#6B6B6B]"
                        onClick={() => setMobileOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
