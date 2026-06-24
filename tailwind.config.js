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
          DEFAULT: '#1A73E8',
          50: '#E8F1FD',
          100: '#C5D9FA',
          500: '#1A73E8',
          600: '#1557B0',
          700: '#0F3E80',
        },
        accent: {
          DEFAULT: '#00C853',
          50: '#E0FFF0',
          500: '#00C853',
          600: '#00A844',
        },
        warning: {
          DEFAULT: '#FF6D00',
          500: '#FF6D00',
          600: '#E06200',
        },
        dark: {
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          hover: '#273548',
        },
        muted: '#94A3B8',
        'text-light': '#F8FAFC',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
        'card-gradient': 'linear-gradient(145deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.9) 100%)',
        'blue-gradient': 'linear-gradient(135deg, #1A73E8 0%, #0F3E80 100%)',
        'green-gradient': 'linear-gradient(135deg, #00C853 0%, #00A844 100%)',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(26, 115, 232, 0.3)',
        'glow-green': '0 0 20px rgba(0, 200, 83, 0.3)',
        'glow-orange': '0 0 20px rgba(255, 109, 0, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
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
