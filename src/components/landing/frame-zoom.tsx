'use client';

import * as React from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

/**
 * A screen that fills the view, then draws back into a rounded frame as you scroll.
 * An original Memeora section. The idea comes from the Skiper 29 preview
 * (https://skiper-ui.com/v1/preview/skiper29). Its source is paid and was not used.
 * Under reduced motion it is simply a framed screen.
 */
export function FrameZoom({ shot, children }: { shot: React.ReactNode; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const clipPath = useTransform(scrollYProgress, [0, 0.85], ['inset(0% 0% 0% 0% round 0px)', 'inset(9% 8% 9% 8% round 28px)']);
  const scale = useTransform(scrollYProgress, [0, 0.85], [1.14, 1]);

  return (
    <div ref={ref} className="relative h-[220vh] bg-[var(--brand-blue)] motion-reduce:h-auto">
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-[70vh] motion-reduce:p-4">
        <motion.div className="relative h-full overflow-hidden bg-[var(--surface-sunken)] motion-reduce:rounded-[var(--radius-xl)] motion-reduce:[clip-path:none]!" style={reduced ? undefined : { clipPath }}>
          <motion.div className="absolute inset-0 motion-reduce:transform-none!" style={reduced ? undefined : { scale }}>{shot}</motion.div>
          <div className="absolute inset-0 grid place-content-center justify-items-center gap-3 px-4 text-center">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
