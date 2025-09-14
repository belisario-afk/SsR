import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import { Group, Box3, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';

type CarModelProps = {
  url?: string;           // GLB URL
  targetSize?: number;    // Fit longest dimension to this world-unit size
  spin?: boolean;         // Gently rotate the model
  yOffset?: number;       // Nudge up/down if needed
};

// Build a base-aware URL for Vite (works for / and /repo/ on GitHub Pages)
// Note: We construct as a path string; do NOT use new URL() because BASE_URL
// is a pathname (e.g., "/repo/") not an absolute URL.
function getDefaultModelUrl() {
  const viteBase = (import.meta as any)?.env?.BASE_URL as string | undefined;
  const base = (viteBase && typeof viteBase === 'string' ? viteBase : '/').replace(/\/+$/, '');
  // base is now "" (for "/") or "/repo"
  return `${base}/models/hitem3d.glb`;
}

const defaultUrl = getDefaultModelUrl();

export function CarModel({ url = defaultUrl, targetSize = 3.8, spin = true, yOffset = 0 }: CarModelProps) {
  const gltf = useGLTF(url) as any;

  const sceneClone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const modelGroup = useRef<Group>(null!);

  useLayoutEffect(() => {
    if (!modelGroup.current) return;
    const box = new Box3().setFromObject(modelGroup.current);
    const size = new Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = targetSize / maxDim;
    modelGroup.current.scale.setScalar(scale);
  }, [targetSize]);

  useFrame((state) => {
    if (!spin || !modelGroup.current) return;
    const t = state.clock.getElapsedTime();
    modelGroup.current.rotation.y = t * 0.2;
  });

  return (
    <group position-y={yOffset}>
      <Center>
        <group ref={modelGroup}>
          <primitive object={sceneClone} />
        </group>
      </Center>
    </group>
  );
}

// Preload (base-aware)
useGLTF.preload(defaultUrl);