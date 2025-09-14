import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Theme = {
  name: string;
  colors: {
    backgroundHex: string;
    primaryHex: string;
    accentHex: string;
  };
};

// Define a guaranteed default theme so types never see undefined
const DEFAULT_THEME: Theme = { name: 'Chase', colors: { backgroundHex: '#03060a', primaryHex: '#60a5fa', accentHex: '#22d3ee' } };

const THEMES: Theme[] = [
  DEFAULT_THEME,
  { name: 'Starlight', colors: { backgroundHex: '#05060a', primaryHex: '#a78bfa', accentHex: '#f472b6' } },
  { name: 'Romance', colors: { backgroundHex: '#0a0606', primaryHex: '#fb7185', accentHex: '#f59e0b' } },
  // New: Spy Gadget monochrome green
  { name: 'SpyGadget', colors: { backgroundHex: '#010a04', primaryHex: '#39ff14', accentHex: '#00ff9c' } },
  // New: Flat 2D neon
  { name: 'Neon2D', colors: { backgroundHex: '#0b0b0b', primaryHex: '#00e5ff', accentHex: '#ff007a' } },
  // New: Reactive base
  { name: 'Reactive', colors: { backgroundHex: '#000000', primaryHex: '#87cefa', accentHex: '#ffbf00' } }
];

type ThemeContextType = {
  theme: Theme;
  name: string;
  setThemeByName: (n: string) => void;
  cycleTheme: () => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<string>(() => localStorage.getItem('ssr_theme') || DEFAULT_THEME.name);
  const [highContrast, setHighContrast] = useState<boolean>(() => localStorage.getItem('ssr_contrast') === '1');

  useEffect(() => {
    localStorage.setItem('ssr_theme', name);
  }, [name]);

  useEffect(() => {
    localStorage.setItem('ssr_contrast', highContrast ? '1' : '0');
  }, [highContrast]);

  const theme: Theme = useMemo(() => {
    const found = THEMES.find((t) => t.name === name);
    return found ?? DEFAULT_THEME;
  }, [name]);

  const setThemeByName = useCallback((n: string) => {
    const exists = THEMES.some((t) => t.name === n);
    setName(exists ? n : DEFAULT_THEME.name);
  }, []);

  const cycleTheme = useCallback(() => {
    const idx = THEMES.findIndex((t) => t.name === name);
    if (idx < 0) {
      setName(DEFAULT_THEME.name);
      return;
    }
    const next = THEMES[(idx + 1) % THEMES.length];
    setName(next?.name ?? DEFAULT_THEME.name);
  }, [name]);

  const value: ThemeContextType = useMemo(
    () => ({ theme, name, setThemeByName, cycleTheme, highContrast, setHighContrast }),
    [theme, name, setThemeByName, cycleTheme, highContrast]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}