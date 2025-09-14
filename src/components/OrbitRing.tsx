import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';

type OrbitItem = {
  id: string;
  element: React.ReactNode;
  color?: string;
};

type OrbitRingProps = {
  radius?: number;
  y?: number;
  items: OrbitItem[];
};

export function OrbitRing({ radius = 9, y = 0.2, items }: OrbitRingProps) {
  const group = useRef<Group>(null!);
  const [angle, setAngle] = useState(0);
  const targetAngle = useRef(0);
  const snapping = useRef(false);

  // Smooth angle animation
  useFrame((_, dt) => {
    const diff = targetAngle.current - angle;
    setAngle((a) => a + diff * Math.min(1, dt * 6));
    if (group.current) {
      group.current.rotation.y = angle;
    }
  });

  // Drag to rotate
  useEffect(() => {
    const el = document;
    let drag = false;
    let sx = 0;
    let sa = 0;

    const down = (e: PointerEvent) => {
      drag = true;
      sx = e.clientX;
      sa = targetAngle.current;
      snapping.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - sx;
      targetAngle.current = sa + dx * 0.0045;
    };
    const up = () => {
      if (!drag) return;
      drag = false;
      // Snap to nearest item (distributed evenly)
      const step = (Math.PI * 2) / Math.max(1, items.length);
      const idx = Math.round(((targetAngle.current % (Math.PI * 2)) + Math.PI * 2) / step) % items.length;
      targetAngle.current = idx * step;
      snapping.current = true;
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [items.length]);

  const cardGeo = useMemo(() => new PlaneGeometry(3.2, 2.0, 1, 1), []);
  const cardMat = useMemo(() => new MeshBasicMaterial({ color: '#0d1013', transparent: true, opacity: 0.5 }), []);

  return (
    <group ref={group} position={[0, y, 0]}>
      {items.map((it, i) => {
        const theta = (i / items.length) * Math.PI * 2;
        return (
          <group key={it.id} position={[Math.cos(theta) * radius, 0, Math.sin(theta) * radius]} rotation={[0, -theta + Math.PI, 0]}>
            <mesh geometry={cardGeo} material={cardMat} position={[0, 0, 0]} />
            <group position={[0, 0, 0.01]}>
              {/* 3D space for React child via drei's <Html> could be added later; for now we render as 3D placeholder */}
              {/* Replace with actual panel components (Playlists, Comms, Map, Weather/Speed, System) */}
            </group>
          </group>
        );
      })}
    </group>
  );
}