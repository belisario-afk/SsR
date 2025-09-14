export async function requestFullscreenIfPossible() {
  const el: any = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' } as any);
    // Android fullscreen overlays often need a scroll to trigger repaint. Force a bit.
    window.scrollTo(0, 1);
  } catch {
    // ignore
  }
}

export async function exitFullscreenIfPossible() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    // ignore
  }
}