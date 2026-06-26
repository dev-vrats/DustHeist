/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#B2D5E5', // Candy Blue
          50: '#F5FAFB',
          100: '#E8F4F8',
          200: '#D5EAF2',
          300: '#C2DFEB',
          400: '#B2D5E5',
          500: '#B2D5E5',
          600: '#8BBDD2',
          700: '#6AA3BD',
          800: '#4F8DA8',
          900: '#3A758F',
        },
        accent: {
          DEFAULT: '#B2D5E5',
          50: '#F5FAFB',
          500: '#B2D5E5',
          600: '#8BBDD2',
        },
        warning: {
          DEFAULT: '#F59E0B',
          500: '#F59E0B',
          600: '#D97706',
        },
        danger: {
          DEFAULT: '#EF4444',
          500: '#EF4444',
          600: '#DC2626',
        },
        // Spatial depth layers — Onyx base
        dark: {
          bg: '#020202',       // Onyx — deepest layer
          depth1: '#080C10',   // 1st depth layer
          depth2: '#0D1520',   // 2nd depth layer  
          depth3: '#111E2E',   // 3rd depth layer (cards)
          card: '#0F1A26',     // Card surface
          border: 'rgba(178, 213, 229, 0.08)', // Candy Blue tinted border
          hover: '#162234',
        },
        muted: '#7C8FA0',
        'text-light': '#FFFFFF',
        'text-secondary': '#C5D5E0',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'spatial-bg': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(178,213,229,0.07) 0%, transparent 60%), linear-gradient(180deg, #020202 0%, #04080D 100%)',
        'candy-gradient': 'linear-gradient(135deg, #B2D5E5 0%, #8BBDD2 50%, #6AA3BD 100%)',
        'spatial-card': 'linear-gradient(145deg, rgba(178,213,229,0.06) 0%, rgba(178,213,229,0.02) 100%)',
        'depth-gradient': 'linear-gradient(180deg, rgba(178,213,229,0.04) 0%, rgba(0,0,0,0) 100%)',
      },
      boxShadow: {
        // Spatial elevation system
        'spatial-sm':  '0 2px 8px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(178,213,229,0.08)',
        'spatial-md':  '0 4px 20px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(178,213,229,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
        'spatial-lg':  '0 8px 40px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(178,213,229,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
        'spatial-xl':  '0 20px 60px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(178,213,229,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
        'candy-glow':  '0 0 20px rgba(178,213,229,0.25), 0 0 60px rgba(178,213,229,0.08)',
        'candy-glow-lg': '0 0 40px rgba(178,213,229,0.35), 0 0 80px rgba(178,213,229,0.12)',
        'inner-glow':  'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3)',
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
        '5xl': '2rem',
      },
      animation: {
        'pulse-dot':    'pulseDot 2s ease-in-out infinite',
        'fade-in':      'fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-up':     'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
        'slide-down':   'slideDown 0.4s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':     'scaleIn 0.35s cubic-bezier(0.16,1,0.3,1)',
        'float':        'float 4s ease-in-out infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'liquid-fill':  'liquidFill 0.6s cubic-bezier(0.16,1,0.3,1)',
        'ripple':       'ripple 0.6s linear',
        'glow-pulse':   'glowPulse 2.5s ease-in-out infinite',
        'spin-slow':    'spin 3s linear infinite',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.4', transform: 'scale(1.5)' },
        },
        fadeIn: {
          from: { opacity: '0', filter: 'blur(4px)' },
          to:   { opacity: '1', filter: 'blur(0px)' },
        },
        slideUp: {
          from: { transform: 'translateY(24px)', opacity: '0' },
          to:   { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-16px)', opacity: '0' },
          to:   { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.92)', opacity: '0' },
          to:   { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        liquidFill: {
          '0%':   { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        ripple: {
          '0%':   { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(178,213,229,0.2)' },
          '50%':      { boxShadow: '0 0 40px rgba(178,213,229,0.4), 0 0 80px rgba(178,213,229,0.15)' },
        },
      },
      backdropBlur: {
        xs:  '2px',
        '4xl': '72px',
      },
      transitionTimingFunction: {
        'spatial': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
