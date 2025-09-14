import { useSpotify } from '@providers/SpotifyProvider';
import { useTheme } from '@providers/ThemeProvider';
import { useSpeed } from '@providers/SpeedProvider';
import { motion } from 'framer-motion';

export function NowPlaying() {
  const { theme } = useTheme();
  const { playing, track, togglePlay, nextTrack, deviceActive, volume, setVolume, isSpotifyReady } = useSpotify();
  const { hasGeolocation, speed, sliderSpeed, setSliderSpeed } = useSpeed();

  return (
    <div
      className="pointer-events-auto rounded-2xl p-4 w-[92vw] tablet:w-[460px]"
      style={{
        background: 'rgba(10,10,10,0.6)',
        border: `1px solid ${theme.colors.primaryHex}33`,
        boxShadow: `0 0 40px ${theme.colors.accentHex}33`,
        backdropFilter: 'blur(12px)'
      }}
      aria-label="Now Playing"
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ scale: playing ? 1 : 0.9, opacity: deviceActive ? 1 : 0.6 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          className="h-14 w-14 rounded-xl bg-black/60 border border-white/10 overflow-hidden"
        >
          {track?.albumImage ? (
            <img src={track.albumImage} className="h-full w-full object-cover" alt="" />
          ) : (
            <div className="h-full w-full grid place-items-center text-xs text-white/60">No Art</div>
          )}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold truncate">{track?.name ?? (isSpotifyReady ? 'Ready' : 'Initializing…')}</div>
          <div className="text-white/60 text-sm truncate">{track?.artist ?? '—'}</div>
        </div>
        <div className="flex gap-2">
          <button
            className="h-12 w-12 rounded-xl border border-white/10 bg-black/50 text-white text-lg"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '❚❚' : '►'}
          </button>
          <button className="h-12 w-12 rounded-xl border border-white/10 bg-black/50 text-white text-lg" onClick={nextTrack} aria-label="Next">
            ➤
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs text-white/60">Vol</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
          className="flex-1 accent-cyan-400 h-4"
          aria-label="Volume"
        />
        <span className="text-xs text-white/60">{Math.round(volume * 100)}%</span>
      </div>

      <div className="mt-3">
        <div className="text-xs text-white/60 mb-1">
          {hasGeolocation ? 'Vehicle speed (auto)' : 'Vehicle speed (manual)'} — {Math.round((hasGeolocation ? speed : sliderSpeed) * 3.6)} km/h
        </div>
        {!hasGeolocation && (
          <input
            type="range"
            min={0}
            max={40}
            value={sliderSpeed}
            onChange={(e) => setSliderSpeed(parseFloat(e.target.value))}
            className="w-full accent-fuchsia-400 h-4"
            aria-label="Vehicle speed slider"
          />
        )}
      </div>
    </div>
  );
}