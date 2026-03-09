import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        sardoba: {
          gold: '#D4A843',
          'gold-light': '#E8C97A',
          'gold-dark': '#B8902F',
          blue: '#1E3A5F',
          'blue-light': '#2A4F7F',
          'blue-dark': '#152B47',
          sand: '#F5E6C8',
          'sand-light': '#FFF5E4',
          'sand-dark': '#E5D0A8',
          dark: '#1A1A2E',
          'dark-light': '#252545',
          cream: '#FFFDF7',
          accent: '#E8673C',
        },
        // Theme-driven booking page tokens (CSS custom properties)
        't': {
          primary: 'var(--t-primary)',
          'primary-light': 'var(--t-primary-light)',
          'primary-dark': 'var(--t-primary-dark)',
          secondary: 'var(--t-secondary)',
          bg: 'var(--t-bg)',
          'bg-alt': 'var(--t-bg-alt)',
          surface: 'var(--t-surface)',
          'surface-hover': 'var(--t-surface-hover)',
          text: 'var(--t-text)',
          'text-muted': 'var(--t-text-muted)',
          'text-subtle': 'var(--t-text-subtle)',
          'input-bg': 'var(--t-input-bg)',
          'input-border': 'var(--t-input-border)',
          'nav-bg': 'var(--t-nav-bg)',
          'nav-text': 'var(--t-nav-text)',
          'footer-bg': 'var(--t-footer-bg)',
          'footer-text': 'var(--t-footer-text)',
          'border-subtle': 'var(--t-border-subtle)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-slow': 'float 8s ease-in-out 1s infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
        'spin-slow': 'spin 20s linear infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'slide-in-left': 'slideInLeft 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.6s ease-out forwards',
        'morph': 'morph 8s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'border-flow': 'borderFlow 3s linear infinite',
        'tilt-in': 'tiltIn 0.8s ease-out forwards',
        'counter-spin': 'spin 15s linear infinite reverse',
        'orbit': 'orbit 20s linear infinite',
        'orbit-reverse': 'orbit 25s linear infinite reverse',
        'ripple': 'ripple 1s ease-out',
        'text-glow': 'textGlow 3s ease-in-out infinite',
        'draw-line': 'drawLine 1.5s ease-out forwards',
        'float-x': 'floatX 7s ease-in-out infinite',
        'scale-pulse': 'scalePulse 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(3deg)' },
        },
        floatX: {
          '0%, 100%': { transform: 'translateX(0px) translateY(0px)' },
          '25%': { transform: 'translateX(10px) translateY(-10px)' },
          '50%': { transform: 'translateX(-5px) translateY(-20px)' },
          '75%': { transform: 'translateX(-10px) translateY(-5px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 168, 67, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(212, 168, 67, 0.6)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        morph: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '300% 50%' },
        },
        tiltIn: {
          '0%': { opacity: '0', transform: 'perspective(800px) rotateX(10deg) translateY(40px)' },
          '100%': { opacity: '1', transform: 'perspective(800px) rotateX(0deg) translateY(0)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(150px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(150px) rotate(-360deg)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        textGlow: {
          '0%, 100%': { textShadow: '0 0 20px rgba(212, 168, 67, 0.3)' },
          '50%': { textShadow: '0 0 40px rgba(212, 168, 67, 0.6), 0 0 80px rgba(212, 168, 67, 0.2)' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        scalePulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': 'linear-gradient(135deg, #1A1A2E 0%, #1E3A5F 50%, #152B47 100%)',
        'mesh-gradient': 'radial-gradient(at 40% 20%, rgba(212, 168, 67, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(30, 58, 95, 0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(212, 168, 67, 0.1) 0px, transparent 50%), radial-gradient(at 80% 50%, rgba(30, 58, 95, 0.15) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(212, 168, 67, 0.1) 0px, transparent 50%)',
      },
      boxShadow: {
        'glow-gold': '0 0 30px rgba(212, 168, 67, 0.3)',
        'glow-gold-lg': '0 0 60px rgba(212, 168, 67, 0.4), 0 0 120px rgba(212, 168, 67, 0.1)',
        'glow-blue': '0 0 30px rgba(30, 58, 95, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 12px 40px rgba(0, 0, 0, 0.12)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'premium': '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 30px rgba(212, 168, 67, 0.1)',
        'inner-glow': 'inset 0 1px 1px rgba(255, 255, 255, 0.1)',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth-out': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
};

export default config;
