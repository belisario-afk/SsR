import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { CarModel } from '@components/CarModel';
import { HoloPlatter } from '@components/HoloPlatter';
import { StereoControls } from '@components/StereoControls';
import { OrbitRing } from '@components/OrbitRing';
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
  const { track, playing, togglePlay, nextTrack, volume, setVolume, positionMs, durationMs, seekTo } = useSpotify();

  const [zoom, setZoom] = useState(1);

  const orbitItems = useMemo(
    () => [
      { id: 'now', element: null, color: '#00e1ff' },
      { id: 'lists', element: null, color: '#6a00ff' },
      { id: 'map', element: null, color: '#00ffa6' },
      { id: 'comms', element: null, color: '#ff2ea6' },
      { id: 'system', element: null, color: '#ffaa00' }
    ],
    []
  );

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
        <HoloPlatter
          albumUrl={track?.albumImage}
          radius={3.8}
          height={-1.5}
          spin
          spinSpeed={0.8}
          zoom={zoom}
          onZoomChange={setZoom}
          durationMs={durationMs}
          positionMs={positionMs}
          onSeek={seekTo}
          color="#00e1ff"
        />
      </Suspense>

      <Suspense fallback={null}>
        <StereoControls
          playing={playing}
          onTogglePlay={togglePlay}
          onNext={nextTrack}
          volume={volume}
          setVolume={setVolume}
          onCycleEQ={() => {
            // TODO: wire EQ presets (visual only for now)
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <OrbitRing items={orbitItems} />
      </Suspense>

      <Suspense fallback={null}>
        {/* Optional: ghost the car behind for depth; disable for very low power */}
        {!lowPower && (
          <group position-y={-2.2} scale={[0.9, 0.9, 0.9]} rotation-y={0.15}>
            <CarModel targetSize={3.2} spin={false} glossyBlack lowPower={true} />
          </group>
        )}
      </Suspense>

      <OrbitControls enablePan={false} enableZoom={false} enableDamping={false} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}