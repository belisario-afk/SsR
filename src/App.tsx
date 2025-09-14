import { SpeedProvider } from '@providers/SpeedProvider';
import { SpotifyProvider } from '@providers/SpotifyProvider';
import { ThemeProvider } from '@providers/ThemeProvider';
import { GestureProvider, useGesture } from '@providers/GestureProvider';
import { UIProvider } from '@providers/UIProvider';
import { VoiceAssistant } from '@components/VoiceAssistant';
import { ThreeScene } from '@components/ThreeScene';
import { Panels } from '@components/Panels';
import { NowPlaying } from '@components/NowPlaying';
import { SettingsPanel } from '@components/SettingsPanel';
import { HUD } from '@components/HUD';
import { FloatingButtons } from '@components/FloatingButtons';
import { PlaylistPanel } from '@components/PlaylistPanel';
import { useEffect } from 'react';
import { requestFullscreenIfPossible } from '@utils/device';
import { useTheme } from '@providers/ThemeProvider';
import { FullscreenButton } from '@components/FullscreenButton';

function Root() {
  const { panelIndex, playerVisible, playlistVisible, setPlaylistVisible } = useGesture();
  const { highContrast, theme } = useTheme();

  useEffect(() => {
    // Keep this: request fullscreen on first user gesture, but button will also control it.
    const onInteract = () => {
      requestFullscreenIfPossible().catch(() => {});
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('touchstart', onInteract);
    };
    window.addEventListener('pointerdown', onInteract, { once: true });
    window.addEventListener('keydown', onInteract, { once: true });
    window.addEventListener('touchstart', onInteract, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('touchstart', onInteract);
    };
  }, []);

  return (
    <div className={highContrast ? 'dark contrast-more' : 'dark'} style={{ backgroundColor: theme.colors.backgroundHex }}>
      <div className="relative h-screen w-screen overflow-hidden">
        <ThreeScene />
        <div className="absolute inset-0 pointer-events-none">
          <HUD />
        </div>
        <div className="absolute inset-x-0 bottom-0 pointer-events-none pb-4">
          <Panels activeIndex={panelIndex} />
        </div>
        <div className="absolute top-2 right-2 flex gap-2">
          <FullscreenButton />
          <SettingsPanel />
        </div>
        {playerVisible && (
          <div className="absolute left-2 bottom-28 tablet:bottom-6">
            <NowPlaying />
          </div>
        )}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2">
          <VoiceAssistant />
        </div>

        <FloatingButtons />
        <PlaylistPanel open={playlistVisible} onClose={() => setPlaylistVisible(false)} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SpeedProvider>
        <SpotifyProvider>
          <GestureProvider>
            <UIProvider>
              <Root />
            </UIProvider>
          </GestureProvider>
        </SpotifyProvider>
      </SpeedProvider>
    </ThemeProvider>
  );
}