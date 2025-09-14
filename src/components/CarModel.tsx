import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import { Box3, Color, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { ENV } from '@config/env';

// Join BASE_URL with a relative path (works on GitHub Pages "/SsR/")
function baseJoin(rel: string) {
  const base = (import.meta.env.BASE_URL as string) || '/';
  const baseTrimmed = base.endsWith('/') ? base : base + '/';
  const relTrimmed = rel.startsWith('/') ? rel.slice(1) : rel;
  return baseTrimmed + relTrimmed;
}

// Tell GLTFLoader where to load Draco decoders from (same-origin)
useGLTF.setDecoderPath(baseJoin('draco/'));

type CarModelProps = {
  url?: string;
  targetSize?: number;
  spin?: boolean;
  yOffset?: number;
  glossyBlack?: boolean;
  lowPower?: boolean;
};

const DEFAULT_EXTERNAL_URL = ENV.MODEL_URL;

export function CarModel({
  url = DEFAULT_EXTERNAL_URL,
  targetSize = 3.8,
  spin = false,
  yOffset = 0,
  glossyBlack = true,
  lowPower = true
}: CarModelProps) {
  const gltf = useGLTF(url) as any;

  const sceneClone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const modelGroup = useRef<Group>(null!);
  const glossApplied = useRef(false);

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

// Preload model (uses the decoder path set above)
useGLTF.preload(DEFAULT_EXTERNAL_URL);