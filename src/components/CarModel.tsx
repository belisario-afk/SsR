import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import {
  Box3,
  Color,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Vector3,
} from 'three';
import { useFrame } from '@react-three/fiber';

type CarModelProps = {
  url?: string;           // GLB URL
  targetSize?: number;    // Fit longest dimension to this world-unit size
  spin?: boolean;         // Gently rotate the model
  yOffset?: number;       // Nudge up/down if needed
  glossyBlack?: boolean;  // Force glossy black material override
};

// Resolve a relative path (no leading slash) against the current page base.
// Example: base https://belisario-afk.github.io/SsR/ + "models/hitem3d.glb" -> https://belisario-afk.github.io/SsR/models/hitem3d.glb
function resolveAgainstBase(relativePath: string) {
  if (typeof document !== 'undefined') {
    try {
      return new URL(relativePath, document.baseURI).toString();
    } catch {
      // fall through
    }
  }
  return relativePath;
}

const defaultUrl = resolveAgainstBase('models/hitem3d.glb');

export function CarModel({
  url = defaultUrl,
  targetSize = 3.8,
  spin = true,
  yOffset = 0,
  glossyBlack = true
}: CarModelProps) {
  const gltf = useGLTF(url) as any;

  // Clone the loaded scene so we can safely manipulate transforms/materials
  const sceneClone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const modelGroup = useRef<Group>(null!);
  const glossApplied = useRef(false);

  // Replace all materials with glossy piano black
  useLayoutEffect(() => {
    if (!glossyBlack || !modelGroup.current || glossApplied.current) return;

    const newMat = () =>
      new MeshPhysicalMaterial({
        color: new Color('#111111'), // very dark gray so form reads
        metalness: 1.0,
        roughness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.2
      });

    modelGroup.current.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!(mesh as any).isMesh || !mesh.material) return;

      // Dispose old materials to avoid leaks
      const old = mesh.material as any;
      if (Array.isArray(old)) old.forEach((m) => m?.dispose?.());
      else old?.dispose?.();

      mesh.material = newMat();
      (mesh as any).castShadow = true;
      (mesh as any).receiveShadow = true;
    });

    glossApplied.current = true;
  }, [glossyBlack]);

  // Auto-scale to targetSize (fit longest dimension) and let <Center> center it
  useLayoutEffect(() => {
    if (!modelGroup.current) return;
    const box = new Box3().setFromObject(modelGroup.current);
    const size = new Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = targetSize / maxDim;
    modelGroup.current.scale.setScalar(scale);
  }, [targetSize]);

  // Gentle idle rotation
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

// Preload with the resolved URL
useGLTF.preload(defaultUrl);