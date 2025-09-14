import { useTheme } from '@providers/ThemeProvider';
import { useState } from 'react';
import { requestFullscreenIfPossible, exitFullscreenIfPossible } from '@utils/device';

export function SettingsPanel() {
  const { theme, setThemeByName, highContrast, setHighContrast, dockMode, setDockMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const onFullscreen = async () => {
    await requestFullscreenIfPossible();
  };

  const onExitFullscreen = async () => {
    await exitFullscreenIfPossible();
  };

  return (
    <div className="pointer-events-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 rounded-xl border border-white/10 bg-black/60 text-white text-xl"
        aria-expanded={isOpen}
        aria-controls="settings-panel"
      >
        ⚙
      </button>
      {isOpen && (
        <div
          id="settings-panel"
          className="mt-2 p-4 rounded-2xl w-[86vw] tablet:w-[420px]"
          style={{
            background: 'rgba(10,10,10,0.7)',
            border: `1px solid ${theme.colors.primaryHex}33`,
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="text-white font-semibold mb-2">Settings</div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/80">Theme</span>
              <select
                className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-white"
                value={theme.name}
                onChange={(e) => setThemeByName(e.target.value as any)}
                aria-label="Theme"
              >
                <option>Chase</option>
                <option>Starlight</option>
                <option>Romance</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/80">High Contrast</span>
              <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} aria-label="High contrast" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/80">Car Dock Mode</span>
              <input
                type="checkbox"
                checked={dockMode}
                onChange={(e) => {
                  setDockMode(e.target.checked);
                  if (e.target.checked) onFullscreen();
                  else onExitFullscreen();
                }}
                aria-label="Car Dock Mode"
              />
            </div>

            <div className="flex items-center gap-2">
              <button className="flex-1 rounded-lg px-3 py-2 bg-black/60 border border-white/10 text-white" onClick={onFullscreen}>
                Fullscreen
              </button>
              <button className="flex-1 rounded-lg px-3 py-2 bg-black/60 border border-white/10 text-white" onClick={onExitFullscreen}>
                Exit Fullscreen
              </button>
            </div>

            <div className="text-xs text-white/60">
              Tip: On Samsung Galaxy Tab SMT77U, enable "Keep screen on" in Developer Options for best experience. App also uses Wake Lock.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}