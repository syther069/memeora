'use client';

import * as React from 'react';
import { useScroll, useTransform } from 'framer-motion';

/** Dimming is applied from script only, so without it or under reduced motion all rows are readable. */
function Row({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLLIElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const opacity = useTransform(scrollYProgress, [0.28, 0.5, 0.72], [0.28, 1, 0.28]);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const apply = (value: number) => { node.style.opacity = String(value); };
    apply(opacity.get());
    const stop = opacity.on('change', apply);
    return () => {
      stop();
      node.style.opacity = '';
    };
  }, [opacity]);

  return <li ref={ref}>{children}</li>;
}

/**
 * One line stays still while examples pass it, and the one level with it lights up.
 * An original Memeora section. The idea comes from the Skiper 44 preview
 * (https://skiper-ui.com/v1/preview/skiper44). Its source is paid and was not used.
 */
export function RemembersList({ lead, rules }: { lead: string; rules: string[] }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-x-6 md:grid-cols-[auto_1fr]">
      <p className="sticky top-0 z-10 bg-[var(--surface-base)] py-4 text-[clamp(1.9rem,4.4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--ink-primary)] md:top-1/2 md:h-fit md:-translate-y-1/2 md:bg-transparent md:py-0">{lead}</p>
      <ul className="space-y-3 py-[6vh] text-[clamp(1.9rem,4.4vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--brand-blue)] md:py-[42vh]">
        {rules.map((rule) => <Row key={rule}>{rule}</Row>)}
      </ul>
    </div>
  );
}
