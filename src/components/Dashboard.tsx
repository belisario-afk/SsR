import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCoords, fetchCurrentWeather, wmoToDescription, wmoToEmoji } from '@utils/weather';
import { useSpotify } from '@providers/SpotifyProvider';
import { useTheme } from '@providers/ThemeProvider';

type BatteryInfo = {
  level: number; // 0..1
  charging: boolean;
};

export function Dashboard() {
  const { theme } = useTheme();
  const { playing, togglePlay, nextTrack, prevTrack, volume, setVolume, track } = useSpotify();

  // Clock
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  // Network
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // Battery
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const navAny = navigator as any;
      if (!navAny.getBattery) return;
      try {
        const bat = await navAny.getBattery();
        const update = () => {
          if (!mounted) return;
          setBattery({ level: bat.level, charging: bat.charging });
        };
        update();
        bat.addEventListener('levelchange', update);
        bat.addEventListener('chargingchange', update);
      } catch {
        // ignore
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // GPS speed (m/s) if available
  const [speed, setSpeed] = useState<number | null>(null);
  const lastPosRef = useRef<{ t: number; lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const s = pos.coords.speed; // m/s or null
        if (typeof s === 'number' && !Number.isNaN(s)) {
          setSpeed(s);
        } else {
          // compute from delta distance
          const nowT = Date.now();
          const last = lastPosRef.current;
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          if (last) {
            const dt = (nowT - last.t) / 1000;
            if (dt > 0) {
              const d = haversine(lat, lon, last.lat, last.lon); // meters
              setSpeed(d / dt);
            }
          }
          lastPosRef.current = { t: nowT, lat, lon };
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  const speedKmh = speed != null ? Math.round(speed * 3.6) : null;

  function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // Weather (uses current position)
  const [weather, setWeather] = useState<{ tempC: number; windKmh: number; code: number } | null>(null);
  const [weatherErr, setWeatherErr] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const coords = await getCoords();
      const lat = coords?.lat ?? 40.7128;
      const lon = coords?.lon ?? -74.006;
      try {
        const w = await fetchCurrentWeather(lat, lon);
        if (!active) return;
        setWeather({ tempC: Math.round(w.temperature), windKmh: Math.round(w.windspeed), code: w.weathercode });
      } catch (e: any) {
        if (!active) return;
        setWeatherErr(e?.message || 'Weather unavailable');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const volPct = Math.round((volume ?? 0) * 100);

  return (
    <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4">
      {/* Time & Date */}
      <div className="rounded-xl border border-white/10 p-4">
        <p className="text-white/70">Time</p>
        <p className="text-4xl font-bold leading-tight">{timeStr}</p>
        <p className="text-xs text-white/50">{dateStr}</p>
      </div>

      {/* Weather */}
      <div className="rounded-xl border border-white/10 p-4">
        <p className="text-white/70">Weather</p>
        {weather ? (
          <>
            <p className="text-3xl font-bold flex items-center gap-2">
              {wmoToEmoji(weather.code)} {weather.tempC}°C
            </p>
            <p className="text-xs text-white/60">{wmoToDescription(weather.code)} · wind {weather.windKmh} km/h</p>
          </>
        ) : weatherErr ? (
          <p className="text-xs text-red-400">{weatherErr}</p>
        ) : (
          <p className="text-xs text-white/60">Loading…</p>
        )}
      </div>

      {/* Battery */}
      <div className="rounded-xl border border-white/10 p-4">
        <p className="text-white/70">Battery</p>
        {battery ? (
          <>
            <p className="text-3xl font-bold">
              {Math.round(battery.level * 100)}%
            </p>
            <p className="text-xs text-white/60">{battery.charging ? 'Charging' : 'On battery'}</p>
          </>
        ) : (
          <p className="text-xs text-white/60">Unavailable</p>
        )}
      </div>

      {/* Network */}
      <div className="rounded-xl border border-white/10 p-4">
        <p className="text-white/70">Network</p>
        <p className={`text-3xl font-bold ${online ? 'text-emerald-400' : 'text-red-400'}`}>
          {online ? 'Online' : 'Offline'}
        </p>
        <p className="text-xs text-white/60">{online ? 'All systems go' : 'Some features limited'}</p>
      </div>

      {/* Speed */}
      <div className="rounded-xl border border-white/10 p-4 col-span-2 tablet:col-span-1">
        <p className="text-white/70">Speed</p>
        <p className="text-3xl font-bold">{speedKmh != null ? `${speedKmh} km/h` : '—'}</p>
        <p className="text-xs text-white/60">GPS-based</p>
      </div>

      {/* Now Playing Quick Controls */}
      <div className="rounded-xl border border-white/10 p-4 col-span-2">
        <p className="text-white/70">Music</p>
        <div className="mt-2 flex items-center gap-3">
          <button
            className="px-3 py-2 rounded bg-black/60 border border-white/15 text-white hover:border-white/40"
            onClick={() => togglePlay()}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            className="px-3 py-2 rounded bg-black/60 border border-white/15 text-white hover:border-white/40"
            onClick={() => prevTrack().catch(() => {})}
          >
            ◀◀
          </button>
          <button
            className="px-3 py-2 rounded bg-black/60 border border-white/15 text-white hover:border-white/40"
            onClick={() => nextTrack().catch(() => {})}
          >
            ▶▶
          </button>
          <div className="ml-4 flex items-center gap-2">
            <span className="text-white/70 text-sm">Vol</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volPct}
              onChange={(e) => {
                const pct = Number(e.target.value);
                if (!Number.isNaN(pct)) setVolume(Math.min(1, Math.max(0, pct / 100)));
              }}
            />
            <span className="text-white/70 text-sm w-10">{volPct}%</span>
          </div>
        </div>
        {track?.name && (
          <p className="mt-2 text-white/80 text-sm line-clamp-1">
            {track.name} — {track.artist}
          </p>
        )}
      </div>
    </div>
  );
}