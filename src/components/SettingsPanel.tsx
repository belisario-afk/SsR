import React, { useState } from 'react';
import { useTheme } from '@providers/ThemeProvider';
import { useUI } from '@providers/UIProvider';

export function SettingsPanel() {
  const { theme, setThemeByName, cycleTheme } = useTheme();
  const { demoMode, setDemoMode } = useUI();
  const [open, setOpen] = useState(false);

  const themes = ['Chase', 'Starlight', 'Romance', 'SpyGadget', 'Neon2D', 'Reactive'];

  return (
    <div className="pointer-events-auto">
      <button
        className="rounded-xl bg-black/60 text-white px-3 py-2 border border-white/15 hover:border-white/40"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Settings ⚙
      </button>
      {open && (
        <div className="mt-2 w-72 rounded-xl bg-neutral-900 border border-white/10 p-3 shadow-xl">
          <div className="mb-3">
            <div className="text-white/70 text-sm mb-1">Theme</div>
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => (
                <button
                  key={t}
                  onClick={() => setThemeByName(t)}
                  className={`px-2 py-1 rounded border ${theme.name === t ? 'border-white/70' : 'border-white/20'} text-white/90`}
                >
                  {t}
                </button>
              ))}
              <button onClick={cycleTheme} className="px-2 py-1 rounded border border-white/20 text-white/90">
                Cycle
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="flex items-center gap-2 text-white/90">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
              />
              Show demo instructions
            </label>
          </div>

          <div className="text-xs text-white/40">Pinch to toggle player. Press P for Playlists, M for Player.</div>
        </div>
      )}
    </div>
  );
}