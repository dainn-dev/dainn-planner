/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#137fec",
        "primary-dark": "#27272a", // For login page
        "primary-register": "#18181b", // For register page (Zinc 900)
        "primary-hover": "#3f3f46",
        "primary-register-hover": "#27272a", // For register page (Zinc 800)
        "background-light": "#f8fafc", // Slate 50 for contact page
        "background-light-gray": "#f3f4f6", // For login page background
        "background-dark": "#101922",
        "surface-light": "#ffffff",
        "border-light": "#e5e7eb",
        "text-main": "#111827",
        "text-muted": "#6b7280",
        "accent": "#4b5563",
        // Register page specific colors
        "secondary-text": "#64748b", // Slate 500
        "accent-border": "#e2e8f0", // Slate 200
        "subtle-bg": "#f8fafc", // Slate 50
        "card-bg": "#ffffff", // White
        "highlight": "#6366f1", // Indigo 500
        "highlight-hover": "#4f46e5", // Indigo 600
        // Forgot password page specific colors
        "primary-forgot": "#18181b", // Zinc 900
        "primary-forgot-hover": "#27272a", // Zinc 800
        "accent-forgot": "#4f46e5", // Indigo 600
        "background-forgot": "#f9fafb", // Gray 50
        "border-forgot": "#e4e4e7", // Zinc 200
        "text-subtle": "#71717a", // Zinc 500
        // Reset password page specific colors
        "primary-reset": "#18181b", // Zinc 900
        "primary-reset-hover": "#27272a", // Zinc 800
        "background-reset": "#ffffff", // White
        "surface-reset": "#f4f4f5", // Zinc 100
        "border-reset": "#e4e4e7", // Zinc 200
        "text-main-reset": "#09090b", // Zinc 950
        "text-secondary-reset": "#71717a", // Zinc 500
        "accent-light": "#f3f4f6", // Cool Gray 100
        // Goals page specific colors
        "secondary": "#52525b", // Zinc 600
        "background-subtle": "#f4f4f5", // Zinc 100
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
        'glow': '0 0 15px rgba(99, 102, 241, 0.15)',
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

