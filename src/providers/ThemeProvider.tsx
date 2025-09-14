import React, { createContext, useContext, useMemo, useState } from 'react';

type ThemeName = 'Chase' | 'Starlight' | 'Romance';

type Theme = {
  name: ThemeName;
  colors: {
    primaryHex: string;
    accentHex: string;
    uiBg: string;
  };
  particles: number;
  bloom: number;
};

type ThemeContextType = {
  theme: Theme;
  setThemeByName: (name: ThemeName) => void;
  cycleTheme: () => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  dockMode: boolean;
  setDockMode: (v: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEMES: Record<ThemeName, Theme> = {
  Chase: {
    name: 'Chase',
    colors: { primaryHex: '#fb923c', accentHex: '#ff6b00', uiBg: 'rgba(5,5,5,0.7)' },
    particles: 1200,
    bloom: 1.0
  },
  Starlight: {
    name: 'Starlight',
    colors: { primaryHex: '#7dd3fc', accentHex: '#00fff0', uiBg: 'rgba(8,8,12,0.7)' },
    particles: 2000,
    bloom: 1.4
  },
  Romance: {
    name: 'Romance',
    colors: { primaryHex: '#fda4af', accentHex: '#ff79c6', uiBg: 'rgba(12,8,10,0.7)' },
    particles: 1400,
    bloom: 1.1
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<ThemeName>('Starlight');
  const [highContrast, setHighContrast] = useState(false);
  const [dockMode, setDockMode] = useState(false);
  const theme = useMemo(() => THEMES[name], [name]);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      setThemeByName: setName,
      cycleTheme: () => {
        const next: ThemeName = name === 'Chase' ? 'Starlight' : name === 'Starlight' ? 'Romance' : 'Chase';
        setName(next);
      },
      highContrast,
      setHighContrast,
      dockMode,
      setDockMode
    }),
    [theme, highContrast, dockMode, name]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}