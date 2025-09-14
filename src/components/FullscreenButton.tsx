import React, { useEffect, useState } from 'react';
import { exitFullscreenIfPossible, isFullscreen, onFullscreenChange, requestFullscreenIfPossible } from '@utils/device';

export function FullscreenButton() {
  const [fs, setFs] = useState<boolean>(isFullscreen());

  useEffect(() => {
    return onFullscreenChange(setFs);
  }, []);

  const toggle = async () => {
    if (isFullscreen()) {
      await exitFullscreenIfPossible();
    } else {
      await requestFullscreenIfPossible();
    }
  };

  return (
    <button
      onClick={toggle}
      className="rounded-xl bg-black/60 text-white px-3 py-2 border border-white/15 hover:border-white/40"
      aria-pressed={fs}
      aria-label={fs ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={fs ? 'Exit Fullscreen' : 'Enter Fullscreen'}
    >
      {fs ? '⤫ Fullscreen' : '⛶ Fullscreen'}
    </button>
  );
}