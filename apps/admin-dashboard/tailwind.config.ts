import type { Config } from 'tailwindcss';

// Tokens from FRONTEND_DESIGN.md / the Stitch "Heritage Pulse" design system.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#E6781E',
        secondary: '#165A34',
        'secondary-container': '#abefbd',
        background: '#FCF3DC',
        'background-cream': '#FCF3DC',
        surface: '#FFFFFF',
        'surface-white': '#FFFFFF',
        'surface-container': '#efecf6',
        'surface-container-low': '#f5f2fc',
        'surface-container-lowest': '#ffffff',
        'on-surface': '#1C1C23',
        'muted-gray': '#6B7280',
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F59E0B',
        'warning-amber': '#F59E0B',
        tertiary: '#006495',
        border: '#E5E0D5',
        'border-beige': '#E5E0D5',
        'primary-fixed': '#ffdbc7',
        'outline-variant': '#ddc1b1',
      },
      fontFamily: {
        sans: ['Cairo', 'Montserrat', 'sans-serif'],
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
        'section-md': '24px',
        'section-lg': '32px',
      },
    },
  },
  plugins: [],
};

export default config;
