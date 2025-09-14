import React from 'react';
import { useGesture } from '@providers/GestureProvider';

export function FloatingButtons() {
  const { togglePlaylistVisible, playlistVisible, togglePlayerVisible, playerVisible } = useGesture();
  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-30 flex flex-col gap-3">
      {/* Toggle Playlist Panel */}
      <button
        onClick={togglePlaylistVisible}
        className="h-12 w-12 rounded-full bg-black/60 text-white grid place-items-center border border-white/15 hover:border-white/40"
        aria-pressed={playlistVisible}
        aria-label={playlistVisible ? 'Hide playlists' : 'Show playlists'}
        title="Playlists (P)"
      >
        ♫
      </button>
      {/* Toggle Music Player (Now Playing) */}
      <button
        onClick={togglePlayerVisible}
        className="h-12 w-12 rounded-full bg-black/60 text-white grid place-items-center border border-white/15 hover:border-white/40"
        aria-pressed={playerVisible}
        aria-label={playerVisible ? 'Hide player' : 'Show player'}
        title="Player (M) — pinch to toggle"
      >
        ⏯
      </button>
    </div>
  );
}