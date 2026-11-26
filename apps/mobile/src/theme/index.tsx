import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { makeTheme, type Theme } from '@design/tokens';

export { palette, radius, space, size, motion, tier, textStyle, fontFamily, shadow } from '@design/tokens';
export type { Theme, TypeStyle, ColorRole } from '@design/tokens';

const ThemeContext = createContext<Theme>(makeTheme('light'));

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return <ThemeContext.Provider value={makeTheme(scheme)}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
