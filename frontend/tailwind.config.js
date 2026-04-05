/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0f0f1a',
        card: '#1a1a2e',
        accent: '#7c3aed',
        researcher: '#3b82f6',
        analyst: '#22c55e',
        writer: '#f97316',
        critic: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(124,58,237,0.0)' },
          '50%': { boxShadow: '0 0 28px rgba(124,58,237,0.45)' },
        },
        floatIn: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        travel: {
          '0%': { transform: 'translateX(-120%)', opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { transform: 'translateX(520%)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'glow-pulse': 'glowPulse 2.2s ease-in-out infinite',
        'float-in': 'floatIn 0.55s ease forwards',
        'gradient-shift': 'gradientShift 8s ease infinite',
        travel: 'travel 1.8s linear infinite',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};