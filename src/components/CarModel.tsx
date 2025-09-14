import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import { Group, Box3, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';

type CarModelProps = {
  url?: string;           // Path to your GLB
  targetSize?: number;    // Fit longest dimension to this world-unit size
  spin?: boolean;         // Gently rotate the model
  yOffset?: number;       // Nudge up/down if needed
};

export function CarModel({ url = '/models/hitem3d.glb', targetSize = 3.8, spin = true, yOffset = 0 }: CarModelProps) {
  // Load GLB (same-origin fetch, works with your CSP)
  const gltf = useGLTF(url) as any;

  // Clone the loaded scene so we can safely manipulate transforms
  const sceneClone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // Group to control scale/rotation without mutating the original
  const modelGroup = useRef<Group>(null!);

  // Auto-scale to targetSize (fit longest dimension) and let <Center> center it at origin
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
    // Subtle breathing/rotate motion
    modelGroup.current.rotation.y = t * 0.2;
  });

  return (
    <group position-y={yOffset}>
      {/* Centers model so (0,0,0) is in its middle */}
      <Center>
        <group ref={modelGroup}>
          <primitive object={sceneClone} />
        </group>
      </Center>
    </group>
  );
}

// Preload default path (optional)
useGLTF.preload('/models/hitem3d.glb');