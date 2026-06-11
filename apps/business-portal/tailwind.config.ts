import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#E6781E',
        'primary-dark': '#c4621a',
        secondary: '#165A34',
        background: '#FCF3DC',
        surface: '#FFFFFF',
        muted: '#f5f5f5',
        'on-surface': '#1C1C23',
        'muted-gray': '#6B7280',
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F59E0B',
        border: '#E5E0D5',
      },
      fontFamily: {
        sans: ['Cairo', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '0.75rem',
      },
      spacing: {
        'nav-height': '64px',
        'gap-xs': '4px',
        'gap-sm': '8px',
        'gap-md': '12px',
        'gap-lg': '20px',
        'margin-standard': '16px',
      },
    },
  },
  plugins: [],
};

export default config;
