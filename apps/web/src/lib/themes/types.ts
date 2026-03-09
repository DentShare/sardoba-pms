// ─── Theme System Types ─────────────────────────────────────────────────────
// Phase 1: Foundation for themeable booking pages

export type ThemePresetId =
  | 'silk-road-luxury'
  | 'cozy-guest-house'
  | 'modern-clean'
  | 'fresh-green'
  | 'minimal-white';

export type ThemeMode = 'dark' | 'light';

export type HeroLayout = 'centered' | 'split-grid' | 'minimal-bar';

export type NavStyle = 'glass-dark' | 'glass-light' | 'transparent-scroll';

export type CardStyle = 'glass-dark' | 'glass-light' | 'flat' | 'elevated';

export type ExtrasLayout = 'grid' | 'list';

export type RoomCardVariant = 'default' | 'eco' | 'numbered' | 'gold-accent';

export interface ThemeTokens {
  id: ThemePresetId;
  name: string;
  description: string;
  mode: ThemeMode;
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    background: string;
    backgroundAlt: string;
    surface: string;
    surfaceHover: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    navBg: string;
    navText: string;
    navTextHover: string;
    footerBg: string;
    footerText: string;
    inputBg: string;
    inputBorder: string;
    inputFocus: string;
    borderSubtle: string;
    error: string;
    success: string;
  };
  fonts: {
    heading: string;
    body: string;
    googleFontsUrl: string;
  };
  shape: {
    cardRadius: string;
    buttonRadius: string;
    inputRadius: string;
    badgeRadius: string;
  };
  layout: {
    hero: HeroLayout;
    heroMinHeight: string;
    heroOverlayGradient: string;
    navStyle: NavStyle;
    cardStyle: CardStyle;
    extrasLayout: ExtrasLayout;
    roomCardVariant: RoomCardVariant;
  };
  effects: {
    noiseTexture: boolean;
    backgroundPattern: string | null;
    cardShadow: string;
    cardHoverShadow: string;
    buttonHoverTransform: string;
    sectionRevealAnimation: 'fadeUp' | 'fadeIn' | 'none';
  };
}
