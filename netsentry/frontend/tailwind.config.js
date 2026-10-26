/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eefbff',
          100: '#d9f5ff',
          200: '#b2ecff',
          300: '#7ce1ff',
          400: '#3dccff',
          500: '#14b3f5',
          600: '#0090d1',
          700: '#0073a8',
          800: '#046189',
          900: '#0a5172',
          950: '#06334d',
        },
        surface: {
          DEFAULT: '#0f1117',
          50: '#1a1d27',
          100: '#232634',
          200: '#2d3143',
          300: '#383c52',
          400: '#444861',
        },
        accent: {
          green:  '#22d3a0',
          yellow: '#f5c518',
          red:    '#f04f5e',
          orange: '#f97316',
          purple: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-in':   'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { transform: 'translateY(-8px)', opacity: '0' },
                   to:   { transform: 'translateY(0)',    opacity: '1' } },
      },
    },
  },
  plugins: [],
}
