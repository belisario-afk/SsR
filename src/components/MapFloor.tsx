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
import { useFrame } from '@react-three/fiber';

type MapFloorProps = {
  center: { lat: number; lon: number };
  speed?: number;         // m/s (used for dead-reckoning between GPS fixes)
  headingRad?: number;    // radians
  zoom?: number;          // typical range 3..20
  y?: number;             // vertical offset
  tileTemplate?: string;  // e.g. 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  lowPower?: boolean;     // enable low-power optimizations
  throttleMs?: number;    // debounce redraws
  resScale?: number;      // 0.5 draws tiles at half res on the canvas
};

const TILE = 256;
const R = 6378137; // WebMercator Earth radius in meters

function degToRad(d: number) { return (d * Math.PI) / 180; }
function radToDeg(r: number) { return (r * 180) / Math.PI; }

// Meters per pixel at latitude for a given zoom (Web Mercator)
function metersPerPixel(latDeg: number, z: number) {
  const latRad = degToRad(latDeg);
  return (Math.cos(latRad) * 2 * Math.PI * R) / (TILE * Math.pow(2, z));
}

// Local ENU offsets in meters from (lat0,lon0) to (lat1,lon1) using small-angle approximation
function enuOffset(lat0: number, lon0: number, lat1: number, lon1: number) {
  const phi = degToRad((lat0 + lat1) / 2);
  const dLat = degToRad(lat1 - lat0);
  const dLon = degToRad(lon1 - lon0);
  const north = dLat * R;                 // meters
  const east = dLon * R * Math.cos(phi);  // meters
  return { east, north };
}

// Move a lat/lon by distance meters at heading (radians), returns new lat/lon (small-angle)
function moveLatLon(latDeg: number, lonDeg: number, distanceMeters: number, headingRad: number) {
  if (!Number.isFinite(distanceMeters) || distanceMeters === 0) return { lat: latDeg, lon: lonDeg };
  const dNorth = Math.cos(headingRad) * distanceMeters;
  const dEast = Math.sin(headingRad) * distanceMeters;
  const phi = degToRad(latDeg);
  const dLat = dNorth / R;
  const dLon = dEast / (R * Math.cos(phi));
  return { lat: latDeg + radToDeg(dLat), lon: lonDeg + radToDeg(dLon) };
}

export function MapFloor({
  center,
  speed = 0,
  headingRad = 0,
  zoom = 17,
  y = -2,
  tileTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  lowPower = false,
  throttleMs = 300,
  resScale = 1
}: MapFloorProps) {
  const planeRef = useRef<Mesh<PlaneGeometry, MeshBasicMaterial>>(null!);
  const [texture, setTexture] = useState<Texture | null>(null);

  // Anchor center is the lat/lon the current texture is drawn around
  const [anchorCenter, setAnchorCenter] = useState<{ lat: number; lon: number }>(center);
  // Predicted position (dead-reckoning) between GPS fixes
  const predictedRef = useRef<{ lat: number; lon: number }>(center);
  const lastFrameTime = useRef<number>(performance.now());

  // Derived: plane size in real meters to exactly span 3x3 tiles at anchor
  const sideMeters = useMemo(() => 3 * TILE * metersPerPixel(anchorCenter.lat, zoom), [anchorCenter.lat, zoom]);

  // Offscreen canvas for a 3x3 tile composite, scaled if low-power
  const grid = 3;
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    const s = Math.max(0.25, Math.min(1, resScale));
    c.width = Math.round(TILE * grid * s);
    c.height = Math.round(TILE * grid * s);
    return c;
  }, [resScale]);

  // Simple in-memory image cache
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

  // Redraw the 3x3 tile composite centered on anchorCenter
  const redrawTexture = useMemo(() => {
    let cancelled = false;
    return async () => {
      const ctx = canvas.getContext('2d')!;
      const { lat, lon } = anchorCenter;

      // Compute base tile index at anchor, then draw 3x3 around it with sub-tile offsets
      const n = Math.pow(2, zoom);
      const xFloat = ((lon + 180) / 360) * n;
      const latRad = degToRad(lat);
      const yFloat = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

      const baseX = Math.floor(xFloat);
      const baseY = Math.floor(yFloat);
      const fracX = xFloat - baseX;
      const fracY = yFloat - baseY;

      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerPx = new Vector2(canvas.width / 2, canvas.height / 2);
      const tilePix = Math.round(TILE * (canvas.width / (TILE * grid))); // scaled tile size on canvas
      const jobs: Promise<void>[] = [];

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const txRaw = baseX + dx;
          const tyRaw = baseY + dy;

          const tx = ((txRaw % n) + n) % n;               // wrap X
          const ty = Math.min(Math.max(tyRaw, 0), n - 1);  // clamp Y

          const url = tileTemplate
            .replace('{z}', String(zoom))
            .replace('{x}', String(tx))
            .replace('{y}', String(ty));

          const drawX = Math.round(centerPx.x + (dx - fracX) * tilePix - tilePix / 2);
          const drawY = Math.round(centerPx.y + (dy - fracY) * tilePix - tilePix / 2);

          const p = loadTile(url)
            .then((img) => {
              if (!cancelled) ctx.drawImage(img, drawX, drawY, tilePix, tilePix);
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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, tileTemplate, zoom, anchorCenter.lat, anchorCenter.lon, texture]);

  // Debounce redraws on anchor/zoom change
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      redrawTexture();
    }, Math.max(100, throttleMs));
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [anchorCenter.lat, anchorCenter.lon, zoom, redrawTexture, throttleMs]);

  // Update predicted position to new GPS fix immediately
  useEffect(() => {
    predictedRef.current = { lat: center.lat, lon: center.lon };
  }, [center.lat, center.lon]);

  // Dead-reckon and slide the map plane smoothly under the car
  useFrame((state) => {
    const now = state.clock.getElapsedTime() * 1000;
    const dt = Math.min(0.2, (now - lastFrameTime.current) / 1000); // cap dt at 200ms
    lastFrameTime.current = now;

    // Predict new position from last predicted, speed (m/s), heading
    if (speed && speed > 0.01) {
      const next = moveLatLon(predictedRef.current.lat, predictedRef.current.lon, speed * dt, headingRad || 0);
      predictedRef.current = next;
    }

    // Compute ENU from anchor to predicted; move plane opposite so car stays centered
    const { east, north } = enuOffset(anchorCenter.lat, anchorCenter.lon, predictedRef.current.lat, predictedRef.current.lon);
    if (planeRef.current) {
      planeRef.current.position.set(-east, y, north);
    }

    // Recenter (and trigger redraw) if we drift too far from anchor
    const recenterThreshold = sideMeters * 0.3; // when passed ~30% of plane width, refresh anchor/texture
    if (Math.abs(east) > recenterThreshold || Math.abs(north) > recenterThreshold) {
      setAnchorCenter(predictedRef.current);
      // Reset plane to origin; redraw will follow
      if (planeRef.current) planeRef.current.position.set(0, y, 0);
    }
  });

  // Keep plane material map updated once texture exists
  useEffect(() => {
    if (!planeRef.current || !texture) return;
    planeRef.current.material.map = texture;
    planeRef.current.material.needsUpdate = true;
  }, [texture]);

  return (
    <mesh ref={planeRef} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Plane size equals real-world meters of the drawn 3x3 tiles at anchor/zoom */}
      <planeGeometry args={[sideMeters, sideMeters, 1, 1]} />
      <meshBasicMaterial side={DoubleSide} toneMapped={false} />
    </mesh>
  );
}