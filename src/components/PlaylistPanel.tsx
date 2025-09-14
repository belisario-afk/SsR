import React, { useEffect, useMemo, useState } from 'react';
import { ensureSpotifyAuth, getAccessToken, SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from '@utils/oauth';

type Playlist = {
  id: string;
  name: string;
  images?: { url: string }[];
  owner?: { display_name?: string };
  uri: string; // spotify:playlist:...
};

async function getTokenEnsured() {
  let token = getAccessToken();
  if (!token) {
    await ensureSpotifyAuth(SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI);
    token = getAccessToken();
  }
  return token!;
}

async function fetchPlaylists(): Promise<Playlist[]> {
  const token = await getTokenEnsured();
  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=30', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch playlists');
  const data = await res.json();
  return data.items as Playlist[];
}

async function playPlaylist(contextUri: string) {
  const token = await getTokenEnsured();
  const res = await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ context_uri: contextUri })
  });
  if (!res.ok) {
    throw new Error(`Failed to start playlist (${res.status})`);
  }
}

export function PlaylistPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!open) return;
    setLoading(true);
    setError(null);
    fetchPlaylists()
      .then((pls) => {
        if (!active) return;
        setPlaylists(pls);
      })
      .catch((e) => active && setError(e.message || 'Failed to load'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open]);

  const items = useMemo(() => playlists, [playlists]);

  if (!open) return null;
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-end tablet:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full tablet:w-[720px] max-h-[80vh] overflow-hidden rounded-t-3xl tablet:rounded-3xl bg-neutral-900 border border-white/10 shadow-2xl m-0 tablet:m-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Playlists</h3>
          <button className="text-white/70 hover:text-white" onClick={onClose} aria-label="Close playlists">✕</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh] grid grid-cols-2 tablet:grid-cols-3 gap-4">
          {loading && <div className="text-white/70">Loading…</div>}
          {error && <div className="text-red-400">{error}</div>}
          {!loading && !error && items.length === 0 && <div className="text-white/70">No playlists found.</div>}
          {items.map((pl) => (
            <button
              key={pl.id}
              className="text-left group rounded-xl overflow-hidden border border-white/10 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
              onClick={async () => {
                try {
                  await playPlaylist(pl.uri);
                  onClose();
                } catch (e) {
                  alert('Failed to start playlist. Open Spotify app or ensure Web Playback device is ready.');
                }
              }}
            >
              <div className="aspect-square bg-neutral-800">
                {pl.images?.[0]?.url ? (
                  <img src={pl.images[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-white/30">♪</div>
                )}
              </div>
              <div className="p-2">
                <div className="text-white font-medium leading-tight line-clamp-2">{pl.name}</div>
                <div className="text-white/50 text-xs">{pl.owner?.display_name || 'Me'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}