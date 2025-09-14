import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type UIContextType = {
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
};

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [demoMode, setDemoModeState] = useState<boolean>(true);

  useEffect(() => {
    const saved = localStorage.getItem('ssr_demo_mode');
    if (saved != null) setDemoModeState(saved === '1');
  }, []);

  const setDemoMode = (v: boolean) => {
    setDemoModeState(v);
    localStorage.setItem('ssr_demo_mode', v ? '1' : '0');
  };

  const value = useMemo(() => ({ demoMode, setDemoMode }), [demoMode]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}