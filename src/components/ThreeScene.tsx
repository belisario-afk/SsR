import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Sparkles, Stars, Effects } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '@providers/ThemeProvider';
import { useSpeed } from '@providers/SpeedProvider';
import React, { Suspense } from 'react';
import { CarModel } from '@components/CarModel';

function NeonGrid() {
  const { theme } = useTheme();
  const gridRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (gridRef.current) {
      gridRef.current.position.z = -(t % 10);
    }
  });
  const c1 = theme.colors.primaryHex;
  return (
    <group ref={gridRef} position={[0, -2, 0]}>
      {[...Array(50)].map((_, i) => (
        <mesh key={i} position={[0, 0, -i * 2]}>
          <planeGeometry args={[100, 0.05]} />
          <meshBasicMaterial color={c1} />
        </mesh>
      ))}
      {[...Array(30)].map((_, i) => (
        <mesh key={'v' + i} position={[-30 + i * 2, 0, -50]}>
          <planeGeometry args={[0.05, 100]} />
          <meshBasicMaterial color={c1} />
        </mesh>
      ))}
    </group>
  );
}

export function ThreeScene() {
  const { intensity } = useSpeed();
  const { theme } = useTheme();

  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }} performance={{ min: 0.5 }}>
      <color attach="background" args={[0, 0, 0]} />
      <PerspectiveCamera makeDefault fov={60} position={[0, 1.2, 5]} />
      {/* Lights tuned to show most GLB materials without HDRI */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.9} color={theme.colors.primaryHex} />
      <directionalLight position={[-4, 3, -2]} intensity={0.6} color={theme.colors.accentHex} />

      {/* Car model */}
      <Suspense fallback={null}>
        <CarModel url="/models/hitem3d.glb" targetSize={3.8} spin />
      </Suspense>

      {/* Background FX */}
      <NeonGrid />
      <Stars radius={120} depth={50} count={2000 + Math.round(intensity * 3000)} factor={2} saturation={0} fade speed={0.25 + intensity * 1.2} />
      <Sparkles size={2} speed={0.4 + intensity} count={50 + Math.round(intensity * 100)} color={theme.colors.accentHex} scale={[8, 4, 8]} />
      <Effects disableGamma>{/* keep lightweight post effects */}</Effects>
      <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}