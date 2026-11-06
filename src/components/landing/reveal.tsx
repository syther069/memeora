'use client';

import * as React from 'react';

/**
 * Plays a section's entrance once, when its top nears the bottom of the screen.
 * The hidden state is only ever set here, so without script, already in view, or
 * under reduced motion, the section is simply there. How each part arrives is in
 * globals.css.
 */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (node.getBoundingClientRect().top < window.innerHeight * 0.88) return;
    node.classList.add('reveal-pending');
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      node.classList.remove('reveal-pending');
      observer.disconnect();
    }, { rootMargin: '0px 0px -12% 0px' });
    observer.observe(node);
    return () => {
      observer.disconnect();
      node.classList.remove('reveal-pending');
    };
  }, []);

  return <div ref={ref} className={`reveal ${className ?? ''}`}>{children}</div>;
}
