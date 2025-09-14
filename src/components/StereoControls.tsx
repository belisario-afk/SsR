import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, RingGeometry, TorusGeometry } from 'three';

type StereoControlsProps = {
  radius?: number;
  y?: number;
  playing: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  volume: number;
  setVolume: (v: number) => void;
  onCycleEQ?: () => void; // placeholder
};

export function StereoControls({
  radius = 4.6,
  y = -1.35,
  playing,
  onTogglePlay,
  onNext,
  volume,
  setVolume,
  onCycleEQ
}: StereoControlsProps) {
  const group = useRef<Group>(null!);
  const playBtn = useRef<Mesh>(null!);
  const nextBtn = useRef<Mesh>(null!);
  const volRing = useRef<Mesh>(null!);
  const eqKnob = useRef<Mesh>(null!);

  const matPlay = useMemo(() => new MeshStandardMaterial({ color: '#00e1ff', emissive: '#00bcd4', emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.2 }), []);
  const matNext = useMemo(() => new MeshStandardMaterial({ color: '#6a00ff', emissive: '#7c4dff', emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.2 }), []);
  const matVol = useMemo(() => new MeshStandardMaterial({ color: '#12ffb8', emissive: '#00ffa6', emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.2 }), []);
  const matEQ = useMemo(() => new MeshStandardMaterial({ color: '#ff2ea6', emissive: '#ff44c7', emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.2 }), []);

  const geoButton = useMemo(() => new TorusGeometry(0.35, 0.1, 12, 32), []);
  const geoVolRing = useMemo(() => new TorusGeometry(0.9, 0.08, 12, 64), []);
  const geoEQ = useMemo(() => new TorusGeometry(0.5, 0.1, 12, 32), []);

  // Layout buttons around a circle
  useFrame((_, dt) => {
    if (!group.current) return;
    const base = radius;
    if (playBtn.current) {
      playBtn.current.position.set(Math.cos(0.0) * base, y, Math.sin(0.0) * base);
      playBtn.current.lookAt(0, y, 0);
      playBtn.current.rotation.z += (playing ? 1 : -1) * dt * 1.2;
    }
    if (nextBtn.current) {
      nextBtn.current.position.set(Math.cos(Math.PI * 0.66) * base, y, Math.sin(Math.PI * 0.66) * base);
      nextBtn.current.lookAt(0, y, 0);
    }
    if (volRing.current) {
      volRing.current.position.set(Math.cos(-Math.PI * 0.66) * base, y, Math.sin(-Math.PI * 0.66) * base);
      volRing.current.lookAt(0, y, 0);
      // subtle pulsing based on volume
      const s = 1 + (volume - 0.5) * 0.1;
      volRing.current.scale.setScalar(s);
    }
    if (eqKnob.current) {
      eqKnob.current.position.set(Math.cos(Math.PI * 1.15) * base, y, Math.sin(Math.PI * 1.15) * base);
      eqKnob.current.lookAt(0, y, 0);
    }
  });

  // Simple interactions: rely on onClick in overlay UI or raycasting handled by parent if added later.
  // For now we expose the meshes so parent could attach pointer handlers via refs if needed.

  return (
    <group ref={group}>
      <mesh ref={playBtn} geometry={geoButton} material={matPlay} onClick={onTogglePlay} />
      <mesh ref={nextBtn} geometry={geoButton} material={matNext} onClick={onNext} />
      <mesh
        ref={volRing}
        geometry={geoVolRing}
        material={matVol}
        onPointerDown={(e) => {
          e.stopPropagation();
          const startX = e.clientX;
          const startV = volume;
          const el = (e.target as any)?.ownerDocument?.defaultView?.document ?? document;
          const move = (ev: any) => {
            const dx = (ev.clientX || 0) - startX;
            const next = Math.max(0, Math.min(1, startV + dx / 300));
            setVolume(next);
          };
          const up = () => {
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', up);
          };
          el.addEventListener('pointermove', move);
          el.addEventListener('pointerup', up, { once: true });
        }}
      />
      <mesh ref={eqKnob} geometry={geoEQ} material={matEQ} onClick={() => onCycleEQ?.()} />
    </group>
  );
}