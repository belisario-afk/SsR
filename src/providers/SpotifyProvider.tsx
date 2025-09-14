import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ensureSpotifyAuth, getAccessToken, refreshAccessToken, SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from '@utils/oauth';

type TrackImage = { url: string; width?: number; height?: number };
type TrackInfo = {
  name: string;
  artist: string;
  albumImage?: string; // picked best-fit size for UI + HoloPlatter
};

type SpotifyContextType = {
  isSpotifyReady: boolean;
  deviceActive: boolean;
  playing: boolean;
  track?: TrackInfo;
  volume: number;
  positionMs: number;
  durationMs: number;
  setVolume: (v: number | ((prev: number) => number)) => void;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  seekTo: (ms: number) => Promise<void>;
};

const SpotifyContext = createContext<SpotifyContextType | null>(null);

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

async function loadSpotifySDK(): Promise<void> {
  if ((window as any).Spotify) return;
  await new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
    (window as any).onSpotifyWebPlaybackSDKReady = () => resolve();
  });
}

function pickBestImage(images: TrackImage[], desired: number): string | undefined {
  if (!images?.length) return undefined;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const candidate = sorted.find((i) => (i.width ?? 0) >= desired) ?? sorted[sorted.length - 1];
  return candidate?.url;
}

async function fetchWebAPI(endpoint: string, method: 'GET' | 'PUT' | 'POST' = 'GET', body?: any) {
  let token = getAccessToken();
  if (!token) {
    await ensureSpotifyAuth(SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI);
    token = getAccessToken();
  }
  const issuedAt = Number(localStorage.getItem('spotify_token_issued_at') || '0');
  const expiresIn = Number(localStorage.getItem('spotify_token_expires_in') || '0');
  const hasRefresh = !!localStorage.getItem('spotify_refresh_token');
  if (expiresIn && issuedAt && Date.now() - issuedAt > (expiresIn - 60) * 1000) {
    if (hasRefresh) {
      try {
        token = await refreshAccessToken();
      } catch {
        await ensureSpotifyAuth(SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI);
        token = getAccessToken();
      }
    } else {
      await ensureSpotifyAuth(SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI);
      token = getAccessToken();
    }
  }
  const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    throw new Error(`${method} ${endpoint} failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const [isSpotifyReady, setIsSpotifyReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceActive, setDeviceActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<TrackInfo | undefined>(undefined);
  const [volume, setVolumeState] = useState(0.7);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const initialize = async () => {
      await ensureSpotifyAuth(SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI);
      await loadSpotifySDK();
      const token = getAccessToken();
      if (!token) return;

      const player = new (window as any).Spotify.Player({
        name: 'SsR Opel Z',
        getOAuthToken: (cb: (t: string) => void) => cb(getAccessToken() || ''),
        volume
      });
      playerRef.current = player;

      player.addListener('ready', ({ device_id }: any) => {
        setDeviceId(device_id);
        setIsSpotifyReady(true);
        // Transfer playback to our device
        fetchWebAPI('me/player', 'PUT', { device_ids: [device_id], play: false }).catch(() => {});
      });
      player.addListener('not_ready', () => {
        setDeviceActive(false);
      });
      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;
        setPlaying(!state.paused);
        setDeviceActive(true);
        setPositionMs(state.position ?? 0);
        setDurationMs(state.duration ?? 0);
        const t = state.track_window.current_track;
        const imgs: TrackImage[] = t?.album?.images ?? [];
        const dpr = Math.min(3, window.devicePixelRatio || 1);
        const desired = Math.min(640, Math.max(256, Math.round(256 * dpr)));
        const bestUrl = pickBestImage(imgs, desired);

        setTrack({
          name: t?.name,
          artist: t?.artists?.map((a: any) => a.name).join(', '),
          albumImage: bestUrl
        });
      });

      player.connect();
    };
    initialize();
    return () => {
      playerRef.current?.disconnect?.();
    };
  }, []);

  useEffect(() => {
    playerRef.current?.setVolume?.(volume).catch(() => {});
  }, [volume]);

  const setVolume: SpotifyContextType['setVolume'] = useCallback((v) => {
    setVolumeState((prev) => {
      const next = typeof v === 'function' ? (v as any)(prev) : v;
      return Math.min(1, Math.max(0, next));
    });
  }, []);

  const togglePlay = useCallback(async () => {
    try {
      await fetchWebAPI('me/player/play', 'PUT');
    } catch {
      try {
        await fetchWebAPI('me/player/pause', 'PUT');
      } catch {
        // ignored
      }
    }
  }, []);

  const nextTrack = useCallback(async () => {
    try {
      await fetchWebAPI('me/player/next', 'POST');
    } catch {
      // ignored
    }
  }, []);

  const prevTrack = useCallback(async () => {
    try {
      await fetchWebAPI('me/player/previous', 'POST');
    } catch {
      // ignored
    }
  }, []);

  const seekTo = useCallback(async (ms: number) => {
    const clamped = Math.max(0, Math.min(ms, durationMs || ms));
    try {
      await fetchWebAPI(`me/player/seek?position_ms=${Math.floor(clamped)}`, 'PUT');
      setPositionMs(clamped);
    } catch {
      // ignored
    }
  }, [durationMs]);

  const value = useMemo<SpotifyContextType>(
    () => ({
      isSpotifyReady,
      deviceActive,
      playing,
      track,
      volume,
      positionMs,
      durationMs,
      setVolume,
      togglePlay,
      nextTrack,
      prevTrack,
      seekTo
    }),
    [isSpotifyReady, deviceActive, playing, track, volume, positionMs, durationMs, setVolume, togglePlay, nextTrack, prevTrack, seekTo]
  );

  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>;
}

export function useSpotify() {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error('useSpotify must be used within SpotifyProvider');
  return ctx;
}