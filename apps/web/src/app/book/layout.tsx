import type { ReactNode } from 'react';

/**
 * Layout for public booking pages.
 * No sidebar, no dashboard header -- just a clean, minimal wrapper.
 * Background is handled by ThemeProvider in child pages, so no hardcoded bg here.
 */
export default function BookLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
