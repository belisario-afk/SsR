import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@providers/ThemeProvider';
import { useUI } from '@providers/UIProvider';
import { Dashboard } from '@components/Dashboard';

type PanelsProps = {
  activeIndex: number;
};

const panelVariants = {
  initial: { opacity: 0, y: 60, scale: 0.98, '--blur': '8px' } as any,
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    '--blur': '0px',
    transition: { type: 'spring', stiffness: 180, damping: 20, bounce: 0 }
  } as any,
  exit: { opacity: 0, y: 60, scale: 0.98, '--blur': '8px', transition: { duration: 0.25 } } as any
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <motion.div
      className="pointer-events-auto w-[92vw] tablet:w-[70vw] mx-auto rounded-3xl"
      style={
        {
          background: 'rgba(10,10,10,0.6)',
          border: `1px solid ${theme.colors.primaryHex}33`,
          boxShadow: `0 0 40px ${theme.colors.accentHex}33`,
          backdropFilter: 'blur(var(--panel-blur))',
          filter: 'blur(clamp(0px, var(--blur, 0px), 12px))',
          ['--blur' as any]: '0px',
          ['--panel-blur' as any]: '10px'
        } as any
      }
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
  const { demoMode } = useUI();

  return (
    <div className="w-full">
      <AnimatePresence mode="popLayout">
        {activeIndex === 0 && (
          <Panel key="dash" title="Dashboard">
            <Dashboard />
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
              {demoMode && (
                <>
                  <li>Say: "play", "pause", "next", "previous", or "theme spy gadget"</li>
                  <li>"volume 40%", "louder", "quieter", "mute", "unmute"</li>
                  <li>"show player", "open playlists", "weather", "what time is it", "battery"</li>
                  <li>"navigate to Starbucks", "toggle demo mode"</li>
                </>
              )}
              {!demoMode && <li className="text-white/50">Demo instructions are hidden.</li>}
            </ul>
          </Panel>
        )}
      </AnimatePresence>
    </div>
  );
}