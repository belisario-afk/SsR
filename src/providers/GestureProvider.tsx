import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type GestureContextType = {
  panelIndex: number;
  setPanelIndex: (i: number) => void;

  // UI toggles
  playerVisible: boolean;
  togglePlayerVisible: () => void;

  playlistVisible: boolean;
  togglePlaylistVisible: () => void;
  setPlaylistVisible: (v: boolean) => void;
};

const GestureContext = createContext<GestureContextType | null>(null);

export function GestureProvider({ children }: { children: React.ReactNode }) {
  const [panelIndex, setPanelIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const threshold = 40;

  // Pinch gesture state
  const pinchStartDist = useRef<number | null>(null);
  const pinchTriggered = useRef(false);

  const [playerVisible, setPlayerVisible] = useState(true);
  const [playlistVisible, setPlaylistVisible] = useState(false);

  const togglePlayerVisible = useCallback(() => setPlayerVisible((v) => !v), []);
  const togglePlaylistVisible = useCallback(() => setPlaylistVisible((v) => !v), []);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches.item(0);
      if (!t) return;
      touchStartX.current = t.clientX;
      touchStartY.current = t.clientY;
    } else if (e.touches.length === 2) {
      const t1 = e.touches.item(0);
      const t2 = e.touches.item(1);
      if (!t1 || !t2) return;
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      pinchStartDist.current = Math.hypot(dx, dy);
      pinchTriggered.current = false;
    }
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current) {
      const t1 = e.touches.item(0);
      const t2 = e.touches.item(1);
      if (!t1 || !t2) return;
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.hypot(dx, dy);
      const base = pinchStartDist.current || dist;
      const scale = dist / base;

      // Trigger once if pinched in strongly or out strongly
      if (!pinchTriggered.current && (scale < 0.75 || scale > 1.35)) {
        // Pinch-in hides, pinch-out shows
        setPlayerVisible(scale > 1.0);
        pinchTriggered.current = true;
      }
    }
  }, []);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    // Reset pinch when last finger lifts
    if (e.touches.length === 0) {
      pinchStartDist.current = null;
      pinchTriggered.current = false;
    }

    const t = e.changedTouches.item(0);
    if (!t) return;

    const startX = touchStartX.current ?? t.clientX;
    const startY = touchStartY.current ?? t.clientY;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      setPanelIndex((p) => Math.max(0, Math.min(2, p + (dx < 0 ? 1 : -1))));
    } else if (dy < -threshold) {
      const ev = new CustomEvent('ssr-cycle-theme');
      window.dispatchEvent(ev);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPanelIndex((p) => Math.min(2, p + 1));
      if (e.key === 'ArrowLeft') setPanelIndex((p) => Math.max(0, p - 1));
      if (e.key.toLowerCase() === 't') window.dispatchEvent(new CustomEvent('ssr-cycle-theme'));
      if (e.key.toLowerCase() === 'm') togglePlayerVisible();
      if (e.key.toLowerCase() === 'p') togglePlaylistVisible();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [onTouchEnd, onTouchMove, onTouchStart, togglePlayerVisible, togglePlaylistVisible]);

  return (
    <GestureContext.Provider
      value={{
        panelIndex,
        setPanelIndex,
        playerVisible,
        togglePlayerVisible,
        playlistVisible,
        togglePlaylistVisible,
        setPlaylistVisible
      }}
    >
      {children}
    </GestureContext.Provider>
  );
}

export function useGesture() {
  const ctx = useContext(GestureContext);
  if (!ctx) throw new Error('useGesture must be used within GestureProvider');
  return ctx;
}