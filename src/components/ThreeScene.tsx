import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '@providers/ThemeProvider';
import { CarModel } from '@components/CarModel';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { AlbumFloor } from '@components/AlbumFloor';

// Heuristic: treat Android tablets/low-end devices as "low power"
function useLowPowerMode() {
  const [low, setLow] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isSamsungTab = /(SM\-T|Samsung|Galaxy Tab)/i.test(ua);
    const mem = (navigator as any).deviceMemory || 0; // 2/4/8
    const cores = navigator.hardwareConcurrency || 0;
    const smallRam = mem && mem <= 4;
    const fewCores = cores && cores <= 4;
    setLow(Boolean(isAndroid && (isSamsungTab || smallRam || fewCores)) || smallRam || fewCores);
  }, []);
  return low;
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
  const lowPower = useLowPowerMode();
  const { theme } = useTheme();

  const headingRad = useMemo(() => 0, []);

  return (
    <Canvas
      dpr={1}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: true,
      }}
      performance={{ min: 0.3 }}
      shadows={false}
    >
      <color attach="background" args={[0, 0, 0]} />
      <fog attach="fog" args={['#000000', 10, 50]} />
      <PerspectiveCamera makeDefault fov={62} position={[0, 1.5, 6.5]} />

      <ambientLight intensity={0.45} />
      <hemisphereLight color={theme.colors.primaryHex} groundColor="#0f0f0f" intensity={0.75} />
      <directionalLight position={[0, 3, -4]} intensity={0.5} color="#ffffff" />

      <Suspense fallback={null}>
        <Environment files="env/studio.hdr" background={false} />
      </Suspense>

      <Suspense fallback={null}>
        <AlbumFloor size={80} y={-2} />
      </Suspense>

      <ErrorBoundary fallback={<TorusFallback />}>
        <Suspense fallback={null}>
          <group rotation-y={headingRad}>
            <CarModel targetSize={3.8} spin={false} glossyBlack lowPower={lowPower} />
          </group>
        </Suspense>
      </ErrorBoundary>

      <OrbitControls enablePan={false} enableZoom={false} enableDamping={false} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}