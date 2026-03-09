'use client';

/* ── Theme Preset Types ─────────────────────────────────────────────────── */

export interface ThemePresetOption {
  id: string;
  name: string;
  description: string;
  preview: {
    bg: string;
    accent: string;
    text: string;
    mode: 'dark' | 'light';
  };
}

/* ── Theme Presets ───────────────────────────────────────────────────────── */

export const THEME_PRESET_OPTIONS: ThemePresetOption[] = [
  {
    id: 'modern-clean',
    name: 'Современный',
    description: 'Универсальный стиль для любого отеля',
    preview: { bg: '#FFFDF7', accent: '#D4A843', text: '#1A1A2E', mode: 'light' },
  },
  {
    id: 'silk-road-luxury',
    name: 'Шёлковый путь',
    description: 'Роскошный тёмный стиль для бутик-отелей',
    preview: { bg: '#0A0A08', accent: '#C9A96E', text: '#F0EDE6', mode: 'dark' },
  },
  {
    id: 'cozy-guest-house',
    name: 'Уютный дом',
    description: 'Тёплый стиль для гостевых домов и B&B',
    preview: { bg: '#FAF7F2', accent: '#C4704A', text: '#3A2E1E', mode: 'light' },
  },
  {
    id: 'fresh-green',
    name: 'Свежий сад',
    description: 'Эко-стиль для загородных и эко-отелей',
    preview: { bg: '#F0F7F2', accent: '#2D7A4F', text: '#1A2E1F', mode: 'light' },
  },
  {
    id: 'minimal-white',
    name: 'Минимал',
    description: 'Лаконичный стиль для хостелов и апартаментов',
    preview: { bg: '#FFFFFF', accent: '#1A1A1A', text: '#1A1A1A', mode: 'light' },
  },
];

/* ── ThemePresetCard Component ──────────────────────────────────────────── */

interface ThemePresetCardProps {
  preset: ThemePresetOption;
  selected: boolean;
  onSelect: () => void;
}

export function ThemePresetCard({ preset, selected, onSelect }: ThemePresetCardProps) {
  const { preview } = preset;

  // Derive secondary colors for the preview strips
  const heroBg = preview.mode === 'dark'
    ? preview.bg
    : darken(preview.bg, 0.03);
  const cardBg = preview.mode === 'dark'
    ? lighten(preview.bg, 0.08)
    : preview.bg;
  const footerBg = preview.mode === 'dark'
    ? lighten(preview.bg, 0.04)
    : darken(preview.bg, 0.05);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        relative rounded-xl border-2 overflow-hidden transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${selected
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      {/* Selected checkmark badge */}
      {selected && (
        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Mini preview block */}
      <div className="h-[120px] flex flex-col">
        {/* Top strip: hero bg + accent line */}
        <div
          className="flex-[3] relative"
          style={{ backgroundColor: heroBg }}
        >
          {/* Accent line at bottom of hero */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ backgroundColor: preview.accent }}
          />
          {/* Small hotel icon silhouette */}
          <div className="flex items-center justify-center h-full">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={preview.accent}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.6}
            >
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4" />
              <path d="M8 6h.01" /><path d="M16 6h.01" />
              <path d="M8 10h.01" /><path d="M16 10h.01" />
              <path d="M8 14h.01" /><path d="M16 14h.01" />
            </svg>
          </div>
        </div>

        {/* Middle strip: card bg with text placeholder */}
        <div
          className="flex-[2] flex items-center px-3 gap-2"
          style={{ backgroundColor: cardBg }}
        >
          <div
            className="h-2 rounded-full flex-1 max-w-[60%] opacity-40"
            style={{ backgroundColor: preview.text }}
          />
          <div
            className="h-2 rounded-full w-8 opacity-25"
            style={{ backgroundColor: preview.text }}
          />
        </div>

        {/* Bottom strip: footer bg with accent button placeholder */}
        <div
          className="flex-[1.5] flex items-center justify-end px-3"
          style={{ backgroundColor: footerBg }}
        >
          <div
            className="h-3 w-14 rounded-sm"
            style={{ backgroundColor: preview.accent }}
          />
        </div>
      </div>

      {/* Theme name and description */}
      <div className="px-3 py-2.5 bg-white text-left">
        <p className="text-sm font-medium text-gray-900">{preset.name}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{preset.description}</p>
      </div>
    </button>
  );
}

/* ── Color utility helpers ──────────────────────────────────────────────── */

/**
 * Simple hex color darkening: mixes toward black by `amount` (0-1).
 */
function darken(hex: string, amount: number): string {
  return mixColor(hex, '#000000', amount);
}

/**
 * Simple hex color lightening: mixes toward white by `amount` (0-1).
 */
function lighten(hex: string, amount: number): string {
  return mixColor(hex, '#FFFFFF', amount);
}

/**
 * Mix two hex colors by a given ratio (0 = all color1, 1 = all color2).
 */
function mixColor(hex1: string, hex2: string, ratio: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
