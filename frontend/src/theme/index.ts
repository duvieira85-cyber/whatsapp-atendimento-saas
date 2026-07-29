import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const baseTheme = createTheme({
  palette: {
    primary: {
      main: '#820AD1',
      light: '#9C27B0',
      dark: '#4A148C',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#7C3AED',
      light: '#A78BFA',
      dark: '#5B21B6',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8F7FC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#6B7280',
      disabled: '#9CA3AF',
    },
    divider: '#ECE8F4',
    error: {
      main: '#EF4444',
      light: '#FCA5A5',
      dark: '#DC2626',
    },
    warning: {
      main: '#F59E0B',
      light: '#FDE68A',
      dark: '#D97706',
    },
    success: {
      main: '#22C55E',
      light: '#86EFAC',
      dark: '#16A34A',
    },
    info: {
      main: '#3B82F6',
      light: '#93C5FD',
      dark: '#2563EB',
    },
  },
  typography: {
    fontFamily: '"Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 700, fontSize: '2.25rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, fontSize: '1.875rem', lineHeight: 1.25, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.3, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.35 },
    h5: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.4 },
    h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.45 },
    subtitle1: { fontWeight: 500, fontSize: '0.9375rem', lineHeight: 1.5 },
    subtitle2: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.5 },
    body1: { fontWeight: 400, fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.6 },
    caption: { fontWeight: 400, fontSize: '0.75rem', lineHeight: 1.5 },
    overline: { fontWeight: 600, fontSize: '0.625rem', lineHeight: 1.5, textTransform: 'uppercase', letterSpacing: '0.1em' },
    button: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.5, textTransform: 'none' },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
});

const theme = responsiveFontSizes(baseTheme, {
  breakpoints: ['sm', 'md', 'lg'],
  factor: 2,
});

theme.components = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollbarWidth: 'thin',
        scrollbarColor: '#D1D5DB transparent',
        '&::-webkit-scrollbar': { width: 4, height: 4 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: '#D1D5DB', borderRadius: 4 },
        '&::-webkit-scrollbar-thumb:hover': { background: '#9CA3AF' },
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        borderRadius: 8,
        padding: '8px 20px',
        fontSize: '0.875rem',
        transition: 'all 0.15s ease',
        '&:focus-visible': {
          outline: '2px solid #820AD1',
          outlineOffset: 2,
        },
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(130, 10, 209, 0.25)',
        },
      },
      outlined: {
        borderColor: '#ECE8F4',
        '&:hover': {
          borderColor: '#820AD1',
          backgroundColor: 'rgba(130, 10, 209, 0.04)',
        },
      },
      text: {
        '&:hover': {
          backgroundColor: 'rgba(130, 10, 209, 0.04)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
      elevation1: {
        boxShadow: '0px 1px 3px rgba(0,0,0,0.04), 0px 1px 2px rgba(0,0,0,0.03)',
      },
      elevation2: {
        boxShadow: '0px 2px 6px rgba(0,0,0,0.05), 0px 1px 3px rgba(0,0,0,0.04)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        border: 'none',
        backgroundColor: '#3B0764',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: '0px 1px 3px rgba(0,0,0,0.04)',
        borderBottom: '1px solid #ECE8F4',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 500,
        fontSize: '0.75rem',
      },
      filled: {
        '&.MuiChip-colorPrimary': { backgroundColor: '#820AD1', color: '#FFFFFF' },
        '&.MuiChip-colorSuccess': { backgroundColor: '#22C55E', color: '#FFFFFF' },
        '&.MuiChip-colorWarning': { backgroundColor: '#F59E0B', color: '#FFFFFF' },
        '&.MuiChip-colorError': { backgroundColor: '#EF4444', color: '#FFFFFF' },
        '&.MuiChip-colorInfo': { backgroundColor: '#3B82F6', color: '#FFFFFF' },
      },
      outlined: {
        borderColor: '#ECE8F4',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          transition: 'all 0.15s ease',
          '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#820AD1',
            },
          },
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#820AD1',
              borderWidth: 2,
            },
          },
          '& input::placeholder, & textarea::placeholder': {
            color: '#9CA3AF',
            opacity: 1,
          },
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: '#820AD1',
        },
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        transition: 'all 0.12s ease',
        '&:focus-visible': {
          outline: '2px solid #820AD1',
          outlineOffset: -2,
        },
      },
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: {
        fontWeight: 600,
      },
    },
  },
  MuiBadge: {
    styleOverrides: {
      dot: {
        width: 10,
        height: 10,
        borderRadius: '50%',
        border: '2px solid #FFFFFF',
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: '#1F2937',
        color: '#FFFFFF',
        fontSize: '0.75rem',
        padding: '6px 10px',
        borderRadius: 6,
      },
      arrow: {
        color: '#1F2937',
      },
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: '#ECE8F4',
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: 10,
        boxShadow: '0px 8px 24px rgba(0,0,0,0.08), 0px 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid #ECE8F4',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
        boxShadow: '0px 16px 48px rgba(0,0,0,0.1)',
      },
    },
  },
  MuiAccordion: {
    styleOverrides: {
      root: {
        '&:before': { display: 'none' },
        boxShadow: 'none',
        '&.Mui-expanded': { margin: 0 },
      },
    },
  },
  MuiAccordionSummary: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        '&.Mui-expanded': { minHeight: 40 },
      },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: {
        border: 'none',
        borderRadius: 8,
        padding: '4px 8px',
        '&.Mui-selected': {
          backgroundColor: '#F3E8FF',
          color: '#820AD1',
        },
      },
    },
  },
};

export default theme;
