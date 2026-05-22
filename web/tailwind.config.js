/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#111111',
        border: '#222222',
        muted: '#444444',
        'muted-fg': '#888888',
        fg: '#e5e5e5',
        accent: '#818cf8',
        'tool-bg': '#0f1117',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'dot-bounce': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'dot-1': 'dot-bounce 1.2s infinite 0ms',
        'dot-2': 'dot-bounce 1.2s infinite 150ms',
        'dot-3': 'dot-bounce 1.2s infinite 300ms',
      },
    },
  },
  plugins: [],
};
