/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        text: {
          DEFAULT: '#1F2937',
          secondary: '#6B7280',
          tertiary: '#9CA3AF',
        },
        border: '#E5E7EB',
        background: {
          DEFAULT: '#FFFFFF',
          secondary: '#F9FAFB',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      borderRadius: {
        'input': '6px',
        'button': '8px',
        'card': '12px',
        'panel': '16px',
        'window': '20px',
      },
      boxShadow: {
        'button': '0 2px 4px rgba(0,0,0,0.1)',
        'card': '0 2px 8px rgba(0,0,0,0.08)',
        'panel': '0 4px 12px rgba(0,0,0,0.12)',
        'float': '0 8px 24px rgba(0,0,0,0.16)',
        'modal': '0 12px 32px rgba(0,0,0,0.2)',
      },
      transitionDuration: {
        'micro': '150ms',
        'state': '200ms',
        'page': '300ms',
        'action': '400ms',
      },
    },
  },
  plugins: [],
}
