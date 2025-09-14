import { SpeedProvider } from '@providers/SpeedProvider';
import { SpotifyProvider } from '@providers/SpotifyProvider';
import { ThemeProvider, useTheme } from '@providers/ThemeProvider';
import { GestureProvider, useGesture } from '@providers/GestureProvider';
import { VoiceAssistant } from '@components/VoiceAssistant';
import { ThreeScene } from '@components/ThreeScene';
import { Panels } from '@components/Panels';
import { NowPlaying } from '@components/NowPlaying';
import { SettingsPanel } from '@components/SettingsPanel';
import { HUD } from '@components/HUD';
import { useEffect } from 'react';
import { requestFullscreenIfPossible } from '@utils/device';

function Root() {
  const { panelIndex } = useGesture();
  const { highContrast } = useTheme();

  useEffect(() => {
    // Auto fullscreen on load (as "car-dock" immersion)
    requestFullscreenIfPossible();
  }, []);

  return (
    <div className={highContrast ? 'dark contrast-more' : 'dark'}>
      <div className="relative h-screen w-screen overflow-hidden">
        <ThreeScene />
        <div className="absolute inset-0 pointer-events-none">
          <HUD />
        </div>
        <div className="absolute inset-x-0 bottom-0 pointer-events-none pb-4">
          <Panels activeIndex={panelIndex} />
        </div>
        <div className="absolute top-2 right-2">
          <SettingsPanel />
        </div>
        <div className="absolute left-2 bottom-28 tablet:bottom-6">
          <NowPlaying />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2">
          <VoiceAssistant />
        </div>
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
            <Root />
          </GestureProvider>
        </SpotifyProvider>
      </SpeedProvider>
    </ThemeProvider>
  );
}