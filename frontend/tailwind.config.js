/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* Brand: Primary #005EB8, Secondary #546E7A, Tertiary #00897B, Neutral #F5F7FA */
        "primary": "#005EB8",
        "primary-hover": "#004985",
        "primary-dark": "#003d7a",
        "primary-register": "#18181b",
        "primary-register-hover": "#27272a",
        "tertiary": "#00897B",
        "tertiary-hover": "#00796B",
        "background-light": "#F5F7FA",
        "background-light-gray": "#F5F7FA",
        "background-dark": "#101922",
        "surface-light": "#ffffff",
        "border-light": "#e2e8f0",
        "text-main": "#111827",
        "text-muted": "#546E7A",
        "accent": "#546E7A",
        "secondary-text": "#546E7A",
        "accent-border": "#e2e8f0",
        "subtle-bg": "#F5F7FA",
        "card-bg": "#ffffff",
        "highlight": "#005EB8",
        "highlight-hover": "#004985",
        "primary-forgot": "#18181b",
        "primary-forgot-hover": "#27272a",
        "accent-forgot": "#005EB8",
        "background-forgot": "#F5F7FA",
        "border-forgot": "#e4e4e7",
        "text-subtle": "#546E7A",
        "primary-reset": "#18181b",
        "primary-reset-hover": "#27272a",
        "background-reset": "#ffffff",
        "surface-reset": "#F5F7FA",
        "border-reset": "#e4e4e7",
        "text-main-reset": "#09090b",
        "text-secondary-reset": "#546E7A",
        "accent-light": "#eef2f6",
        "secondary": "#546E7A",
        "background-subtle": "#F5F7FA",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
      borderRadius: { 
        "DEFAULT": "0.25rem", 
        "lg": "0.5rem", 
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px" 
      },
      boxShadow: {
        'soft': '0 10px 40px -10px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
        'soft-register': '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        'soft-forgot': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'float': '0 10px 40px -10px rgba(0,0,0,0.05)',
        'glow': '0 0 15px rgba(0, 94, 184, 0.18)',
        'inner-light': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.01)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        'input': '0 0 0 1px rgba(228, 228, 231, 0.4)',
        'minimal': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      keyframes: {
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeInScale: 'fadeInScale 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}

