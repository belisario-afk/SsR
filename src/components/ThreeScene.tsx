import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Sparkles, Stars, Effects } from '@react-three/drei';
import { useRef, Suspense } from 'react';
import * as THREE from 'three';
import { useTheme } from '@providers/ThemeProvider';
import { useSpeed } from '@providers/SpeedProvider';
import React from 'react';
import { CarModel } from '@components/CarModel';
import { ErrorBoundary } from '@components/ErrorBoundary';

function NeonGrid() {
  const { theme } = useTheme();
  const gridRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (gridRef.current) gridRef.current.position.z = -(t % 10);
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

function TorusFallback() {
  const { theme } = useTheme();
  return (
    <mesh>
      <torusKnotGeometry args={[1.2, 0.25, 150, 24]} />
      <meshStandardMaterial color={theme.colors.accentHex} roughness={0.3} metalness={0.4} />
    </mesh>
  );
}

export function ThreeScene() {
  const { intensity } = useSpeed();
  const { theme } = useTheme();

  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }} performance={{ min: 0.5 }}>
      <color attach="background" args={[0, 0, 0]} />
      <PerspectiveCamera makeDefault fov={60} position={[0, 1.2, 5]} />

      {/* Lighting tuned for glossy black car */}
      <ambientLight intensity={0.35} />
      <hemisphereLight color={theme.colors.primaryHex} groundColor="#111111" intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} color={theme.colors.primaryHex} />
      <directionalLight position={[-4, 3, -2]} intensity={0.8} color={theme.colors.accentHex} />

      {/* Car model (material override to glossy black happens inside CarModel) */}
      <ErrorBoundary fallback={<TorusFallback />}>
        <Suspense fallback={null}>
          <CarModel targetSize={3.8} spin glossyBlack />
        </Suspense>
      </ErrorBoundary>

      {/* Background FX */}
      <NeonGrid />
      <Stars
        radius={120}
        depth={50}
        count={2000 + Math.round(intensity * 3000)}
        factor={2}
        saturation={0}
        fade
        speed={0.25 + intensity * 1.2}
      />
      <Sparkles
        size={2}
        speed={0.4 + intensity}
        count={50 + Math.round(intensity * 100)}
        color={theme.colors.accentHex}
        scale={[8, 4, 8]}
      />
      <Effects disableGamma>{/* lightweight post effects only */}</Effects>
      <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}