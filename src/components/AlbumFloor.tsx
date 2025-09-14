import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Texture,
  TextureLoader,
  SRGBColorSpace,
  LinearFilter,
  LinearMipmapLinearFilter,
  ClampToEdgeWrapping,
  Color
} from 'three';

type AlbumFloorProps = {
  size?: number;
  y?: number;
  // If provided, overrides mediaSession artwork
  imageUrl?: string;
  // Initial scale for the album cover relative to the floor size (0.3..1.0)
  coverScale?: number;
  // Enable wheel/pinch zoom interactions
  interactive?: boolean;
  // Optional bounds
  minScale?: number;
  maxScale?: number;
};

/**
 * Simple fallback gradient texture so the cover never appears blank.
 */
function gradientTexture(): Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#0c0c0c');
  g.addColorStop(0.5, '#1a1a1a');
  g.addColorStop(1, '#0c0c0c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new Texture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Returns an album art URL. If an explicit URL is given, use it.
 * Otherwise, try navigator.mediaSession.metadata.artwork and pick the largest.
 */
function useAlbumArtUrl(explicit?: string) {
  const [url, setUrl] = useState<string | null>(explicit ?? null);

  useEffect(() => {
    if (explicit) {
      setUrl(explicit);
      return;
    }
    const m = (navigator as any)?.mediaSession?.metadata;
    const artworkRaw = m?.artwork as Array<{ src?: string; sizes?: string; type?: string }> | undefined;

    const artwork = Array.isArray(artworkRaw)
      ? artworkRaw.filter((a) => typeof a?.src === 'string' && a.src.length > 0)
      : [];

    if (artwork.length > 0) {
      const sorted = [...artwork].sort((a, b) => {
        const sa = parseInt((a.sizes ?? '0x0').split('x')[0] || '0', 10);
        const sb = parseInt((b.sizes ?? '0x0').split('x')[0] || '0', 10);
        return sb - sa;
      });
      const best = sorted[0];
      if (best?.src) setUrl(best.src);
      else setUrl(null);
    } else {
      setUrl(null);
    }
  }, [explicit]);

  return url;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Renders a floor plane and a smaller "album cover" plane on top.
 * - Cover uses mipmaps and linear filters for high quality.
 * - Wheel/pinch gestures can zoom the cover in/out within bounds.
 */
export function AlbumFloor({
  size = 60,
  y = -2,
  imageUrl,
  coverScale = 0.8,
  interactive = true,
  minScale = 0.3,
  maxScale = 1.0
}: AlbumFloorProps) {
  const baseRef = useRef<Mesh<PlaneGeometry, MeshBasicMaterial>>(null!);
  const coverRef = useRef<Mesh<PlaneGeometry, MeshBasicMaterial>>(null!);
  const [texture, setTexture] = useState<Texture | null>(null);
  const url = useAlbumArtUrl(imageUrl);
  const { gl } = useThree();

  const [scale, setScale] = useState(() => clamp(coverScale, minScale, maxScale));
  useEffect(() => {
    setScale((s) => clamp(coverScale, minScale, maxScale));
  }, [coverScale, minScale, maxScale]);

  // Load album texture
  useEffect(() => {
    let disposed = false;

    const applyQuality = (tex: Texture) => {
      tex.colorSpace = SRGBColorSpace;
      tex.minFilter = LinearMipmapLinearFilter; // high-quality downscaling
      tex.magFilter = LinearFilter; // high-quality upscaling
      tex.wrapS = ClampToEdgeWrapping;
      tex.wrapT = ClampToEdgeWrapping;
      tex.generateMipmaps = true;
      const maxAniso = (gl.capabilities as any)?.getMaxAnisotropy?.() || 1;
      tex.anisotropy = Math.min(8, maxAniso);
      tex.needsUpdate = true;
    };

    if (url) {
      const loader = new TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(
        url,
        (tex) => {
          if (disposed) return;
          applyQuality(tex);
          setTexture(tex);
        },
        undefined,
        () => {
          const tex = gradientTexture();
          if (!disposed) setTexture(tex);
        }
      );
    } else {
      const tex = gradientTexture();
      setTexture(tex);
    }

    return () => {
      disposed = true;
    };
  }, [url, gl.capabilities]);

  // Apply texture to cover
  useEffect(() => {
    if (!coverRef.current || !texture) return;
    coverRef.current.material.map = texture;
    coverRef.current.material.needsUpdate = true;
    gl.resetState();
  }, [texture, gl]);

  // Interactions: wheel and pinch
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  useEffect(() => {
    if (!interactive) return;

    const el = gl.domElement;

    const onWheel = (e: WheelEvent) => {
      // Prevent the page from scrolling while interacting
      e.preventDefault();
      const direction = e.deltaY > 0 ? -1 : 1; // down => zoom out
      const next = scale * (1 + direction * 0.06);
      setScale(clamp(next, minScale, maxScale));
    };

    const getDist = (t0: Touch, t1: Touch) => {
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const d = getDist(e.touches[0], e.touches[1]);
        pinchStart.current = { dist: d, scale };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (pinchStart.current && e.touches.length === 2) {
        e.preventDefault();
        const d = getDist(e.touches[0], e.touches[1]);
        const ratio = d / (pinchStart.current.dist || 1);
        const next = pinchStart.current.scale * ratio;
        setScale(clamp(next, minScale, maxScale));
      }
    };

    const onTouchEnd = () => {
      pinchStart.current = null;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart as any);
      el.removeEventListener('touchmove', onTouchMove as any);
      el.removeEventListener('touchend', onTouchEnd as any);
      el.removeEventListener('touchcancel', onTouchEnd as any);
    };
  }, [gl.domElement, interactive, scale, minScale, maxScale]);

  const coverSize = useMemo(() => size * scale, [size, scale]);

  return (
    <group position={[0, y, 0]}>
      {/* Base floor (dark) */}
      <mesh ref={baseRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size, 1, 1]} />
        <meshBasicMaterial color={new Color('#0a0a0a')} side={DoubleSide} toneMapped={false} />
      </mesh>

      {/* Album cover plane, slightly above to avoid z-fighting */}
      <mesh ref={coverRef} position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[coverSize, coverSize, 1, 1]} />
        <meshBasicMaterial side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}