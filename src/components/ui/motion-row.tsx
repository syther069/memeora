'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** A list row that opens on arrival and closes on removal. Use inside AnimatePresence initial={false}. */
export function MotionRow({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.li
      className="overflow-clip [overflow-clip-margin:8px]"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.li>
  );
}
