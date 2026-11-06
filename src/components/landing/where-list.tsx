'use client';

import * as React from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';

export interface WhereItem {
  mark: React.ReactNode;
  title: string;
  body: string;
  shot: React.ReactNode;
}

/** All three give cream text at least AA contrast. */
const GROUNDS = ['var(--brand-blue)', 'var(--brand-blue-pressed)', 'var(--brand-blue-bright)'];

/**
 * A large list where the row in focus sets the colour of the whole section and shows
 * its screen beside it. An original Memeora section. The idea comes from the
 * Skiper 24 preview (https://skiper-ui.com/v1/skiper24). Its source is paid and was
 * not used. Every word stays readable whichever row is active.
 */
export function WhereList({ heading, items }: { heading: React.ReactNode; items: WhereItem[] }) {
  const [active, setActive] = React.useState(0);
  const rows = React.useRef<(HTMLLIElement | null)[]>([]);

  React.useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(rows.current.indexOf(entry.target as HTMLLIElement));
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    rows.current.forEach((row) => row && observer.observe(row));
    return () => observer.disconnect();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <section id="where" className="relative scroll-mt-6 px-4 py-20 text-[var(--ink-inverse)] transition-colors duration-500 motion-reduce:transition-none sm:px-8 lg:py-32" style={{ backgroundColor: GROUNDS[active] }}>
        <div className="mx-auto max-w-6xl">
          {heading}
          <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <ul>
              {items.map((item, index) => (
                <li
                  key={item.title}
                  ref={(element) => { rows.current[index] = element; }}
                  onPointerEnter={(event) => { if (event.pointerType === 'mouse') setActive(index); }}
                  className="border-t border-white/25 py-8 lg:py-12"
                >
                  <div className={`transition-opacity duration-300 motion-reduce:transition-none ${active === index ? 'opacity-100' : 'opacity-60'}`}>
                    <span className="block w-fit">{item.mark}</span>
                    <h3 className="mt-4 text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.025em]">{item.title}</h3>
                  </div>
                  <p className="mt-3 max-w-xl text-base leading-relaxed">{item.body}</p>
                </li>
              ))}
            </ul>
            <div aria-hidden className="hidden lg:block">
              <div className="sticky top-[20vh] aspect-square overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-card)] shadow-[var(--shadow-card-hard)]">
                <AnimatePresence initial={false}>
                  <motion.div key={active} className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                    {items[active]?.shot}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
