import { useEffect, useState } from 'react';
import { useTheme } from '@providers/ThemeProvider';
import { useSpeed } from '@providers/SpeedProvider';
import { useGesture } from '@providers/GestureProvider';

export function HUD() {
  const { theme } = useTheme();
  const { panelIndex } = useGesture();
  const { speed, hasGeolocation, batteryLow } = useSpeed();
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-start justify-between px-4 pt-3 text-white">
      <div className="flex items-center gap-2">
        <img src={new URL('../assets/opelZ.svg', import.meta.url).toString()} alt="SsR Opel Z" className="h-8 w-8 opacity-90" />
        <div className="font-semibold tracking-wide">SsR Opel Z</div>
      </div>
      <div className="text-white/70 text-sm">
        <div className="text-right">{time}</div>
        <div className="text-right">
          {Math.round(speed * 3.6)} km/h • {hasGeolocation ? 'GPS' : 'Manual'} • Panel {panelIndex + 1}/3
        </div>
        {batteryLow && <div style={{ color: theme.colors.accentHex }} className="text-right">Low battery — dimming recommended</div>}
      </div>
    </div>
  );
}