'use client';

import * as React from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { Xmark } from 'iconoir-react';

export interface ExpandCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
  detail: React.ReactNode;
}

/** Brand fills only, each with text that passes AA on it. */
const FILLS = [
  'bg-[var(--brand-blue)] text-[var(--ink-inverse)]',
  'bg-[var(--ink-primary)] text-[var(--ink-inverse)]',
  'bg-[var(--brand-blue-pressed)] text-[var(--ink-inverse)]',
  'bg-[var(--brand-blue-bright)] text-[var(--ink-inverse)]',
];

const SPRING = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 } as const;

/**
 * Small cards where one opens to fill the group and shows more. An original Memeora
 * component. The idea comes from the Skiper 23 preview
 * (https://skiper-ui.com/v1/preview/skiper23), which has no source available.
 * Focus moves into the open card and back to its card on closing, and Escape closes.
 */
export function ExpandCards({ cards }: { cards: ExpandCard[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const triggers = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const lastOpen = React.useRef<string | null>(null);
  const openIndex = cards.findIndex((card) => card.id === openId);
  const open = openIndex >= 0 ? cards[openIndex] : null;

  React.useEffect(() => {
    if (openId) {
      lastOpen.current = openId;
      closeRef.current?.focus({ preventScroll: true });
    } else if (lastOpen.current) {
      triggers.current[lastOpen.current]?.focus({ preventScroll: true });
      lastOpen.current = null;
    }
  }, [openId]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative grid min-h-[30rem] grid-cols-2 gap-3 sm:min-h-[28rem] sm:gap-4" onKeyDown={(event) => { if (event.key === 'Escape') setOpenId(null); }}>
        {cards.map((card, index) => (
          <motion.button
            key={card.id}
            ref={(element) => { triggers.current[card.id] = element; }}
            layoutId={`card-${card.id}`}
            type="button"
            aria-expanded={openId === card.id}
            tabIndex={open ? -1 : 0}
            onClick={() => setOpenId(card.id)}
            transition={SPRING}
            style={{ borderRadius: 24 }}
            className={`flex min-h-36 cursor-pointer flex-col justify-between gap-6 p-4 text-left sm:p-5 ${FILLS[index % FILLS.length]} ${open ? 'pointer-events-none' : ''}`}
          >
            <motion.span layout="position" className="block">{card.icon}</motion.span>
            <motion.span layout="position" className="block">
              <span className="block text-lg font-bold leading-tight sm:text-xl">{card.title}</span>
              <span className="mt-1 block text-sm leading-snug">{card.hint}</span>
            </motion.span>
          </motion.button>
        ))}
        <AnimatePresence>
          {open && (
            <motion.div
              key={open.id}
              layoutId={`card-${open.id}`}
              role="group"
              aria-label={open.title}
              transition={SPRING}
              style={{ borderRadius: 24 }}
              className={`absolute inset-0 z-10 flex flex-col overflow-hidden p-4 sm:p-6 ${FILLS[openIndex % FILLS.length]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <motion.span layout="position" className="block">{open.icon}</motion.span>
                <button ref={closeRef} type="button" onClick={() => setOpenId(null)} aria-label={`Close ${open.title}`} className="hit grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25"><Xmark aria-hidden className="h-5 w-5" /></button>
              </div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, delay: 0.08 }} className="mt-4 flex min-h-0 flex-1 flex-col">
                <h3 className="text-2xl font-bold tracking-tight">{open.title}</h3>
                {open.detail}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
