'use client';

import { useEffect, useRef } from 'react';

interface RevealSectionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a section and applies reveal-section animation on scroll.
 * Uses IntersectionObserver to add .visible class.
 */
export function RevealSection({ children, className }: RevealSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal-section ${className || ''}`}>
      {children}
    </div>
  );
}
