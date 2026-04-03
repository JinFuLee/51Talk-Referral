import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        n: {
          '50': 'var(--n-50)',
          '100': 'var(--n-100)',
          '200': 'var(--n-200)',
          '300': 'var(--n-300)',
          '400': 'var(--n-400)',
          '500': 'var(--n-500)',
          '600': 'var(--n-600)',
          '700': 'var(--n-700)',
          '800': 'var(--n-800)',
          '900': 'var(--n-900)',
        },
        brand: {
          '50': '#FFFBEB',
          '100': '#FFF3C4',
          '200': '#FFE88A',
          '300': '#FFDA33',
          '400': '#FFD100',
          '500': '#E6BC00',
          '600': '#CCa700',
          '700': '#997D00',
          '800': '#665300',
          '900': '#332A00',
        },
        navy: {
          '50': '#E8EDF4',
          '100': '#C5D0E2',
          '200': '#8DA3C5',
          '300': '#5576A8',
          '400': '#234B82',
          '500': '#1B365D',
          '600': '#162D4E',
          '700': '#11233E',
          '800': '#0F2440',
          '900': '#091527',
        },
        /* ── 语义 Token Tailwind 类（组件唯一引用层）── */
        action: {
          DEFAULT: 'var(--color-action)',
          hover: 'var(--color-action-hover)',
          active: 'var(--color-action-active)',
          text: 'var(--color-action-text)',
          surface: 'var(--color-action-surface)',
        },
        'action-accent': {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          active: 'var(--color-accent-active)',
          text: 'var(--color-accent-text)',
          surface: 'var(--color-accent-surface)',
          subtle: 'var(--color-accent-subtle)',
          muted: 'var(--color-accent-muted)',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
          amber: 'hsl(var(--chart-amber))',
          rose: 'hsl(var(--chart-rose))',
          sky: 'hsl(var(--chart-sky))',
          blue: 'hsl(var(--chart-blue))',
          orange: 'hsl(var(--chart-orange))',
          lime: 'hsl(var(--chart-lime))',
          pink: 'hsl(var(--chart-pink))',
          emerald: 'hsl(var(--chart-emerald))',
        },
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'IBM Plex Sans Thai',
          'Prompt',
          'Noto Sans Thai',
          'PingFang SC',
          'Noto Sans SC',
          'sans-serif',
        ],
        display: ['var(--font-display)', 'Noto Serif SC', 'Noto Serif Thai', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        subtle: 'var(--shadow-subtle)',
        medium: 'var(--shadow-medium)',
        raised: 'var(--shadow-raised)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'pulse-alert': {
          '0%': { opacity: '0.1', transform: 'scale(0.95)' },
          '50%': { opacity: '0.3', transform: 'scale(1.05)' },
          '100%': { opacity: '0.1', transform: 'scale(0.95)' },
        },
        'auth-float': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.02)' },
        },
        'auth-float-reverse': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(15px) scale(0.98)' },
        },
        'auth-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-down': 'slide-down 0.4s ease-out',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'pulse-alert': 'pulse-alert 2.5s ease-in-out infinite',
        'auth-float': 'auth-float 8s ease-in-out infinite',
        'auth-float-reverse': 'auth-float-reverse 10s ease-in-out infinite',
        'auth-glow': 'auth-glow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
