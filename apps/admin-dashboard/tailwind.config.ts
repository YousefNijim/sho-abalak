import type { Config } from 'tailwindcss';

// الألوان من FRONTEND_DESIGN.md §الهوية البصرية
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#E6781E',
        secondary: '#165A34',
        background: '#FCF3DC',
        surface: '#FFFFFF',
        'text-primary': '#1C1C23',
        'text-muted': '#6B7280',
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F59E0B',
        border: '#E5E0D5',
      },
      fontFamily: {
        sans: ['Cairo', 'Montserrat', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};

export default config;
