export const designTokens = {
  colors: {
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      900: '#134e4a',
    },
    accent: {
      amber: '#f59e0b',
      emerald: '#10b981',
      rose: '#f43f5e',
    },
    surface: {
      light: '#ffffff',
      dark: '#090d16',
      muted: '#f8fafc',
    },
  },
  typography: {
    fontSans: 'Inter, system-ui, sans-serif',
    fontDisplay: 'Outfit, system-ui, sans-serif',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;
