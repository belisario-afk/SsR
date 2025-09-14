import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import { useThree } from '@react-three/fiber';

type AlbumFloorProps = {
  size?: number;     // plane size in world units
  y?: number;        // vertical offset
  imageUrl?: string; // optional override; otherwise uses Media Session artwork
};

/**
 * Tries to read current album art from the Media Session API if no prop is provided.
 * Falls back to a simple generated gradient.
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

export function AlbumFloor({ size = 80, y = -2, imageUrl }: AlbumFloorProps) {
  const meshRef = useRef<Mesh<PlaneGeometry, MeshBasicMaterial>>(null!);
  const [texture, setTexture] = useState<Texture | null>(null);
  const url = useAlbumArtUrl(imageUrl);
  const { gl } = useThree();

  // Load or create texture
  useEffect(() => {
    let disposed = false;

    async function load() {
      if (url) {
        const loader = new TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
          url,
          (tex) => {
            if (disposed) return;
            tex.colorSpace = SRGBColorSpace;
            tex.minFilter = NearestFilter;
            tex.magFilter = NearestFilter;
            tex.anisotropy = 1;
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
        if (!disposed) setTexture(tex);
      }
    }

    load();
    return () => {
      disposed = true;
    };
  }, [url]);

  // Attach texture to material when ready
  useEffect(() => {
    if (!meshRef.current || !texture) return;
    meshRef.current.material.map = texture;
    meshRef.current.material.needsUpdate = true;
    gl.resetState();
  }, [texture, gl]);

  return (
    <mesh ref={meshRef} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshBasicMaterial side={DoubleSide} toneMapped={false} />
    </mesh>
  );
}

function gradientTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 1024, 1024);
  g.addColorStop(0, '#0b0b0b');
  g.addColorStop(0.5, '#111111');
  g.addColorStop(1, '#0b0b0b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);

  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.anisotropy = 1;
  return tex;
}