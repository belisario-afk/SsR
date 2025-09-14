import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { keepScreenAwakeWithWakeLock, keepAwakeAudioFallback } from '@utils/wakeLock';

type SpeedContextType = {
  speed: number; // m/s
  hasGeolocation: boolean;
  sliderSpeed: number; // m/s manual
  setSliderSpeed: (v: number) => void;
  intensity: number; // 0..1 derived
  batteryLow: boolean;
};

const SpeedContext = createContext<SpeedContextType | null>(null);

export function SpeedProvider({ children }: { children: React.ReactNode }) {
  const [speed, setSpeed] = useState(0);
  const [hasGeolocation, setHasGeolocation] = useState(false);
  const [sliderSpeed, setSliderSpeed] = useState(0);
  const [batteryLow, setBatteryLow] = useState(false);
  const awakeAudio = useRef<() => void>();

  useEffect(() => {
    // Wake Lock with graceful fallbacks
    let release: (() => void) | null = null;
    keepScreenAwakeWithWakeLock().then((rel) => (release = rel)).catch(async () => {
      awakeAudio.current = await keepAwakeAudioFallback();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        keepScreenAwakeWithWakeLock().catch(() => {});
      }
    });

    return () => {
      if (release) release();
      if (awakeAudio.current) awakeAudio.current();
    };
  }, []);

  useEffect(() => {
    // Geolocation watch
    if (!('geolocation' in navigator)) {
      setHasGeolocation(false);
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setHasGeolocation(true);
        const s = pos.coords.speed;
        if (s != null && !Number.isNaN(s)) {
          setSpeed(Math.max(0, s));
        }
      },
      () => setHasGeolocation(false),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    // Battery status API (if available)
    (navigator as any).getBattery?.().then((b: any) => {
      const onChange = () => setBatteryLow(b.level < 0.2 && !b.charging);
      onChange();
      b.addEventListener('levelchange', onChange);
      b.addEventListener('chargingchange', onChange);
    });
  }, []);

  const intensity = useMemo(() => {
    const s = hasGeolocation ? speed : sliderSpeed;
    return Math.max(0, Math.min(1, s / 25)); // ~25 m/s (~90 km/h) => full intensity
  }, [speed, sliderSpeed, hasGeolocation]);

  return (
    <SpeedContext.Provider value={{ speed: hasGeolocation ? speed : sliderSpeed, hasGeolocation, sliderSpeed, setSliderSpeed, intensity, batteryLow }}>
      {children}
    </SpeedContext.Provider>
  );
}

export function useSpeed() {
  const ctx = useContext(SpeedContext);
  if (!ctx) throw new Error('useSpeed must be used within SpeedProvider');
  return ctx;
}