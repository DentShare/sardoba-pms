'use client';

import { useEffect } from 'react';
import { useBookingTheme } from './ThemeProvider';

/**
 * Dynamically loads Google Fonts required by the current theme.
 *
 * Inserts a <link> tag into document.head. Uses a stable `id` attribute
 * to avoid duplicate <link> elements when the component re-renders.
 *
 * Must be rendered inside a <BookingThemeProvider>.
 */
export function ThemeFonts() {
  const { theme } = useBookingTheme();
  const fontsUrl = theme.fonts.googleFontsUrl;

  useEffect(() => {
    // Skip if no fonts URL (e.g. modern-clean uses already-loaded Inter)
    if (!fontsUrl) return;

    const linkId = `theme-fonts-${theme.id}`;
    const existing = document.getElementById(linkId);

    if (existing) {
      // Link already present, nothing to do
      return;
    }

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = fontsUrl;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // Cleanup: remove the <link> when the theme changes or component unmounts
    return () => {
      const el = document.getElementById(linkId);
      if (el) {
        el.remove();
      }
    };
  }, [fontsUrl, theme.id]);

  return null;
}
