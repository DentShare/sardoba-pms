'use client';

export type { ThemePresetId, ThemeTokens, ThemeMode, HeroLayout, NavStyle, CardStyle } from './types';
export { BookingThemeProvider, useBookingTheme } from './ThemeProvider';
export { THEME_PRESETS, getThemeById, DEFAULT_THEME_ID } from './presets';

/* ── ThemeFonts: injects Google Fonts <link> for the active theme ────────── */
export { ThemeFonts } from './ThemeFonts';
