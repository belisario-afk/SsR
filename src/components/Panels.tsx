import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@providers/ThemeProvider';

type PanelsProps = {
  activeIndex: number;
};

const panelVariants = {
  initial: { opacity: 0, y: 60, scale: 0.98, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 180, damping: 18 } },
  exit: { opacity: 0, y: 60, scale: 0.98, filter: 'blur(8px)', transition: { duration: 0.25 } }
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <motion.div
      className="pointer-events-auto w-[92vw] tablet:w-[70vw] mx-auto rounded-3xl"
      style={{
        background: 'rgba(10,10,10,0.6)',
        border: `1px solid ${theme.colors.primaryHex}33`,
        boxShadow: `0 0 40px ${theme.colors.accentHex}33`,
        backdropFilter: 'blur(var(--panel-blur))'
      }}
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      role="region"
      aria-label={title}
    >
      <div className="px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl tablet:text-2xl font-semibold text-white">{title}</h2>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </motion.div>
  );
}

export function Panels({ activeIndex }: PanelsProps) {
  return (
    <div className="w-full">
      <AnimatePresence mode="popLayout">
        {activeIndex === 0 && (
          <Panel key="dash" title="Dashboard">
            <div className="grid grid-cols-2 tablet:grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-white/70">Engine</p>
                <p className="text-3xl font-bold">OP-Z</p>
                <p className="text-xs text-white/50">Neon Dynamics Stable</p>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-white/70">Mode</p>
                <p className="text-3xl font-bold">Cruise</p>
                <p className="text-xs text-white/50">Adaptive visuals</p>
              </div>
              <div className="rounded-xl border border-white/10 p-4 tablet:col-span-1 col-span-2">
                <p className="text-white/70">Telemetry</p>
                <div className="mt-2 h-16 bg-black/60 rounded-lg overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-r from-sky-500/40 via-fuchsia-500/30 to-emerald-500/40 animate-pulse" />
                </div>
              </div>
            </div>
          </Panel>
        )}
        {activeIndex === 1 && (
          <Panel key="viz" title="Visual Gadgets">
            <ul className="text-white/80 space-y-2">
              <li>- Particle emitters: spark, warp, starlight</li>
              <li>- Lens bloom with adaptive intensity</li>
              <li>- Neon trail grid parallax</li>
              <li>- Spy unfold animations for sub-panels</li>
            </ul>
          </Panel>
        )}
        {activeIndex === 2 && (
          <Panel key="assist" title="Assistant & Controls">
            <ul className="text-white/80 space-y-2">
              <li>Say: "play", "pause", "next", or "theme chase/starlight/romance"</li>
              <li>Swipe left/right to change panel — swipe up to cycle theme</li>
              <li>Settings (top right): Fullscreen, High Contrast, Car Dock</li>
            </ul>
          </Panel>
        )}
      </AnimatePresence>
    </div>
  );
}