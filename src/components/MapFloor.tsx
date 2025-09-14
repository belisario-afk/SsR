import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  Vector2,
} from 'three';

type MapFloorProps = {
  center: { lat: number; lon: number };
  zoom?: number;         // typical range 3..20
  size?: number;         // plane size in world units
  y?: number;            // vertical offset
  tileTemplate?: string; // e.g. 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
};

const TILE = 256;

function lonLatToTileXY(lon: number, lat: number, z: number) {
  const n = Math.pow(2, z);
  const x = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  return { x, y, n };
}

export function MapFloor({ center, zoom = 17, size = 80, y = -2, tileTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' }: MapFloorProps) {
  const planeRef = useRef<Mesh<PlaneGeometry, MeshBasicMaterial>>(null!);
  const [texture, setTexture] = useState<Texture | null>(null);

  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = TILE * 3;
    c.height = TILE * 3;
    return c;
  }, []);

  const imgCache = useMemo(() => new Map<string, HTMLImageElement>(), []);

  function loadTile(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const cached = imgCache.get(url);
      if (cached && cached.complete) return resolve(cached);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.onload = () => {
        imgCache.set(url, img);
        resolve(img);
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  useEffect(() => {
    let cancelled = false;
    const ctx = canvas.getContext('2d')!;
    const { x, y: ty, n } = lonLatToTileXY(center.lon, center.lat, zoom);

    const baseX = Math.floor(x);
    const baseY = Math.floor(ty);
    const fracX = x - baseX;
    const fracY = ty - baseY;

    async function draw() {
      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerPx = new Vector2(canvas.width / 2, canvas.height / 2);
      const jobs: Promise<void>[] = [];

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const txRaw = baseX + dx;
          const tyRaw = baseY + dy;

          const tx = ((txRaw % n) + n) % n;               // wrap X
          const tyc = Math.min(Math.max(tyRaw, 0), n - 1); // clamp Y

          const url = tileTemplate
            .replace('{z}', String(zoom))
            .replace('{x}', String(tx))
            .replace('{y}', String(tyc));

          const drawX = centerPx.x + (dx - fracX) * TILE - TILE / 2;
          const drawY = centerPx.y + (dy - fracY) * TILE - TILE / 2;

          const p = loadTile(url)
            .then((img) => {
              if (!cancelled) ctx.drawImage(img, drawX, drawY, TILE, TILE);
            })
            .catch(() => {});
          jobs.push(p);
        }
      }

      await Promise.all(jobs);
      if (cancelled) return;

      if (!texture) {
        const tex = new CanvasTexture(canvas);
        tex.colorSpace = SRGBColorSpace;
        tex.minFilter = LinearFilter;
        tex.magFilter = LinearFilter;
        setTexture(tex);
      } else {
        (texture.image as HTMLCanvasElement) = canvas;
        texture.needsUpdate = true;
      }
    }

    draw();
    return () => { cancelled = true; };
  }, [center.lat, center.lon, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!planeRef.current || !texture) return;
    planeRef.current.material.map = texture;
    planeRef.current.material.needsUpdate = true;
  }, [texture]);

  return (
    <mesh ref={planeRef} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshBasicMaterial side={DoubleSide} toneMapped={false} />
    </mesh>
  );
}