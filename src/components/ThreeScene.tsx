import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { CarModel } from '@components/CarModel';
import { AlbumFloor } from '@components/AlbumFloor';
import { ENV } from '@config/env';
import { useSpotify } from '@providers/SpotifyProvider';

function useLowPowerMode() {
  const [low, setLow] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isSamsungTab = /(SM\-T|Samsung|Galaxy Tab)/i.test(ua);
    const mem = (navigator as any).deviceMemory || 0;
    const cores = navigator.hardwareConcurrency || 0;
    const smallRam = mem && mem <= 4;
    const fewCores = cores && cores <= 4;
    setLow(isAndroid || isSamsungTab || smallRam || fewCores);
  }, []);
  return low;
}

export function ThreeScene() {
  const lowPower = useLowPowerMode();
  const headingRad = useMemo(() => 0, []);
  const { track } = useSpotify();

  return (
    <Canvas
      dpr={1}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false
      }}
      onCreated={(state) => {
        // Prevent browser default behavior on context lost so R3F can restore.
        state.gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
      }}
      performance={{ min: 0.3 }}
      shadows={false}
    >
      <color attach="background" args={[0, 0, 0]} />
      <fog attach="fog" args={['#000000', 10, 50]} />
      <PerspectiveCamera makeDefault fov={62} position={[0, 1.5, 6.5]} />

      <ambientLight intensity={0.45} />
      <hemisphereLight color="#2e74ff" groundColor="#0f0f0f" intensity={0.75} />
      <directionalLight position={[0, 3, -4]} intensity={0.5} color="#ffffff" />

      <Suspense fallback={null}>
        <Environment files="env/studio.hdr" background={false} />
      </Suspense>

      <Suspense fallback={null}>
        {/* Album cover wired to Spotify track artwork, with interactive zoom (wheel/pinch).
           Default scale slightly smaller for a “zoomed-out” look. */}
        <AlbumFloor
          size={80}
          y={-2}
          imageUrl={track?.albumImage || (ENV as any).ALBUM_TEST_URL || undefined}
          coverScale={0.75}
          interactive
          minScale={0.3}
          maxScale={1.0}
        />
      </Suspense>

      <Suspense fallback={null}>
        <group rotation-y={headingRad}>
          <CarModel targetSize={3.8} spin={false} glossyBlack lowPower={lowPower} />
        </group>
      </Suspense>

      <OrbitControls enablePan={false} enableZoom={false} enableDamping={false} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}