import { useMediaQuery, useTheme } from '@mui/material';

export type BreakpointKey = 'mobileSmall' | 'mobile' | 'tablet' | 'notebook' | 'desktop' | 'desktopLarge';

export function useBreakpoint(): BreakpointKey {
  const theme = useTheme();

  const isDesktopLarge = useMediaQuery(theme.breakpoints.up(1600));
  const isDesktop = useMediaQuery(theme.breakpoints.between(1366, 1599));
  const isNotebook = useMediaQuery(theme.breakpoints.between(1024, 1365));
  const isTablet = useMediaQuery(theme.breakpoints.between(768, 1023));
  const isMobile = useMediaQuery(theme.breakpoints.between(480, 767));
  const isMobileSmall = useMediaQuery(theme.breakpoints.down(480));

  if (isMobileSmall) return 'mobileSmall';
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  if (isNotebook) return 'notebook';
  if (isDesktop) return 'desktop';
  if (isDesktopLarge) return 'desktopLarge';
  return 'desktop';
}

export function useIsMobile(): boolean {
  const bp = useBreakpoint();
  return bp === 'mobile' || bp === 'mobileSmall';
}

export function useIsTablet(): boolean {
  const bp = useBreakpoint();
  return bp === 'tablet';
}

export function useIsMobileOrTablet(): boolean {
  const bp = useBreakpoint();
  return bp === 'mobile' || bp === 'mobileSmall' || bp === 'tablet';
}
