import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ensureSpotifyAuth, getAccessToken, refreshAccessToken, SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from '@utils/oauth';

type TrackInfo = {
  name: string;
  artist: string;
  albumImage?: string;
};

type SpotifyContextType = {
  isSpotifyReady: boolean;
  deviceActive: boolean;
  playing: boolean;
  track?: TrackInfo;
  volume: number;
  setVolume: (v: number) => void;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
};

const SpotifyContext = createContext<SpotifyContextType | null>(null);

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

async function loadSpotifySDK(): Promise<void> {
  if (window.Spotify) return;
  await new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
  });
}

async function fetchWebAPI(endpoint: string, method: 'GET' | 'PUT' | 'POST' = 'GET', body?: any) {
  let token = getAccessToken();
  if (!token) throw new Error('No token');
  // Attempt refreshing if token is older
  const issuedAt = Number(localStorage.getItem('spotify_token_issued_at') || '0');
  const expiresIn = Number(localStorage.getItem('spotify_token_expires_in') || '0');
  if (Date.now() - issuedAt > (expiresIn - 60) * 1000) {
    token = await refreshAccessToken();
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
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const initialize = async () => {
      await ensureSpotifyAuth(SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI);
      await loadSpotifySDK();
      const token = getAccessToken();
      if (!token) return;

      const player = new window.Spotify.Player({
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
        const t = state.track_window.current_track;
        setTrack({
          name: t?.name,
          artist: t?.artists?.map((a: any) => a.name).join(', '),
          albumImage: t?.album?.images?.[0]?.url
        });
      });

      player.connect();
    };
    initialize();
    // Cleanup on unmount
    return () => {
      playerRef.current?.disconnect?.();
    };
  }, []);

  useEffect(() => {
    playerRef.current?.setVolume?.(volume).catch(() => {});
  }, [volume]);

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

  const value = useMemo<SpotifyContextType>(
    () => ({
      isSpotifyReady,
      deviceActive,
      playing,
      track,
      volume,
      setVolume: setVolumeState,
      togglePlay,
      nextTrack
    }),
    [isSpotifyReady, deviceActive, playing, track, volume, togglePlay, nextTrack]
  );

  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>;
}

export function useSpotify() {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error('useSpotify must be used within SpotifyProvider');
  return ctx;
}