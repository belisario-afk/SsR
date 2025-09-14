import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import {
  Box3,
  Color,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { useFrame } from '@react-three/fiber';

type CarModelProps = {
  url?: string;           // GLB URL
  targetSize?: number;    // Fit longest dimension to this world-unit size
  spin?: boolean;         // Gently rotate the model
  yOffset?: number;       // Nudge up/down if needed
  glossyBlack?: boolean;  // Force glossy black material override
  lowPower?: boolean;     // Cheaper material shader on low-power devices
};

// Prefer external URL (GitHub Releases or CDN) to avoid 100MB repo limit.
// Set VITE_MODEL_URL in your .env to override.
const DEFAULT_EXTERNAL_URL =
  import.meta.env.VITE_MODEL_URL ??
  'https://github.com/belisario-afk/SsR/releases/download/model-assets/hitem3d.glb';

export function CarModel({
  url = DEFAULT_EXTERNAL_URL,
  targetSize = 3.8,
  spin = true,
  yOffset = 0,
  glossyBlack = true,
  lowPower = false
}: CarModelProps) {
  const gltf = useGLTF(url) as any;

  const sceneClone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const modelGroup = useRef<Group>(null!);
  const glossApplied = useRef(false);

  // Replace all materials; choose cheaper shader on low-power
  useLayoutEffect(() => {
    if (!glossyBlack || !modelGroup.current || glossApplied.current) return;

    const makePhysical = () =>
      new MeshPhysicalMaterial({
        color: new Color('#121212'),
        metalness: 1.0,
        roughness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.035,
        envMapIntensity: 1.35
      });

    const makeStandard = () =>
      new MeshStandardMaterial({
        color: new Color('#141414'),
        metalness: 0.95,
        roughness: 0.14,
        envMapIntensity: 1.3
      });

    const newMat = lowPower ? makeStandard : makePhysical;

    modelGroup.current.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!(mesh as any).isMesh || !mesh.material) return;

      const old = mesh.material as any;
      if (Array.isArray(old)) old.forEach((m) => m?.dispose?.());
      else old?.dispose?.();

      mesh.material = newMat();
      (mesh as any).castShadow = false;
      (mesh as any).receiveShadow = false;
    });

    glossApplied.current = true;
  }, [glossyBlack, lowPower]);

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

// Important for cross-origin fetches
useGLTF.preload(DEFAULT_EXTERNAL_URL);