import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  Texture,
  TextureLoader,
  SRGBColorSpace
} from 'three';
import { createHologramMaterial } from '@materials/HologramMaterial';

type HoloPlatterProps = {
  albumUrl?: string;                 // album cover image URL
  radius?: number;                   // platter radius (world units)
  height?: number;                   // platter Y offset
  spin?: boolean;
  spinSpeed?: number;                // radians per second
  zoom?: number;                     // 1 = default; pinch/scroll modifies
  onZoomChange?: (v: number) => void;
  durationMs?: number;
  positionMs?: number;
  onSeek?: (ms: number) => void;
  color?: string;                    // hologram color
};

export function HoloPlatter({
  albumUrl,
  radius = 3.6,
  height = -1.4,
  spin = true,
  spinSpeed = 0.9,
  zoom = 1,
  onZoomChange,
  durationMs = 0,
  positionMs = 0,
  onSeek,
  color = '#00e1ff'
}: HoloPlatterProps) {
  const groupRef = useRef<Group>(null!);
  const discRef = useRef<Mesh>(null!);
  const ringRef = useRef<Mesh>(null!);
  const glowRef = useRef<Mesh>(null!);
  const [tex, setTex] = useState<Texture | null>(null);
  const { gl } = useThree();

  // Load album texture
  useEffect(() => {
    let disposed = false;
    if (!albumUrl) {
      setTex(null);
      return;
    }
    const loader = new TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      albumUrl,
      (t) => {
        if (disposed) return;
        t.colorSpace = SRGBColorSpace;
        t.generateMipmaps = true;
        t.needsUpdate = true;
        setTex(t);
      },
      undefined,
      () => setTex(null)
    );
    return () => {
      disposed = true;
    };
  }, [albumUrl]);

  // Build materials once
  const materials = useMemo(() => {
    const hologram = createHologramMaterial(undefined, {
      color,
      alpha: 0.95,
      fresnelPower: 2.2,
      scanlineDensity: 420.0,
      scanlineStrength: 0.12,
      noiseStrength: 0.05,
      useAdditive: false
    });
    const rim = new MeshStandardMaterial({
      color: '#0a1a1f',
      metalness: 1,
      roughness: 0.25,
      emissive: '#001318',
      emissiveIntensity: 0.6
    });
    const glow = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.18
    });
    return { hologram, rim, glow };
  }, [color]);

  // Assign texture to hologram
  useEffect(() => {
    (materials.hologram as any).updateTexture(tex ?? undefined);
  }, [tex, materials.hologram]);

  // Time update
  useFrame((_, dt) => {
    (materials.hologram as any).tick(dt);
    if (spin && groupRef.current) {
      groupRef.current.rotation.y += spinSpeed * dt;
    }
    // Pulse glow with playback progress
    if (glowRef.current && durationMs > 0) {
      const p = (positionMs % durationMs) / durationMs;
      const s = 1.0 + 0.04 * Math.sin(p * Math.PI * 2.0 * 2.0);
      glowRef.current.scale.setScalar(s);
    }
  });

  // Interactions: wheel zoom and pinch zoom
  useEffect(() => {
    const el = gl.domElement as HTMLCanvasElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      const next = Math.max(0.6, Math.min(1.6, zoom * (1 + dir * 0.07)));
      onZoomChange?.(next);
    };
    let pinch: { dist: number; zoom: number } | null = null;
    const dist = (t0: Touch, t1: Touch) => {
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      return Math.hypot(dx, dy);
    };
    const ts = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinch = { dist: dist(e.touches[0], e.touches[1]), zoom };
      }
    };
    const tm = (e: TouchEvent) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const r = dist(e.touches[0], e.touches[1]) / (pinch.dist || 1);
        const next = Math.max(0.6, Math.min(1.6, (pinch.zoom || 1) * r));
        onZoomChange?.(next);
      }
    };
    const te = () => (pinch = null);

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', ts, { passive: false });
    el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', te, { passive: true });
    el.addEventListener('touchcancel', te, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', ts as any);
      el.removeEventListener('touchmove', tm as any);
      el.removeEventListener('touchend', te as any);
      el.removeEventListener('touchcancel', te as any);
    };
  }, [gl.domElement, zoom, onZoomChange]);

  // Interactions: scrub by dragging horizontally
  useEffect(() => {
    if (!onSeek || !durationMs) return;
    const el = gl.domElement as HTMLCanvasElement;
    let dragging = false;
    let startX = 0;
    let startPos = positionMs;

    const pd = (e: PointerEvent) => {
      dragging = true;
      startX = e.clientX;
      startPos = positionMs;
      el.setPointerCapture(e.pointerId);
    };
    const pu = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.clientX - startX;
      const deltaMs = (dx / 300) * durationMs; // heuristic: 300px drag = full track
      const next = Math.max(0, Math.min(durationMs, startPos + deltaMs));
      onSeek(next);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    el.addEventListener('pointerdown', pd);
    el.addEventListener('pointerup', pu);
    el.addEventListener('pointercancel', pu);
    return () => {
      el.removeEventListener('pointerdown', pd);
      el.removeEventListener('pointerup', pu);
      el.removeEventListener('pointercancel', pu);
    };
  }, [gl.domElement, onSeek, durationMs, positionMs]);

  const discGeo = useMemo(() => new CircleGeometry(radius, 128), [radius]);
  const ringGeo = useMemo(() => new RingGeometry(radius * 0.92, radius * 1.02, 128), [radius]);
  const glowGeo = useMemo(() => new RingGeometry(radius * 1.05, radius * 1.22, 96), [radius]);

  return (
    <group ref={groupRef} position={[0, height * zoom, 0]} scale={[zoom, zoom, zoom]}>
      {/* Rim ring (metallic) */}
      <mesh ref={ringRef} geometry={ringGeo} material={materials.rim} rotation={[-Math.PI / 2, 0, 0]} />
      {/* Glow ring (soft) */}
      <mesh ref={glowRef} geometry={glowGeo} material={materials.glow} rotation={[-Math.PI / 2, 0, 0]} />
      {/* Holographic disc */}
      <mesh ref={discRef} geometry={discGeo} rotation={[-Math.PI / 2, 0, 0]} material={materials.hologram} />
    </group>
  );
}