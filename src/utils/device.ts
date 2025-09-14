// Cross-browser Fullscreen helpers

declare global {
  interface Document {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
    msFullscreenElement?: Element | null;
    msExitFullscreen?: () => Promise<void>;
    mozFullScreenElement?: Element | null;
    mozCancelFullScreen?: () => Promise<void>;
  }
  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
  }
}

export function isFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement ||
    document.mozFullScreenElement
  );
}

export async function requestFullscreenIfPossible(el?: HTMLElement): Promise<void> {
  const target = el || document.documentElement;
  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen();
      return;
    }
    if (target.webkitRequestFullscreen) {
      await target.webkitRequestFullscreen();
      return;
    }
    if (target.msRequestFullscreen) {
      await target.msRequestFullscreen();
      return;
    }
    if (target.mozRequestFullScreen) {
      await target.mozRequestFullScreen();
      return;
    }
  } catch {
    // ignore
  }
  // Some iOS browsers only allow <video>.webkitEnterFullscreen(), which we can't enforce here.
}

export async function exitFullscreenIfPossible(): Promise<void> {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }
    if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
      return;
    }
    if (document.msExitFullscreen) {
      await document.msExitFullscreen();
      return;
    }
    if (document.mozCancelFullScreen) {
      await document.mozCancelFullScreen();
      return;
    }
  } catch {
    // ignore
  }
}

export function onFullscreenChange(cb: (fs: boolean) => void): () => void {
  const handler = () => cb(isFullscreen());
  const events = ['fullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange', 'mozfullscreenchange'];
  events.forEach((e) => document.addEventListener(e, handler as any));
  // fire once for initial state
  handler();
  return () => events.forEach((e) => document.removeEventListener(e, handler as any));
}