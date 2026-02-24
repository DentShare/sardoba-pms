import type { ReactNode } from 'react';

/**
 * Layout for public booking pages.
 * No sidebar, no dashboard header -- just a clean, minimal wrapper.
 */
export default function BookLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-sardoba-cream">
      {children}
    </div>
  );
}
