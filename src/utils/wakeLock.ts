export async function keepScreenAwakeWithWakeLock(): Promise<() => void> {
  if ('wakeLock' in navigator) {
    // @ts-ignore
    const lock = await (navigator as any).wakeLock.request('screen');
    const onRelease = () => {
      // silently ignore
    };
    lock.addEventListener?.('release', onRelease);
    const release = async () => {
      try {
        await lock.release?.();
      } catch {
        // ignore
      }
    };
    return release;
  }
  throw new Error('Wake Lock unsupported');
}

// Secondary fallback: loop a near-silent audio buffer to keep device awake
export async function keepAwakeAudioFallback(): Promise<() => void> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  // Fill with silence
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001; // inaudible
  src.connect(gain).connect(ctx.destination);
  try {
    await ctx.resume();
    src.start();
  } catch {
    // ignore
  }
  return () => {
    try {
      src.stop();
      ctx.close();
    } catch {
      // ignore
    }
  };
}