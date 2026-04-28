'use client';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

export function Reveal({ children, className = '', delayMs = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.18 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`motion-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delayMs}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
