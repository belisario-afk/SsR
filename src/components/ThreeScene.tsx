import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Effects, Environment, OrbitControls, PerspectiveCamera, Sparkles, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '@providers/ThemeProvider';
import { useSpeed } from '@providers/SpeedProvider';
import { CarModel } from '@components/CarModel';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { MapFloor } from '@components/MapFloor';

// Heuristic: treat many Android tablets/low-end devices as "low power"
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

// Geolocation gated behind user gesture; high accuracy, low cache
type GeoFix = { lat: number; lon: number; heading: number; speed: number; ts: number };
function useGPS(initial: GeoFix = { lat: 34.6509, lon: -120.4544, heading: 0, speed: 0, ts: Date.now() }) {
  const [enabled, setEnabled] = useState(false);
  const [fix, setFix] = useState<GeoFix>(initial);

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
        const { latitude, longitude, heading, speed } = pos.coords;
        setFix({
          lat: latitude,
          lon: longitude,
          heading: typeof heading === 'number' && !Number.isNaN(heading) ? heading : 0,
          speed: typeof speed === 'number' && !Number.isNaN(speed) && speed != null ? speed : 0, // m/s
          ts: pos.timestamp || Date.now(),
        });
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return fix;
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
  const { intensity } = useSpeed();
  const { theme } = useTheme();
  const fix = useGPS();

  // Heading degrees (0 = north, clockwise) to radians for Y-rotation
  const headingRad = useMemo(() => THREE.MathUtils.degToRad(fix.heading || 0), [fix.heading]);

  // Dynamic map zoom:
  // - Z_MAX when stopped, gradually zooms out as speed increases.
  // - Clamp to a wider view so it’s not “too zoomed in”.
  const dynamicZoom = useMemo(() => {
    const kmh = (fix.speed || 0) * 3.6;
    const Z_MAX = 16;                   // closer-in when stopped
    const Z_MIN = lowPower ? 13 : 9;   // farthest out allowed
    // Drop ~1 zoom level every 40 km/h
    const z = Z_MAX - kmh / 40;
    return Math.round(THREE.MathUtils.clamp(z, Z_MIN, Z_MAX));
  }, [fix.speed, lowPower]);

  // FX density
  const starsCount = lowPower ? 800 : 2000 + Math.round(intensity * 3000);
  const sparklesCount = lowPower ? 30 : 50 + Math.round(intensity * 100);

  return (
    <Canvas
      dpr={lowPower ? 1 : [1, 2]} // Clamp DPR on low-power
      gl={{
        antialias: !lowPower,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
      }}
      performance={{ min: lowPower ? 0.2 : 0.5 }}
      shadows={false} // keep cheap
    >
      <color attach="background" args={[0, 0, 0]} />
      <PerspectiveCamera makeDefault fov={lowPower ? 65 : 60} position={[0, 1.5, lowPower ? 6.5 : 6]} />

      {/* Lights tuned for glossy black reflections */}
      <ambientLight intensity={lowPower ? 0.4 : 0.35} />
      <hemisphereLight color={theme.colors.primaryHex} groundColor="#111111" intensity={lowPower ? 0.8 : 0.7} />
      <directionalLight position={[-4, 3, -2]} intensity={lowPower ? 0.6 : 0.8} color={theme.colors.accentHex} />

      {/* Local HDRI — place public/env/studio.hdr */}
      <Suspense fallback={null}>
        <Environment files="env/studio.hdr" background={false} />
      </Suspense>

      {/* Map floor centered on GPS; dynamic zoom for wider view */}
      <Suspense fallback={null}>
        <MapFloor
          center={{ lat: fix.lat, lon: fix.lon }}
          speed={fix.speed}
          headingRad={headingRad}
          zoom={dynamicZoom}         // <-- change this to 15 for a fixed wide view
          y={-2}
          tileTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          lowPower={lowPower}
          throttleMs={lowPower ? 1000 : 300}
          resScale={lowPower ? 0.5 : 1}
        />
      </Suspense>

      {/* Car (glossy black handled in CarModel), rotated by heading; fixed at origin */}
      <ErrorBoundary fallback={<TorusFallback />}>
        <Suspense fallback={null}>
          <group rotation-y={headingRad}>
            <CarModel targetSize={3.8} spin={false} glossyBlack lowPower={lowPower} />
          </group>
        </Suspense>
      </ErrorBoundary>

      {/* Background FX */}
      <Stars radius={120} depth={50} count={starsCount} factor={lowPower ? 1.5 : 2} saturation={0} fade speed={0.2 + (lowPower ? 0.6 : intensity * 1.2)} />
      {!lowPower && <Sparkles size={2} speed={0.4 + intensity} count={sparklesCount} color={theme.colors.accentHex} scale={[8, 4, 8]} />}

      {!lowPower && <Effects disableGamma />}

      <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}