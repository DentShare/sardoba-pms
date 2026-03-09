import type { ThemePresetId, ThemeTokens } from './types';

// ─── Silk Road Luxury ───────────────────────────────────────────────────────
// Dark mode, gold accents, inspired by 15-booking-widget/hotel-site-prototype.html
const silkRoadLuxury: ThemeTokens = {
  id: 'silk-road-luxury',
  name: 'Silk Road Luxury',
  description: 'Dark elegant theme with gold accents, inspired by Uzbek Silk Road heritage',
  mode: 'dark',
  colors: {
    primary: '#C9A96E',
    primaryLight: '#E8D5A3',
    primaryDark: '#8B6914',
    secondary: '#5A4A2E',
    background: '#0A0A08',
    backgroundAlt: '#131310',
    surface: 'rgba(255, 255, 255, 0.06)',
    surfaceHover: 'rgba(255, 255, 255, 0.10)',
    text: '#F0EDE6',
    textMuted: '#8A8778',
    textSubtle: '#5A5A50',
    navBg: 'rgba(10, 10, 8, 0.85)',
    navText: '#F0EDE6',
    navTextHover: '#C9A96E',
    footerBg: '#0A0A08',
    footerText: '#8A8778',
    inputBg: 'rgba(255, 255, 255, 0.06)',
    inputBorder: 'rgba(201, 169, 110, 0.25)',
    inputFocus: 'rgba(201, 169, 110, 0.25)',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    error: '#E05252',
    success: '#4CAF50',
  },
  fonts: {
    heading: "'Cormorant Garamond', serif",
    body: "'Montserrat', sans-serif",
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap',
  },
  shape: {
    cardRadius: '0px',
    buttonRadius: '0px',
    inputRadius: '0px',
    badgeRadius: '0px',
  },
  layout: {
    hero: 'centered',
    heroMinHeight: '100vh',
    heroOverlayGradient:
      'linear-gradient(180deg, rgba(10,10,8,0.4) 0%, rgba(10,10,8,0.7) 60%, #0A0A08 100%)',
    navStyle: 'glass-dark',
    cardStyle: 'glass-dark',
    extrasLayout: 'grid',
    roomCardVariant: 'gold-accent',
  },
  effects: {
    noiseTexture: true,
    backgroundPattern: null,
    cardShadow: '0 0 30px rgba(201, 169, 110, 0.08)',
    cardHoverShadow: '0 0 40px rgba(201, 169, 110, 0.15)',
    buttonHoverTransform: 'translateY(-2px)',
    sectionRevealAnimation: 'fadeUp',
  },
};

// ─── Cozy Guest House ───────────────────────────────────────────────────────
// Light mode, warm terracotta + green, from 15-booking-widget/hotel-site-cozy.html
const cozyGuestHouse: ThemeTokens = {
  id: 'cozy-guest-house',
  name: 'Cozy Guest House',
  description: 'Warm terracotta and green theme for boutique guest houses',
  mode: 'light',
  colors: {
    primary: '#C4704A',
    primaryLight: '#D4845C',
    primaryDark: '#A85B38',
    secondary: '#4A7C59',
    background: '#FAF7F2',
    backgroundAlt: '#F3EDE3',
    surface: '#FFFFFF',
    surfaceHover: '#F9F5EE',
    text: '#3A2E1E',
    textMuted: '#6B5A3E',
    textSubtle: '#9C8A6E',
    navBg: 'rgba(250, 247, 242, 0.92)',
    navText: '#3A2E1E',
    navTextHover: '#C4704A',
    footerBg: '#2C2416',
    footerText: '#9C8A6E',
    inputBg: '#FFFFFF',
    inputBorder: '#EDE4D4',
    inputFocus: 'rgba(196, 112, 74, 0.20)',
    borderSubtle: '#EDE4D4',
    error: '#D84315',
    success: '#4A7C59',
  },
  fonts: {
    heading: "'Fraunces', serif",
    body: "'Plus Jakarta Sans', sans-serif",
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap',
  },
  shape: {
    cardRadius: '16px',
    buttonRadius: '16px',
    inputRadius: '12px',
    badgeRadius: '999px',
  },
  layout: {
    hero: 'split-grid',
    heroMinHeight: '100vh',
    heroOverlayGradient:
      'linear-gradient(135deg, rgba(250,247,242,0.85) 0%, rgba(250,247,242,0.6) 100%)',
    navStyle: 'transparent-scroll',
    cardStyle: 'elevated',
    extrasLayout: 'grid',
    roomCardVariant: 'default',
  },
  effects: {
    noiseTexture: false,
    backgroundPattern: null,
    cardShadow: '0 4px 20px rgba(44, 36, 22, 0.06)',
    cardHoverShadow: '0 12px 36px rgba(44, 36, 22, 0.12)',
    buttonHoverTransform: 'translateY(-2px)',
    sectionRevealAnimation: 'fadeUp',
  },
};

// ─── Modern Clean ───────────────────────────────────────────────────────────
// Light mode, matches current production Sardoba style (gold + dark blue)
const modernClean: ThemeTokens = {
  id: 'modern-clean',
  name: 'Modern Clean',
  description: 'Clean professional style matching the current Sardoba dashboard aesthetic',
  mode: 'light',
  colors: {
    primary: '#D4A843',
    primaryLight: '#E8C97A',
    primaryDark: '#B8902F',
    secondary: '#1E3A5F',
    background: '#FFFDF7',
    backgroundAlt: '#F5F0E8',
    surface: '#FFFFFF',
    surfaceHover: '#FAFAF5',
    text: '#1A1A2E',
    textMuted: '#5A5A6E',
    textSubtle: '#8A8A9E',
    navBg: 'rgba(26, 26, 46, 0.85)',
    navText: '#F0EDE6',
    navTextHover: '#D4A843',
    footerBg: '#1A1A2E',
    footerText: '#8A8A9E',
    inputBg: '#FFFFFF',
    inputBorder: '#E0DDD5',
    inputFocus: 'rgba(212, 168, 67, 0.20)',
    borderSubtle: '#E8E5DD',
    error: '#E05252',
    success: '#22C55E',
  },
  fonts: {
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    googleFontsUrl: '', // Inter is already loaded globally
  },
  shape: {
    cardRadius: '12px',
    buttonRadius: '12px',
    inputRadius: '10px',
    badgeRadius: '999px',
  },
  layout: {
    hero: 'centered',
    heroMinHeight: '70vh',
    heroOverlayGradient:
      'linear-gradient(135deg, rgba(26,26,46,0.7) 0%, rgba(30,58,95,0.6) 50%, rgba(21,43,71,0.7) 100%)',
    navStyle: 'glass-dark',
    cardStyle: 'elevated',
    extrasLayout: 'grid',
    roomCardVariant: 'default',
  },
  effects: {
    noiseTexture: false,
    backgroundPattern:
      "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4A843' fill-opacity='0.06'%3E%3Cpath d='M30 0l30 30-30 30L0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
    cardShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
    cardHoverShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
    buttonHoverTransform: 'translateY(-1px)',
    sectionRevealAnimation: 'fadeUp',
  },
};

// ─── Fresh Green ────────────────────────────────────────────────────────────
// Light mode, eco / garden hotel aesthetic
const freshGreen: ThemeTokens = {
  id: 'fresh-green',
  name: 'Fresh Green',
  description: 'Eco-friendly green theme for garden hotels and nature retreats',
  mode: 'light',
  colors: {
    primary: '#2D7A4F',
    primaryLight: '#3D9463',
    primaryDark: '#1F5C3A',
    secondary: '#7CB68A',
    background: '#F0F7F2',
    backgroundAlt: '#E4EFE7',
    surface: '#FFFFFF',
    surfaceHover: '#F5FAF6',
    text: '#1A2E1F',
    textMuted: '#4A6B52',
    textSubtle: '#7A9A82',
    navBg: 'rgba(240, 247, 242, 0.92)',
    navText: '#1A2E1F',
    navTextHover: '#2D7A4F',
    footerBg: '#1A2E1F',
    footerText: '#7A9A82',
    inputBg: '#FFFFFF',
    inputBorder: '#D4E5D8',
    inputFocus: 'rgba(45, 122, 79, 0.20)',
    borderSubtle: '#D4E5D8',
    error: '#D84315',
    success: '#2D7A4F',
  },
  fonts: {
    heading: "'Playfair Display', serif",
    body: "'DM Sans', sans-serif",
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap',
  },
  shape: {
    cardRadius: '12px',
    buttonRadius: '12px',
    inputRadius: '10px',
    badgeRadius: '999px',
  },
  layout: {
    hero: 'minimal-bar',
    heroMinHeight: '60vh',
    heroOverlayGradient:
      'linear-gradient(180deg, rgba(26,46,31,0.4) 0%, rgba(26,46,31,0.65) 100%)',
    navStyle: 'glass-light',
    cardStyle: 'elevated',
    extrasLayout: 'grid',
    roomCardVariant: 'eco',
  },
  effects: {
    noiseTexture: false,
    backgroundPattern:
      "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232D7A4F' fill-opacity='0.04'%3E%3Cpath d='M40 10c-2 8-8 14-16 16 8 2 14 8 16 16 2-8 8-14 16-16-8-2-14-8-16-16z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
    cardShadow: '0 4px 20px rgba(26, 46, 31, 0.06)',
    cardHoverShadow: '0 12px 36px rgba(26, 46, 31, 0.10)',
    buttonHoverTransform: 'translateY(-1px)',
    sectionRevealAnimation: 'fadeIn',
  },
};

// ─── Minimal White ──────────────────────────────────────────────────────────
// Light mode, hostel/budget, near-monochrome
const minimalWhite: ThemeTokens = {
  id: 'minimal-white',
  name: 'Minimal White',
  description: 'Clean monochrome theme for hostels and budget-friendly accommodations',
  mode: 'light',
  colors: {
    primary: '#1A1A1A',
    primaryLight: '#333333',
    primaryDark: '#000000',
    secondary: '#666666',
    background: '#FFFFFF',
    backgroundAlt: '#F5F5F5',
    surface: '#FAFAFA',
    surfaceHover: '#F0F0F0',
    text: '#1A1A1A',
    textMuted: '#666666',
    textSubtle: '#999999',
    navBg: 'rgba(255, 255, 255, 0.95)',
    navText: '#1A1A1A',
    navTextHover: '#333333',
    footerBg: '#1A1A1A',
    footerText: '#999999',
    inputBg: '#FFFFFF',
    inputBorder: '#E5E5E5',
    inputFocus: 'rgba(26, 26, 26, 0.12)',
    borderSubtle: '#E5E5E5',
    error: '#DC2626',
    success: '#16A34A',
  },
  fonts: {
    heading: "'Space Grotesk', sans-serif",
    body: "'Space Grotesk', sans-serif",
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
  },
  shape: {
    cardRadius: '8px',
    buttonRadius: '8px',
    inputRadius: '6px',
    badgeRadius: '4px',
  },
  layout: {
    hero: 'minimal-bar',
    heroMinHeight: '50vh',
    heroOverlayGradient:
      'linear-gradient(180deg, rgba(26,26,26,0.3) 0%, rgba(26,26,26,0.6) 100%)',
    navStyle: 'glass-light',
    cardStyle: 'flat',
    extrasLayout: 'list',
    roomCardVariant: 'numbered',
  },
  effects: {
    noiseTexture: false,
    backgroundPattern: null,
    cardShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
    cardHoverShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    buttonHoverTransform: 'none',
    sectionRevealAnimation: 'none',
  },
};

// ─── Exports ────────────────────────────────────────────────────────────────

export const THEME_PRESETS: Record<ThemePresetId, ThemeTokens> = {
  'silk-road-luxury': silkRoadLuxury,
  'cozy-guest-house': cozyGuestHouse,
  'modern-clean': modernClean,
  'fresh-green': freshGreen,
  'minimal-white': minimalWhite,
};

export function getThemeById(id: ThemePresetId): ThemeTokens {
  return THEME_PRESETS[id];
}

/** Default theme preset */
export const DEFAULT_THEME_ID: ThemePresetId = 'modern-clean';
