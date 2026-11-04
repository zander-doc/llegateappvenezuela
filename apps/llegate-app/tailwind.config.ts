import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx,jsx,js}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'var(--background)', foreground: 'var(--foreground)',
        card: 'var(--card)', primary: 'var(--primary)', 'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)', muted: 'var(--muted)', 'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)', border: 'var(--border)', surface: 'var(--surface)',
        success: 'var(--success)', destructive: 'var(--destructive)',
      },
      animation: { radar: 'radar 1.8s ease-out infinite' },
      keyframes: {
        radar: { '0%': { transform: 'scale(0.4)', opacity: '0.9' }, '100%': { transform: 'scale(2.6)', opacity: '0' } },
      },
    },
  },
  plugins: [],
} satisfies Config;
