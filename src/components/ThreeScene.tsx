import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Effects, Environment, OrbitControls, PerspectiveCamera, Sparkles, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '@providers/ThemeProvider';
import { useSpeed } from '@providers/SpeedProvider';
import { CarModel } from '@components/CarModel';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { MapFloor } from '@components/MapFloor';

function useGPS(initial = { lat: 34.6509, lon: -120.4544, heading: 0 }) {
  const [enabled, setEnabled] = useState(false);
  const [coords, setCoords] = useState(initial);

  useEffect(() => {
    const onFirstGesture = () => setEnabled(true);
    window.addEventListener('pointerdown', onFirstGesture, { once: true });
    window.addEventListener('keydown', onFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading } = pos.coords;
        setCoords((c) => ({
          lat: latitude ?? c.lat,
          lon: longitude ?? c.lon,
          heading: typeof heading === 'number' && !Number.isNaN(heading) ? heading : c.heading,
        }));
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return coords;
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
  const { lat, lon, heading } = useGPS();

  // Heading degrees (0 = north, clockwise) to radians for Y-rotation
  const headingRad = useMemo(() => THREE.MathUtils.degToRad(heading || 0), [heading]);

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      performance={{ min: 0.5 }}
      shadows
    >
      <color attach="background" args={[0, 0, 0]} />
      <PerspectiveCamera makeDefault fov={60} position={[0, 1.5, 6]} />

      {/* Lights tuned for glossy black reflections */}
      <ambientLight intensity={0.35} />
      <hemisphereLight color={theme.colors.primaryHex} groundColor="#111111" intensity={0.7} />
      <directionalLight position={[5, 6, 5]} intensity={1.1} color={theme.colors.primaryHex} castShadow />
      <directionalLight position={[-4, 3, -2]} intensity={0.8} color={theme.colors.accentHex} />

      {/* Local HDRI — place public/env/studio.hdr */}
      <Suspense fallback={null}>
        <Environment files="env/studio.hdr" background={false} />
      </Suspense>

      {/* Map floor centered on GPS position */}
      <Suspense fallback={null}>
        <MapFloor
          center={{ lat, lon }}
          zoom={17}
          size={80}
          y={-2}
          tileTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </Suspense>

      {/* Car (glossy black handled in CarModel), rotated by heading */}
      <ErrorBoundary fallback={<TorusFallback />}>
        <Suspense fallback={null}>
          <group rotation-y={headingRad}>
            <CarModel targetSize={3.8} spin={false} glossyBlack />
          </group>
        </Suspense>
      </ErrorBoundary>

      {/* Background FX */}
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
      <Effects disableGamma />
      <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}