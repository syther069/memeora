'use client';

import * as React from 'react';
import Lenis from 'lenis';

/**
 * Smooths wheel scrolling on the landing page, as the Skiper 30 and 17 sources do.
 * Touch scrolling stays native. It is off under reduced motion, and it is destroyed
 * on leaving, so the app's own scrolling is never touched.
 */
export function SmoothScroll() {
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ autoRaf: true, anchors: true });
    return () => lenis.destroy();
  }, []);
  return null;
}
