'use client';

import * as React from 'react';
import { useMotionValueEvent, useReducedMotion, useSpring } from 'framer-motion';

/**
 * Rolls to a new amount when it changes, and always ends on the exact figure.
 * Display only: `minor` comes from the server. Screen readers get the exact value.
 */
export function RollingAmount({ minor, format }: { minor: number; format: (minor: number) => string }) {
  const reduced = useReducedMotion();
  const spring = useSpring(minor, { stiffness: 260, damping: 32 });
  const [shown, setShown] = React.useState(minor);

  React.useEffect(() => {
    if (reduced) spring.jump(minor);
    else spring.set(minor);
  }, [minor, reduced, spring]);

  useMotionValueEvent(spring, 'change', (value) => {
    setShown(Math.abs(value - minor) < 100 ? minor : Math.round(value / 100) * 100);
  });

  return <><span className="sr-only">{format(minor)}</span><span aria-hidden>{format(reduced ? minor : shown)}</span></>;
}
