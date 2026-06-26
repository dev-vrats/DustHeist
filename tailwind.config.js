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
          50: '#F0F7FA',
          100: '#E1EFF5',
          400: '#B2D5E5',
          500: '#B2D5E5',
          600: '#9DBFD0',
          700: '#8AA8B8',
        },
        accent: {
          DEFAULT: '#B2D5E5', // Also Candy Blue for accents
          50: '#F0F7FA',
          500: '#B2D5E5',
          600: '#9DBFD0',
        },
        warning: {
          DEFAULT: '#FF6D00',
          500: '#FF6D00',
          600: '#E06200',
        },
        dark: {
          bg: '#020202', // Onyx
          card: 'rgba(255, 255, 255, 0.03)', // Liquid Glass base
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.06)',
        },
        muted: '#A0AAB5',
        'text-light': '#FFFFFF',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #020202 0%, #0A0F14 50%, #020202 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
        'blue-gradient': 'linear-gradient(135deg, #B2D5E5 0%, #8AA8B8 100%)',
        'green-gradient': 'linear-gradient(135deg, #B2D5E5 0%, #8AA8B8 100%)',
      },
      boxShadow: {
        'glow-blue': '0 0 25px rgba(178, 213, 229, 0.4)',
        'glow-green': '0 0 25px rgba(178, 213, 229, 0.4)',
        'glow-orange': '0 0 25px rgba(255, 109, 0, 0.3)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.5)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      animation: {
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.5)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
