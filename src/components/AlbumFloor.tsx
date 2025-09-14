import React, { useEffect, useRef, useState } from 'react';
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
  ClampToEdgeWrapping
} from 'three';

type AlbumFloorProps = {
  size?: number;
  y?: number;
  // If provided, overrides mediaSession artwork
  imageUrl?: string;
};

/**
 * Simple fallback gradient texture so the floor never appears blank.
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

/**
 * Renders a textured plane as the "album floor".
 * Improved quality:
 * - Uses mipmaps and Linear filters (removes pixelation from Nearest).
 * - Sets anisotropy up to a safe value based on GPU capability.
 * Smaller payload:
 * - We recommend passing a mid-size image (≈300–512px); the loader will create mipmaps.
 */
export function AlbumFloor({ size = 60, y = -2, imageUrl }: AlbumFloorProps) {
  const meshRef = useRef<Mesh<PlaneGeometry, MeshBasicMaterial>>(null!);
  const [texture, setTexture] = useState<Texture | null>(null);
  const url = useAlbumArtUrl(imageUrl);
  const { gl } = useThree();

  useEffect(() => {
    let disposed = false;

    async function load() {
      const applyQuality = (tex: Texture) => {
        tex.colorSpace = SRGBColorSpace;
        tex.minFilter = LinearMipmapLinearFilter; // high-quality downscaling
        tex.magFilter = LinearFilter; // high-quality upscaling
        tex.wrapS = ClampToEdgeWrapping;
        tex.wrapT = ClampToEdgeWrapping;
        tex.generateMipmaps = true;
        // A balanced anisotropy cap to avoid overusing memory on low-end GPUs
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
        if (!disposed) setTexture(tex);
      }
    }

    load();
    return () => {
      disposed = true;
    };
  }, [url, gl.capabilities]);

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