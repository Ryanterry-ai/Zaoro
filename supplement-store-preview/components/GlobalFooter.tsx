'use client';
import React from 'react';
import Link from 'next/link';

export default function GlobalFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">© {new Date().getFullYear()} NutriMart. All rights reserved.</p>
        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <Link href="/privacy" className="hover:text-zinc-300 transition">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-300 transition">Terms</Link>
          <Link href="/contact" className="hover:text-zinc-300 transition">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
