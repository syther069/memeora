'use client';

import * as React from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

/** Moves with the scrollbar at a fraction of its speed. Locked to it, with no smoothing. */
export function Drift({ speed, className, style, children }: { speed: number; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (value) => value * speed);
  return <motion.div className={className} style={{ ...style, y: reduced ? 0 : y }}>{children}</motion.div>;
}

/** The first screen sinks back a little as the page moves on. */
export function Recede({ className, children }: { className?: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 900], [1, 0.95]);
  return <motion.div className={className} style={{ scale: reduced ? 1 : scale, transformOrigin: '50% 0%' }}>{children}</motion.div>;
}

/** Hero cards shift by their own depth with a mouse or trackpad. Touch is left alone. */
export function PointerStage({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLElement>(null);
  const frame = React.useRef(0);

  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const node = ref.current;
    if (!node || event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const box = node.getBoundingClientRect();
      node.style.setProperty('--px', ((clientX - box.left) / box.width - 0.5).toFixed(3));
      node.style.setProperty('--py', ((clientY - box.top) / box.height - 0.5).toFixed(3));
    });
  };

  return <section ref={ref} className={className} onPointerMove={onPointerMove}>{children}</section>;
}
