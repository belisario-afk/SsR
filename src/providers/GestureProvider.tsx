import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type GestureContextType = {
  panelIndex: number;
  setPanelIndex: (i: number) => void;
};

const GestureContext = createContext<GestureContextType | null>(null);

export function GestureProvider({ children }: { children: React.ReactNode }) {
  const [panelIndex, setPanelIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const threshold = 40;

  const onTouchStart = useCallback((e: TouchEvent) => {
    const t = e.changedTouches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
  }, []);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - (touchStartX.current ?? t.clientX);
    const dy = t.clientY - (touchStartY.current ?? t.clientY);

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      setPanelIndex((p) => Math.max(0, Math.min(2, p + (dx < 0 ? 1 : -1))));
    } else if (dy < -threshold) {
      // swipe up to cycle theme handled via keyboard event dispatch
      const ev = new CustomEvent('ssr-cycle-theme');
      window.dispatchEvent(ev);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPanelIndex((p) => Math.min(2, p + 1));
      if (e.key === 'ArrowLeft') setPanelIndex((p) => Math.max(0, p - 1));
      if (e.key.toLowerCase() === 't') window.dispatchEvent(new CustomEvent('ssr-cycle-theme'));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [onTouchEnd, onTouchStart]);

  return <GestureContext.Provider value={{ panelIndex, setPanelIndex }}>{children}</GestureContext.Provider>;
}

export function useGesture() {
  const ctx = useContext(GestureContext);
  if (!ctx) throw new Error('useGesture must be used within GestureProvider');
  return ctx;
}