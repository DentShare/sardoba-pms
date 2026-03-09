'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { ThemeTokens, ThemePresetId } from './types';
import { getThemeById, DEFAULT_THEME_ID } from './presets';

// ─── Context ────────────────────────────────────────────────────────────────

interface BookingThemeContextValue {
  theme: ThemeTokens;
  isDark: boolean;
}

const BookingThemeContext = createContext<BookingThemeContextValue | null>(null);

// ─── CSS Variable Conversion ────────────────────────────────────────────────

/**
 * Converts ThemeTokens into a flat Record of CSS custom properties.
 * All color tokens become `--t-*`, plus shape/effect/font tokens.
 */
function themeToCssVars(
  theme: ThemeTokens,
  primaryColorOverride?: string,
): Record<string, string> {
  const c = { ...theme.colors };

  // Apply primary color override if provided
  if (primaryColorOverride) {
    c.primary = primaryColorOverride;
  }

  return {
    // Colors
    '--t-primary': c.primary,
    '--t-primary-light': c.primaryLight,
    '--t-primary-dark': c.primaryDark,
    '--t-secondary': c.secondary,
    '--t-bg': c.background,
    '--t-bg-alt': c.backgroundAlt,
    '--t-surface': c.surface,
    '--t-surface-hover': c.surfaceHover,
    '--t-text': c.text,
    '--t-text-muted': c.textMuted,
    '--t-text-subtle': c.textSubtle,
    '--t-nav-bg': c.navBg,
    '--t-nav-text': c.navText,
    '--t-nav-text-hover': c.navTextHover,
    '--t-footer-bg': c.footerBg,
    '--t-footer-text': c.footerText,
    '--t-input-bg': c.inputBg,
    '--t-input-border': c.inputBorder,
    '--t-input-focus': c.inputFocus,
    '--t-border-subtle': c.borderSubtle,
    '--t-error': c.error,
    '--t-success': c.success,

    // Fonts
    '--t-font-heading': theme.fonts.heading,
    '--t-font-body': theme.fonts.body,

    // Shape
    '--t-card-radius': theme.shape.cardRadius,
    '--t-btn-radius': theme.shape.buttonRadius,
    '--t-input-radius': theme.shape.inputRadius,
    '--t-badge-radius': theme.shape.badgeRadius,

    // Layout
    '--t-hero-min-height': theme.layout.heroMinHeight,
    '--t-hero-overlay': theme.layout.heroOverlayGradient,

    // Effects
    '--t-card-shadow': theme.effects.cardShadow,
    '--t-card-hover-shadow': theme.effects.cardHoverShadow,
    '--t-btn-hover-transform': theme.effects.buttonHoverTransform,
  };
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface BookingThemeProviderProps {
  /** Theme preset ID. Defaults to 'modern-clean'. */
  themeId?: ThemePresetId;
  /** Override the primary color (e.g. from property config). */
  primaryColorOverride?: string;
  children: React.ReactNode;
}

export function BookingThemeProvider({
  themeId = DEFAULT_THEME_ID,
  primaryColorOverride,
  children,
}: BookingThemeProviderProps) {
  const theme = useMemo(() => getThemeById(themeId), [themeId]);

  const cssVars = useMemo(
    () => themeToCssVars(theme, primaryColorOverride),
    [theme, primaryColorOverride],
  );

  const contextValue = useMemo<BookingThemeContextValue>(
    () => ({
      theme,
      isDark: theme.mode === 'dark',
    }),
    [theme],
  );

  return (
    <BookingThemeContext.Provider value={contextValue}>
      <div
        style={cssVars as React.CSSProperties}
        data-theme-mode={theme.mode}
        data-theme-id={theme.id}
      >
        {children}
      </div>
    </BookingThemeContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Access the current booking theme context.
 * Must be used within a <BookingThemeProvider>.
 */
export function useBookingTheme(): BookingThemeContextValue {
  const ctx = useContext(BookingThemeContext);
  if (!ctx) {
    throw new Error(
      'useBookingTheme must be used within a <BookingThemeProvider>',
    );
  }
  return ctx;
}
